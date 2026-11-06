// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {IKizashiPool} from "./IKizashiPool.sol";
import {Config, Quote, State} from "./KizashiTypes.sol";

/// @title KizashiPoolStub
/// @notice F-CP0 stand-in with the frozen IKizashiPool ABI and real events, for other lanes to
/// build against before the LMSR pool exists. NOT the Kizashi pricing; never deploy to a market.
/// @dev Naive maths: cost(q) = max(q), the b -> 0 limit of LMSR. Exact integers, no rounding,
/// always solvent (cash >= max q). Prices are uniform over the buckets attaining the maximum.
contract KizashiPoolStub is IKizashiPool, ReentrancyGuard {
    int256 internal constant USDC_TO_WAD = 1e12;
    int256 internal constant ONE = 1e18;
    uint256 internal constant MIN_BUCKETS = 2;
    uint256 internal constant MAX_BUCKETS = 64;

    Config internal _config;
    State internal _state;
    address internal _creator;
    address internal _resolver;
    uint64 internal _closeTime;
    uint256 internal _winningBucket;
    int256 internal _b;
    uint256 internal _cash;
    int256 internal _redeemedWad;
    int256[] internal _q;
    mapping(address owner => int256[] position) internal _positions;

    function initialize(
        Config calldata config_,
        uint256 subsidyUsdc,
        address creator_,
        address resolver_,
        uint64 closeTime_
    ) external nonReentrant {
        if (_state != State.Uninitialized) revert AlreadyInitialized();
        if (config_.n < MIN_BUCKETS || config_.n > MAX_BUCKETS || config_.w <= 0) {
            revert BadGrid(config_.n, config_.w);
        }
        if (subsidyUsdc == 0) revert ZeroSubsidy();
        if (config_.collateral == address(0) || creator_ == address(0) || resolver_ == address(0)) {
            revert ZeroAddress();
        }
        if (closeTime_ <= block.timestamp) revert BadCloseTime(closeTime_);

        _config = config_;
        _creator = creator_;
        _resolver = resolver_;
        _closeTime = closeTime_;
        _q = new int256[](config_.n);
        _state = State.Open;
        _cash = subsidyUsdc;
        // Naive: b equals the subsidy in WAD. The LMSR pool uses b = S / ln N.
        _b = SafeCastLib.toInt256(subsidyUsdc) * USDC_TO_WAD;
        // Emitted before the subsidy transfer below; the function is nonReentrant.
        // forge-lint: disable-next-item(reentrancy-events)
        emit Initialized(
            creator_,
            resolver_,
            config_.collateral,
            config_.n,
            config_.lo,
            config_.w,
            _b,
            subsidyUsdc,
            closeTime_
        );

        // Cash must equal what actually arrived; a fee-on-transfer collateral is rejected.
        uint256 before = SafeTransferLib.balanceOf(config_.collateral, address(this));
        SafeTransferLib.safeTransferFrom(config_.collateral, msg.sender, address(this), subsidyUsdc);
        uint256 received = SafeTransferLib.balanceOf(config_.collateral, address(this)) - before;
        if (received != subsidyUsdc) revert ZeroSubsidy();
    }

    function quote(address owner, int256[] calldata delta) public view returns (Quote memory out) {
        uint256 n = _config.n;
        if (delta.length != n) revert LengthMismatch(n, delta.length);
        int256[] memory position = _positionOrZero(owner);

        int256 minAfter = type(int256).max;
        bool zero = true;
        for (uint256 i; i < n; ++i) {
            if (delta[i] != 0) zero = false;
            int256 after_ = position[i] + delta[i];
            if (after_ < minAfter) minAfter = after_;
        }
        if (zero) revert ZeroTrade();

        out.topUpWad = minAfter < 0 ? -minAfter : int256(0);
        out.normalizedDelta = new int256[](n);
        int256[] memory qAfter = new int256[](n);
        for (uint256 i; i < n; ++i) {
            out.normalizedDelta[i] = delta[i] + out.topUpWad;
            qAfter[i] = _q[i] + out.normalizedDelta[i];
        }
        out.chargeWad = _maxOf(qAfter) - _maxOf(_q);
        out.chargeUsdc = _toSignedUsdc(out.chargeWad);
        out.pricesAfter = _pricesOf(qAfter);
    }

    function trade(int256[] calldata delta, int256 limitUsdc, uint64 deadline)
        external
        nonReentrant
        returns (Quote memory out)
    {
        if (_state != State.Open) revert NotOpen(_state);
        if (block.timestamp >= _closeTime) revert PastClose(_closeTime);
        if (block.timestamp > deadline) revert DeadlineExpired(deadline);
        out = quote(msg.sender, delta);
        if (out.chargeUsdc > limitUsdc) revert ChargeAboveLimit(out.chargeUsdc, limitUsdc);

        int256[] storage position = _positionStorage(msg.sender);
        for (uint256 i; i < _config.n; ++i) {
            position[i] += out.normalizedDelta[i];
            _q[i] += out.normalizedDelta[i];
        }
        if (out.chargeUsdc > 0) _cash += SafeCastLib.toUint256(out.chargeUsdc);
        else _cash -= SafeCastLib.toUint256(-out.chargeUsdc);
        _requireSolvent();
        // Emitted before the token transfer below; the function is nonReentrant.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Traded(msg.sender, delta, out.topUpWad, out.chargeWad, out.chargeUsdc);

        if (out.chargeUsdc > 0) {
            SafeTransferLib.safeTransferFrom(
                _config.collateral, msg.sender, address(this), SafeCastLib.toUint256(out.chargeUsdc)
            );
        } else if (out.chargeUsdc < 0) {
            SafeTransferLib.safeTransfer(
                _config.collateral, msg.sender, SafeCastLib.toUint256(-out.chargeUsdc)
            );
        }
    }

    function release(int256 amountWad) external nonReentrant returns (uint256 paidUsdc) {
        if (_state != State.Open) revert NotOpen(_state);
        if (amountWad <= 0) revert NonPositiveAmount(amountWad);
        int256 floor_ = floorOf(msg.sender);
        if (amountWad > floor_) revert ReleaseAboveFloor(amountWad, floor_);

        int256[] storage position = _positions[msg.sender];
        for (uint256 i; i < _config.n; ++i) {
            position[i] -= amountWad;
            _q[i] -= amountWad;
        }
        paidUsdc = SafeCastLib.toUint256(amountWad / USDC_TO_WAD);
        _cash -= paidUsdc;
        _requireSolvent();
        // Emitted before the token transfer below; the function is nonReentrant.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Released(msg.sender, amountWad, paidUsdc);
        if (paidUsdc > 0) SafeTransferLib.safeTransfer(_config.collateral, msg.sender, paidUsdc);
    }

    function close() external {
        if (_state != State.Open) revert NotOpen(_state);
        if (block.timestamp < _closeTime) revert TooEarly(_closeTime);
        _state = State.Closed;
        emit Closed(msg.sender);
    }

    function resolve(uint256 bucket) external {
        if (msg.sender != _resolver) revert NotResolver(msg.sender);
        if (_state != State.Closed) revert NotClosed(_state);
        if (bucket >= _config.n) revert BadBucket(bucket, _config.n);
        _winningBucket = bucket;
        _state = State.Resolved;
        emit Resolved(bucket);
    }

    function redeem() external nonReentrant returns (uint256 paidUsdc) {
        if (_state != State.Resolved) revert NotResolved(_state);
        int256[] storage position = _positions[msg.sender];
        int256 payoutWad = position.length == 0 ? int256(0) : position[_winningBucket];
        if (payoutWad == 0) revert NothingToRedeem(msg.sender);

        delete _positions[msg.sender];
        _redeemedWad += payoutWad;
        paidUsdc = SafeCastLib.toUint256(payoutWad / USDC_TO_WAD);
        _cash -= paidUsdc;
        // Emitted before the token transfer below; the function is nonReentrant.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Redeemed(msg.sender, payoutWad, paidUsdc);
        SafeTransferLib.safeTransfer(_config.collateral, msg.sender, paidUsdc);
    }

    function sweep() external nonReentrant returns (uint256 paidUsdc) {
        if (_state != State.Resolved) revert NotResolved(_state);
        if (msg.sender != _creator) revert NotCreator(msg.sender);
        int256 outstanding = outstandingWad();
        uint256 reserved = SafeCastLib.toUint256(_ceilDiv(outstanding, USDC_TO_WAD));
        if (_cash <= reserved) revert NothingToSweep();
        paidUsdc = _cash - reserved;
        _cash = reserved;
        // Emitted before the token transfer below; the function is nonReentrant.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Swept(msg.sender, paidUsdc, outstanding);
        SafeTransferLib.safeTransfer(_config.collateral, msg.sender, paidUsdc);
    }

    function config() external view returns (Config memory) {
        return _config;
    }

    function state() external view returns (State) {
        return _state;
    }

    function creator() external view returns (address) {
        return _creator;
    }

    function resolver() external view returns (address) {
        return _resolver;
    }

    function closeTime() external view returns (uint64) {
        return _closeTime;
    }

    function winningBucket() external view returns (uint256) {
        return _winningBucket;
    }

    function b() external view returns (int256) {
        return _b;
    }

    function q() external view returns (int256[] memory) {
        return _q;
    }

    function positionOf(address owner) external view returns (int256[] memory) {
        return _positionOrZero(owner);
    }

    function floorOf(address owner) public view returns (int256) {
        int256[] memory position = _positionOrZero(owner);
        int256 floor_ = type(int256).max;
        for (uint256 i; i < position.length; ++i) {
            if (position[i] < floor_) floor_ = position[i];
        }
        return position.length == 0 ? int256(0) : floor_;
    }

    function prices() external view returns (int256[] memory) {
        return _pricesOf(_q);
    }

    function cash() external view returns (uint256) {
        return _cash;
    }

    function lossBound() external view returns (int256) {
        return _b;
    }

    function outstandingWad() public view returns (int256) {
        if (_state != State.Resolved) return 0;
        return _q[_winningBucket] - _redeemedWad;
    }

    function bucketOf(int256 value) external view returns (uint256) {
        if (value < _config.lo) return 0;
        uint256 index = SafeCastLib.toUint256((value - _config.lo) / _config.w);
        return index >= _config.n ? _config.n - 1 : index;
    }

    function _positionOrZero(address owner) internal view returns (int256[] memory) {
        int256[] storage stored = _positions[owner];
        return stored.length == 0 ? new int256[](_config.n) : stored;
    }

    function _positionStorage(address owner) internal returns (int256[] storage position) {
        position = _positions[owner];
        if (position.length == 0) {
            for (uint256 i; i < _config.n; ++i) {
                position.push(0);
            }
        }
    }

    function _requireSolvent() internal view {
        int256 required = _state == State.Resolved ? outstandingWad() : _maxOf(_q);
        if (SafeCastLib.toInt256(_cash) * USDC_TO_WAD < required) {
            revert Insolvent(_cash, required);
        }
    }

    function _pricesOf(int256[] memory values) internal pure returns (int256[] memory out) {
        int256 top = _maxOf(values);
        uint256 count = 0;
        for (uint256 i; i < values.length; ++i) {
            if (values[i] == top) ++count;
        }
        out = new int256[](values.length);
        for (uint256 i; i < values.length; ++i) {
            if (values[i] == top) out[i] = ONE / SafeCastLib.toInt256(count);
        }
    }

    function _maxOf(int256[] memory values) internal pure returns (int256 top) {
        top = type(int256).min;
        for (uint256 i; i < values.length; ++i) {
            if (values[i] > top) top = values[i];
        }
    }

    /// @dev Signed WAD -> signed USDC: positive (owner pays) rounds up, negative rounds toward 0.
    function _toSignedUsdc(int256 wad) internal pure returns (int256) {
        if (wad > 0) return _ceilDiv(wad, USDC_TO_WAD);
        return wad / USDC_TO_WAD;
    }

    function _ceilDiv(int256 x, int256 d) internal pure returns (int256) {
        return x <= 0 ? x / d : (x - 1) / d + 1;
    }
}

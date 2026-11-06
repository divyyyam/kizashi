// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {Config, Quote, State} from "./KizashiTypes.sol";
import {Grid} from "./Grid.sol";
import {IKizashiPool} from "./IKizashiPool.sol";
import {LSE} from "./LSE.sol";
import {Netting} from "./Netting.sol";
import {Shapes} from "./Shapes.sol";
import {VecLib} from "./VecLib.sol";
import {Wad} from "./Wad.sol";

/// @title KizashiPool
/// @notice One LMSR outcome market over N buckets with netted, normalized positions.
/// Every rounding favours the pool; see contracts/src/core/ROUNDING.md.
/// Invariant I1 (checked after every state change that moves money):
///   before resolution: cash >= costUp(q) >= max(q); after: cash >= unredeemed winning claims.
contract KizashiPool is IKizashiPool, ReentrancyGuard {
    using VecLib for int256[];

    /// @dev 1 USDC minimum subsidy, 1e9 USDC maximum (USDC base units).
    uint256 public constant MIN_SUBSIDY_USDC = 1e6;
    uint256 public constant MAX_SUBSIDY_USDC = 1e15;
    /// @dev Largest |entry| of one trade vector: 1e12 USDC in WAD.
    int256 public constant MAX_ABS_DELTA = 1e30;
    /// @dev Largest |q_i| ever stored: 1e15 USDC in WAD. Keeps every product far from overflow.
    int256 public constant MAX_ABS_Q = 1e33;

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
        Grid.validate(config_.n, config_.w);
        if (subsidyUsdc == 0) revert ZeroSubsidy();
        if (subsidyUsdc < MIN_SUBSIDY_USDC || subsidyUsdc > MAX_SUBSIDY_USDC) {
            revert SubsidyOutOfBounds(subsidyUsdc);
        }
        if (config_.collateral == address(0) || creator_ == address(0) || resolver_ == address(0)) {
            revert ZeroAddress();
        }
        if (closeTime_ <= block.timestamp) revert BadCloseTime(closeTime_);

        _config = config_;
        _creator = creator_;
        _resolver = resolver_;
        _closeTime = closeTime_;
        _q = new int256[](config_.n);
        _b = LSE.bFromSubsidy(Wad.toWad(subsidyUsdc), config_.n);
        _cash = subsidyUsdc;
        _state = State.Open;
        _requireSolvent(); // cash = S >= costUp(0) = lossBound(b): proved in LSE.bFromSubsidy

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
        Shapes.validate(delta, n, MAX_ABS_DELTA);
        int256[] memory q_ = _q;
        int256[] memory normalized;
        (out.topUpWad, normalized,) = Netting.normalise(_positionOrZero(owner), delta);
        int256[] memory qAfter = q_.add(normalized);
        for (uint256 i; i < n; ++i) {
            if (qAfter[i] > MAX_ABS_Q || qAfter[i] < -MAX_ABS_Q) revert QOutOfBounds(qAfter[i]);
        }
        out.normalizedDelta = normalized;
        out.chargeWad = LSE.tradeCharge(q_, normalized, _b);
        out.chargeUsdc = out.chargeWad > 0
            ? SafeCastLib.toInt256(Wad.toUsdcUp(out.chargeWad))
            : -SafeCastLib.toInt256(Wad.toUsdcDown(-out.chargeWad));
        out.pricesAfter = LSE.prices(qAfter, _b);
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
        uint256 magnitude =
            SafeCastLib.toUint256(out.chargeUsdc >= 0 ? out.chargeUsdc : -out.chargeUsdc);
        if (out.chargeUsdc >= 0) _cash += magnitude;
        else _cash -= magnitude;
        _requireSolvent();

        // Emitted before the token transfer below; the function is nonReentrant.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Traded(msg.sender, delta, out.topUpWad, out.chargeWad, out.chargeUsdc);
        if (out.chargeUsdc > 0) {
            SafeTransferLib.safeTransferFrom(
                _config.collateral, msg.sender, address(this), magnitude
            );
        } else if (out.chargeUsdc < 0) {
            SafeTransferLib.safeTransfer(_config.collateral, msg.sender, magnitude);
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
        // Translation is exact (costUp(q - r*1) = costUp(q) - r); paying floor(r) keeps I1.
        paidUsdc = Wad.toUsdcDown(amountWad);
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
        paidUsdc = Wad.toUsdcDown(payoutWad);
        _cash -= paidUsdc;
        _requireSolvent();

        // Emitted before the token transfer below; the function is nonReentrant.
        // forge-lint: disable-next-line(reentrancy-events)
        emit Redeemed(msg.sender, payoutWad, paidUsdc);
        if (paidUsdc > 0) SafeTransferLib.safeTransfer(_config.collateral, msg.sender, paidUsdc);
    }

    function sweep() external nonReentrant returns (uint256 paidUsdc) {
        if (_state != State.Resolved) revert NotResolved(_state);
        if (msg.sender != _creator) revert NotCreator(msg.sender);
        int256 outstanding = outstandingWad();
        uint256 reserved = Wad.toUsdcUp(outstanding);
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
        return Netting.floorOf(_positionOrZero(owner));
    }

    function prices() external view returns (int256[] memory) {
        return LSE.prices(_q, _b);
    }

    function cash() external view returns (uint256) {
        return _cash;
    }

    function lossBound() external view returns (int256) {
        return LSE.lossBound(_b, _config.n);
    }

    function outstandingWad() public view returns (int256) {
        if (_state != State.Resolved) return 0;
        return _q[_winningBucket] - _redeemedWad;
    }

    function bucketOf(int256 value) external view returns (uint256) {
        return Grid.bucketOf(_config.lo, _config.w, _config.n, value);
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

    /// @dev I1 for the current stage, in WAD: cash covers costUp(q) before resolution and the
    /// unredeemed winning claims after it.
    function _requireSolvent() internal view {
        int256 required = _state == State.Resolved ? outstandingWad() : LSE.costUp(_q, _b);
        if (Wad.toWad(_cash) < required) revert Insolvent(_cash, required);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {State} from "../core/KizashiTypes.sol";
import {IKizashiPool} from "../core/IKizashiPool.sol";
import {KizashiOracleHook} from "../hooks/KizashiOracleHook.sol";
import {PriceSource, ResolutionMode} from "./ResolutionTypes.sol";

/// @title KizashiResolver
/// @notice The resolver of every Kizashi pool. Price markets settle from the oracle hook's TWAP
/// when the guard passes; otherwise (and for off-chain markets) a resolver role proposes, holders
/// may dispute inside a window, and anyone finalizes after it.
contract KizashiResolver {
    error NotFactory();
    error NotResolverRole();
    error PoolNotClosed();
    error DisputeWindowOpen(uint64 endsAt);
    error DisputeWindowClosed(uint64 endsAt);
    error ProposalDisputed();
    error NoProposal();
    error NotAPositionHolder();
    error NotTwapMarket();
    error NotManualMarket();
    error TooEarly(uint64 closeTime);
    error UnknownMarket(uint256 marketId);

    event Registered(uint256 indexed marketId, address indexed pool, ResolutionMode mode);
    event Proposed(
        uint256 indexed marketId, uint256 bucket, bytes32 evidenceRef, uint64 disputeEndsAt
    );
    event Disputed(uint256 indexed marketId, address indexed by, bytes32 reason);
    event Finalized(uint256 indexed marketId, uint256 bucket, ResolutionMode path);
    event TwapRejected(uint256 indexed marketId, uint16 observations, uint128 liquidity);

    /// @notice Hackathon setting: a proposal can be disputed for 30 minutes.
    uint64 public constant DISPUTE_WINDOW = 30 minutes;

    struct Market {
        IKizashiPool pool;
        ResolutionMode mode;
        bool twapRejected;
    }

    struct Proposal {
        uint256 bucket;
        bytes32 evidenceRef;
        uint64 disputeEndsAt;
        bool disputed;
        bool exists;
    }

    address public immutable factory;
    address public immutable resolverRole;
    KizashiOracleHook public immutable hook;

    mapping(uint256 marketId => Market) public markets;
    mapping(uint256 marketId => PriceSource) internal _priceSources;
    mapping(uint256 marketId => Proposal) public proposals;

    constructor(address factory_, address resolverRole_, KizashiOracleHook hook_) {
        factory = factory_;
        resolverRole = resolverRole_;
        hook = hook_;
    }

    /// @notice Record a new market. Only the factory, once per market.
    function register(
        uint256 marketId,
        IKizashiPool pool,
        ResolutionMode mode,
        PriceSource calldata source
    ) external {
        if (msg.sender != factory) revert NotFactory();
        markets[marketId] = Market(pool, mode, false);
        if (mode == ResolutionMode.Twap) _priceSources[marketId] = source;
        emit Registered(marketId, address(pool), mode);
    }

    /// @notice Propose the winning bucket of a closed manual market (or a TWAP market whose guard
    /// failed). Replaces any earlier proposal and restarts the dispute window.
    /// @param evidenceRef Swarm reference to the evidence document.
    function propose(uint256 marketId, uint256 bucket, bytes32 evidenceRef) external {
        if (msg.sender != resolverRole) revert NotResolverRole();
        Market memory m = _market(marketId);
        if (m.mode != ResolutionMode.Manual && !m.twapRejected) revert NotManualMarket();
        _closeIfDue(m.pool);
        if (m.pool.state() != State.Closed) revert PoolNotClosed();
        uint64 endsAt = uint64(block.timestamp) + DISPUTE_WINDOW;
        proposals[marketId] = Proposal(bucket, evidenceRef, endsAt, false, true);
        emit Proposed(marketId, bucket, evidenceRef, endsAt);
    }

    /// @notice Dispute the open proposal. Only accounts holding a position in the market.
    function dispute(uint256 marketId, bytes32 reason) external {
        Market memory m = _market(marketId);
        Proposal storage p = proposals[marketId];
        if (!p.exists) revert NoProposal();
        if (block.timestamp >= p.disputeEndsAt) revert DisputeWindowClosed(p.disputeEndsAt);
        if (!_holds(m.pool, msg.sender)) revert NotAPositionHolder();
        p.disputed = true;
        emit Disputed(marketId, msg.sender, reason);
    }

    /// @notice Resolve the pool with the undisputed proposal once its window has passed. Anyone.
    function finalize(uint256 marketId) external {
        Market memory m = _market(marketId);
        Proposal memory p = proposals[marketId];
        if (!p.exists) revert NoProposal();
        if (p.disputed) revert ProposalDisputed();
        if (block.timestamp < p.disputeEndsAt) revert DisputeWindowOpen(p.disputeEndsAt);
        delete proposals[marketId];
        m.pool.resolve(p.bucket);
        emit Finalized(marketId, p.bucket, ResolutionMode.Manual);
    }

    /// @notice Settle a price market from the TWAP over [close - window, close]. Anyone, after close.
    /// @dev If fewer than minObservations swaps fell inside the window, or liquidity is below
    /// minLiquidity, the market switches to the manual path instead of settling on a movable price.
    function resolveFromTwap(uint256 marketId) external {
        Market memory m = _market(marketId);
        if (m.mode != ResolutionMode.Twap || m.twapRejected) revert NotTwapMarket();
        uint64 close = m.pool.closeTime();
        if (block.timestamp < close) revert TooEarly(close);
        _closeIfDue(m.pool);

        PriceSource memory s = _priceSources[marketId];
        PoolId id = PoolIdLibrary.toId(s.key);
        (int24 meanTick, uint16 count) = hook.consult(id, uint32(close) - s.window, uint32(close));
        uint128 live = hook.liquidity(id);
        if (count < s.minObservations || live < s.minLiquidity) {
            markets[marketId].twapRejected = true;
            emit TwapRejected(marketId, count, live);
            return;
        }
        uint256 bucket = m.pool.bucketOf(gridValue(s, meanTick));
        m.pool.resolve(bucket);
        emit Finalized(marketId, bucket, ResolutionMode.Twap);
    }

    /// @notice Grid value for a mean tick: base price in quote tokens * 10^gridDecimals.
    /// @dev Rounds down. Uses v4 TickMath; no Kizashi maths is copied here.
    function gridValue(PriceSource memory s, int24 tick) public pure returns (int256) {
        uint160 sqrtP = TickMath.getSqrtPriceAtTick(tick);
        // raw = token1 per token0 in base units, as a Q128 fixed point.
        uint256 rawX128 = FullMath.mulDiv(sqrtP, sqrtP, 1 << 64);
        (uint256 dec0, uint256 dec1) = s.baseIsToken0
            ? (uint256(s.baseDecimals), uint256(s.quoteDecimals))
            : (uint256(s.quoteDecimals), uint256(s.baseDecimals));
        uint256 value;
        if (s.baseIsToken0) {
            // price(token0 in token1) = raw * 10^dec0 / 10^dec1
            value = FullMath.mulDiv(rawX128, 10 ** (dec0 + s.gridDecimals), (10 ** dec1) << 128);
        } else {
            // price(token1 in token0) = 10^dec1 / (raw * 10^dec0)
            value = FullMath.mulDiv(10 ** (dec1 + s.gridDecimals), 1 << 128, rawX128) / 10 ** dec0;
        }
        return int256(value);
    }

    function priceSourceOf(uint256 marketId) external view returns (PriceSource memory) {
        return _priceSources[marketId];
    }

    function _market(uint256 marketId) internal view returns (Market memory m) {
        m = markets[marketId];
        if (address(m.pool) == address(0)) revert UnknownMarket(marketId);
    }

    function _closeIfDue(IKizashiPool pool) internal {
        if (pool.state() == State.Open && block.timestamp >= pool.closeTime()) pool.close();
    }

    function _holds(IKizashiPool pool, address who) internal view returns (bool) {
        int256[] memory p = pool.positionOf(who);
        for (uint256 i; i < p.length; ++i) {
            if (p[i] != 0) return true;
        }
        return false;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/base/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @title KizashiOracleHook
/// @notice Uniswap v4 hook that records a tick observation after every swap so Kizashi markets can
/// resolve from a time-weighted average price. It never changes swap amounts.
/// @dev Permissions: afterInitialize (seed) and afterSwap (append). One write per block; a second
/// swap in the same block only updates that block's closing tick.
contract KizashiOracleHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    error UnknownPool(PoolId id);
    error BadWindow(uint32 from, uint32 to);
    error WindowNotCovered(uint32 from, uint32 oldest);

    event ObservationRecorded(
        PoolId indexed id, uint32 timestamp, int24 tick, int56 tickCumulative
    );

    /// @notice Ring-buffer size per pool: one hour at one swap every 5 s.
    uint16 public constant CARDINALITY = 720;

    /// @dev tick is the pool tick after the latest swap at `timestamp`; tickCumulative is the
    /// integral of the tick from the first observation up to `timestamp`.
    struct Observation {
        uint32 timestamp;
        int24 tick;
        int56 tickCumulative;
    }

    struct Buffer {
        uint16 last;
        uint16 count;
    }

    mapping(PoolId id => Observation[CARDINALITY] ring) internal _observations;
    mapping(PoolId id => Buffer buffer) public buffers;

    constructor(IPoolManager manager) BaseHook(manager) {}

    /// @inheritdoc BaseHook
    function getHookPermissions() public pure override returns (Hooks.Permissions memory p) {
        p.afterInitialize = true;
        p.afterSwap = true;
    }

    /// @notice Time-weighted mean tick over [from, to] and the number of observations inside it.
    /// @dev Exact integral of the recorded ticks; rounds toward negative infinity like Uniswap v3.
    /// Reverts if the window starts before the oldest retained observation.
    function consult(PoolId id, uint32 from, uint32 to)
        external
        view
        returns (int24 meanTick, uint16 observations)
    {
        if (from >= to || to > block.timestamp) revert BadWindow(from, to);
        int56 delta = _cumulativeAt(id, to) - _cumulativeAt(id, from);
        int56 span = int56(uint56(to - from));
        int56 mean = delta / span;
        if (delta < 0 && delta % span != 0) --mean;
        meanTick = int24(mean);
        observations = _countBetween(id, from, to);
    }

    /// @notice In-range liquidity of the pool right now.
    function liquidity(PoolId id) external view returns (uint128) {
        return poolManager.getLiquidity(id);
    }

    /// @notice Latest recorded observation for a pool.
    function latest(PoolId id) external view returns (Observation memory) {
        Buffer memory buf = buffers[id];
        if (buf.count == 0) revert UnknownPool(id);
        return _observations[id][buf.last];
    }

    function _afterInitialize(address, PoolKey calldata key, uint160, int24 tick)
        internal
        override
        returns (bytes4)
    {
        PoolId id = key.toId();
        uint32 now_ = uint32(block.timestamp);
        _observations[id][0] = Observation(now_, tick, 0);
        buffers[id] = Buffer(0, 1);
        emit ObservationRecorded(id, now_, tick, 0);
        return this.afterInitialize.selector;
    }

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId id = key.toId();
        (, int24 tick,,) = poolManager.getSlot0(id);
        _write(id, tick);
        return (this.afterSwap.selector, 0);
    }

    function _write(PoolId id, int24 tick) internal {
        Buffer memory buf = buffers[id];
        Observation storage last = _observations[id][buf.last];
        uint32 now_ = uint32(block.timestamp);
        if (last.timestamp == now_) {
            last.tick = tick; // same block: the cumulative to `now_` is unchanged
            emit ObservationRecorded(id, now_, tick, last.tickCumulative);
            return;
        }
        int56 cumulative =
            last.tickCumulative + int56(last.tick) * int56(uint56(now_ - last.timestamp));
        uint16 next = (buf.last + 1) % CARDINALITY;
        _observations[id][next] = Observation(now_, tick, cumulative);
        buffers[id] = Buffer(next, buf.count < CARDINALITY ? buf.count + 1 : CARDINALITY);
        emit ObservationRecorded(id, now_, tick, cumulative);
    }

    /// @dev Tick cumulative at time t, from the latest observation at or before t.
    function _cumulativeAt(PoolId id, uint32 t) internal view returns (int56) {
        Buffer memory buf = buffers[id];
        if (buf.count == 0) revert UnknownPool(id);
        uint16 oldest = (buf.last + CARDINALITY + 1 - buf.count) % CARDINALITY;
        Observation memory first = _observations[id][oldest];
        if (t < first.timestamp) revert WindowNotCovered(t, first.timestamp);
        // Binary search over the buffer ordered from oldest (0) to newest (count - 1).
        uint256 lo = 0;
        uint256 hi = buf.count - 1;
        while (lo < hi) {
            uint256 mid = (lo + hi + 1) / 2;
            if (_observations[id][(oldest + mid) % CARDINALITY].timestamp <= t) lo = mid;
            else hi = mid - 1;
        }
        Observation memory o = _observations[id][(oldest + lo) % CARDINALITY];
        return o.tickCumulative + int56(o.tick) * int56(uint56(t - o.timestamp));
    }

    function _countBetween(PoolId id, uint32 from, uint32 to) internal view returns (uint16 n) {
        Buffer memory buf = buffers[id];
        for (uint16 i = 0; i < buf.count; ++i) {
            uint32 ts = _observations[id][(buf.last + CARDINALITY - i) % CARDINALITY].timestamp;
            if (ts < from) break;
            if (ts <= to) ++n;
        }
    }
}

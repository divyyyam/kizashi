// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {KizashiOracleHook} from "../../src/hooks/KizashiOracleHook.sol";
import {Fixtures} from "../utils/Fixtures.sol";

contract KizashiOracleHookTest is Fixtures {
    using PoolIdLibrary for PoolId;

    PoolId internal id;

    function setUp() public {
        deploySystem();
        id = PoolIdLibrary.toId(priceKey);
    }

    function test_addressEncodesExactlyItsPermissions() public view {
        Hooks.Permissions memory p = hook.getHookPermissions();
        assertTrue(p.afterInitialize && p.afterSwap);
        assertFalse(
            p.beforeSwap || p.beforeInitialize || p.beforeAddLiquidity || p.afterAddLiquidity
        );
        uint160 bits = uint160(address(hook)) & Hooks.ALL_HOOK_MASK;
        assertEq(bits, uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.AFTER_SWAP_FLAG));
    }

    function test_initializeSeedsBuffer() public view {
        KizashiOracleHook.Observation memory o = hook.latest(id);
        assertEq(o.timestamp, uint32(block.timestamp));
        assertEq(o.tickCumulative, 0);
        (, uint16 count) = hook.buffers(id);
        assertEq(count, 1);
    }

    /// A plain v4 swap through the PoolManager (not Kizashi code) records an observation.
    function test_plainSwapRecordsObservation() public {
        vm.warp(block.timestamp + 12);
        swap(priceKey, true, -1e15, ZERO_BYTES);
        KizashiOracleHook.Observation memory o = hook.latest(id);
        assertEq(o.timestamp, uint32(block.timestamp));
        assertLt(o.tick, 0); // selling token0 lowers the price
        (, uint16 count) = hook.buffers(id);
        assertEq(count, 2);
    }

    function test_oneWritePerBlock() public {
        vm.warp(block.timestamp + 5);
        swap(priceKey, true, -1e15, ZERO_BYTES);
        swap(priceKey, false, -1e15, ZERO_BYTES);
        (, uint16 count) = hook.buffers(id);
        assertEq(count, 2);
    }

    function test_consult_flatPriceGivesTickZero() public {
        uint256 start = block.timestamp;
        vm.warp(start + 100);
        (int24 mean, uint16 n) = hook.consult(id, uint32(start), uint32(start + 100));
        assertEq(mean, 0);
        assertEq(n, 1);
    }

    function test_consult_timeWeightsTicks() public {
        uint256 start = block.timestamp;
        vm.warp(start + 50);
        swap(priceKey, true, -1e17, ZERO_BYTES);
        int24 moved = hook.latest(id).tick;
        vm.warp(start + 100);
        (int24 mean,) = hook.consult(id, uint32(start), uint32(start + 100));
        // 50 s at tick 0 then 50 s at `moved`: mean = moved / 2 rounded toward -inf.
        int24 expected = moved / 2;
        if (moved < 0 && moved % 2 != 0) --expected;
        assertEq(mean, expected);
    }

    function test_consult_reverts() public {
        uint256 start = block.timestamp;
        vm.warp(start + 10);
        vm.expectRevert(
            abi.encodeWithSelector(
                KizashiOracleHook.BadWindow.selector, uint32(start + 5), uint32(start + 5)
            )
        );
        hook.consult(id, uint32(start + 5), uint32(start + 5));
        vm.expectRevert(
            abi.encodeWithSelector(
                KizashiOracleHook.WindowNotCovered.selector, uint32(start - 1), uint32(start)
            )
        );
        hook.consult(id, uint32(start - 1), uint32(start + 5));
        PoolId unknown = PoolId.wrap(bytes32(uint256(1)));
        vm.expectRevert(abi.encodeWithSelector(KizashiOracleHook.UnknownPool.selector, unknown));
        hook.latest(unknown);
    }

    function test_ringBufferWraps() public {
        for (uint256 i; i < 730; ++i) {
            vm.warp(block.timestamp + 1);
            swap(priceKey, i % 2 == 0, -1e12, ZERO_BYTES);
        }
        (, uint16 count) = hook.buffers(id);
        assertEq(count, hook.CARDINALITY());
        (, uint16 n) = hook.consult(id, uint32(block.timestamp - 100), uint32(block.timestamp));
        assertEq(n, 101);
    }
}

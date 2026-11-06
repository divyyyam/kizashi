// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {KizashiPool} from "../../../src/core/KizashiPool.sol";
import {Config, State} from "../../../src/core/KizashiTypes.sol";
import {LSE} from "../../../src/core/LSE.sol";
import {VecLib} from "../../../src/core/VecLib.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";
import {PoolHandler} from "./PoolHandler.sol";

/// @notice SPEC §5 invariants I1–I3 under random five-actor histories (N = 8).
contract KizashiInvariantsTest is Test {
    using VecLib for int256[];

    uint256 internal constant SUBSIDY = 500e6;
    KizashiPool internal pool;
    MockUSDC internal usdc;
    PoolHandler internal handler;
    address internal creator = makeAddr("creator");
    address internal resolver = makeAddr("resolver");

    function setUp() public {
        usdc = new MockUSDC();
        pool = new KizashiPool();
        usdc.mint(address(this), SUBSIDY);
        usdc.approve(address(pool), SUBSIDY);
        pool.initialize(
            Config({n: 8, lo: 0, w: 1, collateral: address(usdc)}),
            SUBSIDY,
            creator,
            resolver,
            uint64(block.timestamp + 1 days)
        );
        handler = new PoolHandler(pool, usdc, creator, resolver);
        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = PoolHandler.trade.selector;
        selectors[1] = PoolHandler.release.selector;
        selectors[2] = PoolHandler.wait.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// I1: cash >= costUp(q) >= max(q) while open; tokens held match accounted cash.
    function invariant_I1_solvent() public view {
        assertEq(usdc.balanceOf(address(pool)), pool.cash());
        if (pool.state() == State.Resolved) {
            assertGe(int256(pool.cash()) * 1e12, pool.outstandingWad());
        } else {
            int256[] memory q = pool.q();
            int256 up = LSE.costUp(q, pool.b());
            assertGe(int256(pool.cash()) * 1e12, up);
            assertGe(up, q.maxOf());
        }
    }

    /// I2: every position stays non-negative, and q is the sum of all positions.
    function invariant_I2_positionsNonNegativeAndSumToQ() public view {
        int256[] memory q = pool.q();
        int256[] memory total = new int256[](q.length);
        for (uint256 a; a < 5; ++a) {
            int256[] memory p = pool.positionOf(handler.actorAt(a));
            assertTrue(p.isNonNeg());
            total = total.add(p);
        }
        for (uint256 i; i < q.length; ++i) {
            assertEq(total[i], q[i]);
        }
    }

    /// I3: settling now leaves the maker's loss within b * ln N, and the sweep never touches
    /// unredeemed claims. Run on a snapshot so the live sequence continues.
    function invariant_I3_makerLossBounded() public {
        uint256 snap = vm.snapshotState();
        handler.settle(uint256(keccak256(abi.encode(block.timestamp))));
        uint256 swept;
        if (pool.cash() > 0) {
            vm.prank(creator);
            swept = pool.sweep();
        }
        int256 makerPnl = int256(swept) * 1e12 - int256(SUBSIDY) * 1e12;
        assertGe(makerPnl, -pool.lossBound());
        assertEq(pool.outstandingWad(), 0);
        vm.revertToState(snap);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {KizashiPool} from "../../src/core/KizashiPool.sol";
import {State} from "../../src/core/KizashiTypes.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {KizashiResolver} from "../../src/resolution/KizashiResolver.sol";
import {PriceSource, ResolutionMode} from "../../src/resolution/ResolutionTypes.sol";
import {Fixtures} from "../utils/Fixtures.sol";

contract KizashiResolverTest is Fixtures {
    uint64 internal close;

    function setUp() public {
        deploySystem();
        close = uint64(block.timestamp + 1 hours);
    }

    // --- manual path ---------------------------------------------------------------

    function _manualMarketWithPosition() internal returns (uint256 id, KizashiPool pool) {
        (id, pool) = createMarket(manualParams(4, close));
        vm.prank(alice);
        pool.trade(vec(4, 1, 10 * WAD), type(int256).max, close);
    }

    function test_manual_proposeWaitFinalize() public {
        (uint256 id, KizashiPool pool) = _manualMarketWithPosition();
        vm.warp(close);
        vm.prank(resolverRole);
        resolver.propose(id, 1, bytes32("evidence"));
        assertEq(uint256(pool.state()), uint256(State.Closed)); // propose closes a due pool
        vm.warp(block.timestamp + resolver.DISPUTE_WINDOW());
        resolver.finalize(id);
        assertEq(uint256(pool.state()), uint256(State.Resolved));
        assertEq(pool.winningBucket(), 1);
        vm.prank(alice);
        assertEq(pool.redeem(), 10 * USDC);
    }

    function test_manual_disputeBlocksUntilReproposed() public {
        (uint256 id, KizashiPool pool) = _manualMarketWithPosition();
        vm.warp(close);
        vm.prank(resolverRole);
        resolver.propose(id, 2, bytes32("wrong"));
        vm.prank(alice);
        resolver.dispute(id, bytes32("bucket is 1"));
        vm.warp(block.timestamp + resolver.DISPUTE_WINDOW());
        vm.expectRevert(KizashiResolver.ProposalDisputed.selector);
        resolver.finalize(id);
        vm.prank(resolverRole);
        resolver.propose(id, 1, bytes32("fixed"));
        vm.warp(block.timestamp + resolver.DISPUTE_WINDOW());
        resolver.finalize(id);
        assertEq(pool.winningBucket(), 1);
    }

    function test_manual_reverts() public {
        (uint256 id,) = _manualMarketWithPosition();
        vm.expectRevert(KizashiResolver.NotResolverRole.selector);
        resolver.propose(id, 1, bytes32(0));
        vm.prank(resolverRole);
        vm.expectRevert(KizashiResolver.PoolNotClosed.selector);
        resolver.propose(id, 1, bytes32(0));
        vm.expectRevert(KizashiResolver.NoProposal.selector);
        resolver.finalize(id);
        vm.expectRevert(KizashiResolver.NoProposal.selector);
        resolver.dispute(id, bytes32(0));

        vm.warp(close);
        vm.prank(resolverRole);
        resolver.propose(id, 1, bytes32(0));
        uint64 endsAt = uint64(block.timestamp) + resolver.DISPUTE_WINDOW();
        vm.expectRevert(abi.encodeWithSelector(KizashiResolver.DisputeWindowOpen.selector, endsAt));
        resolver.finalize(id);
        vm.prank(bob);
        vm.expectRevert(KizashiResolver.NotAPositionHolder.selector);
        resolver.dispute(id, bytes32(0));
        vm.warp(endsAt);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(KizashiResolver.DisputeWindowClosed.selector, endsAt)
        );
        resolver.dispute(id, bytes32(0));

        vm.expectRevert(abi.encodeWithSelector(KizashiResolver.UnknownMarket.selector, 99));
        resolver.finalize(99);
        vm.expectRevert(KizashiResolver.NotTwapMarket.selector);
        resolver.resolveFromTwap(id);
        PriceSource memory src = twapParams(close).priceSource;
        vm.expectRevert(KizashiResolver.NotFactory.selector);
        resolver.register(5, KizashiPool(address(1)), ResolutionMode.Manual, src);
    }

    // --- TWAP path -----------------------------------------------------------------

    function _swapsUntilClose(uint256 count) internal {
        uint256 step = 300 / count;
        vm.warp(close - 300);
        for (uint256 i; i < count; ++i) {
            vm.warp(block.timestamp + step);
            swap(priceKey, i % 2 == 0, -1e12, ZERO_BYTES);
        }
        vm.warp(close);
    }

    function test_twap_resolvesFromHookPrice() public {
        (uint256 id, KizashiPool pool) = createMarket(twapParams(close));
        _swapsUntilClose(12);
        resolver.resolveFromTwap(id);
        assertEq(uint256(pool.state()), uint256(State.Resolved));
        // Price stays ~1.00 -> grid value ~100 -> bucket 4 (width 25). Tiny swaps can tip
        // the mean tick just below 0, which floors to 99 -> bucket 3; either is the true price.
        assertTrue(pool.winningBucket() == 4 || pool.winningBucket() == 3);
        PriceSource memory s = resolver.priceSourceOf(id);
        (int24 mean,) = hook.consult(PoolIdLibrary.toId(s.key), uint32(close - 300), uint32(close));
        assertEq(pool.winningBucket(), pool.bucketOf(resolver.gridValue(s, mean)));
    }

    function test_twap_tooFewObservationsFallsBackToManual() public {
        (uint256 id, KizashiPool pool) = createMarket(twapParams(close));
        _swapsUntilClose(3);
        vm.expectEmit(true, false, false, false, address(resolver));
        emit KizashiResolver.TwapRejected(id, 0, 0);
        resolver.resolveFromTwap(id);
        assertEq(uint256(pool.state()), uint256(State.Closed));
        vm.expectRevert(KizashiResolver.NotTwapMarket.selector);
        resolver.resolveFromTwap(id);
        vm.prank(resolverRole);
        resolver.propose(id, 4, bytes32("manual fallback"));
        vm.warp(block.timestamp + resolver.DISPUTE_WINDOW());
        resolver.finalize(id);
        assertEq(pool.winningBucket(), 4);
    }

    /// Audit SPONSOR-AUDIT-01 #2: swaps after the window starts can push it out of the hook's
    /// 720-entry buffer. Resolution must fall back to manual instead of locking the market.
    function test_twap_windowPushedOutOfBufferFallsBackToManual() public {
        (uint256 id, KizashiPool pool) = createMarket(twapParams(close));
        vm.warp(close - 300);
        for (uint256 i; i < 725; ++i) {
            vm.warp(block.timestamp + 1);
            swap(priceKey, i % 2 == 0, -1e12, ZERO_BYTES);
        }
        resolver.resolveFromTwap(id); // window [close-300, close] is no longer covered
        assertEq(uint256(pool.state()), uint256(State.Closed));
        (,, bool rejected) = resolver.markets(id);
        assertTrue(rejected);
        vm.prank(resolverRole);
        resolver.propose(id, 4, bytes32("manual after buffer overflow"));
        vm.warp(block.timestamp + resolver.DISPUTE_WINDOW());
        resolver.finalize(id);
        assertEq(uint256(pool.state()), uint256(State.Resolved));
    }

    function test_twap_tooEarly() public {
        (uint256 id,) = createMarket(twapParams(close));
        vm.expectRevert(abi.encodeWithSelector(KizashiResolver.TooEarly.selector, close));
        resolver.resolveFromTwap(id);
    }

    function test_twap_manualProposalRejectedWhileTwapLive() public {
        (uint256 id,) = createMarket(twapParams(close));
        vm.warp(close);
        vm.prank(resolverRole);
        vm.expectRevert(KizashiResolver.NotManualMarket.selector);
        resolver.propose(id, 1, bytes32(0));
    }

    function test_gridValue_orientationAndDecimals() public view {
        PriceSource memory s = twapParams(close).priceSource;
        assertEq(resolver.gridValue(s, 0), 100); // 1.00 at 2 grid decimals
        s.baseIsToken0 = false;
        assertEq(resolver.gridValue(s, 0), 100);
        s.baseIsToken0 = true;
        s.baseDecimals = 18;
        s.quoteDecimals = 6; // 1 base unit of an 18-dec token per 1 base unit of USDC
        assertEq(resolver.gridValue(s, 0), 100 * 1e12);
        // 1.0001^6931 = 1.99982 -> 199; 1.0001^6932 = 2.00002 -> 200 (floor)
        s.quoteDecimals = 18;
        assertEq(resolver.gridValue(s, 6931), 199);
        assertEq(resolver.gridValue(s, 6932), 200);
        s.baseIsToken0 = false;
        assertEq(resolver.gridValue(s, -6931), 199);
        assertEq(resolver.gridValue(s, -6932), 200);
    }
}

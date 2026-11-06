// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {KizashiPool} from "../../src/core/KizashiPool.sol";
import {
    Config,
    IKizashiErrors,
    IKizashiEvents,
    Quote,
    State
} from "../../src/core/KizashiTypes.sol";
import {LSE} from "../../src/core/LSE.sol";
import {FeeOnTransferToken} from "./mocks/FeeOnTransferToken.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract KizashiPoolTest is Test {
    int256 internal constant WAD = 1e18;
    uint256 internal constant USDC = 1e6;
    uint64 internal constant CLOSE = 10_000;
    int256 internal constant NO_LIMIT = type(int256).max;

    MockUSDC internal usdc;
    KizashiPool internal pool;
    address internal creator = makeAddr("creator");
    address internal resolver = makeAddr("resolver");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockUSDC();
        pool = _newPool(2, 100 * USDC);
        _fund(alice);
        _fund(bob);
    }

    // --- initialize ---------------------------------------------------------------------

    function test_initialize_setsLiquidityFromSubsidy() public view {
        assertEq(uint256(pool.state()), uint256(State.Open));
        assertEq(pool.cash(), 100 * USDC);
        assertEq(pool.b(), LSE.bFromSubsidy(100 * WAD, 2));
        assertLe(pool.lossBound(), 100 * WAD);
        int256[] memory p = pool.prices();
        assertEq(p[0], WAD / 2);
        assertEq(p[1], WAD / 2);
    }

    function test_initialize_emitsConfig() public {
        KizashiPool fresh = new KizashiPool();
        usdc.mint(address(this), USDC);
        usdc.approve(address(fresh), USDC);
        vm.expectEmit(true, true, false, false, address(fresh));
        emit IKizashiEvents.Initialized(creator, resolver, address(usdc), 2, 0, 10, 0, USDC, CLOSE);
        fresh.initialize(_config(2), USDC, creator, resolver, CLOSE);
    }

    function test_initialize_reverts() public {
        vm.expectRevert(IKizashiErrors.AlreadyInitialized.selector);
        pool.initialize(_config(2), USDC, creator, resolver, CLOSE);

        KizashiPool fresh = new KizashiPool();
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadGrid.selector, 65, int256(10)));
        fresh.initialize(_config(65), USDC, creator, resolver, CLOSE);
        vm.expectRevert(IKizashiErrors.ZeroSubsidy.selector);
        fresh.initialize(_config(2), 0, creator, resolver, CLOSE);
        vm.expectRevert(
            abi.encodeWithSelector(IKizashiErrors.SubsidyOutOfBounds.selector, USDC - 1)
        );
        fresh.initialize(_config(2), USDC - 1, creator, resolver, CLOSE);
        vm.expectRevert(
            abi.encodeWithSelector(IKizashiErrors.SubsidyOutOfBounds.selector, 1e15 + 1)
        );
        fresh.initialize(_config(2), 1e15 + 1, creator, resolver, CLOSE);
        vm.expectRevert(IKizashiErrors.ZeroAddress.selector);
        fresh.initialize(_config(2), USDC, address(0), resolver, CLOSE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadCloseTime.selector, uint64(1)));
        fresh.initialize(_config(2), USDC, creator, resolver, 1);
    }

    function test_initialize_rejectsFeeOnTransferCollateral() public {
        FeeOnTransferToken fee = new FeeOnTransferToken();
        KizashiPool fresh = new KizashiPool();
        fee.mint(address(this), 10 * USDC);
        fee.approve(address(fresh), 10 * USDC);
        Config memory c = Config({n: 2, lo: 0, w: 10, collateral: address(fee)});
        vm.expectRevert(IKizashiErrors.ZeroSubsidy.selector);
        fresh.initialize(c, 10 * USDC, creator, resolver, CLOSE);
    }

    // --- quote and trade ----------------------------------------------------------------

    function test_trade_chargesLmsrAndMovesPrices() public {
        int256[] memory delta = _vec(10 * WAD, 0);
        int256 expected = LSE.tradeCharge(pool.q(), delta, pool.b());
        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        Quote memory got = pool.trade(delta, NO_LIMIT, CLOSE);
        assertEq(got.chargeWad, expected);
        assertEq(got.chargeUsdc, (expected + 1e12 - 1) / 1e12);
        assertEq(before - usdc.balanceOf(alice), uint256(got.chargeUsdc));
        assertGt(got.pricesAfter[0], WAD / 2);
        assertEq(pool.cash(), 100 * USDC + uint256(got.chargeUsdc));
    }

    function test_trade_sellPaysOutRoundedDown() public {
        vm.startPrank(alice);
        pool.trade(_vec(10 * WAD, 0), NO_LIMIT, CLOSE);
        uint256 before = usdc.balanceOf(alice);
        Quote memory sell = pool.trade(_vec(-10 * WAD, 0), NO_LIMIT, CLOSE);
        vm.stopPrank();
        assertLt(sell.chargeWad, 0);
        assertEq(sell.topUpWad, 0);
        assertEq(usdc.balanceOf(alice) - before, uint256(-sell.chargeUsdc));
        assertLe(-sell.chargeUsdc * 1e12, -sell.chargeWad);
    }

    function test_trade_emitsOriginalDeltaAndTopUp() public {
        int256[] memory delta = _vec(-10 * WAD, 0);
        Quote memory preview = pool.quote(alice, delta);
        vm.expectEmit(true, false, false, true, address(pool));
        emit IKizashiEvents.Traded(alice, delta, 10 * WAD, preview.chargeWad, preview.chargeUsdc);
        vm.prank(alice);
        pool.trade(delta, NO_LIMIT, CLOSE);
    }

    /// ACCOUNTING §3 examples under real pricing: top-ups and floors are exact.
    function test_accounting_shortThenHedgeAndRelease() public {
        vm.startPrank(alice);
        assertEq(pool.trade(_vec(-10 * WAD, 0), NO_LIMIT, CLOSE).topUpWad, 10 * WAD);
        assertEq(pool.trade(_vec(6 * WAD, 0), NO_LIMIT, CLOSE).topUpWad, 0);
        assertEq(pool.floorOf(alice), 6 * WAD);
        uint256 before = usdc.balanceOf(alice);
        int256 costBefore = LSE.costUp(pool.q(), pool.b());
        assertEq(pool.release(6 * WAD), 6 * USDC);
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice) - before, 6 * USDC);
        assertEq(LSE.costUp(pool.q(), pool.b()), costBefore - 6 * WAD); // exact translation
        int256[] memory p = pool.positionOf(alice);
        assertEq(p[0], 0);
        assertEq(p[1], 4 * WAD);
    }

    function test_quote_explicitOwner() public {
        vm.prank(alice);
        pool.trade(_vec(-10 * WAD, 0), NO_LIMIT, CLOSE);
        assertEq(pool.quote(alice, _vec(6 * WAD, 0)).topUpWad, 0);
        assertEq(pool.quote(bob, _vec(-6 * WAD, 0)).topUpWad, 6 * WAD);
    }

    function test_trade_reverts() public {
        vm.startPrank(alice);
        vm.expectRevert(IKizashiErrors.ZeroTrade.selector);
        pool.trade(_vec(0, 0), NO_LIMIT, CLOSE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.LengthMismatch.selector, 2, 1));
        pool.trade(new int256[](1), NO_LIMIT, CLOSE);
        vm.expectRevert(
            abi.encodeWithSelector(IKizashiErrors.TradeTooLarge.selector, 0, 1e30 + 1, 1e30)
        );
        pool.trade(_vec(1e30 + 1, 0), NO_LIMIT, CLOSE);
        Quote memory preview = pool.quote(alice, _vec(10 * WAD, 0));
        vm.expectRevert(
            abi.encodeWithSelector(
                IKizashiErrors.ChargeAboveLimit.selector, preview.chargeUsdc, int256(USDC)
            )
        );
        pool.trade(_vec(10 * WAD, 0), int256(USDC), CLOSE);
        vm.warp(CLOSE - 1);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.DeadlineExpired.selector, uint64(5)));
        pool.trade(_vec(WAD, 0), NO_LIMIT, 5);
        vm.warp(CLOSE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.PastClose.selector, CLOSE));
        pool.trade(_vec(WAD, 0), NO_LIMIT, CLOSE);
        vm.stopPrank();
    }

    function test_trade_qBoundReverts() public {
        KizashiPool big = _newPool(2, 1e15);
        usdc.mint(alice, 1e30);
        vm.startPrank(alice);
        usdc.approve(address(big), type(uint256).max);
        for (uint256 i; i < 1000; ++i) {
            big.trade(_vec(1e30, 0), NO_LIMIT, CLOSE);
        }
        vm.expectRevert(
            abi.encodeWithSelector(IKizashiErrors.QOutOfBounds.selector, int256(1e33 + 1e30))
        );
        big.trade(_vec(1e30, 0), NO_LIMIT, CLOSE);
        vm.stopPrank();
    }

    // --- release --------------------------------------------------------------------------

    function test_release_reverts() public {
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NonPositiveAmount.selector, 0));
        pool.release(0);
        vm.expectRevert(
            abi.encodeWithSelector(IKizashiErrors.ReleaseAboveFloor.selector, int256(1), 0)
        );
        pool.release(1);
        vm.stopPrank();
        _closeAndResolve(0);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotOpen.selector, State.Resolved));
        vm.prank(alice);
        pool.release(1);
    }

    function test_release_subUnitDustStaysInPool() public {
        vm.startPrank(alice);
        pool.trade(_vec(WAD, WAD), NO_LIMIT, CLOSE);
        uint256 cashBefore = pool.cash();
        assertEq(pool.release(1e12 - 1), 0); // less than one USDC base unit pays nothing
        vm.stopPrank();
        assertEq(pool.cash(), cashBefore);
        assertEq(pool.floorOf(alice), WAD - (1e12 - 1));
    }

    // --- close, resolve, redeem, sweep -------------------------------------------------------

    function test_lifecycle_endToEnd() public {
        vm.prank(alice);
        pool.trade(_vec(10 * WAD, 0), NO_LIMIT, CLOSE);
        vm.prank(bob);
        pool.trade(_vec(0, 4 * WAD), NO_LIMIT, CLOSE);

        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.TooEarly.selector, CLOSE));
        pool.close();
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotClosed.selector, State.Open));
        vm.prank(resolver);
        pool.resolve(0);
        vm.warp(CLOSE);
        vm.expectEmit(true, false, false, false, address(pool));
        emit IKizashiEvents.Closed(address(this));
        pool.close();
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotOpen.selector, State.Closed));
        pool.close();
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotResolver.selector, alice));
        vm.prank(alice);
        pool.resolve(0);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadBucket.selector, 2, 2));
        vm.prank(resolver);
        pool.resolve(2);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotResolved.selector, State.Closed));
        vm.prank(alice);
        pool.redeem();
        vm.prank(resolver);
        pool.resolve(0);

        assertEq(pool.outstandingWad(), 10 * WAD);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NothingToRedeem.selector, bob));
        vm.prank(bob);
        pool.redeem();
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotCreator.selector, alice));
        vm.prank(alice);
        pool.sweep();

        vm.prank(creator);
        uint256 firstSweep = pool.sweep();
        assertEq(pool.cash(), 10 * USDC); // unredeemed claim is kept
        vm.expectRevert(IKizashiErrors.NothingToSweep.selector);
        vm.prank(creator);
        pool.sweep();

        vm.prank(alice);
        assertEq(pool.redeem(), 10 * USDC);
        assertEq(pool.outstandingWad(), 0);
        assertEq(pool.cash(), 0);
        assertEq(usdc.balanceOf(address(pool)), 0);
        assertEq(usdc.balanceOf(creator), firstSweep);
        // I3: maker loss <= b ln N
        int256 makerPnl = int256(firstSweep) * 1e12 - 100 * WAD;
        assertGe(makerPnl, -pool.lossBound());
    }

    function test_bucketOfAndViews() public view {
        assertEq(pool.bucketOf(-5), 0);
        assertEq(pool.bucketOf(10), 1);
        assertEq(pool.bucketOf(1e9), 1);
        assertEq(pool.creator(), creator);
        assertEq(pool.resolver(), resolver);
        assertEq(pool.closeTime(), CLOSE);
        assertEq(pool.config().n, 2);
        assertEq(pool.outstandingWad(), 0);
    }

    function test_sixtyFourBuckets() public {
        KizashiPool wide = _newPool(64, 1000 * USDC);
        int256[] memory delta = new int256[](64);
        for (uint256 i = 20; i < 40; ++i) {
            delta[i] = 50 * WAD;
        }
        vm.startPrank(alice);
        usdc.approve(address(wide), type(uint256).max);
        Quote memory got = wide.trade(delta, NO_LIMIT, CLOSE);
        vm.stopPrank();
        int256 total;
        for (uint256 i; i < 64; ++i) {
            total += got.pricesAfter[i];
        }
        assertLe(total, WAD);
        assertGt(got.pricesAfter[30], got.pricesAfter[0]);
    }

    // --- helpers -------------------------------------------------------------------------

    function _newPool(uint256 n, uint256 subsidy) internal returns (KizashiPool p) {
        p = new KizashiPool();
        usdc.mint(address(this), subsidy);
        usdc.approve(address(p), subsidy);
        p.initialize(_config(n), subsidy, creator, resolver, CLOSE);
    }

    function _closeAndResolve(uint256 bucket) internal {
        vm.warp(CLOSE);
        pool.close();
        vm.prank(resolver);
        pool.resolve(bucket);
    }

    function _config(uint256 n) internal view returns (Config memory) {
        return Config({n: n, lo: 0, w: 10, collateral: address(usdc)});
    }

    function _fund(address who) internal {
        usdc.mint(who, 1_000_000 * USDC);
        vm.prank(who);
        usdc.approve(address(pool), type(uint256).max);
    }

    function _vec(int256 a, int256 c) internal pure returns (int256[] memory v) {
        v = new int256[](2);
        v[0] = a;
        v[1] = c;
    }
}

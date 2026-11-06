// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {KizashiPoolStub} from "../../src/core/KizashiPoolStub.sol";
import {IKizashiErrors, IKizashiEvents} from "../../src/core/KizashiTypes.sol";
import {Config, Quote, State} from "../../src/core/KizashiTypes.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract KizashiPoolStubTest is Test {
    int256 internal constant WAD = 1e18;
    uint256 internal constant USDC = 1e6;
    uint64 internal constant CLOSE = 1000;

    MockUSDC internal usdc;
    KizashiPoolStub internal pool;
    address internal creator = makeAddr("creator");
    address internal resolver = makeAddr("resolver");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockUSDC();
        pool = new KizashiPoolStub();
        usdc.mint(address(this), 100 * USDC);
        usdc.approve(address(pool), type(uint256).max);
        pool.initialize(_config(2), 100 * USDC, creator, resolver, CLOSE);
        _fund(alice);
        _fund(bob);
    }

    function test_initialize_pullsSubsidyAndOpens() public view {
        assertEq(uint256(pool.state()), uint256(State.Open));
        assertEq(pool.cash(), 100 * USDC);
        assertEq(usdc.balanceOf(address(pool)), 100 * USDC);
        assertEq(pool.q().length, 2);
        assertEq(pool.creator(), creator);
    }

    function test_initialize_rejectsSecondCall() public {
        vm.expectRevert(IKizashiErrors.AlreadyInitialized.selector);
        pool.initialize(_config(2), USDC, creator, resolver, CLOSE);
    }

    function test_initialize_rejectsBadGrid() public {
        KizashiPoolStub fresh = new KizashiPoolStub();
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadGrid.selector, 1, int256(10)));
        fresh.initialize(_config(1), USDC, creator, resolver, CLOSE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadGrid.selector, 65, int256(10)));
        fresh.initialize(_config(65), USDC, creator, resolver, CLOSE);
    }

    function test_initialize_rejectsZeroSubsidy() public {
        KizashiPoolStub fresh = new KizashiPoolStub();
        vm.expectRevert(IKizashiErrors.ZeroSubsidy.selector);
        fresh.initialize(_config(2), 0, creator, resolver, CLOSE);
    }

    /// ACCOUNTING §3 "Short then hedge": (-10,0) then (6,0) -> top-up 10, P = (6,10), floor 6.
    function test_accounting_shortThenHedge() public {
        vm.startPrank(alice);
        Quote memory first = pool.trade(_vec(-10 * WAD, 0), type(int256).max, CLOSE);
        assertEq(first.topUpWad, 10 * WAD);
        Quote memory second = pool.trade(_vec(6 * WAD, 0), type(int256).max, CLOSE);
        assertEq(second.topUpWad, 0);
        vm.stopPrank();
        int256[] memory position = pool.positionOf(alice);
        assertEq(position[0], 6 * WAD);
        assertEq(position[1], 10 * WAD);
        assertEq(pool.floorOf(alice), 6 * WAD);

        vm.prank(alice);
        pool.release(6 * WAD);
        position = pool.positionOf(alice);
        assertEq(position[0], 0);
        assertEq(position[1], 4 * WAD);
        assertEq(pool.floorOf(alice), 0);
    }

    /// ACCOUNTING §3 "Offsetting shorts": second short needs no additional top-up.
    function test_accounting_offsettingShorts() public {
        vm.startPrank(alice);
        assertEq(pool.trade(_vec(-10 * WAD, 0), type(int256).max, CLOSE).topUpWad, 10 * WAD);
        assertEq(pool.trade(_vec(0, -10 * WAD), type(int256).max, CLOSE).topUpWad, 0);
        vm.stopPrank();
        assertEq(pool.floorOf(alice), 0);
    }

    function test_trade_emitsOriginalDelta() public {
        int256[] memory delta = _vec(-10 * WAD, 0);
        vm.expectEmit(true, false, false, true, address(pool));
        emit IKizashiEvents.Traded(alice, delta, 10 * WAD, 10 * WAD, 10 * int256(USDC));
        vm.prank(alice);
        pool.trade(delta, type(int256).max, CLOSE);
    }

    function test_trade_respectsLimit() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IKizashiErrors.ChargeAboveLimit.selector, int256(10 * USDC), int256(USDC)
            )
        );
        pool.trade(_vec(10 * WAD, 0), int256(USDC), CLOSE);
    }

    function test_trade_rejectsZeroLengthMismatchAndLateCalls() public {
        vm.startPrank(alice);
        vm.expectRevert(IKizashiErrors.ZeroTrade.selector);
        pool.trade(_vec(0, 0), 0, CLOSE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.LengthMismatch.selector, 2, 1));
        pool.trade(new int256[](1), 0, CLOSE);
        vm.warp(CLOSE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.PastClose.selector, CLOSE));
        pool.trade(_vec(WAD, 0), type(int256).max, CLOSE);
        vm.stopPrank();
    }

    function test_quote_usesExplicitOwner() public {
        vm.prank(alice);
        pool.trade(_vec(-10 * WAD, 0), type(int256).max, CLOSE);
        assertEq(pool.quote(alice, _vec(6 * WAD, 0)).topUpWad, 0);
        assertEq(pool.quote(bob, _vec(-6 * WAD, 0)).topUpWad, 6 * WAD);
    }

    function test_lifecycle_closeResolveRedeemSweep() public {
        vm.prank(alice);
        pool.trade(_vec(10 * WAD, 0), type(int256).max, CLOSE);
        vm.prank(bob);
        pool.trade(_vec(0, 4 * WAD), type(int256).max, CLOSE);

        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.TooEarly.selector, CLOSE));
        pool.close();
        vm.warp(CLOSE);
        pool.close();
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotResolver.selector, alice));
        vm.prank(alice);
        pool.resolve(0);
        vm.prank(resolver);
        pool.resolve(0);

        assertEq(pool.outstandingWad(), 10 * WAD);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NothingToRedeem.selector, bob));
        vm.prank(bob);
        pool.redeem();

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        assertEq(pool.redeem(), 10 * USDC);
        assertEq(usdc.balanceOf(alice) - before, 10 * USDC);
        assertEq(pool.outstandingWad(), 0);

        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NotCreator.selector, alice));
        vm.prank(alice);
        pool.sweep();
        vm.prank(creator);
        uint256 swept = pool.sweep();
        assertEq(swept, usdc.balanceOf(creator));
        assertEq(pool.cash(), 0);
        assertEq(usdc.balanceOf(address(pool)), 0);
    }

    function test_sweep_keepsUnredeemedClaims() public {
        vm.prank(alice);
        pool.trade(_vec(10 * WAD, 0), type(int256).max, CLOSE);
        vm.warp(CLOSE);
        pool.close();
        vm.prank(resolver);
        pool.resolve(0);
        vm.prank(creator);
        pool.sweep();
        assertEq(pool.cash(), 10 * USDC);
        vm.prank(alice);
        assertEq(pool.redeem(), 10 * USDC);
    }

    function test_bucketOf_clampsToGrid() public view {
        assertEq(pool.bucketOf(-1), 0);
        assertEq(pool.bucketOf(0), 0);
        assertEq(pool.bucketOf(9), 0);
        assertEq(pool.bucketOf(10), 1);
        assertEq(pool.bucketOf(1000), 1);
    }

    function test_usdcHasSixDecimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function _config(uint256 n) internal view returns (Config memory) {
        return Config({n: n, lo: 0, w: 10, collateral: address(usdc)});
    }

    function _fund(address who) internal {
        usdc.mint(who, 1000 * USDC);
        vm.prank(who);
        usdc.approve(address(pool), type(uint256).max);
    }

    function _vec(int256 a, int256 b_) internal pure returns (int256[] memory v) {
        v = new int256[](2);
        v[0] = a;
        v[1] = b_;
    }
}

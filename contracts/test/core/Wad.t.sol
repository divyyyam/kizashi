// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IKizashiErrors} from "../../src/core/KizashiTypes.sol";
import {Wad} from "../../src/core/Wad.sol";
import {LibHarness} from "./harness/LibHarness.sol";

contract WadTest is Test {
    LibHarness internal h = new LibHarness();
    int256 internal constant ONE = 1e18;
    uint256 internal constant MAX_USDC = uint256(type(int256).max) / 1e12;

    function test_toWad_zeroOneUnitAndMax() public view {
        assertEq(h.toWad(0), 0);
        assertEq(h.toWad(1), 1e12);
        assertEq(h.toWad(1e6), ONE);
        assertEq(h.toWad(MAX_USDC), int256(MAX_USDC) * 1e12);
    }

    function test_toWad_revertsAboveMax() public {
        vm.expectRevert();
        h.toWad(MAX_USDC + 1);
    }

    function test_toUsdc_roundsInStatedDirection() public view {
        assertEq(h.toUsdcDown(0), 0);
        assertEq(h.toUsdcUp(0), 0);
        assertEq(h.toUsdcDown(1), 0); // 1 WAD unit pays nothing
        assertEq(h.toUsdcUp(1), 1); // 1 WAD unit charged as one base unit
        assertEq(h.toUsdcDown(1e12), 1);
        assertEq(h.toUsdcUp(1e12), 1);
        assertEq(h.toUsdcDown(2e12 - 1), 1);
        assertEq(h.toUsdcUp(1e12 + 1), 2);
    }

    function test_toUsdc_rejectsNegative() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NegativeAmount.selector, int256(-1)));
        h.toUsdcDown(-1);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.NegativeAmount.selector, int256(-1)));
        h.toUsdcUp(-1);
    }

    function test_mulDiv_signedDirections() public pure {
        assertEq(Wad.mulDown(3, ONE / 2), 1); // 1.5 WAD units -> 1
        assertEq(Wad.mulUp(3, ONE / 2), 2);
        assertEq(Wad.mulDown(-3, ONE / 2), -2); // -1.5 -> -2 (toward -inf)
        assertEq(Wad.mulUp(-3, ONE / 2), -1);
        assertEq(Wad.divDown(1, 3 * ONE), 0);
        assertEq(Wad.divUp(1, 3 * ONE), 1);
        assertEq(Wad.divDown(-1, 3 * ONE), -1);
        assertEq(Wad.divUp(-1, 3 * ONE), 0);
        assertEq(Wad.mulDown(0, ONE), 0);
        assertEq(Wad.divUp(0, ONE), 0);
    }

    function test_floorCeil_exactWhenDivisible() public pure {
        assertEq(Wad.floorDiv(-6, 3), -2);
        assertEq(Wad.ceilDiv(-6, 3), -2);
        assertEq(Wad.floorDiv(7, -2), -4);
        assertEq(Wad.ceilDiv(7, -2), -3);
    }

    function test_exp_exactAtZeroAndBracketsTrueValue() public pure {
        assertEq(Wad.expNegUp(0), ONE);
        assertEq(Wad.expNegDown(0), ONE);
        // exp(-1) = 0.367879441171442321595523770161460867...
        int256 trueFloor = 367_879_441_171_442_321;
        assertLe(Wad.expNegDown(-ONE), trueFloor);
        assertGe(Wad.expNegUp(-ONE), trueFloor + 1);
        assertEq(Wad.expNegDown(-100 * ONE), 0);
        assertGt(Wad.expNegUp(-100 * ONE), 0);
    }

    function test_exp_rejectsPositive() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.ExpDomain.selector, int256(1)));
        h.expNegUp(1);
    }

    function test_ln_exactAtOneAndBracketsTrueValue() public pure {
        assertEq(Wad.lnAtLeastOneUp(ONE), 0);
        assertEq(Wad.lnAtLeastOneDown(ONE), 0);
        // ln 2 = 0.693147180559945309417232121458176568...
        int256 trueFloor = 693_147_180_559_945_309;
        assertLe(Wad.lnAtLeastOneDown(2 * ONE), trueFloor);
        assertGe(Wad.lnAtLeastOneUp(2 * ONE), trueFloor + 1);
    }

    function test_ln_rejectsBelowOne() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.LnDomain.selector, ONE - 1));
        h.lnAtLeastOneDown(ONE - 1);
    }

    function testFuzz_exp_monotoneAndOrdered(int256 a, int256 b) public pure {
        a = bound(a, -45 * ONE, 0);
        b = bound(b, a, 0);
        assertLe(Wad.expNegDown(a), Wad.expNegUp(a));
        assertLe(Wad.expNegDown(a), Wad.expNegDown(b));
        assertLe(Wad.expNegUp(a), Wad.expNegUp(b));
    }

    function testFuzz_ln_ordered(int256 x) public pure {
        x = bound(x, ONE, 1e21);
        assertLe(Wad.lnAtLeastOneDown(x), Wad.lnAtLeastOneUp(x));
        assertGe(Wad.lnAtLeastOneDown(x), 0);
    }
}

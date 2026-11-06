// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IKizashiErrors} from "../../src/core/KizashiTypes.sol";
import {VecLib} from "../../src/core/VecLib.sol";
import {LibHarness} from "./harness/LibHarness.sol";

contract VecLibTest is Test {
    LibHarness internal h = new LibHarness();

    function test_arithmetic() public pure {
        int256[] memory a = _v3(1, -2, 3);
        int256[] memory b = _v3(10, 20, -30);
        _eq(VecLib.add(a, b), _v3(11, 18, -27));
        _eq(VecLib.sub(a, b), _v3(-9, -22, 33));
        _eq(VecLib.addScalar(a, 5), _v3(6, 3, 8));
        _eq(VecLib.scale(a, -2), _v3(-2, 4, -6));
    }

    function test_reductions() public pure {
        int256[] memory a = _v3(4, -7, 9);
        assertEq(VecLib.minOf(a), -7);
        assertEq(VecLib.maxOf(a), 9);
        assertEq(VecLib.argMax(a), 2);
        assertEq(VecLib.argMax(_v3(5, 5, 1)), 0);
        assertFalse(VecLib.isNonNeg(a));
        assertTrue(VecLib.isNonNeg(_v3(0, 1, 2)));
    }

    function test_lengthMismatchReverts() public {
        int256[] memory two = new int256[](2);
        int256[] memory three = new int256[](3);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.LengthMismatch.selector, 2, 3));
        h.add(two, three);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.LengthMismatch.selector, 3, 2));
        h.sub(three, two);
    }

    function test_emptyReductionReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.LengthMismatch.selector, 1, 0));
        h.minOf(new int256[](0));
    }

    function _v3(int256 a, int256 b, int256 c) internal pure returns (int256[] memory v) {
        v = new int256[](3);
        (v[0], v[1], v[2]) = (a, b, c);
    }

    function _eq(int256[] memory a, int256[] memory b) internal pure {
        assertEq(a.length, b.length);
        for (uint256 i; i < a.length; ++i) {
            assertEq(a[i], b[i]);
        }
    }
}

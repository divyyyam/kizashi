// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IKizashiErrors} from "../../src/core/KizashiTypes.sol";
import {Grid} from "../../src/core/Grid.sol";
import {LibHarness} from "./harness/LibHarness.sol";

contract GridTest is Test {
    LibHarness internal h = new LibHarness();

    function test_validate_acceptsBounds() public view {
        h.validate(2, 1);
        h.validate(64, 1);
    }

    function test_validate_rejectsBadGrids() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadGrid.selector, 1, int256(1)));
        h.validate(1, 1);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadGrid.selector, 65, int256(1)));
        h.validate(65, 1);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadGrid.selector, 4, int256(0)));
        h.validate(4, 0);
    }

    function test_bucketOf_belowInsideEdgesAndAbove() public pure {
        // lo = 100, w = 5, n = 4 -> [100,105) [105,110) [110,115) [115,120)
        assertEq(Grid.bucketOf(100, 5, 4, -1000), 0);
        assertEq(Grid.bucketOf(100, 5, 4, 99), 0);
        assertEq(Grid.bucketOf(100, 5, 4, 100), 0);
        assertEq(Grid.bucketOf(100, 5, 4, 104), 0);
        assertEq(Grid.bucketOf(100, 5, 4, 105), 1);
        assertEq(Grid.bucketOf(100, 5, 4, 119), 3);
        assertEq(Grid.bucketOf(100, 5, 4, 120), 3);
        assertEq(Grid.bucketOf(100, 5, 4, 1e30), 3);
    }

    function test_bucketOf_negativeGrid() public pure {
        assertEq(Grid.bucketOf(-20, 10, 4, -11), 0);
        assertEq(Grid.bucketOf(-20, 10, 4, -10), 1);
        assertEq(Grid.bucketOf(-20, 10, 4, 0), 2);
    }

    function test_bounds() public view {
        (int256 from, int256 to) = h.bounds(100, 5, 4, 3);
        assertEq(from, 115);
        assertEq(to, 120);
    }

    function test_bounds_rejectsIndexOutOfRange() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadBucket.selector, 4, 4));
        h.bounds(100, 5, 4, 4);
    }
}

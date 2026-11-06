// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IKizashiErrors} from "../../src/core/KizashiTypes.sol";
import {Netting} from "../../src/core/Netting.sol";
import {Shapes} from "../../src/core/Shapes.sol";
import {VecLib} from "../../src/core/VecLib.sol";
import {LibHarness} from "./harness/LibHarness.sol";

contract ShapesNettingTest is Test {
    using VecLib for int256[];

    int256 internal constant ONE = 1e18;
    LibHarness internal h = new LibHarness();

    function test_step_and_belowAsRange() public pure {
        int256[] memory above = Shapes.step(4, 2, ONE);
        int256[] memory below = Shapes.range(4, 0, 2, ONE);
        for (uint256 i; i < 4; ++i) {
            assertEq(above[i], i >= 2 ? ONE : int256(0));
            assertEq(below[i], i < 2 ? ONE : int256(0));
            assertEq(above[i] + below[i], ONE); // complementary sides cover every bucket
        }
    }

    function test_step_rejectsEdgeThresholds() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadBucket.selector, 0, 4));
        h.step(4, 0, ONE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadBucket.selector, 4, 4));
        h.step(4, 4, ONE);
    }

    function test_range_rejectsEmptyOrOutOfGrid() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadRange.selector, 2, 2, 4));
        h.range(4, 2, 2, ONE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadRange.selector, 1, 5, 4));
        h.range(4, 1, 5, ONE);
    }

    function test_validate() public {
        int256[] memory d = new int256[](3);
        vm.expectRevert(IKizashiErrors.ZeroTrade.selector);
        h.validate(d, 3, ONE);
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.LengthMismatch.selector, 4, 3));
        h.validate(d, 4, ONE);
        d[1] = -ONE - 1;
        vm.expectRevert(
            abi.encodeWithSelector(IKizashiErrors.TradeTooLarge.selector, 1, -ONE - 1, ONE)
        );
        h.validate(d, 3, ONE);
        d[1] = -ONE;
        h.validate(d, 3, ONE);
    }

    function test_emptyHistoryIsZero() public pure {
        int256[][] memory none = new int256[][](0);
        assertEq(Netting.grossCollateral(none), 0);
        assertEq(Netting.nettedCollateral(none), 0);
        assertEq(Netting.freed(none), 0);
        assertEq(Netting.grossFloors(none), 0);
        assertEq(Netting.nettedFloor(none), 0);
    }

    function _tickets(uint256 seed, uint256 count, uint256 n)
        internal
        pure
        returns (int256[][] memory t)
    {
        t = new int256[][](count);
        for (uint256 i; i < count; ++i) {
            t[i] = new int256[](n);
            for (uint256 j; j < n; ++j) {
                uint256 r = uint256(keccak256(abi.encode(seed, i, j)));
                t[i][j] = (int256(r % 201) - 100) * ONE;
            }
        }
    }

    /// I6: freed >= 0, and raw floors satisfy nettedFloor >= grossFloors.
    function testFuzz_I6_freedNonNegative(uint256 seed, uint256 countSeed, uint256 nSeed)
        public
        pure
    {
        int256[][] memory t = _tickets(seed, 1 + countSeed % 8, 2 + nSeed % 15);
        assertGe(Netting.freed(t), 0);
        assertGe(Netting.nettedFloor(t), Netting.grossFloors(t));
        assertLe(Netting.nettedCollateral(t), Netting.grossCollateral(t));
    }

    /// I6: with an existing non-negative position, the top-up never exceeds the standalone one.
    function testFuzz_I6_counterTradeTopUpBounded(uint256 seed, uint256 nSeed) public pure {
        uint256 n = 2 + nSeed % 15;
        int256[][] memory t = _tickets(seed, 2, n);
        (,, int256[] memory position) = Netting.normalise(new int256[](n), t[0]);
        assertTrue(position.isNonNeg());
        assertLe(Netting.topUp(position, t[1]), Netting.collateralRequired(t[1]));
        (,, int256[] memory after_) = Netting.normalise(position, t[1]);
        assertTrue(after_.isNonNeg());
    }

    /// ACCOUNTING §2: P = V + (A - R) * 1 before redemption.
    function testFuzz_positionIdentity(uint256 seed, uint256 countSeed) public pure {
        uint256 n = 4;
        int256[][] memory t = _tickets(seed, 1 + countSeed % 6, n);
        int256[] memory position = new int256[](n);
        int256 topUps;
        for (uint256 i; i < t.length; ++i) {
            int256 k;
            (k,, position) = Netting.normalise(position, t[i]);
            topUps += k;
        }
        int256[] memory v = t[0];
        for (uint256 i = 1; i < t.length; ++i) {
            v = v.add(t[i]);
        }
        for (uint256 j; j < n; ++j) {
            assertEq(position[j], v[j] + topUps);
        }
    }
}

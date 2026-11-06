// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IKizashiErrors} from "../../src/core/KizashiTypes.sol";
import {LSE} from "../../src/core/LSE.sol";
import {VecLib} from "../../src/core/VecLib.sol";
import {LibHarness} from "./harness/LibHarness.sol";

/// @notice Properties of the LMSR cost (SPEC §5: I4, I5) and the subsidy/loss relation.
contract LSETest is Test {
    using VecLib for int256[];

    int256 internal constant ONE = 1e18;
    LibHarness internal h = new LibHarness();

    /// Approved gap between costUp and costDown, mirroring gen_vectors.cost_bound.
    function _gap(int256 b, uint256 n) internal pure returns (int256) {
        return (b * int256(4 * n + 4) + ONE - 1) / ONE + 2;
    }

    function _vec(uint256 seed, uint256 n, int256 b, int256 spread)
        internal
        pure
        returns (int256[] memory v)
    {
        v = new int256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            v[i] = int256(r % uint256(2 * spread * b + 1)) - spread * b;
        }
    }

    function _bounds(uint256 nSeed, int256 bSeed) internal pure returns (uint256 n, int256 b) {
        n = 2 + (nSeed % 63);
        b = 24e16 + int256(uint256(keccak256(abi.encode(bSeed))) % 1e27);
    }

    function testFuzz_costDownLeUpAndUpGeMax(uint256 seed, uint256 nSeed, int256 bSeed)
        public
        pure
    {
        (uint256 n, int256 b) = _bounds(nSeed, bSeed);
        int256[] memory q = _vec(seed, n, b, 50);
        int256 up = LSE.costUp(q, b);
        int256 down = LSE.costDown(q, b);
        assertLe(down, up);
        assertLe(up - down, _gap(b, n));
        assertGe(down, q.maxOf());
    }

    /// I5: translation is exact in both directions (inherited target N WAD units; achieved 0).
    function testFuzz_I5_translationExact(uint256 seed, uint256 nSeed, int256 bSeed, int256 k)
        public
        pure
    {
        (uint256 n, int256 b) = _bounds(nSeed, bSeed);
        k = bound(k, -1e30, 1e30);
        int256[] memory q = _vec(seed, n, b, 30);
        assertEq(LSE.costUp(q.addScalar(k), b), LSE.costUp(q, b) + k);
        assertEq(LSE.costDown(q.addScalar(k), b), LSE.costDown(q, b) + k);
    }

    /// I4: splitting a trade never undercharges, and overcharges by at most one bound gap.
    /// charge(A) + charge(B | A) - charge(A + B) = costUp(q+A) - costDown(q+A).
    function testFuzz_I4_pathAdditivity(uint256 seed, uint256 nSeed, int256 bSeed) public pure {
        (uint256 n, int256 b) = _bounds(nSeed, bSeed);
        int256[] memory q = _vec(seed, n, b, 20);
        int256[] memory a = _vec(uint256(keccak256(abi.encode(seed, 1))), n, b, 5);
        int256[] memory c = _vec(uint256(keccak256(abi.encode(seed, 2))), n, b, 5);
        int256 split = LSE.tradeCharge(q, a, b) + LSE.tradeCharge(q.add(a), c, b);
        int256 whole = LSE.tradeCharge(q, a.add(c), b);
        assertGe(split, whole);
        assertLe(split - whole, _gap(b, n));
    }

    function testFuzz_tradeChargeNeverBelowCostDifference(uint256 seed, uint256 nSeed, int256 bSeed)
        public
        pure
    {
        (uint256 n, int256 b) = _bounds(nSeed, bSeed);
        int256[] memory q = _vec(seed, n, b, 20);
        int256[] memory d = _vec(uint256(keccak256(abi.encode(seed, 7))), n, b, 5);
        assertGe(LSE.tradeCharge(q, d, b), LSE.costDown(q.add(d), b) - LSE.costUp(q, b));
    }

    function test_tradeCharge_zeroDeltaIsNonNegativeGap() public pure {
        int256[] memory q = new int256[](4);
        int256 b = 1e21;
        int256 c = LSE.tradeCharge(q, new int256[](4), b);
        assertGe(c, 0);
        assertLe(c, _gap(b, 4));
    }

    /// Initial solvency: b = bFromSubsidy(S) gives costUp(0) = lossBound(b) <= S.
    function testFuzz_initialSolvency(uint256 usdc, uint256 nSeed) public pure {
        int256 s = int256(bound(usdc, 1e6, 1e18)) * 1e12;
        uint256 n = 2 + (nSeed % 63);
        int256 b = LSE.bFromSubsidy(s, n);
        assertEq(LSE.costUp(new int256[](n), b), LSE.lossBound(b, n));
        assertLe(LSE.lossBound(b, n), s);
    }

    function testFuzz_pricesSumAtMostOne(uint256 seed, uint256 nSeed, int256 bSeed) public pure {
        (uint256 n, int256 b) = _bounds(nSeed, bSeed);
        int256[] memory p = LSE.prices(_vec(seed, n, b, 20), b);
        int256 total;
        for (uint256 i; i < n; ++i) {
            assertGe(p[i], 0);
            total += p[i];
        }
        assertLe(total, ONE);
        assertGe(total, ONE - int256(16 * n + 16));
    }

    function test_prices_flatBookIsUniform() public pure {
        int256[] memory p = LSE.prices(new int256[](4), 1e21);
        for (uint256 i; i < 4; ++i) {
            assertEq(p[i], ONE / 4);
        }
    }

    function testFuzz_maxSizeForBudgetIsTight(uint256 seed, uint256 budget) public pure {
        int256 b = 1e21;
        uint256 n = 8;
        int256[] memory q = _vec(seed, n, b, 5);
        int256[] memory unit = new int256[](n);
        for (uint256 i = 3; i < n; ++i) {
            unit[i] = ONE;
        }
        int256 spend = int256(bound(budget, 1e18, 1e24));
        int256 size = LSE.maxSizeForBudget(q, b, unit, spend);
        int256[] memory more = new int256[](n);
        int256[] memory exact = new int256[](n);
        for (uint256 i = 3; i < n; ++i) {
            exact[i] = size;
            more[i] = size + 1;
        }
        assertLe(LSE.tradeCharge(q, exact, b), spend);
        assertGt(LSE.tradeCharge(q, more, b), spend);
    }

    function test_maxSizeForBudget_zeroBudgetAndZeroShape() public {
        int256[] memory q = new int256[](2);
        int256[] memory unit = new int256[](2);
        unit[0] = ONE;
        assertEq(LSE.maxSizeForBudget(q, 1e21, unit, 0), 0);
        vm.expectRevert(IKizashiErrors.ZeroTrade.selector);
        this.callMaxSize(q, new int256[](2));
    }

    function callMaxSize(int256[] memory q, int256[] memory unit) external pure returns (int256) {
        return LSE.maxSizeForBudget(q, 1e21, unit, 1e18);
    }

    function test_badLiquidityReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IKizashiErrors.BadLiquidity.selector, int256(0)));
        h.costUp(new int256[](2), 0);
    }

    function test_extremeSkewStaysFinite() public pure {
        int256 b = 24e16;
        int256[] memory q = new int256[](64);
        q[0] = 1e6 * b;
        assertEq(LSE.costDown(q, b), q[0]);
        assertGe(LSE.costUp(q, b), q[0]);
        q[0] = -1e6 * b;
        int256 up = LSE.costUp(q, b);
        assertGe(up, 0);
        assertLe(up - LSE.costDown(q, b), _gap(b, 64));
    }
}

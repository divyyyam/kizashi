// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {IKizashiErrors} from "./KizashiTypes.sol";
import {VecLib} from "./VecLib.sol";
import {Wad} from "./Wad.sol";

/// @title LSE
/// @notice LMSR cost C(q) = b * ln(sum exp(q_i / b)) in the stable form
/// C(q) = M + b * ln(sum exp((q_i - M) / b)), M = max q, with directed bounds:
/// costDown(q) <= C(q) <= costUp(q). All money is signed WAD; b > 0.
library LSE {
    using VecLib for int256[];

    /// @dev WAD in, WAD out; upper bound of C(q) (charges).
    function costUp(int256[] memory q, int256 b) internal pure returns (int256) {
        _checkB(b);
        int256 m = q.maxOf();
        int256 sum = 0;
        for (uint256 i; i < q.length; ++i) {
            // Larger exponent -> larger term: round the exponent up (toward zero).
            sum += Wad.expNegUp(Wad.divUp(q[i] - m, b));
        }
        return m + Wad.mulUp(b, Wad.lnAtLeastOneUp(sum));
    }

    /// @dev WAD in, WAD out; lower bound of C(q).
    function costDown(int256[] memory q, int256 b) internal pure returns (int256) {
        _checkB(b);
        int256 m = q.maxOf();
        int256 sum = 0;
        for (uint256 i; i < q.length; ++i) {
            sum += Wad.expNegDown(Wad.divDown(q[i] - m, b));
        }
        // The maximum term is exactly 1, so sum >= 1 and ln is defined.
        return m + Wad.mulDown(b, Wad.lnAtLeastOneDown(sum));
    }

    /// @dev Upper bound of the cash charge for moving q by delta: costUp(q + delta) - costDown(q).
    /// Never below the true charge. A zero delta returns the non-negative bound gap.
    function tradeCharge(int256[] memory q, int256[] memory delta, int256 b)
        internal
        pure
        returns (int256)
    {
        return costUp(q.add(delta), b) - costDown(q, b);
    }

    /// @dev Probability WAD per bucket, each rounded down: p_i = exp_i / sum; sum(p) <= 1e18.
    function prices(int256[] memory q, int256 b) internal pure returns (int256[] memory p) {
        _checkB(b);
        int256 m = q.maxOf();
        int256 sumUp = 0;
        for (uint256 i; i < q.length; ++i) {
            sumUp += Wad.expNegUp(Wad.divUp(q[i] - m, b));
        }
        p = new int256[](q.length);
        for (uint256 i; i < q.length; ++i) {
            p[i] = Wad.divDown(Wad.expNegDown(Wad.divDown(q[i] - m, b)), sumUp);
        }
    }

    /// @dev Subsidy WAD -> b WAD = S / ln N, rounded down so that b * ln N <= S.
    function bFromSubsidy(int256 subsidyWad, uint256 n) internal pure returns (int256 b) {
        b = Wad.divDown(subsidyWad, _lnN(n));
        _checkB(b);
    }

    /// @dev Maker loss bound b * ln N, WAD, rounded up. Equals costUp of the zero vector.
    function lossBound(int256 b, uint256 n) internal pure returns (int256) {
        return Wad.mulUp(b, _lnN(n));
    }

    /// @dev Largest size s (WAD payout scale) with tradeCharge(q, s * unit) <= budget, where
    /// `unit` is a non-negative shape with entries in [0, 1e18]. Binary search; view helper for
    /// spend-to-size. Returns 0 if even the smallest size exceeds the budget.
    function maxSizeForBudget(int256[] memory q, int256 b, int256[] memory unit, int256 budgetWad)
        internal
        pure
        returns (int256 lo)
    {
        if (unit.maxOf() <= 0) revert IKizashiErrors.ZeroTrade();
        if (budgetWad <= 0) return 0;
        int256 hi = budgetWad;
        // Grow hi until it is unaffordable; 64 doublings cover any price above 2^-64.
        for (uint256 i = 0; i < 64 && _charge(q, b, unit, hi) <= budgetWad; ++i) {
            lo = hi;
            hi *= 2;
        }
        while (hi - lo > 1) {
            int256 mid = lo + (hi - lo) / 2;
            if (_charge(q, b, unit, mid) <= budgetWad) lo = mid;
            else hi = mid;
        }
    }

    function _charge(int256[] memory q, int256 b, int256[] memory unit, int256 size)
        private
        pure
        returns (int256)
    {
        int256[] memory delta = new int256[](unit.length);
        for (uint256 i; i < unit.length; ++i) {
            delta[i] = Wad.mulDown(unit[i], size);
        }
        return tradeCharge(q, delta, b);
    }

    function _lnN(uint256 n) private pure returns (int256) {
        return Wad.lnAtLeastOneUp(SafeCastLib.toInt256(n) * Wad.ONE);
    }

    function _checkB(int256 b) private pure {
        if (b <= 0) revert IKizashiErrors.BadLiquidity(b);
    }
}

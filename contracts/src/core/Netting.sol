// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {VecLib} from "./VecLib.sol";

/// @title Netting
/// @notice ACCOUNTING.md §1–4: top-up and normalization of the actual position, plus the
/// original-ticket requirement helpers. All values signed WAD, exact (no rounding).
/// K(v) = max(0, -min v); G = sum K(ticket); N = K(sum tickets); freed = G - N >= 0.
/// Raw floors (floorOf, grossFloors, nettedFloor) are NOT required-collateral values.
library Netting {
    using VecLib for int256[];

    /// @dev Uniform top-up K(P + delta) that keeps the position non-negative.
    function topUp(int256[] memory position, int256[] memory delta) internal pure returns (int256) {
        return collateralRequired(position.add(delta));
    }

    /// @dev Returns (k, delta + k*1, position + delta + k*1).
    function normalise(int256[] memory position, int256[] memory delta)
        internal
        pure
        returns (int256 k, int256[] memory normalized, int256[] memory positionAfter)
    {
        k = topUp(position, delta);
        normalized = delta.addScalar(k);
        positionAfter = position.add(normalized);
    }

    /// @dev Raw signed minimum. For an actual position this is the releasable floor.
    function floorOf(int256[] memory v) internal pure returns (int256) {
        return v.minOf();
    }

    /// @dev K(v) = max(0, -min v): standalone downside requirement.
    function collateralRequired(int256[] memory v) internal pure returns (int256) {
        int256 m = v.minOf();
        return m < 0 ? -m : int256(0);
    }

    /// @dev sum of raw ticket minima. Empty history -> 0.
    function grossFloors(int256[][] memory tickets) internal pure returns (int256 total) {
        total = 0;
        for (uint256 t = 0; t < tickets.length; ++t) {
            total += tickets[t].minOf();
        }
    }

    /// @dev min of the summed tickets. Empty history -> 0.
    function nettedFloor(int256[][] memory tickets) internal pure returns (int256) {
        if (tickets.length == 0) return 0;
        return _sum(tickets).minOf();
    }

    /// @dev G = sum K(ticket). Empty history -> 0.
    function grossCollateral(int256[][] memory tickets) internal pure returns (int256 total) {
        total = 0;
        for (uint256 t = 0; t < tickets.length; ++t) {
            total += collateralRequired(tickets[t]);
        }
    }

    /// @dev N = K(sum tickets). Empty history -> 0.
    function nettedCollateral(int256[][] memory tickets) internal pure returns (int256) {
        if (tickets.length == 0) return 0;
        return collateralRequired(_sum(tickets));
    }

    /// @dev F = G - N, always >= 0 (min is superadditive).
    function freed(int256[][] memory tickets) internal pure returns (int256) {
        return grossCollateral(tickets) - nettedCollateral(tickets);
    }

    function _sum(int256[][] memory tickets) private pure returns (int256[] memory total) {
        total = tickets[0];
        for (uint256 t = 1; t < tickets.length; ++t) {
            total = total.add(tickets[t]);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IKizashiErrors} from "./KizashiTypes.sol";

/// @title Shapes
/// @notice Payout vectors for Simple mode (market spec §3.1) and on-chain shape checks.
/// Expressive (Gaussian) curves are built off-chain and arrive as plain vectors.
library Shapes {
    /// @dev "Above threshold k": `size` WAD on buckets k..n-1, 0 below. 1 <= k <= n-1. Exact.
    function step(uint256 n, uint256 k, int256 size) internal pure returns (int256[] memory v) {
        if (k == 0 || k >= n) revert IKizashiErrors.BadBucket(k, n);
        v = new int256[](n);
        for (uint256 i = k; i < n; ++i) {
            v[i] = size;
        }
    }

    /// @dev `size` WAD on buckets [from, to), 0 elsewhere. from < to <= n. Exact.
    /// "Below threshold k" is range(n, 0, k, size).
    function range(uint256 n, uint256 from, uint256 to, int256 size)
        internal
        pure
        returns (int256[] memory v)
    {
        if (from >= to || to > n) revert IKizashiErrors.BadRange(from, to, n);
        v = new int256[](n);
        for (uint256 i = from; i < to; ++i) {
            v[i] = size;
        }
    }

    /// @dev Reverts unless delta has length n, every |entry| <= maxAbs and some entry is non-zero.
    function validate(int256[] memory delta, uint256 n, int256 maxAbs) internal pure {
        if (delta.length != n) revert IKizashiErrors.LengthMismatch(n, delta.length);
        bool zero = true;
        for (uint256 i; i < n; ++i) {
            int256 x = delta[i];
            if (x > maxAbs || x < -maxAbs) revert IKizashiErrors.TradeTooLarge(i, x, maxAbs);
            if (x != 0) zero = false;
        }
        if (zero) revert IKizashiErrors.ZeroTrade();
    }
}

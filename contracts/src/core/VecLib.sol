// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IKizashiErrors} from "./KizashiTypes.sol";

/// @title VecLib
/// @notice Exact integer vector helpers for payout vectors. Every binary op reverts
/// LengthMismatch on unequal lengths; reductions on an empty vector revert LengthMismatch(1, 0).
library VecLib {
    /// @dev a + b, exact.
    function add(int256[] memory a, int256[] memory b) internal pure returns (int256[] memory out) {
        _sameLength(a, b);
        out = new int256[](a.length);
        for (uint256 i; i < a.length; ++i) {
            out[i] = a[i] + b[i];
        }
    }

    /// @dev a - b, exact.
    function sub(int256[] memory a, int256[] memory b) internal pure returns (int256[] memory out) {
        _sameLength(a, b);
        out = new int256[](a.length);
        for (uint256 i; i < a.length; ++i) {
            out[i] = a[i] - b[i];
        }
    }

    /// @dev a + k * 1, exact.
    function addScalar(int256[] memory a, int256 k) internal pure returns (int256[] memory out) {
        out = new int256[](a.length);
        for (uint256 i; i < a.length; ++i) {
            out[i] = a[i] + k;
        }
    }

    /// @dev a * k (integer factor, not WAD), exact.
    function scale(int256[] memory a, int256 k) internal pure returns (int256[] memory out) {
        out = new int256[](a.length);
        for (uint256 i; i < a.length; ++i) {
            out[i] = a[i] * k;
        }
    }

    function minOf(int256[] memory a) internal pure returns (int256 m) {
        _nonEmpty(a);
        m = a[0];
        for (uint256 i = 1; i < a.length; ++i) {
            if (a[i] < m) m = a[i];
        }
    }

    function maxOf(int256[] memory a) internal pure returns (int256 m) {
        _nonEmpty(a);
        m = a[0];
        for (uint256 i = 1; i < a.length; ++i) {
            if (a[i] > m) m = a[i];
        }
    }

    /// @dev Index of the first maximum.
    function argMax(int256[] memory a) internal pure returns (uint256 index) {
        _nonEmpty(a);
        for (uint256 i = 1; i < a.length; ++i) {
            if (a[i] > a[index]) index = i;
        }
    }

    function isNonNeg(int256[] memory a) internal pure returns (bool) {
        for (uint256 i; i < a.length; ++i) {
            if (a[i] < 0) return false;
        }
        return true;
    }

    function _sameLength(int256[] memory a, int256[] memory b) private pure {
        if (a.length != b.length) revert IKizashiErrors.LengthMismatch(a.length, b.length);
    }

    function _nonEmpty(int256[] memory a) private pure {
        if (a.length == 0) revert IKizashiErrors.LengthMismatch(1, 0);
    }
}

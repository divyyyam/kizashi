// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {IKizashiErrors} from "./KizashiTypes.sol";

/// @title Grid
/// @notice N equal buckets from `lo` with width `w`, in the market's unit precision (not USDC).
/// Bucket i covers [lo + i*w, lo + (i+1)*w). Below lo -> 0; at or above the top -> N - 1.
library Grid {
    uint256 internal constant MIN_BUCKETS = 2;
    uint256 internal constant MAX_BUCKETS = 64;

    /// @dev Reverts BadGrid unless 2 <= n <= 64 and w > 0.
    function validate(uint256 n, int256 w) internal pure {
        if (n < MIN_BUCKETS || n > MAX_BUCKETS || w <= 0) revert IKizashiErrors.BadGrid(n, w);
    }

    /// @dev Grid units in, bucket index out; clamped to [0, n - 1]. Exact.
    function bucketOf(int256 lo, int256 w, uint256 n, int256 value)
        internal
        pure
        returns (uint256)
    {
        if (value < lo) return 0;
        uint256 index = SafeCastLib.toUint256((value - lo) / w);
        return index >= n ? n - 1 : index;
    }

    /// @dev Bucket index in, [from, to) edges out in grid units. Exact.
    function bounds(int256 lo, int256 w, uint256 n, uint256 i)
        internal
        pure
        returns (int256 from, int256 to)
    {
        if (i >= n) revert IKizashiErrors.BadBucket(i, n);
        from = lo + SafeCastLib.toInt256(i) * w;
        to = from + w;
    }
}

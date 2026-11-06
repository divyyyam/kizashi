// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";

/// @notice How a market's winning bucket is decided.
enum ResolutionMode {
    None,
    Manual,
    Twap
}

/// @notice Which TWAP settles a price market and how to turn it into a grid value.
/// @dev The resolved value is price * 10^gridDecimals in the grid's unit precision, where price is
/// the base token's price in quote tokens. `window` is in seconds ending at the market close.
struct PriceSource {
    PoolKey key;
    bool baseIsToken0;
    uint8 baseDecimals;
    uint8 quoteDecimals;
    uint8 gridDecimals;
    uint32 window;
    uint16 minObservations;
    uint128 minLiquidity;
}

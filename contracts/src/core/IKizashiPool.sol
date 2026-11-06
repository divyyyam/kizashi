// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Config, IKizashiErrors, IKizashiEvents, Quote, State} from "./KizashiTypes.sol";

/// @title IKizashiPool
/// @notice The only Kizashi surface other contracts call. Frozen at F-CP0; any change is
/// logged in docs/handoffs/F-CP0.md and announced to the contracts and integration lanes.
/// @dev Money is signed WAD (1 USDC = 1e18) except names ending in Usdc (6-decimal base units).
interface IKizashiPool is IKizashiErrors, IKizashiEvents {
    /// @notice Validate the grid, pull `subsidyUsdc` from msg.sender, set b and q = 0.
    /// @param creator receives sweepable surplus after resolution; may differ from msg.sender
    /// (a factory funds and initializes clones on the creator's behalf).
    function initialize(
        Config calldata config,
        uint256 subsidyUsdc,
        address creator,
        address resolver,
        uint64 closeTime
    ) external;

    /// @notice Price `delta` against `owner`'s current position (owner is explicit so a vault
    /// or engine quotes the position that is actually charged, not the browser account).
    function quote(address owner, int256[] calldata delta) external view returns (Quote memory);

    /// @notice Trade for msg.sender: normalize, charge, transfer, update q and position.
    /// @param limitUsdc maximum signed charge accepted (negative = minimum payout demanded).
    function trade(int256[] calldata delta, int256 limitUsdc, uint64 deadline)
        external
        returns (Quote memory);

    /// @notice Release `amountWad <= floorOf(msg.sender)` from every bucket; pays it rounded down.
    function release(int256 amountWad) external returns (uint256 paidUsdc);

    /// @notice Anyone may close the market once closeTime has passed.
    function close() external;

    /// @notice The resolver sets the winning bucket of a closed market.
    function resolve(uint256 bucket) external;

    /// @notice Pay msg.sender's position in the winning bucket and zero the position.
    function redeem() external returns (uint256 paidUsdc);

    /// @notice Pay the creator any cash above outstanding unredeemed winning claims.
    /// User claims never expire and are never swept.
    function sweep() external returns (uint256 paidUsdc);

    function config() external view returns (Config memory);
    function state() external view returns (State);
    function creator() external view returns (address);
    function resolver() external view returns (address);
    function closeTime() external view returns (uint64);
    function winningBucket() external view returns (uint256);
    /// @dev WAD liquidity parameter.
    function b() external view returns (int256);
    /// @dev WAD outstanding payout per bucket.
    function q() external view returns (int256[] memory);
    /// @dev WAD position, all entries >= 0.
    function positionOf(address owner) external view returns (int256[] memory);
    /// @dev WAD releasable floor = min(position).
    function floorOf(address owner) external view returns (int256);
    /// @dev Probability WAD per bucket; sums to 1e18 within rounding.
    function prices() external view returns (int256[] memory);
    /// @dev USDC base units actually held for this market.
    function cash() external view returns (uint256);
    /// @dev WAD maker loss bound b * ln N, rounded up.
    function lossBound() external view returns (int256);
    /// @dev Unredeemed winning claims after resolution (WAD); 0 before resolution.
    function outstandingWad() external view returns (int256);
    /// @notice Bucket for `value` at the grid's unit precision; clamped to [0, n - 1].
    function bucketOf(int256 value) external view returns (uint256);
}

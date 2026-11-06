// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Market grid and collateral. `b` is not part of the config: the pool derives it from
/// the subsidy at initialization (`b = S / ln N`, rounded down).
/// @dev `lo` and `w` are exact scaled integers at the market's declared unit precision, not USDC.
struct Config {
    uint256 n;
    int256 lo;
    int256 w;
    address collateral;
}

/// @notice Pool lifecycle. `Uninitialized` exists so a fresh clone cannot be mistaken for Open.
enum State {
    Uninitialized,
    Open,
    Closed,
    Resolved
}

/// @notice Result of pricing a trade for one position owner.
/// @dev chargeWad > 0: the owner pays; < 0: the pool pays. chargeUsdc is the signed transfer in
/// USDC base units: payments in round up, payments out round down (both favour the pool).
/// normalizedDelta = delta + topUpWad * 1 is the exact change applied to q and the position.
struct Quote {
    int256 chargeWad;
    int256 chargeUsdc;
    int256 topUpWad;
    int256[] normalizedDelta;
    int256[] pricesAfter;
}

interface IKizashiErrors {
    error AlreadyInitialized();
    error BadGrid(uint256 n, int256 w);
    error ZeroSubsidy();
    error ZeroAddress();
    error BadCloseTime(uint64 closeTime);
    error NotOpen(State state);
    error PastClose(uint64 closeTime);
    error DeadlineExpired(uint64 deadline);
    error LengthMismatch(uint256 expected, uint256 actual);
    error ZeroTrade();
    error ChargeAboveLimit(int256 chargeUsdc, int256 limitUsdc);
    error Insolvent(uint256 cashUsdc, int256 requiredWad);
    error NonPositiveAmount(int256 amountWad);
    error ReleaseAboveFloor(int256 amountWad, int256 floorWad);
    error TooEarly(uint64 closeTime);
    error NotResolver(address caller);
    error NotClosed(State state);
    error BadBucket(uint256 bucket, uint256 n);
    error NotResolved(State state);
    error NothingToRedeem(address owner);
    error NotCreator(address caller);
    error NothingToSweep();
    error ExpDomain(int256 x);
    error LnDomain(int256 x);
    error NegativeAmount(int256 wad);
    error BadLiquidity(int256 b);
    error TradeTooLarge(uint256 index, int256 value, int256 maxAbs);
    error BadRange(uint256 from, uint256 to, uint256 n);
    error SubsidyOutOfBounds(uint256 subsidyUsdc);
    error QOutOfBounds(int256 value);
}

/// @notice Every event needed to replay a market exactly (INTERFACES §4, ACCOUNTING §5).
/// The original signed delta is preserved; q and the owner's position change by
/// `delta + topUpWad * 1`.
interface IKizashiEvents {
    event Initialized(
        address indexed creator,
        address indexed resolver,
        address collateral,
        uint256 n,
        int256 lo,
        int256 w,
        int256 b,
        uint256 subsidyUsdc,
        uint64 closeTime
    );
    event Traded(
        address indexed owner, int256[] delta, int256 topUpWad, int256 chargeWad, int256 chargeUsdc
    );
    event Released(address indexed owner, int256 amountWad, uint256 paidUsdc);
    event Closed(address indexed by);
    event Resolved(uint256 indexed bucket);
    event Redeemed(address indexed owner, int256 payoutWad, uint256 paidUsdc);
    event Swept(address indexed creator, uint256 paidUsdc, int256 outstandingWad);
}

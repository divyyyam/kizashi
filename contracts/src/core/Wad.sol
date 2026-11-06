// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {IKizashiErrors} from "./KizashiTypes.sol";

/// @title Wad
/// @notice Signed 1e18 fixed point with an explicit rounding direction on every operation, plus
/// directed bounds for exp and ln. 1 USDC = 1e18 WAD units = 1e6 USDC base units.
/// @dev exp/ln wrap Solady's expWad/lnWad. Measured against a 50-digit oracle on their Kizashi
/// domains (see contracts/src/core/ROUNDING.md): expWad - exp in (-1, 0] and lnWad - ln in
/// (-1.05, +0.05) WAD units. Every bound below widens that by MARGIN; golden vectors re-check it.
library Wad {
    int256 internal constant ONE = 1e18;
    int256 internal constant USDC_TO_WAD = 1e12;
    /// @dev Safety margin (WAD units) applied to exp and ln on each directed side.
    int256 internal constant MARGIN = 2;
    /// @dev Below this, exp(x) < 1e-18 and Solady returns 0.
    int256 internal constant EXP_MIN = -41_446_531_673_892_822_313;

    /// @dev USDC base units in, WAD out; exact.
    function toWad(uint256 usdc) internal pure returns (int256) {
        return SafeCastLib.toInt256(usdc) * USDC_TO_WAD;
    }

    /// @dev WAD in (>= 0), USDC base units out; rounds down (payouts, releases).
    function toUsdcDown(int256 wad) internal pure returns (uint256) {
        if (wad < 0) revert IKizashiErrors.NegativeAmount(wad);
        return SafeCastLib.toUint256(wad / USDC_TO_WAD);
    }

    /// @dev WAD in (>= 0), USDC base units out; rounds up (charges, reserves).
    function toUsdcUp(int256 wad) internal pure returns (uint256) {
        if (wad < 0) revert IKizashiErrors.NegativeAmount(wad);
        return SafeCastLib.toUint256(ceilDiv(wad, USDC_TO_WAD));
    }

    /// @dev WAD x WAD -> WAD; rounds toward -infinity.
    function mulDown(int256 a, int256 b) internal pure returns (int256) {
        return floorDiv(a * b, ONE);
    }

    /// @dev WAD x WAD -> WAD; rounds toward +infinity.
    function mulUp(int256 a, int256 b) internal pure returns (int256) {
        return ceilDiv(a * b, ONE);
    }

    /// @dev WAD / WAD -> WAD; rounds toward -infinity.
    function divDown(int256 a, int256 b) internal pure returns (int256) {
        return floorDiv(a * ONE, b);
    }

    /// @dev WAD / WAD -> WAD; rounds toward +infinity.
    function divUp(int256 a, int256 b) internal pure returns (int256) {
        return ceilDiv(a * ONE, b);
    }

    /// @dev exp(x) for x <= 0, WAD in and out; result >= true value (upper bound), <= 1.
    function expNegUp(int256 x) internal pure returns (int256) {
        if (x > 0) revert IKizashiErrors.ExpDomain(x);
        if (x == 0) return ONE;
        if (x < EXP_MIN) return MARGIN;
        int256 r = FixedPointMathLib.expWad(x) + MARGIN;
        // exp(x) <= 1 for x <= 0; capping keeps the bound valid and monotone near 0.
        return r < ONE ? r : ONE;
    }

    /// @dev exp(x) for x <= 0, WAD in and out; result <= true value (lower bound), >= 0.
    function expNegDown(int256 x) internal pure returns (int256) {
        if (x > 0) revert IKizashiErrors.ExpDomain(x);
        if (x == 0) return ONE;
        if (x < EXP_MIN) return 0;
        int256 r = FixedPointMathLib.expWad(x) - MARGIN;
        return r > 0 ? r : int256(0);
    }

    /// @dev ln(x) for x >= 1, WAD in and out; result >= true value (upper bound).
    function lnAtLeastOneUp(int256 x) internal pure returns (int256) {
        if (x < ONE) revert IKizashiErrors.LnDomain(x);
        if (x == ONE) return 0;
        return FixedPointMathLib.lnWad(x) + MARGIN;
    }

    /// @dev ln(x) for x >= 1, WAD in and out; result <= true value (lower bound), >= 0.
    function lnAtLeastOneDown(int256 x) internal pure returns (int256) {
        if (x < ONE) revert IKizashiErrors.LnDomain(x);
        if (x == ONE) return 0;
        int256 r = FixedPointMathLib.lnWad(x) - MARGIN;
        return r > 0 ? r : int256(0);
    }

    /// @dev Integer division rounding toward -infinity; d != 0.
    function floorDiv(int256 x, int256 d) internal pure returns (int256 q) {
        q = x / d;
        if (x % d != 0 && ((x < 0) != (d < 0))) --q;
    }

    /// @dev Integer division rounding toward +infinity; d != 0.
    function ceilDiv(int256 x, int256 d) internal pure returns (int256 q) {
        q = x / d;
        if (x % d != 0 && ((x < 0) == (d < 0))) ++q;
    }
}

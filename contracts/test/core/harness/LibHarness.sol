// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Grid} from "../../../src/core/Grid.sol";
import {LSE} from "../../../src/core/LSE.sol";
import {Shapes} from "../../../src/core/Shapes.sol";
import {VecLib} from "../../../src/core/VecLib.sol";
import {Wad} from "../../../src/core/Wad.sol";

/// @notice Test-only external wrappers so library reverts can be asserted with expectRevert.
contract LibHarness {
    function toWad(uint256 x) external pure returns (int256) {
        return Wad.toWad(x);
    }

    function toUsdcDown(int256 x) external pure returns (uint256) {
        return Wad.toUsdcDown(x);
    }

    function toUsdcUp(int256 x) external pure returns (uint256) {
        return Wad.toUsdcUp(x);
    }

    function expNegUp(int256 x) external pure returns (int256) {
        return Wad.expNegUp(x);
    }

    function lnAtLeastOneDown(int256 x) external pure returns (int256) {
        return Wad.lnAtLeastOneDown(x);
    }

    function validate(uint256 n, int256 w) external pure {
        Grid.validate(n, w);
    }

    function bounds(int256 lo, int256 w, uint256 n, uint256 i)
        external
        pure
        returns (int256, int256)
    {
        return Grid.bounds(lo, w, n, i);
    }

    function add(int256[] memory a, int256[] memory b) external pure returns (int256[] memory) {
        return VecLib.add(a, b);
    }

    function sub(int256[] memory a, int256[] memory b) external pure returns (int256[] memory) {
        return VecLib.sub(a, b);
    }

    function minOf(int256[] memory a) external pure returns (int256) {
        return VecLib.minOf(a);
    }

    function step(uint256 n, uint256 k, int256 size) external pure returns (int256[] memory) {
        return Shapes.step(n, k, size);
    }

    function range(uint256 n, uint256 from, uint256 to, int256 size)
        external
        pure
        returns (int256[] memory)
    {
        return Shapes.range(n, from, to, size);
    }

    function validate(int256[] memory delta, uint256 n, int256 maxAbs) external pure {
        Shapes.validate(delta, n, maxAbs);
    }

    function costUp(int256[] memory q, int256 b) external pure returns (int256) {
        return LSE.costUp(q, b);
    }
}

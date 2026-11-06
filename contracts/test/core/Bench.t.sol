// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {KizashiPool} from "../../src/core/KizashiPool.sol";
import {Config} from "../../src/core/KizashiTypes.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice Gas for the hot paths at N = 16 / 32 / 64 (F-CP9). Run with `forge test --mc Bench -vv`.
contract BenchTest is Test {
    MockUSDC internal usdc = new MockUSDC();

    function _bench(uint256 n)
        internal
        returns (uint256 tradeGas, uint256 quoteGas, uint256 releaseGas)
    {
        KizashiPool pool = new KizashiPool();
        usdc.mint(address(this), 1e15);
        usdc.approve(address(pool), type(uint256).max);
        pool.initialize(
            Config({n: n, lo: 0, w: 1, collateral: address(usdc)}),
            1000e6,
            address(1),
            address(2),
            uint64(block.timestamp + 1 days)
        );
        int256[] memory warm = new int256[](n);
        int256[] memory bell = new int256[](n);
        for (uint256 i; i < n; ++i) {
            warm[i] = 1e18;
            bell[i] = int256(i < n / 2 ? i : n - i) * 1e18;
        }
        pool.trade(warm, type(int256).max, uint64(block.timestamp)); // first touch of storage

        uint256 g = gasleft();
        pool.quote(address(this), bell);
        quoteGas = g - gasleft();
        g = gasleft();
        pool.trade(bell, type(int256).max, uint64(block.timestamp));
        tradeGas = g - gasleft();
        g = gasleft();
        pool.release(1e18);
        releaseGas = g - gasleft();
    }

    function test_gas_bench() public {
        uint256[3] memory sizes = [uint256(16), 32, 64];
        for (uint256 i; i < 3; ++i) {
            (uint256 t, uint256 q, uint256 r) = _bench(sizes[i]);
            emit log_named_uint(string.concat("N=", vm.toString(sizes[i]), " trade"), t);
            emit log_named_uint(string.concat("N=", vm.toString(sizes[i]), " quote"), q);
            emit log_named_uint(string.concat("N=", vm.toString(sizes[i]), " release"), r);
            assertLt(t, 30_000_000); // well inside one block
        }
    }
}

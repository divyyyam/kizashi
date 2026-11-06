// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {DeployBase} from "./DeployBase.s.sol";

/// @notice Plain v4 swaps on the KZT/USDC pool so the hook records TWAP observations.
/// Env: SWAPS (default 12), SWAP_AMOUNT (exact-in base units of the input token, default 1e4).
/// Run it inside the 5 minutes before a TWAP market closes.
/// forge script script/03_Swap.s.sol --rpc-url arc_testnet --broadcast --slow
contract Swap is DeployBase {
    function run() external {
        address usdc = readAddress("USDC");
        address kzt = readAddress("KizashiTestToken");
        PoolSwapTest router = PoolSwapTest(readAddress("PoolSwapTest"));
        bool usdcIs0 = usdc < kzt;
        PoolKey memory key = PoolKey(
            Currency.wrap(usdcIs0 ? usdc : kzt),
            Currency.wrap(usdcIs0 ? kzt : usdc),
            3000,
            60,
            IHooks(readAddress("KizashiOracleHook"))
        );
        uint256 swaps = vm.envOr("SWAPS", uint256(12));
        int256 amount = int256(vm.envOr("SWAP_AMOUNT", uint256(1e4)));
        vm.startBroadcast(deployerKey());
        for (uint256 i; i < swaps; ++i) {
            bool zeroForOne = i % 2 == 0;
            router.swap(
                key,
                SwapParams(
                    zeroForOne,
                    -amount,
                    zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
                ),
                PoolSwapTest.TestSettings(false, false),
                ""
            );
        }
        vm.stopBroadcast();
    }
}

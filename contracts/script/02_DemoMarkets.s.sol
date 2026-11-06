// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {Config} from "../src/core/KizashiTypes.sol";
import {KizashiMarketFactory} from "../src/market/KizashiMarketFactory.sol";
import {PriceSource, ResolutionMode} from "../src/resolution/ResolutionTypes.sol";
import {DeployBase} from "./DeployBase.s.sol";

/// @notice Creates two labelled demo markets with real transactions: a manual expressive market
/// and a TWAP-settled KZT price market. Env: DEPLOYER_PRIVATE_KEY; optional DEMO_SUBSIDY_USDC
/// (default 2 USDC each), DEMO_CLOSE_SECONDS (default 2 hours).
/// Local anvil with mock USDC only. On Arc use script/deploy-arc.sh (cast): Arc USDC calls a native
/// precompile that Foundry cannot execute locally.
contract DemoMarkets is DeployBase {
    function run() external returns (uint256 manualId, uint256 twapId) {
        KizashiMarketFactory factory = KizashiMarketFactory(readAddress("KizashiMarketFactory"));
        address usdc = readAddress("USDC");
        address kzt = readAddress("KizashiTestToken");
        uint256 subsidy = vm.envOr("DEMO_SUBSIDY_USDC", uint256(2e6));
        uint64 close = uint64(block.timestamp + vm.envOr("DEMO_CLOSE_SECONDS", uint256(2 hours)));

        KizashiMarketFactory.MarketParams memory manual;
        manual.config = Config({n: 16, lo: 130, w: 2, collateral: usdc}); // 130..162 km/h, 2 km/h buckets
        manual.subsidyUsdc = subsidy;
        manual.closeTime = close;
        manual.kind = factory.KIND_CURVE();
        manual.resolution = ResolutionMode.Manual;
        manual.rulesRef = keccak256("kizashi-demo-manual");

        KizashiMarketFactory.MarketParams memory twap = manual;
        twap.config = Config({n: 8, lo: 50, w: 25, collateral: usdc}); // KZT price 0.50..2.50 USDC
        twap.resolution = ResolutionMode.Twap;
        twap.rulesRef = keccak256("kizashi-demo-twap");
        bool usdcIs0 = usdc < kzt;
        twap.priceSource = PriceSource({
            key: PoolKey(
                Currency.wrap(usdcIs0 ? usdc : kzt),
                Currency.wrap(usdcIs0 ? kzt : usdc),
                3000,
                60,
                IHooks(readAddress("KizashiOracleHook"))
            ),
            baseIsToken0: !usdcIs0,
            baseDecimals: 18,
            quoteDecimals: 6,
            gridDecimals: 2,
            window: 300,
            minObservations: 10,
            minLiquidity: 1
        });

        vm.startBroadcast(deployerKey());
        SafeTransferLib.safeApprove(usdc, address(factory), 2 * subsidy);
        (manualId,) = factory.createMarket(manual);
        (twapId,) = factory.createMarket(twap);
        vm.stopBroadcast();
    }
}

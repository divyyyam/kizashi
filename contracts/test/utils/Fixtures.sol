// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {KizashiPool} from "../../src/core/KizashiPool.sol";
import {Config} from "../../src/core/KizashiTypes.sol";
import {EngineBudgetVault, IMarketRegistry} from "../../src/engine/EngineBudgetVault.sol";
import {EngineVaultFactory} from "../../src/engine/EngineVaultFactory.sol";
import {KizashiOracleHook} from "../../src/hooks/KizashiOracleHook.sol";
import {KizashiMarketFactory} from "../../src/market/KizashiMarketFactory.sol";
import {KizashiResolver} from "../../src/resolution/KizashiResolver.sol";
import {PriceSource, ResolutionMode} from "../../src/resolution/ResolutionTypes.sol";
import {MockUSDC} from "../core/mocks/MockUSDC.sol";

/// @notice Deploys the whole local system: v4 PoolManager + routers, MockUSDC (6 decimals),
/// KizashiPool implementation, oracle hook at a flag-encoded address, factory + resolver, vaults.
abstract contract Fixtures is Deployers {
    uint256 internal constant USDC = 1e6;
    int256 internal constant WAD = 1e18;

    MockUSDC internal usdc;
    KizashiOracleHook internal hook;
    KizashiMarketFactory internal factory;
    KizashiResolver internal resolver;
    EngineVaultFactory internal vaults;
    PoolKey internal priceKey;

    address internal resolverRole = makeAddr("resolverRole");
    address internal creator = makeAddr("creator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function deploySystem() internal {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();
        usdc = new MockUSDC();
        uint160 flags = uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.AFTER_SWAP_FLAG);
        address hookAddress = address(flags | (uint160(0x4444) << 144));
        deployCodeTo("KizashiOracleHook.sol:KizashiOracleHook", abi.encode(manager), hookAddress);
        hook = KizashiOracleHook(hookAddress);
        factory =
            new KizashiMarketFactory(address(new KizashiPool()), address(usdc), resolverRole, hook);
        resolver = factory.resolver();
        vaults = new EngineVaultFactory(
            address(new EngineBudgetVault()), address(usdc), IMarketRegistry(address(factory))
        );
        (priceKey,) = initPoolAndAddLiquidity(
            currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1
        );
        for (uint256 i; i < 3; ++i) {
            _fund([creator, alice, bob][i]);
        }
    }

    function _fund(address who) internal {
        usdc.mint(who, 1_000_000 * USDC);
        vm.prank(who);
        usdc.approve(address(factory), type(uint256).max);
    }

    function manualParams(uint256 n, uint64 closeTime)
        internal
        view
        returns (KizashiMarketFactory.MarketParams memory p)
    {
        p.config = Config({n: n, lo: 0, w: 10, collateral: address(usdc)});
        p.subsidyUsdc = 100 * USDC;
        p.closeTime = closeTime;
        p.kind = factory.KIND_CURVE();
        p.resolution = ResolutionMode.Manual;
        p.rulesRef = keccak256("rules");
    }

    /// @dev Grid in price * 100: 8 buckets of 0.25 from 0 to 2.00 (price 1.00 -> bucket 4).
    function twapParams(uint64 closeTime)
        internal
        view
        returns (KizashiMarketFactory.MarketParams memory p)
    {
        p = manualParams(8, closeTime);
        p.config.w = 25;
        p.resolution = ResolutionMode.Twap;
        p.priceSource = PriceSource({
            key: priceKey,
            baseIsToken0: true,
            baseDecimals: 18,
            quoteDecimals: 18,
            gridDecimals: 2,
            window: 300,
            minObservations: 10,
            minLiquidity: 1
        });
    }

    function createMarket(KizashiMarketFactory.MarketParams memory p)
        internal
        returns (uint256 id, KizashiPool pool)
    {
        vm.prank(creator);
        address a;
        (id, a) = factory.createMarket(p);
        pool = KizashiPool(a);
        for (uint256 i; i < 2; ++i) {
            vm.prank([alice, bob][i]);
            usdc.approve(a, type(uint256).max);
        }
    }

    function vec(uint256 n, uint256 k, int256 size) internal pure returns (int256[] memory v) {
        v = new int256[](n);
        v[k] = size;
    }
}

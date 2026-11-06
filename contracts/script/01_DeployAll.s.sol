// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {HookMiner} from "@uniswap/v4-periphery/test/shared/HookMiner.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {KizashiPool} from "../src/core/KizashiPool.sol";
import {EngineBudgetVault, IMarketRegistry} from "../src/engine/EngineBudgetVault.sol";
import {EngineVaultFactory} from "../src/engine/EngineVaultFactory.sol";
import {KizashiOracleHook} from "../src/hooks/KizashiOracleHook.sol";
import {KizashiMarketFactory} from "../src/market/KizashiMarketFactory.sol";
import {DeployBase} from "./DeployBase.s.sol";

/// @notice Deploys the whole Kizashi system and a seeded KZT/USDC v4 price pool.
/// Env: DEPLOYER_PRIVATE_KEY; optional POOL_MANAGER (else our own is deployed), RESOLVER_ROLE
/// (default: deployer), USDC_ADDRESS. Never calls USDC, so it runs under stock Foundry on Arc;
/// liquidity, demo markets and swaps go through cast in script/deploy-arc.sh.
/// forge script script/01_DeployAll.s.sol --rpc-url arc_testnet --broadcast
contract DeployAll is DeployBase {
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    int24 internal constant TICK_SPACING = 60;
    uint24 internal constant FEE = 3000;

    struct Deployed {
        IPoolManager manager;
        PoolSwapTest swapRouter;
        PoolModifyLiquidityTest liquidityRouter;
        KizashiOracleHook hook;
        KizashiPool poolImplementation;
        KizashiMarketFactory factory;
        EngineVaultFactory vaults;
        MockERC20 baseToken;
        PoolKey priceKey;
    }

    function run() external returns (Deployed memory d) {
        uint256 key = deployerKey();
        address deployer = vm.addr(key);
        address usdc = usdcAddress();
        address resolverRole = vm.envOr("RESOLVER_ROLE", deployer);

        vm.startBroadcast(key);
        address existing = vm.envOr("POOL_MANAGER", address(0));
        d.manager = existing != address(0)
            ? IPoolManager(existing)
            : IPoolManager(address(new PoolManager(deployer)));
        d.swapRouter = new PoolSwapTest(d.manager);
        d.liquidityRouter = new PoolModifyLiquidityTest(d.manager);
        d.hook = _deployHook(d.manager);
        d.poolImplementation = new KizashiPool();
        d.factory =
            new KizashiMarketFactory(address(d.poolImplementation), usdc, resolverRole, d.hook);
        d.vaults = new EngineVaultFactory(
            address(new EngineBudgetVault()), usdc, IMarketRegistry(address(d.factory))
        );
        d.baseToken = new MockERC20("Kizashi Test Token", "KZT", 18);
        d.priceKey = _initPricePool(d, usdc, deployer);
        vm.stopBroadcast();

        _write(d);
    }

    function _deployHook(IPoolManager manager) internal returns (KizashiOracleHook hook) {
        uint160 flags = uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory args = abi.encode(manager);
        (address expected, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, type(KizashiOracleHook).creationCode, args);
        hook = new KizashiOracleHook{salt: salt}(manager);
        require(address(hook) == expected, "hook address mismatch");
    }

    /// @dev Price 1 KZT = 1 USDC. raw price = token1 base units per token0 base unit.
    function _initPricePool(Deployed memory d, address usdc, address deployer)
        internal
        returns (PoolKey memory k)
    {
        bool usdcIs0 = usdc < address(d.baseToken);
        (address t0, address t1) =
            usdcIs0 ? (usdc, address(d.baseToken)) : (address(d.baseToken), usdc);
        k = PoolKey(
            Currency.wrap(t0), Currency.wrap(t1), FEE, TICK_SPACING, IHooks(address(d.hook))
        );
        // usdc token0: raw = 1e18 / 1e6 = 1e12 -> sqrt = 1e6 * 2^96; else raw = 1e-12 -> 2^96 / 1e6.
        uint160 sqrtPrice = usdcIs0 ? uint160(1e6 * 2 ** 96) : uint160(uint256(2 ** 96) / 1e6);
        d.manager.initialize(k, sqrtPrice);

        // Liquidity is added by deploy-arc.sh with cast: Arc's USDC calls a native blocklist
        // precompile that Foundry's local script execution cannot run.
        d.baseToken.mint(deployer, 1_000_000e18);
    }

    function _write(Deployed memory d) internal {
        string memory o = "deployments";
        record(o, "PoolManager", address(d.manager));
        record(o, "PoolSwapTest", address(d.swapRouter));
        record(o, "PoolModifyLiquidityTest", address(d.liquidityRouter));
        record(o, "KizashiOracleHook", address(d.hook));
        record(o, "KizashiPoolImplementation", address(d.poolImplementation));
        record(o, "KizashiMarketFactory", address(d.factory));
        record(o, "KizashiResolver", address(d.factory.resolver()));
        record(o, "EngineVaultFactory", address(d.vaults));
        record(o, "KizashiTestToken", address(d.baseToken));
        string memory json = record(o, "USDC", usdcAddress());
        vm.writeJson(json, deploymentPath(""));
    }
}

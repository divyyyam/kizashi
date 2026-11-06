// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {KizashiPool} from "../../src/core/KizashiPool.sol";
import {Quote} from "../../src/core/KizashiTypes.sol";
import {EngineBudgetVault, IMarketRegistry} from "../../src/engine/EngineBudgetVault.sol";
import {EngineVaultFactory} from "../../src/engine/EngineVaultFactory.sol";
import {Fixtures} from "../utils/Fixtures.sol";

contract EngineBudgetVaultTest is Fixtures {
    address internal engine = makeAddr("engine");
    EngineBudgetVault internal vault;
    KizashiPool internal pool;
    uint64 internal close;
    uint256 internal nonce;

    function setUp() public {
        deploySystem();
        close = uint64(block.timestamp + 7 days);
        (, pool) = createMarket(manualParams(4, close));
        vm.startPrank(alice);
        vault = EngineBudgetVault(vaults.createVault());
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(1000 * USDC);
        vault.grantEngine(engine, 20 * USDC, 50 * USDC, uint64(block.timestamp + 3 days));
        vm.stopPrank();
    }

    function _trade(int256 size, int256 limit) internal returns (Quote memory) {
        vm.prank(engine);
        return vault.trade(pool, vec(4, 2, size), limit, close, keccak256(abi.encode(nonce++)));
    }

    function test_factory_oneDeterministicVaultPerUser() public {
        assertEq(vaults.vaultOf(alice), address(vault));
        assertEq(vaults.predictVault(alice), address(vault));
        assertEq(vault.owner(), alice);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(EngineVaultFactory.VaultExists.selector, address(vault))
        );
        vaults.createVault();
        vm.expectRevert(EngineBudgetVault.AlreadyInitialized.selector);
        vault.initialize(bob, address(usdc), IMarketRegistry(address(factory)));
    }

    function test_trade_vaultOwnsPositionAndSpendIsActualCharge() public {
        uint256 before = usdc.balanceOf(address(vault));
        Quote memory q = _trade(10 * WAD, int256(20 * USDC));
        assertEq(pool.positionOf(address(vault))[2], 10 * WAD);
        assertEq(pool.positionOf(engine)[2], 0);
        assertEq(before - usdc.balanceOf(address(vault)), uint256(q.chargeUsdc));
        assertEq(vault.spentLastDay(), uint256(q.chargeUsdc));
        assertEq(usdc.allowance(address(vault), address(pool)), 0);
    }

    function test_trade_capsAndFences() public {
        vm.expectRevert(EngineBudgetVault.NotEngine.selector);
        vault.trade(pool, vec(4, 2, WAD), int256(USDC), close, bytes32("a"));

        vm.prank(engine);
        vm.expectRevert(
            abi.encodeWithSelector(
                EngineBudgetVault.PerTradeCapExceeded.selector, int256(21 * USDC), 20 * USDC
            )
        );
        vault.trade(pool, vec(4, 2, WAD), int256(21 * USDC), close, bytes32("a"));

        while (vault.spentLastDay() + 20 * USDC <= 50 * USDC) {
            _trade(25 * WAD, int256(20 * USDC));
        }
        uint256 spent = vault.spentLastDay();
        vm.prank(engine);
        vm.expectRevert(
            abi.encodeWithSelector(EngineBudgetVault.DailyCapExceeded.selector, spent, 50 * USDC)
        );
        vault.trade(pool, vec(4, 2, WAD), int256(20 * USDC), close, bytes32("b"));

        vm.prank(engine);
        vault.trade(pool, vec(4, 2, WAD), int256(USDC), close, bytes32("c"));
        vm.prank(engine);
        vm.expectRevert(
            abi.encodeWithSelector(EngineBudgetVault.TradeIdUsed.selector, bytes32("c"))
        );
        vault.trade(pool, vec(4, 2, WAD), int256(USDC), close, bytes32("c"));

        vm.prank(engine);
        vm.expectRevert(
            abi.encodeWithSelector(EngineBudgetVault.UnknownPool.selector, address(this))
        );
        vault.trade(KizashiPool(address(this)), vec(4, 2, WAD), int256(USDC), close, bytes32("d"));
    }

    function test_trade_dailyWindowRolls() public {
        while (vault.spentLastDay() + 20 * USDC <= 50 * USDC) {
            _trade(25 * WAD, int256(20 * USDC));
        }
        vm.warp(block.timestamp + 1 days);
        assertEq(vault.spentLastDay(), 0);
        _trade(25 * WAD, int256(20 * USDC));
    }

    function test_trade_expiredGrantAndRevoke() public {
        vm.warp(block.timestamp + 3 days);
        vm.prank(engine);
        vm.expectRevert(EngineBudgetVault.GrantExpired.selector);
        vault.trade(pool, vec(4, 2, WAD), int256(USDC), close, bytes32("x"));

        vm.prank(alice);
        vault.grantEngine(engine, 20 * USDC, 50 * USDC, uint64(block.timestamp + 1 days));
        vm.prank(alice);
        vault.revoke();
        vm.prank(engine);
        vm.expectRevert(EngineBudgetVault.NotEngine.selector);
        vault.trade(pool, vec(4, 2, WAD), int256(USDC), close, bytes32("y"));
    }

    function test_sellDoesNotCountAsSpend() public {
        _trade(10 * WAD, int256(20 * USDC));
        uint256 spent = vault.spentLastDay();
        _trade(-10 * WAD, 0);
        assertEq(vault.spentLastDay(), spent);
    }

    function test_ownerFunctionsAndPassthrough() public {
        _trade(10 * WAD, int256(20 * USDC));
        vm.startPrank(bob);
        vm.expectRevert(EngineBudgetVault.NotOwner.selector);
        vault.withdraw(1);
        vm.expectRevert(EngineBudgetVault.NotOwner.selector);
        vault.deposit(1);
        vm.expectRevert(EngineBudgetVault.NotOwner.selector);
        vault.grantEngine(bob, 1, 1, 1);
        vm.expectRevert(EngineBudgetVault.NotOwner.selector);
        vault.revoke();
        vm.expectRevert(EngineBudgetVault.NotOwner.selector);
        vault.redeem(pool);
        vm.stopPrank();

        vm.startPrank(alice);
        uint256 held = usdc.balanceOf(address(vault));
        vm.expectRevert(EngineBudgetVault.InsufficientUnreserved.selector);
        vault.withdraw(held + 1);
        vault.withdraw(held);
        assertEq(usdc.balanceOf(address(vault)), 0);
        vm.stopPrank();

        vm.warp(close);
        pool.close();
        vm.prank(address(resolver));
        pool.resolve(2);
        vm.prank(alice);
        assertEq(vault.redeem(pool), 10 * USDC);
        assertEq(usdc.balanceOf(address(vault)), 10 * USDC);
    }

    function test_releasePassthrough() public {
        vm.prank(engine);
        int256[] memory both = new int256[](4);
        for (uint256 i; i < 4; ++i) {
            both[i] = 5 * WAD;
        }
        vault.trade(pool, both, int256(20 * USDC), close, bytes32("r"));
        vm.prank(alice);
        assertEq(vault.release(pool, 5 * WAD), 5 * USDC);
    }

    function testFuzz_spendNeverExceedsDailyCap(uint256 seed) public {
        for (uint256 i; i < 8; ++i) {
            int256 size = int256(bound(uint256(keccak256(abi.encode(seed, i))), 1, 30)) * WAD;
            vm.prank(engine);
            try vault.trade(
                pool, vec(4, i % 4, size), int256(20 * USDC), close, keccak256(abi.encode(seed, i))
            ) {}
                catch {}
            assertLe(vault.spentLastDay(), 50 * USDC);
        }
    }
}

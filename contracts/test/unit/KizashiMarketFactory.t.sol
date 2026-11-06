// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {KizashiPool} from "../../src/core/KizashiPool.sol";
import {State} from "../../src/core/KizashiTypes.sol";
import {KizashiMarketFactory} from "../../src/market/KizashiMarketFactory.sol";
import {ResolutionMode} from "../../src/resolution/ResolutionTypes.sol";
import {Fixtures} from "../utils/Fixtures.sol";

contract KizashiMarketFactoryTest is Fixtures {
    uint64 internal close;

    function setUp() public {
        deploySystem();
        close = uint64(block.timestamp + 1 days);
    }

    function test_createMarket_clonesFundsAndRegisters() public {
        KizashiMarketFactory.MarketParams memory p = manualParams(4, close);
        vm.expectEmit(true, false, true, false, address(factory));
        emit KizashiMarketFactory.MarketCreated(1, address(0), creator, 1, 1, p.rulesRef, close);
        (uint256 id, KizashiPool pool) = createMarket(p);
        assertEq(id, 1);
        assertEq(factory.marketCount(), 1);
        assertEq(factory.poolOf(1), address(pool));
        assertEq(factory.marketOf(address(pool)), 1);
        assertEq(factory.rulesRefOf(1), p.rulesRef);
        assertEq(uint256(pool.state()), uint256(State.Open));
        assertEq(pool.creator(), creator);
        assertEq(pool.resolver(), address(resolver));
        assertEq(pool.cash(), 100 * USDC);
        assertEq(usdc.balanceOf(address(factory)), 0);
        (, ResolutionMode mode,) = resolver.markets(1);
        assertEq(uint256(mode), uint256(ResolutionMode.Manual));
    }

    function test_createMarket_idsIncrement() public {
        createMarket(manualParams(2, close));
        (uint256 id,) = createMarket(manualParams(3, close));
        assertEq(id, 2);
        assertTrue(factory.poolOf(1) != factory.poolOf(2));
    }

    function test_createMarket_twap() public {
        (uint256 id,) = createMarket(twapParams(close));
        (, ResolutionMode mode,) = resolver.markets(id);
        assertEq(uint256(mode), uint256(ResolutionMode.Twap));
        assertEq(resolver.priceSourceOf(id).window, 300);
    }

    function test_reverts() public {
        KizashiMarketFactory.MarketParams memory p = manualParams(4, close);
        p.subsidyUsdc = 0;
        vm.expectRevert(KizashiMarketFactory.SubsidyZero.selector);
        factory.createMarket(p);

        p = manualParams(4, uint64(block.timestamp));
        vm.expectRevert(
            abi.encodeWithSelector(
                KizashiMarketFactory.CloseTimeInPast.selector, uint64(block.timestamp)
            )
        );
        factory.createMarket(p);

        p = manualParams(4, close);
        p.config.collateral = address(1);
        vm.expectRevert(
            abi.encodeWithSelector(KizashiMarketFactory.CollateralNotUsdc.selector, address(1))
        );
        factory.createMarket(p);

        p = manualParams(4, close);
        p.resolution = ResolutionMode.None;
        vm.expectRevert(KizashiMarketFactory.ResolutionParamsInvalid.selector);
        factory.createMarket(p);

        p = twapParams(close);
        p.priceSource.window = 0;
        vm.expectRevert(KizashiMarketFactory.ResolutionParamsInvalid.selector);
        factory.createMarket(p);

        p = twapParams(close);
        p.priceSource.minLiquidity = 0; // a zero guard would accept an empty pool
        vm.expectRevert(KizashiMarketFactory.ResolutionParamsInvalid.selector);
        factory.createMarket(p);

        p = twapParams(close);
        p.priceSource.baseDecimals = 6; // creator lies about decimals; the token says 18
        vm.expectRevert(KizashiMarketFactory.ResolutionParamsInvalid.selector);
        factory.createMarket(p);
    }

    function testFuzz_createMarket_anyGridAndSubsidy(uint256 n, uint256 subsidy) public {
        KizashiMarketFactory.MarketParams memory p = manualParams(bound(n, 2, 64), close);
        p.subsidyUsdc = bound(subsidy, USDC, 100_000 * USDC);
        (, KizashiPool pool) = createMarket(p);
        assertEq(pool.cash(), p.subsidyUsdc);
        assertLe(pool.lossBound(), int256(p.subsidyUsdc) * 1e12);
    }
}

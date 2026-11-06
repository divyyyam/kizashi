// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {LibClone} from "solady/utils/LibClone.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {Config} from "../core/KizashiTypes.sol";
import {IKizashiPool} from "../core/IKizashiPool.sol";
import {KizashiOracleHook} from "../hooks/KizashiOracleHook.sol";
import {KizashiResolver} from "../resolution/KizashiResolver.sol";
import {PriceSource, ResolutionMode} from "../resolution/ResolutionTypes.sol";

/// @title KizashiMarketFactory
/// @notice Creates one KizashiPool clone per market, funds it with the creator's subsidy, makes
/// the resolver its resolver and keeps the registry. Deploys the resolver in its constructor.
contract KizashiMarketFactory is ReentrancyGuard {
    error SubsidyZero();
    error CloseTimeInPast(uint64 closeTime);
    error ResolutionParamsInvalid();
    error CollateralNotUsdc(address collateral);

    event MarketCreated(
        uint256 indexed marketId,
        address indexed pool,
        address indexed creator,
        uint8 kind,
        uint8 resolution,
        bytes32 rulesRef,
        uint64 closeTime
    );

    /// @notice Display hint only; the maths is identical.
    uint8 public constant KIND_BINARY = 0;
    uint8 public constant KIND_CURVE = 1;

    /// @param config grid and collateral (must be the factory's USDC).
    /// @param subsidyUsdc USDC base units pulled from the creator; sets b and the maker's max loss.
    /// @param rulesRef Swarm reference of the market's rules document.
    /// @param priceSource only read when resolution is Twap.
    struct MarketParams {
        Config config;
        uint256 subsidyUsdc;
        uint64 closeTime;
        uint8 kind;
        ResolutionMode resolution;
        bytes32 rulesRef;
        PriceSource priceSource;
    }

    address public immutable poolImplementation;
    address public immutable usdc;
    KizashiResolver public immutable resolver;

    uint256 public marketCount;
    mapping(uint256 marketId => address pool) public poolOf;
    mapping(address pool => uint256 marketId) public marketOf;
    mapping(uint256 marketId => bytes32 rulesRef) public rulesRefOf;

    constructor(
        address poolImplementation_,
        address usdc_,
        address resolverRole,
        KizashiOracleHook hook
    ) {
        poolImplementation = poolImplementation_;
        usdc = usdc_;
        resolver = new KizashiResolver(address(this), resolverRole, hook);
    }

    /// @notice Create and fund a market. The caller is its creator and receives the sweep.
    /// @dev Pulls `subsidyUsdc` (6-decimal base units) from the caller; the caller must approve
    /// this factory first. Grid and subsidy bounds are enforced by the pool.
    function createMarket(MarketParams calldata p)
        external
        nonReentrant
        returns (uint256 marketId, address pool)
    {
        if (p.subsidyUsdc == 0) revert SubsidyZero();
        if (p.closeTime <= block.timestamp) revert CloseTimeInPast(p.closeTime);
        if (p.config.collateral != usdc) revert CollateralNotUsdc(p.config.collateral);
        _checkResolution(p);

        marketId = ++marketCount;
        pool = LibClone.clone(poolImplementation);
        poolOf[marketId] = pool;
        marketOf[pool] = marketId;
        rulesRefOf[marketId] = p.rulesRef;
        emit MarketCreated(
            marketId, pool, msg.sender, p.kind, uint8(p.resolution), p.rulesRef, p.closeTime
        );

        SafeTransferLib.safeTransferFrom(usdc, msg.sender, address(this), p.subsidyUsdc);
        SafeTransferLib.safeApprove(usdc, pool, p.subsidyUsdc);
        IKizashiPool(pool)
            .initialize(p.config, p.subsidyUsdc, msg.sender, address(resolver), p.closeTime);
        resolver.register(marketId, IKizashiPool(pool), p.resolution, p.priceSource);
    }

    function _checkResolution(MarketParams calldata p) internal view {
        if (p.resolution == ResolutionMode.Manual) return;
        if (p.resolution != ResolutionMode.Twap) revert ResolutionParamsInvalid();
        PriceSource calldata s = p.priceSource;
        if (
            address(resolver.hook()) == address(0)
                || address(s.key.hooks) != address(resolver.hook()) || s.window == 0
                || s.minObservations == 0 || s.window >= p.closeTime
        ) revert ResolutionParamsInvalid();
    }
}

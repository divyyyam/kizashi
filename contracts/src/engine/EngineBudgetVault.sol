// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {Quote} from "../core/KizashiTypes.sol";
import {IKizashiPool} from "../core/IKizashiPool.sol";

interface IMarketRegistry {
    function marketOf(address pool) external view returns (uint256);
}

/// @title EngineBudgetVault
/// @notice One vault per user (an EIP-1167 clone). The vault is the position owner for engine
/// trades; the user grants an engine key capped per-trade and per-rolling-24h spend and can
/// revoke at any time. Spend is the actual USDC charged (positive charges only).
contract EngineBudgetVault is ReentrancyGuard {
    error AlreadyInitialized();
    error NotOwner();
    error NotEngine();
    error GrantExpired();
    error PerTradeCapExceeded(int256 limit, uint256 cap);
    error DailyCapExceeded(uint256 spent, uint256 cap);
    error TradeIdUsed(bytes32 tradeId);
    error UnknownPool(address pool);
    error InsufficientUnreserved();

    event Granted(
        address indexed engine, uint256 perTradeCapUsdc, uint256 dailyCapUsdc, uint64 expiresAt
    );
    event Revoked(address indexed engine);
    event EngineTrade(
        address indexed user, address indexed pool, bytes32 indexed tradeId, int256 charge
    );
    event Deposited(address indexed user, uint256 amountUsdc);
    event Withdrawn(address indexed user, uint256 amountUsdc);

    struct Grant {
        address engine;
        uint64 expiresAt;
        uint256 perTradeCapUsdc;
        uint256 dailyCapUsdc;
    }

    struct Spend {
        uint64 at;
        uint192 amountUsdc;
    }

    uint256 public constant DAY = 24 hours;

    address public owner;
    address public usdc;
    IMarketRegistry public registry;
    Grant public grant;
    mapping(bytes32 tradeId => bool used) public tradeIdUsed;
    Spend[] internal _spends;
    uint256 internal _spendHead;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice One-time setup by the vault factory right after cloning.
    function initialize(address owner_, address usdc_, IMarketRegistry registry_) external {
        if (owner != address(0)) revert AlreadyInitialized();
        owner = owner_;
        usdc = usdc_;
        registry = registry_;
    }

    /// @notice Move USDC (base units) from the owner into the vault.
    function deposit(uint256 amountUsdc) external onlyOwner nonReentrant {
        emit Deposited(msg.sender, amountUsdc);
        SafeTransferLib.safeTransferFrom(usdc, msg.sender, address(this), amountUsdc);
    }

    /// @notice Return USDC (base units) held by the vault to the owner.
    function withdraw(uint256 amountUsdc) external onlyOwner nonReentrant {
        if (amountUsdc > SafeTransferLib.balanceOf(usdc, address(this))) {
            revert InsufficientUnreserved();
        }
        emit Withdrawn(msg.sender, amountUsdc);
        SafeTransferLib.safeTransfer(usdc, msg.sender, amountUsdc);
    }

    /// @notice Authorize `engine` to trade within caps until `expiresAt`. Replaces any grant.
    function grantEngine(
        address engine,
        uint256 perTradeCapUsdc,
        uint256 dailyCapUsdc,
        uint64 expiresAt
    ) external onlyOwner {
        grant = Grant(engine, expiresAt, perTradeCapUsdc, dailyCapUsdc);
        emit Granted(engine, perTradeCapUsdc, dailyCapUsdc, expiresAt);
    }

    /// @notice Stop the engine immediately. Does not cancel a transaction already mined.
    function revoke() external onlyOwner {
        emit Revoked(grant.engine);
        delete grant;
    }

    /// @notice Engine-only trade on a registered pool with this vault as the position owner.
    /// @param limitUsdc maximum signed charge (USDC base units); must not exceed the per-trade cap.
    /// @param tradeId unique per engine trade; a reused id reverts (idempotency fence).
    function trade(
        IKizashiPool pool,
        int256[] calldata delta,
        int256 limitUsdc,
        uint64 deadline,
        bytes32 tradeId
    ) external nonReentrant returns (Quote memory q) {
        Grant memory g = grant;
        if (g.engine == address(0) || msg.sender != g.engine) revert NotEngine();
        if (block.timestamp >= g.expiresAt) revert GrantExpired();
        if (limitUsdc > 0 && uint256(limitUsdc) > g.perTradeCapUsdc) {
            revert PerTradeCapExceeded(limitUsdc, g.perTradeCapUsdc);
        }
        uint256 spent = _spentLastDay();
        uint256 reserve = limitUsdc > 0 ? uint256(limitUsdc) : 0;
        if (spent + reserve > g.dailyCapUsdc) revert DailyCapExceeded(spent, g.dailyCapUsdc);
        if (tradeIdUsed[tradeId]) revert TradeIdUsed(tradeId);
        if (registry.marketOf(address(pool)) == 0) revert UnknownPool(address(pool));
        tradeIdUsed[tradeId] = true;

        uint256 before = SafeTransferLib.balanceOf(usdc, address(this));
        if (reserve > 0) SafeTransferLib.safeApprove(usdc, address(pool), reserve);
        q = pool.trade(delta, limitUsdc, deadline);
        if (reserve > 0) SafeTransferLib.safeApprove(usdc, address(pool), 0);
        int256 charge = SafeCastLib.toInt256(before)
            - SafeCastLib.toInt256(SafeTransferLib.balanceOf(usdc, address(this)));
        if (charge > 0) {
            _spends.push(Spend(uint64(block.timestamp), SafeCastLib.toUint192(uint256(charge))));
        }
        emit EngineTrade(owner, address(pool), tradeId, charge);
    }

    /// @notice Release a vault-held position's floor back into the vault. Owner only.
    function release(IKizashiPool pool, int256 amountWad)
        external
        onlyOwner
        nonReentrant
        returns (uint256)
    {
        return pool.release(amountWad);
    }

    /// @notice Redeem a vault-held winning position into the vault. Owner only.
    function redeem(IKizashiPool pool) external onlyOwner nonReentrant returns (uint256) {
        return pool.redeem();
    }

    /// @notice USDC charged to engine trades in the last 24 hours.
    function spentLastDay() external view returns (uint256 total) {
        for (uint256 i = _spendHead; i < _spends.length; ++i) {
            if (_spends[i].at + DAY > block.timestamp) total += _spends[i].amountUsdc;
        }
    }

    function _spentLastDay() internal returns (uint256 total) {
        uint256 head = _spendHead;
        while (head < _spends.length && _spends[head].at + DAY <= block.timestamp) ++head;
        _spendHead = head;
        for (uint256 i = head; i < _spends.length; ++i) {
            total += _spends[i].amountUsdc;
        }
    }
}

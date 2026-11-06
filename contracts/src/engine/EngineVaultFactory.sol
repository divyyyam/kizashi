// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {LibClone} from "solady/utils/LibClone.sol";
import {EngineBudgetVault, IMarketRegistry} from "./EngineBudgetVault.sol";

/// @title EngineVaultFactory
/// @notice Deploys one EngineBudgetVault clone per user at a deterministic address.
contract EngineVaultFactory {
    error VaultExists(address vault);

    event VaultCreated(address indexed user, address indexed vault);

    address public immutable implementation;
    address public immutable usdc;
    IMarketRegistry public immutable registry;

    mapping(address user => address vault) public vaultOf;

    constructor(address implementation_, address usdc_, IMarketRegistry registry_) {
        implementation = implementation_;
        usdc = usdc_;
        registry = registry_;
    }

    /// @notice Create the caller's vault. One per user.
    function createVault() external returns (address vault) {
        if (vaultOf[msg.sender] != address(0)) revert VaultExists(vaultOf[msg.sender]);
        vault = LibClone.cloneDeterministic(implementation, bytes32(uint256(uint160(msg.sender))));
        vaultOf[msg.sender] = vault;
        EngineBudgetVault(vault).initialize(msg.sender, usdc, registry);
        emit VaultCreated(msg.sender, vault);
    }

    /// @notice Address a user's vault has (or will have).
    function predictVault(address user) external view returns (address) {
        return LibClone.predictDeterministicAddress(
            implementation, bytes32(uint256(uint160(user))), address(this)
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";

/// @notice Shared helpers: deployer key from .env, chain-scoped deployment files.
abstract contract DeployBase is Script {
    uint256 internal constant ARC_TESTNET = 5_042_002;
    address internal constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function deployerKey() internal view returns (uint256) {
        return vm.envUint("DEPLOYER_PRIVATE_KEY");
    }

    function deploymentPath(string memory suffix) internal view returns (string memory) {
        return string.concat(
            vm.projectRoot(), "/deployments/", vm.toString(block.chainid), suffix, ".json"
        );
    }

    function readAddress(string memory key) internal view returns (address) {
        string memory json = vm.readFile(deploymentPath(""));
        return vm.parseJsonAddress(json, string.concat(".", key, ".address"));
    }

    /// @dev USDC_ADDRESS override, else Arc's USDC ERC-20 interface, else the anvil mock.
    function usdcAddress() internal view returns (address) {
        address fromEnv = vm.envOr("USDC_ADDRESS", address(0));
        if (fromEnv != address(0)) return fromEnv;
        if (block.chainid == ARC_TESTNET) return ARC_USDC;
        string memory json = vm.readFile(deploymentPath("-mocks"));
        return vm.parseJsonAddress(json, ".MockUSDC.address");
    }

    /// @dev Serializes {address, block} under `name` into the object `obj`.
    function record(string memory obj, string memory name, address a)
        internal
        returns (string memory)
    {
        string memory entry = vm.serializeAddress(name, "address", a);
        entry = vm.serializeUint(name, "block", block.number);
        return vm.serializeString(obj, name, entry);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {MockUSDC} from "../test/core/mocks/MockUSDC.sol";
import {DeployBase} from "./DeployBase.s.sol";

/// @notice anvil only: a 6-decimal MockUSDC minted to the deployer.
/// forge script script/00_DeployMocks.s.sol --rpc-url anvil --broadcast
contract DeployMocks is DeployBase {
    function run() external {
        require(block.chainid == 31_337, "anvil only");
        vm.startBroadcast(deployerKey());
        MockUSDC usdc = new MockUSDC();
        usdc.mint(vm.addr(deployerKey()), 1_000_000e6);
        vm.stopBroadcast();
        vm.writeJson(record("mocks", "MockUSDC", address(usdc)), deploymentPath("-mocks"));
    }
}

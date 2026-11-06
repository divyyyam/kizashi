// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "solady/tokens/ERC20.sol";

/// @notice 6-decimal test collateral matching Arc USDC's ERC-20 interface.
contract MockUSDC is ERC20 {
    function name() public pure override returns (string memory) {
        return "Mock USDC";
    }

    function symbol() public pure override returns (string memory) {
        return "USDC";
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

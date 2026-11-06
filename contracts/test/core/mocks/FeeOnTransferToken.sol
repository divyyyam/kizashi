// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {MockUSDC} from "./MockUSDC.sol";

/// @notice Collateral that burns 1 base unit per transfer, to prove the pool rejects it.
contract FeeOnTransferToken is MockUSDC {
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        super.transferFrom(from, to, amount);
        _burn(to, 1);
        return true;
    }
}

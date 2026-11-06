// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {KizashiPool} from "../../../src/core/KizashiPool.sol";
import {State} from "../../../src/core/KizashiTypes.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";

/// @notice Drives one pool with five actors through random trades, sells, releases, then a
/// close -> resolve -> redeem -> sweep tail. Reverting calls are bounded away, not hidden.
contract PoolHandler is Test {
    int256 internal constant WAD = 1e18;
    uint256 internal constant ACTORS = 5;

    KizashiPool public pool;
    MockUSDC public usdc;
    address public resolver;
    address public creator;
    address[ACTORS] public actors;
    uint256 public immutable n;
    uint256 public calls;

    constructor(KizashiPool pool_, MockUSDC usdc_, address creator_, address resolver_) {
        pool = pool_;
        usdc = usdc_;
        creator = creator_;
        resolver = resolver_;
        n = pool_.config().n;
        for (uint256 i; i < ACTORS; ++i) {
            actors[i] = address(uint160(0xA11CE + i));
            usdc.mint(actors[i], 1e15);
            vm.prank(actors[i]);
            usdc.approve(address(pool), type(uint256).max);
        }
    }

    function actorAt(uint256 i) external view returns (address) {
        return actors[i];
    }

    function trade(uint256 actorSeed, uint256 shapeSeed, int256 sizeSeed) external {
        if (pool.state() != State.Open || block.timestamp >= pool.closeTime()) return;
        address who = actors[actorSeed % ACTORS];
        int256 size = bound(sizeSeed, -200 * WAD, 200 * WAD);
        if (size == 0) return;
        int256[] memory delta = new int256[](n);
        uint256 k = shapeSeed % n;
        uint256 kind = (shapeSeed / n) % 3;
        for (uint256 i; i < n; ++i) {
            if (kind == 0 && i >= k) delta[i] = size; // step
            if (kind == 1 && i == k) delta[i] = size; // single bucket
            if (kind == 2) {
                delta[i] = int256(uint256(keccak256(abi.encode(shapeSeed, i))) % 101) * size / 100;
            }
        }
        bool zero = true;
        for (uint256 i; i < n; ++i) {
            if (delta[i] != 0) zero = false;
        }
        if (zero) return;
        vm.prank(who);
        pool.trade(delta, type(int256).max, uint64(block.timestamp));
        ++calls;
    }

    function release(uint256 actorSeed, uint256 fraction) external {
        if (pool.state() != State.Open) return;
        address who = actors[actorSeed % ACTORS];
        int256 floor_ = pool.floorOf(who);
        if (floor_ <= 0) return;
        int256 amount = floor_ * int256(bound(fraction, 1, 100)) / 100;
        if (amount <= 0) return;
        vm.prank(who);
        pool.release(amount);
        ++calls;
    }

    function wait(uint256 secondsSeed) external {
        vm.warp(block.timestamp + bound(secondsSeed, 1, 600));
    }

    /// @dev Terminal tail; the invariant contract calls it once at the end of each run too.
    function settle(uint256 bucketSeed) public {
        if (pool.state() == State.Open) {
            if (block.timestamp < pool.closeTime()) vm.warp(pool.closeTime());
            pool.close();
        }
        if (pool.state() == State.Closed) {
            vm.prank(resolver);
            pool.resolve(bucketSeed % n);
        }
        for (uint256 i; i < ACTORS; ++i) {
            int256[] memory p = pool.positionOf(actors[i]);
            if (p[pool.winningBucket()] > 0) {
                vm.prank(actors[i]);
                pool.redeem();
            }
        }
    }
}

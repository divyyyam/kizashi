// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Grid} from "../../src/core/Grid.sol";
import {LSE} from "../../src/core/LSE.sol";
import {Netting} from "../../src/core/Netting.sol";
import {Shapes} from "../../src/core/Shapes.sol";
import {Wad} from "../../src/core/Wad.sol";

/// @notice Every Kizashi function against contracts/test/vectors/golden.json (F-CP3 oracle).
/// Directed results must not cross the oracle value, and must stay within the approved bound.
contract GoldenTest is Test {
    string internal json;

    function setUp() public {
        json = vm.readFile(string.concat(vm.projectRoot(), "/test/vectors/golden.json"));
    }

    function test_exp() public view {
        for (uint256 i; i < _count("exp"); ++i) {
            int256 x = _int("exp", i, "x");
            _assertBracket(Wad.expNegDown(x), Wad.expNegUp(x), "exp", i, _int("exp", i, "absBound"));
        }
    }

    function test_ln() public view {
        for (uint256 i; i < _count("ln"); ++i) {
            int256 x = _int("ln", i, "x");
            _assertBracket(
                Wad.lnAtLeastOneDown(x), Wad.lnAtLeastOneUp(x), "ln", i, _int("ln", i, "absBound")
            );
        }
    }

    function test_usdcConversions() public view {
        for (uint256 i; i < _count("usdc"); ++i) {
            int256 wad = _int("usdc", i, "wad");
            assertEq(Wad.toUsdcDown(wad), uint256(_int("usdc", i, "down")), _id("usdc", i));
            assertEq(Wad.toUsdcUp(wad), uint256(_int("usdc", i, "up")), _id("usdc", i));
        }
    }

    function test_mulDiv() public view {
        for (uint256 i; i < _count("muldiv"); ++i) {
            int256 a = _int("muldiv", i, "a");
            int256 b = _int("muldiv", i, "b");
            assertEq(Wad.mulDown(a, b), _int("muldiv", i, "mulDown"), _id("muldiv", i));
            assertEq(Wad.mulUp(a, b), _int("muldiv", i, "mulUp"), _id("muldiv", i));
            assertEq(Wad.divDown(a, b), _int("muldiv", i, "divDown"), _id("muldiv", i));
            assertEq(Wad.divUp(a, b), _int("muldiv", i, "divUp"), _id("muldiv", i));
        }
    }

    function test_bucketOf() public view {
        for (uint256 i; i < _count("bucket"); ++i) {
            uint256 got = Grid.bucketOf(
                _int("bucket", i, "lo"),
                _int("bucket", i, "w"),
                _uint("bucket", i, "n"),
                _int("bucket", i, "value")
            );
            assertEq(got, _uint("bucket", i, "bucket"), _id("bucket", i));
        }
    }

    function test_costA() public view {
        _test_cost(0, _count("cost") / 2);
    }

    function test_costB() public view {
        _test_cost(_count("cost") / 2, _count("cost"));
    }

    function _test_cost(uint256 from, uint256 to) internal view {
        for (uint256 i = from; i < to; ++i) {
            int256[] memory q = _ints("cost", i, "q");
            int256 b = _int("cost", i, "b");
            _assertBracket(LSE.costDown(q, b), LSE.costUp(q, b), "cost", i, _bound("cost", i));
        }
    }

    function test_tradeChargeA() public view {
        _test_tradeCharge(0, _count("trade") / 2);
    }

    function test_tradeChargeB() public view {
        _test_tradeCharge(_count("trade") / 2, _count("trade"));
    }

    function _test_tradeCharge(uint256 from, uint256 to) internal view {
        for (uint256 i = from; i < to; ++i) {
            int256 charge = LSE.tradeCharge(
                _ints("trade", i, "q"), _ints("trade", i, "delta"), _int("trade", i, "b")
            );
            assertGe(charge, _int("trade", i, "refCeil"), _id("trade", i));
            assertLe(charge - _int("trade", i, "refFloor"), _bound("trade", i), _id("trade", i));
        }
    }

    function test_pricesA() public view {
        _test_prices(0 * _count("prices") / 4, 1 * _count("prices") / 4);
    }

    function test_pricesB() public view {
        _test_prices(1 * _count("prices") / 4, 2 * _count("prices") / 4);
    }

    function test_pricesC() public view {
        _test_prices(2 * _count("prices") / 4, 3 * _count("prices") / 4);
    }

    function test_pricesD() public view {
        _test_prices(3 * _count("prices") / 4, 4 * _count("prices") / 4);
    }

    function _test_prices(uint256 from, uint256 to) internal view {
        for (uint256 i = from; i < to; ++i) {
            int256[] memory p = LSE.prices(_ints("prices", i, "q"), _int("prices", i, "b"));
            int256[] memory r = _ints("prices", i, "refFloor");
            int256 tol = _int("prices", i, "absBound");
            int256 total;
            for (uint256 j; j < p.length; ++j) {
                assertLe(p[j], r[j] + 1, _id("prices", i));
                assertLe(r[j] - p[j], tol, _id("prices", i));
                total += p[j];
            }
            assertLe(total, 1e18, _id("prices", i));
        }
    }

    function test_subsidyAndLossBound() public view {
        for (uint256 i; i < _count("subsidy"); ++i) {
            int256 s = _int("subsidy", i, "subsidyWad");
            uint256 n = _uint("subsidy", i, "n");
            int256 b = LSE.bFromSubsidy(s, n);
            assertLe(b, _int("subsidy", i, "refFloor"), _id("subsidy", i));
            assertLe(_int("subsidy", i, "refCeil") - b, _int("subsidy", i, "absBound"));
            int256 loss = LSE.lossBound(_int("subsidy", i, "lossB"), n);
            assertGe(loss, _int("subsidy", i, "lossRefCeil"), _id("subsidy", i));
            assertLe(loss - _int("subsidy", i, "lossRefCeil"), _int("subsidy", i, "lossBound"));
            // Initial solvency: with the pool's own b, the subsidy covers costUp(0).
            loss = LSE.lossBound(b, n);
            assertLe(loss, s, _id("subsidy", i));
            assertEq(LSE.costUp(new int256[](n), b), loss, _id("subsidy", i));
        }
    }

    function test_shapes() public view {
        for (uint256 i; i < _count("shapes"); ++i) {
            uint256 n = _uint("shapes", i, "n");
            int256 size = _int("shapes", i, "size");
            int256[] memory got = keccak256(bytes(_str("shapes", i, "kind"))) == keccak256("step")
                ? Shapes.step(n, _uint("shapes", i, "k"), size)
                : Shapes.range(n, _uint("shapes", i, "from"), _uint("shapes", i, "to"), size);
            _assertVec(got, _ints("shapes", i, "expected"), _id("shapes", i));
        }
    }

    function test_netting() public view {
        for (uint256 i; i < _count("netting"); ++i) {
            uint256 count = vm.parseJsonStringArray(json, _key("netting", i, "topUps")).length;
            int256[][] memory tickets = new int256[][](count);
            for (uint256 t; t < count; ++t) {
                tickets[t] = vm.parseJsonIntArray(
                    json, string.concat(_key("netting", i, "tickets"), "[", vm.toString(t), "]")
                );
            }
            string memory id = _id("netting", i);
            assertEq(Netting.grossCollateral(tickets), _int("netting", i, "gross"), id);
            assertEq(Netting.nettedCollateral(tickets), _int("netting", i, "netted"), id);
            assertEq(Netting.freed(tickets), _int("netting", i, "freed"), id);
            assertEq(Netting.grossFloors(tickets), _int("netting", i, "grossFloors"), id);
            assertEq(Netting.nettedFloor(tickets), _int("netting", i, "nettedFloor"), id);

            int256[] memory topUps = _ints("netting", i, "topUps");
            int256[] memory position = new int256[](tickets[0].length);
            for (uint256 t; t < count; ++t) {
                int256 k;
                (k,, position) = Netting.normalise(position, tickets[t]);
                assertEq(k, topUps[t], id);
            }
            _assertVec(position, _ints("netting", i, "position"), id);
            assertEq(Netting.floorOf(position), _int("netting", i, "floor"), id);
        }
    }

    // --- helpers -------------------------------------------------------------------------

    function _assertBracket(int256 down, int256 up, string memory section, uint256 i, int256 tol)
        internal
        view
    {
        string memory id = _id(section, i);
        int256 lo = _int(section, i, "refFloor");
        int256 hi = _int(section, i, "refCeil");
        assertLe(down, lo, id);
        assertGe(up, hi, id);
        assertLe(up - lo, tol, id);
        assertLe(hi - down, tol, id);
    }

    /// @dev max(absBound, |ref| * 1e-12), NUMERICS acceptance rule.
    function _bound(string memory section, uint256 i) internal view returns (int256) {
        int256 abs = _int(section, i, "absBound");
        int256 r = _int(section, i, "refFloor");
        int256 rel = (r < 0 ? -r : r) / 1e12;
        return abs > rel ? abs : rel;
    }

    function _assertVec(int256[] memory a, int256[] memory b, string memory id) internal pure {
        assertEq(a.length, b.length, id);
        for (uint256 j; j < a.length; ++j) {
            assertEq(a[j], b[j], id);
        }
    }

    function _count(string memory section) internal view returns (uint256) {
        return vm.parseJsonUint(json, string.concat(".counts.", section));
    }

    function _key(string memory section, uint256 i, string memory field)
        internal
        pure
        returns (string memory)
    {
        return string.concat(".", section, "[", vm.toString(i), "].", field);
    }

    function _id(string memory section, uint256 i) internal view returns (string memory) {
        return vm.parseJsonString(json, _key(section, i, "id"));
    }

    function _int(string memory section, uint256 i, string memory field)
        internal
        view
        returns (int256)
    {
        return vm.parseJsonInt(json, _key(section, i, field));
    }

    function _uint(string memory section, uint256 i, string memory field)
        internal
        view
        returns (uint256)
    {
        return vm.parseJsonUint(json, _key(section, i, field));
    }

    function _str(string memory section, uint256 i, string memory field)
        internal
        view
        returns (string memory)
    {
        return vm.parseJsonString(json, _key(section, i, field));
    }

    function _ints(string memory section, uint256 i, string memory field)
        internal
        view
        returns (int256[] memory)
    {
        return vm.parseJsonIntArray(json, _key(section, i, field));
    }
}

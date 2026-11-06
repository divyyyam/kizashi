// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {LSE} from "../../src/core/LSE.sol";
import {Wad} from "../../src/core/Wad.sol";

/// @notice Opt-in dump of actual Solidity outputs on every golden input, for the TS mirror's
/// exact-parity test (F-TS2). Run: KIZASHI_PARITY_DUMP=true forge test --mc ParityDump --gas-limit 9000000000000 -vv
/// then `python3 ref/parity_fixture.py` turns the log into the TS fixture.
contract ParityDumpTest is Test {
    string internal json;

    function setUp() public {
        json = vm.readFile(string.concat(vm.projectRoot(), "/test/vectors/golden.json"));
    }

    function _key(string memory s, uint256 i, string memory f)
        internal
        pure
        returns (string memory)
    {
        return string.concat(".", s, "[", vm.toString(i), "].", f);
    }

    function _n(string memory s) internal view returns (uint256) {
        return vm.parseJsonUint(json, string.concat(".counts.", s));
    }

    function _log(string memory fn, string memory id, int256 v) internal pure {
        console.log(string.concat("PARITY|", fn, "|", id, "|", vm.toString(v)));
    }

    function test_dumpScalars() public view {
        if (!vm.envOr("KIZASHI_PARITY_DUMP", false)) return;
        for (uint256 i; i < _n("exp"); ++i) {
            string memory id = vm.parseJsonString(json, _key("exp", i, "id"));
            int256 x = vm.parseJsonInt(json, _key("exp", i, "x"));
            _log("expNegUp", id, Wad.expNegUp(x));
            _log("expNegDown", id, Wad.expNegDown(x));
        }
        for (uint256 i; i < _n("ln"); ++i) {
            string memory id = vm.parseJsonString(json, _key("ln", i, "id"));
            int256 x = vm.parseJsonInt(json, _key("ln", i, "x"));
            _log("lnAtLeastOneUp", id, Wad.lnAtLeastOneUp(x));
            _log("lnAtLeastOneDown", id, Wad.lnAtLeastOneDown(x));
        }
        for (uint256 i; i < _n("subsidy"); ++i) {
            string memory id = vm.parseJsonString(json, _key("subsidy", i, "id"));
            uint256 n = vm.parseJsonUint(json, _key("subsidy", i, "n"));
            int256 b = LSE.bFromSubsidy(vm.parseJsonInt(json, _key("subsidy", i, "subsidyWad")), n);
            _log("bFromSubsidy", id, b);
            _log(
                "lossBound",
                id,
                LSE.lossBound(vm.parseJsonInt(json, _key("subsidy", i, "lossB")), n)
            );
        }
    }

    function test_dumpCost() public view {
        if (!vm.envOr("KIZASHI_PARITY_DUMP", false)) return;
        for (uint256 i; i < _n("cost"); ++i) {
            string memory id = vm.parseJsonString(json, _key("cost", i, "id"));
            int256[] memory q = vm.parseJsonIntArray(json, _key("cost", i, "q"));
            int256 b = vm.parseJsonInt(json, _key("cost", i, "b"));
            _log("costUp", id, LSE.costUp(q, b));
            _log("costDown", id, LSE.costDown(q, b));
        }
    }

    function test_dumpTrade() public view {
        if (!vm.envOr("KIZASHI_PARITY_DUMP", false)) return;
        for (uint256 i; i < _n("trade"); ++i) {
            string memory id = vm.parseJsonString(json, _key("trade", i, "id"));
            _log(
                "tradeCharge",
                id,
                LSE.tradeCharge(
                    vm.parseJsonIntArray(json, _key("trade", i, "q")),
                    vm.parseJsonIntArray(json, _key("trade", i, "delta")),
                    vm.parseJsonInt(json, _key("trade", i, "b"))
                )
            );
        }
    }

    function test_dumpPrices() public view {
        if (!vm.envOr("KIZASHI_PARITY_DUMP", false)) return;
        for (uint256 i; i < _n("prices"); ++i) {
            string memory id = vm.parseJsonString(json, _key("prices", i, "id"));
            int256[] memory p = LSE.prices(
                vm.parseJsonIntArray(json, _key("prices", i, "q")),
                vm.parseJsonInt(json, _key("prices", i, "b"))
            );
            for (uint256 j; j < p.length; ++j) {
                _log("prices", string.concat(id, ":", vm.toString(j)), p[j]);
            }
        }
    }
}

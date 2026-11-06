"""Turn ParityDump logs (stdin) into packages/core/test/fixtures/solidity-parity.json."""
import json
import sys

out = {}
for line in sys.stdin:
    line = line.strip()
    if not line.startswith("PARITY|"):
        continue
    _, fn, cid, value = line.split("|")
    out.setdefault(fn, {})[cid] = value
json.dump(dict(sorted(out.items())), sys.stdout, indent=1, sort_keys=True)
sys.stdout.write("\n")

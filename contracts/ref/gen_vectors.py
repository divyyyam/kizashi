"""Deterministic golden vectors for Kizashi: `python3 gen_vectors.py > ../test/vectors/golden.json`.

Schema: docs/formula/NUMERICS.md. Every integer is a decimal string. Transcendental cases carry
the oracle value (`ref`, 30 significant digits for the record) plus `refFloor` / `refCeil`, the
integers that a directed lower / upper result must not cross, and `absBound`, the approved
distance from the oracle (WAD units). Exact cases carry the integer expected output.
"""
import json
import random
import sys

import mpmath
from mpmath import mpf, nstr

import kizashi_ref as ref

SEED = 20261106
SCHEMA = 1
ONE = 10**18
USDC = 10**12  # WAD units per USDC base unit
MARGIN = 2


def s(x):
    return str(int(x))


def bracket(value):
    return {"ref": nstr(value, 30), "refFloor": s(ref.ifloor(value)), "refCeil": s(ref.iceil(value))}


# Approved absolute bounds (D5 numeric stage, see CONDONE.md §6):
# each exp term may be off by MARGIN + 1 (Solady error < 1) + 1 (rounded exponent) units, so the
# sum by 4N; ln adds MARGIN + 1.05; b scales the ln error; mulUp/mulDown add 1.
def cost_bound(b, n):
    return ref.iceil(mpf(b) * (4 * n + 4) / ONE) + 2


def price_bound(n):
    return 8 * n + 8


def floor_div(a, d):
    return a // d


def ceil_div(a, d):
    return -((-a) // d)


def cost_cases(rng):
    cases = []
    configs = []
    for n in (2, 3, 8, 16, 32, 64):
        for b in (10**17 * 24, 10**21, 7 * 10**23, 1442 * 10**24):
            configs.append((n, b))
    i = 0
    for n, b in configs:
        for spread in (0, 3, 40):
            q = [0] * n if spread == 0 else [rng.randint(-spread * b, spread * b) for _ in range(n)]
            cases.append({"id": f"cost-{i:03d}", "n": n, "b": s(b), "q": [s(x) for x in q],
                          **bracket(ref.cost(q, b)), "absBound": s(cost_bound(b, n))})
            i += 1
    # precision edges: one bucket far below / above the rest (|q| near 1e6 * b)
    for n in (2, 64):
        for b in (10**17 * 24, 10**21):
            for sign in (1, -1):
                q = [0] * n
                q[0] = sign * 10**6 * b
                cases.append({"id": f"cost-{i:03d}", "n": n, "b": s(b), "q": [s(x) for x in q],
                              **bracket(ref.cost(q, b)), "absBound": s(cost_bound(b, n))})
                i += 1
    return cases


def trade_cases(rng):
    cases = []
    for i in range(60):
        n = rng.choice((2, 4, 16, 32, 64))
        b = rng.choice((10**17 * 24, 10**21, 3 * 10**22, 10**24))
        q = [rng.randint(-20 * b, 20 * b) for _ in range(n)]
        k = rng.randrange(n)
        size = rng.randint(1, 50) * b // 10
        kind = i % 3
        if kind == 0:
            delta = [size if j >= k else 0 for j in range(n)]
        elif kind == 1:
            delta = [-size if j == k else 0 for j in range(n)]
        else:
            delta = [rng.randint(-size, size) for _ in range(n)]
        cases.append({"id": f"trade-{i:03d}", "n": n, "b": s(b), "q": [s(x) for x in q],
                      "delta": [s(x) for x in delta], **bracket(ref.trade_charge(q, delta, b)),
                      "absBound": s(2 * cost_bound(b, n))})
    return cases


def price_cases(rng):
    cases = []
    for i in range(30):
        n = rng.choice((2, 5, 16, 64))
        b = rng.choice((10**17 * 24, 10**21, 10**24))
        q = [0] * n if i < 4 else [rng.randint(-15 * b, 15 * b) for _ in range(n)]
        p = ref.prices(q, b)
        cases.append({"id": f"prices-{i:03d}", "n": n, "b": s(b), "q": [s(x) for x in q],
                      "refFloor": [s(ref.ifloor(x)) for x in p], "absBound": s(price_bound(n))})
    return cases


def b_cases(rng):
    cases = []
    for i, usdc in enumerate((1, 10**6, 10**12, 10**15)):
        for n in (2, 7, 32, 64):
            sw = usdc * ONE
            bv = ref.b_from_subsidy(sw, n)
            lossb = ref.ifloor(bv)
            lb = ref.loss_bound(lossb, n)
            cases.append({"id": f"b-{len(cases):03d}", "n": n, "subsidyWad": s(sw), **bracket(bv),
                          "absBound": s(ref.iceil(mpf(sw) * 8 / ONE) + 2),
                          "lossB": s(lossb), "lossRefCeil": s(ref.iceil(lb)),
                          "lossBound": s(ref.iceil(mpf(lossb) * 4 / ONE) + 2)})
    return cases


def exp_cases(rng):
    xs = [0, -1, -ONE, -ONE // 2, -41 * ONE, -41_446_531_673_892_822_312]
    xs += [-rng.randint(1, 41 * ONE) for _ in range(34)]
    return [{"id": f"exp-{i:03d}", "x": s(x), **bracket(ref.exp_wad(x)), "absBound": s(MARGIN + 1)}
            for i, x in enumerate(xs)]


def ln_cases(rng):
    xs = [ONE, ONE + 1, 2 * ONE, 64 * ONE, 65 * ONE]
    xs += [rng.randint(ONE, 70 * ONE) for _ in range(35)]
    return [{"id": f"ln-{i:03d}", "x": s(x), **bracket(ref.ln_wad(x)), "absBound": s(MARGIN + 2)}
            for i, x in enumerate(xs)]


def conversion_cases(rng):
    wads = [0, 1, USDC - 1, USDC, USDC + 1, 2 * USDC - 1, 10**30 + 7]
    wads += [rng.randint(0, 10**33) for _ in range(13)]
    return [{"id": f"usdc-{i:03d}", "wad": s(w), "down": s(w // USDC), "up": s(ceil_div(w, USDC))}
            for i, w in enumerate(wads)]


def muldiv_cases(rng):
    out = []
    for i in range(30):
        a = rng.randint(-10**30, 10**30)
        b = rng.randint(1, 10**24) * (1 if i % 2 else -1) if i % 5 else rng.randint(1, 10**24)
        out.append({"id": f"muldiv-{i:03d}", "a": s(a), "b": s(b),
                    "mulDown": s(floor_div(a * b, ONE)), "mulUp": s(ceil_div(a * b, ONE)),
                    "divDown": s(floor_div(a * ONE, b)), "divUp": s(ceil_div(a * ONE, b))})
    return out


def bucket_cases(rng):
    out = []
    for i in range(20):
        n = rng.randint(2, 64)
        lo = rng.randint(-10**6, 10**6)
        w = rng.randint(1, 10**4)
        v = rng.randint(lo - 3 * w, lo + (n + 3) * w)
        idx = 0 if v < lo else min((v - lo) // w, n - 1)
        out.append({"id": f"bucket-{i:03d}", "lo": s(lo), "w": s(w), "n": n, "value": s(v),
                    "bucket": idx})
    return out


def shape_cases(rng):
    out = []
    for i in range(20):
        n = rng.randint(2, 64)
        size = rng.randint(1, 10**24)
        if i % 2 == 0:
            k = rng.randint(1, n - 1)
            out.append({"id": f"step-{i:03d}", "kind": "step", "n": n, "k": k, "size": s(size),
                        "expected": [s(size if j >= k else 0) for j in range(n)]})
        else:
            a = rng.randint(0, n - 1)
            b = rng.randint(a + 1, n)
            out.append({"id": f"range-{i:03d}", "kind": "range", "n": n, "from": a, "to": b,
                        "size": s(size), "expected": [s(size if a <= j < b else 0) for j in range(n)]})
    return out


def K(v):
    return max(0, -min(v))


def netting_case(cid, tickets):
    n = len(tickets[0])
    total = [sum(t[j] for t in tickets) for j in range(n)]
    pos = [0] * n
    topups = []
    for t in tickets:
        k = K([p + d for p, d in zip(pos, t)])
        topups.append(k)
        pos = [p + d + k for p, d in zip(pos, t)]
    g = sum(K(t) for t in tickets)
    nn = K(total)
    return {"id": cid, "n": n, "tickets": [[s(x) for x in t] for t in tickets],
            "gross": s(g), "netted": s(nn), "freed": s(g - nn),
            "grossFloors": s(sum(min(t) for t in tickets)), "nettedFloor": s(min(total)),
            "topUps": [s(k) for k in topups], "position": [s(x) for x in pos],
            "floor": s(min(pos))}


def netting_cases(rng):
    u = 10 * ONE
    named = [
        ("acct-long-only", [[u, 0]]),
        ("acct-complementary-longs", [[u, 0], [0, u]]),
        ("acct-standalone-short", [[-u, 0]]),
        ("acct-short-then-hedge", [[-u, 0], [6 * ONE, 0]]),
        ("acct-offsetting-shorts", [[-u, 0], [0, -u]]),
    ]
    out = [netting_case(cid, t) for cid, t in named]
    for i in range(20):
        n = rng.randint(2, 16)
        tickets = [[rng.randint(-50, 50) * ONE for _ in range(n)] for _ in range(rng.randint(1, 6))]
        out.append(netting_case(f"net-{i:03d}", tickets))
    return out


def main():
    rng = random.Random(SEED)
    sections = {
        "exp": exp_cases(rng),
        "ln": ln_cases(rng),
        "usdc": conversion_cases(rng),
        "muldiv": muldiv_cases(rng),
        "bucket": bucket_cases(rng),
        "cost": cost_cases(rng),
        "trade": trade_cases(rng),
        "prices": price_cases(rng),
        "subsidy": b_cases(rng),
        "shapes": shape_cases(rng),
        "netting": netting_cases(rng),
    }
    doc = {
        "schema": SCHEMA,
        "seed": SEED,
        "generator": "contracts/ref/gen_vectors.py",
        "oracle": "contracts/ref/kizashi_ref.py",
        "mpmath": mpmath.__version__,
        "precisionDigits": ref.mp.dps,
        "units": "integers are decimal strings; money and q in WAD (1 USDC = 1e18); usdc fields in USDC base units",
        "relBound": "1e-12",
        "counts": {k: str(len(v)) for k, v in sections.items()},
        "total": str(sum(len(v) for v in sections.values())),
        **sections,
    }
    json.dump(doc, sys.stdout, indent=1, sort_keys=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

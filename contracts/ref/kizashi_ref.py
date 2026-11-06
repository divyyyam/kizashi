"""Independent 50-digit reference for Kizashi (docs/formula/SPEC.md §1).

Real-valued maths with mpmath. It never imports or mirrors the Solidity rounding: callers
compare Solidity's directed results against these exact values.
"""
from mpmath import mp, mpf, exp, log, fsum, floor, ceil

mp.dps = 50
WAD = mpf(10) ** 18


def cost(q, b):
    """C(q) = b * ln(sum exp(q_i / b)) in WAD units, stable form."""
    m = max(q)
    s = fsum(exp((mpf(x) - m) / mpf(b)) for x in q)
    return mpf(m) + mpf(b) * log(s)


def prices(q, b):
    m = max(q)
    terms = [exp((mpf(x) - m) / mpf(b)) for x in q]
    s = fsum(terms)
    return [t / s * WAD for t in terms]


def trade_charge(q, delta, b):
    after = [x + d for x, d in zip(q, delta)]
    return cost(after, b) - cost(q, b)


def b_from_subsidy(subsidy_wad, n):
    return mpf(subsidy_wad) / log(n)


def loss_bound(b, n):
    return mpf(b) * log(n)


def exp_wad(x):
    return exp(mpf(x) / WAD) * WAD


def ln_wad(x):
    return log(mpf(x) / WAD) * WAD


def ifloor(x):
    return int(floor(x))


def iceil(x):
    return int(ceil(x))

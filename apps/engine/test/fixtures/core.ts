import { compiledTradeSchema, ruleSetSchema, tickContextSchema } from "@kizashi/schemas/engine";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { rulesHash } from "../../src/services/rules-hash";

export function coreFixture() {
  const account = privateKeyToAccount(generatePrivateKey());
  const nowSec = 1_800_000_000;
  const rules = ruleSetSchema.parse({
    budgetUsdc: "100000000",
    perTradeCapUsdc: "10000000",
    dailyCapUsdc: "20000000",
    maxLossPerMarketUsdc: "30000000",
    maxDrawdownUsdc: "50000000",
    stopAtSec: nowSec + 3600,
    allowedMarketIds: ["1"],
    allowedShapes: ["binary", "curve", "range"],
    notes: "",
  });
  const candidate = {
    marketId: "1",
    shape: { kind: "binary" as const, threshold: "2", precision: 0, side: "above" as const },
    spendUsdc: "10000000",
    rationale: "Test candidate",
    ruleRefs: ["allowedMarketIds"],
  };
  const context = tickContextSchema.parse({
    chainId: 31337,
    positionOwner: account.address,
    fetchedAtBlock: "10",
    nowSec,
    availableUsdc: "100000000",
    killSwitch: false,
    spend: [],
    markets: [
      {
        marketId: "1",
        question: "Test outcome",
        unit: "units",
        state: "open",
        closeTimeSec: nowSec + 1800,
        grid: { lo: "0", hi: "4", count: 4, precision: 0 },
        pricesWad: Array(4).fill("250000000000000000"),
        positionWad: Array(4).fill("0"),
        releasableUsdc: "0",
      },
    ],
  });
  const trade = fixtureTrade(account.address, nowSec);
  const input = {
    runId: crypto.randomUUID(),
    chainId: 31337,
    user: account.address,
    mode: "suggest" as const,
    vault: null,
    prompt: "Use the confirmed rules.",
    source: "json" as const,
    warnings: [],
    ruleSet: rules,
    rulesConfirmed: true,
    rulesHash: rulesHash(rules),
    context,
    tick: 0,
    journal: [],
    errors: [],
    executions: [],
  };
  return { account, rules, candidate, context, trade, input, nowSec };
}

function fixtureTrade(address: string, nowSec: number) {
  return compiledTradeSchema.parse({
    candidateIndex: 0,
    marketId: "1",
    chainId: 31337,
    positionOwner: address,
    quotedAtBlock: "10",
    payoutWad: ["0", "0", "1000000000000000000", "1000000000000000000"],
    localChargeWad: "1000000000000000000",
    chainChargeWad: "1000000000000000000",
    chargeUsdc: "1000000",
    limitUsdc: "1000000",
    topUpWad: "0",
    collateralBeforeWad: "0",
    collateralAfterWad: "0",
    freedChangeWad: "0",
    deadlineSec: nowSec + 900,
    call: { to: address, data: "0xabcd" },
  });
}

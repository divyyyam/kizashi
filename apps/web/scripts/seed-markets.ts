/**
 * Creates real demo markets end to end through the same pipeline as the create page:
 * cover image + metadata pinned to IPFS (Pinata) → createMarket on Arc with USDC liquidity →
 * Arkiv listing via the listing service. Idempotent by question: it skips any market whose
 * question is already listed on Arkiv by the listing wallet.
 *
 *   cd apps/web && bun --env-file=../../.env scripts/seed-markets.ts [--only <n>] [--subsidy 1]
 */
import { openMarkets } from "@kizashi/arkiv";
import {
  arcTestnet,
  DEPLOYMENT_5042002 as D,
  erc20Abi,
  kizashiMarketFactoryAbi,
} from "@kizashi/contracts";
import type { MarketMetadata } from "@kizashi/schemas/market";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  isHex,
  parseUnits,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { POST as ipfsPost } from "@/app/api/ipfs/route";
import { POST as listingPost } from "@/app/api/markets/listing/route";
import { arkivServerReader, listingWriterAddress } from "@/lib/server/arkiv";
import { coverPng } from "./png";

type RGB = [number, number, number];
type Seed = {
  question: string;
  description: string;
  category: MarketMetadata["category"];
  tags: string[];
  colors: [RGB, RGB];
  outcomes: MarketMetadata["outcomes"];
  closeIso: string;
  resolution: Omit<MarketMetadata["resolution"], "disputeWindowSec">;
};

const SEEDS: Seed[] = [
  {
    question: "Will ETH close above $5,000 on 31 December 2026?",
    description: "Resolves on the ETH/USD daily close for 31 Dec 2026 (UTC).",
    category: "crypto",
    tags: ["eth", "price"],
    colors: [
      [56, 66, 180],
      [130, 90, 230],
    ],
    outcomes: { kind: "binary", yes: "Above $5,000", no: "$5,000 or below" },
    closeIso: "2026-12-31T23:00:00Z",
    resolution: {
      source: "manual",
      sourceName: "CoinGecko ETH/USD daily close",
      sourceUrl: "https://www.coingecko.com/en/coins/ethereum",
      criteria:
        "YES if the CoinGecko ETH/USD daily close for 31 Dec 2026 (UTC) is strictly above 5,000.00. Otherwise NO.",
      edgeCases:
        "If CoinGecko has no close for that day, the CoinMarketCap ETH/USD daily close is used.",
    },
  },
  {
    question: "What will BTC trade at on 31 December 2026?",
    description: "A distribution market on the BTC/USD daily close for 31 Dec 2026 (UTC).",
    category: "crypto",
    tags: ["btc", "price", "range"],
    colors: [
      [200, 110, 20],
      [250, 190, 60],
    ],
    outcomes: {
      kind: "curve",
      unit: "USD",
      low: "60000",
      high: "180000",
      buckets: 12,
      precision: 0,
    },
    closeIso: "2026-12-31T23:00:00Z",
    resolution: {
      source: "manual",
      sourceName: "CoinGecko BTC/USD daily close",
      sourceUrl: "https://www.coingecko.com/en/coins/bitcoin",
      criteria:
        "Resolves to the range containing the CoinGecko BTC/USD daily close for 31 Dec 2026 (UTC). Below 60,000 falls in the first range; 180,000 or above in the last.",
    },
  },
  {
    question: "Where will KZT/USDC settle at the 00:50 IST close on 7 November?",
    description:
      "Settled automatically by Kizashi's Uniswap v4 TWAP oracle on the KZT/USDC pool on Arc testnet.",
    category: "crypto",
    tags: ["uniswap", "twap", "kzt"],
    colors: [
      [230, 40, 140],
      [255, 140, 200],
    ],
    outcomes: { kind: "curve", unit: "USDC", low: "0.50", high: "2.50", buckets: 8, precision: 2 },
    closeIso: "2026-11-06T19:20:00Z",
    resolution: {
      source: "uniswap-twap",
      sourceName: "Uniswap v4 KZT/USDC TWAP (KizashiOracleHook)",
      criteria:
        "Resolves to the range containing the 5-minute time-weighted average KZT price in USDC over the window ending at close, as read by KizashiResolver from the hook. If the window has fewer than 10 swaps or too little liquidity, the resolver proposes the outcome manually with a 30-minute dispute window.",
    },
  },
  {
    question: "Will Arsenal be top of the Premier League on 1 January 2027?",
    description: "Premier League 2026–27 table position at the start of the new year.",
    category: "sports",
    tags: ["football", "premier-league", "arsenal"],
    colors: [
      [170, 20, 30],
      [240, 90, 80],
    ],
    outcomes: { kind: "binary", yes: "Top of the table", no: "Not top" },
    closeIso: "2026-12-31T23:00:00Z",
    resolution: {
      source: "manual",
      sourceName: "Official Premier League table",
      sourceUrl: "https://www.premierleague.com/tables",
      criteria:
        "YES if Arsenal are first in the official Premier League 2026–27 table at 00:00 UTC on 1 January 2027, after all matches that kicked off before then. Otherwise NO.",
      edgeCases: "Ties are broken by the league's own tiebreakers as shown on the official table.",
    },
  },
  {
    question: "How many goals will be scored in the Premier League on Boxing Day 2026?",
    description:
      "Total goals across every Premier League match that kicks off on 26 December 2026 (UK time).",
    category: "sports",
    tags: ["football", "premier-league", "goals"],
    colors: [
      [40, 120, 60],
      [140, 210, 110],
    ],
    outcomes: { kind: "curve", unit: "goals", low: "10", high: "40", buckets: 15, precision: 0 },
    closeIso: "2026-12-26T11:00:00Z",
    resolution: {
      source: "manual",
      sourceName: "Official Premier League results",
      sourceUrl: "https://www.premierleague.com/results",
      criteria:
        "Resolves to the range containing the total goals (own goals included, penalty shootouts excluded) in all Premier League matches kicking off on 26 Dec 2026, UK time. Fewer than 10 falls in the first range; 40 or more in the last.",
      edgeCases:
        "A match abandoned and not completed that day counts with the goals scored before abandonment.",
    },
  },
  {
    question: "Fastest delivery in men's international cricket in December 2026?",
    description: "The quickest ball bowled in any men's Test, ODI or T20I played in December 2026.",
    category: "sports",
    tags: ["cricket", "bowling", "speed"],
    colors: [
      [20, 90, 160],
      [90, 190, 230],
    ],
    outcomes: { kind: "curve", unit: "km/h", low: "140", high: "160", buckets: 10, precision: 0 },
    closeIso: "2026-12-31T18:00:00Z",
    resolution: {
      source: "manual",
      sourceName: "ESPNcricinfo ball-by-ball speed data",
      sourceUrl: "https://www.espncricinfo.com",
      criteria:
        "Resolves to the range containing the fastest delivery speed (km/h, from the official broadcast speed gun as reported by ESPNcricinfo) in any men's Test, ODI or T20I played in December 2026.",
      edgeCases:
        "If sources disagree, the ESPNcricinfo figure is used. Below 140 falls in the first range.",
    },
  },
  {
    question: "Will anyone score a double century in men's Test cricket in December 2026?",
    description: "Any batter, any men's Test match played between 1 and 31 December 2026.",
    category: "sports",
    tags: ["cricket", "test", "batting"],
    colors: [
      [120, 80, 20],
      [220, 180, 90],
    ],
    outcomes: { kind: "binary", yes: "Yes, 200+", no: "No" },
    closeIso: "2026-12-31T18:00:00Z",
    resolution: {
      source: "manual",
      sourceName: "ESPNcricinfo Test scorecards",
      sourceUrl: "https://www.espncricinfo.com",
      criteria:
        "YES if any batter scores 200 or more runs in a single innings of a men's Test match played (at least partly) between 1 and 31 December 2026. Otherwise NO.",
    },
  },
  {
    question: "Will more than 400 projects be submitted at ETHGlobal Mumbai?",
    description: "Counts projects listed for ETHGlobal Mumbai on the ETHGlobal showcase.",
    category: "tech",
    tags: ["ethglobal", "hackathon"],
    colors: [
      [90, 40, 160],
      [200, 120, 240],
    ],
    outcomes: { kind: "binary", yes: "More than 400", no: "400 or fewer" },
    closeIso: "2026-11-07T00:30:00Z",
    resolution: {
      source: "manual",
      sourceName: "ETHGlobal showcase",
      sourceUrl: "https://ethglobal.com/showcase",
      criteria:
        "YES if the ETHGlobal showcase lists more than 400 projects for ETHGlobal Mumbai on 9 Nov 2026. Otherwise NO.",
    },
  },
];

const log = (value: unknown) => process.stdout.write(`${String(value)}\n`);

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function call(handler: (r: Request) => Promise<Response>, init: RequestInit) {
  const res = await handler(new Request("http://seed.local/api", init));
  const body = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  return body;
}

async function main() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  const rpc = process.env.ARC_TESTNET_RPC_URL;
  if (!key || !isHex(key) || !rpc)
    throw new Error("DEPLOYER_PRIVATE_KEY and ARC_TESTNET_RPC_URL are required");
  const account = privateKeyToAccount(key);
  const pub = createPublicClient({
    chain: arcTestnet,
    transport: http(rpc, { timeout: 30_000, retryCount: 3 }),
  });
  const wallet = createWalletClient({
    chain: arcTestnet,
    account,
    transport: http(rpc, { timeout: 60_000 }),
  });
  const subsidy = parseUnits(arg("--subsidy") ?? "1", 6);
  const only = arg("--only");

  const reader = arkivServerReader();
  const owner = listingWriterAddress();
  const listed = new Set<string>();
  if (reader.status === "ready" && owner) {
    const page = await openMarkets(reader.value, { owner, arcChainId: 5042002 });
    for (const m of page.items) listed.add(m.payload.title);
  }

  const seeds = only ? SEEDS.slice(Number(only) - 1, Number(only)) : SEEDS;
  const balance = await pub.readContract({
    address: D.usdc.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  log(
    `deployer ${account.address} has ${Number(balance) / 1e6} USDC; ${seeds.length} markets at ${Number(subsidy) / 1e6} USDC each`,
  );

  for (const [i, seed] of seeds.entries()) {
    const tag = `[${i + 1}/${seeds.length}] ${seed.question}`;
    if (listed.has(seed.question.slice(0, 160))) {
      log(`${tag}: already listed, skipped`);
      continue;
    }
    const close = Math.floor(Date.parse(seed.closeIso) / 1000);
    if (close < Date.now() / 1000 + 30 * 60) {
      log(`${tag}: closes too soon, skipped`);
      continue;
    }
    const bal = await pub.readContract({
      address: D.usdc.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });
    if (bal < subsidy) {
      log(
        `${tag}: not enough USDC (${Number(bal) / 1e6}); stopping. Top up at https://faucet.circle.com`,
      );
      break;
    }

    // 1. cover image → IPFS
    const png = coverPng(i * 7919 + 17, seed.colors[0], seed.colors[1]);
    const imgForm = new FormData();
    imgForm.append("kind", "image");
    imgForm.append("file", new Blob([png as BlobPart], { type: "image/png" }), "cover.png");
    const img = await call(ipfsPost, { method: "POST", body: imgForm });

    // 2. metadata → IPFS, rulesRef = keccak256(canonical JSON)
    const metadata: MarketMetadata = {
      v: 1,
      question: seed.question,
      description: seed.description,
      category: seed.category,
      tags: seed.tags,
      image: { cid: String(img.cid), mime: "image/png", width: 640, height: 640 },
      outcomes: seed.outcomes,
      closeTimeSec: close,
      resolution: {
        ...seed.resolution,
        disputeWindowSec: seed.resolution.source === "manual" ? 1800 : 0,
      },
      subsidyUsdc: subsidy.toString(),
      creator: account.address,
      createdAtSec: Math.floor(Date.now() / 1000),
    };
    const metaForm = new FormData();
    metaForm.append("kind", "metadata");
    metaForm.append("metadata", JSON.stringify(metadata));
    const pinned = await call(ipfsPost, { method: "POST", body: metaForm });

    // 3. grid
    const o = seed.outcomes;
    const grid =
      o.kind === "binary"
        ? { n: 2n, lo: 0n, w: 1n, precision: 0 }
        : (() => {
            const p = o.precision;
            const sc = (v: string) => {
              const [w, f = ""] = v.split(".");
              return BigInt(w ?? "0") * 10n ** BigInt(p) + BigInt(f.padEnd(p, "0") || "0");
            };
            const lo = sc(o.low);
            const hi = sc(o.high);
            return { n: BigInt(o.buckets), lo, w: (hi - lo) / BigInt(o.buckets), precision: p };
          })();
    const twap = seed.resolution.source === "uniswap-twap" ? D.twap : undefined;
    if (seed.resolution.source === "uniswap-twap" && !twap)
      throw new Error("no TWAP pool configured");
    const priceSource = twap
      ? {
          key: twap.key,
          baseIsToken0: twap.baseIsToken0,
          baseDecimals: twap.baseDecimals,
          quoteDecimals: twap.quoteDecimals,
          gridDecimals: grid.precision,
          window: twap.window,
          minObservations: twap.minObservations,
          minLiquidity: twap.minLiquidity,
        }
      : {
          key: {
            currency0: zeroAddress,
            currency1: zeroAddress,
            fee: 0,
            tickSpacing: 0,
            hooks: zeroAddress,
          },
          baseIsToken0: false,
          baseDecimals: 0,
          quoteDecimals: 0,
          gridDecimals: 0,
          window: 0,
          minObservations: 0,
          minLiquidity: 0n,
        };

    // 4. approve + createMarket on Arc
    const gasPrice = parseUnits("25", 9);
    const allowance = await pub.readContract({
      address: D.usdc.address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, D.marketFactory.address],
    });
    if (allowance < subsidy) {
      const h = await wallet.writeContract({
        address: D.usdc.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [D.marketFactory.address, subsidy * 20n],
        gasPrice,
      });
      await pub.waitForTransactionReceipt({ hash: h });
    }
    const args = [
      {
        config: { n: grid.n, lo: grid.lo, w: grid.w, collateral: D.usdc.address },
        subsidyUsdc: subsidy,
        closeTime: BigInt(close),
        kind: o.kind === "binary" ? 0 : 1,
        resolution: twap ? 2 : 1,
        rulesRef: pinned.rulesRef as `0x${string}`,
        priceSource,
      },
    ] as const;
    await pub.simulateContract({
      address: D.marketFactory.address,
      abi: kizashiMarketFactoryAbi,
      functionName: "createMarket",
      args,
      account: account.address,
    });
    const tx = await wallet.writeContract({
      address: D.marketFactory.address,
      abi: kizashiMarketFactoryAbi,
      functionName: "createMarket",
      args,
      gasPrice,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash: tx });
    let marketId: bigint | undefined;
    for (const log of receipt.logs) {
      try {
        const ev = decodeEventLog({ abi: kizashiMarketFactoryAbi, ...log });
        if (ev.eventName === "MarketCreated") marketId = ev.args.marketId;
      } catch {}
    }
    if (marketId === undefined) throw new Error(`${tag}: no MarketCreated in ${tx}`);

    // 5. Arkiv listing (verifies chain + IPFS hash server-side)
    let listing = "";
    try {
      const l = await call(listingPost, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketId: marketId.toString(), metadataCid: pinned.cid }),
      });
      listing = String(l.entityKey);
    } catch (error) {
      listing = `FAILED: ${error instanceof Error ? error.message : error}`;
    }
    log(
      JSON.stringify({
        market: marketId.toString(),
        question: seed.question,
        createTx: tx,
        imageCid: img.cid,
        metadataCid: pinned.cid,
        rulesRef: pinned.rulesRef,
        arkiv: listing,
      }),
    );
  }
}

main().catch((error) => {
  log(error instanceof Error ? error.message : error);
  process.exit(1);
});

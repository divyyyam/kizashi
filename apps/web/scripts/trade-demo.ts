/**
 * Real Arc trades for the evidence log, built only with @kizashi/core and priced by pool.quote.
 *   bun --env-file=../../.env scripts/trade-demo.ts
 * Wallets: the deployer, and a funded trader whose key lives in the gitignored ./.keys/trader.json.
 * Prints one JSON line per transaction and the G / N / F check for the hedging wallet.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { arcTestnet, DEPLOYMENT_5042002 as D, erc20Abi, kizashiPoolAbi } from "@kizashi/contracts";
import {
  freed,
  type Grid,
  gaussianShape,
  grossCollateral,
  nettedCollateral,
  normalise,
  step,
  WAD,
} from "@kizashi/core";
import { createPublicClient, createWalletClient, type Hex, http, isHex, parseUnits } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const out = (o: unknown) =>
  process.stdout.write(
    `${JSON.stringify(o, (_, v) => (typeof v === "bigint" ? v.toString() : v))}\n`,
  );
const rpc = process.env.ARC_TESTNET_RPC_URL;
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!rpc || !deployerKey || !isHex(deployerKey))
  throw new Error("ARC_TESTNET_RPC_URL and DEPLOYER_PRIVATE_KEY are required");

const keyFile = ".keys/trader.json";
function traderKey(): Hex {
  if (existsSync(keyFile)) return JSON.parse(readFileSync(keyFile, "utf8")).privateKey as Hex;
  mkdirSync(".keys", { recursive: true });
  const privateKey = generatePrivateKey();
  writeFileSync(keyFile, JSON.stringify({ privateKey }), { mode: 0o600 });
  return privateKey;
}

const pub = createPublicClient({
  chain: arcTestnet,
  transport: http(rpc, { timeout: 30_000, retryCount: 3 }),
});
const mk = (key: Hex) =>
  createWalletClient({
    chain: arcTestnet,
    account: privateKeyToAccount(key),
    transport: http(rpc, { timeout: 60_000 }),
  });
const GAS_PRICE = parseUnits("25", 9);

async function send(label: string, tx: () => Promise<Hex>) {
  const hash = await tx();
  const r = await pub.waitForTransactionReceipt({ hash });
  out({ label, hash, status: r.status, explorer: `https://explorer.testnet.arc.io/tx/${hash}` });
  if (r.status !== "success") throw new Error(`${label} reverted`);
  return r;
}

async function trade(
  wallet: ReturnType<typeof mk>,
  market: string,
  delta: bigint[],
  label: string,
) {
  const m = D.markets[market];
  if (!m) throw new Error(`market ${market} not deployed`);
  const owner = wallet.account.address;
  const q = await pub.readContract({
    address: m.pool,
    abi: kizashiPoolAbi,
    functionName: "quote",
    args: [owner, delta],
  });
  const limit = q.chargeUsdc + q.chargeUsdc / 20n + 10_000n;
  out({ label: `${label}:quote`, market, chargeUsdc: q.chargeUsdc, topUpWad: q.topUpWad });
  if (q.chargeUsdc > 0n) {
    const allowance = await pub.readContract({
      address: D.usdc.address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, m.pool],
    });
    if (allowance < limit)
      await send(`${label}:approve`, () =>
        wallet.writeContract({
          address: D.usdc.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [m.pool, limit * 2n],
          gasPrice: GAS_PRICE,
        }),
      );
  }
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  return send(label, () =>
    wallet.writeContract({
      address: m.pool,
      abi: kizashiPoolAbi,
      functionName: "trade",
      args: [delta, limit, deadline],
      gasPrice: GAS_PRICE,
    }),
  );
}

const grid = (market: string): Grid => {
  const m = D.markets[market];
  if (!m) throw new Error(`market ${market} not deployed`);
  return { n: m.n, lo: BigInt(m.lo), w: BigInt(m.w) };
};
const scaled = (shape: bigint[], sizeWad: bigint) => shape.map((x) => (x * sizeWad) / WAD);
const neg = (v: bigint[]) => v.map((x) => -x);

async function main() {
  const deployer = mk(deployerKey as Hex);
  const trader = mk(traderKey());
  out({ trader: trader.account.address, deployer: deployer.account.address });

  const bal = await pub.readContract({
    address: D.usdc.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [trader.account.address],
  });
  if (bal < parseUnits("3", 6))
    await send("fund-trader", () =>
      deployer.writeContract({
        address: D.usdc.address,
        abi: erc20Abi,
        functionName: "transfer",
        args: [trader.account.address, parseUnits("3", 6)],
        gasPrice: GAS_PRICE,
      }),
    );

  const WAD_05 = WAD / 2n;
  // Football (market 9): deployer takes a curve around 24 goals, width 4.
  const g9 = grid("9");
  await trade(deployer, "9", scaled(gaussianShape(g9, 24n, 4n), WAD_05), "football-curve-24");
  // Cricket speed (market 10): deployer curve around 150 km/h.
  const g10 = grid("10");
  await trade(deployer, "10", scaled(gaussianShape(g10, 150n, 4n), WAD_05), "cricket-curve-150");
  // ETH binary (market 5): one YES trade (above the threshold edge).
  await trade(deployer, "5", step(2, 1, WAD_05), "eth-yes");

  // Netting: the trader sells a narrow curve at 24, then buys a wider curve (a hedge).
  const shortCurve = neg(scaled(gaussianShape(g9, 24n, 4n), WAD_05));
  const hedge = scaled(gaussianShape(g9, 24n, 8n), WAD_05 / 2n);
  await trade(trader, "9", shortCurve, "netting-short");
  await trade(trader, "9", hedge, "netting-hedge");

  const tickets = [shortCurve, hedge];
  const m9 = D.markets["9"];
  if (!m9) throw new Error("market 9 missing");
  const [position, floor] = await Promise.all([
    pub.readContract({
      address: m9.pool,
      abi: kizashiPoolAbi,
      functionName: "positionOf",
      args: [trader.account.address],
    }),
    pub.readContract({
      address: m9.pool,
      abi: kizashiPoolAbi,
      functionName: "floorOf",
      args: [trader.account.address],
    }),
  ]);
  let replay: bigint[] = new Array(g9.n).fill(0n);
  let topUps = 0n;
  for (const t of tickets) {
    const r = normalise(replay, t);
    replay = r.position;
    topUps += r.topUp;
  }
  out({
    label: "netting-check",
    grossWad: grossCollateral(tickets),
    nettedWad: nettedCollateral(tickets),
    freedWad: freed(tickets),
    coreTopUpsWad: topUps,
    onchainFloorWad: floor,
    positionMatches: replay.every((x, i) => x === position[i]),
  });
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});

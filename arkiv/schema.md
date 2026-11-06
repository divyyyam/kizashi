# Kizashi on Arkiv: entity schema (ARK-01, schema version 1)

Arkiv carries Kizashi's public, short-lived coordination records: market listings for discovery,
crowd-curve history and engine trade proposals. It never holds or authorises money. Arc is the
source of truth, and a listing with no matching Arc market is shown as unverified or left out.

- SDK: `@arkiv-network/sdk` 1.0.1 (viem 2.57.16 peer), checked 6 Nov 2026 against the package
  README and source, and https://docs.arkiv.network.
- Chain: Rabdi testnet, chain id `7794095`, RPC `https://rpc.rabdi.db-chain.testnet.arkiv.network/<accessKey>`,
  explorer https://rabdi.explorer.arkiv.network. Defined in `packages/arkiv/src/chain.ts` with the
  same constants as the SDK's `rabdi()`. Rabdi isn't used directly, so the RPC URL can be the
  server proxy.
- Scope: every entity has `project = "kizashi"` and `v = 1`, and every query filters on both. Each
  schema is named, so the SDK also tags entities with an indexed `arkiv.schema` attribute holding
  the name below.
- Joins: `marketId` is the decimal string of `KizashiMarketFactory`'s market id, and `arcChainId`
  is the Arc chain (`5042002`).
- Payloads: JSON in the `payload` bytes column, validated by the zod schemas in `src/schemas.ts`.
  Money uses INTERFACES §3 string units (`…Usdc` is 6-decimal base units; `…Wad` is 1e18). Arkiv
  `str` values are capped at 128 bytes, which is why titles and other prose live in the payload.
- Access key: kept only on the server. Browsers call `POST /api/arkiv` (the web app's route
  built on `createArkivRpcProxy`), which forwards an allowlist of read methods only.

## Entities

| schema                  | writer                                                             | expiry                                                               | status values                |
| ----------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------- |
| `kizashi.market`        | listing service wallet (D10); the creator is recorded in `creator` | `resolvesAt` + 30 min dispute window + 1 h grace, never under 10 min | `open`, `closed`, `resolved` |
| `kizashi.curveSnapshot` | indexer wallet                                                     | 30 days                                                              | n/a                          |
| `kizashi.proposal`      | engine wallet                                                      | 10 minutes                                                           | `open`, `approved`           |
| `kizashi.probe`         | smoke-test wallet                                                  | 10 minutes                                                           | n/a                          |

Expiry is a block height. The SDK converts seconds at a nominal 2 s block time, so every lifetime is
approximate. Arkiv emits no expiry event, so no "expired" status is ever written: an expired
proposal simply disappears, and the UI never approves one it cannot read. The dispute window equals
`KizashiResolver.DISPUTE_WINDOW`.

## Columns

Checked against `src/schemas.ts` by `packages/arkiv/test/schemas.test.ts`.

### `kizashi.market`

| column        | type  | indexed | optional |
| ------------- | ----- | ------- | -------- |
| `project`     | str   | yes     | no       |
| `v`           | i32   | yes     | no       |
| `marketId`    | str   | yes     | no       |
| `arcChainId`  | u64   | yes     | no       |
| `kind`        | str   | yes     | no       |
| `status`      | str   | yes     | no       |
| `resolvesAt`  | u64   | yes     | no       |
| `arcAddress`  | addr  | yes     | no       |
| `creator`     | addr  | yes     | no       |
| `rulesRef`    | str   | no      | no       |
| `evidenceRef` | str   | no      | yes      |
| `payload`     | bytes | no      | no       |

### `kizashi.curveSnapshot`

| column       | type  | indexed | optional |
| ------------ | ----- | ------- | -------- |
| `project`    | str   | yes     | no       |
| `v`          | i32   | yes     | no       |
| `marketId`   | str   | yes     | no       |
| `arcChainId` | u64   | yes     | no       |
| `ts`         | u64   | yes     | no       |
| `block`      | u64   | no      | no       |
| `payload`    | bytes | no      | no       |

### `kizashi.proposal`

| column       | type  | indexed | optional |
| ------------ | ----- | ------- | -------- |
| `project`    | str   | yes     | no       |
| `v`          | i32   | yes     | no       |
| `marketId`   | str   | yes     | no       |
| `arcChainId` | u64   | yes     | no       |
| `user`       | addr  | yes     | no       |
| `status`     | str   | yes     | no       |
| `runId`      | str   | yes     | no       |
| `rulesHash`  | str   | no      | no       |
| `txHash`     | str   | no      | yes      |
| `payload`    | bytes | no      | no       |

### `kizashi.probe`

| column    | type  | indexed | optional |
| --------- | ----- | ------- | -------- |
| `project` | str   | yes     | no       |
| `v`       | i32   | yes     | no       |
| `label`   | str   | yes     | no       |
| `payload` | bytes | no      | no       |

## Queries

These are the three user-visible reads (`src/queries.ts`). Pass `owner` (the trusted writer
address) to ignore entities other wallets wrote with the same schema. Rows whose payload fails
validation are dropped and counted in `dropped`.

```ts
import { createArkivReader, curveHistory, openMarkets, openProposals } from "@kizashi/arkiv";

const reader = createArkivReader({ rpcUrl: "/api/arkiv" }); // browser; servers use ARKIV_RPC_URL

// 1. Lobby: open markets not yet at resolution, soonest first.
//    where project="kizashi" && v=1 && status="open" && resolvesAt > now   order by resolvesAt asc
const lobby = await openMarkets(reader, { owner: LISTING_WRITER, arcChainId: 5042002 });

// 2. Curve chart: snapshots for one market, oldest first.
//    where project="kizashi" && v=1 && marketId=$id && ts >= since   order by ts asc
const curve = await curveHistory(reader, "1", { owner: INDEXER_WRITER });

// 3. Engine inbox: open proposals for a user, soonest-expiring first.
//    where project="kizashi" && v=1 && user=$user && status="open"   order by $expiresAt asc
const inbox = await openProposals(reader, userAddress, { owner: ENGINE_WRITER });
```

`watchChanges(reader, onChange)` calls back after any entity event, debounced to 250 ms, so a
screen can refetch its query.

## Smoke test

```bash
cd packages/arkiv
ARKIV_RPC_URL="https://rpc.rabdi.db-chain.testnet.arkiv.network/<accessKey>" \
ARKIV_SMOKE_PRIVATE_KEY=0x... bun run smoke
```

The test writes one `kizashi.probe` with a 10-minute expiry, queries it back by `label`, and
asserts the owner. It then prints the entity key, tx hash and explorer links for the handoff.
Without both env vars it is skipped. Fund the wallet at https://hub.arkiv.network/faucet.

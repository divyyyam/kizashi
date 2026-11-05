# Engine core

The engine uses Bun, Express, LangGraph and Postgres. Rules intake supports JSON/PDF,
SIWE authentication, immutable hash confirmation and durable interrupts. After confirmation,
an on-demand tick loads context, checks stop conditions, plans, compiles, checks risk and
selects a candidate. Suggest mode pauses for approval, then for a user transaction.

`createRuntime(settings, logger, adapters)` enables trading ticks only when both the model
and reviewed market adapters are supplied. The executable currently supplies no market
adapters: `/runs/:id/tick` returns a typed 503. Formula math, ABI encoding, chain receipt
verification, live Arkiv publication and autonomous vault execution remain integration work.
Missing data never becomes a zero balance, fabricated quote or successful trade.

The internal planner node is `planTick`; LangGraph disallows a node and state channel both
named `plan`. Intake and trading now use one StateGraph and one checkpoint thread ID. Confirmation
does not schedule trades; Suggest ticks are explicit. Autonomous execution is unavailable.
Rules edits loop back to confirmation with a fresh canonical hash. Intake streams typed node
and rules-pending events through the same event projection as planning and approvals.

Run from the repository root in WSL:

```sh
bun run --filter @kizashi/db db:generate
bun run --filter @kizashi/engine typecheck
bun run --filter @kizashi/engine test
bun run --filter @kizashi/engine build
bun run check
bun run --filter @kizashi/engine verify:postgres
bun run --filter @kizashi/engine verify:core
```

The start/dev/verification scripts load the root `.env`. Supply `DATABASE_URL` with TLS and
`ENGINE_JWT_SECRET` with at least 32 random bytes. Local defaults: port 8787, chain 31337,
origin `http://localhost:3000`, SIWE domain `localhost:3000`. Gemini extraction/planning needs
`GOOGLE_GENERATIVE_AI_API_KEY`; JSON rules and confirmation work without it.

Application tables default to `engine_dev_e0e1`; checkpoints to
`engine_checkpoints_dev_e0e1`. Production requires explicit, distinct `ENGINE_DB_SCHEMA`
and `ENGINE_CHECKPOINT_SCHEMA`. Prisma's pooled hostname `pooled.db.prisma.io` maps to
`db.prisma.io` for session-dependent checkpoint/lock operations, with credentials unchanged.
Other PostgreSQL hosts pass through. `DIRECT_URL` is not required. Schema-specific migration
copies preserve the original migration. Generating the Prisma client needs no database access.

HTTP routes:

- Public: `/health`, `/auth/nonce`, `/auth/verify`.
- Authenticated: create/read runs, hash-bound rules resume, Suggest resume, tick, mode, stop,
  and `GET /runs/:id/stream`.
- `POST /market-kind` uses one stateless creator-graph node, validates the suggested grid and
  enforces 30 requests per address per hour. Missing/failed model calls return `llm_unavailable`.
- Run ownership comes from the JWT; another owner gets 404.
- SSE uses bearer-authenticated `fetch`, `Last-Event-ID`, 500 retained events, a 15-second
  heartbeat, resync on a history gap and connection cleanup. A stop closes the stream.

Engine contracts are exported through `@kizashi/schemas/engine`. Money on the wire is decimal
integer strings; arithmetic is bigint. `TickContext` and `CompiledTrade` describe adapter
inputs/outputs and do not invent contract ABIs. Producers must bind vectors, owner, chain,
quote block and calldata to the same trade and use the parity-tested Formula package.
The execution schema remains unavailable until the receipt/ABI contract is delivered.

Risk includes authorized markets/shapes, close time, spend caps, pending cash reservations,
same-block quote drift (at most 1%), owner/chain identity, limits and deadlines. Pending trades
reserve the maximum authorized cash charge; top-up is already included and is not added twice.
Netting metrics never credit spend caps. `nets` compares adapter-supplied backing requirements.
Before exposing calldata, the engine reloads context/quote, rechecks rules and caps, and reserves
spend. Approval IDs include a revision so an edited/replanned card cannot reuse an earlier approval.

`effects` stores the spend ledger; `executions` records reported transaction hashes as unconfirmed.
Reserved spend clears on rejection/cancellation/expiry. A reported broadcast changes atomically
to `sent` and stays reserved until reconciliation, even after 24 hours. Receipt verification and
settlement to actual cash spend remain engine integration work. Expired interrupts
are closed on the next tick/resume; no background timeout worker is claimed.

Ticks/resumes use one dedicated direct Postgres session advisory lock per run, without holding
an application transaction across LLM/RPC calls. Events use a separate short transaction lock.
Adapters receive abort signals and have ten-second deadlines (receipt confirmation: 60 seconds).
Proposal publication reserves a durable effect keyed by run, tick and selection revision before
calling its adapter. A stored result is replayed without publishing. An unfinished reservation
stays unavailable until reconciled; it is never automatically republished after a crash.
The engine's Arkiv-unavailable path still presents the approval with a null proposal key.

Unit tests use isolated stores, generated wallets and fake models. `verify:core` requires
development schemas and verifies approval restart, competing resumes, durable reservations,
event sequences and stop persistence using test records. It makes no chain or LLM calls and
does not prove real trades, Arkiv effects, Formula parity or autonomous execution.

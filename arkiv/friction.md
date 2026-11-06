# Arkiv friction log (Kizashi, ETHGlobal Mumbai 2026)

SDK: `@arkiv-network/sdk` 1.0.1 on the Rabdi testnet (chain 7794095). What we hit while building
`packages/arkiv`, in the order it cost us time.

1. **Inferred schema types can't be emitted as declarations.** `defineSchema(...)` returns a type
   that references `ColumnProperties`, which isn't exported, so `tsc` with `declaration: true` fails
   with TS4023 / TS4058 on every exported schema. Workaround: `declaration: false` and consume the
   package from source. Fix: export `ColumnProperties` (and the other column helper types).
2. **The access key is a URL path segment.** It's convenient on a server, but it means the key
   ships in any chain object or wallet config that touches the browser. We built a read-only
   JSON-RPC proxy so browsers never see it. A header-based key, or a documented "public read key
   restricted to origins" pattern, would remove the need for that.
3. **`str` values are capped at 128 bytes.** That's reasonable, but it's only discoverable from
   source (`MAX_STRING_BYTES`). Titles and prose had to move into a `bytes` payload. Please put it
   in the README's schema section.
4. **No expiry event.** Entities just disappear when they expire, so a reader can't tell "expired"
   from "never existed" without tracking it itself. We decided never to write an "expired" status
   and treat expiry as the signal. An `EntityExpired` event, or a tombstone query, would help UIs.
5. **Expiry is block height, and seconds are converted at a nominal 2 s block time.** It's
   documented in code, but easy to miss. Lifetimes in seconds must be whole multiples of the block
   time or `ExpirationTime.fromSeconds` throws.
6. **Schema-tagged queries and spam.** Anyone can write an entity with your schema name, so every
   read must also filter `ownedBy(writer)`. Worth stating prominently in the docs, since it's a
   security property, not an optimisation.
7. **Env gotcha, not the SDK's fault:** placeholder values like `<listing key>` in a sourced `.env`
   break bash (`<` is a redirect), which silently skipped our smoke test the first time.

## What we liked

- Viem-native clients: `createPublicClient` and `createWalletClient` dropped straight into our
  stack.
- The typed `select().from(schema).where(...).orderBy(...)` builder, which caught a wrongly typed
  filter at compile time.
- `watchEntityEvents` made live refetching trivial.

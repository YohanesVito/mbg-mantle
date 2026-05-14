# be/ — Backend

Scoring engine, data ingestion, and route scorer. Runs as a service that the TEE worker consumes; not deployed publicly itself.

## Responsibilities

- Ingest Mantle protocol data from DefiLlama, Mantlescan, Blockscout, on-chain RPC
- Pull existing scores from CertiK Skynet, Exponential.fi, DeFiSafety (where available)
- Compute base risk components (contract, oracle, liquidity, centralization)
- Compute Mantle-native risk factors (LST dependency, bridge, sequencer, composition complexity)
- Aggregate into per-protocol and per-route scores
- Emit score vectors + reasoning to the TEE worker for signing

## Tech

- Bun + TypeScript
- DefiLlama API client
- Mantle Blockscout / Mantlescan API clients
- viem for direct on-chain reads
- Postgres or SQLite for off-chain index/cache

## Setup (planned)

```bash
cd be
bun install
bun run dev
```

Per project convention: use `bun` for everything. Do not use `node`, `npm`, `npx`, or `tsx` directly.

## Scoring components

Each protocol is scored on four dimensions, then weighted into an aggregate:

| Component | Weight | Source |
|---|---|---|
| Contract risk | 40% | Audit recency + count + deploy age (off-chain registry of audits) |
| Liquidity risk | 25% | DefiLlama TVL (per-chain or protocol-wide) |
| Centralization risk | 20% | v0: placeholder. v1: admin/owner address + multisig + timelock on-chain reads |
| Oracle risk | 15% | Aave-pattern: live `getAllReservesTokens` + `getSourceOfAsset` from Mantle RPC for lending protocols; v0 stub for others |

Try it:

```bash
bun run score                          # all protocols, leaderboard
bun run score aave-v3-mantle           # single protocol with breakdown
```

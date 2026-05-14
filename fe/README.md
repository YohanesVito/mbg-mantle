# fe/ — Frontend

Next.js dashboard for browsing MBG scores, inspecting reasoning, and using the route checker.

## Pages

| Route | Purpose |
|---|---|
| `/` | Leaderboard — every scored Mantle protocol sorted by aggregate score |
| `/protocol/[id]` | Per-protocol detail — component breakdown, audit list, on-chain attestation panel |
| `/route` | Route checker — compose a multi-leg DeFi route, see composite score + composition penalty |

## Tech

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind v4
- viem for on-chain reads
- Server components + Server Actions (oracle RPC stays server-side)

## Setup

```bash
cd fe
bun install
bun run dev   # http://localhost:3000
```

Config via env vars:

| Variable | Default | Purpose |
|---|---|---|
| `MBG_RPC_URL` | `http://127.0.0.1:8545` | Chain RPC |
| `MBG_CHAIN_ID` | `31337` | Chain id |
| `MBG_ORACLE_ADDRESS` | local Anvil deploy address | `RiskOracle` address |

## Design notes

The dashboard exists for *transparency*, not as the product. The product is the on-chain oracle + Skill. The dashboard lets judges, users, and integrators independently audit any score.

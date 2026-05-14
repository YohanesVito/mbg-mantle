# MBG — Mantle Bot Gate

> The pre-trade risk gate for Mantle DeFi agents — a TEE-attested on-chain oracle that bots and dapps consult before routing user funds.

## What MBG is

Existing risk scorers (CertiK Skynet, Exponential.fi, DeFiSafety) publish off-chain. MBG signs scores inside a TEE and writes them on-chain so any agent or contract can **prove** it consulted a current risk evaluation before routing a user's funds, and so a user can independently verify the same.

The score itself is not the moat — the **attestation**, the **Mantle-native composition risk model**, and the **agent-integration surface** are.

## Repository layout

| Folder | Purpose |
|---|---|
| [`sc/`](./sc/) | Smart contracts — `RiskOracle` (Foundry) |
| [`be/`](./be/) | Scoring engine — data ingestion, base components, aggregation (Bun + TypeScript) |
| [`tee-worker/`](./tee-worker/) | Phala TDX worker — runs the scoring engine inside the enclave, signs attested scores, submits on-chain |
| [`fe/`](./fe/) | Dashboard — Next.js, leaderboard + per-protocol detail + route checker |
| [`skills/mbg/`](./skills/mbg/) | Byreal Skill — agent-callable CLI (`mbg-cli`) with on-chain reads |
| [`docs/`](./docs/) | Architecture diagrams, methodology deep-dives, RFCs |

## Getting started (local)

Requires [Bun](https://bun.sh), [Foundry](https://book.getfoundry.sh/getting-started/installation), and either Anvil or a Mantle Sepolia / Mainnet RPC.

```bash
# Install all workspaces
bun install

# Backend: score 13 Mantle protocols against live DefiLlama + Mantle RPC
cd be && bun run score

# Smart contracts: tests
cd sc && forge install foundry-rs/forge-std --no-git && forge test

# Frontend: dev server on http://localhost:3000
cd fe && bun run dev

# Skill: agent-style CLI
cd skills/mbg && bun run cli list-protocols
cd skills/mbg && bun run cli score-protocol aave-v3-mantle
```

For local end-to-end testing (Anvil + deploy + integrate), see `tee-worker/` and `sc/script/Deploy.s.sol`.

## On-chain references

ERC-8004 canonical contracts on Mantle Mainnet (used by `tee-worker/` to mint agent identity):

| Registry | Address |
|---|---|
| IdentityRegistry | [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://mantlescan.xyz/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |
| ReputationRegistry | [`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`](https://mantlescan.xyz/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) |
| ValidationRegistry | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |

## License

MIT (pending).

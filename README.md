# MBG — Mantle Bot Gate

> **The autonomous risk-scoring agent for the Mantle agent economy. Trading agents on Mantle can prove they consulted MBG before signing — because every score it produces carries a cryptographic receipt.**

**Live demo:** https://mbg-fe.vercel.app · **Mantle Mainnet RiskOracle:** [`0x998ceb70…594eb`](https://mantlescan.xyz/address/0x998ceb700e57f535873d189a6b1b7e2aa8c594eb#code) · **ERC-8004 agentId:** [`130`](https://mantlescan.xyz/tx/0x610d925e67364b350ba4810b9174485212b8498e4eaa68f03a99d8c7ad6ac668)

## Why this exists

AI trading agents are moving real money on Mantle — RealClaw, Brahma, Hey Anon, Giza ARMA. They claim to consider risk before signing on your behalf — but you can't tell if they did. Every existing risk scorer (CertiK Skynet, Exponential.fi, DeFiSafety) lives behind a private API. To use them in an agent flow, you have to trust the scorer's server *and* trust the agent that says it consulted them. Two layers of "believe me bro."

MBG removes both. MBG is itself an autonomous agent — registered with on-chain identity (ERC-8004 #130), running scoring inference inside a TEE, signing every output with an attested key, writing the result to chain. A trading agent that consulted MBG carries an attestation hash any user, contract, or downstream agent can verify on Mantlescan. "Believe me bro" becomes math.

We do not compete with trading agents. We are the gate they call.

## Three pillars

**1. Agent-to-agent, on-chain.** Callable from any contract via `getRouteScore(actions[])` in one view call. Or as a Byreal/OpenClaw Skill (`mbg-cli`) for LLM-driven planners. The dashboard exists for *transparency*; the product is the on-chain scoring agent.

**2. Verifiable end-to-end.** The code that ran, the data it ate, the signing key — all attested. Re-derive the score from the same inputs and confirm. You don't trust us. You verify. v0 ships attested-EOA fallback; v1 (post-hackathon) is full Phala TDX.

**3. Mantle-native risk.** Multi-chain scorers treat Mantle as another EVM. We model what Mantle protocols actually depend on: mETH/cmETH depeg history, fBTC bridge attestation chain, MI4 Securitize+Fireblocks custody, sequencer uptime, route composition penalty. Same "Aave V3" but a *different* score on Mantle vs. Base — because the surrounding risk surfaces are different.

## Who uses it

- **Trading agents on Mantle** (RealClaw, Brahma, Giza ARMA, Hey Anon) → consume MBG's on-chain oracle, or install the [Byreal/OpenClaw Skill](./skills/mbg/). Surface our attestation hash to their users as proof of consultation.
- **Smart contract wallets / policy engines** → call `getProtocolScore` / `getRouteScore` directly as a pre-trade gate primitive (Brahma ConsoleKit pattern).
- **End users** → open [mbg-fe.vercel.app](https://mbg-fe.vercel.app), verify the attestation hash on Mantlescan independently.

## Repository layout

| Folder | Purpose |
|---|---|
| [`sc/`](./sc/) | Smart contracts — `RiskOracle` (Foundry) |
| [`be/`](./be/) | Scoring engine — data ingestion, base components, aggregation (Bun + TypeScript) |
| [`tee-worker/`](./tee-worker/) | Phala TDX worker — runs the scoring engine inside the enclave, signs attested scores, submits on-chain |
| [`skills/mbg/`](./skills/mbg/) | Byreal Skill — agent-callable CLI (`mbg-cli`) with on-chain reads |
| [`docs/`](./docs/) | Architecture diagrams, methodology deep-dives, RFCs |
| **Dashboard — separate repo:** [`mbg-fe`](https://github.com/YohanesVito/mbg-fe) | Next.js leaderboard / detail / route-checker. Extracted from this monorepo on 2026-05-16 to simplify Vercel deploys. |

## Getting started (local)

Requires [Bun](https://bun.sh), [Foundry](https://book.getfoundry.sh/getting-started/installation), and either Anvil or a Mantle Sepolia / Mainnet RPC.

```bash
# Install all workspaces
bun install

# Backend: score 13 Mantle protocols against live DefiLlama + Mantle RPC
cd be && bun run score

# Smart contracts: tests
cd sc && forge install foundry-rs/forge-std --no-git && forge test

# Skill: agent-style CLI
cd skills/mbg && bun run cli list-protocols
cd skills/mbg && bun run cli score-protocol aave-v3-mantle
```

The **dashboard** lives in a separate repo: [`YohanesVito/mbg-fe`](https://github.com/YohanesVito/mbg-fe) — clone and `bun install && bun run dev` there.

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

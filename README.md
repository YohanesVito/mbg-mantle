# MBG — Mantle Bot Gate

> **The only DeFi risk oracle where every score comes with a cryptographic receipt — so an AI agent that routes your money can't fake having considered the risk.**

**Live demo:** https://mbg-fe.vercel.app · **Contract (Mantle Sepolia):** [`0x58519569...0ae45`](https://sepolia.mantlescan.xyz/address/0x58519569c3D5C9a13dC0e8e7B6d2E123E2f0ae45#code)

## Why this exists

AI agents are moving real money in DeFi (RealClaw, Brahma, Hey Anon). They claim to consider risk before signing on your behalf — but you can't tell if they did. Every existing risk scorer (CertiK Skynet, Exponential.fi, DeFiSafety) lives behind a private API. To use them in an agent flow, you have to trust the company running the server, *and* trust the agent that says it consulted them. Two layers of "believe me bro."

MBG removes both. Every score is computed inside an Intel TDX enclave on Phala Cloud, signed inside the enclave, posted on-chain. The agent that consulted MBG carries an attestation hash that *anyone* — you, another contract, the next agent in the chain — can verify. "Believe me bro" becomes math.

## Three pillars

**1. Built for agents, not dashboards.** Callable from any contract via `getRouteScore(actions[])` in one view call. Or as a Byreal Skill (`mbg-cli`) for natural-language agents. The dashboard exists for *transparency*; the product is the on-chain oracle.

**2. Verifiable end-to-end.** The code that ran, the data it ate, the signing key — all attested. Re-derive the score from the same inputs and confirm. You don't trust us. You verify.

**3. Mantle-native risk.** Multi-chain scorers treat Mantle as another EVM. We model what Mantle protocols actually depend on: mETH/cmETH depeg history, fBTC bridge attestation chain, MI4 Securitize+Fireblocks custody, sequencer uptime, route composition penalty. Same "Aave V3" but a *different* score on Mantle vs. Base — because the surrounding risk surfaces are different.

## Who uses it

- **AI agents** (RealClaw, Brahma, Giza ARMA) → consume the on-chain oracle or install the [Byreal Skill](./skills/mbg/)
- **End users** → open [mbg-fe.vercel.app](https://mbg-fe.vercel.app), check the attestation hash on Mantlescan
- **Other dapps** → use `getProtocolScore` / `getRouteScore` as a pre-trade gate primitive

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

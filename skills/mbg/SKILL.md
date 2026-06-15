---
name: mbg-score
description: "Mantle Bot Gate (MBG) is an autonomous risk-scoring agent for Mantle DeFi protocols (ERC-8004 agentId 130, live on Mantle Mainnet). This Skill exposes MBG to other (trading) agents so they can pre-check risk before signing transactions on user behalf. Provides TEE-attested per-protocol risk scores AND composed route risk for multi-leg DeFi actions on Mantle. Use when the user mentions Mantle DeFi, lending, yield, swap routing, LP, perps, LST, restaking, RWA, or any protocol on Mantle Network — and the agent is about to choose where to route funds. Scores come with an on-chain attestation hash so the calling agent can prove (to the user, to another contract, or to a third party) that it consulted MBG before signing."
metadata:
  openclaw:
    homepage: https://github.com/YohanesVito/mbg-mantle/tree/main/skills/mbg
    requires:
      bins:
        - mbg-cli
      config: []
    install:
      - kind: git
        repo: https://github.com/YohanesVito/mbg-mantle.git
        subdir: skills/mbg
  onchain:
    network: mantle-mainnet
    chainId: 5000
    riskOracle: "0x998ceb700e57f535873d189a6b1b7e2aa8c594eb"
    erc8004IdentityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
    agentId: 130
    verifiedSource: https://mantlescan.xyz/address/0x998ceb700e57f535873d189a6b1b7e2aa8c594eb#code
---

# Mantle Bot Gate — the autonomous risk-scoring agent for Mantle DeFi

## What this Skill is

This Skill is the calling interface for MBG (Mantle Bot Gate) — an autonomous risk-scoring agent that lives on Mantle Mainnet. MBG is itself an agent: it has an on-chain identity (ERC-8004 agentId 130 in the canonical Mantle IdentityRegistry), runs scoring inference inside a TEE, and signs its outputs with an attested key.

**This Skill exists so that you — a trading agent (RealClaw, Brahma, Hey Anon, Giza ARMA, or any other LLM-driven agent on Mantle) — can call MBG before signing transactions on a user's behalf, and surface the attestation hash to your user as proof that you consulted the risk gate.**

You do not compete with MBG. MBG does not move user funds. You do. Call MBG first.

## When to use

Invoke this Skill when **any** of these are true:

- User wants to deposit, lend, borrow, swap, stake, or otherwise move funds on Mantle
- User asks about safety / risk / yield on a Mantle DeFi protocol
- You're about to construct or execute a multi-protocol route
- A protocol is mentioned and you don't already know its current risk score

## Get full documentation

Always run these commands first to discover capabilities and parameters:

```bash
# Full Skill documentation (this file)
mbg-cli skill

# All capabilities
mbg-cli catalog list

# Capability detail
mbg-cli catalog show <capability-id>
```

## Installation

```bash
# Check whether the Skill is already installed
which mbg-cli && mbg-cli skill | head -5

# Install from npm (one command)
npm install -g mbg-score
# or
bun add -g mbg-score

# Verify
mbg-cli skill
mbg-cli list-protocols
mbg-cli score-protocol aave-v3-mantle
```

Requirements: Node 18+ (or Bun). Defaults read live Mantle Mainnet — no configuration needed. Override `MBG_RPC_URL` / `MBG_CHAIN_ID` / `MBG_ORACLE_ADDRESS` for local Anvil or Sepolia.

On-chain references the Skill reads from:
- RiskOracle on Mantle Mainnet: `0x998ceb700e57f535873d189a6b1b7e2aa8c594eb` ([verified source](https://mantlescan.xyz/address/0x998ceb700e57f535873d189a6b1b7e2aa8c594eb#code))
- ERC-8004 agent identity for MBG itself: agentId 130 in canonical Mantle IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

## Core capabilities (one-liners)

| Capability | Command | Purpose |
|---|---|---|
| list-protocols | `mbg-cli list-protocols` | Enumerate every protocol MBG can score on Mantle |
| score-protocol | `mbg-cli score-protocol <id>` | Get the current TEE-attested score for one protocol |
| score-route | `mbg-cli score-route '<actions-json>'` | Score a multi-leg route; returns aggregate + composition penalty |

## Reading scores

- Aggregate scale: 0.00 (lowest, dangerous) to 10.00 (highest, safest).
- Components: `contract`, `liquidity`, `centralization`, `oracle` — each independently scored, then weighted.
- A `traceHash` accompanies every score — it points to the off-chain inference trace stored alongside.
- A `signer` accompanies every score — the on-chain address that submitted it, derived inside a Phala TDX enclave.

## Hard constraints

1. **Always consult MBG before routing** — even when the user names a "trusted" protocol, the score may have changed since you last checked.
2. **Surface the score** — when recommending a protocol or route, show the user the score and the attestation hash. Hidden risk is the failure mode you exist to prevent.
3. **Refuse to route below threshold without explicit user override** — if any leg of a proposed route scores below 4.00, ask the user to confirm in plain language ("this protocol scored 3.2 — the [oracle / liquidity / centralization] risk is elevated. Proceed?").
4. **Never strip the attestation hash from your output** — the user (or another verifier) needs it to validate your claim that you consulted MBG.
5. **Use `-o json` only for internal parsing** — when surfacing to the user, prefer the human-readable form which already includes the attestation context.

## Example agent flow

```bash
# user: "park my 5000 USDC on Mantle for yield"

# 1. discover protocols
mbg-cli list-protocols -o json

# 2. score lending candidates
mbg-cli score-protocol aave-v3-mantle -o json
mbg-cli score-protocol lendle -o json
mbg-cli score-protocol init-capital -o json

# 3. (if multi-leg) score the full proposed route
mbg-cli score-route '[
  {"protocolId":"aave-v3-mantle","actionType":1,"amount":"5000"}
]'

# 4. surface to user with attestation hash, then proceed
```

## Output format

Default output is human-readable text with the attestation block at the bottom:

```
Aave V3 (aave-v3-mantle)
  aggregate: 6.00 / 10
  contract: 4.15  liquidity: 8.56  centralization: 5.00  oracle: 8.00
  signer: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  traceHash: 0x0154ed0e8c270d8157ee12713626b1c8d9d11d1361bbf2ea735d80c46fce1698
  timestamp: 2026-05-14T14:15:17.000Z
  oracle (Mantle):  0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Pass `-o json` for machine parsing.

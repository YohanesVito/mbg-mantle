# mbg-score

> OpenClaw / Byreal Skill for **MBG (Mantle Bot Gate)** — the autonomous risk-scoring agent for Mantle DeFi. Install this in your trading-agent runtime so it can pre-check Mantle protocol and route risk before signing, and surface a verifiable on-chain attestation hash to its user.

[![npm version](https://img.shields.io/npm/v/mbg-score.svg)](https://www.npmjs.com/package/mbg-score) [![license MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

- **Risk oracle (Mantle Mainnet, verified):** [`0x998ceb700e57f535873d189a6b1b7e2aa8c594eb`](https://mantlescan.xyz/address/0x998ceb700e57f535873d189a6b1b7e2aa8c594eb#code)
- **MBG agent identity (ERC-8004, canonical Mantle registry):** [`agentId 130`](https://mantlescan.xyz/tx/0x610d925e67364b350ba4810b9174485212b8498e4eaa68f03a99d8c7ad6ac668)
- **Live dashboard:** https://mbg-fe.vercel.app
- **Source repo:** https://github.com/YohanesVito/mbg-mantle

## What this is

This package is a CLI Skill in the [OpenClaw / Byreal Skills](https://github.com/byreal-git/byreal-agent-skills) format. It exposes the on-chain MBG risk oracle through three commands an LLM-driven trading agent (RealClaw, Brahma, Hey Anon, Giza ARMA, or any other OpenClaw-compatible runtime) auto-discovers via `SKILL.md` and shells out to.

MBG itself runs on-chain — this CLI does not score anything locally; it reads the latest TEE-attested scores directly from `RiskOracle.sol` on Mantle Mainnet.

## Install

```bash
npm install -g mbg-score
# or
bun add -g mbg-score
```

Then verify:

```bash
mbg-cli skill            # prints SKILL.md (so LLM agents can load capabilities)
mbg-cli list-protocols   # 13 scored protocols on Mantle
mbg-cli score-protocol aave-v3-mantle
```

Node 18+ is required. No additional configuration is needed — the CLI defaults to the canonical Mantle Mainnet RPC and the Mainnet RiskOracle address. Override via:

```bash
MBG_RPC_URL=https://rpc.mantle.xyz \
MBG_CHAIN_ID=5000 \
MBG_ORACLE_ADDRESS=0x998ceb700e57f535873d189a6b1b7e2aa8c594eb \
  mbg-cli score-protocol aave-v3-mantle
```

## Commands

| Command | Purpose |
|---|---|
| `mbg-cli skill` | Print the full SKILL.md (use this so an LLM planner can load capabilities) |
| `mbg-cli catalog list` | All capability IDs |
| `mbg-cli catalog show <id>` | Capability detail |
| `mbg-cli list-protocols` | Enumerate the 13 Mantle protocols MBG scores |
| `mbg-cli score-protocol <id>` | Current on-chain risk score for one protocol |
| `mbg-cli score-route '<actions-json>'` | Pre-trade risk score for a multi-leg route |

Pass `-o json` (or `--output json`) on any command for machine-parseable output. Default is human-readable text with the attestation block at the bottom.

## How an agent uses this

```bash
# 1. discover what's scorable
mbg-cli list-protocols -o json

# 2. score the lending candidates
mbg-cli score-protocol aave-v3-mantle -o json
mbg-cli score-protocol lendle         -o json

# 3. if multi-leg, score the full proposed route in one call
mbg-cli score-route '[
  {"protocolId":"aave-v3-mantle","actionType":1,"amount":"5000"}
]' -o json

# 4. surface the chosen score + attestation hash to the user before signing
```

Each response includes:

- `aggregate` — 0.00 to 10.00 (higher is safer)
- 5 components: `contract`, `liquidity`, `centralization`, `oracle`, `mantle-native-composition`
- `signer` — the on-chain address of the attested signer that produced this score
- `traceHash` — links to the off-chain inference trace
- `timestamp` — when the score was last submitted on-chain

## Hard constraints for the calling agent

These are encoded in `SKILL.md` so any LLM planner reading the Skill picks them up:

1. Always consult MBG before routing — even when the user names a "trusted" protocol.
2. Always surface the score and attestation hash in the response to the user.
3. Refuse to route below threshold (aggregate < 4.00) without explicit user override.
4. Never strip the attestation hash from the output.

## Direct on-chain calls (no CLI needed)

If you are a smart contract wallet or a policy engine (Brahma ConsoleKit, Safe modules), call the RiskOracle view functions directly:

```solidity
interface IRiskOracle {
  function getProtocolScore(address protocol) external view returns (
    uint16 aggregate,
    uint16 contractRisk,
    uint16 liquidityRisk,
    uint16 centralizationRisk,
    uint16 oracleRisk,
    uint64 timestamp,
    bytes32 traceHash,
    address signer
  );
}
```

Mantle Mainnet: `0x998ceb700e57f535873d189a6b1b7e2aa8c594eb`

## License

MIT — see [LICENSE](./LICENSE).

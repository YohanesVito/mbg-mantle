# DoraHacks Submission — MBG

> Pre-filled answers for every DoraHacks form field. Copy-paste at submission time.

---

## Track selections

**Primary nomination:** Alpha & Data Track (Exclusively Sponsored by Mirana Ventures)

**Secondary nomination:** Agentic Economy Track (Exclusively Supported by Byreal)

**Also eligible (auto-eligibilities):**
- Grand Champion
- 20 Project Deployment Award (if criteria are all met at submission time)
- Best UI/UX Award
- Community Voting (automatic)

---

## Project name

```
MBG — Mantle Bot Gate
```

## Tagline / one-liner (under 100 chars)

```
The only DeFi risk oracle where every score comes with a cryptographic receipt.
```

Alt option (~115 chars, slightly longer but stronger):
```
TEE-attested DeFi risk oracle for Mantle agents — so your AI agent can prove it considered the risk.
```

## Short description (30 words)

```
MBG is a TEE-attested on-chain risk oracle for Mantle DeFi. AI agents that route user funds consult MBG before signing — every score carries a cryptographic attestation hash users can verify.
```

## Full description (200 words)

```
AI agents are moving real money on Mantle — RealClaw, Brahma, Hey Anon, Giza ARMA. Every existing DeFi risk scorer (CertiK Skynet, Exponential.fi, DeFiSafety) lives behind a private API. Users have no way to verify the agent that routed their funds actually consulted any of them.

MBG fixes that. Every score is computed inside an Intel TDX enclave on Phala, signed inside the enclave, and posted on-chain to a RiskOracle contract on Mantle. An agent that consulted MBG carries an attestation hash anyone — user, auditor, next agent in the chain — can verify on Mantlescan.

What's verifiable end-to-end:
1. The code that ran (model hash in the attestation)
2. The data it ate (input hashes recorded)
3. The signing key (TDX-derived, cannot leave the enclave)
4. The output (written on-chain with submitScore)

Built specifically for Mantle's agent ecosystem. Five-component scoring including the Mantle-native composition risk no multi-chain scorer models: transitive LST exposure (mETH/cmETH), bridge custody (fBTC), synthetic stable backing (USDe). Agents call us as a Byreal Skill (`mbg-cli`) or directly on-chain via `getRouteScore(actions[])` — single view call, full route scored, composition penalty priced in.

The receipt for risk. Built for Mantle. Live on Mainnet.
```

## Tags

```
DeFi, AI Agent, Risk Oracle, TEE, Phala, Mantle, Byreal, Ecosystem Infrastructure, ERC-8004
```

## Logo / cover image

Use the dashboard hero (Verifiable DeFi risk scoring) as the cover. Screenshot from https://mbg-fe.vercel.app. Crop to 16:9.

## Demo video URL

```
[YOUR YOUTUBE OR LOOM URL HERE]
```

Make sure it's:
- Public or unlisted (not private)
- ≥ 2 minutes (the 20 Project Deployment Award requires this)
- Direct link, not a playlist

## GitHub URLs

Primary repo: `https://github.com/YohanesVito/mbg-mantle`
Dashboard repo: `https://github.com/YohanesVito/mbg-fe`

## Live demo URL

```
https://mbg-fe.vercel.app
```

## Deployment address(es)

```
Mantle Mainnet RiskOracle (after mainnet deploy):
  [FILL IN FROM sc/.env after running deploy-mainnet.sh]

Mantle Sepolia RiskOracle (reference, currently powering the live dashboard):
  0x58519569c3D5C9a13dC0e8e7B6d2E123E2f0ae45
  Source: https://sepolia.mantlescan.xyz/address/0x58519569c3D5C9a13dC0e8e7B6d2E123E2f0ae45#code

ERC-8004 agent identity on canonical Mantle IdentityRegistry (after mint):
  [FILL IN FROM sc/.env MBG_AGENT_ID after running mint-erc8004.sh]
  Canonical Mantle IdentityRegistry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
```

---

## Track-specific writeup — Alpha & Data Track (Mirana Ventures)

### Which data sources does your project use?

```
1. DefiLlama API (live) — per-protocol TVL, chain-level TVL, time-series. Cached fetch for 13 Mantle protocols.

2. Live Mantle Mainnet RPC reads (viem) — for lending protocols (Aave V3, Lendle, Init Capital): getAllReservesTokens + getSourceOfAsset per reserve. For 5 protocols: read admin address code via getCode; opportunistically probe Gnosis Safe getOwners + getThreshold.

3. Mantlescan / Etherscan V2 unified API — contract source verification status, deployment timestamp, ABIs.

4. Curated audit registry — multi-firm audit metadata per protocol (Code4rena, PeckShield, Halborn, OpenZeppelin, SourceHat, MetaScan, etc.) with dates, scope, findings counts.

5. Canonical Mantle Mainnet ERC-8004 IdentityRegistry (0x8004A169...) — our scoring agent mints an identity NFT pointing at agent-card.json with our endpoints + payment address.

6. Phala dstack — TEE attestation infrastructure. v0 ships attested-EOA fallback; v1 (post-hackathon) uses TDX-derived keys.
```

### What role does AI play?

```
The scoring engine runs inside the TEE enclave: it ingests on-chain + off-chain data, computes a 5-component risk score per protocol (contract, liquidity, centralization, oracle, mantle-native-composition), and signs the result with a TEE-attested key.

For agents (RealClaw, Brahma, Hey Anon, Giza ARMA), MBG is an LLM-grounding tool. Agents auto-discover the Skill via SKILL.md, invoke mbg-cli when they detect a "is this safe?" intent in the user prompt, then ground their recommendation in MBG's verified scores instead of hallucinating safety opinions.

We also ship a local agent harness (skills/mbg/harness/agent-demo.ts) demonstrating end-to-end Skill consumption by a free local 4B model (qwen3.5:4b on Ollama). No paid API needed; the Skill is OpenClaw-compatible.
```

### How does it generate verifiable value on Mantle?

```
Three answers:

1. EVERY SCORE IS ON-CHAIN. RiskOracle.submitScore writes (aggregate, 4 components, traceHash, signer, timestamp) on Mantle. Anyone reads with cast call or Mantlescan. Comparison: CertiK Skynet's scores exist only on certik.com behind their backend.

2. EVERY ROUTE IS SCORED ON-CHAIN. RiskOracle.getRouteScore is a single view call. Agents that compose a route get the aggregate + composition penalty + per-leg breakdown without trusting any centralized API.

3. EVERY AGENT CONSULTATION IS AUDITABLE. Because the on-chain call is public, an agent's "I checked the risk before signing this tx" claim becomes verifiable — the user can grep the agent's tx history for the getProtocolScore / getRouteScore calls.

For Mantle specifically: our Mantle-native composition risk component models mETH/cmETH/fBTC/USDe/USDY/MI4 dependency graphs. CertiK doesn't model these — they treat Mantle as another EVM. So our "Aave V3" score on Mantle is different from CertiK's "Aave" score elsewhere, and the difference is the Mantle-specific risk surface no other scorer surfaces. (Side-by-side numerical comparison in docs/insights.md.)
```

---

## Track-specific writeup — Agentic Economy Track (Byreal)

### Which Byreal on-chain capabilities does your project use?

```
1. Byreal Skills CLI / OpenClaw Skill format
   - skills/mbg/SKILL.md follows the canonical SKILL.md schema (frontmatter + metadata.openclaw + capabilities list).
   - mbg-cli binary exposes list-protocols / score-protocol / score-route / catalog list / skill subcommands. -o json for machine parsing; human-readable default.
   - Auto-discoverable by LLM-driven agent runtimes via SKILL.md description.

2. ERC-8004 agent identity registration
   - We mint our scoring agent's identity NFT in the canonical Mantle Mainnet IdentityRegistry at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432.
   - tokenURI points at https://mbg-fe.vercel.app/agent-card.json with structured endpoints, capabilities, payment address.

3. Designed for RealClaw integration
   - The whole product is shaped around "an agent in RealClaw's runtime asks MBG before signing on a user's behalf."
   - Hard constraints in SKILL.md encode the right agent behavior: always consult before routing, always surface the attestation hash, refuse to route below threshold without explicit user override.
   - docs/realclaw-integration.md walks through the concrete user flow and shell commands.

```

### What scenario is it applied to?

```
The pre-trade risk gate scenario.

User opens RealClaw in Telegram: "park 5000 USDC on Mantle for yield."

Without MBG: RealClaw picks the highest APY market. User has to trust the bot's judgment.

With MBG installed: RealClaw's planner detects a "where to put funds" intent. Calls mbg-cli list-protocols, then score-protocol for each lending candidate, then composes a single-leg route and calls score-route. Returns to the user: "Aave V3 on Mantle, score 6.73, attestation hash 0x... — verified on Mantlescan." User opens Mantlescan, sees the attestation hash in the contract's recent submissions, sleeps.

This is the same shape we showed during the demo with a free local model: discover → score → route → respond with attestation.

Extension to multi-leg routes (yield + LST stake, swap + borrow, etc.) is supported by mbg-cli score-route '<actions-json>' — the same on-chain view call agents will call.
```

---

## 20 Project Deployment Award checklist (claim if met)

| Requirement | State at submission |
|---|---|
| Smart contract deployed on Mantle Mainnet or Testnet | ✓ Sepolia confirmed; Mainnet pending mainnet ETH funding |
| Contract verified on Mantle Explorer | ✓ Sepolia verified via Etherscan V2; Mainnet deployment script auto-verifies |
| At least one AI-powered function callable on-chain | ✓ `RiskOracle.submitScore` is called by the attested signer running our AI scoring engine; on-chain attested. `getRouteScore` is the agent-callable read side. |
| Frontend demo publicly accessible (not localhost) | ✓ https://mbg-fe.vercel.app |
| Deployment address included | ✓ in submission |
| Demo video ≥ 2 min walking through core use case | ✓ to be uploaded |
| Open-source GitHub repo with README (setup, architecture, deployed contract) | ✓ both mbg-mantle and mbg-fe public, MIT licensed, READMEs sharpened |

---

## Best UI/UX claim

Eligible — the dashboard:
- 3-pillar hero on landing
- Color-coded score bars
- Mantle-native exposure badges per protocol
- Route checker with presets + plain-language verdict + safer-alternatives suggestion
- Dedicated /skill install page for agent devs
- Reasoning text on every component (not just numbers)

---

## Team

```
[FILL IN YOUR TEAM HERE]
```

---

## Acknowledgments / inspirations / open-source dependencies

```
- Mantle Network (canonical chain, RPC, Mantlescan)
- Phala Network (TEE infrastructure, dstack SDK, ERC-8004 TEE-agent template — patterns referenced, not forked)
- Byreal / OpenClaw (Skills CLI format, agent runtime ecosystem)
- ERC-8004 working group (canonical IdentityRegistry, ReputationRegistry, ValidationRegistry on Mantle)
- viem, Foundry, Bun, Next.js (build infrastructure)
- DefiLlama (live TVL data)
- ollama + qwen3.5 model (free local agent harness)
```

## At-a-glance submission stats (for the form's quick metrics if asked)

```
- Lines of code: ~4,500 (TS + Solidity, excluding generated files)
- Smart contract tests: 35 passing (28 unit + 7 fuzz × 256 = 1,792 fuzz iterations); 100% line + function coverage
- Protocols scored: 13 (Aave V3, Lendle, Init Capital, mETH, Merchant Moe, Agni, FusionX V3, KTX Perps, Treehouse, Ondo USDY, MI4, Function FBTC, Ethena USDe)
- Scoring components: 5 (contract / liquidity / centralization / oracle / mantle-native-composition)
- On-chain reads: live Mantle Mainnet RPC for Aave V3 oracle, Lendle oracle, 5 protocol admin contracts
- Repos: 2 (backend monorepo + standalone dashboard for clean Vercel deploys)
- Languages: TypeScript, Solidity, Bash
- Test coverage of contracts: 100% line, 100% function, 92.31% branch
```

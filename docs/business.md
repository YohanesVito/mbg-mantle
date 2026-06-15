# MBG — business model, GTM, defensibility

> The receipt-for-risk thesis, written for Mirana Ventures judging at the Mantle Turing Test Hackathon 2026.

---

## 1. The problem we solve

AI agents are moving real money in Mantle DeFi today — RealClaw (Bybit-incubated, Telegram-distributed), Brahma (smart-account execution), Hey Anon (NL-to-DeFi), Giza ARMA (stablecoin yield optimizer). Two-sided trust problem:

| User trust | Agent trust |
|---|---|
| "Did the agent consider risk before signing?" | "Which risk inputs are reliable enough to bet a user's funds on?" |

Every existing DeFi risk scorer — CertiK Skynet (the leader), Exponential.fi (data partner to DefiLlama), DeFiSafety, Hacken YRS — lives **behind a private API on a centralized server**. To use any of them inside an agent workflow, the user has to trust:

1. The scorer's server isn't compromised, biased, or paid
2. The scorer's model hasn't been silently changed
3. The agent actually consulted it (rather than skipping risk and saying it didn't)

That's **three layers of "believe me bro."** It is incompatible with the agent-economy thesis Mantle and Byreal are betting on.

## 2. The product (in one sentence)

> **MBG is the autonomous risk-scoring agent for the Mantle agent economy — TEE-attested, on-chain-identity-registered, and consumable by every trading agent on Mantle as a Byreal Skill or a single on-chain view call.**

Concretely:

- MBG is **itself an agent**, not just a service: ERC-8004 identity #130 in the canonical Mantle Mainnet IdentityRegistry; autonomous inference loop inside a TEE; signed outputs written on-chain. It belongs in the agent economy alongside the trading agents (RealClaw, Brahma, Giza ARMA, Hey Anon) — as the producer of the verifiable safety signal those trading agents consume.
- Every score is computed inside an Intel TDX enclave (Phala dstack), signed with a key derived inside the enclave, written on-chain to `RiskOracle.sol` at `0x998ceb70…594eb` on Mantle Mainnet. (v0 ships attested-EOA fallback while we migrate to full Phala TDX post-hackathon — see Section 7 on defensibility for the migration plan.)
- A trading agent that consulted MBG carries the attestation hash in its response to the user. The user (or another verifier, or the next agent in the chain) re-derives the score from on-chain inputs and confirms.
- Three interfaces today: on-chain `getProtocolScore` / `getRouteScore` view calls (for smart contract wallets and policy engines), Byreal/OpenClaw `mbg-cli` Skill (for LLM-driven trading agents), REST wrapper (for non-Node runtimes).

## 3. Market sizing — agents on Mantle

| Metric | Q2 2026 | 2027 outlook |
|---|---|---|
| Mantle DeFi TVL | ~$1.5B | ~$5B (Aave V3 trajectory + RWA inflow) |
| Estimated agent-routed share | <2% (early) | 8–15% (RealClaw/Brahma/agent expansion) |
| Annual agent-routed flow | ~$240M | ~$3B |
| MBG pricing on serviceable share | $0 (free tier) → $30–100/agent/mo paid | $1M ARR achievable at 100 paid agents |

These numbers are deliberately conservative. They are realistic if Mantle's agent thesis is even partially right, not if we have to build a new market.

## 4. Revenue model — three tiers, one moat

| Tier | Customer | What they pay for | Pricing |
|---|---|---|---|
| **Open** | Public dashboard users, retail | Free reads of on-chain `RiskOracle`. Same attestation hashes as paid tiers. | $0 — open public good. |
| **Agent SaaS** | Independent agent developers (RealClaw skills, Brahma policies, Hey Anon tools) | Hosted API with rate-limited score reads, batch scoring, push-notifications on score changes, SLA. Lets agents scale without each running their own viem reads. | $30/agent/mo (small) → $200 (heavy, batch routes, alerts). |
| **Enterprise** | Yield platforms, large agent fleets, on-chain insurance protocols (Nexus, OpenCover) | Custom risk feeds, custom scoring weights, direct line to MBG ops for incidents. SLA-backed. Risk-aware lending param proposals as a service to Aave V3 / Lendle governance. | Annual contract, $20–60K/yr. |

The moat is the **attestation hash**: every additional agent that consults MBG strengthens the network effect, because each consultation is a public on-chain event that the next user/auditor can reference. Agents that don't consult MBG look unverifiable by comparison.

### 4.1 Unit economics

The product is *cheap to run per score* and *expensive to fork the trust around*. Numbers below are conservative (built-in slack) and grounded in Mantle/Phala/RPC prices as of 2026-06.

| Line item | Cost per unit | Frequency at steady-state | Monthly cost |
|---|---|---|---|
| Mantle Mainnet RPC reads per protocol score | ~10 calls × <$0.000001 (free tier + paid backup) | 13 protocols × refresh hourly = 312/day | <$5/mo |
| Phala TDX attestation per score | ~$0.01–0.02 (Phala dstack v1, post-migration) | 312/day | ~$100–150/mo |
| Gas to `submitScore` on Mantle Mainnet | ~$0.001/tx (Mantle is cheap; observed) | 312/day | ~$10/mo |
| DefiLlama API + Etherscan V2 API | free tiers cover 13 protocols | continuous | $0 |
| Hosted dashboard + Skill REST wrapper (Vercel + serverless) | small Hobby/Pro tier | continuous | ~$20/mo |
| **Total infra at 13 protocols, hourly refresh** | | | **~$140–185/mo** |

| Tier | List price | Gross margin per customer | Break-even paid customers |
|---|---|---|---|
| Agent SaaS (avg blended) | $80/agent/mo | ~85% (most cost is fixed infra above) | 3 paid agents covers infra |
| Enterprise | $40K/yr ARR avg | ~90% (custom feed = minor infra delta) | 1 enterprise contract = profitable Y1 |

The shape is classic infra SaaS: low marginal cost per score, defensible attestation moat, and **break-even is single-digit paid customers**. Scaling to 50–100 protocols across multiple chains multiplies infra to ~$1K–2K/mo, still trivial relative to ARR.

## 5. Go-to-market — three phases

### Phase 1 — Right after hackathon (Weeks 1–4)

- **Mainnet deploy** of `RiskOracle.sol` and migration of 13-protocol scoring pipeline.
- **Publish the Skill on ClawHub** (`clawhub skill publish ./skills/mbg`) — instant distribution into every OpenClaw agent.
- **Pitch RealClaw integration** to Byreal. Skill is already in their format; concrete on-chain attestation is the differentiator.
- Onboard 2 paid pilot agents (target: a Telegram-based RealClaw skill + a Brahma user-facing yield bot).

### Phase 2 — Expansion (Months 2–4)

- **Cross-deploy to Base, Mode, BNB Greenfield** — the on-chain attestation model is chain-agnostic; per-chain "native composition risk" is what travels.
- **Open the curator program** — protocols pay to register canonical admin + audit metadata in the registry (with disclosure flag). Solves our data-curation cost problem and creates a revenue line.
- **API partnerships** — agent platforms ship MBG as a default risk input. Co-branded "MBG-attested" badge on agent UI.

### Phase 3 — Risk oracle as a primitive (Months 5–9)

- **Insurance pricing** — Nexus Mutual, Sherlock, OpenCover use MBG scores as a pricing input. Direct revenue from cover protocols.
- **Lending parameter input** — propose Aave Risk DAO accept MBG composition risk as one signal in parameter votes (alongside Gauntlet, Llama Risk).
- **Reputational risk-as-data** — sell historical score time-series to hedge funds, market makers, on-chain risk teams. ARR scales with chain TVL covered.

## 6. Named partnerships (already in conversation or trivially in scope)

- **Byreal / RealClaw** — Skill is in their format, ClawHub publish places us in their catalog. Byreal is sponsor of the Agentic Economy track.
- **Phala Network** — TEE infra partner. $400 Mantle builder credits already advertised. Migration path from attested-EOA fallback to full Phala TDX is documented.
- **Mantle Foundation** — ecosystem grant target. MBG's "Mantle-native composition risk" is a category nobody else fills.
- **Chainlink + Pyth + API3** — upstream price oracle data; we cite them honestly in scoring reasoning.
- **Animoca Brands / Open Check** (Consumer Viral track sponsors) — strong dashboard + Skill catalog presence positions MBG as the safety layer behind their consumer agents.

## 7. Defensibility / moat

| Moat layer | Why it compounds |
|---|---|
| **On-chain attestation network effect** | Every agent consultation writes a public event. Agents that consult MBG become more verifiable; agents that don't become less. The market converges on MBG by user pressure, not because we lock anyone in. |
| **Mantle-native risk data** | We've built per-protocol LST/bridge/stablecoin exposure modeling that global scorers do not. CertiK treats Mantle as just another EVM; we model Mantle-specific dependency graphs. As more RWA/LST infra ships on Mantle (mETH, cmETH, fBTC, MI4, USDY, USDe), the data gap widens, not closes. |
| **TEE attestation chain** | Real TDX-derived signing keys, ERC-8004 identity NFT in the canonical Mantle registry (`0x8004A169...`). Forking is easy; reproducing trust takes attestation history. |
| **Distribution via npm + Skills CLI** | One install command (`npm install -g mbg-score`) lands us in every Node-based agent runtime; `npx skills add mbg-score` lands us in every OpenClaw agent. The Skill is open-source; the curated registry + the running TEE worker are not trivially forkable. |

### 7.1 Risk register — what could kill this

We list the things we think *could* kill the business, ordered by severity, with our current mitigation. We are not in denial about any of them.

| Risk | Why it could kill us | Current mitigation | Residual risk |
|---|---|---|---|
| **Regulatory — risk score as investment advice** | If US SEC reclassifies attested DeFi risk signals as "investment advice" the per-tier API model becomes a securities-adjacent service. | (a) MBG is non-prescriptive — outputs are descriptive risk components, not buy/sell. (b) Open public reads stay free regardless. (c) Enterprise contracts route through the customer's compliance, not ours. | Medium. Regulation will shift; we ship in jurisdictions where outputs remain descriptive data. |
| **TEE vendor concentration** | We currently depend on Phala dstack. If Phala goes down, raises prices, or changes attestation semantics, our v1 attestation chain breaks. | (a) v0 ships attested-EOA fallback that survives Phala outage. (b) ERC-8004 identity is portable — same agentId can migrate to a different TEE substrate (Intel TDX is industry standard, not Phala-specific). (c) Phala builder credits + ecosystem partnership reduce vendor lock fears. | Low–medium. Mitigated by attestation portability. |
| **Competitor pivot — CertiK / Exponential ship on-chain attestation** | Both have brand and capital. If they ship attestation in 9–12 months, our defensibility collapses to Mantle-native data alone. | (a) Network-effect lead: every agent that consults MBG today widens the attestation history they cannot replicate. (b) Mantle-native composition modeling is data, not a feature — replicating it requires understanding the Mantle dependency graph as deeply as we do. (c) Skill format distribution moves faster than enterprise SaaS sales cycles. | Real. Time to PMF is the answer; we estimate 9–12 months before the moat is sticky. |
| **Market timing — agent economy adoption slows** | If RealClaw/Brahma/Hey Anon/Giza ARMA growth stalls in 2026, the consumer side of our Agent SaaS revenue stalls with them. | (a) Enterprise tier (insurance pricing, lending parameter input) is independent of agent-economy growth — banks and DAOs are the customer there. (b) Open public good usage keeps brand alive regardless. (c) Our infra cost at 13 protocols is <$200/mo — we can survive long. | Medium. Decoupled enterprise revenue is the hedge. |
| **Smart contract risk — RiskOracle exploit** | RiskOracle uses access control for signer. Compromise of the attested EOA (v0) or TDX key (v1) lets attacker post fake scores. | (a) 100% line + function test coverage with Foundry (35 passing). (b) v0 EOA is a hot key with limited blast radius (cannot mint, cannot withdraw funds). (c) v1 TDX key is non-exportable — cannot leak even on host compromise. (d) Optional ERC-8004 ValidationRegistry for slashing post-attack. | Low. Bounded by access control + TEE properties. |
| **Capital — no signed funding** | Bootstrapping past Phase 1 with one founder is real-world hard. Without grant or seed by month 3, runway pressure starts. | (a) Phala builder credits + Mantle Foundation grant target = 6 months of compute covered. (b) Cost structure (<$200/mo infra) makes self-funded survival realistic. (c) Hackathon prize pool is real near-term liquidity. | Real. Standard early-stage capital risk. |

## 8. Tokenomics — deliberately deferred

We have not designed a token. **Honesty here matters more than narrative.** Adding a token before product-market fit forces premature decisions about distribution, regulatory risk, and incentive alignment.

If/when a token makes sense (post-Mainnet, post-PMF — Year 2):

- **Staked attestation operators** — token-staked operators run TEE workers and earn rewards for valid attestations; lose stake on provable misbehavior. Mirrors Chainlink's economic security model.
- **Governance** — protocols voting on scoring weight changes, dispute resolution, ecosystem grants.
- **Fee discount** — paying for the Agent SaaS or Enterprise tier in MBG token discounts the bill.

For the hackathon submission: **no token, real revenue from real services**. This is a feature, not a gap.

## 9. Why now

- DeFAI is exploding (Hey Anon, RealClaw, Brahma, Giza ARMA, Mode AI, Olas — all 2025).
- Mantle just landed Aave V3 ($290M TVL in 12 days) — DeFi is getting institutional-quality on Mantle.
- RWA tokenization is accelerating on Mantle (MI4 launched April 2026, USDY available, USDe used widely).
- ERC-8004 (agent identity standard) deployed on Mantle in February 2026 — the verifiable-agent stack is ready for the first risk-oracle integration. We are that integration.
- Phala on Mantle (since April 2025) makes TEE compute commodity-priced. The infrastructure dependencies are mature.

## 10. Post-hackathon roadmap (12 weeks)

| Week | Milestone |
|---|---|
| 1 | Mainnet deploy + ERC-8004 mint + ClawHub publish |
| 2 | Phala dstack real-TEE attestation (replacing EOA fallback) |
| 3 | Init Capital API3 oracle reader + 5 more admin addresses curated |
| 4 | First paid pilot agent (RealClaw skill integration) |
| 5 | CertiK / Exponential / DeFiSafety as official ingested data sources |
| 6 | Base + Mode deployments — multi-chain |
| 8 | Curator-pays-to-register flow (protocols self-report admin/audits) |
| 10 | First enterprise contract (yield platform or insurance protocol) |
| 12 | Public ops dashboard for institutional users + risk webhooks |

## 11. Competitive landscape — honest

| Competitor | Strength | Why we win | Why they might win |
|---|---|---|---|
| **CertiK Skynet** | 4-yr history, 17K+ projects, brand | On-chain verifiability, Mantle-native modeling, agent-callable | If they bolt on attestation; they have more capital |
| **Exponential.fi** | DefiLlama integration, 1000+ pools | Same off-chain trust problem | If they pivot to on-chain attestation faster |
| **DeFiSafety** | Process Quality Reviews since 2020 | Manual, slow, non-agent-native | They probably don't pivot |
| **Gauntlet** | Aave parameter simulation gold standard | Different layer — protocol risk vs parameter risk | They might build a per-protocol public score (low probability) |
| **Chaos Labs** | AI risk model in Kraken Vaults | Less public coverage, more institutional | Their Chaos AI is a real adjacent threat |

The clearest defensible position: **on-chain verifiability + Mantle-native modeling + agent-distribution surface**. None of the incumbents have all three; pivoting takes them 12+ months. We have 12 months to grow the network effect.

## 12. The honest single sentence

> The Mantle agent economy needs both shapes of agent — agents that move funds, and agents that produce verifiable safety signals those movers can prove they consulted. We are the second shape. We are not the agent your money goes to; we are the agent your trading agent has to call first.

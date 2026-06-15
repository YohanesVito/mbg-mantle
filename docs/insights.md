# What MBG Surfaces That CertiK Skynet Does Not

**Audience:** Alpha & Data track judges (Mirana Ventures). **Date:** 2026-06-14.
**Subject:** A head-to-head insight comparison between the Mantle Bot Gate (MBG) on-chain risk oracle and CertiK Skynet, the dominant incumbent DeFi risk scorer.

MBG lives at https://mbg-fe.vercel.app. CertiK's Mantle vertical lives at https://skynet.certik.com/projects/mantle-network. CertiK scores on a 0-100 scale across six categories — Code Security, Fundamental Health, Operational Resilience, Governance Strength, Market Stability, Community Trust (see https://skynet.certik.com/skynet-score-methodology). MBG scores on a 0-10 scale across five components, the fifth of which — **Mantle-Native Composition Risk** — has no Skynet analog.

## Side-by-side: same protocols, different lenses

| Protocol | MBG (0-10) | CertiK Skynet (0-100) | What MBG sees that CertiK does not |
|---|---|---|---|
| Aave V3 (Mantle) | 6.73 | 94.48 / AAA (token-level "Aave", Ethereum-centric) | Mantle-specific oracle topology: 10 reserves, 9 unique Chainlink feeds; LST exposure via mETH + cmETH; stablecoin exposure via USDe |
| mETH Protocol | 6.72 | "Mantle LSP" page exists; CertiK explicitly notes "not audited by CertiK" and data is third-party (https://skynet.certik.com/projects/mantle-lsp) | Programmatic detection that mETH is the LST *source* — no transitive deps — earning 9.5 on composition |
| Ethena USDe | 6.41 | 88.92 / AA (https://skynet.certik.com/projects/ethena) | Off-chain governance categorized as "stablecoin custody chain", scored 5.0 with reasoning — not penalized as if it were a lending admin |
| Merchant Moe | 6.39 | Listed (https://skynet.certik.com/projects/merchant-moe), score not surfaced in public summary | Real 3-of-5 Gnosis Safe detected on-chain (signers + threshold programmatically read) |
| Ondo USDY | 5.84 | Ondo Finance: 93.58 / AAA (token-level, RWA leaderboard #3) | USDY treated as RWA custody-chain primitive; bridge/issuer risk surfaced as a discrete component |
| Lendle | 6.08 | No public Skynet score located | Oracle component flagged "pristine": 11 reserves / 11 unique feeds (no shared-feed correlation) — even though admin is a custom contract |
| Init Capital | 5.79 | Listed (https://skynet.certik.com/projects/init-capital), score not surfaced in public summary | Admin pattern identified as `ACCESS_CONTROL_MANAGER`; oracle pattern flagged API3 (non-Chainlink) |
| Function FBTC, MI4, Treehouse, Agni, FusionX V3, KTX Perps | 5.55 / 5.46 / 6.28 / 5.02 / 4.99 / 4.91 | No Skynet score located via public search | All five components computed per-protocol on Mantle, including composition |

> Note: where CertiK has a score it is for the *token/parent* (Aave, Ondo Finance, Ethena), not the Mantle deployment specifically. CertiK treats Mantle as just another EVM target; MBG was built for it.

## Four insights MBG surfaces that CertiK does not

1. **On-chain verifiable attestation.** Every MBG score ships with a TEE attestation hash that any contract or agent can re-derive against the signer pubkey. CertiK's score is rendered server-side on skynet.certik.com — it cannot be checked by a smart contract, only trusted. Concretely: Aave V3's 6.73 was produced inside a TDX enclave whose measurement is publishable; CertiK's 94.48 is a number on a webpage.
2. **Mantle-native composition risk.** MBG has a fifth scoring axis that walks the transitive dependency graph on Mantle. Aave V3 is penalized for accepting mETH (LST) + cmETH (LST) + USDe (synthetic stable) as collateral; MI4 lands at 5.46 because its index basket spans LST + stable + bridge primitives. mETH Protocol gets 9.5 on this axis because it IS the LST source and has no transitive deps. CertiK's six categories do not contain a composition or collateral-graph signal — Aave's 94.48 is the same number whether it lists ETH or a triple-rehypothecated synthetic.
3. **Category-aware off-chain governance.** When MBG sees no admin keys on-chain (Ethena USDe, Ondo USDY, Function FBTC) it does not default to "centralization unknown = low score". It classifies the primitive — stablecoin custody chain, RWA issuer, bridge custody — and assigns a category-specific component score (USDe 5.0, USDY similar tier) with an explanatory reason string. Skynet's Governance Strength signal is a single axis applied uniformly; it cannot distinguish "no on-chain admin because it's an RWA" from "no on-chain admin because the team disappeared".
4. **Pre-trade route scoring in one call.** An agent or smart wallet can pass an entire routing plan (e.g. Merchant Moe -> Lendle -> Init Capital) to MBG and receive one composite score plus the limiting leg, signed by the TEE. CertiK Skynet has no route primitive — an integrator would have to scrape three project pages and invent their own aggregator.
5. **Programmatic Gnosis Safe detection.** Merchant Moe's admin is a real 3-of-5 Safe; MBG reads the signer set and threshold from chain at scoring time, so a signer rotation moves the score automatically. CertiK relies on manual KYC/team-verification badges that refresh on audit cadence, not block cadence.

## Where CertiK is stronger (honest)

- **History.** Skynet has been published since 2022 — four years of score continuity, leaderboards, and incident timelines (https://skynet.certik.com/leaderboards/all-launch). MBG launched at this hackathon.
- **Coverage.** Skynet rates 10,000+ projects across most major L1/L2s. MBG covers 13 protocols on one chain.
- **Audit + KYC moat.** Skynet's Code Security and Fundamental Health categories pull from CertiK's own audit reports and team KYC — proprietary inputs MBG cannot replicate.
- **Brand and integrations.** CertiK is the name VCs and exchanges already cite. MBG has to earn that.

MBG's claim is not that it replaces Skynet. It is that for an *on-chain consumer* — a smart wallet, a routing agent, a DAO treasury policy — a TEE-attested, composition-aware, Mantle-native score is a category Skynet does not serve.

## Sources

- MBG dashboard: https://mbg-fe.vercel.app
- CertiK Mantle Network: https://skynet.certik.com/projects/mantle-network
- CertiK Skynet score methodology: https://skynet.certik.com/skynet-score-methodology
- CertiK Aave: https://skynet.certik.com/projects/aave
- CertiK Ethena: https://skynet.certik.com/projects/ethena
- CertiK Ondo Finance: https://skynet.certik.com/projects/ondofinance
- CertiK Mantle LSP: https://skynet.certik.com/projects/mantle-lsp
- CertiK Merchant Moe: https://skynet.certik.com/projects/merchant-moe
- CertiK INIT Capital: https://skynet.certik.com/projects/init-capital

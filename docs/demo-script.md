# MBG — Demo Video Script (3 minutes)

> Script for recording the hackathon submission video.
> Target length: **3:00**. Hard ceiling: **3:15**.
> Format: Screen recording (QuickTime / OBS / Loom) + voiceover. No talking head needed.

---

## Pre-recording checklist

- [ ] Mantle Mainnet contract deployed (script in `sc/deploy-mainnet.sh`); have the contract address ready
- [ ] mbg-fe.vercel.app rendering the latest scores
- [ ] Ollama daemon running: `ollama serve` (background)
- [ ] Terminal at `~/Documents/web3/mantle-riskgate/skills/mbg/` ready for the harness demo
- [ ] Browser tabs pre-loaded:
  - Tab 1: https://mbg-fe.vercel.app (leaderboard)
  - Tab 2: https://mbg-fe.vercel.app/protocol/aave-v3-mantle (detail)
  - Tab 3: https://mbg-fe.vercel.app/route (route checker)
  - Tab 4: https://mantlescan.xyz/address/[YOUR_MAINNET_ADDR]#code OR Sepolia if not mainnet
  - Tab 5: https://mbg-fe.vercel.app/skill
- [ ] Microphone audio levels checked
- [ ] Mute notifications, close Slack/Discord

---

## Scene 1 — Hook + Problem (0:00 – 0:20)

**On screen:** Quick split-screen — RealClaw chat showing an agent moving funds, then a confused user asking "did the bot actually check the risk?"
*(If you can't get a real RealClaw screenshot, use a slide with the two phrases.)*

**Voiceover:**

> AI agents are moving real money on Mantle. RealClaw, Brahma, Hey Anon — they route user funds based on prompts. But every existing DeFi risk score lives behind a private API. There's no way for a user to verify the agent actually consulted it before signing.
>
> MBG fixes that.

**Cut at 0:20.**

---

## Scene 2 — The Pitch + Dashboard Hero (0:20 – 0:50)

**On screen:** Navigate to https://mbg-fe.vercel.app. Pause briefly on the hero ("Verifiable DeFi risk scoring for the agent era.") so the three pillar cards are visible.

**Voiceover:**

> MBG is the only DeFi risk oracle where every score comes with a cryptographic receipt. Built for Mantle's agent ecosystem. Three pillars: callable by any agent, verifiable end-to-end, and the first scorer that models Mantle-native risk — like mETH depeg exposure, fBTC bridge risk, MI4 custody chain.

*(Slowly scroll past the pillars so each card is on screen for ~3 seconds.)*

> Thirteen Mantle protocols scored on chain, right now.

**On screen:** Scroll down to the leaderboard. Show 5–6 rows: Aave V3 6.73, mETH Protocol 6.72, Ethena USDe 6.41, Merchant Moe 6.39, Treehouse 6.28.

**Cut at 0:50.**

---

## Scene 3 — Per-Protocol Detail + the Moat (0:50 – 1:30)

**On screen:** Click `Aave V3 → /protocol/aave-v3-mantle`.

**Voiceover:**

> Every protocol score breaks down into five components.

*(Pause on the 5-component card so the viewer can see contract / liquidity / centralization / oracle / mantle-exposure.)*

> Four come from on-chain reads on Mantle Mainnet — audit recency, TVL on DefiLlama, the actual admin contract code, the live Aave oracle config.
>
> But the fifth component is the one no multi-chain scorer surfaces: Mantle-native composition risk.

**On screen:** Scroll to the "mantle-native exposure" section. The mETH, cmETH, USDe badges should be highlighted.

**Voiceover:**

> Aave V3 on Mantle accepts mETH and cmETH as collateral, and lists USDe. So a user lending on Aave inherits transitive depeg risk from those assets — risk that doesn't exist on Aave deployments on Ethereum or Polygon.
>
> CertiK Skynet scores Aave 94.48 across every chain it touches. MBG scores Aave on *Mantle specifically*, factoring in *Mantle-specific dependencies*. That's information no other scorer surfaces.

**Cut at 1:30.**

---

## Scene 4 — Route Checker + Pre-Trade Gate (1:30 – 2:10)

**On screen:** Navigate to `/route`. Click the **Risky multi-hop** preset.

**Voiceover:**

> This is what an agent calls before it signs anything on a user's behalf.

*(Wait for preset to load: FusionX V3 swap → Lendle borrow → Treehouse stake.)*

> Three legs across protocols of varying risk. Click "score route" — one on-chain view call.

**On screen:** Click "score route". Wait for result panel.

**Voiceover:**

> The route scores 4.6 out of 10. Below threshold. The verdict box says "an agent consulting MBG should refuse without explicit user override." And below it, MBG suggests safer alternatives — swap Lendle for Aave V3, swap Treehouse for mETH Protocol — each rescored on chain.

*(Pause on the alternatives so viewer reads the suggestion.)*

> No risk scorer does this. This is the pre-trade gate the agent economy needs.

**Cut at 2:10.**

---

## Scene 5 — The Skill Working With a Free Local LLM (2:10 – 2:40)

**On screen:** Switch to terminal. Run:

```
bun run harness "I want to lend my USDC on Mantle for yield. Which protocol is safest?"
```

**Voiceover (while the harness runs):**

> The MBG Skill is OpenClaw-compatible. Drop it into any agent runtime — including a free local model like Ollama running on a laptop. Here's a 4-billion-parameter model — no API keys, no paid service — calling our Skill in three turns.

*(Let the harness output show turn 1, turn 2, turn 3 in real time. Don't speed up.)*

> Turn one: discover protocols. Turn two: score the lending candidates. Turn three: recommend Aave V3. Same data the dashboard shows. Same attestation hash. Verifiable end-to-end.

**Cut at 2:40.**

---

## Scene 6 — The Receipt — On-Chain Attestation (2:40 – 2:55)

**On screen:** Switch back to browser. Open the per-protocol detail page (Aave V3), scroll to the **on-chain attestation** panel showing signer + traceHash + timestamp. Then click through to Mantlescan tab.

**Voiceover:**

> Every score has an attestation hash. The signer address is here. The timestamp. The contract is verified on Mantlescan.

*(Pause on the verified contract source.)*

> Any user, any auditor, any next agent in the chain can verify the score came from this signer at this timestamp. Trust becomes math.

**Cut at 2:55.**

---

## Scene 7 — Close (2:55 – 3:00)

**On screen:** Return to the dashboard hero. Pause on the headline "Verifiable DeFi risk scoring for the agent era."

**Voiceover:**

> MBG. The receipt for risk. Built for Mantle. Live at mbg-fe.vercel.app. Skill installable today.

**End.**

---

## Recording tips

1. **Don't talk over the cuts.** Voiceover should match what's on screen by 0.5–1 second.
2. **The Skill harness scene is the most important** — let it breathe. Three turns of real model output is more convincing than any slide deck.
3. **Mantlescan tab open in advance.** Don't fumble looking it up live.
4. **Practice scene 3 (Mantle-native exposure).** That's the moat — say it cleanly.
5. **One take is fine.** Polish > perfect. Don't burn 6 hours re-recording.

## Submission notes

Upload to YouTube (Unlisted) or Loom. Paste the URL in DoraHacks form (the demo video field) AND in the X post.

## Backup script — if anything breaks during recording

If the route checker server action errors out:
- Use the Sepolia data which has been stable
- OR pivot to showing the cast call in terminal: `cast call $ORACLE "getRouteScore(...)"`

If Ollama doesn't respond:
- `ollama serve` in another terminal
- OR show the `mbg-cli score-route` output directly (still demonstrates the Skill, just without LLM glue)

If Mainnet contract not deployed yet:
- Use the Sepolia contract address — explicitly say "this is on Mantle Sepolia testnet for the demo; Mainnet deploy is in progress at submission time"
- Honesty about deployment state is better than faking a broken demo

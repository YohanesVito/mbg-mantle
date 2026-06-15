# MBG x Agent Ecosystem on Mantle

How **Mantle Bot Gate (MBG)** — a TEE-attested on-chain risk oracle — plugs into the Mantle agent stack: RealClaw, Brahma, Hey Anon, Giza ARMA.

- Dashboard: https://mbg-fe.vercel.app
- RiskOracle (Mantle Sepolia, mainnet planned): `0x58519569c3D5C9a13dC0e8e7B6d2E123E2f0ae45`
- Skill source: https://github.com/YohanesVito/mbg-mantle/tree/main/skills/mbg

MBG exposes three surfaces. Every agent below talks to one of them.

1. **On-chain view** — `getProtocolScore(protocol)` and `getRouteScore(actions[])`. Single call, no oracle hop.
2. **OpenClaw / Byreal Skill** — `mbg-cli` binary + `SKILL.md`. Agent LLMs auto-discover capabilities.
3. **REST wrapper** — same CLI behind HTTP for non-Node runtimes.

---

## Where MBG sits

```
User
  |
  v
Agent runtime  (RealClaw  |  Brahma policy  |  Hey Anon  |  Giza ARMA)
  |
  v  (Skill call or direct eth_call)
mbg-cli  --  REST wrapper  --  on-chain view
  |
  v
RiskOracle on Mantle  ->  { aggregate, components, signer, traceHash }
  |
  v
agent signs route   OR   refuses / asks user / rebalances away
```

---

## 1. RealClaw / Byreal Skills CLI

RealClaw is Bybit-incubated, native to Mantle, and exposes agents to users via Telegram. It uses the OpenClaw Skill format — markdown manifests with YAML frontmatter that an agent's LLM reads at load time to learn what tools exist and when to call them. Skills install with `npx skills add <owner/repo>`, which drops the package into the workspace `skills/` directory; the agent picks them up on the next turn. See the format docs at [docs.openclaw.ai/tools/skills](https://docs.openclaw.ai/tools/skills) and the Byreal template at [byreal-git/byreal-agent-skills](https://github.com/byreal-git/byreal-agent-skills).

The MBG Skill ships a `SKILL.md` whose `description` field includes the keywords RealClaw's planner uses for routing — *Mantle, lending, swap, yield, LP, perps, LST* — plus a hard rule: *consult MBG before signing*. When the user types into Telegram, RealClaw's LLM sees the proposed action, matches it to the Skill, and shells out to `mbg-cli`.

**Concrete Telegram flow — "park 5000 USDC on Mantle safely":**

```bash
# RealClaw's planner invokes these in order, parses JSON, then drafts a reply
mbg-cli list-protocols -o json
mbg-cli score-protocol aave-v3-mantle -o json
mbg-cli score-protocol lendle         -o json
mbg-cli score-route '[{"protocolId":"lendle","actionType":1,"amount":"5000"}]' -o json
```

Each response carries `aggregate`, the four risk components, a `signer` (the TEE enclave's on-chain address), and a `traceHash`. RealClaw surfaces the score plus the attestation hash to the user before requesting signature.

## 2. Brahma / ConsoleKit

Brahma's [ConsoleKit](https://github.com/Brahma-fi/console-kit) (npm `brahma-console-kit`) pairs SAFE-based sub-accounts with a modular policy engine: every agent action is gated by a policy that can call arbitrary view functions on-chain before executing. MBG fits this model natively because `RiskOracle.getProtocolScore` is a single view call returning a uint score.

A policy can encode: *exit any lending position the moment its MBG aggregate drops below 6.0*. The Brahma executor polls `getProtocolScore(protocol)` (or subscribes to score-updated events); when the threshold trips, the workflow constructs an exit transaction and the sub-account signs it inside its existing safety envelope. No new oracle infra — Brahma already does the on-chain reads, MBG just supplies the number.

```ts
// Pseudocode for a Brahma ConsoleKit policy condition
const score = await mbg.getProtocolScore(positionProtocol); // uint x100, e.g. 600 = 6.00
if (score.aggregate < 600) {
  return workflow.exit({ protocol: positionProtocol, attestation: score.traceHash });
}
```

## 3. Hey Anon

Hey Anon ([heyanon.ai](https://heyanon.ai)) is Daniele Sesta's NL-to-DeFi runtime — the project that coined "DeFAI" — and exposes a single API for agents to act across chains, with Mantle on its expansion path. Anon's planner reasons in natural language over a tool registry; adding MBG means registering the `mbg-cli` REST wrapper as a tool whose docstring tells the planner to call it before any Mantle yield recommendation.

When a user asks *"best yield on Mantle stables"*, the planner first hits MBG, filters out anything scoring below its risk floor, then ranks survivors by APY. The recommendation that surfaces is already risk-adjusted, and the response carries the attestation hash so the user can verify the gate was actually consulted.

## 4. Giza ARMA

Giza's [ARMA](https://app.arma.xyz/dashboard) is an autonomous stablecoin yield optimizer that rebalances across lending markets. Out of the box it weighs APY and gas; MBG slots in as a *risk filter* in the candidate-selection step. Before ARMA's optimizer scores a venue, it calls `getProtocolScore(venue)` and either drops venues below threshold or down-weights them in the objective function — turning "highest APY" into "highest risk-adjusted APY". This is the same on-chain read pattern as Brahma; no special integration is needed.

---

## What's shipped today vs what's planned

**Shipped:**
- RiskOracle live on Mantle Sepolia at `0x58519569c3D5C9a13dC0e8e7B6d2E123E2f0ae45` with TEE-attested writes
- `mbg-cli` with `list-protocols`, `score-protocol`, `score-route` — all `-o json`
- OpenClaw-compliant `SKILL.md` — installable today via the standard Skills CLI
- Public dashboard at https://mbg-fe.vercel.app

**Planned / theoretical:**
- Whitelisted RealClaw install — Skill format is ready and standardized; consumer-side whitelisting is gated by Byreal. A local agent harness reproduces the RealClaw flow end-to-end for the demo.
- Brahma policy templates — not yet shipped; the on-chain interface supports it, but no policy is deployed.
- Hey Anon tool registration and Giza ARMA risk-filter integration — both are unshipped. The on-chain surface is ready; the integrations are pending partner contact.

Mainnet deploy of the RiskOracle is also pending.

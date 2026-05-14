# skills/ — Byreal Skill package

The MBG Byreal Skill — installable via the Byreal Skills CLI, callable by RealClaw agents.

## What this Skill does

Exposes the `RiskOracle` on-chain oracle as a Skill that RealClaw can invoke:

- `mbg.getProtocolScore(protocol)` → `{ score, breakdown, attestation, reasoning }`
- `mbg.getRouteScore(actions[])` → `{ score, breakdown, attestation, safer_alternatives[] }`

The Skill returns the attestation hash alongside the score so the calling agent can prove on-chain (or to a user) that MBG was consulted before signing.

## Distribution

Hosted at a public GitHub repo in the form `byreal-git/byreal-agent-skills`-installable slug (e.g. `mbg-mantle/mbg-skill` or similar — final org TBD).

Install (planned):

```bash
npx skills add mbg-mantle/mbg-skill
```

Reference Byreal Skill template: https://github.com/byreal-git/byreal-agent-skills

## Local agent harness (for the demo)

RealClaw runtime is whitelist-gated on the consumer side as of May 2026. To demo the integration without requiring a whitelisted RealClaw account, this folder also contains a local agent harness that:

- Simulates a RealClaw-style chat interface
- Loads the MBG Skill the same way RealClaw would
- Runs the same flow end-to-end so the demo video can show output identical to what live RealClaw would produce

## Setup (planned)

```bash
cd skills
bun install
bun run harness   # local demo
```

The Skill source lives in [`mbg/`](./mbg/). See [`mbg/SKILL.md`](./mbg/SKILL.md) for the full manifest.

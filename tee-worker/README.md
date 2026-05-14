# tee-worker/ — Phala TDX worker

Containerized service that runs the MBG scoring engine (`be/`) inside an Intel TDX enclave on Phala Network. Signs every score with an attested key and submits to the `RiskOracle` contract on Mantle Mainnet.

## Why a separate folder

The TEE worker is a distinct deployable artifact with its own lifecycle, container image, and Phala Cloud deployment pipeline. `be/` is the scoring logic — locally testable, no TEE required. `tee-worker/` wraps it in dstack attestation primitives and ships it to Phala.

## Architecture decision: fork-patterns-only

We do **not** fork Phala's ERC-8004 TEE-agent template (https://github.com/Phala-Network/erc-8004-tee-agent). That template is built around a Python + FastAPI + RedPill chat agent — wrong shape for our deterministic scoring oracle. Gutting it would cost more than building from scratch.

Instead: we use the **Phala dstack JS SDK directly** (https://github.com/Dstack-TEE/dstack/tree/main/sdk/js). It is TypeScript-first and Phala themselves use Bun — perfect alignment with our `be/` stack.

What we borrow as *patterns* from the chat-agent template:
- Deterministic TDX key derivation via `AGENT_SALT`
- Attestation quote publication to the TEE registry
- ERC-8004 identity registration during first-boot

## Plan

1. Build a Docker image: `bun` base + `be/` scoring engine + dstack JS SDK
2. On first boot inside TDX: derive an attested keypair, mint ERC-8004 identity in the canonical Mantle IdentityRegistry, publish the agent card
3. Per scoring tick:
   - Pull latest data via `be/` ingestion
   - Run scorer (`be/`) **inside the enclave** — strong attestation: model + inputs + output all happen in TDX
   - Sign `(scoreVector, modelHash, inputHashes, timestamp, mantleBlockNumber)` with the TDX-derived key
   - Submit signed payload + attestation quote to `RiskOracle.submitScore` on Mantle Mainnet
4. Heartbeat every N blocks for liveness; rotate signing material per dstack guidance

## Canonical Mantle endpoints we mint into

- **IdentityRegistry (Mantle Mainnet):** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **ReputationRegistry (Mantle Mainnet):** `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- **ValidationRegistry (deterministic across chains):** `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`

Canonical repo: https://github.com/erc-8004/erc-8004-contracts

## Fallback path

If dstack integration slips past Week 2, fall back to **attested-EOA** mode: the scoring engine signs with a published EOA whose private key was generated inside a TDX enclave (manual attestation captured once). Less rigorous but verifiable enough for hackathon judging. Switch back to full in-TDX execution in Week 3 polish.

## Resources

- **Phala dstack repo (primary reference):** https://github.com/Dstack-TEE/dstack
- **dstack JS SDK:** https://github.com/Dstack-TEE/dstack/tree/main/sdk/js
- **Phala ERC-8004 TEE-agent template (patterns reference only — do not fork):** https://github.com/Phala-Network/erc-8004-tee-agent
- **Phala on Mantle announcement:** https://www.mantle.xyz/blog/announcements/phala-network-brings-trustless-confidential-compute-to-mantle-network
- **Phala ERC-8004 launch guide:** https://phala.com/posts/erc-8004-launch
- **Phala Cloud credits:** promo code `Mantle` at signup per Mantle's Apr 8, 2025 blog post — may be expired; verify in dashboard. Free tier + pay-as-you-go is the fallback (TEE compute for this workload is cheap).

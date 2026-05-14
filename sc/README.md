# sc/ — Smart contracts

Solidity contracts for MBG, built with Foundry.

## Contracts

| Contract | Purpose |
|---|---|
| `RiskOracle.sol` | Core oracle — stores attested scores per protocol, exposes `getProtocolScore` and `getRouteScore` |
| `AttestationVerifier.sol` | Verifies Phala TDX attestation on score submissions (or attested-EOA fallback for MVP) |
| `MBGAgent.sol` | ERC-8004 identity for the MBG scoring agent (or use canonical Mantle registry if available) |

## Target network

Deploy to **Mantle Mainnet** (chain ID 5000). For local testing, deploy to Anvil (`anvil --host 127.0.0.1`).

## Setup

```bash
cd sc
forge install foundry-rs/forge-std --no-git
forge build
forge test
```

Deployment scripts go in `script/`. Verify on Mantlescan via:

```bash
forge verify-contract <address> RiskOracle --verifier-url https://api.mantlescan.xyz/api --etherscan-api-key $MANTLESCAN_API_KEY
```

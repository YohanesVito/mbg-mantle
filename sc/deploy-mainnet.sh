#!/usr/bin/env bash
# MBG — Mantle Mainnet deploy + verify + setAttestedSigner
#
# Pre-reqs:
#   1. sc/.env has DEPLOYER_PRIVATE_KEY of a wallet funded with ~0.05 MNT on
#      Mantle Mainnet (chain id 5000).
#   2. sc/.env has MANTLESCAN_API_KEY for source verification.
#
# Usage:  cd sc && ./deploy-mainnet.sh
#
# What it does:
#   1. Loads env
#   2. Derives deployer + checks balance
#   3. Runs forge script Deploy on Mantle Mainnet
#   4. Captures deployed RiskOracle address from broadcast file
#   5. Calls setAttestedSigner(deployer, true) so the deployer can submit scores
#   6. Verifies the contract source on Mantlescan via Etherscan V2 API
#   7. Writes MBG_ORACLE_ADDRESS_MAINNET back into sc/.env
#
# After this:
#   - cd ../tee-worker
#   - ORACLE_ADDRESS=$MBG_ORACLE_ADDRESS_MAINNET RPC_URL=$MANTLE_RPC_URL CHAIN_ID=5000 \
#       SIGNER_KEY=$DEPLOYER_PRIVATE_KEY bun run integrate
#   - Update Vercel env (or fe/.env.local) to point at the new Mainnet address.

set -euo pipefail

if [[ ! -f .env ]]; then
  echo "error: sc/.env not found"
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

DEPLOYER_ADDR=$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")
echo "deployer: $DEPLOYER_ADDR"

BALANCE_WEI=$(cast balance "$DEPLOYER_ADDR" --rpc-url "$MANTLE_RPC_URL")
BALANCE_ETH=$(cast to-unit "$BALANCE_WEI" ether)
echo "mainnet balance: $BALANCE_ETH MNT"

# 0.005 MNT is plenty for one deploy + one tx
MIN_WEI="5000000000000000"  # 0.005 in wei
if [[ "$BALANCE_WEI" -lt "$MIN_WEI" ]]; then
  echo "error: insufficient balance. need at least 0.005 MNT, have $BALANCE_ETH"
  echo "bridge MNT to: $DEPLOYER_ADDR"
  exit 1
fi

echo
echo "=== STEP 1: deploy RiskOracle to Mantle Mainnet ==="
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$MANTLE_RPC_URL" \
  --broadcast \
  --slow \
  2>&1 | tail -15

ORACLE_ADDR=$(python3 -c "
import json
d = json.load(open('broadcast/Deploy.s.sol/5000/run-latest.json'))
print([t['contractAddress'] for t in d['transactions'] if t.get('contractName')=='RiskOracle'][0])
")
echo
echo "✓ deployed at: $ORACLE_ADDR"

echo
echo "=== STEP 2: set attested signer (deployer = signer for v0) ==="
cast send "$ORACLE_ADDR" "setAttestedSigner(address,bool)" "$DEPLOYER_ADDR" true \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --rpc-url "$MANTLE_RPC_URL" 2>&1 | grep -E "(status|transactionHash)" | head -3

echo
echo "=== STEP 3: verify on Mantlescan via Etherscan V2 ==="
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" "$DEPLOYER_ADDR")
forge verify-contract \
  --verifier etherscan \
  --verifier-url 'https://api.etherscan.io/v2/api?chainid=5000' \
  --etherscan-api-key "$MANTLESCAN_API_KEY" \
  --constructor-args "$CONSTRUCTOR_ARGS" \
  --watch \
  "$ORACLE_ADDR" \
  src/RiskOracle.sol:RiskOracle 2>&1 | tail -8

echo
echo "=== STEP 4: persist address to sc/.env ==="
if grep -q "^MBG_ORACLE_ADDRESS_MAINNET=" .env; then
  sed -i.bak "s|^MBG_ORACLE_ADDRESS_MAINNET=.*|MBG_ORACLE_ADDRESS_MAINNET=$ORACLE_ADDR|" .env
  rm -f .env.bak
else
  echo "MBG_ORACLE_ADDRESS_MAINNET=$ORACLE_ADDR" >> .env
fi
grep "MBG_ORACLE_ADDRESS_MAINNET" .env

echo
echo "=== DONE ==="
echo "Mainnet RiskOracle: $ORACLE_ADDR"
echo "View on Mantlescan: https://mantlescan.xyz/address/$ORACLE_ADDR#code"
echo
echo "Next steps:"
echo "  1. cd ../tee-worker"
echo "  2. ORACLE_ADDRESS=$ORACLE_ADDR RPC_URL=\$MANTLE_RPC_URL CHAIN_ID=5000 \\"
echo "       SIGNER_KEY=\$DEPLOYER_PRIVATE_KEY bun run integrate"
echo "  3. Update Vercel env vars (mbg-fe project) to point at Mainnet:"
echo "       MBG_RPC_URL = https://rpc.mantle.xyz"
echo "       MBG_CHAIN_ID = 5000"
echo "       MBG_ORACLE_ADDRESS = $ORACLE_ADDR"

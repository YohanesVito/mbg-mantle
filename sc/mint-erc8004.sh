#!/usr/bin/env bash
# MBG — Mint ERC-8004 agent identity in the canonical Mantle IdentityRegistry
#
# Pre-reqs:
#   1. sc/deploy-mainnet.sh has succeeded (we have a Mainnet RiskOracle).
#   2. mbg-fe is deployed to Vercel with public/agent-card.json reachable at
#      https://mbg-fe.vercel.app/agent-card.json
#   3. sc/.env has DEPLOYER_PRIVATE_KEY with a small balance on Mantle Mainnet
#      (~0.001 MNT is enough for the mint).
#
# Usage:  cd sc && ./mint-erc8004.sh
#
# What it does:
#   1. Loads env
#   2. Verifies the agent card is publicly reachable (gates against minting
#      an identity NFT that points at a dead URL)
#   3. Calls IdentityRegistry.register(string agentURI) on Mantle Mainnet
#   4. Parses the mint receipt to extract the new agentId
#   5. Verifies by reading tokenURI(agentId)
#   6. Writes the agentId into sc/.env as MBG_AGENT_ID

set -euo pipefail

if [[ ! -f .env ]]; then echo "error: sc/.env not found"; exit 1; fi
# shellcheck disable=SC1091
set -a; source .env; set +a

# Canonical ERC-8004 IdentityRegistry on Mantle Mainnet (verified)
ID_REG="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
AGENT_URI="https://mbg-fe.vercel.app/agent-card.json"

echo "=== STEP 1: confirm the agent card is reachable ==="
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$AGENT_URI")
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "error: $AGENT_URI returned HTTP $HTTP_STATUS"
  echo "make sure mbg-fe has been deployed with public/agent-card.json (push to GitHub triggers Vercel deploy)"
  exit 1
fi
echo "✓ agent card OK at $AGENT_URI"

DEPLOYER_ADDR=$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")
echo
echo "=== STEP 2: minting agent identity ==="
echo "  registry: $ID_REG (canonical Mantle ERC-8004 IdentityRegistry)"
echo "  signer:   $DEPLOYER_ADDR"
echo "  uri:      $AGENT_URI"
echo

TX_HASH=$(cast send "$ID_REG" \
  "register(string)" "$AGENT_URI" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --rpc-url "$MANTLE_RPC_URL" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['transactionHash'])")

echo "✓ tx submitted: $TX_HASH"
echo "  waiting for receipt..."
sleep 8

# Read the receipt logs to find the Transfer event (ERC-721 mint)
# Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
# topic0 = keccak256("Transfer(address,address,uint256)")
RECEIPT=$(cast receipt "$TX_HASH" --rpc-url "$MANTLE_RPC_URL" --json)
AGENT_ID=$(echo "$RECEIPT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
for log in d.get('logs', []):
    topics = log.get('topics', [])
    if len(topics) >= 4 and topics[0].lower() == TRANSFER_TOPIC.lower():
        # tokenId is topics[3] as uint256 hex
        token_id = int(topics[3], 16)
        print(token_id)
        break
")

if [[ -z "${AGENT_ID:-}" ]]; then
  echo "warn: could not parse agentId from receipt; check Mantlescan: https://mantlescan.xyz/tx/$TX_HASH"
  exit 1
fi

echo
echo "=== STEP 3: verify on-chain ==="
ONCHAIN_URI=$(cast call "$ID_REG" "tokenURI(uint256)(string)" "$AGENT_ID" --rpc-url "$MANTLE_RPC_URL" 2>/dev/null | sed 's/"//g')
echo "agentId: $AGENT_ID"
echo "tokenURI on chain: $ONCHAIN_URI"

if [[ "$ONCHAIN_URI" != "$AGENT_URI" ]]; then
  echo "warn: on-chain URI mismatch (expected $AGENT_URI)"
fi

echo
echo "=== STEP 4: persist agentId to sc/.env ==="
if grep -q "^MBG_AGENT_ID=" .env; then
  sed -i.bak "s|^MBG_AGENT_ID=.*|MBG_AGENT_ID=$AGENT_ID|" .env
  rm -f .env.bak
else
  echo "MBG_AGENT_ID=$AGENT_ID" >> .env
fi
grep MBG_AGENT_ID .env

echo
echo "=== DONE ==="
echo "Mantle Mainnet ERC-8004 identity minted."
echo "  agentId:     $AGENT_ID"
echo "  tokenURI:    $AGENT_URI"
echo "  Mantlescan:  https://mantlescan.xyz/tx/$TX_HASH"
echo "  registry:    https://mantlescan.xyz/address/$ID_REG"
echo
echo "Use this in the DoraHacks submission as proof of canonical ERC-8004"
echo "registration on Mantle Mainnet."

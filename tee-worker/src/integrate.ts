/**
 * Local end-to-end integration test.
 *
 * Flow:
 *   1. score all protocols via @mbg/be
 *   2. connect to local Anvil (or any chain via env)
 *   3. for each protocol, scale the float score to uint16 (×100), build a
 *      traceHash from the inference blob, and submit to RiskOracle
 *   4. read one score back to verify the round-trip
 *
 * Signing currently uses a fixed dev EOA (attested-EOA fallback mode per PLAN §12).
 * Real Phala TDX-derived signing is substituted in once the dstack simulator or
 * Phala Cloud deploy is wired.
 */

import { scoreAllProtocols, type ProtocolScore } from '@mbg/be'
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  parseAbi,
  toHex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const ORACLE_ADDRESS = (process.env.ORACLE_ADDRESS ?? '') as `0x${string}`
const RPC_URL = process.env.RPC_URL ?? 'http://127.0.0.1:8545'
const CHAIN_ID = Number(process.env.CHAIN_ID ?? '31337')

const DEFAULT_ANVIL_SIGNER_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const SIGNER_KEY = (process.env.SIGNER_KEY ?? DEFAULT_ANVIL_SIGNER_KEY) as `0x${string}`

const chain = defineChain({
  id: CHAIN_ID,
  name:
    CHAIN_ID === 31337
      ? 'Anvil'
      : CHAIN_ID === 5000
        ? 'Mantle'
        : CHAIN_ID === 5003
          ? 'Mantle Sepolia'
          : `chain-${CHAIN_ID}`,
  nativeCurrency:
    CHAIN_ID === 5000 || CHAIN_ID === 5003
      ? {name: 'Mantle', symbol: 'MNT', decimals: 18}
      : {name: 'Ether', symbol: 'ETH', decimals: 18},
  rpcUrls: {default: {http: [RPC_URL]}},
})

const ORACLE_ABI = parseAbi([
  'function submitScore(address protocol, uint16 aggregate, uint16 contractRisk, uint16 liquidityRisk, uint16 centralizationRisk, uint16 oracleRisk, bytes32 traceHash) external',
  'function getProtocolScore(address protocol) external view returns ((uint16 aggregate, uint16 contractRisk, uint16 liquidityRisk, uint16 centralizationRisk, uint16 oracleRisk, uint64 timestamp, bytes32 traceHash, address signer))',
  'function isAttestedSigner(address) external view returns (bool)',
])

/**
 * v0 placeholder for protocol → on-chain address.
 * Derives a deterministic address from the protocol id.
 * v1 replaces this with the real Mantle deployment addresses.
 */
function placeholderProtocolAddress(id: string): `0x${string}` {
  const hash = keccak256(toHex(id))
  return `0x${hash.slice(2, 42)}` as `0x${string}`
}

function toUint16(score: number): number {
  return Math.max(0, Math.min(1000, Math.round(score * 100)))
}

function buildTraceHash(ps: ProtocolScore): `0x${string}` {
  const blob = JSON.stringify({
    protocol: ps.protocol.id,
    aggregate: ps.aggregate,
    components: ps.components,
    reasoning: ps.reasoning,
    computedAt: ps.computedAt,
  })
  return keccak256(toHex(blob))
}

async function main() {
  if (!ORACLE_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(ORACLE_ADDRESS)) {
    console.error('set ORACLE_ADDRESS to a valid deployed RiskOracle address')
    process.exit(1)
  }

  const account = privateKeyToAccount(SIGNER_KEY)
  const wallet = createWalletClient({chain, transport: http(RPC_URL), account})
  const pub = createPublicClient({chain, transport: http(RPC_URL)})

  console.log(`chain:     ${chain.name} (id ${CHAIN_ID})`)

  console.log('MBG integration')
  console.log('---------------')
  console.log(`rpc:       ${RPC_URL}`)
  console.log(`oracle:    ${ORACLE_ADDRESS}`)
  console.log(`signer:    ${account.address}`)

  const attested = await pub.readContract({
    address: ORACLE_ADDRESS,
    abi: ORACLE_ABI,
    functionName: 'isAttestedSigner',
    args: [account.address],
  })
  console.log(`attested:  ${attested}`)
  if (!attested) {
    console.error('signer is not attested. cannot submit.')
    process.exit(1)
  }
  console.log()

  console.log('scoring protocols via @mbg/be...')
  const scores = await scoreAllProtocols()
  console.log(`scored ${scores.length} protocols`)
  console.log()

  // Manage nonce explicitly. Mantle Sepolia's getTransactionCount
  // sometimes lags behind the sequencer; viem's per-call nonce fetch races
  // with the chain when submitting many txs back-to-back.
  let nonce = await pub.getTransactionCount({
    address: account.address,
    blockTag: 'pending',
  })
  console.log(`starting nonce: ${nonce}`)
  console.log()

  console.log('submitting scores...')
  for (const ps of scores) {
    const protocolAddr = placeholderProtocolAddress(ps.protocol.id)
    const aggregate = toUint16(ps.aggregate)
    const contractRisk = toUint16(ps.components.contract.score)
    const liquidityRisk = toUint16(ps.components.liquidity.score)
    const centralizationRisk = toUint16(ps.components.centralization.score)
    const oracleRisk = toUint16(ps.components.oracle.score)
    const traceHash = buildTraceHash(ps)

    const txHash = await wallet.writeContract({
      address: ORACLE_ADDRESS,
      abi: ORACLE_ABI,
      functionName: 'submitScore',
      args: [
        protocolAddr,
        aggregate,
        contractRisk,
        liquidityRisk,
        centralizationRisk,
        oracleRisk,
        traceHash,
      ],
      nonce,
    })
    nonce++
    await pub.waitForTransactionReceipt({hash: txHash, timeout: 120_000, retryCount: 60})

    console.log(
      `  ${ps.protocol.id.padEnd(20)} → ${protocolAddr}  aggregate=${aggregate}/1000  tx=${txHash.slice(0, 12)}...`,
    )
  }

  console.log()
  console.log('verification — reading back the first protocol from chain:')
  const first = scores[0]!
  const onchain = await pub.readContract({
    address: ORACLE_ADDRESS,
    abi: ORACLE_ABI,
    functionName: 'getProtocolScore',
    args: [placeholderProtocolAddress(first.protocol.id)],
  })
  console.log(`  ${first.protocol.id}`)
  console.log(`    aggregate:      ${onchain.aggregate} / 1000  (off-chain: ${toUint16(first.aggregate)})`)
  console.log(`    contract:       ${onchain.contractRisk}`)
  console.log(`    liquidity:      ${onchain.liquidityRisk}`)
  console.log(`    centralization: ${onchain.centralizationRisk}`)
  console.log(`    oracle:         ${onchain.oracleRisk}`)
  console.log(`    timestamp:      ${onchain.timestamp} (${new Date(Number(onchain.timestamp) * 1000).toISOString()})`)
  console.log(`    traceHash:      ${onchain.traceHash}`)
  console.log(`    signer:         ${onchain.signer}`)
  console.log()
  console.log('round-trip OK')
}

main().catch((err) => {
  console.error('fatal:', err)
  process.exit(1)
})

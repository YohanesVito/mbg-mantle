import {PROTOCOLS} from './protocols'
import type {Protocol} from './types'
import {createPublicClient, defineChain, http, keccak256, parseAbi, toHex} from 'viem'

const RPC_URL = process.env.MBG_RPC_URL ?? 'http://127.0.0.1:8545'
const CHAIN_ID = Number(process.env.MBG_CHAIN_ID ?? '31337')
export const ORACLE_ADDRESS =
  (process.env.MBG_ORACLE_ADDRESS as `0x${string}` | undefined) ??
  '0x5FbDB2315678afecb367f032d93F642f64180aa3'

const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 31337 ? 'Anvil' : CHAIN_ID === 5000 ? 'Mantle' : 'Mantle Sepolia',
  nativeCurrency: {name: 'Ether', symbol: 'ETH', decimals: 18},
  rpcUrls: {default: {http: [RPC_URL]}},
})

const client = createPublicClient({chain, transport: http(RPC_URL)})

const ORACLE_ABI = parseAbi([
  'function getProtocolScore(address protocol) external view returns ((uint16 aggregate, uint16 contractRisk, uint16 liquidityRisk, uint16 centralizationRisk, uint16 oracleRisk, uint64 timestamp, bytes32 traceHash, address signer))',
])

export interface OnChainScore {
  aggregate: number
  contractRisk: number
  liquidityRisk: number
  centralizationRisk: number
  oracleRisk: number
  timestamp: bigint
  traceHash: `0x${string}`
  signer: `0x${string}`
}

export interface ProtocolEntry {
  protocol: Protocol
  placeholderAddress: `0x${string}`
  score: OnChainScore | null
}

export function placeholderProtocolAddress(id: string): `0x${string}` {
  const hash = keccak256(toHex(id))
  return `0x${hash.slice(2, 42)}` as `0x${string}`
}

export async function fetchProtocolScore(id: string): Promise<OnChainScore | null> {
  const addr = placeholderProtocolAddress(id)
  const data = await client.readContract({
    address: ORACLE_ADDRESS,
    abi: ORACLE_ABI,
    functionName: 'getProtocolScore',
    args: [addr],
  })
  if (data.timestamp === 0n) return null
  return {
    aggregate: data.aggregate,
    contractRisk: data.contractRisk,
    liquidityRisk: data.liquidityRisk,
    centralizationRisk: data.centralizationRisk,
    oracleRisk: data.oracleRisk,
    timestamp: data.timestamp,
    traceHash: data.traceHash,
    signer: data.signer,
  }
}

export async function fetchAllEntries(): Promise<ProtocolEntry[]> {
  return Promise.all(
    PROTOCOLS.map(async (protocol) => ({
      protocol,
      placeholderAddress: placeholderProtocolAddress(protocol.id),
      score: await fetchProtocolScore(protocol.id),
    })),
  )
}

export function formatScore(scaled: number): string {
  return (scaled / 100).toFixed(2)
}

export {PROTOCOLS}

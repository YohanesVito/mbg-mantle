'use server'

import {createPublicClient, defineChain, http, keccak256, parseAbi, toHex} from 'viem'

const RPC_URL = process.env.MBG_RPC_URL ?? 'http://127.0.0.1:8545'
const CHAIN_ID = Number(process.env.MBG_CHAIN_ID ?? '31337')
const ORACLE_ADDRESS = (process.env.MBG_ORACLE_ADDRESS as `0x${string}` | undefined)
  ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3'

const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 31337 ? 'Anvil' : CHAIN_ID === 5000 ? 'Mantle' : 'Mantle Sepolia',
  nativeCurrency: {name: 'Ether', symbol: 'ETH', decimals: 18},
  rpcUrls: {default: {http: [RPC_URL]}},
})

const client = createPublicClient({chain, transport: http(RPC_URL)})

const ROUTE_ABI = parseAbi([
  'function getRouteScore((address protocol, uint8 actionType, uint128 amount)[] actions) external view returns (uint16 aggregate, uint16 compositionPenalty, uint8 distinctProtocols, bool allProtocolsScored)',
])

function placeholderProtocolAddress(id: string): `0x${string}` {
  const hash = keccak256(toHex(id))
  return `0x${hash.slice(2, 42)}` as `0x${string}`
}

export interface RouteActionInput {
  protocolId: string
  actionType: number
  amount: string
}

export type RouteScoreResult =
  | {
      ok: true
      aggregate: number
      compositionPenalty: number
      distinctProtocols: number
      allProtocolsScored: boolean
      protocolIds: string[]
    }
  | {ok: false; error: string}

export async function scoreRouteAction(
  actions: RouteActionInput[],
): Promise<RouteScoreResult> {
  if (actions.length === 0) return {ok: false, error: 'route is empty — add at least one action'}

  try {
    const onchainActions = actions.map((a) => ({
      protocol: placeholderProtocolAddress(a.protocolId),
      actionType: a.actionType,
      amount: BigInt(a.amount || '0'),
    }))

    const r = await client.readContract({
      address: ORACLE_ADDRESS,
      abi: ROUTE_ABI,
      functionName: 'getRouteScore',
      args: [onchainActions],
    })

    return {
      ok: true,
      aggregate: r[0],
      compositionPenalty: r[1],
      distinctProtocols: r[2],
      allProtocolsScored: r[3],
      protocolIds: actions.map((a) => a.protocolId),
    }
  } catch (err) {
    return {ok: false, error: (err as Error).message}
  }
}

import {type Address, zeroAddress} from 'viem'
import {mantleClient} from './mantle-rpc'

const POOL_DATA_PROVIDER_ABI = [
  {
    inputs: [],
    name: 'getAllReservesTokens',
    outputs: [
      {
        components: [
          {name: 'symbol', type: 'string'},
          {name: 'tokenAddress', type: 'address'},
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const AAVE_ORACLE_ABI = [
  {
    inputs: [{name: 'asset', type: 'address'}],
    name: 'getSourceOfAsset',
    outputs: [{name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BASE_CURRENCY',
    outputs: [{name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export interface ReserveOracleInfo {
  symbol: string
  asset: Address
  source: Address
}

export interface AaveOracleReadResult {
  reserves: ReserveOracleInfo[]
  totalReserves: number
  reservesWithFeeds: number
  reservesWithZeroFeed: number
  uniqueFeeds: number
  baseCurrency: Address
}

/**
 * Reads Aave-pattern oracle config: every reserve's price feed source.
 * Works for Aave V3 (and v2 forks with the same interface).
 */
export async function readAaveOracle(
  poolDataProvider: Address,
  aaveOracle: Address,
): Promise<AaveOracleReadResult> {
  const reserves = await mantleClient.readContract({
    address: poolDataProvider,
    abi: POOL_DATA_PROVIDER_ABI,
    functionName: 'getAllReservesTokens',
  })

  let baseCurrency: Address = zeroAddress
  try {
    baseCurrency = await mantleClient.readContract({
      address: aaveOracle,
      abi: AAVE_ORACLE_ABI,
      functionName: 'BASE_CURRENCY',
    })
  } catch {
    // BASE_CURRENCY is optional on older Aave V2 oracles. Not load-bearing for scoring.
  }

  const sources = await Promise.all(
    reserves.map((r) =>
      mantleClient.readContract({
        address: aaveOracle,
        abi: AAVE_ORACLE_ABI,
        functionName: 'getSourceOfAsset',
        args: [r.tokenAddress],
      }),
    ),
  )

  const reserveInfos: ReserveOracleInfo[] = reserves.map((r, i) => ({
    symbol: r.symbol,
    asset: r.tokenAddress,
    source: sources[i] as Address,
  }))

  const reservesWithZeroFeed = reserveInfos.filter((r) => r.source === zeroAddress).length
  const reservesWithFeeds = reserveInfos.length - reservesWithZeroFeed
  const uniqueFeeds = new Set(
    reserveInfos.filter((r) => r.source !== zeroAddress).map((r) => r.source.toLowerCase()),
  ).size

  return {
    reserves: reserveInfos,
    totalReserves: reserveInfos.length,
    reservesWithFeeds,
    reservesWithZeroFeed,
    uniqueFeeds,
    baseCurrency,
  }
}

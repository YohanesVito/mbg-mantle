// Mirrored from be/src/types.ts — keep in sync.
export type ProtocolCategory =
  | 'lending'
  | 'dex'
  | 'lst'
  | 'restaking'
  | 'rwa'
  | 'derivatives'
  | 'stablecoin'
  | 'bridge'
  | 'other'

export interface AuditRecord {
  firm: string
  date: string
  url?: string
  scope?: string
  findings?: {
    critical?: number
    high?: number
    medium?: number
    low?: number
  }
}

/**
 * How to derive a protocol's TVL number from DefiLlama:
 * - 'mantle-chain' (default): use chainTvls.Mantle. Right for protocols where
 *   DefiLlama's chain tagging matches their actual Mantle presence.
 * - 'total': use the protocol-wide tvl. Right for protocols like mETH whose
 *   DefiLlama chain registration is Ethereum but whose product is core to the
 *   Mantle ecosystem.
 */
export type TvlMetric = 'mantle-chain' | 'total'

/**
 * How the protocol's oracle config is structured on-chain.
 * 'aave-v3' / 'aave-v2': has a PoolDataProvider listing reserves and an
 *   AaveOracle with getSourceOfAsset(asset) → feed address.
 * 'custom': non-Aave pattern; needs a custom reader.
 * undefined: no on-chain price oracle relevant to this protocol (e.g. DEX, RWA).
 */
export type OraclePattern = 'aave-v3' | 'aave-v2' | 'custom'

export interface Protocol {
  id: string
  name: string
  slug: string
  category: ProtocolCategory
  description?: string
  deployedAt?: string
  tvlMetric?: TvlMetric
  oraclePattern?: OraclePattern
  audits: AuditRecord[]
  addresses?: {
    main?: `0x${string}`
    admin?: `0x${string}`
    aaveOracle?: `0x${string}`
    poolDataProvider?: `0x${string}`
  }
}

export interface ComponentScore {
  score: number
  reasoning: string
  inputs?: Record<string, unknown>
  isPlaceholder?: boolean
}

export interface ProtocolComponents {
  contract: ComponentScore
  liquidity: ComponentScore
  centralization: ComponentScore
  oracle: ComponentScore
}

export interface ProtocolScore {
  protocol: Protocol
  components: ProtocolComponents
  aggregate: number
  reasoning: string
  computedAt: string
}

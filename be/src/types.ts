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

/**
 * Mantle-native dependency exposure: what the protocol *transitively*
 * inherits risk from. Multi-chain scorers don't model these; we do.
 *
 *  - `lst`: liquid staking tokens. Accepting mETH as collateral or holding
 *    cmETH in a pool inherits the LST's depeg / redemption-rate risk.
 *  - `bridge`: tokenized assets bridged from another chain. Inherits the
 *    bridge's custody / attestation-chain risk.
 *  - `stable`: synthetic / pegged dollars. Inherits the stable's
 *    collateral / oracle / peg risk.
 */
export type LstAsset = 'mETH' | 'cmETH'
export type BridgeAsset = 'fBTC'
export type StableAsset = 'USDe' | 'USDtb' | 'USDY'

export interface MantleExposure {
  lst?: LstAsset[]
  bridge?: BridgeAsset[]
  stable?: StableAsset[]
  /** Free-form note explaining the nature of the exposure */
  notes?: string
}

export interface Protocol {
  id: string
  name: string
  slug: string
  category: ProtocolCategory
  description?: string
  deployedAt?: string
  tvlMetric?: TvlMetric
  oraclePattern?: OraclePattern
  mantleExposure?: MantleExposure
  audits: AuditRecord[]
  addresses?: {
    main?: `0x${string}`
    /** Admin / owner / governance contract on Mantle Mainnet. Used by
     *  centralization-risk to read whether control is an EOA, a contract,
     *  or renounced. Omit when unknown; the component falls back to a v0
     *  placeholder. */
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
  /** Mantle-native composition risk — transitive exposure to LSTs, bridges,
   *  synthetic stables. Not modeled by global multi-chain scorers. */
  mantleExposure: ComponentScore
}

export interface ProtocolScore {
  protocol: Protocol
  components: ProtocolComponents
  aggregate: number
  reasoning: string
  computedAt: string
}

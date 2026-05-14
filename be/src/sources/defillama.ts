import type { TvlMetric } from '../types'

export interface DefiLlamaProtocol {
  id: string
  name: string
  slug: string
  category: string
  tvl: number
  chainTvls?: Record<string, number>
  chains: string[]
  description?: string
  url?: string
  twitter?: string
  audit_links?: string[]
  audit?: string
  audits?: string
  audit_note?: string
  listedAt?: number
}

const BASE = 'https://api.llama.fi'

let _protocolsCache: DefiLlamaProtocol[] | null = null

export async function fetchAllProtocols(): Promise<DefiLlamaProtocol[]> {
  if (_protocolsCache) return _protocolsCache
  const res = await fetch(`${BASE}/protocols`)
  if (!res.ok) {
    throw new Error(`DefiLlama /protocols returned ${res.status} ${res.statusText}`)
  }
  _protocolsCache = (await res.json()) as DefiLlamaProtocol[]
  return _protocolsCache
}

/** Look up one protocol by slug. Uses cached /protocols (single network round-trip). */
export async function fetchProtocol(slug: string): Promise<DefiLlamaProtocol> {
  const all = await fetchAllProtocols()
  const found = all.find((p) => p.slug === slug)
  if (!found) {
    throw new Error(`Protocol not indexed on DefiLlama: slug="${slug}"`)
  }
  return found
}

export async function fetchMantleProtocols(): Promise<DefiLlamaProtocol[]> {
  const all = await fetchAllProtocols()
  return all.filter((p) => p.chains?.includes('Mantle'))
}

export function effectiveTvl(
  p: DefiLlamaProtocol,
  metric: TvlMetric = 'mantle-chain',
): number {
  if (metric === 'total') return p.tvl ?? 0
  return p.chainTvls?.Mantle ?? 0
}

/** For diagnostics / reasoning text. */
export function describeTvlSource(p: DefiLlamaProtocol, metric: TvlMetric): string {
  if (metric === 'total') {
    return `protocol-wide TVL (DefiLlama-registered chains: ${p.chains?.join(', ') ?? 'unknown'})`
  }
  return 'Mantle-chain TVL'
}

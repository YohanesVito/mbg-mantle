import type { ComponentScore, Protocol } from '../types'
import { type DefiLlamaProtocol, describeTvlSource, effectiveTvl } from '../sources/defillama'

export function computeLiquidityRisk(
  protocol: Protocol,
  llamaData: DefiLlamaProtocol,
): ComponentScore {
  const metric = protocol.tvlMetric ?? 'mantle-chain'
  const tvl = effectiveTvl(llamaData, metric)
  const totalTvl = llamaData.tvl ?? 0
  const mantleChainTvl = llamaData.chainTvls?.Mantle ?? 0

  let score: number
  if (tvl < 1_000_000) {
    score = 2 + (tvl / 1_000_000) * 2
  } else if (tvl < 10_000_000) {
    score = 4 + ((tvl - 1_000_000) / 9_000_000) * 2
  } else if (tvl < 50_000_000) {
    score = 6 + ((tvl - 10_000_000) / 40_000_000) * 2
  } else if (tvl < 200_000_000) {
    score = 8 + ((tvl - 50_000_000) / 150_000_000) * 1
  } else {
    score = 9 + Math.min(1, (tvl - 200_000_000) / 1_000_000_000)
  }

  const source = describeTvlSource(llamaData, metric)
  const extraNote =
    metric === 'total' && mantleChainTvl < totalTvl
      ? ` Mantle-chain TVL: $${formatCompact(mantleChainTvl)}.`
      : ''

  return {
    score: Math.round(score * 100) / 100,
    reasoning: `TVL: $${formatCompact(tvl)} (${source}).${extraNote}`,
    inputs: {
      tvlUsd: tvl,
      tvlMetric: metric,
      totalTvlUsd: totalTvl,
      mantleChainTvlUsd: mantleChainTvl,
      chains: llamaData.chains,
    },
  }
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return n.toFixed(2)
}

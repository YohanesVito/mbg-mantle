import type { ProtocolComponents } from '../types'

export const WEIGHTS = {
  contract: 0.35,
  liquidity: 0.2,
  centralization: 0.15,
  oracle: 0.15,
  mantleExposure: 0.15,
} as const

export function aggregateScore(components: ProtocolComponents): {
  score: number
  reasoning: string
} {
  const raw =
    components.contract.score * WEIGHTS.contract +
    components.liquidity.score * WEIGHTS.liquidity +
    components.centralization.score * WEIGHTS.centralization +
    components.oracle.score * WEIGHTS.oracle +
    components.mantleExposure.score * WEIGHTS.mantleExposure

  const placeholders = Object.values(components).filter((c) => c.isPlaceholder).length
  const placeholderNote =
    placeholders > 0
      ? ` Note: ${placeholders} of 5 components rely on placeholders for this protocol — informativeness improves as data is curated and v2 on-chain readers ship.`
      : ''

  return {
    score: Math.round(raw * 100) / 100,
    reasoning: `Weighted aggregate (contract ${pct(WEIGHTS.contract)}, liquidity ${pct(WEIGHTS.liquidity)}, centralization ${pct(WEIGHTS.centralization)}, oracle ${pct(WEIGHTS.oracle)}, mantle-exposure ${pct(WEIGHTS.mantleExposure)}).${placeholderNote}`,
  }
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`
}

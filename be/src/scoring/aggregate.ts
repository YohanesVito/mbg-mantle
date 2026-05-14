import type { ProtocolComponents } from '../types'

export const WEIGHTS = {
  contract: 0.4,
  liquidity: 0.25,
  centralization: 0.2,
  oracle: 0.15,
} as const

export function aggregateScore(components: ProtocolComponents): {
  score: number
  reasoning: string
} {
  const raw =
    components.contract.score * WEIGHTS.contract +
    components.liquidity.score * WEIGHTS.liquidity +
    components.centralization.score * WEIGHTS.centralization +
    components.oracle.score * WEIGHTS.oracle

  const placeholders = Object.values(components).filter((c) => c.isPlaceholder).length
  const placeholderNote =
    placeholders > 0
      ? ` Note: ${placeholders} of 4 components are v0 placeholders (centralization, oracle) — score informativeness limited until v1 lands on-chain reads.`
      : ''

  return {
    score: Math.round(raw * 100) / 100,
    reasoning: `Weighted aggregate (contract ${pct(WEIGHTS.contract)}, liquidity ${pct(WEIGHTS.liquidity)}, centralization ${pct(WEIGHTS.centralization)}, oracle ${pct(WEIGHTS.oracle)}).${placeholderNote}`,
  }
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`
}

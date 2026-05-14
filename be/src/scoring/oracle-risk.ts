import type {ComponentScore, Protocol} from '../types'
import {readAaveOracle} from '../sources/aave-oracle'

export async function computeOracleRisk(protocol: Protocol): Promise<ComponentScore> {
  if (
    (protocol.oraclePattern === 'aave-v3' || protocol.oraclePattern === 'aave-v2') &&
    protocol.addresses?.aaveOracle &&
    protocol.addresses?.poolDataProvider
  ) {
    try {
      const r = await readAaveOracle(
        protocol.addresses.poolDataProvider,
        protocol.addresses.aaveOracle,
      )

      let score = scoreAaveOracle(r.reservesWithFeeds, r.uniqueFeeds, r.reservesWithZeroFeed)

      return {
        score: Math.round(score * 100) / 100,
        reasoning: buildAaveReasoning(r),
        inputs: {
          totalReserves: r.totalReserves,
          reservesWithFeeds: r.reservesWithFeeds,
          reservesWithZeroFeed: r.reservesWithZeroFeed,
          uniqueFeeds: r.uniqueFeeds,
          baseCurrency: r.baseCurrency,
          reserves: r.reserves.map((res) => ({symbol: res.symbol, source: res.source})),
        },
      }
    } catch (err) {
      return {
        score: 5.0,
        reasoning: `Failed to read ${protocol.oraclePattern} oracle on Mantle: ${(err as Error).message}. Falling back to placeholder.`,
        isPlaceholder: true,
      }
    }
  }

  return {
    score: 5.0,
    reasoning: `v0 placeholder for category=${protocol.category}, oraclePattern=${protocol.oraclePattern ?? 'none'}. v1 will land category-specific oracle-risk readers (DEX → TWAP availability, LST → exchange-rate oracle, derivatives → mark-price config).`,
    isPlaceholder: true,
  }
}

function scoreAaveOracle(
  reservesWithFeeds: number,
  uniqueFeeds: number,
  zeroFeeds: number,
): number {
  let score: number
  if (reservesWithFeeds === 0) score = 0
  else if (reservesWithFeeds <= 2) score = 4
  else if (reservesWithFeeds <= 5) score = 6
  else if (reservesWithFeeds <= 10) score = 8
  else score = Math.min(10, 8 + (reservesWithFeeds - 10) * 0.2)

  if (zeroFeeds > 0) score -= 2

  const diversityBonus = uniqueFeeds === reservesWithFeeds && reservesWithFeeds > 0 ? 0.5 : 0
  score += diversityBonus

  return Math.max(0, Math.min(10, score))
}

function buildAaveReasoning(r: ReturnType<typeof readAaveOracle> extends Promise<infer U> ? U : never): string {
  const parts = [
    `Aave-pattern oracle: ${r.totalReserves} reserve(s)`,
    `${r.reservesWithFeeds} with non-zero feed`,
    `${r.uniqueFeeds} unique feed${r.uniqueFeeds === 1 ? '' : 's'}`,
  ]
  if (r.reservesWithZeroFeed > 0) {
    parts.push(`${r.reservesWithZeroFeed} reserve(s) have ZERO feed (red flag)`)
  }
  return parts.join('; ') + '.'
}

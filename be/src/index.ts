import { PROTOCOLS, findProtocol } from './protocols/registry'
import { fetchProtocol } from './sources/defillama'
import { computeContractRisk } from './scoring/contract-risk'
import { computeLiquidityRisk } from './scoring/liquidity-risk'
import { computeCentralizationRisk } from './scoring/centralization-risk'
import { computeOracleRisk } from './scoring/oracle-risk'
import { computeMantleExposureScore } from './scoring/mantle-exposure'
import { aggregateScore } from './scoring/aggregate'
import type { Protocol, ProtocolScore } from './types'

export async function scoreProtocol(protocol: Protocol): Promise<ProtocolScore> {
  const llamaData = await fetchProtocol(protocol.slug)

  const components = {
    contract: computeContractRisk(protocol),
    liquidity: computeLiquidityRisk(protocol, llamaData),
    centralization: await computeCentralizationRisk(protocol),
    oracle: await computeOracleRisk(protocol),
    mantleExposure: computeMantleExposureScore(protocol),
  }

  const { score: aggregate, reasoning } = aggregateScore(components)

  return {
    protocol,
    components,
    aggregate,
    reasoning,
    computedAt: new Date().toISOString(),
  }
}

export async function scoreAllProtocols(): Promise<ProtocolScore[]> {
  const results: ProtocolScore[] = []
  for (const protocol of PROTOCOLS) {
    try {
      results.push(await scoreProtocol(protocol))
    } catch (err) {
      console.error(`failed to score ${protocol.id}: ${(err as Error).message}`)
    }
  }
  return results
}

export { PROTOCOLS, findProtocol }
export type {
  Protocol,
  ProtocolScore,
  ComponentScore,
  ProtocolComponents,
  AuditRecord,
} from './types'

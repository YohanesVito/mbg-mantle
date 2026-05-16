import type {ComponentScore, MantleExposure, Protocol} from '../types'

/**
 * Compute the *Mantle-native composition* adjustment for a protocol.
 *
 * v1 model (deliberately conservative):
 *  - each LST exposure (mETH, cmETH): -0.10 from a 10.00 baseline
 *  - each bridge exposure (fBTC):     -0.15 (bridges have higher historical risk)
 *  - each stable exposure (USDe, USDtb, USDY): -0.07
 *  - protocols with zero exposure score 9.5 (pure Mantle-native or self-contained)
 *  - a protocol that IS the LST/bridge/stable issuer is not penalized for "depending"
 *    on its own asset — that's circular
 *
 * v2 will replace fixed penalties with a *dynamic* model: each exposure's
 * penalty equals the gap between the exposed protocol's current MBG score
 * and a healthy baseline (e.g. 8.00). So a protocol depending on a degraded
 * LST inherits the degradation in real time.
 */
export function computeMantleExposureScore(protocol: Protocol): ComponentScore {
  const exp = protocol.mantleExposure
  if (!exp) {
    return {
      score: 5.0,
      reasoning:
        'No Mantle-native exposure data curated for this protocol. v1 placeholder; v2 will infer exposure from on-chain reads of the protocol\'s reserve / pool composition.',
      isPlaceholder: true,
    }
  }

  const lstCount = exp.lst?.length ?? 0
  const bridgeCount = exp.bridge?.length ?? 0
  const stableCount = exp.stable?.length ?? 0
  const totalCount = lstCount + bridgeCount + stableCount

  if (totalCount === 0) {
    return {
      score: 9.5,
      reasoning:
        'No Mantle-native LST / bridge / stable exposure — protocol is either the issuer itself or fully self-contained.',
      inputs: {lstCount, bridgeCount, stableCount},
    }
  }

  const baseScore = 10
  const penalty = lstCount * 0.1 + bridgeCount * 0.15 + stableCount * 0.07
  const finalScore = Math.max(0, baseScore - penalty)

  const components: string[] = []
  if (lstCount > 0) components.push(`LST: ${exp.lst!.join(', ')}`)
  if (bridgeCount > 0) components.push(`bridge: ${exp.bridge!.join(', ')}`)
  if (stableCount > 0) components.push(`stable: ${exp.stable!.join(', ')}`)

  return {
    score: round(finalScore),
    reasoning: `${describeExposureLevel(totalCount)} Mantle-native exposure (${components.join('; ')}). ${exp.notes ?? ''}`.trim(),
    inputs: {
      lst: exp.lst,
      bridge: exp.bridge,
      stable: exp.stable,
      lstCount,
      bridgeCount,
      stableCount,
      penalty: round(penalty),
    },
  }
}

function describeExposureLevel(n: number): string {
  if (n === 0) return 'No'
  if (n === 1) return 'Single-asset'
  if (n <= 3) return 'Modest'
  return 'Broad'
}

function round(x: number): number {
  return Math.round(x * 100) / 100
}

/**
 * Compute a route-level Mantle-native exposure score from the leaf protocols.
 * Used by the off-chain side; the on-chain `getRouteScore` uses the simpler
 * composition penalty.
 */
export function aggregateRouteExposure(
  protocols: Protocol[],
): {
  uniqueLst: string[]
  uniqueBridge: string[]
  uniqueStable: string[]
} {
  const uniqueLst = new Set<string>()
  const uniqueBridge = new Set<string>()
  const uniqueStable = new Set<string>()
  for (const p of protocols) {
    p.mantleExposure?.lst?.forEach((x) => uniqueLst.add(x))
    p.mantleExposure?.bridge?.forEach((x) => uniqueBridge.add(x))
    p.mantleExposure?.stable?.forEach((x) => uniqueStable.add(x))
  }
  return {
    uniqueLst: Array.from(uniqueLst),
    uniqueBridge: Array.from(uniqueBridge),
    uniqueStable: Array.from(uniqueStable),
  }
}

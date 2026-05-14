import type { ComponentScore, Protocol } from '../types'

export function computeCentralizationRisk(_protocol: Protocol): ComponentScore {
  return {
    score: 5.0,
    reasoning:
      'v0 placeholder. v1 will read admin / owner addresses on-chain, count multisig signers, check timelock duration, and evaluate the upgrade pattern.',
    isPlaceholder: true,
  }
}

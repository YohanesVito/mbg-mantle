import type {ComponentScore, Protocol} from '../types'
import {readAdminInfo, type AdminInfo} from '../sources/admin-reader'

/**
 * v1 centralization scoring.
 *
 * Reads the protocol's admin address on Mantle Mainnet and scores by:
 *  - renounced (zero-address)  → 9.5 — effectively immutable
 *  - EOA admin                 → 2.5 — single key controls everything
 *  - Gnosis Safe (4+ signers)  → 8.0 — strong distributed control
 *  - Gnosis Safe (2-3 signers) → 6.0 — modest distributed control
 *  - Gnosis Safe (1 signer)    → 3.5 — multisig in name only
 *  - Other contract            → 6.0 — likely a custom multisig / timelock,
 *                                       conservative middle score, manual
 *                                       review encouraged
 *
 * When no admin address is curated in the registry, we fall back to a v0
 * placeholder so the component is still informative-by-omission rather than
 * silently scoring badly.
 */
export async function computeCentralizationRisk(
  protocol: Protocol,
): Promise<ComponentScore> {
  const adminAddr = protocol.addresses?.admin
  if (!adminAddr) {
    return {
      score: 5.0,
      reasoning:
        'v1 placeholder — no admin address curated in the MBG registry for this protocol. Score reflects this data gap, not a known issue. To improve: add the protocol.addresses.admin field.',
      isPlaceholder: true,
    }
  }

  let info: AdminInfo
  try {
    info = await readAdminInfo(adminAddr)
  } catch (err) {
    return {
      score: 5.0,
      reasoning: `Failed to read admin info on Mantle: ${(err as Error).message}. Falling back to placeholder.`,
      isPlaceholder: true,
    }
  }

  return scoreFromAdminInfo(info)
}

function scoreFromAdminInfo(info: AdminInfo): ComponentScore {
  if (info.kind === 'renounced') {
    return {
      score: 9.5,
      reasoning: 'Admin renounced (address(0)) — effectively immutable.',
      inputs: {kind: info.kind, admin: info.address},
    }
  }

  if (info.kind === 'eoa') {
    return {
      score: 2.5,
      reasoning: `Admin is an EOA (${info.address}). Single private key controls all upgrade / configuration actions — high centralization risk.`,
      inputs: {kind: info.kind, admin: info.address, codeSize: 0},
    }
  }

  if (info.kind === 'contract') {
    if (
      info.recognizedSafeOwners !== undefined &&
      info.recognizedSafeThreshold !== undefined
    ) {
      const signers = info.recognizedSafeOwners.length
      const threshold = info.recognizedSafeThreshold
      let score: number
      let qualifier: string
      if (signers >= 4) {
        score = 8.0
        qualifier = 'strong'
      } else if (signers >= 2) {
        score = 6.0
        qualifier = 'modest'
      } else {
        score = 3.5
        qualifier = 'multisig-in-name-only'
      }
      return {
        score,
        reasoning: `Admin is a Gnosis Safe (${signers} signers, ${threshold}-of-${signers} threshold) — ${qualifier} distributed control.`,
        inputs: {
          kind: 'safe',
          admin: info.address,
          signers,
          threshold,
          owners: info.recognizedSafeOwners,
        },
      }
    }
    return {
      score: 6.0,
      reasoning: `Admin is a contract (${info.codeSize} bytes) but doesn't expose the Gnosis Safe interface — likely a custom multisig / timelock / governance contract. Conservative middle score; manual review of the contract recommended.`,
      inputs: {kind: info.kind, admin: info.address, codeSize: info.codeSize},
    }
  }

  return {
    score: 5.0,
    reasoning: `Admin info unreadable for ${info.address}. Falling back to placeholder.`,
    isPlaceholder: true,
  }
}

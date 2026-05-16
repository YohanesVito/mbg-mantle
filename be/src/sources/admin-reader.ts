import {type Address, zeroAddress} from 'viem'
import {mantleClient} from './mantle-rpc'

export type AdminKind = 'renounced' | 'eoa' | 'contract' | 'unknown'

export interface AdminInfo {
  address: Address
  kind: AdminKind
  /** byte length of contract code at the address; 0 means EOA */
  codeSize: number
  /** Heuristic: did we get a recognizable getOwners() back? */
  recognizedSafeOwners?: Address[]
  recognizedSafeThreshold?: number
}

const SAFE_ABI = [
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{type: 'address[]'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getThreshold',
    outputs: [{type: 'uint256'}],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Inspect a protocol's admin address on Mantle.
 *
 * v1 capabilities:
 *  - Detect EOA vs contract vs zero-address (renounced)
 *  - If contract, opportunistically try the Gnosis Safe interface and
 *    record signers + threshold when present
 *
 * v2 will additionally detect:
 *  - TimelockController (`getMinDelay()`)
 *  - OpenZeppelin AccessControl roles
 *  - Mantle-specific custom-multisig patterns
 */
export async function readAdminInfo(address: Address): Promise<AdminInfo> {
  if (address === zeroAddress) {
    return {address, kind: 'renounced', codeSize: 0}
  }

  let code: `0x${string}`
  try {
    code = await mantleClient.getCode({address}) ?? '0x'
  } catch {
    return {address, kind: 'unknown', codeSize: 0}
  }

  // `0x` means no code (EOA). Anything longer is a contract.
  const codeSize = code === '0x' ? 0 : (code.length - 2) / 2

  if (codeSize === 0) {
    return {address, kind: 'eoa', codeSize: 0}
  }

  // Opportunistically check Gnosis Safe interface.
  let owners: Address[] | undefined
  let threshold: number | undefined
  try {
    const result = await mantleClient.readContract({
      address,
      abi: SAFE_ABI,
      functionName: 'getOwners',
    })
    owners = result as Address[]
    const t = await mantleClient.readContract({
      address,
      abi: SAFE_ABI,
      functionName: 'getThreshold',
    })
    threshold = Number(t)
  } catch {
    // Not a Safe (or Safe-compatible) — fine. Score as 'contract' anyway.
  }

  return {
    address,
    kind: 'contract',
    codeSize,
    recognizedSafeOwners: owners,
    recognizedSafeThreshold: threshold,
  }
}

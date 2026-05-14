#!/usr/bin/env bun
/**
 * mbg-cli — Mantle Bot Gate Skill CLI
 *
 * Commands:
 *   skill                          print SKILL.md
 *   catalog list                   list capabilities
 *   catalog show <id>              capability detail
 *   list-protocols                 enumerate scorable protocols
 *   score-protocol <id>            current on-chain score for one protocol
 *   score-route '<actions-json>'   composite route score
 *
 * Flags:
 *   -o json | --output json        emit JSON instead of human-readable
 *
 * Environment:
 *   MBG_RPC_URL                    chain RPC (default: http://127.0.0.1:8545)
 *   MBG_CHAIN_ID                   chain id (default: 31337)
 *   MBG_ORACLE_ADDRESS             RiskOracle address on the configured chain
 */

import {PROTOCOLS, findProtocol} from '@mbg/be'
import {
  createPublicClient,
  defineChain,
  http,
  keccak256,
  parseAbi,
  toHex,
  type Address,
} from 'viem'
import {readFile} from 'node:fs/promises'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

// ─── env ────────────────────────────────────────────────────────────────────
const RPC_URL = process.env.MBG_RPC_URL ?? 'http://127.0.0.1:8545'
const CHAIN_ID = Number(process.env.MBG_CHAIN_ID ?? '31337')
const ORACLE_ADDRESS =
  (process.env.MBG_ORACLE_ADDRESS as Address | undefined) ??
  '0x5FbDB2315678afecb367f032d93F642f64180aa3'

const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 31337 ? 'Anvil' : CHAIN_ID === 5000 ? 'Mantle' : 'Mantle Sepolia',
  nativeCurrency: {name: 'Ether', symbol: 'ETH', decimals: 18},
  rpcUrls: {default: {http: [RPC_URL]}},
})

const client = createPublicClient({chain, transport: http(RPC_URL)})

const ORACLE_ABI = parseAbi([
  'function getProtocolScore(address protocol) external view returns ((uint16 aggregate, uint16 contractRisk, uint16 liquidityRisk, uint16 centralizationRisk, uint16 oracleRisk, uint64 timestamp, bytes32 traceHash, address signer))',
  'function getRouteScore((address protocol, uint8 actionType, uint128 amount)[] actions) external view returns (uint16 aggregate, uint16 compositionPenalty, uint8 distinctProtocols, bool allProtocolsScored)',
])

// ─── helpers ────────────────────────────────────────────────────────────────
function placeholderProtocolAddress(id: string): Address {
  return `0x${keccak256(toHex(id)).slice(2, 42)}` as Address
}

function scaledToFloat(scaled: number): string {
  return (scaled / 100).toFixed(2)
}

function parseArgs(argv: string[]): {cmd: string | undefined; rest: string[]; output: 'human' | 'json'} {
  const cmd = argv[0]
  let output: 'human' | 'json' = 'human'
  const rest: string[] = []
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '-o' || a === '--output') {
      const v = argv[++i]
      if (v === 'json') output = 'json'
    } else if (a === '--json') {
      output = 'json'
    } else {
      rest.push(a)
    }
  }
  return {cmd, rest, output}
}

function emit(output: 'human' | 'json', humanText: string, jsonValue: unknown) {
  if (output === 'json') {
    console.log(JSON.stringify(jsonValue, null, 2))
  } else {
    console.log(humanText)
  }
}

// ─── commands ───────────────────────────────────────────────────────────────

async function cmdSkill() {
  const here = dirname(fileURLToPath(import.meta.url))
  const skillPath = join(here, '..', 'SKILL.md')
  const md = await readFile(skillPath, 'utf-8')
  console.log(md)
}

function cmdCatalogList(output: 'human' | 'json') {
  const capabilities = [
    {
      id: 'list-protocols',
      description: 'Enumerate every Mantle protocol that MBG can score',
      command: 'mbg-cli list-protocols',
      params: [],
    },
    {
      id: 'score-protocol',
      description: 'Get the current TEE-attested score for one protocol',
      command: 'mbg-cli score-protocol <id>',
      params: [{name: 'id', type: 'string', required: true, description: 'protocol id from list-protocols'}],
    },
    {
      id: 'score-route',
      description:
        'Score a multi-leg route. Returns aggregate score, composition penalty, distinct protocol count, and whether every leg has been scored.',
      command: "mbg-cli score-route '<actions-json>'",
      params: [
        {
          name: 'actions',
          type: 'JSON array',
          required: true,
          description:
            'array of {protocolId, actionType (0=swap, 1=lend, 2=borrow, 3=stake, 4=bridge, 255=other), amount}',
        },
      ],
    },
  ]
  if (output === 'json') {
    console.log(JSON.stringify(capabilities, null, 2))
    return
  }
  console.log('mbg-cli capabilities')
  console.log('--------------------')
  for (const c of capabilities) {
    console.log()
    console.log(`  ${c.id}`)
    console.log(`    ${c.description}`)
    console.log(`    $ ${c.command}`)
  }
  console.log()
}

function cmdListProtocols(output: 'human' | 'json') {
  const list = PROTOCOLS.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
  }))
  if (output === 'json') {
    console.log(JSON.stringify(list, null, 2))
    return
  }
  console.log('Mantle protocols MBG can score')
  console.log('-------------------------------')
  for (const p of list) {
    console.log(`  ${p.id.padEnd(24)} ${p.category.padEnd(12)} ${p.name}`)
  }
  console.log()
  console.log(`(${list.length} protocols)`)
}

async function cmdScoreProtocol(id: string | undefined, output: 'human' | 'json') {
  if (!id) {
    console.error('Usage: mbg-cli score-protocol <id>')
    process.exit(1)
  }
  const protocol = findProtocol(id)
  if (!protocol) {
    console.error(`Unknown protocol: ${id}`)
    console.error(`Known: ${PROTOCOLS.map((p) => p.id).join(', ')}`)
    process.exit(1)
  }
  const addr = placeholderProtocolAddress(protocol.id)
  const data = await client.readContract({
    address: ORACLE_ADDRESS,
    abi: ORACLE_ABI,
    functionName: 'getProtocolScore',
    args: [addr],
  })
  const hasScore = data.timestamp !== 0n
  const payload = {
    protocol: {
      id: protocol.id,
      name: protocol.name,
      category: protocol.category,
    },
    onChain: hasScore
      ? {
          aggregate: data.aggregate,
          aggregateFloat: scaledToFloat(data.aggregate),
          components: {
            contractRisk: data.contractRisk,
            liquidityRisk: data.liquidityRisk,
            centralizationRisk: data.centralizationRisk,
            oracleRisk: data.oracleRisk,
          },
          attestation: {
            signer: data.signer,
            traceHash: data.traceHash,
            timestampUnix: Number(data.timestamp),
            timestampIso: new Date(Number(data.timestamp) * 1000).toISOString(),
          },
          oracleAddress: ORACLE_ADDRESS,
          protocolAddress: addr,
        }
      : null,
  }
  if (output === 'json') {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  if (!hasScore) {
    console.log(`${protocol.name} (${protocol.id})`)
    console.log('  no on-chain score yet — run the tee-worker integrate step to push one')
    return
  }
  console.log(`${protocol.name} (${protocol.id})`)
  console.log(`  aggregate: ${scaledToFloat(data.aggregate)} / 10`)
  console.log(
    `  contract: ${scaledToFloat(data.contractRisk)}  liquidity: ${scaledToFloat(data.liquidityRisk)}  centralization: ${scaledToFloat(data.centralizationRisk)}  oracle: ${scaledToFloat(data.oracleRisk)}`,
  )
  console.log(`  signer:     ${data.signer}`)
  console.log(`  traceHash:  ${data.traceHash}`)
  console.log(`  timestamp:  ${new Date(Number(data.timestamp) * 1000).toISOString()}`)
  console.log(`  oracle:     ${ORACLE_ADDRESS}`)
}

interface RouteActionInput {
  protocolId: string
  actionType: number
  amount: string
}

async function cmdScoreRoute(json: string | undefined, output: 'human' | 'json') {
  if (!json) {
    console.error("Usage: mbg-cli score-route '<actions-json>'")
    console.error(
      'Example: mbg-cli score-route \'[{"protocolId":"aave-v3-mantle","actionType":1,"amount":"1000"}]\'',
    )
    process.exit(1)
  }
  let parsed: RouteActionInput[]
  try {
    parsed = JSON.parse(json) as RouteActionInput[]
  } catch (err) {
    console.error(`invalid JSON: ${(err as Error).message}`)
    process.exit(1)
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.error('actions must be a non-empty array')
    process.exit(1)
  }
  const onchainActions = parsed.map((a) => ({
    protocol: placeholderProtocolAddress(a.protocolId),
    actionType: a.actionType,
    amount: BigInt(a.amount || '0'),
  }))
  const r = await client.readContract({
    address: ORACLE_ADDRESS,
    abi: ORACLE_ABI,
    functionName: 'getRouteScore',
    args: [onchainActions],
  })

  const payload = {
    aggregate: r[0],
    aggregateFloat: scaledToFloat(r[0]),
    compositionPenalty: r[1],
    compositionPenaltyFloat: scaledToFloat(r[1]),
    distinctProtocols: r[2],
    allProtocolsScored: r[3],
    actions: parsed,
    oracleAddress: ORACLE_ADDRESS,
  }
  if (output === 'json') {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  console.log('Route score')
  console.log('-----------')
  console.log(`  aggregate:           ${scaledToFloat(r[0])} / 10`)
  console.log(`  composition penalty: -${scaledToFloat(r[1])}`)
  console.log(`  distinct protocols:  ${r[2]}`)
  console.log(`  all scored:          ${r[3] ? 'yes' : 'no (some legs have no on-chain score yet)'}`)
  console.log(`  oracle:              ${ORACLE_ADDRESS}`)
  console.log()
  console.log('Actions:')
  for (let i = 0; i < parsed.length; i++) {
    const a = parsed[i]!
    console.log(`  ${i + 1}. ${a.protocolId.padEnd(24)} type=${a.actionType}  amount=${a.amount}`)
  }
}

// ─── dispatch ───────────────────────────────────────────────────────────────

async function main() {
  const {cmd, rest, output} = parseArgs(process.argv.slice(2))

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp()
    process.exit(cmd ? 0 : 1)
  }

  switch (cmd) {
    case 'skill':
      await cmdSkill()
      return
    case 'catalog': {
      const sub = rest[0] ?? 'list'
      if (sub === 'list') return cmdCatalogList(output)
      if (sub === 'show') {
        console.error('catalog show <id> not yet implemented in v0; use `catalog list` to see all capabilities')
        process.exit(1)
      }
      console.error(`unknown catalog subcommand: ${sub}`)
      process.exit(1)
      return
    }
    case 'list-protocols':
      return cmdListProtocols(output)
    case 'score-protocol':
      return cmdScoreProtocol(rest[0], output)
    case 'score-route':
      return cmdScoreRoute(rest[0], output)
    default:
      console.error(`unknown command: ${cmd}`)
      printHelp()
      process.exit(1)
  }
}

function printHelp() {
  console.error('mbg-cli — Mantle Bot Gate Skill CLI')
  console.error('')
  console.error('Commands:')
  console.error('  skill                          print full Skill documentation')
  console.error('  catalog list                   list capabilities (machine-readable)')
  console.error('  list-protocols                 enumerate scorable protocols')
  console.error('  score-protocol <id>            current TEE-attested score for one protocol')
  console.error('  score-route \'<actions-json>\'   composite route score')
  console.error('')
  console.error('Flags:')
  console.error('  -o json                        emit JSON instead of human-readable')
  console.error('')
  console.error(`Environment: RPC=${RPC_URL}  chain=${CHAIN_ID}  oracle=${ORACLE_ADDRESS}`)
}

main().catch((err) => {
  console.error('fatal:', err.message ?? err)
  process.exit(1)
})

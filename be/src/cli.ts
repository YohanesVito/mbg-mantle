import { PROTOCOLS, findProtocol } from './protocols/registry'
import { scoreAllProtocols, scoreProtocol } from './index'
import type { ProtocolScore } from './types'

function fmt(n: number): string {
  return n.toFixed(2)
}

function printScore(ps: ProtocolScore): void {
  console.log()
  console.log(`${ps.protocol.name}  (${ps.protocol.id})`)
  console.log('-'.repeat(60))
  console.log(`aggregate: ${fmt(ps.aggregate)} / 10`)
  console.log(ps.reasoning)
  console.log()
  console.log('components:')
  for (const [key, c] of Object.entries(ps.components)) {
    const tag = c.isPlaceholder ? ' [v0-stub]' : ''
    console.log(`  ${key.padEnd(15)} ${fmt(c.score)}${tag}  ${c.reasoning}`)
  }
  console.log()
}

async function main() {
  const arg = process.argv[2]

  if (!arg || arg === 'all') {
    console.log('scoring all registered protocols against Mantle data...')
    const scores = await scoreAllProtocols()
    scores.forEach(printScore)
    console.log()
    console.log('summary (sorted by aggregate score):')
    console.log('-'.repeat(60))
    scores
      .slice()
      .sort((a, b) => b.aggregate - a.aggregate)
      .forEach((s) => {
        console.log(`  ${fmt(s.aggregate).padStart(6)}  ${s.protocol.name}`)
      })
    console.log()
    return
  }

  const protocol = findProtocol(arg)
  if (!protocol) {
    console.error(`unknown protocol: ${arg}`)
    console.error(`known: ${PROTOCOLS.map((p) => p.id).join(', ')}`)
    process.exit(1)
  }

  const score = await scoreProtocol(protocol)
  printScore(score)
}

main().catch((err) => {
  console.error('fatal:', err)
  process.exit(1)
})

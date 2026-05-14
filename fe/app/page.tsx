import Link from 'next/link'
import {fetchAllEntries, formatScore, ORACLE_ADDRESS} from '@/lib/oracle'

export const revalidate = 30
export const dynamic = 'force-dynamic'

function scoreColor(scaled: number | null): string {
  if (scaled === null) return 'text-zinc-600'
  if (scaled >= 700) return 'text-emerald-400'
  if (scaled >= 500) return 'text-amber-300'
  if (scaled >= 300) return 'text-orange-400'
  return 'text-red-400'
}

function ScoreBar({scaled}: {scaled: number | null}) {
  if (scaled === null) {
    return <div className="h-1 w-full rounded bg-zinc-900" />
  }
  const pct = Math.min(100, (scaled / 1000) * 100)
  let bar = 'bg-red-500'
  if (scaled >= 700) bar = 'bg-emerald-500'
  else if (scaled >= 500) bar = 'bg-amber-400'
  else if (scaled >= 300) bar = 'bg-orange-400'
  return (
    <div className="h-1 w-full rounded bg-zinc-900 overflow-hidden">
      <div className={`h-full ${bar}`} style={{width: `${pct}%`}} />
    </div>
  )
}

export default async function LeaderboardPage() {
  const entries = await fetchAllEntries()
  const sorted = entries.slice().sort((a, b) => {
    const aScore = a.score?.aggregate ?? -1
    const bScore = b.score?.aggregate ?? -1
    return bScore - aScore
  })

  const scored = sorted.filter((e) => e.score !== null).length

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <section className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Mantle DeFi protocol risk</h1>
        <p className="text-zinc-400 max-w-3xl">
          Every score below is computed inside a TEE enclave and submitted on-chain. The published
          model + the input data hash + the inference trace are all attested, so an agent
          consulting MBG can prove the score it acted on.
        </p>
        <div className="mt-4 text-xs text-zinc-500 mono">
          oracle: {ORACLE_ADDRESS} · {scored} / {entries.length} protocols scored
        </div>
      </section>

      <section>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-900 text-left text-zinc-500 text-xs uppercase tracking-wide">
              <th className="py-3 pr-4 w-12">#</th>
              <th className="py-3 pr-4">Protocol</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4 text-right">Score</th>
              <th className="py-3 pr-4 w-32">&nbsp;</th>
              <th className="py-3 pr-4 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => {
              const s = entry.score
              const scaled = s?.aggregate ?? null
              const ts = s?.timestamp ?? 0n
              return (
                <tr
                  key={entry.protocol.id}
                  className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors"
                >
                  <td className="py-4 pr-4 text-zinc-500">{i + 1}</td>
                  <td className="py-4 pr-4">
                    <Link
                      href={`/protocol/${entry.protocol.id}`}
                      className="font-medium hover:text-cyan-300 transition-colors"
                    >
                      {entry.protocol.name}
                    </Link>
                    <div className="text-xs text-zinc-500 mt-0.5">{entry.protocol.id}</div>
                  </td>
                  <td className="py-4 pr-4 text-zinc-400 capitalize">{entry.protocol.category}</td>
                  <td className={`py-4 pr-4 text-right tabular-nums ${scoreColor(scaled)}`}>
                    {scaled === null ? 'no score' : formatScore(scaled)}
                  </td>
                  <td className="py-4 pr-4">
                    <ScoreBar scaled={scaled} />
                  </td>
                  <td className="py-4 pr-4 text-right text-xs text-zinc-500 mono">
                    {ts === 0n ? '—' : new Date(Number(ts) * 1000).toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </main>
  )
}

import {PROTOCOLS} from '@/lib/protocols'
import {RouteBuilder} from './route-builder'

export const dynamic = 'force-dynamic'

export default function RoutePage() {
  const protocolOptions = PROTOCOLS.map((p) => ({id: p.id, name: p.name}))

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Route risk checker</h1>
        <p className="text-zinc-400 max-w-2xl">
          Compose a sequence of actions the way an agent would route a user's funds. Score the full
          route in a single on-chain view call. The composition penalty grows with the number of
          distinct protocols — more legs, more cascading failure modes.
        </p>
        <p className="text-zinc-500 text-sm mt-3">
          This is exactly what RealClaw / Brahma / any agent would call against MBG before signing
          on a user's behalf.
        </p>
      </section>

      <RouteBuilder protocols={protocolOptions} />
    </main>
  )
}

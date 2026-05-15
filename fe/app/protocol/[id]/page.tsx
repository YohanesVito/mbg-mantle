import Link from 'next/link'
import {notFound} from 'next/navigation'
import {findProtocol} from '@/lib/protocols'
import {
  fetchProtocolScore,
  formatScore,
  ORACLE_ADDRESS,
  placeholderProtocolAddress,
} from '@/lib/oracle'

export const revalidate = 30
export const dynamic = 'force-dynamic'

function ComponentRow({
  label,
  scaled,
}: {
  label: string
  scaled: number
}) {
  const pct = Math.min(100, (scaled / 1000) * 100)
  let bar = 'bg-red-500'
  if (scaled >= 700) bar = 'bg-emerald-500'
  else if (scaled >= 500) bar = 'bg-amber-400'
  else if (scaled >= 300) bar = 'bg-orange-400'

  return (
    <div className="py-3 border-b border-zinc-900/60 last:border-b-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className="text-sm tabular-nums text-zinc-100 mono">{formatScore(scaled)}</span>
      </div>
      <div className="h-1 w-full rounded bg-zinc-900 overflow-hidden">
        <div className={`h-full ${bar}`} style={{width: `${pct}%`}} />
      </div>
    </div>
  )
}

export default async function ProtocolDetail({
  params,
}: {
  params: Promise<{id: string}>
}) {
  const {id} = await params
  const protocol = findProtocol(id)
  if (!protocol) notFound()

  const score = await fetchProtocolScore(protocol.id)
  const addr = placeholderProtocolAddress(protocol.id)

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← all protocols
      </Link>

      <section className="mt-4 mb-10">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-semibold tracking-tight">{protocol.name}</h1>
          <span className="text-sm text-zinc-500 mono">{protocol.id}</span>
        </div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-3">
          {protocol.category}
        </div>
        <p className="text-zinc-400 max-w-3xl leading-relaxed">{protocol.description}</p>
      </section>

      {score === null ? (
        <section className="rounded-lg border border-zinc-800 p-6">
          <div className="text-zinc-500 mb-2 text-sm">no on-chain score yet</div>
          <div className="text-xs text-zinc-600">
            The off-chain `@mbg/be` engine has the protocol registered, but no TEE-attested score
            has been submitted to the oracle. Run `bun run integrate` in the tee-worker package to
            push a score.
          </div>
        </section>
      ) : (
        <>
          <section className="mb-8">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-sm uppercase tracking-wide text-zinc-500">aggregate</h2>
              <span className="text-4xl font-semibold tabular-nums">
                {formatScore(score.aggregate)}
              </span>
              <span className="text-zinc-500"> / 10</span>
            </div>
            <div className="rounded-lg border border-zinc-800 px-5 py-2">
              <ComponentRow label="contract risk" scaled={score.contractRisk} />
              <ComponentRow label="liquidity risk" scaled={score.liquidityRisk} />
              <ComponentRow label="centralization risk" scaled={score.centralizationRisk} />
              <ComponentRow label="oracle risk" scaled={score.oracleRisk} />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">
              on-chain attestation
            </h2>
            <div className="rounded-lg border border-zinc-800 px-5 py-4 text-sm space-y-2">
              <div className="flex gap-4">
                <span className="text-zinc-500 w-24">signer</span>
                <span className="mono text-zinc-300 break-all">{score.signer}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-zinc-500 w-24">trace hash</span>
                <span className="mono text-zinc-300 break-all">{score.traceHash}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-zinc-500 w-24">timestamp</span>
                <span className="mono text-zinc-300">
                  {new Date(Number(score.timestamp) * 1000).toISOString()}
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-zinc-500 w-24">protocol</span>
                <span className="mono text-zinc-300 break-all">{addr}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-zinc-500 w-24">oracle</span>
                <span className="mono text-zinc-300 break-all">{ORACLE_ADDRESS}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              In production, the signer is derived from an Intel TDX enclave on Phala Cloud. In
              local-dev mode (current), the signer is a fixed attested-EOA fallback. The on-chain
              attestation flow is identical either way.
            </p>
          </section>
        </>
      )}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">audits</h2>
        {protocol.audits.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 px-5 py-4 text-sm text-zinc-500">
            No audits curated in the MBG registry for this protocol. Score reflects this gap.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-900">
            {protocol.audits.map((a, i) => (
              <div key={i} className="px-5 py-3 text-sm flex items-baseline justify-between">
                <div>
                  <span className="text-zinc-200">{a.firm}</span>
                  <span className="text-zinc-500 ml-3 text-xs">{a.date}</span>
                  {a.scope ? (
                    <span className="text-zinc-600 ml-3 text-xs">scope: {a.scope}</span>
                  ) : null}
                </div>
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    report ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {protocol.addresses ? (
        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-3">
            on-chain references (Mantle Mainnet)
          </h2>
          <div className="rounded-lg border border-zinc-800 px-5 py-3 text-sm space-y-1.5">
            {protocol.addresses.aaveOracle && (
              <div className="flex gap-3">
                <span className="text-zinc-500 w-32">aaveOracle</span>
                <a
                  href={`https://mantlescan.xyz/address/${protocol.addresses.aaveOracle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-cyan-400 hover:text-cyan-300 break-all"
                >
                  {protocol.addresses.aaveOracle}
                </a>
              </div>
            )}
            {protocol.addresses.poolDataProvider && (
              <div className="flex gap-3">
                <span className="text-zinc-500 w-32">poolDataProvider</span>
                <a
                  href={`https://mantlescan.xyz/address/${protocol.addresses.poolDataProvider}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-cyan-400 hover:text-cyan-300 break-all"
                >
                  {protocol.addresses.poolDataProvider}
                </a>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  )
}

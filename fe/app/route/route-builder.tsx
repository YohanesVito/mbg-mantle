'use client'

import {useState, useTransition} from 'react'
import {scoreRouteAction, type RouteScoreResult} from './actions'

const ACTION_TYPES = [
  {value: 0, label: 'swap'},
  {value: 1, label: 'lend'},
  {value: 2, label: 'borrow'},
  {value: 3, label: 'stake'},
  {value: 4, label: 'bridge'},
  {value: 255, label: 'other'},
] as const

interface ProtocolOption {
  id: string
  name: string
}

interface ActionRow {
  protocolId: string
  actionType: number
  amount: string
}

function formatScore(scaled: number): string {
  return (scaled / 100).toFixed(2)
}

function scoreColor(scaled: number): string {
  if (scaled >= 700) return 'text-emerald-400'
  if (scaled >= 500) return 'text-amber-300'
  if (scaled >= 300) return 'text-orange-400'
  return 'text-red-400'
}

export function RouteBuilder({protocols}: {protocols: ProtocolOption[]}) {
  const defaultId = protocols[0]?.id ?? ''
  const [rows, setRows] = useState<ActionRow[]>([
    {protocolId: defaultId, actionType: 1, amount: '1000'},
  ])
  const [result, setResult] = useState<RouteScoreResult | null>(null)
  const [pending, startTransition] = useTransition()

  function addRow() {
    setRows((r) => [...r, {protocolId: defaultId, actionType: 0, amount: '0'}])
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i))
  }

  function update(i: number, patch: Partial<ActionRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? {...row, ...patch} : row)))
  }

  function onScore() {
    startTransition(async () => {
      const r = await scoreRouteAction(rows)
      setResult(r)
    })
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-zinc-800 px-5 py-4">
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-3">build the route</div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-zinc-500 tabular-nums text-right">{i + 1}.</span>
              <select
                value={row.protocolId}
                onChange={(e) => update(i, {protocolId: e.target.value})}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 flex-1 text-sm focus:outline-none focus:border-zinc-600"
              >
                {protocols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={row.actionType}
                onChange={(e) => update(i, {actionType: Number(e.target.value)})}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-zinc-600"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={row.amount}
                onChange={(e) => update(i, {amount: e.target.value})}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm w-28 mono focus:outline-none focus:border-zinc-600"
                placeholder="amount"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                className="text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-500 px-2 transition-colors"
                aria-label="remove action"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded px-3 py-1.5 hover:border-zinc-700 transition-colors"
          >
            + add action
          </button>
          <button
            type="button"
            onClick={onScore}
            disabled={pending || rows.length === 0}
            className="text-sm text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded px-4 py-1.5 disabled:opacity-50 transition-colors ml-auto"
          >
            {pending ? 'scoring…' : 'score route'}
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Action type and amount are metadata passed to the on-chain `getRouteScore` call.
          Composition risk is computed from the set of distinct protocols, not from individual
          action types — that's v1.
        </p>
      </div>

      {result && (
        <ResultPanel result={result} />
      )}
    </div>
  )
}

function ResultPanel({result}: {result: RouteScoreResult}) {
  if (!result.ok) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/30 px-5 py-4 text-sm text-red-300">
        {result.error}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-800 px-5 py-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-3">on-chain result</div>

      <div className="flex items-baseline gap-3 mb-5">
        <span className={`text-4xl font-semibold tabular-nums ${scoreColor(result.aggregate)}`}>
          {formatScore(result.aggregate)}
        </span>
        <span className="text-zinc-500">/ 10 route score</span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm mb-5">
        <Cell label="composition penalty" value={`-${formatScore(result.compositionPenalty)}`} />
        <Cell
          label="distinct protocols"
          value={result.distinctProtocols.toString()}
        />
        <Cell
          label="all protocols scored"
          value={result.allProtocolsScored ? 'yes' : 'no'}
          status={result.allProtocolsScored ? 'ok' : 'warn'}
        />
      </div>

      <div className="border-t border-zinc-900 pt-4 text-xs text-zinc-500 space-y-1.5">
        <div className="mono">
          getRouteScore(actions[{result.protocolIds.length}]){' → '}
          (aggregate={result.aggregate}, penalty={result.compositionPenalty}, distinct=
          {result.distinctProtocols}, allScored={String(result.allProtocolsScored)})
        </div>
        <div>
          Composition formula (v0): aggregate = mean(per-protocol scores) − 0.50 × (distinct − 1).
          Same logic an agent calls on-chain before signing.
        </div>
      </div>
    </div>
  )
}

function Cell({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status?: 'ok' | 'warn'
}) {
  const valueColor =
    status === 'ok' ? 'text-emerald-400' : status === 'warn' ? 'text-amber-300' : 'text-zinc-100'
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{label}</div>
      <div className={`text-lg tabular-nums ${valueColor}`}>{value}</div>
    </div>
  )
}

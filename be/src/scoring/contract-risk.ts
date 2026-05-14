import type { ComponentScore, Protocol } from '../types'

const MS_PER_DAY = 86_400_000
const MS_PER_YEAR = 365 * MS_PER_DAY

export function computeContractRisk(protocol: Protocol, now: Date = new Date()): ComponentScore {
  const audits = protocol.audits ?? []
  if (audits.length === 0) {
    return {
      score: 2.0,
      reasoning: 'No audits on record. High contract risk.',
      inputs: { auditCount: 0 },
    }
  }

  const sortedByDate = [...audits].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  )
  const latest = sortedByDate[0]!
  const monthsSinceLatest = (now.getTime() - Date.parse(latest.date)) / (30 * MS_PER_DAY)

  let deployBonus = 0
  if (protocol.deployedAt) {
    const yearsSinceDeploy = (now.getTime() - Date.parse(protocol.deployedAt)) / MS_PER_YEAR
    deployBonus = Math.min(2, Math.max(0, yearsSinceDeploy * 0.7))
  }

  const auditCountFactor = Math.min(2, audits.length * 0.5)

  let recencyPenalty = 0
  if (monthsSinceLatest > 24) recencyPenalty = 3
  else if (monthsSinceLatest > 12) recencyPenalty = 2
  else if (monthsSinceLatest > 6) recencyPenalty = 1

  const baseScore = 5
  const raw = baseScore + deployBonus + auditCountFactor - recencyPenalty
  const score = Math.max(0, Math.min(10, raw))

  const latestDisplay =
    monthsSinceLatest < 12
      ? `${Math.round(monthsSinceLatest)} months ago`
      : `${(monthsSinceLatest / 12).toFixed(1)} years ago`
  const deployDisplay = protocol.deployedAt
    ? `deployed ${((now.getTime() - Date.parse(protocol.deployedAt)) / MS_PER_YEAR).toFixed(1)} years ago`
    : 'deployment date unknown'

  return {
    score: round(score),
    reasoning: `${audits.length} audit(s); most recent: ${latest.firm} ${latestDisplay}; ${deployDisplay}.`,
    inputs: {
      auditCount: audits.length,
      latestAuditFirm: latest.firm,
      monthsSinceLatestAudit: Math.round(monthsSinceLatest),
      deployBonus: round(deployBonus),
      auditCountFactor: round(auditCountFactor),
      recencyPenalty,
    },
  }
}

function round(x: number): number {
  return Math.round(x * 100) / 100
}

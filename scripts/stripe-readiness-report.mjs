import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
  FINANCIAL_RECONCILE_ARTIFACT,
  FINANCIAL_INSPECT_ARTIFACT,
  FINANCIAL_SMOKE_ARTIFACT,
  STRIPE_READINESS_ARTIFACT,
  formatIso,
  readJsonFileIfExists,
  writeJsonFile,
} from './lib/financial-ops.mjs'

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  })

  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal || null,
  }
}

function buildMarkdown(report) {
  const lines = []
  lines.push('# HelpMe Stripe Readiness Report')
  lines.push('')
  lines.push(`- Generated at: ${formatIso(report.generated_at)}`)
  lines.push(`- Decision: **${report.decision.toUpperCase()}**`)
  lines.push(`- Beta closed readiness: ${report.ready_for_beta_closed ? 'Yes' : 'No'}`)
  lines.push('')
  lines.push('## Smoke')
  lines.push(`- Smoke artifact: ${report.smoke.ok ? 'ok' : 'failed'}`)
  lines.push(`- Happy path: ${report.smoke.happy_path_ok ? 'ok' : 'failed'}`)
  lines.push(`- Transfer release: ${report.smoke.release_ok ? 'ok' : 'failed'}`)
  lines.push(`- Resilience checks: ${report.smoke.resilience_ok ? 'ok' : 'failed'}`)
  lines.push('')
  lines.push('## Reconciliation')
  lines.push(`- Status: ${report.reconciliation.status}`)
  lines.push(`- Critical findings: ${report.reconciliation.critical_findings.length}`)
  lines.push(`- Warnings: ${report.reconciliation.warnings.length}`)
  lines.push('')
  lines.push('## Blockers')
  if (report.blockers.length === 0) {
    lines.push('- None')
  } else {
    for (const blocker of report.blockers) {
      lines.push(`- ${blocker}`)
    }
  }
  lines.push('')
  lines.push('## Notes')
  for (const note of report.notes) {
    lines.push(`- ${note}`)
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}

function classifyReport(smoke, reconciliation, inspect) {
  const blockers = []
  const notes = []

  const happyPathOk =
    Boolean(smoke?.ready) &&
    smoke?.steps?.happy_path?.payment_status === 'released' &&
    smoke?.steps?.happy_path?.task_status === 'closed' &&
    smoke?.steps?.happy_path?.transfer_status === 'paid'

  const releaseOk = Boolean(
    smoke?.steps?.release &&
      smoke?.steps?.release?.payment_status === 'transferring' &&
      smoke?.steps?.release?.duplicate === false,
  )

  const resilienceOk = Boolean(smoke?.steps?.resilience)

  if (!smoke?.ready) blockers.push('Financial smoke script did not complete successfully.')
  if (!happyPathOk) blockers.push('Happy path did not end in released payment + closed task + paid transfer.')
  if (!releaseOk) blockers.push('Release path did not create a valid transfer.')
  if (!resilienceOk) blockers.push('Resilience checks were not recorded.')
  if (!reconciliation) blockers.push('Reconciliation artifact is missing.')

  if (reconciliation?.status === 'mismatch') {
    blockers.push('Reconciliation detected critical mismatches.')
  }

  const criticalFindings = reconciliation?.findings?.filter((finding) => finding.level === 'critical') || []
  const warningFindings = reconciliation?.findings?.filter((finding) => finding.level === 'warning') || []

  if (criticalFindings.length > 0) {
    blockers.push('Critical reconciliation findings are still open.')
  }

  if (smoke?.mismatches?.length > 0) {
    notes.push(`${smoke.mismatches.length} expected resilience mismatch case(s) were recorded in the smoke artifact.`)
  }

  if (warningFindings.length > 0) {
    notes.push(`${warningFindings.length} reconciliation warning(s) were observed. They are acceptable only if they match intentional resilience tests.`)
  }

  if (inspect?.summary?.payment?.status) {
    notes.push(`Latest payment status: ${inspect.summary.payment.status}.`)
  }

  const readyForBetaClosed = blockers.length === 0 && reconciliation?.status !== 'mismatch'
  const decision = readyForBetaClosed ? 'ready' : 'not ready'

  return {
    ready_for_beta_closed: readyForBetaClosed,
    decision,
    blockers,
    notes,
    smoke: {
      ok: Boolean(smoke?.ready),
      happy_path_ok: happyPathOk,
      release_ok: releaseOk,
      resilience_ok: resilienceOk,
    },
    reconciliation: {
      status: reconciliation?.status || 'missing',
      critical_findings: criticalFindings,
      warnings: warningFindings,
    },
  }
}

async function main() {
  const smoke = await readJsonFileIfExists(FINANCIAL_SMOKE_ARTIFACT)
  if (!smoke) {
    throw new Error('Smoke artifact not found. Run pnpm run verify:financial-smoke first.')
  }

  const paymentId = smoke?.context?.payment_id || null
  const inspectArgs = paymentId ? ['--payment-id', paymentId] : []
  const reconcileArgs = paymentId ? ['--payment-id', paymentId] : []

  const inspectRun = runNodeScript(resolve('scripts/inspect-financial-state.mjs'), inspectArgs)
  const reconcileRun = runNodeScript(resolve('scripts/reconcile-financial-state.mjs'), reconcileArgs)

  const inspect = await readJsonFileIfExists(FINANCIAL_INSPECT_ARTIFACT)
  const reconciliation = await readJsonFileIfExists(FINANCIAL_RECONCILE_ARTIFACT)

  const report = {
    generated_at: new Date().toISOString(),
    payment_id: paymentId,
    inspect_run: inspectRun,
    reconcile_run: reconcileRun,
    smoke,
    inspect,
    reconciliation,
  }

  const classification = classifyReport(smoke, reconciliation, inspect)
  const finalReport = {
    ...report,
    ...classification,
  }

  await writeJsonFile(STRIPE_READINESS_ARTIFACT, finalReport)

  const markdown = buildMarkdown(finalReport)
  await import('node:fs/promises').then(({ writeFile }) => writeFile(resolve('docs/stripe-readiness.md'), markdown, 'utf8'))

  console.log(markdown)
}

main().catch((error) => {
  const failure = {
    generated_at: new Date().toISOString(),
    ready_for_beta_closed: false,
    decision: 'not ready',
    error: error?.message || String(error),
  }

  writeJsonFile(STRIPE_READINESS_ARTIFACT, failure).catch(() => null)
  import('node:fs/promises')
    .then(({ writeFile }) => writeFile(resolve('docs/stripe-readiness.md'), `# HelpMe Stripe Readiness Report\n\n- Decision: **NOT READY**\n- Error: ${failure.error}\n`, 'utf8'))
    .catch(() => null)
  console.error(failure.error)
  process.exitCode = 1
})

import { resolve } from 'node:path'
import {
  admin,
  writeJsonFile,
} from './lib/financial-ops.mjs'

const DEFAULT_SINCE = '30d'
const DEFAULT_LIMIT = 2000
const DEFAULT_ARTIFACT = resolve(process.cwd(), 'tmp/financial-drift-result.json')
const PAGE_SIZE = 500
const ID_CHUNK_SIZE = 200
const STALE_WEBHOOK_PROCESSING_MS = 5 * 60 * 1000

const ADVANCED_TASK_STATUSES = new Set(['in_progress', 'completed', 'closed'])
const REVIEWED_TASK_STATUSES = new Set(['in_progress', 'completed'])
const VALID_PAID_PAYMENT_STATUSES = new Set([
  'held',
  'transferring',
  'release_pending',
  'released',
  'external_agreed',
])
const MONEY_HELD_PAYMENT_STATUSES = new Set([
  'held',
  'transferring',
  'release_pending',
  'released',
])
const CANCELLED_MONEY_HELD_STATUSES = new Set([
  'held',
  'transferring',
  'release_pending',
])
const TERMINAL_PAYMENT_STATUSES = new Set(['voided', 'failed', 'refunded'])

// Undelivered money is scanned without the --since window: a payment stuck since June
// must not fall off the report just for getting old, or the gate goes green on its own
// while a helper is still unpaid.
const UNDELIVERED_PAYMENT_STATUSES = ['held', 'transferring', 'release_pending']
const WORKER_OWNED_RELEASE_JOB_STATUSES = new Set(['queued', 'processing', 'retry_wait'])
const STALE_RELEASE_JOB_MS = 30 * 60 * 1000

function parseArgs(argv) {
  const args = {
    since: DEFAULT_SINCE,
    limit: DEFAULT_LIMIT,
    strict: false,
    artifactPath: DEFAULT_ARTIFACT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const [flag, inlineValue] = current.split('=', 2)
    const next = argv[index + 1]

    if (flag === '--strict') {
      args.strict = true
      continue
    }

    if (flag === '--since' || flag === '--limit' || flag === '--artifact') {
      const value = inlineValue ?? next
      if (!value) {
        throw new Error(`${flag} requires a value.`)
      }

      if (inlineValue === undefined) {
        index += 1
      }

      if (flag === '--since') args.since = value
      if (flag === '--limit') args.limit = parseLimit(value)
      if (flag === '--artifact') args.artifactPath = resolve(value)
      continue
    }

    throw new Error(`Unknown argument: ${current}`)
  }

  return args
}

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('--limit must be a positive integer.')
  }

  return parsed
}

function resolveSince(value, nowMs = Date.now()) {
  const durationMatch = /^(\d+)d$/i.exec(String(value).trim())

  if (durationMatch) {
    const days = Number.parseInt(durationMatch[1], 10)
    if (days <= 0) {
      throw new Error('--since duration must be greater than zero days.')
    }

    return new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString()
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('--since must be an ISO date or a duration such as 30d.')
  }

  return parsed.toISOString()
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function chunk(values, size = ID_CHUNK_SIZE) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

async function fetchPaged(buildQuery, limit) {
  const rows = []

  while (rows.length < limit) {
    const pageLimit = Math.min(PAGE_SIZE, limit - rows.length)
    const from = rows.length
    const to = from + pageLimit - 1
    const { data, error } = await buildQuery().range(from, to)

    if (error) throw error

    const page = data || []
    rows.push(...page)

    if (page.length < pageLimit) {
      break
    }
  }

  return rows
}

async function fetchByIds(table, select, column, ids) {
  const rows = []

  for (const idChunk of chunk(unique(ids))) {
    const { data, error } = await admin
      .from(table)
      .select(select)
      .in(column, idChunk)

    if (error) throw error
    rows.push(...(data || []))
  }

  return rows
}

function mergeById(...collections) {
  const rowsById = new Map()

  for (const collection of collections) {
    for (const row of collection || []) {
      if (row?.id) rowsById.set(row.id, row)
    }
  }

  return [...rowsById.values()]
}

function groupBy(rows, key) {
  const grouped = new Map()

  for (const row of rows) {
    const value = row?.[key]
    if (!value) continue

    const collection = grouped.get(value) || []
    collection.push(row)
    grouped.set(value, collection)
  }

  return grouped
}

function addFinding(findings, severity, code, entityId, detail) {
  findings.push({
    severity,
    code,
    entity_id: entityId,
    detail,
  })
}

function getTransferSummary(transfersByPaymentId, paymentId) {
  return (transfersByPaymentId.get(paymentId) || []).map((transfer) => ({
    id: transfer.id,
    status: transfer.status,
    stripe_transfer_id: transfer.stripe_transfer_id || null,
  }))
}

function inspectPayments({
  findings,
  payments,
  tasksById,
  transfersByPaymentId,
  jobsByPaymentId,
}) {
  for (const payment of payments) {
    const task = tasksById.get(payment.task_id) || null
    const taskStatus = task?.status || null
    const transferSummary = getTransferSummary(transfersByPaymentId, payment.id)

    if (
      MONEY_HELD_PAYMENT_STATUSES.has(payment.status) &&
      !ADVANCED_TASK_STATUSES.has(taskStatus)
    ) {
      addFinding(
        findings,
        'critical',
        'MONEY_HELD_TASK_NOT_ADVANCED',
        payment.id,
        {
          payment_id: payment.id,
          payment_status: payment.status,
          task_id: payment.task_id,
          task_status: taskStatus,
          transfers: transferSummary,
        },
      )
    }

    // Money confirmed as earned but not delivered. Severity depends on whether the
    // durable queue is actually watching it: a job in flight is normal, no job at all
    // means nothing will ever retry (dead_letter is reported by inspectReleaseJobs).
    if (
      UNDELIVERED_PAYMENT_STATUSES.includes(payment.status)
      && taskStatus === 'completed'
    ) {
      const job = jobsByPaymentId.get(payment.id) || null
      const detail = {
        payment_id: payment.id,
        task_id: payment.task_id,
        payment_status: payment.status,
        reconciliation_status: payment.reconciliation_status,
        release_job: job
          ? { id: job.id, status: job.status, attempts: job.attempt_count, last_error_code: job.last_error_code }
          : null,
        transfers: transferSummary,
      }

      if (!job) {
        addFinding(
          findings,
          'critical',
          'COMPLETED_HELD_PAYMENT_RELEASE_NOT_FINALIZED',
          payment.id,
          { ...detail, note: 'No release job exists: nothing will retry this payment.' },
        )
      } else if (job.status === 'succeeded') {
        addFinding(
          findings,
          'critical',
          'RELEASE_JOB_SUCCEEDED_PAYMENT_NOT_DELIVERED',
          payment.id,
          detail,
        )
      } else if (WORKER_OWNED_RELEASE_JOB_STATUSES.has(job.status)) {
        addFinding(findings, 'warning', 'PAYMENT_RELEASE_IN_FLIGHT', payment.id, detail)
      }
    }

    if (payment.status === 'released' && taskStatus !== 'closed') {
      addFinding(
        findings,
        'critical',
        'RELEASED_TASK_NOT_CLOSED',
        payment.id,
        {
          payment_id: payment.id,
          task_id: payment.task_id,
          task_status: taskStatus,
          transfers: transferSummary,
        },
      )
    }

    if (
      CANCELLED_MONEY_HELD_STATUSES.has(payment.status) &&
      taskStatus === 'cancelled'
    ) {
      addFinding(
        findings,
        'critical',
        'MONEY_HELD_TASK_CANCELLED',
        payment.id,
        {
          payment_id: payment.id,
          payment_status: payment.status,
          task_id: payment.task_id,
          task_status: taskStatus,
          action_required: 'Manual refund review required.',
          transfers: transferSummary,
        },
      )
    }

    if (['mismatch', 'needs_review'].includes(payment.reconciliation_status)) {
      addFinding(
        findings,
        'warning',
        'PAYMENT_NEEDS_REVIEW',
        payment.id,
        {
          payment_id: payment.id,
          task_id: payment.task_id,
          payment_status: payment.status,
          reconciliation_status: payment.reconciliation_status,
        },
      )
    }
  }
}

function inspectTasks({ findings, tasks, paymentsByTaskId }) {
  for (const task of tasks) {
    if (!ADVANCED_TASK_STATUSES.has(task.status)) continue

    const taskPayments = paymentsByTaskId.get(task.id) || []
    const validPayments = taskPayments.filter((payment) =>
      VALID_PAID_PAYMENT_STATUSES.has(payment.status))
    const failedPayments = taskPayments.filter((payment) => payment.status === 'failed')

    if (validPayments.length === 0) {
      addFinding(
        findings,
        'critical',
        'TASK_ADVANCED_NO_PAID_PAYMENT',
        task.id,
        {
          task_id: task.id,
          task_status: task.status,
          payment_statuses: taskPayments.map((payment) => ({
            id: payment.id,
            status: payment.status,
          })),
        },
      )
    }

    if (
      REVIEWED_TASK_STATUSES.has(task.status) &&
      failedPayments.length > 0 &&
      validPayments.length === 0
    ) {
      addFinding(
        findings,
        'critical',
        'TASK_ADVANCED_PAYMENT_FAILED',
        task.id,
        {
          task_id: task.id,
          task_status: task.status,
          failed_payment_ids: failedPayments.map((payment) => payment.id),
        },
      )
    }
  }
}

function inspectDuplicatePayments({ findings, paymentsByTaskId }) {
  for (const [taskId, taskPayments] of paymentsByTaskId.entries()) {
    const activePayments = taskPayments.filter(
      (payment) => !TERMINAL_PAYMENT_STATUSES.has(payment.status),
    )

    if (activePayments.length <= 1) continue

    addFinding(
      findings,
      'warning',
      'DUPLICATE_ACTIVE_PAYMENT',
      taskId,
      {
        task_id: taskId,
        active_payments: activePayments.map((payment) => ({
          id: payment.id,
          status: payment.status,
        })),
      },
    )
  }
}

// The queue is the safety net for undelivered money, so it needs watching too: a job out
// of attempts needs a human, and a job whose turn passed long ago means the worker is not
// running at all (its cron died, or it never got deployed).
function inspectReleaseJobs({ findings, releaseJobs, nowMs }) {
  for (const job of releaseJobs) {
    if (job.status === 'dead_letter') {
      addFinding(findings, 'critical', 'RELEASE_JOB_DEAD_LETTER', job.payment_id, {
        payment_id: job.payment_id,
        task_id: job.task_id,
        job_id: job.id,
        attempts: job.attempt_count,
        last_error_code: job.last_error_code,
        last_error: job.last_error,
        action_required: 'Manual review: the helper has not been paid and retries are exhausted.',
      })
      continue
    }

    if (!WORKER_OWNED_RELEASE_JOB_STATUSES.has(job.status)) continue

    const dueAt = job.status === 'processing' ? job.processing_started_at : job.next_attempt_at
    const dueMs = new Date(dueAt || 0).getTime()
    const overdueMs = Number.isFinite(dueMs) ? nowMs - dueMs : 0

    if (overdueMs > STALE_RELEASE_JOB_MS) {
      addFinding(findings, 'warning', 'RELEASE_JOB_NOT_PICKED_UP', job.payment_id, {
        payment_id: job.payment_id,
        job_id: job.id,
        job_status: job.status,
        overdue_ms: overdueMs,
        attempts: job.attempt_count,
        note: 'The release worker may not be running.',
      })
    }
  }
}

function inspectWebhooks({ findings, webhookEvents, nowMs }) {
  for (const event of webhookEvents) {
    if (event.processing_status === 'failed') {
      addFinding(
        findings,
        'warning',
        'WEBHOOK_FAILED',
        event.id,
        {
          webhook_event_id: event.id,
          stripe_event_id: event.stripe_event_id,
          type: event.type,
          received_at: event.received_at,
          error_message: event.error_message || null,
        },
      )
    }

    if (event.processing_status !== 'processing') continue

    const receivedAtMs = new Date(event.received_at || 0).getTime()
    const ageMs = Number.isFinite(receivedAtMs) ? nowMs - receivedAtMs : 0

    if (ageMs > STALE_WEBHOOK_PROCESSING_MS) {
      addFinding(
        findings,
        'warning',
        'WEBHOOK_STUCK_PROCESSING',
        event.id,
        {
          webhook_event_id: event.id,
          stripe_event_id: event.stripe_event_id,
          type: event.type,
          received_at: event.received_at,
          age_ms: ageMs,
          processing_attempts: event.processing_attempts,
        },
      )
    }
  }
}

function countFindings(findings) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] += 1
      return counts
    },
    { critical: 0, warning: 0 },
  )
}

function printSummary(report, strict) {
  console.log('Financial drift verification')
  console.log(`Window: ${report.window}`)
  console.log(`Critical: ${report.counts.critical}`)
  console.log(`Warnings: ${report.counts.warning}`)
  console.log(`Artifact: ${report.artifact}`)

  if (report.findings.length === 0) {
    console.log('Result: no financial drift findings.')
    return
  }

  console.log('\nFindings:')
  for (const finding of report.findings) {
    console.log(
      `- [${finding.severity.toUpperCase()}] ${finding.code} (${finding.entity_id}): ${JSON.stringify(finding.detail)}`,
    )
  }

  console.log(
    strict
      ? '\nResult: blocked because --strict treats every finding as a failure.'
      : '\nResult: blocked only when critical findings are present.',
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const generatedAt = new Date()
  const generatedAtIso = generatedAt.toISOString()
  const sinceIso = resolveSince(args.since, generatedAt.getTime())

  const recentPayments = await fetchPaged(
    () => admin
      .from('payments')
      .select('id, task_id, status, reconciliation_status, provider, created_at, updated_at')
      .gte('updated_at', sinceIso)
      .order('updated_at', { ascending: false }),
    args.limit,
  )

  // Deliberately unbounded by --since: undelivered money never stops mattering.
  const undeliveredPayments = await fetchPaged(
    () => admin
      .from('payments')
      .select('id, task_id, status, reconciliation_status, provider, created_at, updated_at')
      .in('status', UNDELIVERED_PAYMENT_STATUSES)
      .order('updated_at', { ascending: false }),
    args.limit,
  )

  const recentTasks = await fetchPaged(
    () => admin
      .from('tasks')
      .select('id, status, created_at, updated_at')
      .in('status', ['in_progress', 'completed', 'closed', 'cancelled'])
      .gte('updated_at', sinceIso)
      .order('updated_at', { ascending: false }),
    args.limit,
  )

  const paymentTasks = await fetchByIds(
    'tasks',
    'id, status, created_at, updated_at',
    'id',
    [...recentPayments, ...undeliveredPayments].map((payment) => payment.task_id),
  )
  const relatedPayments = await fetchByIds(
    'payments',
    'id, task_id, status, reconciliation_status, provider, created_at, updated_at',
    'task_id',
    [
      ...recentTasks.map((task) => task.id),
      ...recentPayments.map((payment) => payment.task_id),
    ],
  )

  const payments = mergeById(recentPayments, undeliveredPayments, relatedPayments)
  const tasks = mergeById(recentTasks, paymentTasks)
  const transfers = await fetchByIds(
    'transfers',
    'id, payment_id, status, stripe_transfer_id, created_at, updated_at',
    'payment_id',
    payments.map((payment) => payment.id),
  )
  const webhookEvents = await fetchPaged(
    () => admin
      .from('stripe_webhook_events')
      .select('id, stripe_event_id, type, processing_status, processing_attempts, error_message, received_at, processed_at')
      .in('processing_status', ['failed', 'processing'])
      .gte('received_at', sinceIso)
      .order('received_at', { ascending: false }),
    args.limit,
  )

  const releaseJobs = await fetchByIds(
    'payment_release_jobs',
    'id, payment_id, task_id, status, attempt_count, next_attempt_at, processing_started_at, last_error, last_error_code, updated_at',
    'payment_id',
    payments.map((payment) => payment.id),
  )

  const findings = []
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  const paymentsByTaskId = groupBy(payments, 'task_id')
  const transfersByPaymentId = groupBy(transfers, 'payment_id')
  const jobsByPaymentId = new Map(releaseJobs.map((job) => [job.payment_id, job]))

  inspectPayments({
    findings,
    payments,
    tasksById,
    transfersByPaymentId,
    jobsByPaymentId,
  })
  inspectReleaseJobs({
    findings,
    releaseJobs,
    nowMs: generatedAt.getTime(),
  })
  inspectTasks({
    findings,
    tasks,
    paymentsByTaskId,
  })
  inspectDuplicatePayments({
    findings,
    paymentsByTaskId,
  })
  inspectWebhooks({
    findings,
    webhookEvents,
    nowMs: generatedAt.getTime(),
  })

  findings.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === 'critical' ? -1 : 1
    }

    return left.code.localeCompare(right.code)
  })

  const counts = countFindings(findings)
  const report = {
    generatedAt: generatedAtIso,
    window: `${sinceIso}..${generatedAtIso}`,
    findings,
    counts,
  }

  await writeJsonFile(args.artifactPath, report)
  printSummary({ ...report, artifact: args.artifactPath }, args.strict)

  if (counts.critical > 0 || (args.strict && findings.length > 0)) {
    process.exitCode = 1
  }
}

main().catch(async (error) => {
  const artifactArg = process.argv
    .slice(2)
    .find((value) => value.startsWith('--artifact='))
  const artifactPath = artifactArg
    ? resolve(artifactArg.slice('--artifact='.length))
    : DEFAULT_ARTIFACT
  const failure = {
    generatedAt: new Date().toISOString(),
    window: null,
    findings: [],
    counts: { critical: 0, warning: 0 },
    error: error?.message || String(error),
  }

  await writeJsonFile(artifactPath, failure).catch(() => null)
  console.error(`Financial drift verification failed: ${failure.error}`)
  process.exitCode = 1
})

import { resolve } from 'node:path'
import {
  FINANCIAL_REPLAY_ARTIFACT,
  FINANCIAL_SMOKE_ARTIFACT,
  getWebhookEventByStripeEventId,
  readJsonFileIfExists,
  writeJsonFile,
} from './lib/financial-ops.mjs'
import { processStripeWebhookEvent } from '../server/services/financial.service.js'

function parseArgs(argv) {
  const args = {
    stripeEventId: null,
    eventId: null,
    artifactPath: FINANCIAL_SMOKE_ARTIFACT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--stripe-event-id' || current === '--event-id') {
      args.stripeEventId = next || null
      index += 1
      continue
    }

    if (current === '--artifact') {
      args.artifactPath = next ? resolve(next) : args.artifactPath
      index += 1
      continue
    }

    if (current === '--latest') {
      args.eventId = '__latest__'
    }
  }

  return args
}

function pickLatestEventId(artifact) {
  const events = Array.isArray(artifact?.events) ? artifact.events : []
  const latest = events.at(-1)
  return latest?.event_id || null
}

async function resolveEventId(options) {
  if (options.stripeEventId) return options.stripeEventId
  if (options.eventId && options.eventId !== '__latest__') return options.eventId

  const artifact = await readJsonFileIfExists(options.artifactPath)
  const latestEventId = pickLatestEventId(artifact)
  if (latestEventId) return latestEventId

  return null
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const eventId = await resolveEventId(options)

  if (!eventId) {
    throw new Error('Missing Stripe event id. Pass --stripe-event-id or create a smoke artifact first.')
  }

  const eventRow = await getWebhookEventByStripeEventId(eventId)
  if (!eventRow?.payload) {
    throw new Error(`Stripe webhook event ${eventId} was not found in Supabase.`)
  }

  const beforeStatus = eventRow.processing_status || null
  const replayResult = await processStripeWebhookEvent(eventRow.payload)

  const report = {
    ok: true,
    replayed_at: new Date().toISOString(),
    stripe_event_id: eventId,
    event_type: eventRow.type || eventRow.payload?.type || null,
    before_status: beforeStatus,
    after_status: replayResult?.processed ? 'processed' : replayResult?.processing ? 'processing' : beforeStatus,
    replay_result: replayResult,
    duplicate: Boolean(replayResult?.duplicate),
  }

  await writeJsonFile(FINANCIAL_REPLAY_ARTIFACT, report)

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  const report = {
    ok: false,
    replayed_at: new Date().toISOString(),
    error: error?.message || String(error),
  }

  writeJsonFile(FINANCIAL_REPLAY_ARTIFACT, report).catch(() => null)
  console.error(report.error)
  process.exitCode = 1
})

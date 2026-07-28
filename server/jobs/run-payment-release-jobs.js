import { processPaymentReleaseJobs } from '../services/payment-release-jobs.service.js'

const rawLimit = Number.parseInt(process.env.PAYMENT_RELEASE_JOB_LIMIT || '20', 10)
const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20

async function main() {
  const outcomes = await processPaymentReleaseJobs({ limit })
  const summary = outcomes.reduce((counts, outcome) => {
    const key = outcome?.outcome || 'unknown'
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})

  console.log(JSON.stringify({
    job: 'payment-release',
    processed: outcomes.length,
    summary,
  }))
}

main().catch((error) => {
  console.error('[payment-release-jobs]', error?.stack || error?.message || error)
  process.exitCode = 1
})

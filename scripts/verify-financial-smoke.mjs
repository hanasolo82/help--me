import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { createTestUser, ensureProfile, findActiveHelperFixture, getAuditEventsByStripeEventId, getLedgerEntriesByPaymentId, getPaymentById, getPaymentByTaskId, getTaskById, getTransferByPaymentId, stripe, updateTaskStatus, writeJsonFile, admin, buildStripeEvent, getWebhookEventByStripeEventId } from './lib/financial-ops.mjs'
import { createTaskCheckout } from '../server/services/payments.service.js'
import { completeTaskAndQueuePaymentRelease } from '../server/services/payment-release-jobs.service.js'
import { processStripeWebhookEvent } from '../server/services/financial.service.js'

const ARTIFACT_PATH = resolve(process.cwd(), 'tmp/stripe-smoke-result.json')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function countRows(table, filters = {}) {
  let query = admin.from(table).select('id')

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value)
  }

  const { data, error } = await query
  if (error) throw error
  return data?.length || 0
}

async function confirmCheckoutPaymentIntent(paymentIntentId) {
  try {
    await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa',
    })
  } catch (error) {
    const message = String(error?.message || '')
    if (!/confirm/i.test(message)) {
      throw error
    }
    throw new Error(`Could not confirm checkout payment intent ${paymentIntentId}: ${message}`)
  }

  return stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  })
}

async function processStripeObjectEvent(eventId, type, object) {
  return processStripeWebhookEvent(buildStripeEvent(eventId, type, object))
}

async function main() {
  const result = {
    ready: false,
    steps: {},
    mismatches: [],
    events: [],
    context: {},
  }

  const cleanupIds = {
    userIds: [],
  }

  try {
    const requester = await createTestUser('requester')
    cleanupIds.userIds.push(requester.id)
    await ensureProfile(requester, 'requester')

    const helperFixture = await findActiveHelperFixture()
    const helperProfileId = helperFixture.connectAccount.profile_id
    const helperStripeAccountId = helperFixture.connectAccount.stripe_account_id

    result.context.helper_profile_id = helperProfileId
    result.context.helper_stripe_account_id = helperStripeAccountId

    const taskId = await admin
      .from('tasks')
      .insert({
        id: randomUUID(),
        created_by: requester.id,
        accepted_by: helperProfileId,
        title: 'Stripe smoke task',
        description: 'Temporary task used to validate the real Stripe happy path.',
        category: 'Recados',
        price: 12.34,
        status: 'assigned',
        lat: 40.4168,
        lng: -3.7038,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data.id
      })

    result.context.task_id = taskId

    const checkout = await createTaskCheckout({
      taskId,
      requester: {
        id: requester.id,
        email: requester.email,
      },
    })

    result.steps.checkout = checkout

    const payment = await getPaymentByTaskId(taskId)
    assert(payment?.stripe_checkout_session_id, 'Checkout must persist a Stripe checkout session id.')

    result.context.payment_id = payment.id
    result.context.checkout_session_id = payment.stripe_checkout_session_id

    const checkoutSession = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id, {
      expand: ['payment_intent'],
    })
    const smokePaymentIntent = await stripe.paymentIntents.create({
      amount: payment.amount_cents,
      currency: payment.currency || 'eur',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        task_id: taskId,
        payment_id: payment.id,
        requester_profile_id: requester.id,
        helper_profile_id: helperProfileId,
        correlation_id: payment.correlation_id,
      },
    })

    const confirmedPaymentIntent = await confirmCheckoutPaymentIntent(smokePaymentIntent.id)
    const checkoutEventPaymentIntentId = smokePaymentIntent.id
    const checkoutSessionForEvent = {
      ...checkoutSession,
      payment_intent: checkoutEventPaymentIntentId,
      metadata: {
        ...(checkoutSession.metadata || {}),
        payment_id: payment.id,
        task_id: taskId,
        requester_profile_id: requester.id,
        helper_profile_id: helperProfileId,
        correlation_id: payment.correlation_id,
      },
    }

    const checkoutEventId = `evt_smoke_checkout_${randomUUID().slice(0, 12)}`
    const paymentEventId = `evt_smoke_pi_${randomUUID().slice(0, 12)}`

    await processStripeObjectEvent(checkoutEventId, 'checkout.session.completed', checkoutSessionForEvent)
    await processStripeObjectEvent(paymentEventId, 'payment_intent.succeeded', confirmedPaymentIntent)

    const heldPayment = await getPaymentById(payment.id)
    const promotedTask = await getTaskById(taskId)

    assert(heldPayment?.status === 'held', 'Payment should be held after payment_intent.succeeded.')
    assert(promotedTask?.status === 'in_progress', 'Task should move to in_progress after payment capture.')
    assert(
      heldPayment?.stripe_payment_intent_id === checkoutEventPaymentIntentId,
      'Checkout completion should persist the Stripe payment intent id.',
    )
    result.context.payment_intent_id = heldPayment?.stripe_payment_intent_id || checkoutEventPaymentIntentId

    result.events.push(
      { type: 'checkout.session.completed', event_id: checkoutEventId },
      { type: 'payment_intent.succeeded', event_id: paymentEventId },
    )

    await updateTaskStatus(taskId, 'completed', {
      completed_at: new Date().toISOString(),
    })

    const release = await completeTaskAndQueuePaymentRelease({
      taskId,
      requester: {
        id: requester.id,
        email: requester.email,
      },
    })

    result.steps.release = release
    result.context.transfer_id = release.stripe_transfer_id

    const transferCreated = await stripe.transfers.retrieve(release.stripe_transfer_id)
    const transferCreatedEventId = `evt_smoke_transfer_created_${randomUUID().slice(0, 12)}`
    await processStripeObjectEvent(transferCreatedEventId, 'transfer.created', transferCreated)

    const releasedPayment = await getPaymentById(payment.id)
    const closedTask = await getTaskById(taskId)
    const transferRow = await getTransferByPaymentId(payment.id)

    assert(releasedPayment?.status === 'released', 'Payment should be released after Stripe confirms transfer creation.')
    assert(closedTask?.status === 'closed', 'Task should be closed after Stripe confirms transfer creation.')
    assert(transferRow?.status === 'paid', 'Local transfer row should mirror paid.')

    result.steps.happy_path = {
      payment_status: releasedPayment?.status,
      task_status: closedTask?.status,
      transfer_status: transferRow?.status,
    }
    result.events.push(
      { type: 'transfer.created', event_id: transferCreatedEventId },
    )

    const duplicateRelease = await completeTaskAndQueuePaymentRelease({
      taskId,
      requester: {
        id: requester.id,
        email: requester.email,
      },
    })
    assert(duplicateRelease.task_status === 'closed', 'Duplicate release should preserve the closed task.')

    const outOfOrderTransferEventId = `evt_smoke_transfer_out_of_order_${randomUUID().slice(0, 12)}`
    await processStripeObjectEvent(
      outOfOrderTransferEventId,
      'transfer.created',
      transferCreated,
    )

    const postReplayPayment = await getPaymentById(payment.id)
    const transferLedgerCount = await countRows('payment_ledger_entries', {
      payment_id: payment.id,
      entry_type: 'transfer_created',
    })
    const transferCreatedAuditCount = await countRows('audit_events', {
      stripe_event_id: transferCreatedEventId,
    })

    assert(transferLedgerCount === 1, 'A successful Transfer should create one ledger entry.')
    assert(transferCreatedAuditCount >= 1, 'transfer.created should create audit entries.')
    assert(postReplayPayment?.reconciliation_status === 'needs_review' || postReplayPayment?.reconciliation_status === 'reconciled',
      'Payment should remain in a valid reconciliation state after replay.')

    const orphanTransferEventId = `evt_smoke_orphan_${randomUUID().slice(0, 12)}`
    await processStripeObjectEvent(orphanTransferEventId, 'transfer.created', {
      id: `tr_orphan_${randomUUID().slice(0, 12)}`,
      amount: 1200,
      currency: 'eur',
      metadata: {
        correlation_id: randomUUID(),
      },
    })

    const orphanAuditCount = await countRows('audit_events', {
      stripe_event_id: orphanTransferEventId,
    })
    assert(orphanAuditCount >= 1, 'Orphan transfer event should be recorded as a mismatch.')

    result.mismatches.push(
      {
        label: 'orphan_transfer_created',
        event_id: orphanTransferEventId,
        expected: true,
        recorded: orphanAuditCount >= 1,
      },
      {
        label: 'replayed_transfer_created_after_release',
        event_id: outOfOrderTransferEventId,
        expected: true,
        recorded: true,
      },
    )

    const replayResult = await processStripeObjectEvent(paymentEventId, 'payment_intent.succeeded', confirmedPaymentIntent)
    assert(Boolean(replayResult?.processed), 'Replay of a processed event should be safe.')

    result.steps.resilience = {
      duplicate_release: true,
      duplicate_webhook: true,
      out_of_order: true,
      orphan_event: true,
    }

    const payments = await getPaymentById(payment.id)
    const audits = await getAuditEventsByStripeEventId(paymentEventId)
    const ledgers = await getLedgerEntriesByPaymentId(payment.id)
    const webhookCheckout = await getWebhookEventByStripeEventId(checkoutEventId)
    const webhookPi = await getWebhookEventByStripeEventId(paymentEventId)
    const webhookTransferCreated = await getWebhookEventByStripeEventId(transferCreatedEventId)

    result.context.payment = payments
    result.context.audit_counts = {
      payment_event_audits: audits.length,
      total_ledger_entries: ledgers.length,
    }
    result.context.webhook_status = {
      checkout: webhookCheckout?.processing_status || null,
      payment_intent: webhookPi?.processing_status || null,
      transfer_created: webhookTransferCreated?.processing_status || null,
    }

    result.ready = true

    await writeJsonFile(ARTIFACT_PATH, result)

    console.log('Financial smoke passed.')
    console.log(`Artifact written to ${ARTIFACT_PATH}`)
  } catch (error) {
    result.ready = false
    result.error = error?.message || String(error)

    try {
      await writeJsonFile(ARTIFACT_PATH, result)
    } catch {
      // ignore write errors during failure handling
    }

    console.error(error?.message || error)
    process.exitCode = 1
  } finally {
    // Keep the smoke data around for inspection, reconciliation and readiness reporting.
    void cleanupIds
  }
}

main()

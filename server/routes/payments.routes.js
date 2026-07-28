import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  createExternalPaymentAgreement,
  createTaskCheckout,
  refundHeldPayment,
} from '../services/payments.service.js'
import {
  completeTaskAndQueuePaymentRelease,
  requestPaymentReleaseForPayment,
} from '../services/payment-release-jobs.service.js'

const router = express.Router()

function asyncHandler(handler) {
  return function routeHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

router.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId.trim() : ''

    if (!taskId) {
      return res.status(400).json({
        error: 'Missing taskId.',
      })
    }

    const result = await createTaskCheckout({
      taskId,
      requester: {
        id: req.user.id,
        email: req.user.email || null,
      },
    })

    return res.status(200).json(result)
  }),
)

router.post(
  '/external',
  requireAuth,
  asyncHandler(async (req, res) => {
    const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId.trim() : ''

    if (!taskId) {
      return res.status(400).json({
        error: 'Missing taskId.',
      })
    }

    const result = await createExternalPaymentAgreement({
      taskId,
      requester: {
        id: req.user.id,
        email: req.user.email || null,
      },
    })

    return res.status(200).json(result)
  }),
)

router.post(
  '/:paymentId/refund',
  requireAuth,
  asyncHandler(async (req, res) => {
    const paymentId = typeof req.params?.paymentId === 'string' ? req.params.paymentId.trim() : ''

    if (!paymentId) {
      return res.status(400).json({
        error: 'Missing paymentId.',
      })
    }

    const result = await refundHeldPayment({
      paymentId,
      requester: {
        id: req.user.id,
        email: req.user.email || null,
      },
    })

    return res.status(200).json(result)
  }),
)

router.post(
  '/tasks/:taskId/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const taskId = typeof req.params?.taskId === 'string' ? req.params.taskId.trim() : ''

    if (!taskId) {
      return res.status(400).json({
        error: 'Missing taskId.',
      })
    }

    const result = await completeTaskAndQueuePaymentRelease({
      taskId,
      requester: {
        id: req.user.id,
        email: req.user.email || null,
      },
    })

    return res.status(200).json(result)
  }),
)

router.post(
  '/:paymentId/release',
  requireAuth,
  asyncHandler(async (req, res) => {
    const paymentId = typeof req.params?.paymentId === 'string' ? req.params.paymentId.trim() : ''

    if (!paymentId) {
      return res.status(400).json({
        error: 'Missing paymentId.',
      })
    }

    // Kept for already shipped clients. It now enters the same durable queue;
    // it no longer invokes Stripe from a separate client-triggered step.
    const result = await requestPaymentReleaseForPayment({
      paymentId,
      requester: {
        id: req.user.id,
        email: req.user.email || null,
      },
    })

    return res.status(200).json(result)
  }),
)

export default router

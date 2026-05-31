# Stripe webhook event layer

## Endpoint

- `POST /api/stripe/webhook`

## Security

- Verify the Stripe signature on every request.
- Reject requests without `Stripe-Signature`.
- Never process unsigned payloads.
- Store the raw webhook payload in `stripe_webhook_events`.

## Idempotency

- `stripe_event_id` is unique.
- `received` events are processed once and moved to `processing` and `processed`.
- `failed` events can be retried safely.
- Duplicate processed events are no-ops.
- Ledger writes use a stable `idempotency_key`.
- Audit writes are deduplicated per Stripe event and entity.
- The checkout session path is idempotent at the payment row level, so repeated checkout requests reuse the same local payment when the task has not changed.

## Processing order

1. Persist the event row.
2. Mark it `processing`.
3. Apply the event handler.
4. Write audit entries.
5. Write ledger entries when a local payment exists.
6. Mark it `processed`.
7. On failure, mark it `failed` and record the error.

## Event handling

- `account.updated` syncs Connect state into `connect_accounts`, keeps the legacy profile mirror in sync, and records `connect_account_synced`.
- `checkout.session.completed` links the checkout session to the local payment, records `checkout_completed`, and leaves the payment ready for capture handling.
- `payment_intent.succeeded` records `charge_captured` and `funds_held`, then moves the related task to `in_progress` only when the task still matches the payment participants.
- `payment_intent.payment_failed` records `payment_failed`.
- `charge.refunded` updates the refund mirror, records `refund_succeeded`, and marks the payment for review if the event is out of order.
- `charge.dispute.*` updates the dispute mirror, records dispute ledger entries, and forces `needs_review`.
- `transfer.*` updates the transfer mirror and records transfer ledger entries.
- `payout.*` updates the payout mirror and records payout ledger entries.
- `transfer.created` moves the payment into `transferring`.
- `transfer.paid` marks the payment as `released` and closes the task only when the local task still matches the payment.
- `transfer.failed` returns the payment to `held` and flags the row for review.
- `transfer.reversed` mirrors the reversal and marks the payment for review without reopening the task.
- Any event without a local payment match creates a `reconciliation_mismatch` audit event instead of inventing money state.

## Reconciliation

- If Stripe and Supabase diverge, the local record is marked `needs_review` or `mismatch` at the reconciliation layer.
- If an event arrives out of order, the mirror row is not regressed and the event is flagged for review.
- If the local payment cannot be found, the webhook is still processed safely but the mismatch is recorded.
- Checkout is now part of the flow, and transfer release mirroring is also live.
- Payout, refund, and dispute execution are still out of scope.

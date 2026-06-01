# HelpMe financial foundation and checkout

## Scope

Sprint 1 established the secure financial base for HelpMe without moving money.
Sprint 2 added the Stripe event layer.
Sprint 3A added requester-initiated checkout creation.
Sprint 3B adds the release side of the flow: request-driven transfer creation, local transfer mirroring, and task closing only after `transfer.paid`.

## Canonical tables

- `connect_accounts`
- `payments`
- `payment_ledger_entries`
- `stripe_webhook_events`
- `audit_events`

## Principles

- Store money-related state in Supabase with append-only audit trails.
- Keep Stripe Connect state mirrored in `connect_accounts`.
- Preserve the legacy `profiles` Stripe fields for compatibility until a later sprint.
- Do not expose any client write path for financial state.
- Keep backend/service role as the only writer for financial tables and webhook inboxes.
- Treat `stripe_webhook_events` as an inbox with `received`, `processing`, `processed`, and `failed` states.
- Keep `payment_ledger_entries` append-only and idempotent.
- Never invent a payment locally if Stripe can not be matched to a local payment row.
- Checkout sessions are created from the backend only, using the assigned task as the source of truth.
- The client can only request checkout creation; it never chooses amounts or touches financial rows directly.

## Payment model

The `payments` table remains compatible with the legacy task flow while adding the foundation fields and checkout state:

- `requester_profile_id`
- `helper_profile_id`
- `currency`
- `amount_cents`
- `platform_fee_cents`
- `helper_amount_cents`
- `correlation_id`
- `idempotency_key`
- reconciliation timestamps and status
- `stripe_checkout_session_id`
- `stripe_checkout_session_status`
- `stripe_payment_intent_id`
- `stripe_charge_id`
- `stripe_transfer_id`
- `released_at`

Initial safe statuses are kept conservative and can coexist with legacy values.
`reconciliation_status` is the local source of truth for `pending`, `reconciled`, `mismatch`, and `needs_review`.
Checkout creation moves a payment into `requires_checkout`.
When Stripe confirms capture, the event layer moves the payment to `held` and advances the related task to `in_progress` only if the task still matches the payment participants.
Release creation moves a payment through `release_pending` and `transferring` before the transfer is confirmed.
`transfer.paid` is the only event that closes the task, and it does so only when the local task still matches the payment.

## Webhook scope

The webhook layer now processes these event families:

- `account.updated`
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.*`
- `transfer.*`
- `payout.*`

Handled events write audit rows and, when a local payment exists, ledger rows.
Events that can not be matched to a local payment create `reconciliation_mismatch` audit rows and stop there.
`payment_intent.succeeded` promotes the related task from `assigned` to `in_progress` when the local task and payment still match.
`transfer.created`, `transfer.paid`, `transfer.failed`, and `transfer.reversed` mirror the local transfer row and keep the payment reconciliation state aligned.

## Release and payout

Sprint 3B implements release creation and transfer mirroring, but still does not implement:

- payouts
- refunds
- disputes
- payout execution

Stripe still handles the actual payment capture UI and confirmation. Transfer settlement remains a backend-controlled release step, not a client-side money action.

## Sprint 3

The next sprint should add the remaining money-out flows only if the support and reconciliation path is ready: payouts, refunds, disputes, and operator tooling.

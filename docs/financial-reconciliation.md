# HelpMe — Financial reconciliation (real behavior)

> Authoritative description of what the financial/webhook layer **actually does today**.
> Supersedes the stale "out of scope" wording in `financial-architecture.md`,
> `financial-runbook.md` and `stripe-webhooks.md`. Last reviewed: 2026-06-26 (Phase 3 / Block 4).

## The key distinction: mirror vs. execute

HelpMe **mirrors and records** refunds, disputes, transfers and payouts as financial events
(database mirrors, append-only ledger, audit trail, and `needs_review` flags). What HelpMe **does
not do** is **execute money automatically** for those cases — it never issues a refund, responds to
or resolves a dispute, or launches a payout from application code. Money execution stays manual /
operator-driven, outside beta.

So "refunds/disputes/payouts" are **not** out of scope: their *state* is reconciled. Only their
*execution* is out of scope.

The single exception where the app does move money is the **release transfer**, which is created
explicitly by the requester through the backend (`releasePaymentFunds`) and gated by the existing
idempotent flow. Capture happens through Stripe Checkout.

## What is updated automatically

When a signed, matched Stripe event is processed, the event layer updates local state:

| Stripe event | Payment status effect | Mirror table | Ledger entries | Task effect |
|---|---|---|---|---|
| `checkout.session.completed` | links session; `→ processing` from early states only (anti-race) | — | `checkout_completed` | — |
| `payment_intent.succeeded` | `→ held` (if not already advanced) | — | `charge_captured`, `funds_held` | `assigned → in_progress` (if task still matches) |
| `payment_intent.payment_failed` | `→ failed` (if applicable) | — | `payment_failed` | — |
| `charge.refunded` | `→ refunded` (if applicable) | `refunds` (upsert by payment) | `refund_succeeded` | — |
| `charge.dispute.*` | `→ disputed` (if applicable) | `disputes` | dispute entries | — |
| `transfer.created` | `→ transferring` | `transfers` | `transfer_created` | — |
| `transfer.paid` | `→ released` | `transfers` | `transfer_paid` | `→ closed` (only event that closes a task) |
| `transfer.failed` | back to `held` | `transfers` | `transfer_failed` | — |
| `transfer.reversed` | mirrored; flagged | `transfers` | `transfer_reversed` | task not reopened |
| `payout.*` | — | `payouts` | `payout_paid` / `payout_failed` | — |
| `account.updated` | — | `connect_accounts` (+ legacy profile mirror) | — | — |

All writes go through the **service role only**. Clients have no write path to financial tables
(`payments`, `transfers`, `payment_ledger_entries`, `stripe_webhook_events`, `audit_events`,
`refunds`, `disputes`, `payouts` are revoke-all / read-only-for-participants under RLS).

## Which Stripe events are recorded

Every delivered event is persisted in the `stripe_webhook_events` inbox (raw payload + hash), claimed
atomically (compare-and-swap on `processing_attempts`, see Block 2), processed once, and moved to
`processed`/`failed`. Handled families: `account.updated`, `checkout.session.completed`,
`payment_intent.succeeded|payment_failed`, `charge.refunded`, `charge.dispute.*`, `transfer.*`,
`payout.*`. The ledger is append-only and idempotent (`payment_ledger_entries.idempotency_key` is
`unique`), so duplicate or concurrent deliveries cannot double-write financial rows.

## When a payment is marked `needs_review`

`needs_review` (in `payments.reconciliation_status`) is set automatically when:

- **Out-of-order events:** an event arrives after the local row already advanced past the state it
  implies (e.g. `payment_intent.succeeded` after a later state, refund/fail after a later state).
  The mirror is not regressed; the row is flagged and a `reconciliation_mismatch` audit + ledger
  entry is written.
- **Any dispute event** (`charge.dispute.created|updated|closed`): always forces `needs_review`,
  because a dispute requires human/operator handling.
- **Reconciliation mismatches** found by `reconcile:financial-state` when Stripe and Supabase diverge.
- **Unmatched events:** an event with no local payment match records a `reconciliation_mismatch`
  audit instead of inventing money state (it does not set a payment row, since there is none).

## What requires manual intervention

These are intentionally **not** automated and need an operator:

- **Issuing a refund** (the app mirrors `charge.refunded`, but never calls Stripe to create a refund).
- **Responding to / resolving a dispute** (mirrored and forced to `needs_review`; evidence and
  resolution are handled in the Stripe dashboard).
- **Executing a payout** (mirrored; payouts are Stripe-scheduled / operator-driven).
- **Repairing financial drift** via the supervised `scripts/repair-financial-drift.mjs` (dry-run by
  default; apply requires `--apply --entity --confirm=<hash>`). Never repair from the client.
- **Retrying a stuck/failed transfer** (e.g. `balance_insufficient` in test) through the existing
  idempotent release flow.

Operator guidance: `docs/financial-runbook.md` and `docs/support-playbook.md`. Detector and gate:
`pnpm run verify:financial-drift` (read-only; exit 1 only on `critical`).

## Known warnings that do not block

`verify:financial-drift` currently reports **0 critical, 6 warnings**. They are classified and do not
gate CI (the gate fails only on `critical`):

- **2 × `PAYMENT_NEEDS_REVIEW`** — releases that failed in Stripe **test** with `balance_insufficient`;
  the charge succeeded, only the transfer failed. Resolve by funding the test balance and retrying the
  idempotent release.
- **3 × `PAYMENT_NEEDS_REVIEW`** — `Stripe smoke task` fixtures with a full refund issued after a paid
  transfer. Test fixtures; conserve as evidence or remove with an explicit cleanup procedure.
- **1 × `WEBHOOK_FAILED`** — historical synthetic event `evt_transfer_created_bf473fa8` (stale schema
  cache when `payments.stripe_transfer_id` was added in 0032); its entities no longer exist, so no
  replay applies.

These are real-business or known-fixture signals. Test residue (e.g. a leaked `WEBHOOK_STUCK_PROCESSING`
inbox row) is cleaned up so the detector signal stays meaningful — see Block 4 cleanup in
`.agent-worklog/phase-3-hardening-plan.md`.

## Known limitations (debt, non-blocking)

- **`helper_status` self-service (beta):** a user can set `helper_status='active'` directly; helper
  activation / terms acceptance is client-trusted in beta. No financial or cross-user impact. GA: move
  activation behind a `SECURITY DEFINER` RPC. (Block 3.)
- **`updated_at` self-service:** the profile client sends `updated_at`, so it is not column-protected.
  Low risk (could forge freshness signals); future work is a `before update` touch trigger.
- **`completed_tasks` / `rating` refresh:** after the Block 3 column guard, only the `SECURITY DEFINER`
  review trigger writes these columns, so they refresh on review events, not at task completion. Cosmetic
  lag, not a security issue.
- **Premium not wired into RLS:** `has_active_premium()` / `user_subscriptions` exist but do not gate the
  payment flow; subscription checks live in the service layer. By design for now.
- **Residual TOCTOU in `createIdempotentAuditEvent`:** neutralized in practice by the atomic inbox claim
  (Block 2) — the handler runs once per event, so the audit-transition duplication no longer occurs in the
  double-fire path. Theoretical residual only, no financial impact.

## What stays out of scope

Automatic execution of refunds, disputes and payouts; premium gating in RLS; any client-side repair of
financial state. These are deliberately deferred, documented, and not silently absorbed.

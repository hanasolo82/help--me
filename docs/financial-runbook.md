# HelpMe financial event runbook

## What this sprint covers

- Schema foundation
- RLS foundation
- Connect state mirroring
- Audit and ledger scaffolding
- Webhook inbox persistence
- Stripe event processing
- Idempotent retries
- Reconciliation mismatch tracking
- Checkout session creation from the backend
- Payment state promotion to `in_progress` when capture is confirmed
- Transfer release creation from the backend
- Task closing only after `transfer.paid`

## What it does not cover yet

- transfers
- payouts
- refunds
- disputes
- real money movement

## Operational checks

- Confirm `connect_accounts` exists and mirrors helper Connect state.
- Confirm `payments` is readable only by related users.
- Confirm `payment_ledger_entries`, `stripe_webhook_events`, and `audit_events` are backend-only.
- Confirm `account.updated` still syncs into the legacy profile fields for onboarding compatibility.
- Confirm duplicate webhook delivery does not duplicate audit or ledger rows.
- Confirm out-of-order events mark the payment for review instead of regressing state.
- Confirm missing local payments are recorded as `reconciliation_mismatch`.
- Confirm requester-only checkout creates or reuses a payment row in `requires_checkout`.
- Confirm `payment_intent.succeeded` moves an assigned task to `in_progress` only when the payment still matches the task.
- Confirm requester-only release creates or reuses a transfer row and moves the payment to `transferring`.
- Confirm `transfer.paid` is the only event that closes the task.
- Confirm duplicate transfer delivery does not duplicate audit or ledger rows.
- Confirm out-of-order transfer events mark the payment for review instead of regressing state.

## Incident response

- If Connect data looks wrong, re-run the Stripe sync path and inspect the webhook inbox.
- If a row appears in the ledger or audit tables unexpectedly, verify the caller path before changing data.
- If a webhook is marked `failed`, retry it safely from Stripe or by replaying the event in a controlled environment.
- If Stripe and Supabase disagree, do not repair it from the client; inspect the local payment row, the inbox record, and the audit trail first.
- If checkout creation fails, inspect the assigned task, helper Connect state, and the existing payment row before retrying.
- If release creation fails, inspect the helper Connect state, the existing transfer row, and the payment reconciliation state before retrying.
- Do not use client-side writes to repair financial state.

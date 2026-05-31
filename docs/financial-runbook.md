# HelpMe financial foundation runbook

## What this sprint covers

- Schema foundation
- RLS foundation
- Connect state mirroring
- Audit and ledger scaffolding
- Webhook inbox persistence

## What it does not cover yet

- checkout
- transfers
- payouts
- refunds
- disputes
- release flows
- real money movement

## Operational checks

- Confirm `connect_accounts` exists and mirrors helper Connect state.
- Confirm `payments` is readable only by related users.
- Confirm `payment_ledger_entries`, `stripe_webhook_events`, and `audit_events` are backend-only.
- Confirm `account.updated` still syncs into the legacy profile fields for onboarding compatibility.

## Incident response

- If Connect data looks wrong, re-run the Stripe sync path and inspect the webhook inbox.
- If a row appears in the ledger or audit tables unexpectedly, verify the caller path before changing data.
- Do not use client-side writes to repair financial state.


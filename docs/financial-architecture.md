# HelpMe financial foundation

## Scope

This sprint establishes the secure financial base for HelpMe without moving money.

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

## Payment model

The `payments` table remains compatible with the legacy task flow while adding the foundation fields:

- `requester_profile_id`
- `helper_profile_id`
- `currency`
- `amount_cents`
- `platform_fee_cents`
- `helper_amount_cents`
- `correlation_id`
- `idempotency_key`
- reconciliation timestamps and status

Initial safe statuses are kept conservative and can coexist with legacy values.

## Webhook scope

Only Connect state synchronization is active in this sprint.

- `account.updated` is processed to sync `connect_accounts`
- other Stripe events are persisted to `stripe_webhook_events` but not used for money movement

## No money movement yet

This sprint does not implement:

- checkout
- transfers
- payouts
- refunds
- disputes
- release flows
- real payment capture logic


# Stripe webhook foundation

## Endpoint

- `POST /api/stripe/webhook`

## Security

- Verify the Stripe signature on every request.
- Reject requests without `Stripe-Signature`.
- Never process unsigned payloads.
- Store the raw webhook payload in `stripe_webhook_events`.

## Idempotency

- `stripe_event_id` is unique.
- Duplicate events are no-ops once processed.
- Every backend write path must carry an `idempotency_key` when it is used in later sprints.

## Processing order

1. Persist the event row.
2. Mark it `processing`.
3. Apply the minimal foundation handler.
4. Write audit entries.
5. Mark it `processed`.
6. On failure, mark it `failed` and record the error.

## Event handling

- `account.updated` syncs Connect state into `connect_accounts` and the legacy profile mirror.
- Any other Stripe event is only recorded for auditability and future analysis.

## Reconciliation

- If Stripe and Supabase diverge on Connect state, the local mirror is updated from Stripe and the event is audited.
- No money movement happens in this sprint.


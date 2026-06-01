# HelpMe support playbook

This playbook explains how to use the existing support tools during the closed beta.

## 1. Inspect a payment or task

Use this when a tester reports a payment, release, or closure issue.

### Command

```bash
pnpm run inspect:financial-state
```

### What it shows

- Payment status.
- Task status.
- Transfer status.
- Connect mirror state.
- Ledger and audit counts.
- Webhook inbox counts.

### How to use it

1. Capture the relevant payment or task id from the report.
2. Run the command.
3. Compare local status with the reported issue.
4. Confirm whether the issue is real or expected from a replay test.

## 2. Reconcile state

Use this when Stripe and Supabase appear to disagree.

### Command

```bash
pnpm run reconcile:financial-state
```

### What it does

- Compares local state with Stripe test mode.
- Classifies the row as reconciled, needs review, or mismatch.
- Preserves warnings instead of silently changing business state.

### How to use it

1. Inspect the payment id from the report or smoke artifact.
2. Run the reconciliation command.
3. Read the findings, especially warnings.
4. Escalate only if the findings are critical or unexplainable.

## 3. Replay a webhook

Use this when a webhook is marked failed or when you need to confirm idempotency.

### Command

```bash
pnpm run replay:stripe-webhook
```

### What it does

- Reprocesses the existing webhook payload.
- Verifies duplicate deliveries are no-ops.
- Leaves an artifact of the replay result.

### How to use it

1. Confirm the webhook row exists in `stripe_webhook_events`.
2. Confirm it is safe to replay.
3. Run the replay command.
4. Check that the result does not duplicate ledger or audit rows.

## Incident flows

### Checkout failed

1. Check the assigned task and helper Connect state.
2. Inspect the existing payment row.
3. Use `inspect:financial-state`.
4. If the row is still `requires_checkout`, retry through the normal product path.

### Transfer failed

1. Inspect the transfer row.
2. Confirm the helper Connect account is still valid.
3. Run reconciliation.
4. Replay the webhook only if the inbox row is present and marked failed.

### Mismatch

1. Run inspection first.
2. Run reconciliation next.
3. Compare the result against the smoke artifact.
4. Do not use client-side writes to patch financial state.

### Webhook failed

1. Confirm the event exists in the inbox table.
2. Replay the event.
3. Confirm the replay is idempotent.

## Escalation rules

- If the issue affects money or closure, treat it as urgent.
- If the issue affects onboarding completion, treat it as high priority.
- If the issue is a pure support artifact mismatch, track it but do not change production state.

## Support principle

We should never repair beta finance through ad hoc database edits. Use the toolchain, confirm the state, and let the existing flow decide the next move.

# HelpMe beta runbook

Generated from the current Beta Stabilization state of HelpMe.

## Purpose

This runbook covers how to operate a closed beta safely with real testers while keeping the financial flow constrained to the already validated Stripe test path.

## Tester onboarding

### Requester testers

- Create or reuse a requester account with a clean profile.
- Confirm login and onboarding complete without helper activation.
- Seed at least one draft task and one open task for marketplace QA.

### Helper testers

- Create or reuse a helper account with a complete profile.
- Confirm helper onboarding, Stripe Connect onboarding, skills, availability, and certificates complete.
- Verify helper activation only succeeds after the required profile and Stripe conditions are met.

## Stripe test accounts

### Creation

- Use Stripe Test Mode only.
- Keep one connected helper account per helper tester.
- Keep one platform test account for the platform owner.

### Cleanup

- Delete temporary test accounts after QA cycles where possible.
- Archive any saved test webhook payloads outside the repo.
- Preserve only the smoke artifacts needed for reproducibility.

## Test data

### Required fixtures

- At least one requester tester.
- At least one helper tester.
- At least one third-party profile for negative access checks.
- At least one open task.
- At least one assigned task.
- At least one released payment from the existing financial smoke fixture.

### Data hygiene

- Do not create new financial tables or workaround records.
- Use the existing inspection artifacts when validating state.
- Reset demo tasks only through the normal product flow.

## Support tools

Use these commands when diagnosing beta issues:

- `pnpm run inspect:financial-state`
- `pnpm run reconcile:financial-state`
- `pnpm run replay:stripe-webhook`
- `pnpm run stripe:readiness-report`
- `pnpm run verify:financial-smoke`
- `pnpm run verify:payment-checkout`
- `pnpm run verify:payment-release`

## Incident handling

### Checkout failed

1. Inspect the task assignment, helper Connect state, and the existing payment row.
2. Check the last webhook event in `stripe_webhook_events`.
3. Re-run the checkout only if the local state is still `requires_checkout`.

### Transfer failed

1. Inspect the transfer row and payment reconciliation status.
2. Confirm the helper Connect account is still enabled.
3. Replay the relevant webhook only if the inbox row is present and marked failed.

### Mismatch

1. Inspect the payment row, audit trail, and reconciliation warning.
2. Compare the local state with Stripe test mode.
3. Do not repair financial state from the client.

### Webhook failed

1. Confirm the event exists in `stripe_webhook_events`.
2. Replay with the existing tooling.
3. Treat duplicate deliveries as no-ops.

## Beta checklist

- Login works for requester and helper.
- Onboarding works for both roles.
- Settings persist after refresh.
- Marketplace assignment, acceptance, checkout, release, and closure work.
- Stripe test mode happy path is reproducible.
- Replay, inspection, and reconciliation tooling work.
- No critical lint errors remain.
- No open financial blockers remain.

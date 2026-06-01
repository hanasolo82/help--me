# HelpMe analytics plan

This document audits the current project for observable events and defines the minimum analytics story needed for the beta phase.

## What already exists

### Financial and operational signals

- `stripe_webhook_events` captures webhook inbox state.
- `audit_events` records critical financial and trust transitions.
- `payment_ledger_entries` records internal financial movements.
- `reconciliation_status` on payments captures local consistency.
- `inspect:financial-state`, `reconcile:financial-state`, `replay:stripe-webhook`, `verify:financial-smoke`, and `stripe:readiness-report` already provide operational artifacts.

### Product signals already visible in code/state

- Task creation and publication through the task flow.
- Task assignment and closure.
- Helper onboarding progression.
- Helper activation gating.
- Stripe Connect onboarding return/refresh handling.
- Settings persistence for profile, map, notifications, security, and payments.

### Low-level interaction signals

- Cookie consent preferences.
- Chat typing state tracked through the realtime channel.

## What is missing

- A unified analytics event stream.
- A consistent event naming scheme for product metrics.
- A dashboard or export path for funnel analysis.
- Explicit events for onboarding drop-off, settings saves, and marketplace conversion.

## Recommended events

These are recommended for later implementation, not for this sprint:

- `beta_requester_signup_completed`
- `beta_helper_signup_completed`
- `beta_onboarding_step_completed`
- `beta_helper_activation_started`
- `beta_helper_activation_completed`
- `beta_task_created`
- `beta_task_assigned`
- `beta_checkout_started`
- `beta_checkout_completed`
- `beta_transfer_released`
- `beta_task_closed`
- `beta_settings_saved`
- `beta_support_tool_used`
- `beta_reconciliation_warning_seen`

## Where to measure

### Use existing tables first

- `tasks`
- `payments`
- `transfers`
- `profiles`
- `audit_events`
- `stripe_webhook_events`

### Use document-level artifacts for beta operations

- `docs/stripe-readiness.md`
- `docs/beta-readiness-report.md`
- `tmp/stripe-smoke-result.json`
- `tmp/financial-inspection-result.json`
- `tmp/financial-reconciliation-result.json`

## Recommendation

For beta closed, keep analytics lightweight and mostly operational:

- Measure the funnel from existing tables first.
- Avoid introducing a new analytics vendor before the beta has enough volume to justify it.
- Add a central analytics stream only after the feedback loop proves which metrics actually matter.

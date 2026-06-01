# HelpMe beta metrics

Generated for the closed beta phase.

## Funnel principal

### 1. Task Created

- Definition: a requester creates a draft task that exists in the system.
- Event origin: task creation flow in the requester path.
- Where to measure it: `tasks` table.
- Source: `tasks.created_at`, `tasks.status = 'draft'` or first persisted row.

### 2. Assigned

- Definition: a helper accepts or is assigned the task.
- Event origin: task assignment / acceptance flow.
- Where to measure it: `tasks` table.
- Source: `tasks.accepted_by`, `tasks.status = 'assigned'`, `tasks.accepted_at`.

### 3. Checkout Started

- Definition: checkout is requested and a Stripe Checkout Session is created.
- Event origin: backend checkout creation.
- Where to measure it: `payments` and `stripe_webhook_events`.
- Source: `payments.status = 'requires_checkout'`, `payments.stripe_checkout_session_id`.

### 4. Checkout Completed

- Definition: Stripe confirms the payment intent succeeded.
- Event origin: Stripe webhook `payment_intent.succeeded`.
- Where to measure it: `payments`, `audit_events`, `stripe_webhook_events`.
- Source: `payments.status = 'held'` or `captured`, depending on the local transition used by the release flow.

### 5. Held

- Definition: the payment is safely held in the platform flow and ready for release later.
- Event origin: financial event layer after successful capture.
- Where to measure it: `payments`.
- Source: `payments.status = 'held'`, `payments.reconciliation_status`.

### 6. Released

- Definition: the release flow has created the transfer and Stripe has confirmed the payout path for the helper release.
- Event origin: transfer release flow and `transfer.paid`.
- Where to measure it: `payments`, `transfers`, `audit_events`, `stripe_webhook_events`.
- Source: `payments.status = 'released'`, `transfers.status = 'paid'`.

### 7. Closed

- Definition: the task is fully closed after the release path completes.
- Event origin: transfer paid handler and task closure logic.
- Where to measure it: `tasks`.
- Source: `tasks.status = 'closed'`, `tasks.completed_at`.

## Métricas secundarias

### Helper activation

- Definition: helper onboarding reaches active status.
- Source tables: `profiles`, helper onboarding persistence, Connect mirror.
- Useful signals: `helper_status`, `stripe_onboarding_completed`, `stripe_charges_enabled`, `stripe_payouts_enabled`.

### Onboarding completion

- Definition: onboarding step completion for requester and helper.
- Source tables: onboarding drafts, profile flags, helper onboarding progress artifacts.
- Useful signals: step completion state, saved drafts, resume success rate.

### Checkout conversion

- Definition: percentage of assigned tasks that reach checkout completion.
- Source tables: `tasks`, `payments`, `stripe_webhook_events`.
- Formula: checkout completed / checkout started.

### Closure rate

- Definition: percentage of assigned tasks that reach closed status.
- Source tables: `tasks`.
- Formula: closed / assigned.

### Time to close

- Definition: elapsed time from task creation to task closure.
- Source tables: `tasks`.
- Formula: `tasks.completed_at - tasks.created_at` or `tasks.closed_at - tasks.created_at` depending on the canonical local field used.

## Operational interpretation

- Use these metrics for support review and beta learning, not as vanity reporting.
- Treat reconciliation warnings separately from funnel conversion.
- If the funnel improves but warnings rise, investigate the financial path before celebrating growth.
- If helpers activate but checkout conversion is low, the problem is likely marketplace trust or task clarity rather than Stripe.

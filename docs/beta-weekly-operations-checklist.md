# HelpMe beta weekly operations checklist

Operational checklist for running the closed beta without relying on implicit knowledge.

## Daily checklist

### Onboarding

- Review new requester onboarding completions.
- Review new helper onboarding completions.
- Confirm helper activation only succeeds when Stripe Connect and profile prerequisites are met.
- Check for users stuck mid-onboarding for more than one day.

### Tasks

- Review tasks created today.
- Review tasks assigned today.
- Review tasks completed today.
- Check whether any open task looks stalled or stale.

### Payments

- Review checkouts started today.
- Review checkouts completed today.
- Review releases created today.
- Review transfers marked `paid`.
- Review reconciliation status for the latest payment rows.
- Review any payment row marked `needs_review`.

### Support and safety

- Review incoming support requests.
- Check for reports mentioning money, onboarding, trust, or access problems.
- Confirm there are no unhandled webhook failures in the support artifacts.
- Confirm there are no fresh critical warnings in the readiness artifacts.

## Weekly checklist

### Funnel metrics

- Review Task Created volume.
- Review Assigned volume.
- Review Checkout Started volume.
- Review Checkout Completed volume.
- Review Held volume.
- Review Released volume.
- Review Closed volume.
- Compare the funnel against the previous week.

### Feedback

- Review feedback grouped by UX, Marketplace, Payments, Trust, Performance, and Bugs.
- Separate repeated issues from one-off comments.
- Confirm each piece of feedback has a severity and priority.

### Open bugs

- Review bugs opened during the week.
- Verify which bugs are blocked, fixed, or still reproducible.
- Confirm no critical bug is still unresolved before expanding the beta.

### Financial risk

- Review reconciliation warnings.
- Review any mismatch that needs manual inspection.
- Confirm no financial incident is still untriaged.

### Support

- Review support volume.
- Review support themes.
- Confirm the support playbook is still sufficient for current issues.

## Procedure for a financial incident

Use this when a tester reports checkout, release, transfer, or reconciliation problems.

1. Run `pnpm run inspect:financial-state`.
2. Run `pnpm run reconcile:financial-state`.
3. If the issue looks tied to a webhook replay or failed delivery, run `pnpm run replay:stripe-webhook`.
4. Compare the local payment row, webhook inbox row, and audit trail.
5. Decide whether the result is:
   - expected from a resilience test,
   - a warning that needs review,
   - or a real blocker.
6. Do not repair financial state from the client.

## Procedure for broken onboarding

### Requester

1. Confirm login works.
2. Confirm the onboarding route is reachable.
3. Check whether the user is missing profile data or blocked by validation.
4. Verify the user can return to onboarding after refresh.

### Helper

1. Confirm helper onboarding step progression.
2. Confirm required helper profile fields are present.
3. Confirm skills, availability, certificates, and Stripe Connect state are all in sync.
4. Verify helper activation is only blocked by real prerequisites, not a stale UI or stored draft.

### Stripe onboarding

1. Confirm the helper Connect account exists.
2. Confirm `return` and `refresh` flows still resolve correctly.
3. Confirm charges and payouts flags are still aligned with the helper profile mirror.
4. Escalate if onboarding appears complete locally but the Connect mirror is not updated.

## Procedure for a mismatch

### How to investigate

1. Inspect the payment, task, transfer, and Connect mirror state.
2. Check the latest webhook event in the inbox.
3. Compare the local state with Stripe test mode.
4. Identify whether the mismatch came from an intentional replay, an out-of-order event, or a real divergence.

### How to document

1. Record the payment id and task id.
2. Record the reconciliation status and warning code.
3. Record the last known Stripe event id.
4. Capture whether the issue is expected, benign, or blocking.

### When to escalate

- Escalate immediately if money, closure, or access boundaries are wrong.
- Escalate the same day if the mismatch is reproducible and not explained by a replay test.
- Escalate before expanding the beta if the mismatch is recurring.

## Weekly closeout procedure

### Metrics

- Review the week's funnel numbers.
- Compare against the previous week.
- Note any major drops in conversion or closure.

### Feedback

- Summarize the most common issues by category.
- Keep the summary short and action-oriented.

### Risks

- Review open risks from the beta risk register.
- Mark risks as closed, mitigated, or still active.

### Decision

At the end of the week, choose one:

- Continue beta
- Pause beta
- Expand beta

Use the following rules:

- Continue beta if core flows are stable and no critical blocker is open.
- Pause beta if there is a financial, trust, or access issue that threatens the current testers.
- Expand beta only if the current testers are moving through the funnel cleanly and support load is manageable.

## KPI minimum set

- Task Created
- Assigned
- Checkout Started
- Checkout Completed
- Held
- Released
- Closed

## Traffic-light rules

### Green

- Beta continues.
- No critical incidents are open.
- Weekly support load is manageable.

### Yellow

- Investigate before scaling.
- Metrics or warnings need a closer look.
- Continue only with caution.

### Red

- Pause beta.
- Financial integrity, onboarding completion, or trust is at risk.
- Fix the blocker before adding more testers.

## Operating principle

If a decision needs guesswork, stop and inspect the system. The beta should run on evidence, not memory.

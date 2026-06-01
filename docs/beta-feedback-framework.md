# HelpMe beta feedback framework

This framework defines how to classify and handle feedback during the closed beta.

## Feedback categories

### UX

- Includes clarity, flow, copy, empty states, loading states, and perceived friction.

### Marketplace

- Includes task creation, task discovery, assignment, acceptance, closure, and matching.

### Payments

- Includes checkout, release, transfer status, payment failures, and reconciliation concerns.

### Trust

- Includes helper readiness, profile signals, visibility, and confidence in the marketplace.

### Performance

- Includes slow pages, map sluggishness, long transitions, and degraded responsiveness.

### Bugs

- Includes crashes, broken flows, runtime errors, data inconsistency, and regressions.

## Severity

### Sev 1

- User cannot complete the intended core flow.
- Financial integrity is at risk.
- Security or access boundaries are broken.

### Sev 2

- A core flow is usable but degraded.
- The issue causes repeated support intervention.
- The issue blocks part of the beta learning loop.

### Sev 3

- Cosmetic or minor friction.
- No direct blocker to task completion or beta operation.

## Priority

### P0

- Must fix before continuing the beta or after a short pause.

### P1

- Should fix in the next working cycle.

### P2

- Can be scheduled after the beta stabilizes.

## Internal SLA

- Sev 1 / P0: same day triage, immediate owner assignment.
- Sev 2 / P1: triage within 1 business day.
- Sev 3 / P2: review within the weekly beta review.

## Suggested intake format

- Category
- Severity
- Priority
- Affected role
- Steps to reproduce
- Expected result
- Actual result
- Screenshots or artifact reference
- Whether it affects money, trust, or onboarding

## Triage rules

- Financial issues outrank UI issues.
- Access/security issues outrank cosmetic issues.
- Reproducible bugs outrank vague feedback.
- If a report mentions confusion and a crash, split it into two records.

## Outcome labels

- `accepted`
- `needs_info`
- `scheduled`
- `fixed`
- `won't_fix_for_beta`

## Operating principle

Beta feedback should help us decide what to stabilize next, not generate a long wishlist. Keep the loop short, traceable, and kind to the tester.

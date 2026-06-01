# HelpMe beta risk register

## Technical risks

### 1. Reconciliation warnings are misread as failures

- Impact: medium
- Probability: medium
- Mitigation: train support to distinguish intentional replay warnings from real mismatches; use `reconcile:financial-state` and `inspect:financial-state` before escalating.

### 2. Large client bundle slows perceived responsiveness

- Impact: medium
- Probability: medium
- Mitigation: monitor the Vite chunk warning, prioritize code splitting after beta learning, and avoid adding more heavy client paths during beta.

### 3. A hook/runtime regression reappears in a legacy component

- Impact: high
- Probability: low to medium
- Mitigation: keep lint in CI and treat hook warnings as release blockers.

## Product risks

### 4. Requesters do not complete onboarding

- Impact: high
- Probability: medium
- Mitigation: keep onboarding copy and support guidance tight; review drop-off in week 1.

### 5. Helpers fail to activate because the prerequisite story is unclear

- Impact: high
- Probability: medium
- Mitigation: track activation failures and support questions; adjust guidance, not architecture.

### 6. Marketplace supply and demand are imbalanced

- Impact: high
- Probability: medium
- Mitigation: control beta size and onboard testers in balanced waves.

## Operational risks

### 7. Support tools are not used consistently

- Impact: medium
- Probability: medium
- Mitigation: keep the support playbook short and require inspection before manual intervention.

### 8. Test data becomes messy across multiple beta cycles

- Impact: medium
- Probability: medium
- Mitigation: use named fixtures, archive artifacts, and avoid ad hoc records.

### 9. Beta feedback is not categorized well enough

- Impact: medium
- Probability: medium
- Mitigation: force a single intake schema with severity and category.

## Financial risks

### 10. A checkout/release state mismatch is mistaken for a completed payment

- Impact: high
- Probability: low
- Mitigation: rely on the readiness report, smoke artifacts, and reconciliation checks before opening the beta wider.

### 11. Duplicate webhook handling regresses under load

- Impact: high
- Probability: low
- Mitigation: keep replay testing as part of support and watch `stripe_webhook_events` uniqueness.

### 12. Stripe test assumptions leak into production thinking

- Impact: high
- Probability: low to medium
- Mitigation: label all closed-beta finance docs as test-mode validated, not production-proven.

## Highest-priority watchlist

- Checkout/release mismatch.
- Onboarding drop-off.
- Helper activation confusion.
- Support tooling misuse.
- Reconciliation warnings turning into ignored noise.

# HelpMe beta launch plan

Generated for the closed beta launch phase.

## Launch goal

Run a controlled beta with real users to learn quickly, keep operational risk low, and protect the validated financial flow.

## Week 1

### Tester count

- Requesters: 8 to 12
- Helpers: 4 to 6
- Third-party negative-test profiles: 1 to 2

### Tester profiles

- Requesters who need help locally and can create real tasks.
- Helpers who can complete tasks and finish onboarding.
- A small number of internal/test-only reviewers for support and access checks.

### Expected volume

- 20 to 40 tasks created
- 10 to 20 tasks assigned
- 5 to 10 checkout attempts
- 3 to 8 completed releases

### Operating objective

- Validate that the core loop stays stable under real usage.
- Watch for onboarding drop-off, checkout friction, and support requests.
- Keep the team small enough that every issue can be reviewed manually.

## Week 2

### Controlled expansion

- Requesters: 15 to 25
- Helpers: 8 to 12
- Add new testers only after the week 1 flow remains stable.

### What should expand

- More task creation volume.
- More repeated marketplace usage from the same testers.
- More helper activation attempts from late joiners.

### What should not expand

- No new financial features.
- No new release paths.
- No new experimental onboarding branches.

## Stop criteria

Pause the beta if any of these happen:

### Financial errors

- A checkout fails in a way that leaves state inconsistent.
- A release closes the wrong task or duplicates a financial row.
- Reconciliation shows a critical mismatch that cannot be explained by a replay test.

### Onboarding errors

- Requester or helper onboarding blocks users from completing the intended flow.
- Helper activation fails for reasons unrelated to required profile or Stripe prerequisites.

### Trust problems

- Users cannot tell whether a helper is ready.
- Public trust signals diverge from the private state.
- A tester reports seeing private financial or certificate data they should not see.

## Success criteria

- Tasks are created successfully and survive refresh.
- Tasks are assigned and completed without manual repair.
- Payments complete and release correctly in Stripe test mode.
- Closed-beta users can complete the intended marketplace loop end to end.
- The support team can inspect, reconcile, and replay safely when needed.

## Recommended launch size

- Start with a **small closed beta**: roughly 12 to 18 total testers in week 1.
- Expand only if the week 1 loop remains stable and support load stays low.
- This is intentionally conservative because the product is ready, but the operational surface is still young.

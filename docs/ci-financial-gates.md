# CI financial gates

> What the CI gate runs, when, with which secrets, and the operational response to each failure.
> Workflow: `.github/workflows/ci.yml`. Aligned with `docs/financial-runbook.md` and
> `docs/financial-reconciliation.md`. Last reviewed: 2026-06-26 (Phase 3 / Block 4).

## Triggers

- `push` to `main`
- `pull_request` (any branch; fork PRs run `quality` only — see guard below)
- `workflow_dispatch` (manual)

`concurrency` cancels superseded runs of the same ref. `permissions: contents: read`.

## Job 1 — `quality` (always)

Runs on every push, PR and manual dispatch. No secrets.

1. `actions/checkout`
2. `pnpm/action-setup` (version from `packageManager` in `package.json`, pnpm 10.33.0)
3. `actions/setup-node` (Node 22, pnpm cache)
4. `pnpm install --frozen-lockfile`
5. `pnpm run lint`
6. `pnpm run build`

**Failure meaning / response:**
- `install` fails → lockfile drift; run `pnpm install` locally and commit `pnpm-lock.yaml`.
- `lint` fails → fix the reported rule violations (eslint).
- `build` fails → fix the Vite build error. The "large chunk" warning is known and does not fail the build.

## Job 2 — `financial-verify` (read-only, secret-gated)

Runs after `quality`. Two conditions must hold:

- **Not a fork PR:** `if: github.event_name != 'pull_request' || head.repo.full_name == github.repository`.
  Fork PRs have no access to repo secrets, so this job is skipped for them.
- **Secrets present:** a `preflight` step checks the five secrets and sets `have_secrets`. If any is
  missing, it emits a `::notice` and every verifier step is **skipped (not failed)**.

### Required secrets (point them at TEST / staging, never production)

| Secret | Why |
|---|---|
| `SUPABASE_URL` | required by `scripts/lib/financial-ops.mjs` at import |
| `SUPABASE_ANON_KEY` | RLS verifiers sign in as real users (anon + JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | read all rows / create+clean TEST fixtures |
| `STRIPE_SECRET_KEY` | `server/services/stripe.service.js` builds `new Stripe(...)` at import; without it the verifiers crash on load |
| `STRIPE_WEBHOOK_SECRET` | event-layer signature construction |

### Verifiers (in order)

1. `verify:stripe-event-layer` — synthetic events through the webhook layer; self-cleaning.
2. `verify:webhook-reliability` — concurrency / inbox claim; self-cleaning.
3. `verify:rls-payment-gate` — RLS payment gate (12 cases).
4. `verify:rls-ownership` — RLS ownership / column guards / delete guard (34 cases).
5. `verify:financial-drift` — read-only detector; **exit 1 only on `critical`**.

All five are **read-only or test-safe**: they only read, or create-and-clean TEST data. None call
`transfers.create` / `refunds.create` / `payouts.create` / `accounts.create`, so the gate never moves
money. `repair:financial-drift` is **never** run in CI.

### Failure meaning / response

| Failing step | Meaning | Response |
|---|---|---|
| `verify:stripe-event-layer` | event handling / mirroring regression | inspect the handler diff; replay locally |
| `verify:webhook-reliability` | inbox claim / idempotency regression | check the atomic claim (Block 2) and ledger unique key |
| `verify:rls-payment-gate` | a payment-gate RLS rule opened up | review the policy/migration that changed |
| `verify:rls-ownership` | ownership / column / delete guard opened up | review `0041`/`0043` and the offending table |
| `verify:financial-drift` (critical) | real money/task divergence | follow `docs/financial-runbook.md`; never repair from the client; use the supervised `repair-financial-drift.mjs` dry-run first |

The **6 known warnings** of `verify:financial-drift` (2 `balance_insufficient` test releases, 3 smoke
fixtures with refund, 1 historical synthetic webhook) **do not fail CI** — the gate fails only on
`critical`. They are classified in `docs/financial-reconciliation.md`.

## What is intentionally NOT in CI

- Money-moving / heavy Stripe scripts: `verify:financial-smoke`, `verify:payment-checkout`,
  `verify:payment-release`, `reconcile:financial-state`, `stripe:readiness-report`. They create
  objects in Stripe test and leave data for inspection; run them manually or on a nightly/dispatch.
- `repair:financial-drift` (supervised, writes state). Operator-only, never in CI.

## Local mirror of the gate

```
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
pnpm run verify:stripe-event-layer
pnpm run verify:webhook-reliability
pnpm run verify:rls-payment-gate
pnpm run verify:rls-ownership
pnpm run verify:financial-drift
```

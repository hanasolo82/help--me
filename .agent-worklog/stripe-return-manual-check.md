# Stripe Return Manual Check

## Scope
- Validate the visible payment-return bridge after webhook/RLS critical checks.
- Do not reopen webhook reliability, RLS payment gate, styling, Figma, or broader architecture.

## Method
- Code-path review of `src/pages/Stripe/StripeReturn.jsx`.
- Cross-check against `src/pages/TaskDetail/TaskDetail.jsx` chat gating.
- Browser-level visual evidence was not captured in this run because the current workspace has no Playwright/jsdom/vitest dependency available and no in-app browser tool was exposed in this session.

## Checklist

| Check | Result | Evidence |
|---|---|---|
| Redirect from Stripe does not immediately claim final success | Pass | Payment flow initial title/message is `Confirmando tu pago` / `Estamos confirmando tu pago con Stripe...`. |
| No `Pago recibido` copy in Stripe Return | Pass | No active `Pago recibido` string found in `StripeReturn.jsx`. |
| `Pago confirmado` appears only after task reaches `in_progress` | Pass | `checkingState` changes to `confirmed` only when `latestTask?.status === 'in_progress'`. |
| Chat is not opened before webhook-backed task promotion | Pass | `openChat: true` is only passed during the `in_progress` branch. |
| Manual CTA during waiting does not open chat | Pass | Waiting CTA is `Volver al detalle`; it passes payment context only. |
| Long wait/timeout does not promise success | Pass | After poll exhaustion, copy says `Todavía estamos confirmando la tarea...`. |
| Task detail keeps chat gated before payment | Pass | `canOpenChat` only allows `in_progress`, `completed`, or `closed`. `assigned` remains the decision gate. |

## Notes
- `PAYMENT_POLL_ATTEMPTS` is 8 and `PAYMENT_POLL_INTERVAL_MS` is 1500, so the pending fallback appears after roughly 12 seconds.
- Non-`assigned`, non-`in_progress` statuses use a neutral redirect path back to task detail without `openChat`.
- The check is strong enough to unblock QA UX/P0 planning, but a final human/device pass should still confirm the actual rendered copy during a real Stripe test redirect.

## Verdict
- Stripe Return code-path check: Passed.
- Visual/manual browser evidence: Pending.
- Recommended next phase: QA UX/P0 flow pass for `Oferta pendiente -> pago -> retorno -> chat -> cierre -> review`.

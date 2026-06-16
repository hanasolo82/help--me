# HelpMe Critical Flow

Critical flow:
helper accepts -> requester decides -> pay -> Stripe return -> chat -> close -> review

## 1. Helper accepts

- `actual`: the helper acceptance action moves the task to `assigned`.
- `actual`: a task conversation is created at acceptance time, but the UI should still treat the task as a pending requester decision.
- `risk`: if any surface frames `assigned` as "already handled", the funnel starts to leak.

## 2. Requester decides

- `actual`: the requester sees `Aroa ha aceptado tu tarea` as the decision gate headline.
- `actual`: the requester should see task name, short description, price, and a compact helper card.
- `actual`: the main CTA is `Confirmar y pagar`.
- `actual`: the secondary CTA is `Rechazar helper` only if the safe rejection RPC is available.
- `recommended`: `Ver perfil` stays tertiary and should never displace the critical CTAs.

## 3. Pay

- `actual`: the dedicated payment page is `/task/:id/payment`.
- `actual`: the main CTA is again `Confirmar y pagar`.
- `actual`: premium-assisted payment remains secondary.
- `risk`: checkout can complete before the webhook updates the task state.

## 4. Stripe return

- `actual`: return copy should say `Pago recibido` and `Estamos confirmando la tarea. Esto puede tardar unos segundos.`
- `actual`: the return screen invalidates queries and polls for the task to reach `in_progress`.
- `actual`: if the state is still pending, the user should return to detail without claiming confirmation too early.
- `risk`: showing success before webhook-backed promotion creates false confidence.

## 5. Chat

- `actual`: once the backend state is `in_progress`, the task can open chat.
- `actual`: chat is a consequence of confirmed payment and promoted task state.
- `recommended`: keep chat accessible from detail, not as a shortcut from the pending decision state.

## 6. Close

- `actual`: `/complete/:id` is the requester close screen.
- `actual`: closing confirms the task and releases funds.
- `risk`: if close is shown before the task is genuinely in progress or completed, the money-flow narrative breaks.

## 7. Review

- `actual`: review appears after completion or closure and only when the helper exists.
- `actual`: once the review is saved, the task detail reflects the saved state.
- `recommended`: treat review as an endpoint, not another path back into payment or chat.

## Figma Notes

- `recommended`: represent the critical flow as one linear lane with one exception for the optional safe rejection path.
- `recommended`: label the webhook wait state explicitly so design does not imply instant settlement.
- `risk`: any frame that routes `assigned` to chat first is a broken loop.

# HelpMe Figma Flow Spec

Scope: documentation of the real app workflow for Figma design. This file does not change code, backend, or product logic.

Legend:
- `actual`: behavior that exists in the current app
- `recommended`: design guidance for Figma or future product framing
- `risk`: loop, ambiguity, or funnel leak to avoid

## Frontend Route Map

| Route | Screen | Role | State gate | Notes |
|---|---|---|---|---|
| `/` | Landing | Guest | None | `actual` public entry point |
| `/login` | Login | Guest | None | auth gate before protected routes |
| `/forgot-password` | Forgot password | Guest | None | auth recovery |
| `/reset-password` | Reset password | Guest | None | auth recovery |
| `/auth/callback` | Auth callback | Guest | None | OAuth/session handoff |
| `/legal/terms` | Terms | Any | None | legal |
| `/legal/privacy` | Privacy | Any | None | legal |
| `/legal/cookies` | Cookies | Any | None | legal |
| `/legal/community-guidelines` | Community guidelines | Any | None | legal |
| `/onboarding` | Onboarding shell | Helper | profile completion | nested steps |
| `/onboarding/skills` | Skills | Helper | onboarding | profile setup |
| `/onboarding/location` | Location | Helper | onboarding | profile setup |
| `/onboarding/availability` | Availability | Helper | onboarding | profile setup |
| `/onboarding/verification` | Verification | Helper | onboarding | profile setup |
| `/home` | Home | Requester / Helper | role switch | main dashboard |
| `/task/:id` | Task detail | Requester / Helper | task status | critical decision surface |
| `/task/:id/payment` | Task payment | Requester | `assigned` | checkout screen |
| `/task/:id/review` | Task review | Requester | `completed` or `closed` + accepted helper | post-close review |
| `/complete/:id` | Task complete | Requester | `in_progress` or `completed` | task close / funds release |
| `/chat/:id` | Chat detail | Requester / Helper | chat exists | private conversation |
| `/chats` | Chats list | Requester / Helper | chat access | inbox surface |
| `/profile/:id` | Public profile | Requester / Helper | profile exists | helper profile view |
| `/profile` | Own profile | Signed in user | current profile | public profile editor/view |
| `/settings` | Settings | Signed in user | auth | profile, map, notifications, payments, security |
| `/stripe/return` | Stripe return | Signed in user | flow param | helper onboarding and payment return |
| `/stripe/refresh` | Stripe refresh | Signed in user | Stripe flow | external onboarding refresh |
| `/create` | Create task | Requester | auth | task creation |

## Backend Routes And Side Effects

| Endpoint / service | Purpose | Triggered by | Side effect | Risk |
|---|---|---|---|---|
| `POST /api/payments/checkout` | Create task checkout session | `TaskPaymentPage` | creates Stripe checkout URL | `risk`: webhook lag before UI update |
| `POST /api/payments/external` | Confirm premium-assisted external payment agreement | `TaskPaymentPage` | records premium payment agreement | `risk`: should stay secondary |
| `POST /api/payments/:paymentId/release` | Release funds | `TaskComplete` | marks payment released | `actual` critical closure action |
| `POST /api/stripe/connect/account` | Start Connect onboarding | Settings payments / helper onboarding | opens Stripe Connect | `actual` helper setup |
| `POST /api/stripe/connect/account-link` | Generate onboarding link | Stripe helper setup | redirect to Stripe | `actual` external handoff |
| `GET /api/stripe/connect/account-status` | Sync Connect status | `StripeReturn` | refreshes helper payment capability | `actual` helper state sync |
| `POST /api/stripe/webhook` | Stripe webhook receiver | Stripe | promotes payment/task state | `risk`: async timing |
| `reject_assigned_helper` RPC | Safe requester-side rejection of accepted helper | `TaskDetail` | clears `accepted_by`, returns task to open | `actual` safe only on requester side |
| `createOrGetTaskConversation` | Create task chat thread | task acceptance | creates conversation even before UI exposes chat | `risk`: backend exists before payment state |
| `getOrCreateChatByTaskId` | Resolve task chat | task completion / detail | opens or fetches private chat | `actual` used on close and chat entry |
| `createTaskReview` | Save review | review page | persists rating/review | `actual` post-close side effect |
| `markTaskCompleted` | Mark task done | close page | moves task to `completed` | `actual` requester close action |
| `releaseTaskPayment` | Release funds after completion | close page | final payment release | `actual` money movement |

## Requester Flow

1. Requester lands on `/home` and sees home content, header notifications, task feed, and the drawer for their own requests.
2. When a helper accepts a task, the requester's `assigned` task appears as `Oferta pendiente` in the bell, drawer, and task detail.
3. `actual`: the decision gate lives in `/task/:id` and is the first thing the requester should read for `assigned`.
4. `recommended`: Figma should frame this as a decision gate, not as a normal detail view or generic notification.
5. Primary action is `Confirmar y pagar`.
6. Secondary action is `Rechazar helper` only if the safe rejection RPC remains available.
7. Tertiary action is `Ver perfil`, but it must not replace the two critical actions.
8. After payment, the flow returns to task detail and then into chat once the backend has promoted the task to `in_progress`.
9. Once the task is `in_progress`, the requester can open chat, continue coordination, and later close the task from `/complete/:id`.
10. After closure, the requester can review the helper from `/task/:id/review`.

## Helper Flow

1. Helper lands on `/home` in helper mode and sees open tasks, map filters, and helper-specific panels.
2. Open task detail allows the helper to inspect a task and accept it.
3. When the helper accepts, the task becomes `assigned` and is visible in helper upcoming panels and the requester's decision gate.
4. `actual`: chat is not the primary next step for `assigned`; the helper should wait for the requester to confirm and pay.
5. `recommended`: helper-facing surfaces should emphasize "pending requester decision" rather than "work has started".
6. Helper profile and settings continue to drive availability, skills, and payout setup.

## Payment Flow

1. The payable state is `assigned` and requester-owned.
2. `/task/:id/payment` is the dedicated checkout screen.
3. `actual`: the main CTA is `Confirmar y pagar`.
4. `actual`: the premium-assisted path stays secondary and should not overshadow the main payment CTA.
5. `risk`: checkout redirection can complete before the webhook updates task status.
6. `actual`: `StripeReturn` polls the task and should remain pending until the task reaches `in_progress`.
7. `recommended`: if the state is still not updated, keep the user on a pending confirmation screen with a return-to-detail action.

## Chat Flow

1. Chat is a consequence of accepted work, not the first place the requester should go from `assigned`.
2. Task chat exists as a private conversation tied to the task.
3. `actual`: `/chat/:id` is the chat detail screen and `/chats` is the list/inbox.
4. `risk`: any shortcut that opens chat from `assigned` before confirmation creates a funnel leak.
5. `recommended`: in Figma, show chat as available after payment/promotion, not as a competing CTA in the decision gate.

## Closure Flow

1. `/complete/:id` is the close-the-task screen for the requester.
2. `actual`: the close action updates the task to `completed` and then releases payment.
3. If the task is not in a closeable state, the screen falls back to a return path instead of pretending to finish the job.
4. `actual`: the close flow may also reopen chat when appropriate.

## Review Flow

1. Review is available only after completion or closure and only if a helper is attached.
2. `/task/:id/review` creates the review and invalidates task and profile review caches.
3. `actual`: an existing review should show as already published and stop the user from duplicating the action.
4. `recommended`: the review frame should be visually separate from payment and closure to avoid confusing it with money movement.

## Profile And Settings Flow

1. `/profile/:id` shows a public profile for another user.
2. Own profile uses `/profile` and opens settings from there.
3. `actual`: the own-profile action is `Editar perfil`, which routes to settings.
4. `actual`: guest-profile actions are `Contactar`, `Invitar a tarea`, and favorite toggle.
5. `/settings` groups `Perfil`, `Mapa y ubicación`, `Notificaciones`, `Pagos`, `Apariencia`, and `Seguridad`.
6. `actual`: settings back action saves dirty changes before leaving when necessary.

## Task States

| Technical state | User meaning | Visibility note |
|---|---|---|
| `draft` | Draft | requester only |
| `open` | Activa / publicada | requester and helper can see it |
| `assigned` | Oferta pendiente | requester and assigned helper can see it |
| `in_progress` | En curso | requester and helper can see it |
| `completed` | Completada | requester and helper can see it |
| `closed` | Cerrada | requester and helper can see it |
| `cancelled` | Cancelada | requester and helper can see it |

## CTA Visibility Rules

- `assigned` on requester detail must open the decision gate directly.
- The bell badge must remain visible while any task stays `assigned`.
- The bell disappears only after confirm-and-pay, reject-helper, or a state change away from `assigned`.
- Do not use localStorage to mark acceptance as read.
- Do not send the requester to the full profile as the main step.
- Do not use `Revisar helper` as the primary CTA in the critical gate.
- Keep `Confirmar y pagar` as the main CTA.
- Keep `Rechazar helper` only if the safe rejection operation exists.
- `TaskPaymentPage` should stay simple and payment-centric.
- `StripeReturn` should not promise success until the backend state is real.

## Risks Of Loops

- `risk`: a task can jump from helper acceptance to a generic detail page if the decision gate is buried.
- `risk`: returning from Stripe can land too early unless the app polls for `in_progress`.
- `risk`: chat shortcuts from home or task cards can bypass the payment-confirmation moment.
- `risk`: drawer items that point to intermediate screens can create circular navigation.
- `risk`: using profile as the main path turns a commercial decision into an exploration path.

## Recommendations For Figma

- `recommended`: design a dedicated decision gate frame for `assigned` tasks, even if it reuses the task detail shell.
- `recommended`: show payment as a single, calm decision screen with one primary CTA and one optional premium path.
- `recommended`: design `StripeReturn` as a pending confirmation state, not a success screen.
- `recommended`: make the bell, drawer, and task card all point to the same decision surface.
- `recommended`: use helper compact cards inside the gate, not a full profile dump.
- `recommended`: annotate every frame with `actual`, `recommended`, or `risk` so the design team does not invent navigation.

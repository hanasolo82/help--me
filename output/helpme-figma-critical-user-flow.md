# HelpMe Critical User Flow For Figma

Flow:
Landing -> Auth -> Home requester -> Crear tarea -> Tarea publicada -> Oferta pendiente -> Confirmar y pagar -> Stripe return -> Chat -> Cerrar tarea -> Valorar helper

Principle: the requester should not scatter into side routes during the commercial decision. Every frame should move the user toward the next business decision until chat becomes available after backend-confirmed payment state.

## Recommended Frame Order

| Order | Frame ID | Route / surface | State | Purpose | Primary CTA | Secondary CTA | Next |
|---:|---|---|---|---|---|---|---|
| 1 | `landing_guest` | `/` | guest | choose requester intent | `Necesito ayuda` | `Entrar`, `Quiero ayudar` | Auth |
| 2 | `auth_login_register` | `modal:/auth` or `/login` | guest | identify or register requester | `Entrar` / `Crear cuenta` | `Continuar con Google` | Home requester / onboarding |
| 3 | `home_requester_empty_or_active` | `/home` | requester | requester hub | `Publicar solicitud` | `Mis solicitudes` | Create task |
| 4 | `create_task` | `RequestTaskModal` or `/create` | draft | capture need, price and location | `Publicar solicitud` / `Guardar` | `Cancelar`, `Volver` | Published task |
| 5 | `task_published_open` | `/home` card or `/task/:id` | `open` | task is visible to helpers | `Ver detalle` | `Editar`, `Retirar` | Wait for helper |
| 6 | `offer_pending_notification` | bell + drawer | `assigned` | helper accepted | `Decidir ahora` | `Mis solicitudes` | Decision gate |
| 7 | `task_decision_gate_assigned` | `/task/:id` | `assigned` | requester decides | `Confirmar y pagar` | `Rechazar helper`, `Ver perfil` | Payment |
| 8 | `task_payment` | `/task/:id/payment` | `assigned` | create checkout | `Confirmar y pagar` | `Coordinar pago con el helper` | Stripe |
| 9 | `stripe_return_pending` | `/stripe/return?flow=payment` | `assigned -> in_progress` | wait for webhook truth | `Volver al detalle`; chat only when ready | none | Chat/detail |
| 10 | `chat_task_active` | `/chat/:id` | `in_progress` | coordinate work | `Enviar` | `Volver a chats` | Close task |
| 11 | `task_complete` | `/complete/:id` | `in_progress/completed` | close and release payment | `Confirmar finalización` | `Volver al chat`, `Volver al detalle` | Review |
| 12 | `task_review` | `/task/:id/review` | `completed/closed` | rate helper | `Publicar valoración` | `Ahora no` | Task detail |

## Key Product Decisions

| Step | Decision | Rule |
|---|---|---|
| Landing | user chooses role intent | `Necesito ayuda` should bias requester path |
| Auth | existing vs new account | success routes to previous intent, onboarding or `/home` |
| Home requester | create task vs inspect existing tasks | task creation is primary when no pending offer exists |
| Create task | publish/save | task is discoverable only after valid submit |
| Published task | wait for helper | `open` has no payment/chat CTA |
| Offer pending | requester must decide | `assigned` is a commercial gate |
| Decision gate | confirm/pay vs reject | primary is always `Confirmar y pagar` |
| Payment | Stripe vs Premium external | Stripe remains primary; Premium is secondary |
| Stripe return | wait for backend truth | do not say confirmed until `in_progress` |
| Chat | coordinate work | chat follows payment-confirmed task state |
| Close | requester confirms completion | closure triggers completion/release behavior |
| Review | requester rates helper | review appears after `completed` or `closed` |

## 1. Landing

Route: `/`

Goal: choose intent without friction.

Primary frame:
- Hero with `Necesito ayuda` as the requester entry.
- Secondary CTA: `Quiero ayudar`.
- Tertiary action: `Entrar`.

Design notes:
- The first prototype path should use `Necesito ayuda`.
- Keep auth modal as the next frame, not a separate full-page detour.
- Footer legal links and cookie consent are supporting variants.

Success:
- User taps `Necesito ayuda`.
- App stores requester intent and opens auth if not authenticated.

## 2. Auth

Surface: `modal:/auth` or fallback `/login`

Goal: create session and continue intent.

Primary frame:
- Login/register modal over landing.
- For requester path, login mode can be the default.

Primary CTA:
- `Entrar` for login.
- `Crear cuenta` for register.

Secondary actions:
- `Continuar con Google`
- `Registrarse` / `Entrar` tab switch
- `Olvide mi contrasena`

Success:
- Auth resolves through `/auth/callback`.
- User lands in `/home` as requester, or `/onboarding` if base profile is missing.

Risk:
- Do not design auth as the main product destination. It is a bridge.

## 3. Home Requester

Route: `/home`

Goal: publish a request.

Primary frame:
- Home requester with map/helpers context and request summary.
- Primary CTA: `Publicar solicitud`.

Supporting entry points:
- Header menu `Mis solicitudes`
- Bell notifications
- `MyRequestsPanel` with `Publicar nueva`

Success:
- Opens `RequestTaskModal`.

Risk:
- Avoid making helper browsing the primary path for the critical flow. The flow needs a published task first.

## 4. Crear tarea

Primary surface: `modal:/home/request-task`

Goal: create and publish the task in one focused step.

Primary CTA:
- `Publicar solicitud`

Secondary CTA:
- `Cancelar`

Fields:
- title
- description
- location search/use location
- category
- price

Backend side effect:
- New modal flow calls `createTask` and then `publishTask`.

Success:
- Modal closes.
- Home shows published task state.

Risk:
- The routed `/create` page exists but is secondary for this prototype. It saves via route form and should not replace the faster modal flow unless product chooses that path.

## 5. Tarea publicada

Surface: `/home`, task card, requester task markers, drawer

Goal: reassure the requester that the task is live and waiting.

State:
- `open`

User label:
- `Activa` / `Publicada`

Primary actions:
- `Ver todas`
- `Ver detalle`

Secondary actions:
- `Editar`
- `Retirar`
- `Ver en mapa`

Next event:
- Helper accepts task.

Design notes:
- This frame can be a state variant of Home requester.
- Show task in requester drawer under `Activas`.

## 6. Oferta pendiente

Route: `/task/:id`

Goal: requester decides whether to work with the helper.

State:
- `assigned`

Headline:
- `{HelperName} ha aceptado tu tarea`

Required content:
- task title
- short description
- price
- compact helper card
- rating/summary if available

Primary CTA:
- `Confirmar y pagar`

Secondary CTA:
- `Rechazar helper`

Tertiary action:
- `Ver perfil`

Design notes:
- This is the most important commercial frame.
- Bell and drawer should route here directly.
- Keep profile as supporting trust context.

Risk:
- Do not route to chat from this state.
- Do not frame this as a read notification.

## 7. Confirmar y pagar

Route: `/task/:id/payment`

Goal: confirm payment.

Primary CTA:
- `Confirmar y pagar`

Secondary path:
- Premium/external payment option, visually lower priority.

Content:
- helper selected
- task summary
- price rows
- total

Backend side effect:
- `startTaskCheckout`
- Redirects to Stripe Checkout.

Risk:
- Keep one dominant payment CTA. Too many options dilute the conversion moment.

## 8. Stripe return

Route: `/stripe/return?flow=payment`

Goal: wait for backend confirmation.

Title:
- `Pago recibido`

Copy:
- `Estamos confirmando la tarea. Esto puede tardar unos segundos.`

Primary visible action:
- `Volver al detalle`

Ready-state action:
- Open chat only after task status is actually `in_progress`.

System behavior:
- invalidates task queries
- polls until task becomes `in_progress`

Success:
- Task detail opens with chat available.

Pending fallback:
- User can return to detail without the UI claiming final confirmation.

Risk:
- Never design this as `Pago confirmado` unless the task state is already updated.

## 9. Chat

Route: `/chat/:id`
Alternative surface: `modal:/task-chat`

Goal: coordinate privately after payment.

State:
- `in_progress`

Primary CTA:
- `Enviar`

Message actions:
- `Editar`
- `Borrar mensaje`
- `Reintentar`
- `Cargar mensajes antiguos`

Navigation:
- back to `/chats`
- from task detail, embedded modal can close back to detail

Risk:
- Chat is a post-payment surface in the critical flow.

## 10. Cerrar tarea

Route: `/complete/:id`

Goal: requester confirms completion and releases payment.

Primary CTA:
- `Confirmar finalización`

Secondary CTA:
- `No, volver al chat`

Other action:
- `Volver al detalle`

Backend side effects:
- `markTaskCompleted`
- `releaseTaskPayment`

Success:
- Completed state with CTA to review helper.

Risk:
- Do not show closure before the task is in a closeable state.

## 11. Valorar helper

Route: `/task/:id/review`

Goal: complete trust loop.

State:
- `completed` or `closed`

Primary CTA:
- `Publicar valoración`

Secondary CTA:
- `Ahora no`

Inputs:
- rating
- tags
- text comment

Backend side effect:
- `createTaskReview`

Success:
- returns to task detail with review saved state.

## Prototype Frame Order

1. Landing - requester intent.
2. Auth modal - login/register.
3. Auth callback loading bridge.
4. Home requester - empty/ready.
5. Request task modal.
6. Home requester - task published.
7. My requests drawer - active task.
8. Home notification - offer pending.
9. Task detail - decision gate.
10. Payment page.
11. Stripe return - confirming.
12. Task detail - in progress, chat available.
13. Chat.
14. Task complete.
15. Task review.
16. Task detail - reviewed.

## Required States Per Frame

| Frame | States to design |
|---|---|
| `landing_guest` | default, mobile nav open, auth modal open, cookie banner |
| `auth_login_register` | login, register, loading, error, remembered account, email confirmation |
| `home_requester_empty_or_active` | empty, open tasks, pending offer alert, unread chat alert |
| `create_task` | empty form, valid form, location picker open, submitting, validation error |
| `task_published_open` | open, draft/editable if applicable, cancelled edge |
| `offer_pending_notification` | bell badge, notification dropdown, drawer `Ofertas pendientes` |
| `task_decision_gate_assigned` | assigned gate, rejecting, rejection error, payment unavailable |
| `task_payment` | ready to pay, checkout loading, checkout error, Premium secondary |
| `stripe_return_pending` | checking, ready, pending timeout, error |
| `chat_task_active` | loading, empty, messages, sending, failed send, editing, deleting |
| `task_complete` | ready, confirming, success, external-release skipped, error |
| `task_review` | empty rating, valid rating, submitting, success, already reviewed, not allowed |

## CTA Sanity Check

- Landing: `Necesito ayuda`
- Auth: `Entrar` / `Crear cuenta`
- Home requester: `Publicar solicitud`
- Request modal: `Publicar solicitud`
- Published task: `Ver detalle`
- Pending offer: `Confirmar y pagar`
- Payment: `Confirmar y pagar`
- Stripe return: `Volver al detalle`
- Chat: `Enviar`
- Complete: `Confirmar finalización`
- Review: `Publicar valoración`

## Risk Points

| Risk | Where | Figma guidance |
|---|---|---|
| Requester escapes payment moment | `assigned` surfaces | make `Decidir ahora` and `Confirmar y pagar` dominant |
| `assigned` feels like a read notification | bell/drawer/cards | label as `Oferta pendiente` and keep alert persistent |
| Chat appears before payment | cards/detail shortcuts | no primary chat CTA until `in_progress` |
| Stripe return overpromises | `/stripe/return` | use checking/pending copy until backend status updates |
| Premium competes with checkout | payment page | secondary visual treatment |
| Rejection ambiguity | decision gate | only show functional rejection if safe operation exists |
| Review appears too early | detail/review route | only after `completed` or `closed` |
| Completion releases payment | `/complete/:id` | use clear confirmation/loading/error states |

# HelpMe Figma Priority Map

Purpose: turn the full inventory into a clear design build order. This is a Figma planning document, not a product redesign.

Priority labels:
- `P0`: critical commercial path
- `P1`: required supporting surfaces
- `P2`: secondary but needed for product completeness
- `P3`: variants and edge states

Agent synthesis:
- `helpme-architect`: design the `assigned / Oferta pendiente` decision gate before generic task detail variants because bell, drawer and cards must converge there.
- `product-flow-agent`: keep the requester path linear until chat opens after payment-backed task promotion.
- `frontend-ui-agent` + `ui-ux-pro-max`: build component hierarchy first so each screen has one primary CTA, visible async states and accessible touch targets.

## P0 - Critical Screens First

Design these first because they define whether the product flow makes sense.

| Priority | Screen | Route / surface | Why it matters | Primary CTA |
|---|---|---|---|---|
| P0 | Landing | `/` | first intent split: requester or helper | `Necesito ayuda` |
| P0 | Auth Modal | `modal:/auth` | account creation/login without losing landing context | `Entrar` / `Crear cuenta` |
| P0 | Home Requester | `/home` | requester hub after auth | `Publicar solicitud` |
| P0 | Request Task Modal | `modal:/home/request-task` | fastest real creation path from home | `Publicar solicitud` |
| P0 | Published Task State | `/home` + task card/drawer | confirms task is live and waiting | `Ver todas` / `Ver detalle` |
| P0 | Pending Offer Decision Gate | `/task/:id` with `assigned` | commercial decision moment | `Confirmar y pagar` |
| P0 | Payment Page | `/task/:id/payment` | payment commitment | `Confirmar y pagar` |
| P0 | Stripe Return Payment | `/stripe/return?flow=payment` | async webhook wait state | `Volver al detalle` |
| P0 | Task Chat | `/chat/:id` and `modal:/task-chat` | private coordination after payment | `Enviar` |
| P0 | Task Complete | `/complete/:id` | close task and release payment | `Confirmar finalización` |
| P0 | Task Review | `/task/:id/review` | post-close trust loop | `Publicar valoración` |

## P1 - Supporting Screens

These screens support the P0 flow and should be designed immediately after the first pass.

| Priority | Screen | Route / surface | Purpose |
|---|---|---|---|
| P1 | Home Notifications Dropdown | `overlay:/home` | pending offer and unread chat entry |
| P1 | My Requests Drawer | `overlay:/home` | task state inventory for requester |
| P1 | Task Detail Open | `/task/:id` | normal task detail before helper accepts |
| P1 | Task Detail Helper | `/task/:id` | helper reads and accepts open task |
| P1 | Chats List | `/chats` | inbox route |
| P1 | Profile Public | `/profile/:id` | helper trust/supporting detail |
| P1 | Own Profile | `/profile` | self profile entry to settings |
| P1 | Settings | `/settings` | profile, notifications, map, payments, security |
| P1 | Logout Modal | `modal:/home/logout` | global account safety |

## P2 - Secondary Screens

These are important, but should not block the first critical prototype.

| Priority | Screen | Route / surface | Purpose |
|---|---|---|---|
| P2 | Login Page | `/login` | fallback auth route |
| P2 | Forgot Password | `/forgot-password` | auth recovery |
| P2 | Reset Password | `/reset-password` | auth recovery completion |
| P2 | Auth Callback | `/auth/callback` | loading/redirect bridge |
| P2 | Create Task Page | `/create` | routed create/edit task path |
| P2 | Task Location Picker | `modal:/create/location` | map point selection |
| P2 | Helper List Panel | `/home` requester mode | helper discovery |
| P2 | Helper Preview Modal | `modal:/home/helper-preview` | compact helper evaluation |
| P2 | Helper Home | `/home` helper mode | helper opportunity workspace |
| P2 | Helper Journey Modal | `modal:/home/helper-journey` | helper activation flow |
| P2 | Stripe Refresh | `/stripe/refresh` | expired Stripe Connect recovery |

## P3 - Legal, Preferences And Edge Frames

Design these as reusable templates/variants after the main app lanes are stable.

| Priority | Screen | Route / surface | Notes |
|---|---|---|---|
| P3 | Cookie Banner | `overlay:/` | global consent |
| P3 | Cookie Preferences Modal | `modal:/cookies` | granular preferences |
| P3 | Legal Terms | `/legal/terms` | shared legal layout |
| P3 | Legal Privacy | `/legal/privacy` | shared legal layout |
| P3 | Legal Cookies | `/legal/cookies` | shared legal layout |
| P3 | Community Guidelines | `/legal/community-guidelines` | help/legal route |
| P3 | Empty/loading/error states | route variants | do as variants, not separate product flows |

## Components Base Needed

Build these as Figma components before drawing high-fidelity screens.

| Component | Priority | Needed by |
|---|---|---|
| Button | P0 | every screen |
| Header | P0 | Landing, Home, task routes, chat, settings |
| StatusBadge | P0 | task cards, drawer, detail, payment, Stripe return |
| TaskCard | P0 | Home requester, drawer, feed, helper home |
| DecisionGate | P0 | assigned task detail |
| PaymentSummary | P0 | payment page |
| ChatMessage | P0 | chat route and task chat modal |
| Modal | P0 | auth, request task, chat, logout, helper journey |
| Drawer | P0 | my requests |
| EmptyState | P1 | home, chats, helper list, requests |
| HelperCard | P1 | requester helper discovery and profile preview |
| ReviewCard | P1 | profile/review surfaces |
| FormField | P1 | auth, task creation, settings, onboarding |
| Stepper/Progress | P2 | onboarding and helper journey |
| MapMarker/Legend | P2 | requester/helper map layouts |

## Modals And Drawers Needed

| Surface | Priority | Build as | Notes |
|---|---|---|---|
| AuthModal | P0 | modal component variant | login/register states |
| RequestTaskModal | P0 | modal with form | fastest create path |
| TaskChatModal | P0 | modal with chat layout | separate from `/chat/:id` route |
| MyRequestsDrawer | P0 | side drawer | state grouped task list |
| LogoutConfirm | P1 | confirmation modal | destructive account action |
| HelperPreviewModal | P1 | preview modal | profile/contact/publish |
| ChatsModal | P1 | list modal | home inbox shortcut |
| HelperJourneyModal | P2 | multi-step modal | helper activation |
| CookiePreferencesModal | P3 | preferences modal | consent variants |

## Recommended Figma Build Order

1. Create design tokens: color roles, typography roles, spacing, radius, shadow/elevation, scrim, focus ring.
2. Build base controls: Button, IconButton, FormField, StatusBadge, EmptyState.
3. Build commerce components: TaskCard, HelperCard, DecisionGate, PaymentSummary.
4. Build shell components: Landing header, HomeHeader, route header, modal shell, drawer shell.
5. Build P0 flow in low-fidelity frames from Landing to Review.
6. Upgrade P0 flow to high-fidelity with real copy and CTA hierarchy.
7. Add P1 support frames: notifications, drawer, task open/helper, profile, settings, chats list.
8. Add P2 frames: onboarding, helper home, helper journey, create route, location picker.
9. Add P3 legal/cookie/loading/error variants.
10. Run interaction QA in prototype: one primary CTA per frame, predictable back path, no `assigned` bypass to chat.

## Route Dependency Map

| Route / surface | Depends on | Design implication |
|---|---|---|
| `/` | AuthModal, CookieConsent, legal links, mobile nav | Landing cannot be final without auth overlay states |
| `/home` | HomeHeader, mode switch, TaskFeed, MyRequestsDrawer, notification panel, modals | Home must be designed as requester and helper variants |
| `/task/:id` | StatusBadge, TaskCard data, HelperCard, DecisionGate, chat entry, close/review entry | Build `assigned` gate before generic detail polish |
| `/task/:id/payment` | PaymentSummary, helper/task summary, Stripe checkout, Premium secondary | Keep checkout simple and CTA-led |
| `/stripe/return` | payment intent, webhook, polling, task status fallback | Design `checking`, `ready`, `pending timeout`, `error` variants |
| `/chat/:id` | conversation, MessageList, MessageInput, allowed task state | Chat is downstream of payment in the critical prototype |
| `/complete/:id` | task `in_progress/completed`, completion mutation, payment release | Treat as high-commitment action |
| `/task/:id/review` | task `completed/closed`, accepted helper, review existence | Endpoint after close, not part of payment flow |
| `/profile/:id` | profile data, favorites, direct chat, invite-to-task | Supporting trust route, not primary commercial path |
| `/settings` | profile, dirty-state save, Stripe Connect state | Account utility and helper enablement, not requester checkout |

## Modal And Drawer Dependencies

| Surface | Dependency | Figma rule |
|---|---|---|
| AuthModal | Landing CTAs | Build before final Landing prototype |
| HomeNotifications | unread chats + pending offers | `Oferta pendiente` routes directly to DecisionGate |
| MyRequestsDrawer | MyRequestCard variants | Group `Ofertas pendientes` prominently |
| RequestTaskModal | create/publish task side effect | Keep separate from `/create` route in Figma |
| TaskChatModal | task chat primitives | Do not merge with `/chat/:id` route |
| HelperJourneyModal | helper activation state | Design after requester critical path |

## Prototype Rules

- Keep `assigned` as a decision gate, not a generic task detail state.
- Bell and drawer should route directly to the decision gate.
- Payment success is not instant; Stripe return is a pending confirmation frame.
- Chat becomes primary only after task is `in_progress`.
- Profile is supporting trust context, not a replacement for the payment decision.
- Premium payment option stays visually secondary to `Confirmar y pagar`.

## Risks If Designed Out Of Order

- Designing profile/settings before the decision gate can make the buyer journey feel exploratory instead of transactional.
- Designing chat before payment can imply the task starts too early.
- Designing Stripe return as a success screen can conflict with webhook timing.
- Merging `/create` and `RequestTaskModal` can hide that they have different side effects.
- Merging `/chat/:id` and `TaskChatModal` can blur route chat versus embedded task chat.
- Designing helper onboarding before the requester critical path can optimize supply before conversion is understandable.
- Giving Premium equal visual weight to Stripe checkout can dilute `Confirmar y pagar`.

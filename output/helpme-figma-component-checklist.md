# HelpMe Figma Component Checklist

Use this as the first Figma component pass. Build components as variants before composing final screens.

## Design Principles

- Each screen should have one visible primary CTA.
- `assigned` must read as a pending decision, not a normal task state.
- Payment, closure and review CTAs should outrank lateral routes.
- Async actions need explicit loading, disabled, error and success variants.
- Mobile touch targets should be at least 44px.
- Keep light/dark compatibility if the theme switch remains in the product.
- Profile, settings and favorites exist as support paths, but must not compete with the critical requester flow.

## Recommended Build Order

1. Tokens: semantic color, typography, spacing, radius, elevation, focus ring, scrim.
2. Button + StatusBadge.
3. Header + Drawer.
4. TaskCard + HelperCard.
5. DecisionGate.
6. PaymentSummary.
7. Modal base + RequestTaskModal pattern.
8. ChatMessage + chat input/header.
9. EmptyState.
10. ReviewCard.
11. Responsive variants for critical screens.
12. Async/error states for auth, payment, chat and closure.

## Button

Where it appears:
- Landing, auth, home, task detail, payment, Stripe return, chat, complete, review, profile, settings, onboarding, modals.

Variants needed:
- primary
- secondary
- danger
- success
- link
- icon-only
- compact
- sticky bottom CTA

States:
- default
- hover/pressed
- focus
- disabled
- loading
- destructive confirmation

CTA associated:
- `Necesito ayuda`
- `Publicar solicitud`
- `Confirmar y pagar`
- `Rechazar helper`
- `Enviar`
- `Confirmar finalización`
- `Publicar valoración`

Design notes:
- One primary CTA per screen.
- Touch target should be at least 44px.
- Icon-only buttons need labels/tooltips in Figma annotations.
- Loading labels must preserve button width as much as possible.
- `Confirmar y pagar` is the strongest CTA in the `assigned` flow.
- `Rechazar helper` should be destructive-secondary, never equal weight to payment.

## Header

Where it appears:
- Landing navbar
- HomeHeader
- route page headers
- chat header
- modal headers
- legal header

Variants needed:
- public landing
- authenticated home
- route header with back
- modal header with close
- chat header with contact

States:
- default
- search active
- notification badge
- menu open
- helper mode / requester mode

CTA associated:
- `Entrar`
- `Ayudar` / `Necesito ayuda`
- bell notifications
- avatar profile
- menu actions
- back/close

Design notes:
- Keep global nav predictable.
- Bell badge must combine unread chats and pending offers.
- Back button behavior should be annotated per screen.
- App header should not make profile or settings look like the next step when an offer is pending.

## TaskCard

Where it appears:
- Home task feed
- requester task summary
- MyRequestsDrawer
- helper home selected task
- task preview context

Variants needed:
- draft
- open/publicada
- assigned/oferta pendiente
- in_progress
- completed
- closed
- cancelled
- expanded/collapsed
- requester card
- helper opportunity card

States:
- default
- selected
- expanded
- loading publish
- disabled action
- with accepted helper
- with chat action

CTA associated:
- `Publicar tarea`
- `Ver detalle`
- `Decidir ahora`
- `Ver chat`
- `Valorar`
- `Retirar`
- `Editar`

Design notes:
- `assigned` must be visually distinct as a pending decision.
- Chat action should not be emphasized for `assigned`.
- Keep price/status/date scannable.

## HelperCard

Where it appears:
- requester helper list
- helper preview modal
- decision gate compact helper strip
- profile-related surfaces

Variants needed:
- list card
- compact strip
- preview modal summary
- selected helper
- unavailable helper

States:
- default
- selected
- contact loading
- disabled contact
- verified
- no reviews

CTA associated:
- `Contactar`
- `Ver perfil`
- `Publicar solicitud`

Design notes:
- In the decision gate, helper info supports trust but should not overpower `Confirmar y pagar`.
- Show rating/reviews as text plus icon/component, not color alone.

## DecisionGate

Where it appears:
- `TaskDetail` when requester owns task and `task.status === assigned`.

Variants needed:
- assigned with helper profile
- assigned without rating
- rejecting/loading
- backend rejection error
- mobile sticky CTA variant

States:
- default
- confirm available
- reject loading
- error

CTA associated:
- primary: `Confirmar y pagar`
- secondary: `Rechazar helper`
- tertiary: `Ver perfil`

Design notes:
- This is a P0 component.
- Title should follow `{HelperName} ha aceptado tu tarea`.
- Content order: helper acceptance -> task -> description -> price -> helper compact -> actions.
- Never make profile or chat the primary action here.
- Variants should include reject available, reject unavailable/documented, rejecting, rejection error and payment unavailable.

## PaymentSummary

Where it appears:
- `/task/:id/payment`

Variants needed:
- payable
- loading
- not owner
- waiting helper
- already confirmed
- final/closed
- cancelled
- premium active
- premium inactive

States:
- default
- redirecting to Stripe
- external payment confirming
- checkout error
- premium check loading/error

CTA associated:
- primary: `Confirmar y pagar`
- secondary: `Coordinar pago con el helper`
- tertiary: `Ver Premium`
- fallback: `Volver al detalle`

Design notes:
- Keep total and primary payment CTA visually dominant.
- Premium must read as optional, not competing.
- Do not show technical state names as the main visual language.
- Stripe return variant should say `Pago recibido` plus pending confirmation, not final confirmation until task state is real.

## ChatMessage

Where it appears:
- `/chat/:id`
- `TaskChatModal`

Variants needed:
- incoming
- outgoing
- sending
- failed
- deleted
- edited
- dense modal message

States:
- default
- hover actions visible
- edit available
- delete available
- retry available
- loading older messages

CTA associated:
- `Enviar`
- `Editar`
- `Borrar mensaje`
- `Reintentar`
- `Cargar mensajes antiguos`

Design notes:
- Use clear timestamp and edited/deleted state.
- Failed state needs a recovery action.
- Composer should have disabled/loading states and preserve keyboard flow.
- Chat should feel operational and private, not commercial.
- Do not mix chat with the payment decision while task is still `assigned`.

## Modal

Where it appears:
- AuthModal
- RequestTaskModal
- HelperPreviewModal
- TaskPreviewModal
- ChatsModal
- TaskChatModal
- HelperJourneyModal
- Cookie preferences
- Logout confirmation

Variants needed:
- centered dialog
- large form modal
- chat modal
- preview modal
- confirmation modal
- multi-step modal

States:
- open
- closing
- loading
- error
- unsaved form
- destructive confirmation

CTA associated:
- depends on modal: `Crear cuenta`, `Publicar solicitud`, `Enviar`, `Salir`, `Activar perfil`.

Design notes:
- Always include visible close/escape path.
- Scrim should make the active modal clearly foreground.
- Do not nest cards inside modal cards; use sections inside the modal surface.
- For modals with side effects, loading belongs on the exact button executing the action.
- On mobile, long form modals and chat can be represented as bottom-sheet/full-height variants.

## Drawer

Where it appears:
- MyRequestsDrawer

Variants needed:
- default
- inline
- overlay
- empty
- with pending offers

States:
- open
- closed
- section with tasks
- loading
- error

CTA associated:
- `Decidir ahora`
- `Ver chat`
- `Ver detalle`
- `Valorar`
- `Retirar`

Design notes:
- Group by task state: Activas, Ofertas pendientes, En curso, Historial.
- `Ofertas pendientes` should be visually prominent.
- Drawer close should return to requester home context.
- `Decidir ahora` should have more weight than `Ver detalle` when task is `assigned`.

## StatusBadge

Where it appears:
- TaskCard
- TaskDetail
- MyRequestsDrawer
- HelperUpcomingPanel
- Stripe return status card
- payment page notices

Variants needed:
- draft / Borrador
- open / Publicada or Activa
- assigned / Oferta pendiente
- in_progress / En curso
- completed / Completada
- closed / Cerrada
- cancelled / Cancelada
- loading / pending
- error
- success

States:
- default
- selected
- disabled
- high emphasis
- low emphasis

CTA associated:
- none directly, but supports CTA visibility.

Design notes:
- Do not rely on color alone; include text labels.
- `assigned` should use a distinct warning/attention treatment.
- Keep terminology consistent across app and Figma.
- `En curso` should communicate that chat is now available.
- `Completada/Cerrada` should be low urgency unless review is missing.

## ReviewCard

Where it appears:
- Task review page
- task detail reviewed state
- helper/public profile reviews
- post-completion success path

Variants needed:
- empty/no review
- rating input
- published review
- already reviewed
- compact profile review

States:
- default
- selected rating
- tag selected
- submit loading
- error
- saved

CTA associated:
- `Publicar valoración`
- `Ahora no`
- `Volver al detalle`
- `Valorar helper`

Design notes:
- Review is post-close trust content.
- Keep it separate from payment and closure UI.
- Rating should be keyboard/touch friendly.

## EmptyState

Where it appears:
- requester home no tasks
- helper no tasks
- chats empty
- helper list empty
- requests drawer sections
- profile/settings loading or error fallbacks

Variants needed:
- no tasks
- no helpers
- no chats
- loading
- error
- permission/profile gate
- location missing

States:
- neutral
- warning
- positive
- error

CTA associated:
- `Nueva tarea`
- `Publicar solicitud`
- `Usar mi ubicación`
- `Completar perfil`
- `Ver solicitudes abiertas`
- `Reintentar`

Design notes:
- Empty states should point to one next action.
- Avoid generic empty copy in the critical requester flow.
- Error states need recovery, not just explanation.
- Empty states inside the critical path should avoid lateral routes unless they are the only recovery action.

## Cross-Component Design Rules

- Minimum interactive area: 44px.
- Visible focus state for every button, card-as-button, input, tab and menu item.
- One primary CTA per frame.
- Loading states should replace button labels without changing intent.
- Destructive actions require visual separation and confirmation where appropriate.
- Back/close paths must be visible in modals, drawers and multi-step flows.
- Use semantic status labels; never encode task state by color alone.

## Component Priority Table

| Priority | Component | Reason |
|---|---|---|
| P0 | Button | CTA hierarchy drives the commercial flow |
| P0 | StatusBadge | prevents `assigned` from looking like a normal task |
| P0 | DecisionGate | core of `Oferta pendiente -> pago` |
| P0 | PaymentSummary | removes checkout noise before Stripe |
| P0 | ChatMessage | chat opens after confirmed payment state |
| P1 | Header | landing, home, bell, menus and route navigation |
| P1 | TaskCard | task representation across feed/drawer/detail |
| P1 | Drawer | groups requests and pending offers |
| P1 | Modal | auth, create request, previews, logout, cookies |
| P2 | HelperCard | discovery and compact gate trust |
| P2 | ReviewCard | post-close trust loop |
| P2 | EmptyState | perceived quality in empty lists and recovery |

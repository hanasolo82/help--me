# HelpMe Full Figma Inventory

This supplement extends the critical-flow spec from the public landing through every routed page, overlay, modal, back action, chat entry, and state-changing button found in the audited React surfaces.

## Figma Extension

- `actual`: no Figma connector/tool is exposed to this Codex session, even though the extension is installed locally.
- `recommended`: import the CSV files from `output/` into Figma/FigJam as source tables, then map each row to frames/components.
- `recommended`: use `helpme-figma-modals.csv` as the modal/overlay checklist and `helpme-figma-buttons.csv` as the interaction checklist.

## Start-To-End Navigation

1. `/` Landing: anchors, theme switch, login/register modal, cookie banner, legal links.
2. Auth: landing modal or `/login` direct page.
3. `/auth/callback`: resolves auth, previous intent, profile completeness, helper onboarding resume.
4. `/onboarding`: requester profile basics or helper profile setup.
5. `/home`: requester/helper hub with header, dropdowns, notifications, drawers and modals.
6. Requester path: publish request -> helper accepts -> decision gate -> payment -> Stripe return -> chat -> close -> review.
7. Helper path: helper mode -> open task -> accept -> wait for requester -> chat after confirmed payment.
8. Supporting routes: create/edit task, chats list, chat detail, profile, settings, legal, Stripe refresh.

## Global UI Surfaces

| Surface | Type | Entry | Exit |
|---|---|---|---|
| AuthModal | modal | Landing `Entrar`, `Necesito ayuda`, `Quiero ayudar` | X, backdrop, ESC, auth success |
| CookieConsent | banner/modal | first visit until consent | Accept/reject/save |
| Home notifications | dropdown | bell button | click outside or CTA |
| Home menu | dropdown | hamburger/options button | selected item/click outside |
| Logout confirmation | modal | menu `Cerrar sesión` | `Cancelar`, backdrop, `Salir` |
| MyRequestsDrawer | drawer | header/menu or requester home | close button/backdrop |
| RequestTaskModal | modal | requester publish buttons/helper preview | X, backdrop, cancel, submit |
| HelperPreviewModal | modal | helper list/map selection | X, backdrop, profile/contact/publish |
| TaskPreviewModal | modal | helper opportunity preview | X, backdrop, detail/contact/map/favorite |
| ChatsModal | modal | home messages shortcut without id | X, backdrop, chat row |
| TaskChatModal | modal | task detail/feed chat action | X, backdrop |
| HelperJourneyModal | modal | `Quiero ayudar` / resume onboarding | X, ESC, backdrop, finish |
| TaskLocationPicker | modal/picker | create task route | close or save location |

## Back And Return Buttons

| Screen | Label / icon | Destination |
|---|---|---|
| Legal pages | `←` | `navigate(-1)` |
| Onboarding frame | back icon | previous browser route or previous step depending screen |
| Onboarding skills | `Volver` | `/onboarding` |
| Onboarding location | `Volver` | `/onboarding/skills` |
| Onboarding availability | `Volver` | `/onboarding/location` |
| Onboarding verification | `Volver` | `/onboarding/availability` |
| Create task | `←` | `/home` with requester mode |
| Task detail | `←` | `/home` |
| Payment | `←` | `/task/:id` |
| Payment unavailable | `Volver al detalle` | `/task/:id` |
| Stripe return payment | `Volver al detalle` | `/task/:id` or `/home` |
| Chats list | `←` | `/home` |
| Chat detail | `←` / `Volver a chats` | `/chats` |
| Task complete | `Volver al detalle` | `/task/:id` |
| Task complete | `Volver al chat` | resolves `/chat/:id` |
| Task review | `Ahora no` / `Volver al detalle` | `/task/:id` |
| Profile loading/error | `Volver` | previous route |
| Settings | `Volver` | `/home`, saving dirty state first |
| Stripe refresh | `Volver al onboarding` | `/onboarding` |

## Button Coverage Notes

- `helpme-figma-buttons.csv` now covers the critical CTAs plus global/header/settings/task/chat actions.
- `helpme-figma-modals.csv` covers every audited overlay/modal/drawer and its close actions.
- `helpme-figma-screens.csv` now starts at `Landing` and includes routed pages plus modal-like surfaces as design screens.

## Remaining Gaps To Check In Figma

- `risk`: some route-only screens have multiple loading/error states that should become small variants, not separate full frames.
- `risk`: helper onboarding has two implementations: routed `/onboarding/*` and modal `HelperJourneyModal`. Keep them separate in Figma.
- `risk`: chat exists both as `/chat/:id` and `TaskChatModal`; these are different UI surfaces with shared message primitives.
- `risk`: `RequestTaskModal` publishes immediately, while `/create` saves through the route form. They should not be merged without product review.

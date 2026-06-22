# Refactor Cleanup

## Scope
- Fix the critical requester flow for `assigned` tasks so the offer is treated as a decision gate, not a generic notification.
- Keep payment and chat aligned with webhook-backed state changes.
- Leave 5D rating, responsive design, and the broader Stripe/Premium architecture intact.

## Updated Surfaces
- `src/pages/TaskDetail/TaskDetail.jsx`
- `src/pages/TaskPayment/TaskPaymentPage.jsx`
- `src/pages/Stripe/StripeReturn.jsx`
- `src/components/home/HomeHeader.jsx`
- `src/components/home/TaskFeed.jsx`
- `src/features/home/need-help/components/MyRequestsDrawer.jsx`
- `src/features/home/need-help/components/MyRequestCard.jsx`
- `src/features/home/need-help/components/MyRequestsPanel.jsx`
- `src/features/home/need-help/components/RequesterHome.jsx`
- `src/features/home/need-help/components/RequesterTaskMarker.jsx`
- `src/features/tasks/components/TaskCard/TaskCard.jsx`
- `src/pages/TaskPayment/TaskPaymentPage.module.css`

## Flow Changes
- `assigned` now reads as `Oferta pendiente` across the critical requester surfaces.
- Bell and drawer continue to surface the pending decision without using localStorage.
- `TaskDetail` now shows the decision gate first for `assigned` tasks.
- `TaskPaymentPage` is simplified to a pay-first screen with Premium as a secondary option.
- `StripeReturn` now says `Pago recibido` and waits for the task to reach `in_progress` before redirecting to chat/detail.
- Requester chat shortcuts on the feed were narrowed so `assigned` no longer opens chat early.

## Validation
- `pnpm run lint`
- `pnpm run build`

## Notes
- Safe requester-side rejection remains backed by `reject_assigned_helper`.
- Helper-side rejection was not implemented and was documented as a backend/RPC gap if product ever wants it.

## Documentation generated
- `output/helpme-figma-flow-spec.md`
- `output/helpme-figma-critical-flow.md`
- `output/helpme-figma-screens.csv`
- `output/helpme-figma-buttons.csv`
- `output/helpme-figma-task-states.csv`
- No code changes were made in this documentation pass.

## Figma inventory expanded
- Added `output/helpme-figma-full-inventory.md`.
- Added `output/helpme-figma-modals.csv`.
- Expanded `output/helpme-figma-screens.csv` from landing through routed pages, overlays, drawers, modals, chat and Stripe surfaces.
- Expanded `output/helpme-figma-buttons.csv` with landing, auth, cookies, onboarding, create task, home, helper, requester, modal, chat and back/return actions.
- CSV validation: 47 screen rows, 174 button rows, 14 modal rows, 7 task-state rows.

## Figma prioritized design plan
- Added `output/helpme-figma-priority-map.md`.
- Added `output/helpme-figma-critical-user-flow.md`.
- Added `output/helpme-figma-component-checklist.md`.
- Scope remained documentation only; no code changes or build run.

## Figma official style guide
- Added `output/helpme-figma-style-guide.md`.
- Extracted visual tokens and implementation guidance from Figma file `helpme-styles` (`o8s9He8f3Kk2h2A0WTNjcm`).
- Confirmed Figma variables/styles are documented visually in frames, not published as local Figma variables/styles.
- Scope remained documentation only; no code changes, lint, or build run.

## Contextual profile navigation
- Profile visits now keep a persistent `Volver` action and respect the originating task route.
- Opening a helper from `/task/:id` no longer offers a conflicting new-task action or a duplicate return CTA.
- Duplicate `Pedir ayuda` / `Invitar` actions were consolidated into one contextual primary action.
- Profile sections now follow their real DOM order with one sequential `Anterior` / `Siguiente` control.
- Removed the unused legacy section navigation component and its CSS selectors.

## Workflow + Figma styles implementation
- Added `supabase/migrations/0039_task_applications_workflow.sql` to introduce `task_applications`, requester-side selection/rejection, helper-side application/withdrawal, and a safer `reject_assigned_helper` reset path.
- Reframed helper action from accepting a task directly to offering/applying for a task.
- Reframed `assigned` as the requester decision gate: offer pending, `Confirmar y pagar`, optional safe helper rejection, and no pre-payment task chat.
- Added requester review of pending helper applications on `TaskDetail`.
- Re-routed helper/requester discovery CTAs away from direct chat and into task detail or create-task flow.
- Kept Stripe Checkout as the primary payment path, kept Premium/external payment secondary, and prevented Stripe webhook promotion from overriding `external_agreed`.
- Kept `StripeReturn` polling until `task.status === in_progress` before opening chat.
- Applied Figma-derived CSS foundations: DM Sans/Lora, warm canvas, green primary, warm secondary surfaces, tighter radii, softer shadows, and simpler cards/buttons.
- Validation after implementation: `pnpm run lint` and `pnpm run build`.

## Strict visual Figma correction pass
- Reworked the app shell and critical surfaces to match `output/helpme-figma-style-guide.md` more faithfully without changing workflow logic.
- Updated `TaskCard`, requester drawer/cards/panels, helper home cards, request modals, helper/task preview modals, task map shell, payment page, Stripe page, and home shell surfaces to use the warm cream canvas, white cards, editorial headings, subtle borders, and Figma CTA colors.
- Removed the remaining glassy/blue surface treatment from the critical requester and payment flow so the visual language reads consistently as Figma rather than the legacy theme.
- Updated `TaskDetail` decision-gate copy only, keeping the underlying state and routing behavior intact.
- No backend, route, payment, chat-gating, RLS, or workflow logic was changed in this pass.

## Figma visual export gap audit
- Added `output/helpme-figma-visual-gap-audit.md`.
- Inspected local Figma exports from `\\HANASOLO-LAPTOP\Users\User\Downloads\helpme styles`, including global components, task flow, payment, chat, profile, settings, auth, create task, home map, mobile, support/legal and edge-case PNGs.
- Compared exports against current app code and documented remaining visual contamination from legacy blue/glass/gradient styles.
- Scope remained documentation only; no code changes, lint, or build run.

## Figma visual correction application
- Remapped legacy design-token aliases away from blue/slate and into the Figma warm cream, deep text, green primary and coral accent scale.
- Normalized shared button, panel, dropdown, chat list, chat composer and chat bubble styling to flat Figma surfaces with subtle borders and soft shadows.
- Added focused visual classes for the requester decision gate in `TaskDetail` so `Confirmar y pagar` remains the dominant action while `Ver perfil` is secondary.
- Updated `TaskPaymentPage`, `StripeReturn`, Home Map layout surfaces and Task Review styling to reduce visual noise and align with the exported Figma language.
- Kept workflow logic, services, Stripe, Supabase, routes, chat gating and task state transitions unchanged.

## Figma remaining surfaces visual pass
- Normalized Landing away from the legacy dark/slate visual language and into the Figma warm canvas, serif headings, flat green CTA and subtle accent system.
- Normalized AuthModal, CookieConsent, shared home empty states, Settings, Profile public/network views, app onboarding and helper onboarding surfaces away from glass/blur/slate treatments.
- Kept modal/backdrop behavior, settings forms, profile editing, helper onboarding state, Stripe Connect onboarding and all service calls unchanged.
- Used module-level visual overrides for large profile/settings/onboarding CSS modules to avoid rewriting layout/responsive rules while making the visible surfaces follow the Figma token system.

## Avatar and map marker normalization
- Added a centralized `UserAvatar` display component with image, initials, broken-image fallback, loading state and verified badge support.
- Added live theme variables for avatars, map markers and map popups in `src/styles/theme-live.css`.
- Replaced primary hand-rendered avatar usages in home header, task cards, helper cards/modals, task detail, payment, review, chat, profile sidebar, helper onboarding and nearby helpers feed.
- Added centralized Leaflet marker builders for task markers, requester task markers, helper markers, user waypoint markers and future cluster markers.
- Updated task/helper/requester map marker components to use the shared marker builders and shared `MapPopupCard` while preserving existing click/select handlers.
- Converted legacy `buildUserIcon` into a wrapper around the new marker system so old callers do not reintroduce the previous marker style.
- Removed the inline margin style from `NearbyHelpersFeed` and replaced it with a CSS module class.
- Conserved Settings avatar upload/crop UI because it is an editing workflow, not a display avatar.
- Validation: `pnpm run lint` and `pnpm run build`.

## Internal design lab
- Added a dev-only `/design-lab` route for testing `theme-live.css` visually without adding public navigation.
- Added `src/pages/DesignLab/DesignLab.jsx` and `DesignLab.module.css` with local mock data only.
- Covered color tokens, typography, buttons, forms, cards/panels, task components, helper/profile components, payment components, chat components, map markers and common states.
- Reused real classes/components where practical: `.primary-action`, `.secondary-action`, `.danger-action`, `.field`, `.detail-panel`, `TaskCard`, `HelperCard`, `MyRequestCard`, `UserAvatar`, `MessageList`, `MessageInput`, `HomeEmptyState`, `EmptyChatState`, payment module classes and marker builders.
- Avoided backend, Supabase, Stripe, payment flows, real data and public navigation changes.
- Validation: `pnpm run lint`, `pnpm run build`, and local HTTP check for `http://127.0.0.1:5173/design-lab`.

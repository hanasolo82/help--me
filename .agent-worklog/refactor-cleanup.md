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

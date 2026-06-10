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

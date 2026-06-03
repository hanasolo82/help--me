# Codex Notes

Last updated: 2026-06-03

## Decisions Taken

- Keep the current stack fixed: React, Vite, Supabase, Stripe Connect, Express backend, CSS Modules.
- Do not reopen financial architecture unless a change directly touches an existing closed flow.
- Treat code, persistence, runtime behavior, and manual tests as the source of truth.
- Use separate files for working notes and project status so context stays in the workspace.
- Keep map markers semantically distinct:
  - my location
  - available helpers
  - my requests
  - open tasks
- Reuse shared chat UI where possible instead of keeping a second visual pattern in the task modal.

## Open Questions

- Full manual validation with two real users is still pending.
- Production/staging data parity should be checked if a view appears empty even when code is correct.
- Need to confirm that every visible map/chat state remains clear with real data volume, not just seeded data.

## Files Modified

- `docs/codex-notes.md`
- `docs/project-status.md`
- `src/components/home/TaskChatModal.jsx`
- `src/features/home/need-help/components/HelperMapMarker.jsx`
- `src/features/home/need-help/components/NeedHelpMapLayout.jsx`
- `src/features/home/need-help/components/NeedHelpMapLayout.module.css`
- `src/features/home/need-help/components/RequesterTaskMarker.jsx`
- `src/features/home/offer-help/components/OfferHelpMapLayout.jsx`
- `src/features/home/offer-help/components/TaskPreviewModal.jsx`
- `src/features/map/components/TaskMap/TaskMap.jsx`
- `src/shared/ui/chat/MessageInput.jsx`
- `src/shared/ui/chat/MessageInput.module.css`
- `src/styles.css`
- `supabase/migrations/0033_update_public_helpers_map_rpc.sql`

## Tests Performed

- `pnpm run lint` ✅
- `pnpm run build` ✅

## Next Steps

- Run a short manual beta validation with real requester/helper accounts.
- Confirm map legend, markers, and task previews are readable in real usage.
- Confirm the chat modal and chat page feel visually consistent enough for beta.
- Keep appending decisions, risks, and follow-up actions here after each HelpMe work session.

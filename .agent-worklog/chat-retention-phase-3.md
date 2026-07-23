# Chat lifecycle — Fase 3: operaciones y trazabilidad de holds

## Alcance aprobado

La Fase 2 ya calcula candidatos sin borrar contenido. Esta fase hace operable el
hold manual sin exponerlo a participantes ni crear una purga automática.

- Crear holds únicamente para conversaciones `task`; las directas se rechazan.
- Crear y liberar holds mediante RPCs `SECURITY DEFINER` exclusivas de
  `service_role`.
- Mantener un historial específico, append-only y no visible para `anon` ni
  `authenticated`.
- Impedir las mutaciones directas de `conversation_retention_holds`, incluso
  con `service_role`, para que cada cambio pase por una operación auditada.
- Mantener `preview_task_chat_retention` como listado de candidatos. No se
  altera su firma ni sus reglas de disputa.

## Fuera de alcance

- No jobs, cron, Edge Functions ni borrado de `messages`, `attachments`,
  objetos de Storage o `conversations`.
- No UI interna, UI de usuario, exportación, Stripe, pagos, disputas, RLS de
  conversación ni cambios de la Fase 1.

## Implementación y validación

- `0059_task_chat_retention_hold_operations.sql` aplicada al proyecto remoto el
  2026-07-23. Añade `conversation_retention_hold_events`, las RPCs
  `create_task_chat_retention_hold`, `release_task_chat_retention_hold` y
  `get_task_chat_retention_hold_history`.
- Los writes directos sobre holds y eventos están revocados incluso para
  `service_role`; las RPCs `SECURITY DEFINER` son el único camino de mutación y
  añaden un evento de creación o liberación.
- `pnpm run verify:chat-retention`: 17/17.
- `pnpm run verify:chat-lifecycle`: 6/6.
- `pnpm run verify:rls-payment-gate`: 12/12.
- `pnpm run verify:rls-ownership`: 67/67.
- `pnpm run lint`, `pnpm run build` y `git diff --check`: correctos. El build
  mantiene únicamente el aviso existente de chunk principal por encima de 500 kB.

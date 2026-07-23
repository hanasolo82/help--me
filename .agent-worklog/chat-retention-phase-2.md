# Chat lifecycle — Fase 2: conservación y dry-run

## Inventario previo

Revisado antes de implementar la migración `0058`:

- `public.conversations` contiene `conversation_type`, `task_id`, `created_at`,
  `updated_at` y `last_message_at`; no tiene campos de conservación ni purga.
- `public.messages` y `public.attachments` no tienen retención ni cambios previstos
  en esta fase. Los adjuntos enlazan con `messages` mediante `message_id`.
- `public.tasks` expone `completed_at`, `cancelled_at`, `updated_at` y `created_at`.
  Los estados terminales relevantes son `completed`, `closed` y `cancelled`.
- `public.payments.task_id` enlaza el pago canónico de una tarea y `public.disputes`
  enlaza con el pago mediante `payment_id`. Los estados activos de disputa existentes
  son `opened`, `needs_response` y `under_review`.
- No existen tablas, funciones, campos, jobs ni migraciones aplicadas que contengan
  `retention`, `purge`, `conversation_retention` o `preview_task_chat_retention`.

## Decisiones de Fase 2

- Solo conversaciones `task`: las directas conservan los tres campos de calendario
  en `null` y quedan fuera del preview.
- El reloj se fija una vez: `completed_at` para `completed`/`closed` y
  `cancelled_at` para `cancelled`, con fallback a `updated_at` y `created_at` para
  históricos. El paso `completed -> closed` no lo desplaza.
- Adjuntos: candidatos a partir de 180 días; mensajes: a partir de 365 días.
  Esta fase no borra, anonimiza, exporta ni oculta contenido.
- Las disputas activas y los holds manuales detienen ambas fechas en el preview.
- El preview muestra exclusivamente metadatos y contadores a `service_role`.
  No expone cuerpo de mensaje, nombre de archivo ni ruta de Storage.

## Evidencia de validación

- `supabase/migrations/0058_task_chat_retention_model.sql` aplicada al proyecto
  remoto mediante `supabase db push` el 2026-07-23.
- `node --check scripts/verify-chat-retention.mjs`: correcto.
- `pnpm run lint`: correcto.
- `pnpm run build`: correcto. Mantiene únicamente el aviso existente de chunk
  principal por encima de 500 kB.
- `git diff --check`: correcto.
- `pnpm run verify:chat-retention`: 15/15. El estado posterior al backfill fue
  10 chats de tarea, 9 inicializados y 0 chats terminales sin calendario.
- `pnpm run verify:chat-lifecycle`: 6/6.
- `pnpm run verify:rls-payment-gate`: 12/12.
- `pnpm run verify:rls-ownership`: 67/67.
- La primera ejecución remota sufrió un `ENOTFOUND` temporal del host de
  Supabase. La resolución DNS se recuperó y todas las suites se ejecutaron
  después con fixtures aislados y autolimpieza.

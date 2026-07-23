# Chat lifecycle — Fase 4: política de conservación a cinco años

## Decisión del owner

Desde el 2026-07-23, los mensajes y adjuntos de conversaciones de tarea se
conservan durante cinco años naturales desde `retention_started_at`.

- El mismo plazo aplica a mensajes y adjuntos.
- Las conversaciones directas permanecen fuera del calendario de retención.
- El inicio sigue siendo el cierre o cancelación de la tarea, según la regla
  establecida en `0058`; pasar de `completed` a `closed` no reinicia el reloj.
- Una disputa activa o un hold manual continúa bloqueando la elegibilidad en el
  preview aunque hayan transcurrido los cinco años.

## Implementación

La migración `0060_task_chat_retention_five_years.sql`:

- recalcula a cinco años los calendarios ya creados por `0058`;
- sustituye el constraint para exigir exactamente cinco años en ambas fechas;
- actualiza las dos funciones de inicialización para conversaciones futuras;
- no cambia firmas, triggers, preview, permisos ni operaciones de holds.

Los nombres `attachments_purge_after` y `messages_purge_after` indican la primera
fecha en que un proceso futuro podría considerar el contenido. Por ahora no
existe ningún proceso que archive, exporte o elimine datos.

## Trabajo futuro aplazado

- Evaluar almacenamiento externo y formato de archivo.
- Definir avisos previos, descarga de historial y experiencia para el usuario.
- Diseñar un proceso de purga idempotente y auditable.
- Definir borrado coordinado entre metadatos, mensajes y objetos de Storage.
- Mantener bloqueos por disputa, seguridad o requerimiento legal.

Ninguna de estas acciones se activa en esta fase.

## Evidencia de validación

- `0060_task_chat_retention_five_years.sql` aplicada al proyecto remoto el
  2026-07-23; `supabase migration list` muestra `0060` en local y remoto.
- El backfill remoto dejó 9 chats inicializados, 0 terminales sin calendario y
  0 calendarios fuera de cinco años.
- `pnpm run verify:chat-retention`: 17/17.
- `pnpm run verify:chat-lifecycle`: 6/6.
- `pnpm run verify:rls-payment-gate`: 12/12.
- `pnpm run verify:rls-ownership`: 67/67.
- `pnpm run lint`: correcto.
- `pnpm run build`: correcto; conserva únicamente el aviso existente por el
  tamaño del chunk principal.
- `git diff --check`: correcto.

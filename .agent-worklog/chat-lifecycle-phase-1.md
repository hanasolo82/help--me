# Chat lifecycle · Fase 1 — evidencia de validacion

## Alcance

El chat de una tarea solo permite escritura con `tasks.status = 'in_progress'`.
En `completed` y `closed`, las dos personas participantes pueden leer el historial,
pero no enviar, reintentar, editar, borrar logicamente ni mutar adjuntos. Las
conversaciones directas no cambian.

## Baseline previo a 0057

`pnpm run verify:chat-lifecycle` contra el esquema con 0056 aplicada:

```text
[FAIL] T5 · Tarea completed conserva lectura y bloquea toda escritura
  access=true send=true message=ok edit=filas=1 delete=filas=1 attachment=filas=1
[FAIL] T6 · Tarea closed conserva lectura y bloquea toda escritura
  access=true send=true message=ok edit=filas=1 delete=filas=1 attachment=filas=1
```

El fallo confirma el agujero: `can_access_conversation` permitia lectura de chats
terminales y la version de `can_send_to_conversation` de 0053 convertia esa lectura
en permiso de escritura para todo chat de tarea.

## Correccion y resultado

Se aplico `0057_task_chat_read_only_after_completion.sql` al proyecto Supabase
vinculado. El verificador usa usuarios con JWT reales, fixtures namespaced y
autolimpieza.

```text
Total: 6 · OK: 6 · FAIL: 0
```

- `assigned`: sin lectura ni escritura.
- `in_progress`: lectura, envio, edicion y adjuntos permitidos.
- `completed` y `closed`: lectura permitida; envio, reintento, edicion,
  borrado logico, INSERT/DELETE en `attachments` y mutaciones de Storage bloqueados.
- Un tercero no lee ni escribe.
- Las conversaciones directas conservan su flujo autorizado.

## Regresion continua

La suite se ejecuta con `pnpm run verify:chat-lifecycle` y queda incorporada al
job `financial-verify` de GitHub Actions. Las verificaciones existentes tambien
permanecieron verdes: `verify:rls-payment-gate` 12/12 y `verify:rls-ownership` 67/67.

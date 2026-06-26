# Fase 3 / Bloque 2 (fix inmediato) - Concurrencia/idempotencia de webhooks y ledger

Fecha: 2026-06-25

## Disparador

`verify:webhook-reliability` fallo una vez en Test D creando 4 ledger entries y luego paso al
reintentar. Tratado como bug real de concurrencia, no como flake.

## Reproduccion

Harness agresivo (mismo evento `payment_intent.succeeded` disparado en paralelo, N iteraciones x K
concurrencia, volcando las filas reales en cada fallo):

- 40 iteraciones x 6 concurrencia => **15/40 fallos** antes del fix.
- En cada fallo, el payment tenia 4 ledger entries:
  - `charge_captured` (1, correcta)
  - `funds_held` (1, correcta)
  - `reconciliation_mismatch` (2, ESPURIAS) con `idempotency_key` distintas porque su
    `stripeObjectId` era el `entity_id` del mismatch (una con el `task_id`, otra con el `payment_id`).

## Causa raiz

Las entradas financieras `charge_captured`/`funds_held` NO se duplicaban: la constraint
`payment_ledger_entries.idempotency_key text not null unique` (migracion 0028) ya las deduplica, y su
clave es determinista (`ledger:paymentId:entryType:stripeEventId:stripeObjectId`).

El defecto estaba **antes del ledger**, en el claim del inbox de `processStripeWebhookEvent`:

- El claim era *check-then-act*, no atomico. `createWebhookEventInboxRow` inserta `received`; un segundo
  delivery concurrente recibe `23505` y relee la fila, observando tambien `received`.
- Ambos runs pasaban el gate de estado y llamaban a `markWebhookProcessing` (update incondicional por
  `id`), de modo que **los dos ejecutaban el handler**.
- El segundo run veia el payment ya en `held` y la task ya en `in_progress`, por lo que caia en rutas de
  `markFinancialMismatch`, que escriben una ledger entry `reconciliation_mismatch` por entidad
  (task y payment) => 2 entradas espurias y `reconciliation_status = needs_review`.

Es decir: duplicacion posible **por logica vulnerable**, no imposible por diseno.

## Proteccion estructural aplicada

Archivo: `server/services/stripe-event-layer.service.js`.

Claim atomico *compare-and-swap* del inbox antes de ejecutar el handler:

- Nueva funcion `claimWebhookForProcessing(eventRow)`:
  `UPDATE stripe_webhook_events SET processing_status='processing', processing_attempts=N+1, error_message=null, processed_at=null
   WHERE id = ? AND processing_attempts = N` (N = valor observado).
- `processing_attempts` es monotono y se incrementa en el mismo update => exactamente un worker
  concurrente gana el swap; los demas hacen match de 0 filas y devuelven retry (`{processing:true}`),
  sin re-ejecutar el handler.
- `processStripeWebhookEvent` ahora:
  - si la fila esta `processing` y NO es stale => retry (otro worker activo);
  - en caso contrario intenta el CAS; si pierde (null) => retry;
  - solo el ganador del CAS corre el handler.
- Compatibilidad: `processed` sigue cortocircuitando (idempotencia de reentrega), y los caminos de
  recuperacion stale (Test B) y reintento de `failed` (Test C) siguen siendo de ejecucion unica.

Resultado: doble ejecucion del handler es **imposible**, no solo improbable. Combinado con la constraint
unica de `idempotency_key`, la duplicacion de ledger queda cerrada por diseno (CAS atomico) y por
constraint (clave unica).

## Prueba reforzada

`scripts/verify-webhook-reliability.mjs`, Test D:

- Sube el fan-out concurrente de 2 a **8** disparos del mismo evento.
- Asierta que el handler se ejecuta **exactamente una vez** (un solo resultado `processed && !duplicate`).
- Asierta ausencia total de entradas `reconciliation_mismatch` (firma del bug).
- Asierta que los 2 ledger entries son exactamente `charge_captured` + `funds_held`.
- Mantiene las invariantes previas (payment `held`, task `in_progress`, 1 fila de inbox).

## Resultados

- Repro post-fix: 60 iteraciones x 8 concurrencia => **0 fallos** (antes 15/40).
- `verify:webhook-reliability`: **10/10 PASS** en corridas consecutivas.
- `verify:financial-drift`: exit 0, **0 critical** (sin regresion del Bloque 1).
- `verify:stripe-event-layer`: verde.
- `pnpm run lint`: verde. `pnpm run build`: verde. `git diff --check`: limpio (solo avisos LF/CRLF).

## Riesgos restantes

- **Audit de transicion (`task_moved_to_in_progress`) via `createIdempotentAuditEvent`**: con el claim
  atomico el handler corre una sola vez, por lo que la duplicacion de ese audit deja de ocurrir en
  doble-fire. El patron TOCTOU del helper sigue existiendo a nivel teorico si en el futuro otra ruta lo
  invoca de forma concurrente; no tiene impacto financiero y queda como deuda menor documentada (Bloque 4).
- El claim asume un unico backend logico contra una sola DB; el CAS es correcto bajo multiples instancias
  porque la atomicidad la garantiza Postgres, no el proceso.
- La recuperacion de filas stale sigue dependiendo de `STALE_WEBHOOK_PROCESSING_MS`; sin cambios.

No se movio dinero, no se tocaron datos reales, RLS/refunds/fixtures/UX intactos. No se avanza al Bloque 3.

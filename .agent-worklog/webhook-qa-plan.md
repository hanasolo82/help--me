# QA crítico · Fiabilidad del webhook Stripe → transición de tarea

Objetivo de negocio: **si Stripe confirma el pago, HelpMe no puede quedarse con el
requester en espera y la tarea sin avanzar.** Ante fallo: reintento automático,
estado recuperable, o mismatch operativo visible. Nunca silencio.

Este QA es **prerrequisito de beta, en paralelo a la validación RLS** (no después).
RLS evita acceso indebido; webhook evita pagos colgados.

---

## Cómo funciona el webhook hoy (resumen del código real)

Flujo en `processStripeWebhookEvent` (`server/services/stripe-event-layer.service.js:2282`):

1. **Inbox idempotente** — `createWebhookEventInboxRow` inserta en
   `stripe_webhook_events` con `stripe_event_id` UNIQUE. Si ya existe (23505), carga
   la fila existente y marca `duplicate`.
2. **Corto-circuito si ya `processed`** → devuelve `{duplicate, processed:true}` sin re-ejecutar.
3. **Si está `processing`**:
   - Si es *stale* (`received_at` > 5 min, `STALE_WEBHOOK_PROCESSING_MS`) → `markWebhookFailed` y continúa (re-procesa).
   - Si NO es stale → devuelve `{processing:true}` → la ruta responde **HTTP 409 + retry:true** (`stripe.routes.js:139`).
4. **`received` o `failed`** → `markWebhookProcessing` (status=`processing`, attempts+1) → handler → `markWebhookProcessed`.
5. **Si el handler lanza** → `markWebhookFailed` (status=`failed`) + audit `stripe_webhook_failed` + **re-throw** → la ruta deja propagar (no-2xx) → **Stripe reintenta**.

Transición de tarea (`promoteTaskToInProgress`, `:1251`): solo si
`payment.status` no bloqueante **y** la tarea está `assigned` **y** `created_by`/`accepted_by`
coinciden con el payment. El UPDATE va guardado con `.eq('status','assigned')` →
**solo una ejecución puede ganar** la transición.

Idempotencia de dinero:
- Ledger: `payment_ledger_entries.idempotency_key` UNIQUE + `createIdempotentLedgerEntry` captura el 23505 → no duplica.
- Transición: guard `.eq('status','assigned')` → segunda vez afecta 0 filas.
- Audit: `createIdempotentAuditEvent` es **check-then-insert (NO atómico)** → posible duplicado bajo concurrencia real (ver Test D).

---

## Cobertura: 7 escenarios pedidos

| # | Escenario | Estado | Dónde |
|---|-----------|--------|-------|
| 1 | Evento duplicado mientras el primero está `processing` | ❌ **hueco** | `verify-webhook-reliability.mjs` · Test A + D |
| 2 | Crash/timeout durante procesamiento | ⚠️ parcial | Test B (stale) + Test C (failed→retry) |
| 3 | Reintento de Stripe tras no-2xx | ❌ **hueco** | Test C |
| 4 | Fila `stripe_webhook_events` atascada en `processing` | ❌ **hueco** | Test B (stale recovery) |
| 5 | Transición real payment→`held` / task→`in_progress` | ✅ cubierto | `verify-stripe-event-layer.mjs` |
| 6 | Stripe Return polleando sin afirmar éxito hasta que la tarea cambie | 🔎 manual/frontend | Sección "Stripe Return" |
| 7 | Idempotencia: doble evento no duplica ledger/captura/release/transición | ✅ + ⚠️ | event-layer (secuencial) + Test D (concurrente) |

Leyenda: ✅ ya verificado · ⚠️ parcial · ❌ hueco que cierra el script nuevo · 🔎 verificación manual.

---

## Orden de ejecución recomendado

```bash
# 0. Requisito: server/.env con SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#    Apuntar a un proyecto de TEST/STAGING, nunca producción (crea/borra usuarios y filas).

# 1. Base ya existente (idempotencia secuencial, transición, out-of-order, mismatch)
pnpm run verify:stripe-event-layer

# 2. Huecos de fiabilidad (este QA)
pnpm run verify:webhook-reliability

# 3. Camino de release/cierre (transfer.paid → released → task closed)
pnpm run verify:payment-release
```

Todos los scripts **crean y limpian** sus propios datos (usuarios, tasks, payments,
eventos). Si un run aborta a medias, revisa filas huérfanas con
`pnpm run inspect:financial-state`.

---

## Qué prueba `verify:webhook-reliability` (script nuevo)

- **Test A — Stuck `processing` → 409 retry.** Fila pre-insertada en `processing`
  fresca (no stale). El reenvío del mismo evento devuelve `{processing:true}` y **no**
  toca el payment. Confirma el contrato 409/retry hacia Stripe.

- **Test B — Recuperación de fila atascada (stale).** Fila en `processing` con
  `received_at` de hace 6 min. El reenvío detecta stale, la marca `failed` y
  **re-procesa hasta `processed`**: payment→`held`, task→`in_progress`. Demuestra que
  un crash a mitad de proceso es **recuperable**, no un pago colgado para siempre.

- **Test C — Reintento de Stripe tras no-2xx.** Fila en `failed` (como tras un crash
  que devolvió 500). El reenvío de Stripe la lleva a `processed` con transición
  correcta. Demuestra que el no-2xx + retry de Stripe converge.

- **Test D — Concurrencia real (doble disparo simultáneo).** `Promise.all` de dos
  veces el mismo `payment_intent.succeeded`. Invariantes **financieras duras**:
  - exactamente **2** ledger entries (no 4),
  - task transiciona **una sola vez** (`in_progress`),
  - **1** fila en `stripe_webhook_events`.
  Invariante **blanda** (se reporta, no rompe): nº de audits `task_moved_to_in_progress`.
  Si sale >1, es la señal del TOCTOU no-atómico en `createIdempotentAuditEvent`
  (no afecta dinero, pero conviene anotarlo como deuda).

Criterio de éxito del script: **exit 0** = invariantes de dinero intactas en los 4
tests. Cualquier violación financiera → **exit 1** con detalle.

---

## Stripe Return (escenario 6 · verificación manual de frontend)

El backend ya separa estados correctamente: `checkout.session.completed` deja el
payment en `processing`; solo `payment_intent.succeeded` lo pasa a `held` y mueve la
tarea a `in_progress`. Por tanto la pantalla de retorno **no debe afirmar "pago
recibido" basándose en el redirect de Stripe**, sino **pollear el estado real**.

Checklist a verificar en la UI de Stripe Return:
- [ ] Tras el redirect, la pantalla muestra estado "confirmando…", no "pagado".
- [ ] Pollea `tasks.status` (o el payment) hasta `in_progress` antes de afirmar éxito.
- [ ] Si tras N intentos sigue sin avanzar, muestra estado recuperable
      ("seguimos confirmando tu pago"), no error ni falso éxito.
- [ ] El composer del chat permanece bloqueado hasta `in_progress`
      (esto ya lo garantiza RLS vía `can_access_conversation`; ver
      `supabase/validation/0040_rls_validation.sql` Test 12).

---

## Resultado esperado de negocio (lo que demuestra este QA)

1. Pago confirmado en Stripe → tarea **siempre** acaba en `in_progress`, aunque el
   primer intento de webhook fallara (Test B y C).
2. Reintentos/duplicados de Stripe **nunca** duplican dinero ni transición (Test A, D, y event-layer).
3. Si algo no cuadra, queda un **mismatch auditado** (`reconciliation_mismatch`,
   `payment.reconciliation_status='needs_review'`), recuperable por operación.

---

## Run log

### 2026-06-17 · verify:webhook-reliability

- **Entorno:** Supabase `zaikijuzgeatbwtbjqcp` ("helpMe", proyecto único) · Stripe **test** (`sk_test_`).
  Confirmado explícitamente con el usuario que no hay staging separado; se aceptó correr
  contra la base canónica (sin dinero real; script namespaced + autolimpieza).
- **Baseline (pre-run):** profiles 10 · tasks 13 · payments 7 · ledger 37 · webhook_events 62 · audit 169 · sin artefactos de test previos.
- **Resultado:** `Webhook reliability checks passed.` · **exit 0**.
  - Test A (stuck processing → 409 retry): ✅
  - Test B (stale recovery → in_progress): ✅
  - Test C (failed → retry converge): ✅
  - Test D (concurrencia, invariantes financieras): ✅ · **sin** warning de audit duplicado (transición auditada 1 vez).
- **Post-run:** conteos idénticos al baseline → **cero huérfanos**, limpieza correcta.
- **Veredicto:** riesgo webhook **mitigado técnicamente**. A–D verdes. Deuda P2 del TOCTOU en
  `createIdempotentAuditEvent` sigue siendo teórica (no se reprodujo en este run); el dinero está
  protegido por `idempotency_key` UNIQUE + guard `.eq('status','assigned')`.
- **Pendiente:** checklist manual de Stripe Return (escenario 6, frontend).
- Snapshot reutilizable: `tmp/qa-snapshot.mjs` (solo lectura).

# Fase 3 / Bloque 1 - Investigacion de deriva financiera

Fecha: 2026-06-25

## Alcance y metodo

- Investigacion read-only de los findings de `pnpm run verify:financial-drift`.
- Lectura con service role de `tasks`, `payments`, `transfers`, `refunds`, `stripe_webhook_events`,
  `audit_events` y `ledger_entries`.
- Lectura de Checkout Sessions, PaymentIntents, Charges y Transfers en Stripe test.
- Sin `insert`, `update`, `delete`, replay de webhooks ni llamadas que muevan dinero.
- Evidencia bruta: `tmp/financial-drift-result.json` y `tmp/financial-drift-investigation.json`.

## Resumen ejecutivo

El detector encontro un bloqueo real, no un falso positivo:

- Dos tareas manuales de QA estan `completed` con pagos cobrados en Stripe, pero el estado local del pago
  quedo en `processing`.
- La causa probable es una carrera vigente entre `checkout.session.completed` y
  `payment_intent.succeeded`: ambos handlers leen el mismo estado previo y realizan updates no
  condicionados. El update de Checkout puede sobrescribir `held` con `processing`.
- El cierre de ambas tareas intento liberar el pago y fallo correctamente porque el gate exige
  `payment.status = 'held'`. No se creo ninguna transferencia.
- Los cinco `needs_review` se reparten entre dos fallos de transferencia por saldo test insuficiente y
  tres fixtures de smoke con refund total posterior a una transferencia ya pagada.
- El webhook fallido de `transfer.created` es un residuo historico de test asociado a entidades ya
  eliminadas. La columna `payments.stripe_transfer_id` existe desde la migracion 0032 y esta disponible
  actualmente; el error fue de schema cache desactualizada en aquel momento.

## Critical 1

### Task `67762f8c-53a8-4f89-a744-43691d0b94ba`

| Campo | Evidencia |
|---|---|
| Tarea | `completed`; creada `2026-06-23T04:31:00Z`; completada `2026-06-23T04:58:00Z` |
| Payment | `6692e7b7-7a7b-4062-86e9-6efbb3ca597e`; `processing`; EUR 100.00 |
| Checkout | `cs_test_a1DB...`; `complete`; `paid` |
| PaymentIntent | `pi_3TlMDA...`; `succeeded` |
| Charge | `ch_3TlMDA...`; `succeeded`; no reembolsado |
| Ultimos webhooks | Checkout y PaymentIntent procesados correctamente a las `04:45:27Z` |
| Ledger | `checkout_completed`, `charge_captured`, `funds_held` |
| Transfer | No existe |
| Ultimo intento de cierre | `release_validation_failed` a las `04:58:01Z`, porque el payment seguia `processing` |

**Clasificacion:** bug actual de concurrencia que produjo una transicion interrumpida. No es deuda
puramente historica: el patron de update sigue presente en el handler actual.

**Causa probable:** `handleCheckoutSessionCompleted` y `handlePaymentIntentSucceeded` resuelven el payment
antes de actualizarlo. `updatePaymentRow` hace un update por `id`, sin comparar el estado actual. Si ambos
eventos corren a la vez, Checkout puede escribir `processing` despues de que PaymentIntent haya escrito
`held`, aunque el cobro, ledger y promocion de tarea hayan terminado bien.

**Reparacion recomendada:**

1. Corregir primero la carrera con una transicion condicional/atomica que impida degradar `held` a
   `processing`.
2. Verificar otra vez en Stripe que PI y charge siguen `succeeded`, no reembolsados ni disputados, y que no
   existe transferencia.
3. Reparar solo el estado local `processing -> held` mediante una operacion guardada por todos esos
   precondiciones.
4. No liberar dinero desde el script de reparacion. Tras reconciliar el estado local, usar el flujo
   idempotente existente de release o una operacion manual supervisada.

**Riesgo de tocar el registro:** medio-alto. El estado financiero externo es claro, pero cambiar el estado
local vuelve a habilitar una operacion que mueve dinero. Debe ejecutarse solo despues del fix de carrera y
con una nueva lectura autoritativa de Stripe.

## Critical 2

### Task `515bb723-c076-4c19-bfa3-d3f7df4cfc45`

| Campo | Evidencia |
|---|---|
| Tarea | `completed`; creada `2026-06-21T07:40:12Z`; completada `2026-06-21T07:54:19Z` |
| Payment | `6bcd1622-70ef-4a04-93a2-27685e44ec89`; `processing`; EUR 33.00 |
| Checkout | `cs_test_a15T...`; `complete`; `paid` |
| PaymentIntent | `pi_3TkgCM...`; `succeeded` |
| Charge | `ch_3TkgCM...`; `succeeded`; no reembolsado |
| Ultimos webhooks | PaymentIntent y Checkout procesados correctamente a las `07:53:48Z` |
| Ledger | `checkout_completed`, `charge_captured`, `funds_held` |
| Transfer | No existe |
| Ultimo intento de cierre | `release_validation_failed` a las `07:54:20Z`, porque el payment seguia `processing` |

**Clasificacion:** mismo bug actual de concurrencia y misma transicion interrumpida que Critical 1.

**Reparacion recomendada:** identica a Critical 1, tratada como una segunda unidad independiente. No
agrupar ambos updates sin revalidar Stripe y Supabase registro por registro.

**Riesgo de tocar el registro:** medio-alto por la misma razon: la correccion local habilita de nuevo el
release.

## Payments `needs_review`

| Payment | Estado actual | Causa probable | Clasificacion | Recomendacion | Riesgo |
|---|---|---|---|---|---|
| `339a5e9e-c2bb-4d4b-b696-6b46139d0c26` | Payment `held`; task `completed`; transfer local `failed` | Stripe test rechazo la transferencia por `balance_insufficient` | Transicion interrumpida real en test | Aportar saldo test y reintentar mediante el flujo idempotente existente; confirmar que el mismo transfer fallido se reutiliza o actualiza sin duplicar | Medio |
| `de224f49-f79a-4c09-af56-b88c96b85a2a` | Payment `held`; task `completed`; transfer local `failed` | Stripe test rechazo la transferencia por `balance_insufficient` | Transicion interrumpida real en test | Misma reparacion que el registro anterior; no marcar `reconciled` antes de un resultado Stripe valido | Medio |
| `95ab67c9-fd69-4bba-b8ae-6740238ad8b8` | Payment `released`; task `closed`; transfer `paid`; refund total `succeeded` | Fixture `Stripe smoke task`; refund creado despues de liberar el dinero | Deriva historica/intencional de prueba que requiere revision por diseno | En test, conservar como evidencia o retirar la fixture con un procedimiento explicito de limpieza. En un caso real, conciliar refund frente a transferencia y decidir recovery manual | Alto en datos reales; bajo si se confirma fixture desechable |
| `6a1af7d4-dcb5-4d0e-bd06-602f287683a5` | Payment `released`; task `closed`; transfer `paid`; refund total `succeeded` | Fixture `Stripe smoke task`; refund posterior al release | Deriva historica/intencional de prueba | Igual que el registro anterior | Alto en datos reales; bajo si se confirma fixture desechable |
| `c2559ae8-8710-45cb-81c2-1afb66ef321e` | Payment `released`; task `closed`; transfer `paid`; refund total `succeeded` | Fixture `Stripe smoke task`; refund posterior al release | Deriva historica/intencional de prueba | Igual que el registro anterior | Alto en datos reales; bajo si se confirma fixture desechable |

### Observaciones sobre los cinco warnings

- Los dos fallos por saldo insuficiente tienen Checkout `complete/paid` y PaymentIntent `succeeded`; no
  son pagos fallidos. El fallo esta exclusivamente en la transferencia.
- Los tres smoke records tienen refunds locales `succeeded` por el importe total y charges Stripe
  actualmente `refunded = true`.
- Sus transfers Stripe siguen existiendo y no estan reversed. Por eso el handler conserva el estado
  avanzado y marca `needs_review` en vez de fingir una reconciliacion automatica.
- Las Checkout Sessions de esas fixtures aparecen actualmente `expired/unpaid`, pero el PaymentIntent,
  charge, transfer, ledger y webhooks historicos prueban el recorrido de smoke. No debe usarse el estado
  actual de esas sesiones aisladas para reescribir la contabilidad.

## Webhook `transfer.created` fallido

### Evento `evt_transfer_created_bf473fa8`

- Recibido: `2026-05-31T20:07:04Z`.
- Error: `Could not find the 'stripe_transfer_id' column of 'payments' in the schema cache`.
- Payload sintetico: transfer `tr_07809cf3-be73-4143-9a5b-`, payment
  `bb4e3812-7a10-4032-85ac-478f1ac8a492`, task `08df85c7-4306-4077-8b69-0c90290dcab1`.
- Payment y task ya no existen; no procede replay.
- Existe audit `stripe_webhook_failed` asociado.

### Diagnostico de schema

- `supabase/migrations/0032_payments_stripe_transfer_id.sql` crea
  `public.payments.stripe_transfer_id` y su indice unico parcial.
- La columna existe ahora y las lecturas actuales de PostgREST la resuelven correctamente.
- La migracion 0032 no incluye `notify pgrst, 'reload schema'`; migraciones posteriores si lo incluyen.
- La explicacion mas probable es una ventana historica entre aplicar 0032 y refrescar el schema cache.

**Recomendacion:** no hacer que el handler tolere silenciosamente la ausencia de una columna financiera.
Eso ocultaria un deploy incompleto y podria dejar payment/transfer divergentes. La medida correcta es
asegurar migracion + reload de schema antes de habilitar el backend, y registrar esta comprobacion en el
gate de despliegue. Este evento concreto es un residuo de test y no debe reintentarse porque sus entidades
ya no existen.

**Riesgo de tocar el registro:** bajo si solo se clasifica/archiva como fixture; medio si se cambia su
estado porque se perderia evidencia de un fallo real de despliegue.

## Propuesta de script de reparacion

No se implemento. Si se aprueba, crear `scripts/repair-financial-drift.mjs` con estas garantias:

- `--dry-run` por defecto y sin opcion implicita de escritura.
- Para aplicar: exigir simultaneamente `--apply`, `--entity=<id>` y
  `--confirm=<hash-del-plan-generado>`.
- Generar primero un artifact inmutable con precondiciones, lecturas Stripe, estado local, plan y hash.
- Releer todas las precondiciones inmediatamente antes del update.
- Updates condicionados por `id`, estado previo, `updated_at` y ausencia/presencia esperada de transfer.
- Crear audit administrativo con before/after, razon, operador y artifact de origen.
- Nunca crear transfer, refund ni payout. El dinero debe seguir moviendose solo mediante los flujos
  idempotentes existentes.
- Modos propuestos:
  - `reconcile-processing-to-held`: solo para los dos critical, si PI/charge siguen cobrados, no
    reembolsados/disputados y no existe transfer.
  - `retry-failed-release-plan`: solo informa si un release fallido es reintentable; no lo ejecuta.
  - `classify-test-fixture`: etiqueta en el artifact, no modifica tablas financieras.
- Abort completo ante cualquier cambio desde el dry-run.

## Decision de fase

- Bloque 1: detector implementado, pero validacion del entorno test bloqueada por findings reales.
- Bloque 2: no debe comenzar todavia.
- Fix de carrera aplicado y validado el 2026-06-25:
  - Checkout solo promociona a `processing` desde estados tempranos mediante update condicionado.
  - Un Checkout tardio conserva `held` y actualiza solo sus referencias.
  - Pruebas secuencial y concurrente pasan en `verify:stripe-event-layer`.
- Siguiente decision: aprobar un plan separado de reparacion supervisada de los dos pagos `processing`.

## Reparacion supervisada aplicada - 2026-06-25

Script: `scripts/repair-financial-drift.mjs` (`pnpm run repair:financial-drift`).
Modo `--dry-run` por defecto; aplicar exige `--apply --entity=<id> --confirm=<hash-del-plan>`.

Garantias implementadas:

- Relee Stripe (PaymentIntent `succeeded`, charge no reembolsado, sin disputa, sin transfer por
  `transfer_group`/`metadata.payment_id`) y Supabase (task `completed`, payment `processing`, ledger con
  `funds_held`, sin transfer local) inmediatamente antes de proponer y antes de aplicar.
- Plan con before/after y hash deterministico que incluye `updated_at` y el snapshot Stripe; cualquier
  drift entre dry-run y apply invalida el hash y aborta.
- Update guardado por `id` + `status = 'processing'` + `updated_at` esperado + `stripe_transfer_id is null`;
  0 filas afectadas => aborta sin cambios.
- Audit administrativo `financial_drift_repair` (actor `admin`) con before/after, causa, operador, fecha,
  hash y artifact de dry-run. No crea transfer/refund/payout.

Resultado dry-run: 2/2 reparables, 9/9 precondiciones OK. Unico cambio real: `status processing -> held`
(el handler de `payment_intent.succeeded` ya habia escrito `held_at` y `reconciliation_status = reconciled`;
la carrera de Checkout solo revirtio `status`).

Aplicado:

| Payment | Task | Antes | Despues | Audit |
|---|---|---|---|---|
| `6692e7b7-7a7b-4062-86e9-6efbb3ca597e` (EUR 100.00) | `67762f8c-53a8-4f89-a744-43691d0b94ba` | `processing` | `held` | `bb461be4-aa06-47b0-8bf1-3479b0f02d19` |
| `6bcd1622-70ef-4a04-93a2-27685e44ec89` (EUR 33.00) | `515bb723-c076-4c19-bfa3-d3f7df4cfc45` | `processing` | `held` | `72377370-fb98-4ae8-be09-86584218b24d` |

No se movio dinero. El release sigue gateado por el flujo idempotente existente.

Validacion post-reparacion:

- `pnpm run verify:financial-drift`: exit `0`, **`0 critical`**, `6 warning` (los mismos ya clasificados).
- `pnpm run verify:stripe-event-layer`: verde.
- `pnpm run verify:webhook-reliability`: verde (flaky en Test D, area del race TOCTOU documentado en Bloque 4;
  fallo intermitente en la 1a corrida, verde al reintentar; no relacionado con esta reparacion).
- `pnpm run lint`: verde. `pnpm run build`: verde. `git diff --check`: limpio (solo avisos LF/CRLF).

### Estado final de los critical

Cerrados. `TASK_ADVANCED_NO_PAID_PAYMENT` ya no aparece para ninguna de las dos tareas.

### Warnings restantes (no bloquean dinero real, ya clasificados)

- `PAYMENT_NEEDS_REVIEW` x2: releases fallidos por `balance_insufficient` en Stripe test (`339a5e9e`, `de224f49`).
- `PAYMENT_NEEDS_REVIEW` x3: fixtures `Stripe smoke task` con refund total posterior al release
  (`95ab67c9`, `6a1af7d4`, `c2559ae8`).
- `WEBHOOK_FAILED` x1: evento sintetico historico `evt_transfer_created_bf473fa8` (schema cache antiguo,
  entidades inexistentes; no procede replay).

**Bloque 1 cerrado:** `verify:financial-drift` sin los 2 critical. Warnings documentados y clasificados.

# Auditoría — Liberación de pagos: tareas completadas con dinero atascado

Fecha: 2026-07-26 · Rama: main · Sin cambios de código (solo auditoría).
Origen: el owner detecta en /pagos que tareas "terminadas" aparecen como dinero pendiente.
Traspaso: **Sol** supervisa (decisión de producto/prioridad), **Terra** implementa (backend + RLS).

Evidencia recogida con consultas **de solo lectura** al Supabase real (service_role, agregadas,
sin datos personales). Entorno de pruebas, tratado como real para validar el flujo.

---

## Veredicto

**No es un error de interpretación del estado ni del display.** Los estados están bien modelados y
las cifras de /pagos son fieles: el dinero que aparece como retenido realmente **no ha salido** hacia
el helper. "Tarea completada" y "pago liberado" son dos cosas distintas.

Lo que la auditoría sí destapa es un **riesgo de negocio real en el flujo**: completar la tarea y
liberar el pago son operaciones **no atómicas** y **no hay reintento ni reconciliación automática**
que recupere los pagos que quedan atascados. En producción, esto puede dejar a un helper **sin cobrar
en una tarea ya cerrada, sin nada que lo detecte ni lo reintente**.

---

## Cómo funciona el flujo (verificado)

1. `TaskComplete.jsx:167-185` — al confirmar el cierre hace DOS pasos separados y no transaccionales:
   `markTaskCompleted` (tarea → `completed`, `tasksService.js:865`) y **luego** `releaseTaskPayment`.
   Si el 2º paso no ocurre (timeout de 15s, red, pestaña cerrada), la tarea queda `completed` con el
   pago en `held`.
2. Liberación en `server/services/payments.service.js:1046-1191`:
   - Si el helper **no tiene cuenta Stripe Connect válida** → lanza error *antes* de mover dinero; el
     pago se queda como estaba (`held`), sin marca de fallo.
   - Pone `release_pending`, crea la transferencia; si `createStripeTransferForPayment` **falla** →
     revierte el pago a `held` con `reconciliation_status: 'needs_review'` y el motivo del error.
   - Si la transferencia se crea → pago `transferring`; el estado final `released` lo pone el webhook
     `transfer.paid` (`stripe-event-layer.service.js:1879-1912`, que además cierra la tarea).
3. **No se encontró** en el servidor ningún cron/job/reintento que recupere pagos en
   `held`/`needs_review`/`transferring` colgados (grep de cron|schedule|retry|needs_review). La única
   recuperación es manual: re-ejecutar el cierre reintenta la liberación.

---

## Datos reales (19 pagos, snapshot 2026-07-26)

| Tarea | Pago | Reconciliación | Nº | Helper € | Lectura |
|---|---|---|---|---|---|
| completed | held | **needs_review** | 3 | **315,00** | Liberación intentada, transfer **falló**: *"insufficient available funds in your Stripe account"* (saldo de test). Marcado, pero nada lo reintenta. |
| completed | held | reconciled | 3 | **143,00** | **La liberación NO se intentó** (sin fallo, sin flag). El hueco no-atómico: tarea cerrada, `release` nunca corrió. **Silencioso** (recon=reconciled → un monitor no lo detectaría). |
| in_progress | held | reconciled | 4 | 147,00 | Normal: tarea en curso, dinero correctamente retenido. ✅ |
| completed | transferring | reconciled | 3 | 52,00 | Transferencia creada, esperando webhook `transfer.paid`. En camino; sin timeout/dead-letter si el webhook no llega. |
| closed | released | needs_review | 3 | 37,02 | **Cobrado** ✅ pero flag por evento fuera de orden: *"Charge refunded after a later local payment state"*. Edge de reconciliación a revisar. |
| assigned | draft | pending | 2 | 24,00 | Aún sin pagar. ✅ |
| cancelled | voided | pending | 1 | 10,00 | Anulado. ✅ |

Modos de fallo que importan: **315 € (fallo de transfer, flagueado, sin reintento)** y
**143 € (liberación nunca intentada, silenciosa)** son los críticos. Los 52 € en tránsito son un
riesgo menor (dependen de un webhook sin red de seguridad).

---

## Para Sol (supervisar / decidir producto)

1. Priorizar el arreglo del flujo: el modo "143 € silencioso" es el más peligroso porque no deja
   rastro (recon=reconciled). Decidir si bloquea beta.
2. Definir la política de negocio: ¿qué pasa cuando el helper no tiene Stripe al cerrarse la tarea?
   ¿Se bloquea el cierre hasta que pueda cobrar, se retiene y se avisa, se reintenta al conectar Stripe?
3. Aprobar el alcance del display (abajo) — es lo único de esto que se puede hacer sin tocar pagos.

## Para Terra (implementar — requiere autorización, toca pagos/Stripe)

1. **Atomicidad completar↔liberar**: que `markTaskCompleted` y la liberación no puedan divergir
   (misma transacción/estado, o que "completed" sin liberación quede en una cola de trabajo explícita,
   nunca en `held` silencioso con recon=reconciled).
2. **Reintento/reconciliación de liberaciones fallidas**: job que barra `needs_review` y
   `release_pending`/`transferring` colgados y reintente o escale. Hoy no existe.
3. **Timeout/dead-letter** para `transferring` sin `transfer.paid` en un plazo.
4. **Revisar el edge de los 37 €** (released + needs_review por refund fuera de orden): confirmar que
   el dinero del helper y el del refund cuadran.
5. RLS/seguridad: cualquier cola o endpoint de reintento debe ser server-authorized; el cliente nunca
   dispara ni ve reintentos de pago ajenos.

## Mejora de display (frontend, en alcance, sin tocar pagos) — opcional, aprobación de Sol

`getMyPayments` (`src/services/paymentsService.js:62`) hoy NO trae `tasks(status)` ni
`reconciliation_status`, así que /pagos no puede distinguir un `held` normal de uno atascado y mete
todo en "Pendiente de liberar" (y cuenta `transferring` como pendiente cuando va en camino). Añadiendo
esos dos campos (cambio de solo lectura) se pueden separar cuatro cifras honestas:
**Cobrado** (released) · **En camino** (transferring/release_pending) · **Retenido en curso**
(held de tareas activas) · **Requiere revisión** (held/needs_review o completed sin liberar). Así el
panel deja de sugerir que 458 € están "pendientes" y avisa de que son liberaciones a revisar.

---

## Reproducir la evidencia

Consulta de solo lectura (service_role, `server/.env`) agregando por
`tasks.status × payments.status × reconciliation_status`, sumando `helper_amount_cents` y recogiendo
`reconciliation_error` distintos. No expone datos personales. (Script temporal, ya eliminado; no se
dejó nada en el repo.)

## Restricciones vigentes

No commit/push/deploy; no tocar el flujo de pagos/Stripe sin autorización del owner; el arreglo del
flujo es de Terra bajo supervisión de Sol. Esta auditoría no modificó código.

---

## Addendum Codex — contraste con Stripe y comprobación remota

Fecha: 2026-07-26. Consultas de solo lectura, agregadas y sin IDs ni datos personales.

La hipótesis inicial necesita una corrección importante:

1. Stripe Connect no publica `transfer.paid` ni `transfer.failed` para objetos `Transfer`.
   Los eventos públicos son `transfer.created`, `transfer.updated` y `transfer.reversed`.
2. El objeto `Transfer` no tiene una propiedad `status`. Que
   `scripts/reconcile-financial-state.mjs` consulte `remote.transfer.status` hace que esa
   reconciliación sea ciega para este caso.
3. Crear correctamente un `Transfer` ya confirma que Stripe movió el importe a la cuenta
   conectada. El payout posterior desde esa cuenta a su banco es otro ciclo distinto.

Comprobación contra Stripe test:

- Los 3 pagos `completed/transferring` (52,00 EUR) tienen una fila local de transferencia y
  los 3 objetos existen en Stripe, con `balance_transaction` y `destination_payment`. Es dinero
  ya transferido a la cuenta Stripe conectada; falta finalizar el estado local y cerrar la tarea.
- Los 3 `closed/released` (37,02 EUR) también tienen objetos Stripe válidos.
- Ninguna de las 6 transferencias existentes usa `source_transaction`.
- Los 3 `completed/held/needs_review` (315,00 EUR) no llegaron a crear un objeto Transfer.
- Los 3 `completed/held/reconciled` (143,00 EUR) no tienen intento ni transferencia.
- En los pagos reales revisados, el `latest_charge` existe, coincide con `stripe_charge_id`,
  cubre `helper_amount_cents` y usa la misma moneda. Es apto para `source_transaction`.

### Veredicto corregido

Hay tres defectos P0, todos de código y reproducibles también en producción:

1. Cierre y solicitud de liberación no durables: el cliente ejecuta dos llamadas y oculta el
   fallo posterior si la tarea ya quedó `completed`.
2. Creación de Transfer sin `source_transaction`: depende del saldo disponible de plataforma;
   Stripe no reintenta automáticamente un fallo por saldo insuficiente.
3. Finalización dependiente de eventos y propiedades que no existen en Stripe. Los tests
   actuales fabrican `transfer.paid`/`transfer.failed`, por lo que dan una falsa garantía.

El entorno test hizo visible el problema de saldo; no lo causó. El backend debe considerar
`transfer.created` o la respuesta exitosa de `stripe.transfers.create` como transferencia
realizada a la cuenta conectada, y mantener los payouts bancarios como un ciclo separado.

### Otros huecos confirmados

- La clave de idempotencia de transferencia es fija por pago. Stripe conserva también la
  respuesta de error de una petición idempotente; un reintento de negocio definitivo necesita
  un nuevo intento/clave, mientras una respuesta incierta debe reutilizar la clave del intento.
- `verify:financial-drift` considera normal `completed + held` y solo eleva `needs_review` a
  warning, por lo que no detecta los 143,00 EUR silenciosos.
- `verify:payment-release` no está incluido en CI y valida eventos sintéticos imposibles.
- La API Stripe está fijada a `2024-06-20`; la actualización debe hacerse en una fase separada,
  no mezclada con esta reparación.

### Política recomendada

- `completed` significa trabajo confirmado; `closed` solo cuando la transferencia a la cuenta
  Stripe conectada se haya creado y reconciliado.
- Si el helper aún no puede cobrar, conservar `completed`, mantener el dinero retenido, marcar
  revisión explícita y reintentar al quedar su cuenta lista. No afirmar que está cobrado.
- Para nuevas tareas, validar la preparación de cobros antes de permitir el paso financiero que
  inicia la tarea. Esta prevención puede ir después del P0 de liberación.

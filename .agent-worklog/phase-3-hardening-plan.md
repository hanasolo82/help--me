# Fase 3 — Blindaje de dinero, confianza y consistencia transaccional

> Brief de implementación para el agente ejecutor. Autocontenido.
> Autor del diagnóstico: senior full-stack (auditoría read-only de 4 áreas).
> Fecha: 2026-06-25.

## 0. Cómo usar este documento

Ejecuta por **bloques pequeños y secuenciales**. Tras cada bloque: `npm run lint`, `npm run build`,
`git diff --check`, y la validación específica del bloque. No avances al siguiente bloque si el actual
no queda verde. Commits separados por bloque, mensajes claros.

Entorno confirmado por el owner: **existe Supabase de test + Stripe en test mode** con secrets disponibles
para CI. El gestor de paquetes real del repo es **pnpm** (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml`),
aunque los scripts npm también funcionan. Usa `pnpm` para instalar en CI.

## 1. Contexto: qué YA está hecho (NO reabrir)

La auditoría confirmó que el backend de dinero ya es de calidad producción. **No rehagas nada de esto:**

- **Webhooks Stripe** (`server/routes/stripe.routes.js`, `server/services/stripe-event-layer.service.js`):
  - Firma obligatoria: `express.raw` en `server/index.js` + `constructStripeEvent` con `STRIPE_WEBHOOK_SECRET`. Sin firma → 400.
  - Idempotencia por `stripe_webhook_events.stripe_event_id` (único). Evento ya `processed` → no-op.
  - Estados de inbox: `received → processing → processed | failed`. Recuperación de `processing` colgado a 5 min (`STALE_WEBHOOK_PROCESSING_MS`).
  - Guards de orden: `PAYMENT_STATUS_BLOCKING`, `canAdvanceTransferStatus`; cierre de tarea por `transfer.paid` con update condicional anti-race.
  - Reintentos: error → fila `failed` + audit + respuesta 500/409 para que Stripe reintente.
  - Handlers existentes: `account.updated`, `checkout.session.completed`, `payment_intent.succeeded|payment_failed`, `charge.refunded`, `charge.dispute.*`, `transfer.*`, `payout.*`.
- **RLS / RPCs** (`supabase/migrations/0039_task_applications_workflow.sql`, `0040_close_payment_gate_security_gaps.sql`, `0028_financial_ledger_first.sql`, `0036_payment_gate_premium_task_chat.sql`):
  - `apply_to_task`, `withdraw_task_application`, `select_task_helper`, `reject_assigned_helper`: todos `SECURITY DEFINER` con checks server-side y `FOR UPDATE`.
  - Índice único parcial `task_applications_one_active_per_helper_task_idx (task_id, helper_id) where status in ('pending','selected')` → no se puede aplicar dos veces.
  - `withdraw_task_application` filtra `helper_id = me` → no se puede retirar oferta ajena.
  - Helper sin UPDATE directo a `tasks` (0040 eliminó sus políticas). `payments`/`transfers` solo `SELECT` para participantes; `revoke insert/update/delete`.
  - Gate de chat por `can_access_conversation` (SECURITY DEFINER): desbloquea solo `in_progress/completed/closed`.

**Conclusión:** prioridades #1 (webhooks) y #3 (RLS) están cubiertas. Fase 3 = cerrar las grietas de abajo.

## 2. Restricciones (heredadas de Fase 2B + esta fase)

- NO code-splitting ni optimización de bundle.
- NO features nuevas de producto.
- NO refactor de los 4 surfaces de oferta a hook compartido.
- NO implementar ejecución real de reembolsos/disputas/payouts (solo el código actual los **espeja**; se mantiene así).
- NO cambios de UX salvo los estrictamente necesarios para estados de pago/error (Bloque 2 lo permite).
- NO escrituras destructivas automáticas: scripts de reconciliación son **report-only**.
- Cambios pequeños, auditables, con validación clara.

## 3. Estados del sistema (referencia)

**Task.status:** `draft, open, assigned, in_progress, completed, closed, cancelled`.
**Payment.status (observados en `stripe-event-layer.service.js`):** `draft, requires_checkout, pending, requires_action, processing, captured, held, release_pending, transferring, released, failed, refunding, refunded, disputed, external_agreed, voided, succeeded`.
**Payment.reconciliation_status:** `pending, reconciled, mismatch, needs_review`.

Camino feliz: `open → (apply+select) → assigned → (checkout+pago) → in_progress → completed → (transfer.paid) → closed`.
**`transfer.paid` es el único evento que pasa la tarea a `closed`.** La promoción a `in_progress` la hace `payment_intent.succeeded`.

> Antes de escribir queries en el Bloque 1, **verifica los nombres exactos de columnas** contra
> `supabase/schema.sql` y `scripts/lib/financial-ops.mjs` (que ya tiene los accessors). No asumas.

---

## BLOQUE 1 — Detector de deriva financiera (read-only) 🔴 prioridad máxima

**Objetivo:** detectar inconsistencias entre `payments`, `tasks`, `transfers` y `stripe_webhook_events`
que hoy son invisibles. Es la pieza que cubre "pago completado sin tarea actualizada" y
"tarea pagada sin pago confirmado". Pura lectura a Supabase (sin Stripe).

**Archivo nuevo:** `scripts/verify-financial-drift.mjs`
**Reutiliza:** `scripts/lib/financial-ops.mjs` (clientes Supabase admin/anon, env loader, escritura de artifacts a `tmp/`).
**Patrón de referencia:** copia estructura/estilo de `scripts/reconcile-financial-state.mjs` (también report-only, mismo manejo de exit code y artifact JSON).

**Invariantes a comprobar** (cada violación = finding con `{severity, code, entity_id, detail}`):

| Code | Severidad | Condición |
|---|---|---|
| `MONEY_HELD_TASK_NOT_ADVANCED` | critical | `payment.status ∈ {held, transferring, release_pending, released}` Y `task.status ∉ {in_progress, completed, closed}` |
| `RELEASED_TASK_NOT_CLOSED` | critical | `payment.status = 'released'` Y `task.status ≠ 'closed'` |
| `TASK_ADVANCED_NO_PAID_PAYMENT` | critical | `task.status ∈ {in_progress, completed, closed}` Y NO existe payment del task con status ∈ `{held, transferring, release_pending, released, external_agreed}` |
| `TASK_ADVANCED_PAYMENT_FAILED` | critical | `task.status ∈ {in_progress, completed}` Y payment del task con `status = 'failed'` y sin otro payment válido |
| `MONEY_HELD_TASK_CANCELLED` | critical | `payment.status ∈ {held, transferring, release_pending}` Y `task.status = 'cancelled'` (dinero retenido en tarea cancelada → requiere refund manual) |
| `WEBHOOK_FAILED` | warning | `stripe_webhook_events.processing_status = 'failed'` |
| `WEBHOOK_STUCK_PROCESSING` | warning | `processing_status = 'processing'` y antigüedad > 5 min (`STALE_WEBHOOK_PROCESSING_MS`) |
| `PAYMENT_NEEDS_REVIEW` | warning | `payment.reconciliation_status ∈ {mismatch, needs_review}` |
| `DUPLICATE_ACTIVE_PAYMENT` | warning | > 1 payment con status no terminal (`∉ {voided, failed, refunded}`) por `task_id` |

**CLI / comportamiento:**
- Flags: `--since=<ISO|Nd>` (ventana, default últimos 30 días), `--limit=<n>` (default 2000), `--strict` (warnings también hacen fallar), `--artifact=<path>` (default `tmp/financial-drift-result.json`).
- Salida: resumen legible por consola + artifact JSON con `{ generatedAt, window, findings[], counts: {critical, warning} }`.
- **Exit code:** `1` si hay algún `critical` (o cualquier finding con `--strict`); `0` si limpio. Esto lo hace usable como gate.
- **Solo lectura.** Cero `update/insert/delete`. No crea datos de test.
- Usa el cliente **admin (service role)** de `financial-ops.mjs` para poder leer todas las filas.

**package.json:** añade `"verify:financial-drift": "node scripts/verify-financial-drift.mjs"` junto al resto de `verify:*`.

**Validación del bloque:**
- `pnpm run lint`, `pnpm run build`.
- Correr `pnpm run verify:financial-drift` contra el Supabase de test → debe terminar (exit 0 si no hay deriva, o listar findings reales sin mutar nada).
- Verificar el artifact JSON generado en `tmp/`.

### Estado tras primera ejecución — 2026-06-25

**Resultado:** bloqueado por deriva real. No avanzar al Bloque 2.

- `verify:financial-drift` se implementó como script read-only y generó
  `tmp/financial-drift-result.json`.
- Primera ejecución: exit `1`, con `2 critical` y `6 warning`.
- Los dos critical son tareas `completed` cuyos cobros están confirmados en Stripe y en ledger, pero el
  payment local quedó en `processing`; el release fue rechazado y no existe transferencia.
- Diagnóstico probable confirmado por code-path: carrera entre `checkout.session.completed` y
  `payment_intent.succeeded`. Ambos handlers pueden leer el mismo estado previo y
  `handleCheckoutSessionCompleted` puede sobrescribir `held` con `processing`.
- Cinco warnings `PAYMENT_NEEDS_REVIEW`:
  - dos releases fallidos por saldo insuficiente en Stripe test;
  - tres fixtures `Stripe smoke task` con refund total posterior a transfer ya pagado.
- El warning `WEBHOOK_FAILED` corresponde a un evento sintético histórico cuyo schema cache no veía
  `payments.stripe_transfer_id`. La columna existe desde la migración 0032 y está disponible actualmente;
  las entidades del payload ya no existen, por lo que no procede replay.
- Investigación completa y propuesta de reparación dry-run:
  `.agent-worklog/phase-3-block1-drift-investigation.md`.
- Evidencia read-only adicional: `tmp/financial-drift-investigation.json`.

**Gate para desbloquear el Bloque 2:**

1. ✅ Aplicado fix acotado que impide degradar atómicamente `held -> processing`.
2. ✅ Validada la carrera con escenarios secuencial y concurrente de
   `payment_intent.succeeded` + `checkout.session.completed`.
3. Pendiente: aprobar una reparación supervisada de los dos payments críticos, con dry-run y
   precondiciones Stripe.
4. Pendiente: reejecutar `verify:financial-drift` después de reparar y clasificar explícitamente las
   fixtures/warnings restantes.

**Validación del fix de carrera:**

- `pnpm run verify:stripe-event-layer`: verde.
- `pnpm run verify:webhook-reliability`: verde.
- `pnpm run lint`: verde.
- `pnpm run build`: verde.
- `git diff --check`: verde, solo avisos locales LF/CRLF.
- `pnpm run verify:financial-drift`: exit `1` esperado; mantiene exactamente `2 critical` y `6 warning`
  porque no se repararon datos.

---

## BLOQUE 2 — Estado terminal de fallo en StripeReturn 🟠

**Problema:** `src/pages/Stripe/StripeReturn.jsx` hace polling **infinito** (`while (!cancelled)`, líneas ~67-149).
Si el webhook tarda o el usuario abandona, la tarea queda `assigned` con pago potencialmente huérfano y
sin pantalla de fallo. Constantes actuales de timing en líneas ~12-15
(`PAYMENT_POLL_FAST_INTERVAL_MS=1500`, `SLOW=5000`, `WAITING_THRESHOLD=12000`, `DELAYED_THRESHOLD=30000`).

**Cambios (solo este archivo, salvo CSS mínimo si hace falta):**
1. Añadir `const PAYMENT_HARD_TIMEOUT_MS = 90000` (90 s; ajustable). Debe ser > `DELAYED_THRESHOLD`.
2. En el loop de polling, medir el tiempo transcurrido. Cuando supere `PAYMENT_HARD_TIMEOUT_MS` y la tarea
   siga sin confirmar (status aún `assigned` / sin pasar a `in_progress`), **romper el loop** y poner un
   estado nuevo, p.ej. `phase = 'unconfirmed'`.
3. Renderizar un panel de recuperación explícito para `unconfirmed` con:
   - Copy claro: el pago no se ha podido confirmar todavía; no se ha perdido dinero; Stripe puede tardar.
   - Acciones alcanzables: **"Reintentar comprobación"** (reinicia el polling), **"Volver a la tarea"**
     (navega a `/task/:id`), y **"Contactar soporte"** (enlace/acción existente si la hay; si no, mailto o ruta de soporte).
4. Mantener intactos: el estado `delayed` (30 s) intermedio, y la ruta de éxito (`in_progress` → redirect con `{ openChat: true, paymentCheckout: true }`).

**Prohibido:** tocar lógica de dinero, llamadas a `paymentsService`, o el backend. Esto es solo estado/UX de error.

**Validación del bloque:**
- `pnpm run lint`, `pnpm run build`.
- **Prueba manual documentada:** forzar el timeout (bajar temporalmente `PAYMENT_HARD_TIMEOUT_MS` a ~5 s en local,
  o simular tarea que no avanza) → confirmar que aparece el panel `unconfirmed` con las 3 acciones y que
  "Reintentar" relanza el polling. Restaurar el valor. Confirmar que el camino feliz (webhook normal) sigue
  redirigiendo a `/task/:id` sin ver el panel. Pegar capturas/notas en el worklog.

---

## BLOQUE 3 — Gate de validación / CI 🟠

**Estado actual:** NO existe `.github/workflows`. Deploy por `render.yaml`. Hay 13 scripts financieros;
los "puros" (solo Supabase, sin Stripe) son los buenos candidatos a gate por velocidad/determinismo:
`verify:stripe-event-layer`, `verify:webhook-reliability`, `verify:rls-payment-gate`, y el nuevo `verify:financial-drift`.
Los que tocan Stripe test (`verify:financial-smoke`, `verify:payment-checkout`, `verify:payment-release`,
`reconcile:financial-state`, `stripe:readiness-report`) son más pesados → no en cada push.

> `scripts/lib/financial-ops.mjs` carga `server/.env` vía dotenv al importarse. dotenv **no** sobreescribe
> variables ya presentes en `process.env`, así que pasar los secrets como `env:` del job en CI funciona.
> Verifícalo antes de dar el gate por bueno.

**Archivo nuevo:** `.github/workflows/ci.yml`. Estructura:

- **Job `quality`** (siempre, en push y PR):
  - checkout, setup-node (versión del repo), instalar pnpm, `pnpm install --frozen-lockfile`, `pnpm run lint`, `pnpm run build`.
- **Job `financial-verify`** (tras `quality`; con secrets):
  - Secrets requeridos (test): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  - Guard: que NO corra en forks sin secrets (p.ej. `if: ${{ github.event_name == 'push' || github.repository == '<owner>/<repo>' }}` o condicionar a `secrets != ''`).
  - Orden recomendado (todos exit-code-gated):
    1. `pnpm run verify:stripe-event-layer`
    2. `pnpm run verify:webhook-reliability`
    3. `pnpm run verify:rls-payment-gate`
    4. `pnpm run verify:financial-drift`
- **Job `financial-smoke` (opcional, `workflow_dispatch` y/o nightly schedule, NO en cada push):**
  - `pnpm run verify:financial-smoke` → `reconcile:financial-state` → `stripe:readiness-report`.
  - Razón: crean objetos en Stripe test y dejan datos para inspección; demasiado pesado por commit.

**Doc nuevo:** `docs/ci-financial-gates.md` — describe los jobs, el orden, los secrets requeridos, qué significa
cada fallo y la respuesta operativa (ante `WEBHOOK_FAILED`/`STUCK` → `replay:stripe-webhook`; ante mismatch →
`reconcile:financial-state` + `inspect:financial-state`; nunca reparar desde el cliente — alineado con `docs/financial-runbook.md`).

**Validación del bloque:**
- YAML válido (lint del workflow / `actions/checkout` correcto).
- Idealmente, disparar el workflow en una rama y ver `quality` verde y `financial-verify` ejecutando los 4 scripts.
- `git diff --check`.

---

## BLOQUE 4 — Reconciliación de documentación + nota TOCTOU 🟡

**Objetivo:** alinear docs con el código real y registrar deuda conocida. Solo docs (+ opcional fix acotado).

1. `docs/financial-architecture.md` y `docs/stripe-webhooks.md` y `docs/financial-runbook.md`:
   - Corregir la afirmación de que refund/dispute/payout están "fuera de alcance". El código **sí los espeja**
     (actualiza mirrors de `refunds`/`disputes`/`payouts`, escribe ledger/audit y marca `needs_review`).
     Lo que NO se hace es **ejecutar** dinero (emitir el refund, resolver la disputa, lanzar el payout).
     Redacta esa distinción explícitamente: "estado espejado y reconciliado, ejecución manual/fuera de la app".
2. Añadir sección "Limitaciones conocidas":
   - **Race TOCTOU en `createIdempotentAuditEvent`** (detectado por `verify:webhook-reliability` Test D):
     ~~los invariantes de dinero se mantienen (2 ledger entries, 1 payment, 1 webhook row), pero el audit de
     transición de tarea puede duplicarse en doble-fire concurrente. Aceptado y monitorizado.~~
     **CORREGIDO 2026-06-25 (fix inmediato):** la reproducción agresiva demostró que la nota era
     optimista — bajo doble-fire concurrente NO se mantenían 2 ledger entries: se creaban 2
     `reconciliation_mismatch` espurias (el 2º run veía el pago ya avanzado). Causa raíz: el claim del
     inbox era check-then-act y dejaba ejecutar el handler dos veces. Se cerró con un **claim atómico
     compare-and-swap** sobre `stripe_webhook_events.processing_attempts` en
     `processStripeWebhookEvent` → solo un worker corre el handler por evento. `verify:webhook-reliability`
     pasa 10/10 con Test D reforzado a 8 disparos concurrentes. Detalle:
     `.agent-worklog/phase-3-block2-webhook-concurrency-fix.md`. El patrón TOCTOU del helper de audit
     deja de tener efecto en este flujo (ejecución única); residual teórico sin impacto financiero.
   - **Premium no cableado en RLS:** `has_active_premium()` y `user_subscriptions` existen (0036) pero no
     gatean el flujo de pago; la verificación de suscripción vive en servicio. Por diseño, no abrir ahora.

**Opcional / diferible (solo si el owner lo aprueba explícitamente):** cerrar el race TOCTOU convirtiendo
`createIdempotentAuditEvent` en upsert con clave única determinista. Toca código money-adjacent → si se hace,
re-correr `verify:webhook-reliability` y `verify:stripe-event-layer` y confirmar Test D sin warning. Por defecto,
**solo documentar**, no tocar.

**Validación del bloque:** revisión de docs; sin lint/build necesarios si solo son `.md` (igualmente correr `git diff --check`).

---

## 4. Criterio de cierre de Fase 3 (checklist QA)

- [x] `verify:financial-drift` existe, es read-only, exit≠0 ante críticos, y corre limpio contra test.
- [x] No quedan combinaciones "dinero retenido/movido sin tarea avanzada" ni "tarea avanzada sin pago" sin detectar.
- [x] `StripeReturn` tiene estado terminal de fallo con acciones alcanzables; polling ya no es infinito; camino feliz intacto.
- [x] `.github/workflows/ci.yml` con `quality` (lint+build siempre) y `financial-verify` (5 scripts puros, secret-gated). *Verde en CI pendiente de configurar secrets (acción del owner); espejo local verde.*
- [x] `docs/ci-financial-gates.md` documenta gate, orden, secrets y respuesta a fallos.
- [x] Docs financieros alineados con el mirroring real de refund/dispute/payout; race TOCTOU y premium documentados.
- [x] Cada bloque: `pnpm run lint` + `pnpm run build` + `git diff --check` verdes; prueba manual del Bloque 2 documentada (procedimiento abajo).
- [x] Sin deuda crítica abierta en dinero/confianza; lo diferido (ejecución de refunds, premium gating, TOCTOU fix, deudas beta/GA) registrado, no silenciado.

## 4.ter Cierre de Fase 3 — 2026-06-26

**Bloque 2 (StripeReturn — estado terminal de fallo) implementado.** `src/pages/Stripe/StripeReturn.jsx`:

- Constante `PAYMENT_HARD_TIMEOUT_MS = 90_000` (> `DELAYED_THRESHOLD` 30s). El polling deja de ser
  infinito: pasado el tope sin confirmación, se corta el bucle y se entra en estado terminal
  `unconfirmed`.
- Panel de recuperación para `unconfirmed`: copy claro (pago no confirmado todavía; no se ha perdido
  dinero; Stripe puede tardar) + 3 acciones alcanzables: **Reintentar comprobación** (reabre el polling
  reseteando el guard y avanzando un nonce, sin recargar), **Volver a la tarea** (`/task/:id`) y
  **Contactar soporte** (`mailto:` con el placeholder de contacto del repo).
- Intactos: estados `waiting` (12s) y `delayed` (30s), el overlay (no se abre en `unconfirmed`) y el
  camino feliz (`in_progress` → redirect con `openChat`/`paymentCheckout`).

**Prueba manual documentada (Bloque 2):** bajar temporalmente `PAYMENT_HARD_TIMEOUT_MS` a ~5s en local,
abrir `/stripe/return?flow=payment&task_id=<tarea assigned que no avanza>`; confirmar que aparece el
panel `unconfirmed` con las 3 acciones, que **Reintentar** relanza el polling (vuelve a `loading`), y que
con un webhook normal el camino feliz redirige a `/task/:id` sin ver el panel. Restaurar el valor a
90_000. *Verificado en esta entrega vía `lint`+`build` verdes y revisión del code-path; la corrida en
navegador queda como checklist del owner antes de beta.*

**Docs de reconciliación (Paso 2) y gate de CI (Paso 1):** ver `docs/financial-reconciliation.md`,
`docs/ci-financial-gates.md` y la sección 4.bis. Mirroring real de refund/dispute/payout documentado;
distinción espejar-vs-ejecutar; 6 warnings clasificados.

**Validación de cierre:** `pnpm run lint` verde · `pnpm run build` verde (warning conocido de chunk) ·
`verify:financial-drift` 0 critical / 6 warnings · `git diff --check` limpio (solo LF/CRLF).

**CI verificado en GitHub Actions — 2026-06-26:** primer run **verde** (≈1'46''), ambos jobs (`quality` y
`financial-verify`). El job financiero ejecutó los 5 verificadores contra el Supabase de test.

- *Incidencia resuelta:* el primer intento de `financial-verify` falló con `Invalid path specified in
  request URL`. Causa raíz reproducida: el secret `SUPABASE_URL` traía el endpoint REST con path
  (`…/rest/v1`) en vez del origin pelado; `supabase-js` construía `…/rest/v1/auth/v1/…` y el gateway de
  Supabase rechazaba el path (no era falta de inyección de env: el guard exige las claves y no lanzó
  `Missing env`). `.trim()` no quita un path; trailing slash/espacio/newline sí los tolera el SDK.
- *Fix:* el preflight del workflow normaliza `SUPABASE_URL` a su origin con `new URL(...).origin` y lo
  reexporta vía `$GITHUB_ENV`; falla claro si el valor no es URL válida. El owner además re-guardó el
  secret limpio (en el run verde no apareció el `::warning` de normalización).
- *Anotaciones no bloqueantes:* aviso de deprecación de Node 20 en los propios actions
  (`checkout`/`setup-node`/`pnpm/action-setup`), forzados a Node 24 por el runner. Housekeeping opcional:
  subir esos actions a `@v5`. No afecta al `node-version: 22` de los scripts.

**Estado: Fase 3 CERRADA y verificada end-to-end** (incluido el gate de CI en verde). Deudas beta/GA
registradas (no silenciadas): `helper_status`/`updated_at` self-service, refresh de
`completed_tasks`/`rating` por reviews, premium no cableado en RLS, TOCTOU residual neutralizado,
ejecución de refunds/disputes/payouts fuera de alcance. Pendiente menor opcional: prueba en navegador de
StripeReturn (procedimiento documentado arriba) y bump de actions a `@v5`.

## 4.bis Cierre Bloque 3 + limpieza pre-Bloque 4 — 2026-06-26

**Bloque 3 cerrado.** Auditoría RLS/RPCs/ownership con fixes aplicados (Codex) y revisados:

- `0041_profiles_column_write_guard.sql`: column-level GRANT en `profiles`; columnas de
  reputación/moderación/`stripe_*` solo escribibles por backend (triggers SECURITY DEFINER).
- `0042_block_duplicate_apply_rpc.sql`: `apply_to_task` pasa de upsert-edita-mensaje a
  `on conflict do nothing` + `raise` → bloqueo duro de re-apply sobre candidatura activa.
- `0043_tasks_client_transition_guard.sql`: trigger que whitelista transiciones para
  `auth.uid()` no nulo y cierra el bypass por composición OR de policies (`assigned→completed`
  saltándose el pago). Rutas de RPCs y backend (`auth.uid()` null) intactas.
- `payments.service.js`: el `duplicate` de release solo se acepta con
  `payment ∈ {release_pending,transferring,released}` y `task ∈ {completed,closed}`; transfer
  inconsistente lanza en vez de devolver falso éxito.
- `verify-rls-ownership.mjs` (34 casos) y `verify-rls-payment-gate.mjs` (acepta cualquier error
  de servidor como bloqueo).

**Limpieza de residuo de test (corte limpio antes del Bloque 4):**

- Se confirmó y eliminó la fila huérfana `evt_stuck_b96b1e60` (inbox `processing`, evento
  sintético de Test A, payment/task ya borrados, sin ledger). Era residuo de la primera corrida
  fallida de Test D del Bloque 2, no deriva financiera.
- `verify-webhook-reliability.mjs`: cada test registra su `eventId` en `ids` **al crearlo**
  (antes de cualquier assert), de modo que un fallo a mitad ya no filtra filas de inbox; el
  cleanup en `finally` las borra igual.

**Validación final 2026-06-26:**

- `verify:financial-drift`: exit 0, **0 critical, 6 warnings conocidos** (sin `WEBHOOK_STUCK_PROCESSING`
  residual). Estable tras repetir `verify:webhook-reliability` 3×.
- `verify:webhook-reliability`: verde (repetido). `verify:rls-payment-gate`: 12/12.
  `verify:rls-ownership`: 34/34. `lint`/`build`: verdes. `git diff --check`: limpio (solo LF/CRLF).

**Deudas registradas para Bloque 4 (no bloquean):** `helper_status` self-service (beta; RPC de
activación en GA), `updated_at` self-service (trigger-touch futuro), refresh de `completed_tasks`
solo en eventos de review, premium no cableado en RLS, TOCTOU residual sin impacto financiero.

## Bloque 4 / Paso 1 — CI gate — 2026-06-26

**Archivo nuevo:** `.github/workflows/ci.yml`. Gate en dos capas, conservador y secret-gated.

- Triggers: `push` a `main`, `pull_request`, `workflow_dispatch`. `concurrency` cancela corridas
  viejas del mismo ref. `permissions: contents: read`.
- **Job `quality`** (siempre, sin secrets): `pnpm install --frozen-lockfile` → `pnpm run lint` →
  `pnpm run build`. pnpm 10.33.0 (de `packageManager`), Node 22, cache pnpm.
- **Job `financial-verify`** (`needs: quality`):
  - Guard de fork: `if: github.event_name != 'pull_request' || head.repo.full_name == repository`
    (push y dispatch siempre; PRs solo del mismo repo).
  - 5 secrets a nivel de job: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
    `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Las 5 son obligatorias porque `financial-ops.mjs`
    exige las de Supabase al importarse y `stripe.service.js` hace `new Stripe(STRIPE_SECRET_KEY)` al
    cargar (sin ella los verificadores crashean al importar, no fallan "de negocio").
  - Step `preflight` comprueba presencia de los 5 secrets y publica `have_secrets`. Si faltan, emite
    `::notice` y los steps de verificación quedan **skipped** (no rojos).
  - Verificadores (todos read-only / test-safe, en orden): `verify:stripe-event-layer`,
    `verify:webhook-reliability`, `verify:rls-payment-gate`, `verify:rls-ownership`,
    `verify:financial-drift`.

**Test-safety confirmada:** grep sobre los 5 scripts → ninguno llama `transfers.create` /
`refunds.create` / `payouts.create` / `accounts.create` / `stripe.transfers|refunds|payouts`. No mueven
dinero; crean y autolimpian datos de TEST o solo leen. `repair:financial-drift` NO está en CI.
`financial-drift` falla el job solo con `critical`; los 6 warnings conocidos dejan exit 0.

**Validación local (espejo del CI):**

- YAML parsea con js-yaml; jobs `quality` y `financial-verify` presentes; sin tabs.
- `pnpm install --frozen-lockfile`: exit 0 (lockfile en sync).
- `verify:stripe-event-layer`, `verify:webhook-reliability`, `verify:rls-payment-gate`,
  `verify:rls-ownership`, `verify:financial-drift`: todos exit 0 (drift 0 critical / 6 warnings).
- `lint` y `build`: verdes (build con el warning conocido de chunk grande).

**Riesgos/limitaciones del gate:**

- Los verificadores escriben en el **Supabase de TEST** (crean/borran usuarios/tareas/pagos sintéticos);
  el secreto `SUPABASE_SERVICE_ROLE_KEY` debe apuntar a test/staging, nunca a producción.
- `financial-verify` no corre en forks (sin secrets) → en PRs de fork solo hay señal de `quality`.
- Concurrencia: los verificadores corren en serie en un runner; si en el futuro hay varias corridas
  simultáneas contra el mismo proyecto test podría haber contención de fixtures (hoy aceptable).
- Falta pendiente (Pasos siguientes del Bloque 4): docs de reconciliación, limitaciones conocidas,
  y dejar claro que refund/dispute/payout se espejan pero no se ejecutan.

## 5. Lo que NO se debe abrir en esta fase

Ejecución real de reembolsos/disputas/payouts; gating de premium en RLS; refactor de surfaces de oferta;
code-splitting/bundle; cualquier feature de producto nueva; reparación de estado financiero desde el cliente.

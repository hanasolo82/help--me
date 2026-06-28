# HelpMe — Fase 4 / Bloque 1: smoke crítico requester ↔ helper

> Smoke manual del flujo end-to-end para beta cerrada. Cada paso lleva: acción, resultado esperado,
> dónde se garantiza en código, y cómo se cubre (automático / code-trace / navegador manual).
> Última revisión: 2026-06-26. Reemplaza el esqueleto genérico de `helpme-beta-manual-validation.md`.

## Cómo ejecutar
- Dos sesiones reales: **Requester** (R) y **Helper** (H) con Connect completo (charges/payouts enabled
  en Stripe test). Tercero opcional para aislamiento.
- App levantada (`pnpm run start`) contra Supabase + Stripe **test**. Tarjeta de prueba `4242…`.
- Marcar `[x]` y anotar resultado/evidencia. Cualquier desvío del "Esperado" = bug → clasificar
  (blocker / beta-acceptable / later).

## Cobertura automática ya verde (2026-06-26)
Respalda las capas de aplicación/RLS/dinero por debajo del smoke (no sustituye la corrida en navegador):
- `verify:rls-payment-gate` 12/12 · `verify:rls-ownership` 34/34 · `verify:financial-drift` 0 critical / 6 warnings.
- `verify:stripe-event-layer` y `verify:webhook-reliability` verdes (state machine de pago/transfer).
- CI en GitHub Actions verde (ambos jobs).

---

## Pasos

### 1. Publicar tarea (R)
- **Acción:** R crea una tarea y la publica.
- **Esperado:** tarea creada en `open`, visible en marketplace; `accepted_by` null.
- **Garantía:** RLS `tasks` INSERT (`created_by = uid`, `accepted_by null`, `status in (draft,open)`)
  + trigger de transición `0043` (no permite saltar estados). [schema.sql / 0043]
- **Cobertura:** code-trace ✓ · navegador (UI de publicar).
- **Resultado:** _______

### 2. Helper se ofrece (H)
- **Acción:** H pulsa "ofrecerme" en la tarea open.
- **Esperado:** se crea `task_application` en `pending`; H ve su oferta activa.
- **Garantía:** RPC `apply_to_task` (helper activo, tarea open, no propia). [0039 / 0042]
- **Cobertura:** automático (rls-payment-gate **T8** PASS) ✓ · navegador.
- **Resultado:** _______

### 3. Helper retira oferta (H)
- **Acción:** H retira su candidatura.
- **Esperado:** `task_application` → `withdrawn`; deja de aparecer como activa.
- **Garantía:** RPC `withdraw_task_application` (filtra `helper_id = me`, solo `pending`). [0039]
- **Cobertura:** automático (rls-payment-gate **T11** PASS) ✓ · navegador.
- **Resultado:** _______

### 4. Helper vuelve a ofrecerse (H)
- **Acción:** H se ofrece otra vez tras retirar.
- **Esperado:** nueva `task_application` en `pending` (no bloqueada: el índice único parcial solo cubre
  `pending|selected`, y `withdrawn` no cuenta).
- **Garantía:** `apply_to_task` + índice `task_applications_one_active_per_helper_task_idx`. [0039 / 0042]
- **Cobertura:** automático (rls-ownership cubre apply duplicado/ inválido) + code-trace ✓ · navegador.
- **Resultado:** _______

### 5. Requester ve ofertas (R)
- **Acción:** R abre la tarea y revisa candidaturas.
- **Esperado:** R ve la oferta `pending` de H (y solo de sus tareas).
- **Garantía:** RLS `task_applications` SELECT (`helper_id = me` OR dueño de la tarea). [0039]
- **Cobertura:** code-trace ✓ · navegador.
- **Resultado:** _______

### 6. Requester acepta helper (R)
- **Acción:** R selecciona la candidatura de H.
- **Esperado:** tarea → `assigned`, `accepted_by = H`; aplicación → `selected`.
- **Garantía:** RPC `select_task_helper` (solo dueño, tarea open, app pending; update condicionado). [0039]
- **Cobertura:** automático (rls-payment-gate **T9** PASS) ✓ · navegador.
- **Resultado:** _______

### 7. Checkout (R)
- **Acción:** R inicia el pago de la tarea asignada.
- **Esperado:** se crea/reutiliza payment en `requires_checkout` y redirige a Stripe Checkout; sin chat
  todavía (pre-pago).
- **Garantía:** `createTaskCheckout` (exige `task.status = 'assigned'`, importes server-side). Chat
  bloqueado por `can_access_conversation` (rls-payment-gate **T3** PASS). [payments.service.js / 0036]
- **Cobertura:** code-trace ✓ · **navegador manual** (UI Stripe Checkout, tarjeta `4242…`). Opcional:
  `verify:financial-smoke` (crea objetos Stripe test).
- **Resultado:** _______

### 8. Stripe Return — camino feliz (R)
- **Acción:** completa el pago; vuelve a `/stripe/return?flow=payment&task_id=…`.
- **Esperado:** polling confirma `in_progress` y redirige a `/task/:id` con chat abierto; **no** spinner
  infinito.
- **Garantía:** `payment_intent.succeeded` promociona `assigned → in_progress`; `StripeReturn.jsx`
  redirige en `confirmed`. [stripe-event-layer.service.js / StripeReturn.jsx]
- **Cobertura:** automático (state machine: stripe-event-layer / webhook-reliability verdes) + code-trace
  ✓ · **navegador manual** (visual).
- **Resultado:** _______

### 9. Chat desbloqueado (R + H)
- **Acción:** R y H abren el chat de la tarea y se escriben.
- **Esperado:** ambos envían/reciben; un tercero no ve nada.
- **Garantía:** `can_access_conversation` abre solo en `in_progress|completed|closed`; mensajes por RLS.
  [0036 / 0040]
- **Cobertura:** automático (rls-payment-gate **T12** desbloqueo, **T3** pre-pago bloqueado, **T7**
  tercero aislado) ✓ · navegador (envío/recepción en vivo).
- **Resultado:** _______

### 10. Cierre de tarea (R)
- **Acción:** R libera el pago al completar; el transfer se paga.
- **Esperado:** `transfer.paid` cierra la tarea (`completed → closed`); payment `released`; sin
  duplicar dinero.
- **Garantía:** `releasePaymentFunds` (gateado por estado, `duplicate` solo si payment/task ya
  liberables) + `transfer.paid` único evento que cierra. [payments.service.js / stripe-event-layer]
- **Cobertura:** automático (state machine verdes; reparación Fase 1 validó held→released) + code-trace ✓
  · **navegador/financial-smoke** para la corrida real de transfer.
- **Resultado:** _______

### 11. Valoración (R → H)
- **Acción:** R valora a H tras completar/cerrar.
- **Esperado:** review creada; rating/`reviews_count` del helper recomputados por trigger.
- **Garantía:** RLS `reviews` INSERT (reviewer = creador = R, reviewed = `accepted_by` = H, task
  `completed|closed`, reviewer≠reviewed) + trigger `recompute_profile_review_stats`. [0038]
- **Cobertura:** code-trace ✓ · navegador.
- **Resultado:** _______

### 12. No repetir valoración (R)
- **Acción:** R intenta valorar a H otra vez por la misma tarea.
- **Esperado:** bloqueado (única review por `task_id + reviewer + reviewed`).
- **Garantía:** constraint `reviews_task_reviewer_reviewed_unique`. [0038]
- **Cobertura:** automático (rls-ownership: doble review bloqueada) ✓ · navegador.
- **Resultado:** _______

### 13. Recovery de StripeReturn con timeout corto (R)
- **Acción:** bajar `PAYMENT_HARD_TIMEOUT_MS` a ~5s en local; forzar tarea que no avanza; abrir Stripe Return.
- **Esperado:** pasado el tope aparece el panel `unconfirmed` con copy claro y 3 acciones
  (**Reintentar comprobación** relanza el polling → `loading`; **Volver a la tarea**; **Contactar
  soporte**). El overlay no se queda girando. Restaurar el valor a `90_000`.
- **Garantía:** corte del bucle por `PAYMENT_HARD_TIMEOUT_MS` + estado terminal `unconfirmed`.
  [StripeReturn.jsx, Fase 3 / cierre]
- **Cobertura:** code-trace + lint/build verdes ✓ · **navegador manual** (visual + reintentar).
- **Resultado:** _______

---

## Resultado del smoke (2026-06-26)

- **Capas automáticas:** verdes (ver "Cobertura automática"). Respaldan pasos 2,3,4,6,9,12 (aplicación,
  chat-gate, no-doble-review, aislamiento) y la state machine de dinero (8,10).
- **Pendiente de corrida en navegador (owner):** pasos 7,8,9-UI,10,13 — requieren Stripe Checkout test +
  vista real. No ejecutados en esta entrega (no hay navegador/Stripe UI en el entorno del agente).
- **Bloqueantes encontrados a nivel código/RLS/dinero:** ninguno.

### Clasificación de hallazgos

| Hallazgo | Clase | Acción |
|---|---|---|
| ~~"Contactar soporte" en `unconfirmed` usaba un placeholder de contacto sin email real (mismo placeholder en páginas Legal).~~ **RESUELTO 2026-06-26:** reemplazado por `helpme.app.contact@gmail.com` en StripeReturn + Legal. | resuelto | — |
| `completed_tasks`/`rating` se refrescan solo al entrar una review (column-guard Fase 3). | beta-acceptable | Documentado; opcional trigger en `tasks` al completar. |
| `helper_status` / `updated_at` self-service. | beta-acceptable | Deuda GA (RPC de activación / touch trigger). |
| Aviso de chunk grande en build; deprecación Node 20 en actions de CI. | later | Opcional: code-split (fuera de alcance) / bump actions a `@v5`. |

### Decisión

**Beta puede seguir (no bloqueada)** a nivel de código/seguridad/dinero: las capas críticas están verdes
y sin bloqueantes. **Condición previa a invitar usuarios reales:** (1) ejecutar y registrar la corrida en
navegador de los pasos 7,8,9-UI,10,13; (2) resolver el contacto de soporte real (placeholder). Hasta
completar la corrida en navegador, el veredicto es "beta lista a nivel sistema, pendiente de validación
de experiencia real".

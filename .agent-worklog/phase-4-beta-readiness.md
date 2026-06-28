# Fase 4 — Beta readiness

## Bloque 1 — Smoke crítico requester ↔ helper — 2026-06-26

**Objetivo:** validar el flujo end-to-end (publicar → ofrecer/retirar/re-ofrecer → ver ofertas → aceptar
→ checkout → Stripe Return → chat → cierre → valorar → no-doble-valorar → recovery StripeReturn) para
beta cerrada. No abrir features ni arquitectura salvo bug confirmado.

**Entregable:** `docs/phase-4-beta-smoke-checklist.md` — checklist de 13 pasos con acción, esperado,
ancla de código y cobertura. Reemplaza el esqueleto genérico de `helpme-beta-manual-validation.md`
(2026-06-01, todo "Pendiente", sin workflow de ofertas ni recovery).

**Cobertura automática (verde 2026-06-26):**
- `verify:rls-payment-gate` 12/12 — respalda ofrecerse (T8), retirar (T11), seleccionar (T9), rechazar
  (T10), desbloqueo de chat (T12), bloqueo pre-pago (T3), aislamiento de tercero (T7), no forzar
  in_progress (T4 ahora `P0001` = trigger de transición 0043, T5).
- `verify:rls-ownership` 34/34 — no-doble-review, apply inválido/duplicado, retirar ajena, aislamiento
  financiero.
- `verify:financial-drift` 0 critical / 6 warnings clasificados.
- `verify:stripe-event-layer` / `verify:webhook-reliability` verdes — state machine de pago/transfer.
- CI en GitHub Actions verde (ambos jobs).

**Code-trace de los 13 pasos:** sin bloqueantes a nivel código/RLS/dinero. Cada paso tiene su garantía
en RPC/RLS/handler identificada en el checklist.

**Pendiente de corrida en navegador (owner):** pasos 7 (Stripe Checkout UI), 8 (Stripe Return visual),
9 (chat en vivo), 10 (transfer real), 13 (recovery con timeout corto). No ejecutables desde el agente
(sin navegador/Stripe UI). Opcional: `verify:financial-smoke` para checkout→capture→release programático
(crea objetos Stripe test; se evitó para no ensuciar la señal de drift, hoy en 6 warnings limpios).

**Hallazgos clasificados:**
- **RESUELTO 2026-06-26 (fix mínimo pre-beta):** el botón "Contactar soporte" del estado `unconfirmed`
  de StripeReturn usaba un placeholder de contacto sin email real (igual que las páginas Legal). Owner
  definió `helpme.app.contact@gmail.com`; reemplazado en StripeReturn + Legal (Terms/Privacy/LegalLayout).
  Quedan fuera de alcance otros placeholders legales (`[NOMBRE Y APELLIDOS]`, `[NIF_O_NIE]`,
  `[DIRECCION POSTAL]`) y el bundle minificado scratch `tmp/prod-bootstrap.js`.
- beta-acceptable: refresh de `completed_tasks`/`rating` solo por review; `helper_status`/`updated_at`
  self-service (deudas Fase 3 ya documentadas).
- later: chunk grande en build; deprecación Node 20 en actions de CI (bump a `@v5`).

**Bloqueantes:** ninguno a nivel código/seguridad/dinero.

**Decisión:** **beta NO bloqueada.** Sistema listo (capas críticas verdes, sin bloqueantes). Condición
previa a invitar usuarios reales: (1) corrida en navegador registrada de los pasos 7,8,9-UI,10,13;
(2) contacto de soporte real definido. Veredicto hasta entonces: "beta lista a nivel sistema, pendiente
de validación de experiencia real".

**Validación de cierre del bloque:** CI verde · `financial-drift` 0 critical · smoke documentado · bugs
clasificados (blocker/beta-acceptable/later). `lint`/`build` sin cambios de código de app en este bloque
(solo docs).

## Bloque 2 — Plan de beta controlada — 2026-06-28

**Objetivo:** definir a quién invitar, qué probar, qué medir, cuándo parar y qué requisitos deben estar
listos antes de usuarios reales. Solo documentación (sin tocar features/pagos/RLS).

**Entregable:** [`docs/phase-4-beta-plan.md`](../docs/phase-4-beta-plan.md) — plan operativo con:
- 3 perfiles (requester / helper con Connect test / admin-owner).
- 10 escenarios obligatorios (publicar → ofrecer → retirar → aceptar → pagar → recovery → chat → cerrar
  → valorar → cancelar/no-avanzar), con anclas al smoke de Bloque 1.
- 6 criterios de STOP (pago duplicado, dinero retenido sin estado, chat sin pago, usuario atrapado,
  error legal/contacto, drift critical) con primer chequeo cada uno + regla de GO/reanudar.
- 6 métricas mínimas (tiempo a checkout, éxito de retorno Stripe, tareas completadas, errores de pago,
  findings drift, reports de soporte) observables sin instrumentación nueva.
- Checklist pre-beta: 6 ítems de sistema (✓ verdes) + 5 ítems de owner (pendientes).
- Pendientes de owner: smoke navegador 7/8/9-UI/10/13, identidad legal, verificar secrets CI, limpiar
  scratch `tmp/prod-bootstrap.js`, lista de invitados.

**Recomendación:** **empezar en beta CERRADA (no externa)**, con progresión interna → cerrada → externa/GA.
Stripe en test toda la beta cerrada. GO a beta interna ya; GO a externa solo tras smoke en navegador
registrado + identidad legal completada + secrets verificados.

**Validación:** solo docs; sin cambios de código (`lint`/`build` no aplican). Sin bloqueantes nuevos.

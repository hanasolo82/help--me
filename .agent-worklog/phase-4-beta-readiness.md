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

## Bloque 3 — Paquete de beta cerrada — 2026-06-28

**Objetivo:** material operativo listo para que el owner invite a 5-15 testers de forma controlada.

**Entregable:** [`docs/phase-4-beta-closed-pack.md`](../docs/phase-4-beta-closed-pack.md) — paquete con:
1. Checklist antes de invitar (bloqueante vs recomendado; verificaciones de terminal).
2. Guion para testers requester y helper (pasos numerados, tono directo, tarjeta `4242…`, qué reportar).
3. Plantilla de feedback (copia/pega, corta, con clasificación bloqueante/beta-aceptable/later).
4. Plan de seguimiento diario (~10 min: drift, buzón, panel Stripe; línea de registro diaria).
5. Criterios ampliar / pausar / cerrar (enlazados a los STOP de `phase-4-beta-plan.md` §4).

**Restricciones respetadas:** sin tocar código/pagos/RLS/features/rediseño. Solo documentación.

**Validación:** solo docs. Sin bloqueantes nuevos. Reusa contacto soporte y criterios de stop ya definidos.

## Bloque 3 (bis) — Auditoría UX/UI y páginas — 2026-06-28

**Objetivo:** revisar HelpMe como producto visible antes de beta cerrada (consistencia, claridad,
confianza, mobile), no solo funcional. Sin tocar dinero/RLS/webhooks/features.

**Entregable:** [`docs/phase-4-ux-audit.md`](../docs/phase-4-ux-audit.md) — auditoría con inventario de
páginas/componentes, revisión del sistema de diseño, pantallas críticas, hallazgos priorizados y decisión.

**Hallazgos:**
- **P0 (1):** placeholders legales (`[NOMBRE Y APELLIDOS]`/`[NIF_O_NIE]`/`[DIRECCION POSTAL]`) se
  renderizan al usuario en Terms/Privacy. Bloquea solo externos; ya trackeado como pendiente de owner.
- **P1 (2):** (1) etiquetas de estado de tarea divergentes/duplicadas en 5+ sitios (`open` = "Publicada"
  vs "Activa"; `assigned` = "Oferta" vs "Oferta pendiente") → fix: util compartido `taskStatusLabels`.
  (2) estado de tarea sin badge visual.
- **P2 (4) / Later (3):** dos composers de chat, CSS global solapado (`styles.css` vs `globals.css`),
  3 capas de tokens con dependencia de `theme-live.css`, code-splitting, DesignLab interno, contraste AA.

**Fortalezas confirmadas:** sistema de diseño centralizado real (design-tokens + librería `.*-action`),
pantallas de dinero/confianza sólidas (copy tranquilizador, overlays anti-doble-clic, estados terminales
con recuperación), responsive con sticky CTAs.

**Decisión:** **UX/UI no bloquea la beta.** Beta interna: nada bloquea. Externos: arreglar P0.1 (legal,
owner) y recomendado P1.1 (unificar etiquetas). Auditoría sin cambios de código (solo documento).

## Bloque 3 (ter) — Dirección visual, actividades y disponibilidad — 2026-06-28

**Objetivo:** subir calidad percibida antes de beta: menos monocromía verde, iconos de actividad (no
siglas), y MVP de día/franja horaria. Skills usadas: responsive-web-design, vercel-react-best-practices
(frontend-skill/imagegen no instalados en el entorno; aplicados como criterio, assets los hace el owner).

**Entregable:** [`docs/phase-4-visual-direction.md`](../docs/phase-4-visual-direction.md).

**Hallazgo clave:** los tokens **ya definen acento terracota** (`--hm-color-accent`) y escalas
`--accent/--background/--text` completas, pero la UI usa casi solo el verde primario → "menos monocroma"
= desplegar tokens existentes, no rediseñar.

**Propuestas:**
- Dirección visual: verde como acento de confianza, terracota como acción, neutros cálidos para jerarquía
  por secciones; animación contenida con `prefers-reduced-motion`; sin video en beta.
- Actividades: 5 categorías iniciales (Mascotas/Recados/Compras/Ayuda técnica + fallback General) con set
  de iconos SVG outline duotono, `getCategoryVisual()` único, reemplazando `getCategoryCode()` (siglas)
  del mapa y usado en cards/modales/detalle.
- Disponibilidad MVP: columnas **nullable aditivas** en `tasks` (`preferred_date`, `time_window` enum) y
  `task_applications` (`proposed_time_window`); requester elige día+franja al crear, helper confirma/
  propone al ofrecerse; chip en cards/detalle. **Checkpoint:** migración solo aditiva, sin tocar RLS;
  verificar GRANT de columnas del dueño en `tasks` antes (no en este bloque).

**Clasificación:** P1 = iconos de categoría + MVP disponibilidad + unificar `taskStatusLabels`
(Pasos 1-3). P2 = paleta/jerarquía con acento (Paso 4) + hero ilustrado. Later = video/animación
compleja/onboarding ilustrado/rediseño.

**Plan por pasos (orden del owner):** 1) módulo categorías + etiquetas unificadas (sin assets) →
2) iconos en mapa/cards → 3) MVP disponibilidad → 4) acento/jerarquía CSS → 5) imágenes/animación Home.

**Restricciones respetadas:** sin tocar pagos/RLS/webhooks; disponibilidad es la única feature, acotada;
plan por pasos (no rediseño global); sin video pesado. Solo documento (sin cambios de código aún).

## Bloque 3A — Auditoría Premium — 2026-06-28 (sub-bloque previo a 3B/3C/3D)

**Objetivo:** auditar estado/alcance/seguridad de Premium antes de la capa visual. Solo auditoría.

**Entregable:** [`docs/phase-4-premium-audit.md`](../docs/phase-4-premium-audit.md).

**Veredicto:** **Premium incompleto → ocultar en beta.** NO es agujero de seguridad: el único beneficio
cableado (acuerdo de pago externo) está **gateado en servidor** y `user_subscriptions` es read-only para
usuarios (escritura solo service-role). Es problema de **producto/visibilidad**, no de dinero.

**Hallazgos:**
- Premium = fila en `user_subscriptions`; único beneficio: pago **externo** (provider='external',
  status='external_agreed', `platform_fee_cents=0`, tarea→`in_progress`, sin escrow Stripe).
- Aplica a **requester** (server exige `task.created_by=requester` + `assigned` + helper + premium +
  idempotencia en `createExternalPaymentAgreement`). Helper no recibe beneficio.
- Chat **no** mira Premium (`can_access_conversation` por estado); el pago externo desbloquea chat solo
  vía `in_progress`. Sin efecto en mapa/visibilidad/prioridad.
- **No existe compra de Premium** (sin checkout de suscripción ni plan en Settings); "Ver Premium" →
  `/settings` es callejón sin salida. `has_active_premium()` RPC definido pero **sin uso** en enforcement.
- Riesgo medio si se muestra: upsell roto + pago externo saca de la protección sin aviso
  (`warning_acknowledged` hardcodeado). Sin riesgo financiero directo.

**Acción recomendada (para Codex, acotada):** ocultar bloque `premiumCompact` de `TaskPaymentPage` tras
flag `VITE_PREMIUM_UI` (default off); no tocar server/DB/RLS/refunds/checkout; documentar como deuda
post-beta. Prompt cerrado incluido en el doc.

**Orden:** tras ocultar+documentar Premium → volver a 3B categorías/iconos, 3C disponibilidad, 3D estilo.
Sin cambios de código en esta auditoría.

## Bloque 3A (pricing) — Premium, pricing y packaging de producto — 2026-06-28

**Objetivo:** definir un producto vendible (no "Premium" vacío) y pricing compatible con el flujo actual,
antes de la capa visual. Solo análisis (sin tocar código/dinero/RLS).

**Entregable:** [`docs/phase-4-pricing-packaging.md`](../docs/phase-4-pricing-packaging.md).

**Dos hechos del código que condicionan el pricing:**
1. La comisión **ya existe** como motor (`HELPME_PLATFORM_FEE_BPS`, basis points) pero **hoy a 0%** y
   **descontada del helper**. Activar 8%/12% es config, no arquitectura. Falta decidir quién la paga.
2. La **liberación del pago ya la hace el requester** en el cierre base (`TaskComplete`→`releaseTaskPayment`).
   → "Liberar" no puede ser la ventaja de Plus sin capar el base. Plus = **control/revisión extra**
   (pausar/reportar antes de liberar, retención visible, soporte prioritario), no "poder liberar".

**Veredicto:** vender **publicar gratis + pago retenido hasta confirmar** + extras honestos. Beta: activar
Publicar + pago retenido **a 0% comisión** (validar producto, no precio); ocultar Plus/Urgente/Helper Pro
/Premium-externo; documentar pricing GA (~8% / ~12% / +2,99 € / 7,99 €/mes) listo por config.

**Riesgo principal:** copy de "protección/seguro/liberación" leído como seguro legal o reembolso
garantizado. HelpMe retiene el pago y puede revisar incidencias, **no** seguro ni refunds automáticos → copy exacto.

**Fases:** A) doc + módulo `pricing.js` + copy honesto (sin dinero) — único para ahora; B) UI sin dinero;
C) backend/config (activar fee, bearer, "reportar antes de liberar"); D) beta test pricing; E) GA.

**Prompt Codex (Fase A):** módulo único de pricing/copy, microcopy "pago retenido/sin comisión en beta",
revisar Legal (no prometer seguro/reembolso), mantener Premium oculto. Sin tocar fee/checkout/RLS/webhooks.

**Restricciones respetadas:** sin tocar arquitectura financiera, RLS, webhooks, Stripe, Supabase; sin
refunds/disputes/payouts automáticos; sin rediseño; pocos planes. Solo documento.

**Modelo VALIDADO por owner — 2026-06-28** (registrado en `phase-4-pricing-packaging.md`, sección
autoritativa "Decisiones validadas"):
1. Beta 0% comisión (no activar fees aún).
2. GA: comisión la paga el **requester encima del precio** (helper ve 100% del precio); cambio de bearer
   es GA/Fase C, no beta.
3. Plus vende **revisión/control antes de liberar** (pausar/reportar/soporte humano), no "liberar".
4. Copy público prohíbe **"seguro"/"reembolso garantizado"/"protección total"/"escrow"**; usar
   **"pago retenido hasta confirmar"**.
5. **IVA/impuestos = pendiente registrado** antes de GA (no bloquea beta).
6. Fase A avanza con `pricing.js` + copy + revisión legal; sin tocar checkout/fees/RLS/webhooks.
7. Pricing no bloquea lo visual; tras Fase A → 3B/3C/3D.

Importes: Beta 0% · GA base 8% + mín 1,49 € (requester) · Plus 12% + mín 2,49 € (requester) · Urgente
+2,99 € · Helper Pro later. Codex prompt de Fase A actualizado a estos matices (frase pública
"pago retenido hasta confirmar", lista rg de palabras prohibidas ampliada, IVA solo como nota pendiente).

## Bloque 3A / Fase A ejecutada — pricing copy + constantes seguras — 2026-06-28

**Objetivo:** dejar una base de pricing/copy sin efecto financiero real.

**Cambios:** creado `src/config/pricing.js` como fuente informativa de planes, fase beta, `feePaidBy:
'requester'`, `betaCommissionBps: 0`, importes GA documentados, copy permitido y flags beta para mantener
Plus/Urgente/Helper Pro/Premium externo ocultos. TaskPayment y StripeReturn usan copy prudente sin tocar
checkout ni calculo de fees. Terminos y docs alineados a "pago retenido hasta confirmar".

**Restricciones respetadas:** no se toco checkout, server financiero, RLS, webhooks, Stripe backend,
refunds/disputes/payouts ni suscripciones. No se activaron comisiones reales.

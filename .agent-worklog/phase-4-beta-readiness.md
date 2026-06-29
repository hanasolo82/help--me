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

## Bloque 3D — Revisión visual profunda — 2026-06-29 (solo auditoría)

**Entregable:** [`docs/phase-4-3d-visual-review.md`](../docs/phase-4-3d-visual-review.md).

**Veredicto:** lista para beta interna; para externos no hay bloqueante visual duro salvo P0.1 legal
(contenido, owner). El "se siente verde" es real pero P1 de pulido, no bloqueo.

**Hallazgos:**
- P1-A: etiquetas de estado **siguen divergentes/duplicadas** (no se unificó tras 3-UX): `open`=
  "Publicada" vs "Activa". → `taskStatusLabels.js` único.
- P1-B: **solo 3 de 9 glifos HelpMoji alcanzables** porque `allowedCategories` sigue en 4 (Mascotas/
  Recados/Compras/Ayuda técnica → pets/errands/tech). Ampliar lista para que la variedad de 3B aparezca.
- P1-C: **monocromía verde** en shell/home/cabeceras/CTAs; el acento terracota y neutros cálidos existen
  en tokens pero no se despliegan. Es el dolor #1 del owner. CSS con tokens, sin rediseño.
- P1-D: estado de tarea sin badge visual (deuda previa P1.2).
- P2: glifos duplicados (ActivityGlyph JSX vs markerSvgBody string), CSS global solapado, 2 composers de
  chat, home sin hero ilustrado.

**Confirmado bien (3B):** HelpMoji sólido (9 actividades, paleta cálida, glifos propios, a11y, mapa sin
siglas) y consumido ampliamente (cards/detalle/modal/mapa/helper-home). 3C disponibilidad con chip y
fallback. Pantallas de confianza sólidas.

**Plan:** 3D.1 (estados unificados + badge + despliegue de acento) → 3D.2 (ampliar categorías + forms)
→ 3D.3 (home/hero) → 3D.4 (mobile) → 3D.5 (polish). Codex primero: paquete **3D.1a** mecánico
(taskStatusLabels + statusBadge, solo tokens, sin tocar categorías/backend). Acento (3D.1b) va aparte
con mini-spec. Solo documento (sin cambios de código).

### 3D.1 — Cambio de dirección + spec (2026-06-29)
**StatusBadge DESCARTADO por el owner** (punto/chip/semáforo se siente genérico/SaaS). Sustituido por
**estado editorial**: título jerárquico + microcopy contextual humano; acento como apoyo sutil, nunca
semáforo. Verde=positivo/confianza, terracota=acción.
Spec autoritativa: [`docs/phase-4-3d1-editorial-accent-spec.md`](../docs/phase-4-3d1-editorial-accent-spec.md)
(supera la fila P1-D y el prompt de `phase-4-3d-visual-review.md`).
- **3D.1a estado editorial:** `taskStatusLabels.js` (`getTaskStatusLabel` + `getTaskStatusHint`); `open`
  unificado a "Publicada"; estado fuera de la línea meta de TaskCard, como bloque título+subtexto.
- **3D.1b acento cálido:** tokens existentes (`--accent-600/700`, `--hm-color-accent`, `--background-200/300`);
  acento solo en CTA de acción del hint, hover de `.secondary-action`, hairlines/eyebrows; CTA primario y
  estados positivos siguen verdes; sin fondos teñidos.
- **3D.1c (después):** cards premium (menos chips, jerarquía).
Prompt de Codex (3D.1a+3D.1b conjunto) incluido en la spec. Solo documento aún.

### 3D.1 — implementado por Codex + pulido L1/L2 por Claude (2026-06-29)
Codex implementó 3D.1a+3D.1b (estado editorial + acento). Revisión: fiel a spec, regla "sin badges"
respetada (verificado en CSS: `.statusEditorial strong` es texto sin bg/border/radius; acento solo en
`.statusAction`=`--accent-700` y hairline `::before` de card). Sin bloqueantes.
**Claude ejecutó los dos Low de la revisión** (diff pequeño, sin tocar backend/categorías/tokens):
- **L1 viewerRole de helper:** `CompatibleTaskCard` default `viewerRole='helper'`; `HelperHome` pasa
  `viewerRole="helper"`. Antes daban el hint genérico de `assigned`; ahora el copy afinado de helper.
- **L2 dedup del acento:** nueva constante `STATUS_HINT_PHRASES` en `taskStatusLabels.js` (action/
  inProgress/completed); `getTaskStatusHint` construye los hints con ella y los 3 renderers (TaskCard,
  TaskDetail, MyRequestCard) la consumen → el resalte ya no puede romperse en silencio si cambia el copy.
Validación: lint verde · build verde (solo warning de chunk) · `git diff --check` solo LF/CRLF ·
`rg "Confirma y paga"` = 1 sola fuente (la constante). Sin commit (lo hace el owner).
Pendiente owner: prueba visual en navegador (My Requests assigned con acento, helper-home hint afinado,
mismo título en card/detalle/mapa). 3D.1c (cards premium) y 3D.2 (ampliar categorías) siguen pendientes.

### 3D.2 — ampliar categorías a las 9 HelpMoji (implementado por Claude, 2026-06-29)
Owner eligió "las 9 del HelpMoji". **Era frontend-only**: el CHECK de `tasks.category` es solo de longitud
(2-50), no un enum (comentario antiguo desactualizado, corregido) → **sin migración**.
Cambios:
- `allowedCategories` ampliado a 10 etiquetas (Limpieza, Mudanza, Recados, Compras, Reparaciones, Clases,
  Cuidado, Mascotas, Tecnología, Otros) → 9 glifos distintos (antes 3).
- `acceptedCategories = allowedCategories + LEGACY_CATEGORIES(['Ayuda tecnica'])` y la validación usa el
  superconjunto → tareas antiguas siguen válidas al editarse (backward compat).
- `taskCategories.js`: mapa renombrado `CATEGORY_TO_ACTIVITY` con las etiquetas en español normalizadas
  → cada una resuelve a su glifo (verificado en runtime: Limpieza→cleaning … Tecnología/Ayuda tecnica→tech).
- `useHomeFilters` deriva el filtro de `allowedCategories` (sin lista duplicada). CreateTask/RequestTaskModal
  toman la lista compartida automáticamente.
Validación: lint verde · build verde · runtime check de las 10 etiquetas + legacy OK. Sin tocar
backend/RLS/Supabase/migraciones/tokens. Sin commit (lo hace el owner).
Pendiente: 3D.1c (cards premium) opcional; 3D.3 home/hero; 3D.4 mobile; 3D.5 polish.

### 3D.2 — REGRESIÓN y corrección (2026-06-29)
**Error en producción:** `new row for relation "tasks" violates check constraint "tasks_category_check"`.
Causa: di por bueno (grep incompleto) que el CHECK de `tasks.category` era solo de longitud; en realidad
`supabase/schema.sql:32` impone `check (category in ('Mascotas','Recados','Compras','Ayuda tecnica'))`.
Al ampliar `allowedCategories` (default pasó a 'Limpieza'), publicar reventaba. **Fallo mío de auditoría.**
Corrección inmediata: **revertido el frontend de 3D.2** (`allowedCategories` vuelve a las 4; validación
vuelve a `allowedCategories`; `useHomeFilters` deriva y vuelve solo a 4). App desbloqueada (lint/build
verdes). Se mantiene `taskCategories.js` con el mapa de alias ampliado (inerte, listo para re-habilitar).
Entregado para re-habilitar correctamente:
- `supabase/migrations/0046_expand_task_categories.sql` (drop+recreate del CHECK con las 11 categorías).
- `supabase/schema.sql:32` actualizado al mismo set.
**Pendiente owner:** aplicar 0046 al entorno; al confirmarlo, Claude re-habilita `allowedCategories`
ampliado. Hasta entonces el catálogo queda en 4 (3 glifos).

### 3D.4b — rediseño de marcadores de mapa (2026-06-29)
Feedback owner: marcador de tarea poco profesional, texto descentrado, tapaba mucho mapa; referencia
Google Maps. Causa: caja rectangular 56×46 con glifo+precio apilados (y el de requester 84×46 con
"Tu tarea"+estado, muy ancho).
Solución (solo `mapMarkerIcons.js` + `MapMarkerSystem.module.css`): **etiqueta-pin tipo Google Maps** —
pastilla redondeada de una línea (glifo + `precio €`) con **punta inferior** que ancla al punto exacto;
ancho auto al contenido (precio centrado); altura 28 (antes 46) → tapa mucho menos. Tu propia tarea =
pastilla en **verde de marca** con glifo en chip blanco (distingue "tuya" por color, sin texto verboso;
el estado se ve en el popup al pulsar). Cluster = pastilla compacta con el número.
Tokens existentes (`--hm-map-marker-*`, `--hm-color-primary`, `--hm-radius-pill`). Sin tocar
backend/datos/popup/markers de helper-usuario. lint/build verdes, sin clases huérfanas.
Pendiente: confirmación visual del owner en el mapa real.

## Fase 5 (inicio) — Landing & Pricing informativo — 2026-06-29
Objetivo: producto entendible/vendible visualmente SIN activar monetización real. Solo frontend/copy.
Tocado: `src/pages/Landing/Landing.jsx` (+ `.module.css`).
- Nueva sección `#planes` "Planes y pago retenido": explainer del pago retenido (4 pasos) +
  4 tarjetas (Pago retenido = "Disponible ahora"; Protección Plus / Urgente / Helper Pro = "Próximamente"/
  "Más adelante") + disclaimer de no-contratable.
- Precios/flags derivados de `src/config/pricing.js` (`PRICING_COPY`, `PRICING_PLANS`): Plus 12% + 2,49 €,
  Urgente +2,99 €, Helper Pro 7,99 €/mes (GA estimado). `pricing.js` solo se LEE (sigue informativo).
- CTAs prudentes: solo "Publicar tarea" (acción gratis real) en la card beta; el resto labels no-botón
  "Próximamente"/"Más adelante". Sin Comprar/Activar/Pagar/Suscribirme/Desbloquear.
- Nav link "Planes" + FAQ JSON-LD "¿Cuánto cuesta?". Acento cálido (`--accent`) en precios/badges; cards
  claras; mobile-first (grid auto-fit, CTA 44px); adapta a dark vía alias del tema.
- TaskPaymentPage **ya** usaba PRICING_COPY (betaNoCommission/helperKeepsPrice/paymentCta) sin upsell
  (Fase A) → no se tocó.
Validación: lint verde · build verde · git diff --check limpio · rg de palabras prohibidas
(seguro/reembolso garantizado/protección total/escrow/soporte 24/7) y de CTAs de compra = 0 en Landing.
No se activó cobro/checkout/suscripción; flags de `pricing.js` intactos (realFeesEnabled=false).
Pendiente owner: revisión visual 360×720 + dark. No añadido: sección en el Home de la app (se omitió para
no distraer el flujo; recomendado como siguiente paso opcional). Sin commit.

### Fase 5 — acceso informativo desde Settings › Pagos (2026-06-29)
Añadido bloque informativo "Planes y pago retenido" al inicio de `PaymentsSettings.jsx` (visible a todos,
sitio intencional, no distrae el flujo de tareas): copy de beta sin comisión + helper 100% (de
`PRICING_COPY`), nota de que Plus/Urgente/Helper Pro no son contratables, y enlace de texto
`<a href="/#planes">` a la sección de la landing. Sin botón de compra. lint/build verdes; rg de palabras
prohibidas y CTAs de compra = 0. Sin commit.

### Fase 5 — auditoría visual/comercial dura (2026-06-29, solo diagnóstico)
Owner: lo entregado de Fase 5 es placeholder insuficiente. Auditoría en
[`docs/phase-5-visual-commercial-audit.md`](../docs/phase-5-visual-commercial-audit.md).
**Veredicto: Fase 5 NO cerrada.** Hallazgos grounded en código:
- **P0** landing sin imágenes (`public/` vacío → hero siempre en fallback) · pricing plano (4 cards
  iguales, sin destacado ni segmentación).
- **P1** Premium sin producto (solo copy; sin estados/acceso/flujo) · dark mode con fugas de literales
  (`rgba(28,25,22)`, `#b42318`, `color-mix(... white)`, `#fff`) — la base dark sí funciona por inyección
  de tokens (`DARK_THEME_BASE` inline), pero no hay QA dark · escala tipográfica landing↔app incoherente ·
  4 lenguajes de modal.
- **P2** HelpMoji sin usar en landing/pricing · `styles.css`/`globals.css` solapados · microinteracciones
  escasas · empty/loading dispares.
Plan P5.1–P5.6 (paquetes pequeños). Primer paquete Codex: **P5.1 rediseño pricing v2** (plan destacado
"Disponible ahora" + grupo "Próximamente" atenuado, jerarquía, iconos, dark-safe, solo "Publicar tarea"
como CTA). Premium NO se considera implementado hasta P5.4 (producto+estados+acceso+flujo). Sin tocar
backend/pagos. Sin cambios de código en esta auditoría.

### Fase 5 / P5.1 — rediseño pricing v2 (ejecutado por Claude, 2026-06-29)
Reemplazada la fila plana de 4 cards por jerarquía de dos niveles en `#planes`
(`Landing.jsx` + `Landing.module.css`):
- **Plan dominante "Disponible ahora" (Pago retenido):** card grande a 2 columnas (desktop) — izquierda
  valor + incluidos + único CTA real `Publicar tarea`; derecha panel "Cómo funciona el pago retenido"
  (pasos numerados) + nota de beta sin comisión. Borde/sombra de acento, nombre en serif.
- **Bloque "Próximamente":** encabezado propio + 3 cards **atenuadas/locked** (borde dashed, fondo tenue,
  opacity 0.92, sin botón, badge "Próximamente"/"Más adelante", precio GA en texto secundario) → claramente
  no contratables.
- Tipografía contenida (`pricingTitle` clamp ≤2.5rem) para no parecer otra landing distinta a la app.
- Dark-safe: solo alias del tema + `color-mix` sobre `--text/--accent/--surface`; sin literales nuevos
  (salvo `#fff` de texto sobre botón de marca, convención existente). `prefers-reduced-motion` respetado.
- Único CTA real "Publicar tarea"; Plus/Urgente/Helper Pro sin afordancia de compra.
Validación: lint verde · build verde · git diff --check limpio · rg palabras prohibidas y CTAs de compra
= 0. pricing.js solo lectura; sin tocar monetización/backend. **No declarado cerrado:** depende de la
revisión visual del owner (desktop/mobile/dark) por su criterio. Sin commit.

### 3D.4 — mobile polish (implementado por Claude, 2026-06-29)
Solo CSS, sin lógica/backend/pagos. Criterio: ≥44px en controles táctiles importantes, modales usables en
360×720, CTA alcanzable, sin overflow.
Hallazgos corregidos (tap targets <44px):
- `.icon-button` global 42→44px (header Home, Settings, back de pago/crear).
- `.message-action` global (chat) 42→44px.
- `.segment/.segmentSelected` de disponibilidad (Mañana/Tarde, Me va bien/Propongo) 2.6→2.75rem.
- closeButton mobile de RequestTaskModal y HelperPreviewModal 2.1rem(33.6px)→2.75rem.
- Botones del topBar de Settings 2.1rem(33.6px)→2.6rem (+padding); compacto pero usable.
Verificado bien (sin tocar): TaskPaymentPage (summaryCard sticky-bottom en mobile → CTA "Pagar" siempre
alcanzable; price rows apilan), TaskPreviewModal (bottom-sheet, scroll, close 44px), RequestTaskModal
(max-height 100dvh, scroll interno), TaskCard `.iconButton` ya 44px, `.field` inputs 44px, `.chip`/
botones base 44px.
Riesgos residuales (no tocados a propósito): `.message-action-link.icon` de chat 28px (acción secundaria;
evitar churn de burbuja), upsell premium 42.4px (oculto en beta), markers de mapa 42px (no son botones),
overflow horizontal no verificado en vivo (guardado por patrones min() en código).
Viewports razonados: 360×720 (objetivo), y breakpoints del código 42rem/54rem/620px/640px/760px.
Validación: lint verde · build verde · git diff --check limpio (solo LF/CRLF). Sin commit (lo hace owner).
Pendiente: revisión visual en navegador (owner), 3D.1c/3D.3/3D.5.

## Bloque 3A / Fase A ejecutada — pricing copy + constantes seguras — 2026-06-28

**Objetivo:** dejar una base de pricing/copy sin efecto financiero real.

**Cambios:** creado `src/config/pricing.js` como fuente informativa de planes, fase beta, `feePaidBy:
'requester'`, `betaCommissionBps: 0`, importes GA documentados, copy permitido y flags beta para mantener
Plus/Urgente/Helper Pro/Premium externo ocultos. TaskPayment y StripeReturn usan copy prudente sin tocar
checkout ni calculo de fees. Terminos y docs alineados a "pago retenido hasta confirmar".

**Restricciones respetadas:** no se toco checkout, server financiero, RLS, webhooks, Stripe backend,
refunds/disputes/payouts ni suscripciones. No se activaron comisiones reales.

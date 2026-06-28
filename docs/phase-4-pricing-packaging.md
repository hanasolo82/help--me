# HelpMe — Fase 4 / Bloque 3A: Premium, pricing y packaging de producto

> Auditoría de producto + pricing + packaging antes de la capa visual/disponibilidad. Solo análisis:
> sin editar código, sin tocar arquitectura financiera, RLS, webhooks, Stripe backend ni Supabase.
> Última revisión: 2026-06-28.
> Hermano: [`phase-4-premium-audit.md`](./phase-4-premium-audit.md) (estado técnico de Premium hoy).

---

# Decisiones validadas por el owner — 2026-06-28 (autoritativo)

Estas decisiones **mandan sobre cualquier matiz anterior** de este documento:

1. **Beta cerrada: 0% comisión.** No activar fees reales todavía.
2. **GA: la comisión la paga el requester ENCIMA del precio de la tarea** (no se descuenta al helper).
   El helper debe ver **ingresos claros** = el 100% del precio acordado.
3. **Plus NO vende "liberar pago"** (el release ya existe en base). Plus vende **revisión/control antes
   de liberar**: pausar, reportar problema y soporte humano.
4. **Copy público sin lenguaje legalmente fuerte:** prohibido **"seguro"**, **"reembolso garantizado"**,
   **"protección total"** y **"escrow"** en texto visible al usuario. Usar **"pago retenido hasta
   confirmar"**. (En este doc interno, aparece solo para marcar palabras que no deben usarse en UI.)
5. **IVA/impuestos = decisión pendiente registrada** antes de GA (quién factura, si la comisión lleva
   IVA, facturación a helper/requester). No se resuelve aquí; queda como bloqueante de GA, no de beta.
6. **Fase A puede avanzar** solo con `pricing.js` + copy + revisión legal. **Sin** tocar checkout, fees,
   RLS ni webhooks.
7. **Pricing no bloquea lo visual:** tras Fase A se retoman categorías/iconos (3B), disponibilidad (3C)
   y revisión visual (3D).

**Modelo validado (importes):** Beta 0% · GA base **8% + mín. 1,49 € pagado por el requester** · Plus
**12% + mín. 2,49 € pagado por el requester** · Urgente **+2,99 € opcional** · Helper Pro **later**.

> Nota de naming: donde el texto inferior diga "Pago Protegido" como etiqueta interna, el **rótulo público**
> es **"Pago retenido hasta confirmar"** (o "Pago retenido"). El nombre interno del plan puede mantenerse
> en documentación, pero la UI nunca muestra "protegido/protección total/seguro/escrow".

---

## Dos hechos del código que condicionan todo (honestidad primero)

1. **La comisión YA existe como motor, hoy al 0%.** `HELPME_PLATFORM_FEE_BPS` (basis points,
   configurable por env) se calcula y descuenta server-side en
   [payments.service.js:16](server/services/payments.service.js#L16). Poner 8%/12% es **configuración**
   (800/1200 bps), no arquitectura nueva. **Pero hoy se descuenta del helper** (`helper_amount = precio −
   fee`), no se suma al requester.
2. **La "liberación del pago" YA la hace el requester hoy**, en el cierre normal de tarea
   (`TaskComplete` → `releaseTaskPayment`). Es decir: el flujo base **ya incluye** que el requester
   libere manualmente al cerrar. → **"Liberar pago" no puede ser, por sí solo, la ventaja de un plan de
   pago**, o estaríamos capando el plan básico para inventar el premium. La ventaja Plus tiene que ser
   *control adicional* (pausar/reportar antes de liberar, ventana de retención, soporte prioritario), no
   "poder liberar".

Estos dos puntos hacen que el modelo del owner sea viable **si** reencuadramos "Protección Plus" como
*más control y revisión*, no como "te dejo liberar el pago".

---

# Veredicto

- **Modelo recomendado:** marketplace con **publicar gratis + pago retenido hasta confirmar**, una
  comisión simple, y extras opcionales (Destacar, Protección Plus) como *upsell honesto*. Vender
  **control del cierre**, no la palabra "Premium".
- **Beta — activar / ocultar / documentar:**
  - **Activar:** Publicar (gratis) + pago retenido hasta confirmar (happy path Stripe). **Comisión al 0% en beta**
    (como hoy): la beta valida el *producto*, no el *precio*.
  - **Ocultar (hasta tener flujo de compra y copy honesto):** Protección Plus, Urgente/Destacar,
    Helper Pro, y todo el bloque de pago externo/Premium actual (ver premium-audit).
  - **Documentar:** pricing completo listo para activar por config en GA.
- **Riesgo principal:** prometer "protección/seguro" o "liberación" que el usuario interprete como
  **seguro legal o reembolso garantizado**. HelpMe retiene el pago y puede revisar incidencias, no seguro ni
  refunds automáticos. El copy debe ser exacto o hay riesgo legal/confianza.

---

# Producto que vende HelpMe

HelpMe vende **tranquilidad en la ayuda entre vecinos**: publicas lo que necesitas gratis, eliges a quién
te ayuda, y **tu dinero queda retenido hasta que confirmas que el trabajo está hecho**.
Mientras tanto tienes chat directo, y al cerrar liberas el pago y valoras. No vendemos un "Premium"
abstracto: vendemos **pago retenido, coordinación y control del cierre**.

- **Capa gratuita:** crear solicitud y recibir ayudantes. Sin riesgo, sin coste.
- **Capa de pago retenido:** el valor central: pago retenido, chat, cierre y valoración. Aquí se monetiza.
- **Extras opcionales:** más visibilidad (Destacar) o más control/revisión (Protección Plus).

Mensaje comercial en una línea: **"Pide ayuda gratis. Paga retenido. Libera cuando estés conforme."**

---

# Pricing recomendado

> Importes en EUR. "Estado beta" = qué se muestra/activa en beta cerrada. El motor de comisión ya existe;
> los porcentajes se activan por config (`HELPME_PLATFORM_FEE_BPS`) — en beta queda a 0.

| Plan | Usuario | Precio | Incluye | No incluye | Estado beta |
|---|---|---:|---|---|---|
| **Publicar tarea** | Requester | Gratis | Crear solicitud, recibir ayudantes, elegir helper | Pago/chat hasta confirmar | **Activo** |
| **Pago retenido** | Requester | **0% en beta** (GA: ~8% por tarea, mín. 1,49 €) | Stripe Checkout, dinero retenido hasta confirmar, chat tras confirmar, cierre, valoración, soporte por email | Reembolso automático, seguro legal, disputes automáticos | **Activo (sin comisión)** |
| **Protección Plus** | Requester | GA: ~12% por tarea, mín. 2,49 € (o +1 € sobre Pago Protegido) | Todo Pago Protegido + **pausar/reportar antes de liberar**, ventana de retención más visible, recuperación reforzada, soporte prioritario | Reembolso garantizado, mediación legal | **Oculto / documentado** |
| **Urgente / Destacar** | Requester | GA: +2,99 € fijo | Más visibilidad temporal de la tarea | Cualquier efecto sobre seguridad del pago | **Oculto / documentado** |
| **Helper básico** | Helper | Gratis (beta) | Ofrecerse, chatear si es elegido, cobrar | — | **Activo** |
| **Helper Pro** | Helper | GA: ~7,99 €/mes | Badge, visibilidad, estadísticas, disponibilidad avanzada | **Nunca**: decidir liberación de pago | **Oculto / documentado** |

**Sobre los importes del owner:** razonables para ticket pequeño. El mínimo (1,49/2,49) es correcto:
cubre el coste Stripe (~1,5% + 0,25 €) y deja margen en tareas baratas. En una tarea de 10 €, 8% = 0,80 €
< mínimo → se aplica 1,49 € (efectivo ~15%); normal en micro-marketplaces. **Recomendación añadida:**
decidir **quién paga la comisión**. Hoy se descuenta del helper. Para confianza y oferta de helpers,
recomiendo **sumarla al requester en checkout** ("el helper recibe el 100% acordado; HelpMe añade su
comisión") — pero eso es cambio de checkout (Fase C), no para beta.

**Anti-sobre-empaquetado:** en beta el usuario solo ve **2 cosas** (publicar gratis + pagar protegido).
Plus/Urgente/Pro existen en doc, no en pantalla.

---

# Liberación del pago

- **En qué plan aparece:** la liberación al cerrar está en **el plan base (Pago Protegido)** — ya es así
  hoy. Lo que **Protección Plus** añade no es "liberar", sino **control antes de liberar**: pausar,
  marcar "tengo un problema" y enviar a revisión humana antes de soltar el dinero.
- **Qué ve el requester (base):** al cerrar la tarea, confirma y se libera el pago al helper. Copy claro:
  "Al cerrar, liberas el pago a tu ayudante."
- **Qué ve el requester (Plus):** además, antes de liberar, un paso visible "¿Todo correcto?" con opción
  **"Reportar un problema"** que **retiene** el pago y abre soporte. Nunca promete reembolso automático.
- **Qué ve el helper:** que el pago está **retenido** hasta el cierre; al liberar, recibe su importe.
  En Plus, ve que el requester puede pausar y que existe revisión — sin que el helper controle el release.
- **Qué pasa si no se libera:** el dinero **permanece retenido** (estado claro en la tarea), no se mueve.
  La recuperación es **humana/soporte**, no automática. (Coherente con Fase 3: refunds/disputes se
  **espejan**, no se ejecutan.)
- **Qué NO debe prometer la app:** "reembolso garantizado", "seguro", "te devolvemos el dinero",
  "mediación legal", "disputa automática". Solo: **"pago retenido"**, **"liberas cuando confirmas"**,
  **"puedes reportar un problema antes de liberar"**.

---

# UX necesaria

| Pantalla | Cambio necesario | Prioridad |
|---|---|---|
| Payment page | Copy honesto: "pago protegido/retenido", "sin comisión en beta"; **ocultar** bloque Premium/externo (ver premium-audit) | **P1** |
| StripeReturn | Ya correcto (recovery). Alinear copy a "pago protegido" | P2 |
| TaskComplete | Reforzar copy de liberación: "Al cerrar, liberas el pago a tu ayudante" | **P1** |
| Task detail | Mostrar estado de pago en lenguaje de confianza ("Pago retenido" / "Liberado") | P2 |
| Task creation | (Más adelante) checkbox opcional "Destacar tarea" — **oculto en beta** | Later |
| Helper profile | (Más adelante) badge Helper Pro — **oculto en beta** | Later |
| Settings | **No** crear página Premium en beta; el actual "Ver Premium" es callejón sin salida → ocultar | **P1** |
| Legal copy | Revisar que Términos describan pago retenido hasta confirmar y **no** prometan seguro/refund | **P1** |
| Soporte | Copy: "soporte por email"; **no** prometer 24/7 ni prioritario hasta que exista | **P1** |

---

# Implementación por fases

- **Fase A — Documentación y copy (segura, sin tocar dinero):** este documento + un módulo único de
  pricing/copy (constantes, sin efecto financiero) + microcopy honesto de "pago protegido / sin comisión
  en beta". Ocultar CTAs de Premium/externo. **Es lo único para ahora.**
- **Fase B — UI sin tocar dinero:** estados de pago en lenguaje de confianza, refuerzo del copy de cierre,
  preparar (oculto) los slots de "Destacar"/"Plus" sin activarlos.
- **Fase C — Backend/config (solo si se aprueba pricing):** activar comisión por config
  (`HELPME_PLATFORM_FEE_BPS`), decidir comisión sobre requester vs helper (cambio de checkout), y el paso
  "reportar problema antes de liberar" de Plus (retención + ruta a soporte, **sin** refund automático).
- **Fase D — Beta test de pricing:** medir disposición a pagar con comisión baja real o encuesta; validar
  que la protección se entiende.
- **Fase E — GA/futuro:** Protección Plus completa, Urgente/Destacar, Helper Pro (suscripción Stripe),
  comisión activada.

---

# Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Vender "protección/seguro" que el usuario lea como **seguro legal/reembolso** | **Alta** | Copy exacto: "pago retenido hasta confirmar", nunca "seguro" ni "reembolso garantizado"; revisar Legal |
| Cobrar por "liberar pago" cuando el base ya libera | Media | Reencuadrar Plus como *control/revisión extra*, no como "poder liberar" |
| Cobrar por "soporte prioritario" inexistente | Media | No prometer prioritario/24-7 hasta que exista; en beta "soporte por email" |
| Pago externo (Premium actual) como bypass sin protección | Media | Ocultar en beta (ya recomendado en premium-audit); fuera del happy path |
| Comisión descontada del helper sorprende al helper | Media | Decidir y comunicar bearer; recomendado sumar al requester (Fase C) |
| Demasiados planes confunden | Baja | Beta enseña solo 2; resto documentado/oculto |
| Activar comisión sin avisar a usuarios beta | Media | Beta a 0%; activar precio solo con aviso previo y en GA |

---

# Prompt para Codex (solo Fase A, segura)

```
HelpMe — Pricing Fase A: fuente única de pricing + copy honesto (sin tocar dinero)

Objetivo: dejar el pricing/copy como fuente única documentada y aplicar microcopy honesto,
SIN tocar Stripe, comisión, RLS, webhooks ni la lógica de pago. Beta sigue a 0% comisión.

Hacer:
1. Crear src/config/pricing.js: módulo de constantes (planes, importes GA, copy de
   pago/cierre, flags de visibilidad por entorno). NADIE financiero lo consume aún;
   es fuente de verdad para UI y docs. Marcar Plus/Urgente/HelperPro como `visibleInBeta:false`.
   Para GA dejar anotado `feePaidBy: 'requester'` (encima del precio) — solo metadato, sin lógica.
2. Payment page (TaskPaymentPage): usar el copy del módulo con la frase pública
   "pago retenido hasta confirmar" y "sin comisión en beta". Mantener oculto el bloque
   Premium/externo tras el flag ya acordado (VITE_PREMIUM_UI off).
3. TaskComplete: copy "Al cerrar, liberas el pago a tu ayudante" desde el módulo.
4. Revisar Legal (Terms/Privacy) para que NO usen "seguro", "reembolso garantizado",
   "protección total" ni "escrow"; ajustar a "pago retenido hasta confirmar + revisión humana".
   Solo copy. Añadir nota interna (comentario o doc) de que IVA/impuestos queda pendiente para GA.

Validación:
- pnpm run lint y pnpm run build verdes.
- No hay cambios en server/, supabase/migrations/, ni en cálculo de fee (sigue 0 bps).
- git diff --check limpio.
- rg de palabras prohibidas en UI/Legal = 0: "seguro", "reembolso garantizado",
  "protección total", "escrow", "24/7".

No hacer:
- No tocar HELPME_PLATFORM_FEE_BPS ni el checkout/transfer/release (el cambio de bearer
  requester-encima-del-precio es GA/Fase C, NO aquí).
- No añadir lógica de IVA/impuestos (solo registrar como pendiente).
- No crear página Premium ni planes comprables.
- No activar Plus/Urgente/HelperPro en UI.
- No tocar RLS/webhooks/refunds/disputes/payouts.
```

---

# Qué NO abrir ahora

- **No** activar comisión real (beta a 0%; activar es Fase C/GA con aviso).
- **No** crear suscripciones Stripe ni página de compra de Premium/Helper Pro.
- **No** implementar "reportar problema antes de liberar" todavía (es Fase C; hoy solo copy).
- **No** tocar refunds/disputes/payouts ni convertir el pago externo en happy path.
- **No** cambiar quién paga la comisión (requester vs helper) hasta Fase C decidida.
- **No** prometer soporte prioritario/24-7 ni seguro legal.
- **No** abrir lo visual/iconos/disponibilidad (3B/3C/3D) hasta cerrar pricing copy.
- **No** reabrir Fase 3 (retención de pago, idempotencia y gate de chat siguen sanos).

---

## Conclusión para el owner

Tu hipótesis es **vendible y compatible** con lo que ya existe, con dos correcciones honestas: (1) la
comisión ya es un motor a 0% — activarla es config, no obra nueva, pero decide **quién la paga**; (2)
"liberar pago" ya es del plan base, así que **Protección Plus debe vender *control y revisión extra*, no
"poder liberar"**. Para beta cerrada: **publicar gratis + pago retenido a 0% comisión**, todo lo demás
documentado y oculto. Primero copy honesto (Fase A, Codex), luego retomamos **3B/3C/3D**.

# HelpMe — Fase 5: auditoría visual/comercial (nivel premium)

> Diagnóstico duro de la capa visual y comercial antes de declarar Fase 5 cerrada. Sin tocar backend,
> pagos, RLS, Supabase, Stripe ni webhooks. Solo auditoría + plan + primer paquete para Codex.
> Última revisión: 2026-06-29.

---

# Veredicto duro

**Fase 5 NO está cerrada.** Lo entregado hasta ahora (sección de planes + bloque en Settings) es un
**placeholder informativo correcto pero plano**: cumple copy y reglas, pero **no es una capa de producto
premium**. Son "containers con precios", justo lo que se pidió no aceptar como final.

Tres cosas tiran el nivel hacia abajo de forma objetiva (no opinión):
1. **La landing pública no tiene ni una imagen real.** `public/` está vacío de media: el hero siempre cae
   al fallback (logo + texto). Cualquier visitante ve una landing que parece sin terminar. **Esto es lo
   primero que ve un usuario externo.**
2. **El pricing es una fila plana de 4 cards iguales.** Sin plan destacado, sin jerarquía, sin separar
   "Disponible ahora" de "Próximamente" con peso visual. No vende.
3. **Premium no existe como producto.** Hay copy ("Próximamente") pero **no hay estados, ni acceso, ni
   flujo, ni definición operativa** de Plus / Urgente / Helper Pro. No debe llamarse implementado.

El sistema base (tokens, botones, dark por inyección de tokens) es sólido; el problema es la **capa de
presentación y producto comercial**, que está a medias.

---

# Hallazgos por severidad

| Sev | Hallazgo | Dónde | Por qué importa |
|---|---|---|---|
| **P0** | Landing sin imágenes reales: `public/` vacío, el hero siempre usa el fallback (logo) | Landing hero | Primera impresión de todo visitante externo; parece sin terminar |
| **P0** | Pricing plano: 4 cards de igual peso, sin plan destacado ni segmentación "ahora vs próximamente" | Landing `#planes` | No comunica oferta; no vende; el owner ya lo rechazó como final |
| **P1** | Premium sin producto: Plus/Urgente/Helper Pro solo tienen copy; faltan beneficios concretos, estados, puntos de acceso y flujo | Transversal | No se puede vender ni activar; riesgo de prometer humo |
| **P1** | Dark mode con fugas de color hardcodeado: literales `#fff`, `rgba(28,25,22,…)` (bordes/sombras), `#b42318` (errores), `color-mix(... white)` no adaptan | Modales, forms, chat, errores | Bordes/sombras casi invisibles y texto de error con bajo contraste en dark; "modales que se sienten rotos" |
| **P1** | Escala tipográfica incoherente: landing con `h2` clamp hasta ~4–4.8rem vs app compacta; la sección de pricing hereda escala de app dentro de una landing gigante | Landing vs app | Parecen dos productos distintos; jerarquía rota |
| **P1** | Lenguaje de modales fragmentado: 4 sistemas (AuthModal con overrides `data-theme`, RequestTaskModal/TaskPreviewModal módulo, `task-flow-modal` global, TaskChatModal global) con close buttons, padding y radios distintos | Modales | Inconsistencia perceptible; mantenimiento frágil |
| **P2** | HelpMoji no se usa en landing/pricing; las category cards de la landing son texto plano | Landing categorías/pricing | Desaprovecha el sistema visual propio; se ve genérico |
| **P2** | Dos hojas globales solapadas (`styles.css` vs `styles/globals.css`) + 3 capas de tokens (`design-tokens`, `theme-live`, inyección JS) | Global | Riesgo de divergencia; difícil razonar el dark |
| **P2** | Microinteracciones escasas en app (cards estáticas, sin animación de entrada de modal) | App | Se siente menos premium que la landing |
| **P2** | Estados empty/loading/error no homogéneos entre páginas | Transversal | Calidad percibida desigual |
| **Later** | Hero con vídeo/loop, set de ilustración propia, imagen OG/social, sistema de motion formal, consolidación del design system | Global | Pulido GA |

---

# Páginas/zonas por debajo del nivel

1. **Landing** — la más crítica comercialmente: sin imágenes, hero en fallback, pricing plano, tipografía
   desproporcionada. Es la cara pública y hoy no vende.
2. **Sección de pricing** (`#planes`) — funcional pero plana; no parece producto.
3. **Dark mode en modales/forms/errores** — sin QA; fugas de literales.
4. **Category cards de la landing** — texto plano sin HelpMoji.
5. **Bloque de planes en Settings** — correcto pero plano; sin jerarquía.
6. **Empty/loading states de la app** — dispares.

---

# 1. Consistencia visual global (detalle)
- **Fortaleza:** tokens + librería `.*-action`/`.field`/`.detail-panel`, tap targets ≥44px (tras 3D.4),
  estados de tarea editoriales unificados (3D.1).
- **Gaps:** escala tipográfica landing↔app; 4 lenguajes de modal; literales de color; `styles.css` vs
  `globals.css`; spacing de secciones de landing (enormes) vs cards de pricing (compactas).

# 2. Dark mode (detalle)
- **Cómo funciona:** `applyThemeToDocument` inyecta `DARK_THEME_BASE` inline en `<html>` → los `--hm-color-*`
  sí cambian (no hay bloque `[data-theme=dark]` en CSS, pero el inline gana). La base adapta.
- **Roto/sin pulir:** todo CSS con literales light-tuned: `rgba(28,25,22,…)` (bordes/sombras casi
  invisibles en dark), `#b42318` (errores poco legibles), `color-mix(..., white)` (aclara en la dirección
  equivocada), `#fff` en chips. AuthModal está hecho "dark-first" con overrides `data-theme='light'` →
  enfoque distinto al resto. **Falta una pasada de QA dark** (no se ha hecho ninguna).

# 3. Pricing actual (detalle)
- Hoy: explainer + 4 cards iguales + disclaimer. Lee como documento, no como página de producto.
- Falta: **plan destacado** ("Disponible ahora" como héroe), **grupo "Próximamente" claramente
  secundario/locked**, jerarquía tipográfica, iconografía (HelpMoji o iconos de plan), precio GA legible
  pero sin competir con el valor, y una narrativa de valor antes que de precio.

# 4. Producto Premium (definición correcta, hoy inexistente)

| Plan | Qué es | Beneficio real | Dónde aparece | Estados necesarios | Copy si no disponible | Para activarlo (fase posterior) |
|---|---|---|---|---|---|---|
| **Plus** | Add-on del requester | Control antes de liberar: pausar, reportar problema, soporte humano | TaskPaymentPage (upgrade opcional), TaskComplete (paso de liberar), landing | no-disponible · elegible · activo-en-tarea · problema-reportado/pausado | "Próximamente" | tarifa/suscripción + flujo "reportar antes de liberar" + ruta a soporte |
| **Urgente / Destacar** | Extra por tarea (requester) | Visibilidad temporal en mapa/lista | CreateTask (toggle opcional), TaskDetail | disponible · comprado · activo · expirado | "Próximamente" | tarifa fija por tarea + flag de visibilidad + ranking |
| **Helper Pro** | Suscripción del helper | Badge, visibilidad, estadísticas, disponibilidad avanzada | Perfil helper, helper home, settings | no-suscrito · activo · expirado | "Más adelante" | suscripción + badge/ranking/stats |

**Conclusión:** Premium = copy sin producto. No hay estados ni accesos ni flujo. **No considerarlo
implementado.** Primero diseño de producto (estados + puntos de acceso + flujo), luego —en fase aparte—
checkout real.

# 5. Imágenes / vídeo / actividad (dirección)
- **Situación:** `public/` sin media; hero en fallback siempre. Stock genérico prohibido.
- **Dirección:** cálida, humana, de barrio real; HelpMoji como sistema de iconografía de actividad
  consistente (mapa/cards/pricing/empty states). Nada oscuro ni IA/stock.
- **Assets que faltan:** 3 imágenes de hero (p. ej. paseo de perro, entrega de compra, ayuda con el móvil),
  ilustración/empty-state por categoría, imagen OG/social, favicon/brand check.
- **Vídeo:** no para beta. Si acaso, un loop ≤3s muy sutil con `poster` e `prefers-reduced-motion`, lazy —
  pero recomiendo **imagen estática optimizada** primero (rendimiento y honestidad).
- **Briefing de assets (para generación):**
  - Hero 1: "Persona joven paseando un perro pequeño en una calle de barrio español soleado, luz cálida
    natural, estilo fotográfico realista, tonos crema/verde/terracota, sin texto."
  - Hero 2: "Vecino entregando una bolsa de la compra a otra persona en un portal, gesto amable, luz
    cálida, realista, paleta cálida."
  - Hero 3: "Persona mayor y persona joven mirando juntas un teléfono móvil resolviendo una duda, cercano
    y humano, luz natural cálida."
  - Empty-state: ilustración lineal cálida coherente con los glifos HelpMoji (mismo grosor de trazo).

# 6. Animaciones y hover (propuesta, contenida)
- Cards: lift + sombra al hover (ya existe el patrón en botones); pricing: la card destacada con realce.
- Botones: press scale sutil; CTA primario translateY (ya).
- Modales: entrada fade+scale ~150ms (hoy aparecen secos).
- Mapa/lista: hover de marcador/pin y de fila de lista.
- HelpMoji: entrada sutil al aparecer en cards.
- **Todo** bajo `@media (prefers-reduced-motion: reduce)` desactivado. Sin parallax ni motion pesado.

---

# Plan de implementación por paquetes pequeños

- **P5.1 — Rediseño de pricing v2** (frontend, sin assets): plan destacado "Disponible ahora" + grupo
  "Próximamente" secundario/locked; jerarquía; iconos; desktop 2 niveles / mobile apilado; dark-safe.
  *(Primer paquete — abajo.)*
- **P5.2 — Hero/landing imagery:** owner entrega 3 assets (briefing §5); wire `<picture>` responsive, lazy,
  `poster`; reducir dependencia del fallback; ritmo de secciones.
- **P5.3 — Pasada dark mode:** sustituir literales (`rgba(28,25,22…)`, `#b42318`, `color-mix(... white)`,
  `#fff`) por tokens; QA 360×720 en light y dark; unificar enfoque de AuthModal.
- **P5.4 — Definición de producto Premium:** doc de estados + puntos de acceso + flujo (sin checkout);
  base para la fase de monetización real posterior.
- **P5.5 — Microinteracciones:** card/pricing/botón/entrada de modal, con `prefers-reduced-motion`.
- **P5.6 — Consistencia:** escala tipográfica landing↔app + unificación de lenguaje de modales +
  consolidación `styles.css`/`globals.css`.

---

# Primer paquete concreto para Codex (P5.1 — pricing v2)

```
HelpMe — P5.1: rediseño de la sección de planes (frontend, sin monetización)

Objetivo: que #planes parezca producto, no una fila de cards. Sin tocar backend/pagos/
RLS/Supabase/Stripe/checkout/fees/suscripciones. pricing.js sigue solo informativo (solo lectura).

Hacer (src/pages/Landing/Landing.jsx + Landing.module.css):
1. Estructura en DOS niveles:
   a) Plan DESTACADO "Disponible ahora" (Pago retenido): card más grande, borde de acento,
      cabecera con badge "Disponible ahora", precio "Sin comisión en beta cerrada",
      lista de incluidos, y único CTA real <button> "Publicar tarea" (onClick startJourney('need')).
   b) Grupo "Próximamente": Protección Plus, Urgente/Destacar, Helper Pro como cards
      SECUNDARIAS y visualmente atenuadas (menor tamaño, fondo más tenue, badge
      "Próximamente"/"Más adelante", precio GA estimado en texto secundario). SIN botón;
      etiqueta no interactiva. Deben leerse claramente como no contratables.
2. Jerarquía: título de sección, subtítulo, y separación visual entre los dos niveles
   (p. ej. encabezado "Disponible ahora" y "Próximamente" como subtítulos).
3. Añadir un icono por plan (line icon simple con tokens, o reutilizar ActivityIcon si encaja;
   sin assets nuevos). Mantener HelpMoji coherente si se usa.
4. Layout responsive: desktop = destacado a ancho completo o 1+3; mobile = apilado, CTA 44px.
5. Dark-safe: usar SOLO alias del tema (--surface, --text, --accent, --border) o --hm-* ;
   prohibido nuevos literales (#fff, rgba(28,25,22,...), color-mix con white/#000).
6. Copy: mantener prohibidas seguro/reembolso garantizado/protección total/escrow/soporte 24/7.
   CTAs permitidos: solo "Publicar tarea". Nada de Comprar/Activar/Pagar/Suscribirme/Desbloquear.

Validación:
- pnpm run lint, pnpm run build verdes; git diff --check limpio.
- rg de palabras prohibidas y de CTAs de compra = 0 en Landing.
- Revisión 360×720 en light y dark.

No hacer:
- No tocar pricing.js flags ni activar monetización.
- No tocar backend/pagos/RLS/Supabase/Stripe/webhooks/checkout/fees/suscripciones.
- No P5.2+ (imágenes, dark global, premium product, motion) en este diff.
- No commit ni push.
```

---

# Qué NO tocar todavía
- **Nada** de backend / pagos reales / Stripe / RLS / Supabase / webhooks / checkout / release /
  refunds-disputes-payouts / cálculo de fees / suscripciones.
- **No** activar Plus/Urgente/Helper Pro ni flags de `pricing.js`.
- **No** meter vídeo pesado ni assets sin briefing/optimización.
- **No** rediseño global de golpe: ir por paquetes P5.1 → P5.6.
- **No** reabrir Fase 3.
- **No** declarar Premium implementado hasta cerrar P5.4 (producto, estados, acceso, flujo).

# HelpMe — Fase 4 / Bloque 3: auditoría UX/UI y páginas

> Revisión de HelpMe como producto visible antes de beta cerrada: consistencia, claridad, confianza y
> mobile. No solo "¿funciona?" sino "¿se entiende, da confianza y se ve bien en móvil?".
> Última revisión: 2026-06-28. Sin tocar dinero/RLS/webhooks/features.
> Hermanos: [`phase-4-beta-plan.md`](./phase-4-beta-plan.md), [`phase-4-beta-closed-pack.md`](./phase-4-beta-closed-pack.md).

---

## Resumen ejecutivo

El producto está **visualmente maduro y consistente** gracias a un sistema de diseño centralizado real
(no improvisado). Las pantallas críticas de dinero/confianza (pago, retorno de Stripe, cierre) tienen
copy tranquilizador, estados terminales y recuperación — bien por encima de lo típico en una beta.

**No hay un bloqueante de UI/UX nuevo** que impida la beta a nivel de maquetación o flujo. El único
**P0 visible** es de **contenido legal** (placeholders sin rellenar que se renderizan al usuario), ya
recogido en el plan beta. El resto son inconsistencias acotadas (P1: etiquetas de estado divergentes) y
limpieza (P2/Later) que **no** bloquean.

| Severidad | Nº | ¿Bloquea beta cerrada? |
|---|---|---|
| P0 | 1 | **Sí** (solo el legal, ya trackeado) |
| P1 | 2 | No, pero arreglar antes de externos |
| P2 | 4 | No |
| Later | 3 | No |

---

## 1. Inventario de páginas y componentes visibles

**Páginas (`src/pages`):** Landing · Login / ForgotPassword / ResetPassword / AuthCallback ·
Onboarding · Home (HomeView + modos NeedHomeMode / HelperHomeMode) · CreateTask · TaskDetail ·
TaskPayment · Stripe (Return / Refresh) · TaskComplete · TaskReview · Chat · Chats · Profile ·
Settings (sidebar + secciones Profile/Security/Payments/Notifications/Appearance/Map) · Legal
(Layout + Terms / Privacy / Cookies / CommunityGuidelines) · DesignLab (interno).

**Componentes visibles repetidos:** TaskCard · MyRequestCard · HelperCard · UserAvatar ·
ActionStatusOverlay · chat (MessageBubble / MessageList / MessageInput / ConversationList) ·
AuthPanel / AuthModal · modales (TaskPreviewModal, HelperPreviewModal, RequestTaskModal,
TaskReviewPromptModal, TaskComplete embebido) · SkillBadge / VerificationBadges · mapa (TaskMap,
marcadores) · BrandLogo · ThemeSwitch.

---

## 2. Estilos globales y patrones repetidos

**Fortaleza — sistema de diseño real:**
- `src/styles/design-tokens.css`: paleta, escalas de espaciado (`--hm-space-*`), radios, sombras,
  z-index (`--hm-z-*`), motion/easing, y tokens semánticos de botón/card/panel/shell. Muy completo.
- `src/styles.css`: librería compartida de clases (`.primary-action`, `.secondary-action`,
  `.success-action`, `.danger-action`, `.oauth-action`, `.chip`, `.icon-button`, `.detail-panel`,
  `.field`, chat…) con `:hover`, `:focus-visible` y `min-height` de botón consistentes (2.75rem) y
  `touch-action: manipulation` para móvil. Buen trabajo de base.
- Botones primario/secundario/éxito/peligro unificados y reutilizados en casi todas las pantallas.

**Patrones de confianza (muy bien):**
- Copy de pago tranquilizador y honesto: "No se ha perdido dinero", "No repitas el pago",
  "No cierres esta pantalla ni vuelvas a pulsar el botón".
- `ActionStatusOverlay` bloquea reintentos durante operaciones críticas.
- Estados terminales con recuperación (StripeReturn `unconfirmed`, TaskComplete `error`).
- Errores con `role="alert"`.

**Deudas de base (no bloqueantes):**
- **Tres capas de tokens/CSS global** (`design-tokens.css`, `styles.css` con su propio `:root`, y
  `theme-live.css` que define `--hm-input-*` / `--hm-payment-panel-*`). Funciona, pero hay acoplamiento
  implícito: si `theme-live.css` no se carga, inputs y panel de pago pierden su estilo. Documentar/unificar.
- `src/styles.css` y `src/styles/globals.css` re-declaran reglas globales solapadas (`body`, `h1..h5`,
  `button`). Riesgo de divergencia futura.

---

## 3. Hallazgos por pantalla crítica

| Pantalla | Estado | Notas |
|---|---|---|
| **Home / HelperHome** | OK | Modos requester/helper separados; cards y chips consistentes. |
| **TaskDetail** | OK | Copy de disponibilidad de chat clara y gateada por estado/pago. Usa su propio mapa de estados (ver P1). |
| **OfferHelp (map/list/modal)** | OK | Modales con scrim y `max-height` correctos; sticky CTA en móvil. |
| **TaskPayment** | **Muy bien** | Resumen de importe claro (`Intl.NumberFormat` EUR), helper visible, botón de pago retenido, overlay anti-doble-clic, estados no-pagables explicados. |
| **StripeReturn** | **Muy bien** | Polling con tope duro (90s), estado terminal `unconfirmed`, 3 acciones de recuperación, soporte por mailto real. Sin spinner infinito. |
| **TaskComplete** | **Muy bien** | Timeouts por fase, confirmación honesta si la post-confirmación no termina, gating por rol/estado. |
| **Chat** | OK menor | Conviven composer "legacy" (`.chat-composer`) y `.task-chat-composer` + `MessageInput` compartido (ver P2). |
| **Profile / Settings** | OK | Sidebar de settings y tarjetas de stats consistentes. |
| **Legal** | **P0 contenido** | Footer de contacto correcto, pero el cuerpo renderiza placeholders sin rellenar (ver P0). |

---

## 4. Lista priorizada de problemas

### P0 — bloquea beta cerrada con usuarios externos

**P0.1 — Placeholders legales visibles al usuario.**
`Terms.jsx` / `Privacy.jsx` renderizan literalmente `[NOMBRE Y APELLIDOS]`, `[NIF_O_NIE]`,
`[DIRECCION POSTAL]`. Un usuario externo que abra Términos/Privacidad ve texto sin completar →
problema de confianza y legal.
- **Pantallas:** Legal (Terms, Privacy).
- **Ya trackeado** en `phase-4-beta-plan.md` §6 y `phase-4-beta-closed-pack.md` §1 como pendiente de owner.
- **Fix:** rellenar la identidad real del responsable (dato del owner, no del agente). **Bloqueante solo
  para externos**, no para beta interna del owner.

### P1 — arreglar antes de invitar externos (no bloquea internamente)

**P1.1 — Etiquetas de estado de tarea divergentes y duplicadas.**
El mapa estado→texto está copiado en **5+ sitios** con wording distinto para el **mismo** estado:
- `open`: **"Publicada"** en `TaskCard` y `mapMarkerIcons` vs **"Activa"** en `TaskDetail`,
  `MyRequestCard`, `RequesterTaskMarker`.
- `assigned`: **"Oferta pendiente"** en casi todos vs **"Oferta"** en `mapMarkerIcons`.

Efecto: la misma tarea aparece como "Publicada" en el marketplace y "Activa" en su detalle. Resta
pulcritud y confianza.
- **Pantallas:** TaskCard, TaskDetail, MyRequestCard, RequesterTaskMarker, mapMarkerIcons.
- **Fix mínimo (sin rediseño):** crear `src/features/tasks/utils/taskStatusLabels.js` con un único mapa
  y `getTaskStatusLabel(status)`, e importarlo en los 5 sitios. Elegir un único término por estado
  (recomendado: `open → "Activa"` para requester, ya mayoritario). Cambio mecánico, sin tocar lógica.

**P1.2 — El estado de la tarea no se distingue visualmente (sin badge).**
En `TaskCard` el estado va mezclado en una línea meta `categoría · ubicación · estado · antigüedad`,
sin color ni peso. Estados con carga de confianza ("En curso", "Completada", "Cancelada") no destacan.
- **Pantallas:** TaskCard (y derivados de listado).
- **Fix mínimo:** envolver el estado en un `<span className={styles.statusBadge}>` con fondo suave por
  familia de estado (usar tokens existentes `--color-success-bg`, `--color-warning-bg`,
  `--hm-color-highlight`). Sin nuevos colores ni rediseño; reutiliza tokens. (Si se quiere mantener
  alcance mínimo, P1.1 es lo prioritario y esto puede caer a P2.)

### P2 — calidad, no bloquea

- **P2.1 — Dos sistemas de composer de chat** (`.chat-composer` legacy + `.task-chat-composer` +
  `MessageInput` compartido). Riesgo de deriva visual. Unificar hacia `MessageInput`.
- **P2.2 — CSS global solapado** (`styles.css` vs `styles/globals.css` redefinen `body`/`h1..h5`/`button`).
  Consolidar en uno.
- **P2.3 — Tres capas de tokens** con dependencia implícita de `theme-live.css` para inputs/panel de pago.
  Documentar el orden de carga o fusionar tokens base.
- **P2.4 — Badge de estado sin color** (degradado de P1.2 si se prioriza alcance mínimo).

### Later — mejoras de fondo

- **L.1** — Aviso de chunk grande en build (code-splitting) — ya anotado en smoke checklist.
- **L.2** — `DesignLab` es ruta interna; confirmar que no es accesible/linkable en producción de beta.
- **L.3** — Revisión de contraste AA y `prefers-reduced-motion` en transiciones (motion presente en
  botones/cards) para accesibilidad GA.

---

## 5. Fixes recomendados (mínimos, sin rediseño)

Solo **P1.1** y **P0.1** se recomiendan antes de externos. Ninguno toca dinero/RLS/webhooks/features.

1. **P0.1 (owner):** rellenar identidad legal en `Terms.jsx`/`Privacy.jsx`. No es trabajo de código de
   agente: es un dato del responsable.
2. **P1.1 (agente, ~30 min, bajo riesgo):** centralizar `taskStatusLabels` en un util compartido e
   importarlo en los 5 consumidores; unificar `open → "Activa"` y `assigned → "Oferta pendiente"`.
   Validación: `lint`/`build` verdes + revisar que ninguna card muestre el estado crudo en inglés.
3. **P1.2 / P2.x:** opcionales; agendar como pulido post-beta-interna o GA.

---

## 6. Decisión: qué arreglar antes de beta cerrada

- **Beta interna (owner):** **nada bloquea.** El producto es presentable y los flujos de confianza están
  sólidos. Se puede ejecutar ya el smoke en navegador.
- **Beta cerrada con externos:** arreglar **P0.1** (identidad legal — ya en la checklist pre-beta) y,
  recomendado, **P1.1** (unificar etiquetas de estado) por pulcritud. P1.2/P2/Later **no** bloquean.
- **Veredicto:** **UX/UI no bloquea la beta.** Un único bloqueante real (legal P0.1) ya está recogido
  como pendiente de owner; el resto es pulido sin riesgo.

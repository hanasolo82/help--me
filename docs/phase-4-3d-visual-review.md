# HelpMe — Fase 4 / Bloque 3D: revisión visual profunda

> Auditoría visual de páginas y estilos como producto, antes de beta cerrada. Solo auditoría: sin editar
> código, sin cambio de stack, sin librerías UI nuevas, sin tocar backend/pagos/RLS. Estilo HelpMe:
> calmado, humano, claro, confiable. Tokens existentes; verde como confianza, no como color único.
> Última revisión: 2026-06-29.
> Hermanos: [`phase-4-ux-audit.md`](./phase-4-ux-audit.md), [`phase-4-visual-direction.md`](./phase-4-visual-direction.md).

> **ACTUALIZACIÓN 2026-06-29 — cambio de dirección (owner):** se DESCARTA el patrón "StatusBadge"
> (punto de color + etiqueta / chip / semáforo) por sentirse genérico/SaaS. El estado pasa a ser
> **editorial** (texto jerárquico + microcopy contextual). La fila **P1-D** y el prompt de Codex de este
> documento quedan **SUPERADOS** por la spec autoritativa
> [`phase-4-3d1-editorial-accent-spec.md`](./phase-4-3d1-editorial-accent-spec.md). No implementar el
> StatusBadge descrito abajo.

---

# Veredicto

- **¿Lista para beta interna?** **Sí, visualmente.** Sin bloqueantes de maquetación/flujo. 3B (HelpMoji)
  y 3C (disponibilidad) suben claramente la calidad percibida frente a la última auditoría.
- **¿Lista para beta cerrada externa?** **Casi.** No hay bloqueante visual *duro*, pero la queja del
  owner ("se siente verde/inmadura") es **real y acotada**: la riqueza de color de 3B vive solo en
  chips/marcadores/iconos, mientras el **shell, home, cabeceras y CTAs siguen casi monocromos verdes**.
  Recomiendo el paquete 3D.1 (abajo) antes de invitar externos.
- **¿Qué bloquea visualmente?** Solo **P0.1 (legal)**: placeholders de identidad sin rellenar que se
  renderizan al usuario (ya trackeado, dato de owner). Es contenido, no maquetación. **Ningún P0 visual
  nuevo.** Lo "verde/inmaduro" es P1 de pulido, fuertemente recomendado, no bloqueo duro.

---

# Fortalezas confirmadas (no asumidas)

- **Sistema de diseño real** (`design-tokens.css` + librería `.*-action`/`.field`/`.detail-panel`): botones
  con `:focus-visible`, `min-height` 2.75rem, `touch-action` móvil. Consistente.
- **3B HelpMoji bien hecho:** 9 actividades con paleta cálida por categoría (`background/foreground/accent`),
  glifos SVG propios, mapeo legacy, normalización y a11y (`role="img"`/`title` o `decorative`). El mapa ya
  usa `createActivityMarkerSvg` **en lugar de las siglas** — dolor #4 resuelto. El icono se consume en
  TaskCard, TaskDetail, TaskPreviewModal, MyRequestCard, MyRequestsPanel, HelperHome, HelperUpcomingPanel,
  TaskMap → **consistencia amplia**. ✓
- **3C disponibilidad:** chip día/franja en cards y detalle, fallback "Horario flexible". Aporta claridad.
- **Pantallas de confianza (pago/retorno/cierre):** copy honesto, overlays anti-doble-clic, estados
  terminales con recuperación, `role="alert"`. Sólidas.

---

# Hallazgos por severidad

| Sev | Hallazgo | Página | Por qué importa | Acción recomendada |
|---|---|---|---|---|
| **P0** | Placeholders legales (`[NOMBRE Y APELLIDOS]`/`[NIF]`/`[DIRECCION]`) visibles | Legal (Terms/Privacy) | Rompe confianza/legal ante externos | Rellenar identidad (owner). Ya trackeado |
| **P1-A** | Etiquetas de estado **aún divergentes y duplicadas** (no se unificó): `open`="Publicada" vs "Activa"; `assigned`="Oferta" vs "Oferta pendiente" | TaskCard, TaskDetail, MyRequestCard, RequesterTaskMarker, mapMarkerIcons | Misma tarea, dos nombres → resta pulcritud/confianza | Crear `taskStatusLabels.js` único e importar en los 5 sitios |
| **P1-B** | Solo **3 de 9 glifos HelpMoji son alcanzables**: `allowedCategories` sigue en 4 (Mascotas/Recados/Compras/Ayuda técnica → pets/errands/tech) | CreateTask, cards, mapa | La variedad visual de 3B no aparece; mapa/cards se ven repetitivos | Ampliar `allowedCategories` a las 9 actividades (con sus labels). Cambio de lista + copy, sin lógica |
| **P1-C** | **Monocromía verde** persiste en shell/home/cabeceras/CTAs; el acento terracota (`--hm-color-accent`) y los neutros cálidos existen en tokens pero **no se despliegan** | Home, HelperHome, cabeceras, layout | Es el dolor #1 del owner: "se siente verde" | Desplegar acento + fondos de sección cálidos con **tokens existentes**, sin colores nuevos ni rediseño |
| **P1-D** | Estado de tarea **sin badge** (va en línea meta `categoría · ubicación · estado · antigüedad`) | TaskCard y listados | Estados de confianza ("En curso", "Cancelada") no destacan | `statusBadge` con fondo suave por familia (tokens `--color-success-bg`/`--color-warning-bg`); ya hay patrón `ActivityBadge` |
| **P2** | **Glifos duplicados**: `ActivityGlyph` (JSX) y `markerSvgBody` (string SVG) repiten los mismos paths | categories/ | Deriva si cambia un icono (hay que tocar dos sitios) | Unificar a una fuente de paths compartida |
| **P2** | CSS global solapado (`styles.css` vs `styles/globals.css`) + 3 capas de tokens (dep. de `theme-live.css`) | global | Riesgo de divergencia futura | Consolidar (deuda previa) |
| **P2** | Dos composers de chat (`.chat-composer` legacy + `.task-chat-composer`/`MessageInput`) | Chat | Deriva visual | Unificar a `MessageInput` |
| **P2** | Home sin imagen/ilustración (hero plano) | Home/Landing | Primera impresión "genérica" | Hero ilustrado lazy (asset de owner) |
| **Later** | Dedup de glifos, consolidación CSS, animaciones de entrada, code-splitting, DesignLab en prod, pase de contraste AA + `prefers-reduced-motion` | varias | Pulido/GA | Agendar post-beta |

---

# Plan de acción

- **3D.1 — Fixes P0/P1 rápidos (CSS + 1 util + JSX menor):**
  (a) `taskStatusLabels.js` único (P1-A); (b) `statusBadge` en TaskCard (P1-D); (c) despliegue de acento
  terracota + fondos de sección cálidos en shell/home/cabeceras con tokens existentes (P1-C).
  *(a) y (b) son mecánicos y de riesgo mínimo → primer paquete a Codex. (c) necesita una mini-spec de
  diseño y va en 3D.1b.*
- **3D.2 — Consistencia cards/mapa/forms:** ampliar `allowedCategories` a las 9 actividades (P1-B, con
  nombres aprobados por owner); revisar densidad de cards, espaciado de forms (CreateTask/RequestTaskModal),
  estilo uniforme del chip de disponibilidad.
- **3D.3 — Home/Landing con imagen/ilustración:** hero ilustrado cálido (1 asset optimizado, `loading="lazy"`),
  ritmo de secciones, jerarquía de un solo CTA primario por vista.
- **3D.4 — Mobile polish:** tap targets, alturas de modal (`max-height`/scroll), sticky CTAs, densidad de
  cards en pantallas pequeñas, line-length de copy.
- **3D.5 — Polish posterior:** dedup de glifos, consolidación CSS/tokens, animaciones de entrada contenidas
  (`prefers-reduced-motion`), contraste AA, code-splitting.

---

# Qué debe hacer Codex primero (paquete seguro 3D.1a)

```
HelpMe — 3D.1a: unificar etiquetas de estado + badge de estado (solo UI, sin lógica)

Objetivo: cerrar P1-A y P1-D con cambios mecánicos y de bajo riesgo. Sin tocar
backend/pagos/RLS/datos ni el sistema de categorías.

Hacer:
1. Crear src/features/tasks/utils/taskStatusLabels.js con un único mapa estado→texto y
   getTaskStatusLabel(status), cubriendo: draft, open, assigned, in_progress, completed,
   closed, cancelled. Term único por estado (usar: open → "Activa", assigned → "Oferta
   pendiente", in_progress → "En curso", completed → "Completada", closed → "Cerrada",
   cancelled → "Cancelada", draft → "Borrador").
2. Reemplazar los mapas locales duplicados por getTaskStatusLabel en: TaskCard,
   TaskDetail, MyRequestCard, RequesterTaskMarker, mapMarkerIcons. No cambiar otra lógica.
3. En TaskCard: extraer el estado de la línea meta a un <span class={styles.statusBadge}>
   con fondo suave por familia, usando SOLO tokens existentes:
   - positiva (in_progress/completed) → var(--color-success-bg)/var(--color-success-text)
   - neutra (open/assigned/draft) → var(--hm-color-highlight)/var(--color-text)
   - cerrada/cancelada → var(--color-warning-bg)/var(--color-warning-text)
   Sin colores nuevos, sin rediseño de la card.

Validación:
- pnpm run lint y pnpm run build verdes.
- La misma tarea muestra el MISMO texto de estado en card, detalle y mapa.
- No hay cambios en src/services, server/, supabase/ ni en el sistema de categorías.
- git diff --check limpio.

No hacer:
- No tocar allowedCategories ni el sistema HelpMoji (eso es 3D.2).
- No desplegar todavía el acento/fondos cálidos (eso es 3D.1b, con spec aparte).
- No tocar backend/pagos/RLS/webhooks/migraciones.
- No introducir librerías UI ni cambiar el stack.
- No commit ni push: dejar el diff para revisión.
```

---

# Qué NO abrir ahora

- **No** rediseño total ni nueva librería UI (Tailwind/shadcn/CSS-in-JS): se trabaja con tokens y CSS
  existentes.
- **No** oscurecer la app ni estética IA/cripto/gaming.
- **No** tocar Supabase/RLS/Stripe/webhooks/pagos/checkout/backend.
- **No** features nuevas fuera de mejora visual/copy/jerarquía (la disponibilidad y categorías ya están).
- **No** desplegar el acento (P1-C/3D.1b) en el mismo paquete que la unificación de estados: van separados
  para mantener diffs revisables.
- **No** ampliar `allowedCategories` sin nombres/labels aprobados por el owner (va en 3D.2).
- **No** añadir hero/animaciones pesadas sin asset optimizado y `prefers-reduced-motion` (3D.3/3D.5).
- **No** reabrir Fase 3.

---

## Nota para el owner

Lo que más mueve la aguja del "se siente verde" es **P1-C** (desplegar el acento terracota y fondos
cálidos que **ya están en tokens**) y **P1-B** (que de verdad aparezcan varios HelpMoji, hoy solo se ven
3). Ninguno es rediseño: uno es CSS con tokens existentes, el otro es ampliar una lista de categorías.
Empezaría por el paquete mecánico **3D.1a** (estados unificados + badge) que es riesgo casi cero, y en
paralelo defino la mini-spec de **3D.1b** (acento/fondos) para que Codex la aplique con criterio claro.

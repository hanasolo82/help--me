# HelpMe — Fase 4 / 3D.1: estado editorial + acento cálido (spec autoritativa)

> Spec de implementación para el paquete conjunto **3D.1a (estado editorial)** + **3D.1b (acento cálido)**.
> Solo UI/CSS/copy con tokens existentes. Sin backend/pagos/RLS/Supabase/Stripe, sin categorías reales,
> sin home hero, sin imágenes, sin librerías nuevas. Diffs pequeños y revisables.
> Última revisión: 2026-06-29. Supera el patrón "StatusBadge" de `phase-4-3d-visual-review.md`.

---

# Regla visual fuerte (no negociable)

**NO status badges.** Prohibido:
- punto/círculo de color antes del estado (`● Publicada`, `🟢/🟠/🔵`);
- píldoras/chips genéricos de estado;
- semáforos visuales;
- badges decorativos sin valor informativo.

**SÍ estado editorial:** el estado se comunica como **título jerárquico + microcopy contextual humano**,
integrado en la cabecera de la card / del detalle. El color/acento es **apoyo sutil de detalle**, nunca
un punto ni un semáforo. **Verde = confianza/positivo; terracota = acción/atención.**

---

# 3D.1a — Estado editorial

## Helper central de labels (cierra P1-A)
Crear `src/features/tasks/utils/taskStatusLabels.js`:
- `getTaskStatusLabel(status)` → **título** único por estado (elimina "Activa/Publicada" duplicado):

| status | Título (label único) |
|---|---|
| `draft` | Borrador |
| `open` | Publicada |
| `assigned` | Oferta pendiente |
| `in_progress` | Tarea en curso |
| `completed` | Tarea completada |
| `closed` | Cerrada |
| `cancelled` | Cancelada |

> Decisión: `open` se unifica como **"Publicada"** (no "Activa"). Sustituye los 5 mapas locales
> (TaskCard, TaskDetail, MyRequestCard, RequesterTaskMarker, mapMarkerIcons).

## Microcopy contextual
Crear `getTaskStatusHint({ status, viewerRole, applicationCount, helperName, hasReview })` → **subtexto**
humano (string corto). Vive aparte del label porque depende de datos de la superficie:

| status | Hint (ejemplos; el helper compone según datos/rol) |
|---|---|
| `open` | `applicationCount>0` → `"${n} helpers interesados"` · si 0 → "Recibiendo ofertas de helpers" |
| `assigned` | requester → "Has elegido a {helperName}. Confirma y paga para desbloquear el chat." · helper → "Esperando a que el solicitante confirme y pague." |
| `in_progress` | "Chat disponible para coordinar los últimos detalles." |
| `completed` | sin review → "Cierre confirmado. Valora a tu helper." · con review → "Cierre confirmado." |
| `closed` | "Tarea cerrada." |
| `cancelled` | "Tarea cancelada." |
| `draft` | "Pendiente de publicar." |

- El **título** usa la tipografía/jerarquía ya existente (no negrita artificial nueva): reutilizar el
  patrón de `.task-header-status` (título) + `.task-header-turn`/`.muted` (subtexto) que ya existe en
  `styles.css`.
- En **TaskCard**: sacar el estado de la línea meta `categoría · ubicación · estado · antigüedad`
  (quitar `statusLabels[...]` de `metaItems`) y mostrarlo como **bloque de dos líneas** bajo el título:
  línea 1 = título de estado, línea 2 = hint en `--color-text-muted`. La línea meta conserva
  categoría · ubicación · antigüedad (sin el estado).
- En **TaskDetail / TaskPayment / TaskComplete**: el estado ya es textual; solo alinear al copy del helper
  para consistencia (sin badges).

---

# 3D.1b — Acento cálido (mini-spec)

## 1. Tokens exactos (existentes, no crear nuevos)
- **Acento texto:** `--accent-600` (#bd4d2d) y `--accent-700` (#943a24) → contraste AA sobre fondo claro.
- **Acento icono/línea:** `--hm-color-accent` (= `--accent-500`, #d9623b) para trazos/bordes finos.
- **Acento wash sutil (solo detalles):** `color-mix(in srgb, var(--hm-color-accent) 8%, var(--surface))`
  para una banda/hairline, **nunca** un fondo de pantalla.
- **Hairline acento:** `color-mix(in srgb, var(--hm-color-accent) 24%, var(--color-border))`.
- **Neutros cálidos de sección (si aporta jerarquía):** `--background-200` (#f8f6f1) / `--background-300`
  (#f0ebe0) / `--hm-color-secondary`. Para diferenciar bloques, **no** para teñir todo.
- **Verde de confianza (NO tocar su rol):** estados positivos siguen con `--color-success-text` /
  `--color-success-bg` / `--color-primary`.

## 2. Dónde aplicar el acento (sutil, sin fondos enteros)
- **Estado editorial:** el **título de estado es texto normal** (no coloreado). El acento entra solo en
  el *call-to-action dentro del hint* cuando hay acción pendiente — p. ej. en `assigned`, resaltar
  **"Confirma y paga"** con `--accent-700` (peso, no pill). En estados positivos (`in_progress`,
  `completed`) el énfasis es **verde**, no terracota.
- **Headers de card:** un detalle de acento de **bajo peso**: hairline superior de 2px o el `accent` del
  HelpMoji ya existente. No un fondo de cabecera de color.
- **CTA secundario:** `.secondary-action` puede tomar borde/hover en acento cálido
  (`color-mix(... --hm-color-accent 24% ...)`) en lugar del neutro. **El CTA primario sigue verde.**
- **Estados de confianza/pago:** **mantener verde** el estado positivo (pago retenido / en curso /
  completada). El terracota solo para el *prompt de acción* ("Confirma y paga"), nunca para marcar
  "ok/seguro".
- **Highlights pequeños:** eyebrows (`.eyebrow`) y divisores de sección pueden llevar acento cálido
  puntual. Links sutiles de acción secundaria, idem.

## 3. Qué NO tocar
- No píldoras/badges/puntos/semáforos de estado (regla fuerte).
- No fondos de pantalla teñidos ni cabeceras de color pleno.
- No recolorear el CTA primario (sigue verde) ni convertir verde→terracota en estados positivos.
- No tocar los colores del HelpMoji/categorías (su `accent` por categoría ya existe).
- No tocar tokens (solo consumirlos), ni `theme-live.css`.
- No home hero, no imágenes, no animaciones nuevas.
- No backend/pagos/RLS/Supabase/Stripe/categorías reales.

## 4. Antes / después (copy-visual)

**Card — antes:**
```
[MA]  Comprar medicinas                          12 EUR
      Recados · Centro · Oferta pendiente · hace 2 h
      Necesito que alguien recoja unas medicinas…
      [Ver detalle]
```

**Card — después (estado editorial + acento sutil):**
```
[🧺]  Comprar medicinas                          12 EUR
      Recados · Centro · hace 2 h

      Oferta pendiente
      Has elegido a Marta. **Confirma y paga** para desbloquear el chat.
              ────────────  ↑ "Confirma y paga" en --accent-700 (texto, sin pill)
      [Ver detalle]
```

**TaskDetail — antes:** `Estado: Oferta pendiente`

**TaskDetail — después:**
```
Tarea en curso
El chat está disponible para coordinar los últimos detalles.   ← énfasis verde (positivo)
```

(Sin punto, sin pill, sin semáforo en ningún caso.)

## 5. Criterio de validación visual
- `rg` no encuentra puntos/emoji de semáforo ni clases tipo `statusBadge`/`statusDot`/`statusPill` nuevas.
- El estado se lee como **título + microcopy**, integrado, en card y detalle.
- El acento aparece **solo** como: énfasis de texto de acción, hairline/borde fino, eyebrow, hover de CTA
  secundario. **Nunca** como relleno de estado ni fondo de sección completo.
- Estados positivos (en curso/completada/pago retenido) siguen en **verde**.
- Mismo título de estado en card, detalle y mapa (3D.1a).
- Contraste AA del texto acento (usar 600/700). Mobile sin romper. CTA primario sin cambios de color.

---

# 3D.1c — Cards más premium (SIGUIENTE paquete, no ahora)
Tras 3D.1a/b: reducir chips restantes, mejorar jerarquía y ritmo (HelpMoji + título + estado editorial +
acción). Se hace **después**, en diff separado, para mantener revisable lo de ahora.

---

# Prompt para Codex (paquete conjunto 3D.1a + 3D.1b)

```
HelpMe — 3D.1a+3D.1b: estado editorial + acento cálido (solo UI/CSS/copy, tokens existentes)

Regla fuerte: NADA de status badges. Prohibido punto de color, chip/píldora, semáforo o
emoji de estado. El estado es texto editorial (título + microcopy). El acento es apoyo
sutil, nunca un punto ni un semáforo. Verde = positivo/confianza; terracota = acción.

Hacer (3D.1a — estado editorial):
1. Crear src/features/tasks/utils/taskStatusLabels.js:
   - getTaskStatusLabel(status): draft=Borrador, open=Publicada, assigned=Oferta pendiente,
     in_progress=Tarea en curso, completed=Tarea completada, closed=Cerrada, cancelled=Cancelada.
   - getTaskStatusHint({ status, viewerRole, applicationCount, helperName, hasReview }):
     subtexto corto según la tabla de microcopy de docs/phase-4-3d1-editorial-accent-spec.md.
2. Sustituir los 5 mapas locales (TaskCard, TaskDetail, MyRequestCard, RequesterTaskMarker,
   mapMarkerIcons) por getTaskStatusLabel. Sin cambiar otra lógica.
3. En TaskCard: quitar el estado de la línea meta (queda categoría · ubicación · antigüedad)
   y mostrar bajo el título un bloque de 2 líneas: título de estado (texto normal) + hint en
   var(--color-text-muted). Reutilizar el patrón tipográfico de .task-header-status /
   .muted ya existente. SIN badge/pill/punto.
4. En TaskDetail/TaskPayment/TaskComplete: alinear el copy de estado a getTaskStatusLabel /
   getTaskStatusHint para consistencia. Sin badges.

Hacer (3D.1b — acento cálido, solo detalles):
5. Resaltar SOLO el call-to-action dentro del hint de assigned ("Confirma y paga") con
   color var(--accent-700) (énfasis de texto, no pill). En in_progress/completed el énfasis
   es verde (--color-success-text), no terracota.
6. .secondary-action: borde/hover en acento cálido
   (color-mix(in srgb, var(--hm-color-accent) 24%, var(--color-border))). El CTA primario
   (.primary-action) NO cambia (sigue verde).
7. Opcional y sutil: hairline superior de 2px en la cabecera de TaskCard con
   color-mix(in srgb, var(--hm-color-accent) 24%, var(--color-border)). Nada de fondos de color.

Validación:
- pnpm run lint y pnpm run build verdes.
- La misma tarea muestra el MISMO título de estado en card, detalle y mapa.
- rg sin clases nuevas statusBadge/statusDot/statusPill ni puntos/emoji de semáforo.
- El CTA primario conserva su color verde; estados positivos en verde.
- git diff --check limpio. Mobile sin romper.

No hacer:
- No badges/chips/puntos/semáforos de estado (regla fuerte).
- No tocar allowedCategories ni colores del HelpMoji (eso es 3D.2).
- No fondos de pantalla/cabecera teñidos; acento solo en detalles de texto/borde.
- No tocar tokens ni theme-live.css (solo consumirlos).
- No home hero, imágenes, animaciones nuevas, ni librerías UI.
- No tocar backend/pagos/RLS/Supabase/Stripe/migraciones.
- No 3D.1c (reestructura de cards) en este diff.
- No commit ni push: dejar el diff para revisión.
```

# HelpMe — Fase 4 / Bloque 3: dirección visual, actividades y disponibilidad

> Subir la calidad percibida antes de beta cerrada: menos monocromía verde, lenguaje de actividades con
> iconos propios (no siglas), y una forma simple de indicar día/franja horaria. La app ya funciona a
> nivel sistema; esto es la capa de claridad y confianza visual.
> Última revisión: 2026-06-28. Skills aplicadas: responsive-web-design, vercel-react-best-practices.
> Conceptos frontend-skill / imagegen aplicados como criterio (no instalados en este entorno: los assets
> los genera el owner con la guía de §6).
> Hermanos: [`phase-4-ux-audit.md`](./phase-4-ux-audit.md), [`phase-4-beta-plan.md`](./phase-4-beta-plan.md).

---

## 0. Alcance y hallazgo clave

**Hallazgo que cambia el enfoque:** el sistema de tokens **ya define un acento terracota**
(`--hm-color-accent: #d9623b`) y escalas completas `--accent-*`, `--background-*`, `--text-*`. El
problema no es que falte paleta: es que **casi toda la UI usa solo el verde primario** y deja el acento
sin desplegar. Por tanto "menos monocroma" = **usar tokens existentes**, no rediseñar ni inventar colores.
Esto baja muchísimo el riesgo.

**Este bloque toca:** CSS/tokens (uso del acento), un set de iconos SVG de categoría, y una feature
acotada de disponibilidad (día/franja). **No toca:** pagos, RLS, webhooks, ni abre features grandes fuera
de disponibilidad. La disponibilidad añade **columnas nullable** a `tasks`/`task_applications` (aditivo,
sin alterar políticas RLS existentes — ver §5 y el checkpoint de GRANT).

**Plan por capas (acordado con owner):** (1) inventario categorías → (2) estilo de iconos → (3) MVP
fecha/franja → (4) aplicar en mapa/cards/detalle → (5) imágenes/animaciones en Home/onboarding.

---

## 1. Auditoría visual de páginas principales

| Página | Problema visible | Causa en código |
|---|---|---|
| **Home / HelperHome** | Domina el verde; poca diferenciación entre secciones; sin imágenes de contexto | Uso casi exclusivo de `--color-primary`; acento sin usar |
| **OfferHelp map** | Marcadores con **siglas de 2 letras** ("MA", "RE") poco atractivos y poco claros | `getCategoryCode()` en [mapMarkerIcons.js:30](src/shared/ui/map/mapMarkerIcons.js#L30) |
| **OfferHelp list/modal** | Cards sin icono de actividad; categoría como texto plano en línea meta | `TaskCard` line meta `categoría · ubicación · estado` |
| **TaskDetail** | Sólido pero plano; sin imagen de actividad cuando la tarea no trae foto; sin día/hora | — |
| **Task creation** | No se puede indicar **cuándo** se necesita la ayuda | `CreateTask` no tiene campo de fecha/franja |
| **Payment / StripeReturn** | Bien (ya auditado); coherente y tranquilizador | — |
| **TaskComplete** | Bien; correcto | — |
| **Chat** | Funcional; neutro | Dos composers conviven (deuda P2 previa) |
| **Legal / Profile** | Profile usa iniciales como avatar fallback (aceptable); Legal con placeholders (P0 previo) | — |

**Confirmación de los 5 dolores del owner:** (1) monocromía verde ✓ por infrautilización del acento;
(2) faltan visuales de actividad ✓; (3) sin día/franja ✓ (requester y helper); (4) etiquetas de mapa con
siglas ✓; (5) cards sin icono propio ✓.

---

## 2. Propuesta de dirección visual

Principio: **sistema cálido de comunidad**, verde como **acento de confianza**, terracota como **energía
de acción**, neutros cálidos como lienzo. Todo con tokens ya existentes.

1. **Paleta menos monocroma (sin tocar la marca):**
   - Verde primario → reservado a confianza/estado positivo y CTA principal (no a todo).
   - Terracota `--accent-500` → acentos de actividad, badges, microdetalles, hover de acción secundaria.
   - Neutros cálidos `--background-100..400` → fondos de sección para crear jerarquía por bloques (hoy
     casi todo es el mismo crema).
   - **Color por categoría** (4+1): cada actividad tiene un tinte suave de fondo de icono (ver §3),
     derivado con `color-mix` de tokens — sin colores nuevos crudos.
2. **Jerarquía clara:** secciones con fondo alterno (lienzo vs `--background-200/300`), títulos serif ya
   definidos (Lora), y un único CTA primario por vista. Reducir el "todo verde compite".
3. **Imágenes/visuales de actividad:** ilustración/icono por categoría (no fotos genéricas oscuras).
   Hero de Home con una ilustración cálida de comunidad (1 asset, optimizado). Sin stock irrelevante.
4. **Animación profesional y contenida** (respeta `prefers-reduced-motion`):
   - Entradas sutiles de cards (fade/translate 8px, 180ms) usando `--motion-*` ya definidos.
   - Hover de card y marcador con elevación suave (ya hay patrón `.primary-action:hover`).
   - **Regla de rendimiento (Vercel `rendering-animate-svg-wrapper`):** animar el `div` contenedor, no
     el SVG. Nada de animaciones de layout pesadas. Sin videos en esta fase.

---

## 3. Sistema de actividades (categorías + iconos)

### 3.1 Lista inicial de categorías
La fuente real es `allowedCategories` en [tasksService.js:10](src/services/tasksService.js#L10):
**Mascotas · Recados · Compras · Ayuda técnica**, más fallback **Ayuda general**.

Propuesta de set inicial (5), preparado para crecer:

| key | Etiqueta | Icono (concepto) | Tinte de fondo |
|---|---|---|---|
| `mascotas` | Mascotas | huella / correa | verde suave |
| `recados` | Recados | bolsa+flecha / sobre | terracota suave |
| `compras` | Compras | carrito / cesta | ámbar suave |
| `ayuda_tecnica` | Ayuda técnica | llave+tuerca / portátil | azul-verde suave |
| `general` *(fallback)* | Ayuda general | manos/corazón | neutro cálido |

### 3.2 Estilo de iconos propios
- **Formato:** SVG outline duotono, stroke 1.75–2px, esquinas redondeadas, viewBox 24×24, **sin texto**.
- **Estética:** cálida, amable, coherente con Lora+DM Sans; nada corporativo frío ni oscuro.
- **Entrega técnica (Vercel `bundle-barrel-imports` / `bundle-analyzable-paths`):** un **sprite SVG** o
  imports directos `assets/icons/categories/<key>.svg` mapeados en un único módulo
  `categoryVisuals.js` → `{ icon, tintBg, label }`. Nada de barrel ni imports dinámicos por categoría.
- **`rendering-svg-precision`:** coordenadas con 1–2 decimales para SVG ligeros.

### 3.3 Fallback
`getCategoryVisual(category)` normaliza (trim/lowercase/acentos) y devuelve el visual de `general` si no
hay match. Un único punto de verdad; nunca más siglas.

### 3.4 Uso consistente
Mismo `getCategoryVisual` en: **marcador de mapa** (icono en vez de siglas, conservando el precio),
**TaskCard** (icono + etiqueta, no texto suelto), **modales** (TaskPreview/HelperPreview), **TaskDetail**
(cabecera con icono de actividad), y chips de filtro. Sustituye `getCategoryCode()` de mapMarkerIcons.

---

## 4. Disponibilidad (MVP, sin calendario complejo)

Reutiliza el lenguaje del sistema de disponibilidad de helper ya existente
(`profile_availability`, día de semana) pero aplicado a la tarea, **simple**.

### 4.1 Modelo (aditivo, nullable)
- **`tasks`**: `preferred_date date NULL` + `time_window text NULL` con enum lógico
  `manana | tarde | noche | flexible`. Nullable → tareas existentes y "cuando sea" siguen válidas.
- **`task_applications`**: `proposed_time_window text NULL` (el helper confirma el del requester o
  propone otra franja). MVP: misma enum; sin negociación compleja.

> **Checkpoint (no asumir):** confirmar que el owner de la tarea puede escribir esas columnas con las
> políticas/GRANTs actuales de `tasks`. Fase 3 añadió guards de columna en `profiles`, **no** en `tasks`.
> La migración debe ser **solo aditiva** (ADD COLUMN nullable) y **no** modificar políticas RLS. Si hay
> column-GRANT restrictivo, añadir GRANT de esas dos columnas al rol del dueño — y eso se revisa aparte,
> no en este bloque.

### 4.2 Flujo
- **Requester (al crear):** un selector de día (date input nativo, o "Hoy/Mañana/Esta semana/Flexible") +
  franja (4 chips: Mañana/Tarde/Noche/Flexible). Opcional → si no elige, "Flexible".
- **Helper (al ofrecerse):** ve la preferencia del requester y un toggle "Me viene bien" / "Proponer otra
  franja" (4 chips). Guarda `proposed_time_window`.
- **Visible en:** chip compacto en TaskCard y marcador ("📅 Sáb · Tarde"), bloque en TaskDetail, y en la
  candidatura del helper que ve el requester.

### 4.3 Por qué MVP
Sin calendario, sin slots por hora, sin disponibilidad recurrente de tarea. Solo fecha opcional + franja
enum. Cubre el 90% del valor ("¿cuándo lo necesitas?") con coste mínimo y cero riesgo financiero.

---

## 5. Lista de assets necesarios

> No instalados aquí imagegen/frontend-skill: el owner genera estos assets con esta guía (estilo §2/§3).
> Restricción respetada: nada genérico/oscuro, nada pesado.

| Asset | Formato | Notas |
|---|---|---|
| 5 iconos de categoría (mascotas, recados, compras, ayuda_técnica, general) | SVG 24×24 outline duotono | sprite o imports directos; <3 KB c/u |
| Ilustración hero de Home | SVG o PNG/WebP optimizado | comunidad cálida; 1 sola, lazy (`loading="lazy"`) |
| (Opcional) ilustración vacío/empty-state | SVG | reaprovecha estilo de iconos |
| (Later) micro-ilustración onboarding por paso | SVG | fase 5, no beta |

**Regla de peso (Vercel `bundle-*`):** SVG inline/sprite para iconos; imágenes raster solo WebP
optimizado y `loading="lazy"`; **sin video** en beta. Total añadido objetivo < ~60 KB.

---

## 6. Plan de implementación por pasos

Sigue el orden recomendado por el owner. Cada paso es entregable y reversible; `lint`/`build` verdes y
**mobile-first** (responsive-web-design) en cada uno.

1. **Paso 1 — Inventario + módulo de categorías (sin assets).**
   Crear `src/features/tasks/categories/categoryVisuals.js` con `getCategoryVisual()` (label, tint, icon
   placeholder) y `taskStatusLabels` unificado (cierra P1.1 de la auditoría previa). Sin tocar visuales
   todavía. *Riesgo: muy bajo.*
2. **Paso 2 — Iconos de categoría.** Owner entrega los 5 SVG; conectar al módulo. Reemplazar siglas en
   mapa (`getCategoryCode` → icono) y mostrar icono en TaskCard/modales/detalle. *Riesgo: bajo.*
3. **Paso 3 — MVP disponibilidad.** Migración aditiva (tras checkpoint §4.1), UI de día/franja en
   CreateTask y en el "ofrecerme" del helper, render del chip en cards/detalle. *Riesgo: medio (DB).*
4. **Paso 4 — Despliegue de paleta/jerarquía.** Introducir acento terracota y fondos de sección alternos
   con tokens existentes; un CTA primario por vista. Animaciones contenidas con `--motion-*` +
   `prefers-reduced-motion`. *Riesgo: bajo-medio (CSS).*
5. **Paso 5 — Imágenes/animación Home + onboarding.** Hero ilustrado lazy, entradas sutiles de sección.
   *Riesgo: bajo; fuera de la ruta crítica de beta.*

---

## 7. Clasificación de cambios

| Clase | Cambio | Antes de beta cerrada |
|---|---|---|
| **P0** (comprensión/flujo roto) | *Ninguno nuevo aquí.* (El P0 legal sigue en el plan beta.) | — |
| **P1** (necesario) | Iconos de categoría en mapa/cards (Pasos 1-2) · MVP disponibilidad día/franja (Paso 3) · unificar `taskStatusLabels` | **Sí** (recomendado) |
| **P2** (polish) | Paleta/jerarquía con acento (Paso 4) · hero ilustrado de Home · animaciones de entrada | Deseable, no bloquea |
| **Later** | Videos, animaciones complejas, micro-ilustraciones de onboarding, negociación de disponibilidad avanzada, rediseño total | No |

---

## 8. Qué hacer antes de beta cerrada

- **Hacer (P1):** Pasos 1–3 — módulo de categorías + `taskStatusLabels` unificado, iconos en
  mapa/cards/detalle, y MVP de disponibilidad (día/franja) en requester y helper. Esto ataca
  directamente los 5 dolores del owner y sube la calidad percibida sin riesgo financiero.
- **Deseable (P2):** Paso 4 (acento + jerarquía) si hay tiempo; mejora mucho la sensación "no tan verde"
  con cambio solo de CSS.
- **Aplazar (Later):** Paso 5 imágenes/animación avanzada y todo lo de la fila Later.
- **Bloqueante real previo:** el P0 legal de la auditoría anterior (identidad del responsable) sigue
  siendo lo único que bloquea externos; este bloque no lo cambia.

**Veredicto:** con Pasos 1–3 (P1) la beta cerrada deja de "sentirse verde y genérica". Recomiendo
empezar por el **Paso 1** (módulo de categorías + etiquetas unificadas), que no necesita ningún asset y
ya prepara el terreno. ¿Lo arranco?

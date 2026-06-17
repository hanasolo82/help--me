# HelpMe - Mapa de migracion visual por fases

Fuente base:
- Auditoria de deuda visual ya realizada en el codigo.
- Guia Figma en [output/helpme-figma-style-guide.md](C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/output/helpme-figma-style-guide.md)

Estado:
- Documento de planificacion.
- Sin cambios de codigo.
- Sin refactors.
- Sin redisenar pantallas todavia.

## 1. Resumen ejecutivo

La app no esta aplicando el sistema Figma de forma consistente porque la arquitectura visual sigue dividida entre tokens nuevos y capas heredadas que siguen mandando sobre el resultado final.

Lo que esta pasando en la practica:
- `design-tokens.css` existe y entra globalmente, pero no es la unica fuente de verdad.
- `styles.css` sigue cargando despues y conserva shells, botones y paneles legacy que pisan el sistema nuevo.
- Hay CSS modules con mucha especificidad, `!important`, `:global(...)` y overrides locales que reintroducen estilos antiguos.
- Hay colores hardcoded, sombras y radios locales que vuelven a fragmentar el lenguaje visual.
- Hay componentes duplicados o familias dispersas que compiten entre si en vez de compartir una base comun.

Por eso los cambios anteriores se sienten superficiales:
- se han retocado pantallas concretas sin normalizar la base visual;
- cada pantalla sigue resolviendo su propia version de botones, cards, paneles y shells;
- el sistema Figma queda como referencia parcial, no como sistema dominante.

La estrategia correcta no es seguir parcheando pantalla por pantalla.
Primero hay que imponer una base visual unica y solo despues migrar las pantallas criticas sobre esa base.

## 2. Principio de migracion

```text
No redisenar pantallas antes de normalizar la arquitectura visual base.

Orden obligatorio:

Tokens
Button
Card / Panel
PageShell
Task components
Payment components
Home Map
Profile / Settings / Landing
Limpieza CSS heredado
```

Regla operativa:
- Si una pantalla sigue necesitando `primary-action`, `detail-panel`, `app-screen` o `!important`, todavia no esta lista para recibir rediseño fino.
- Cada fase debe reducir dependencia heredada antes de abrir la siguiente.
- StripeReturn sirve como referencia de limpieza relativa, no como destino estetico completo.

## 3. Matriz de dependencias

| Fase | Depende de | Archivos afectados | Riesgo | Resultado esperado |
|---|---|---|---|---|
| Fase 1 Tokens | ninguna | `src/styles/design-tokens.css`, `src/styles/globals.css`, `src/styles.css`, `src/shared/theme/themePreferences.js` | alto | todos los tokens Figma quedan disponibles globalmente sin romper la app |
| Fase 2 Button | Fase 1 | `primary-action`, `secondary-action`, `success-action`, `danger-action`, `icon-button`, `GlitchSoftButton`, `RippleButton`, auth buttons, action buttons de pantallas criticas | alto | un unico lenguaje visual para CTAs |
| Fase 3 Card / Panel | Fase 1 y 2 | task cards, helper cards, summaries, modals, drawers, profile cards, payment cards | alto | superficies consistentes y reutilizables |
| Fase 4 PageShell | Fase 1 a 3 | Home, TaskDetail, TaskPayment, StripeReturn, Profile, Settings, Landing, Chat | muy alto | layout base comun y predecible |
| Fase 5 Task components | Fase 1 a 4 | TaskDetail, TaskCard, decision gate, helper list, summary blocks | muy alto | el flujo de tarea deja de depender de shells legacy |
| Fase 6 Payment components | Fase 1 a 4 | TaskPaymentPage, CostSummary, premium secondary option, StripeReturn | muy alto | pago y retorno quedan alineados con el sistema Figma |
| Fase 7 Home Map | Fase 1 a 4 | Home.module.css, RequesterHome, HelperHome, HelpersMap, NearbyHelpersFeed, TaskFeed, drawers, cards de mapa | muy alto | mapa y home comparten estructura estable |
| Fase 8 Profile / Settings / Landing | Fase 1 a 4 | Profile, Settings, Landing, AuthModal | alto | pantallas custom quedan normalizadas sobre la base comun |
| Fase 9 Limpieza heredada | Fase 1 a 8 completadas | `styles.css`, wrappers, clases antiguas, hardcodes, inline styles, `!important` | alto | deuda visual eliminada o reducida a lo minimo |

## 4. Fase 1 - Tokens globales

Objetivo:
- convertir `design-tokens.css` en la base unica del sistema visual;
- mantener compatibilidad temporal con `styles.css` mientras se migran consumidores;
- evitar que el producto se rompa por una retirada prematura de alias o variables legacy.

### Tokens Figma que deben existir

- `background` crema
- `text` principal
- `surface` blanca
- `primary` verde
- `secondary` beige
- `muted`
- `accent` coral
- `destructive`
- `radius`
- `shadow`
- `spacing`
- `typography` Lora / DM Sans

### Tokens recomendados como fuente de verdad

Mantener y consolidar estos grupos:
- color base: `--hm-color-bg`, `--hm-color-text`, `--hm-color-surface`, `--hm-color-primary`, `--hm-color-secondary`, `--hm-color-muted`, `--hm-color-accent`, `--hm-color-danger`
- semanticos: `--color-bg`, `--color-text`, `--color-surface`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-border`, `--color-success`, `--color-warning`, `--color-danger`
- tipografia: `--hm-font-serif`, `--hm-font-sans`, `--font-heading`, `--font-body`
- spacing: `--hm-space-*` y `--space-*`
- radius: `--hm-radius-*` y `--radius-*`
- shadows: `--hm-shadow-*` y `--shadow-*`
- z-index: `--hm-z-*`

### Tokens viejos que se deben mapear temporalmente

No borrar todavia, solo redirigir:
- `--bg`
- `--surface`
- `--text`
- `--accent`
- `--highlight`
- `--shadow`
- `--nav-*`
- `--task-card-*`
- `--app-background`
- `--app-border`

### Que no se debe borrar todavia

- `src/styles.css`
- aliases viejos consumidos por componentes y pantallas
- fallback de tema en `themePreferences.js`
- reglas que sostienen modales, inputs y shells existentes hasta que haya reemplazo

### Como convivir con `styles.css`

- `design-tokens.css` debe ser la capa semantica canonica.
- `styles.css` solo puede sobrevivir como capa de compatibilidad temporal.
- Cualquier variable legacy debe apuntar a tokens nuevos, no a valores nuevos aislados.
- No introducir nuevos valores fijos en `styles.css` si existe token equivalente.

### Como evitar romper medio producto

- No eliminar variables legacy hasta que todos los consumidores activos las usen desde la nueva base.
- No tocar `themePreferences.js` sin mapear a los nuevos tokens semanticos.
- No convertir una pantalla critica al nuevo sistema si sigue dependiendo de `!important` o `:global(...)`.

## 5. Fase 2 - Button system

Objetivo:
- eliminar la fragmentacion entre botones globales, buttons tematicos y wrappers duplicados;
- dejar un solo lenguaje visual para CTAs y acciones.

Componentes y clases a auditar:
- `primary-action`
- `secondary-action`
- `success-action`
- `danger-action`
- `icon-button`
- `GlitchSoftButton`
- `RippleButton`

### Decision de conservacion

- `primary-action`: conservar como base temporal, pero migrar a un Button canonical unico.
- `secondary-action`: conservar solo hasta que el Button base tenga variante secundaria estable.
- `success-action`: conservar como variante semantica, no como componente aislado.
- `danger-action`: conservar como variante semantica, con validacion de accion destructiva real.
- `icon-button`: conservar como variante de Button, no como sistema paralelo.
- `GlitchSoftButton`: deprecar si solo cubre una expresion estetica local.
- `RippleButton`: deprecar si no aporta una necesidad funcional unica.

### Como migrar sin romper pantallas

- primero crear o consolidar una API de Button unica con variantes claras;
- luego reemplazar consumo por consumo en pantallas criticas;
- mantener aliases CSS mientras conviven ambos sistemas;
- no cambiar la aparencia de todos los botones a la vez si aun dependen de `styles.css`.

### Resultado esperado

- un solo sistema de CTAs;
- un solo foco visual por pantalla;
- variantes consistentes para primary, secondary, ghost, danger, icon y loading.

## 6. Fase 3 - Card / Panel system

Objetivo:
- unificar superficies y bloques contenedores;
- eliminar variaciones antiguas que compiten con el sistema Figma.

Areas a normalizar:
- task cards
- helper cards
- cost summary
- payment summary
- profile cards
- modal panels
- drawer panels

### Base recomendada

- `card-base`
- `panel-base`
- `subtle-panel`
- `elevated-panel`
- `interactive-card`

### Reglas

- cards normales: superficie blanca, borde suave, sombra baja;
- paneles de decision/pago: superficie clara, jerarquia mas fuerte;
- drawers y modales: misma familia de superficie, mayor elevacion;
- no mezclar sombras nuevas con sombras legacy en la misma familia.

### Resultado esperado

- cualquier bloque que parezca card o panel comparte la misma base visual;
- las pantallas dejan de parecer una suma de componentes historicos.

## 7. Fase 4 - PageShell

Objetivo:
- definir un patron de layout comun para que la app deje de sentirse distinta en cada pantalla.

Pantallas objetivo:
- TaskDetail
- TaskPayment
- StripeReturn
- Profile
- Settings
- Landing
- Home

### Debe resolver

- fondo
- max width
- grid
- header spacing
- mobile layout
- CTA sticky mobile si aplica

### Reglas de shell

- un solo contenedor de pagina por familia de pantallas;
- el header no debe reinventarse por pantalla;
- el mobile spacing debe reservar espacio para CTA sticky cuando exista;
- no usar shells aislados de `styles.css` como solucion final.

### Resultado esperado

- la app se ve coherente incluso antes de repasar cada card;
- los cambios visuales de una pantalla no contaminan a las demas.

## 8. Fase 5 - Task components

Objetivo:
- normalizar el flujo de tareas sin tocar logica de workflow.

Componentes y areas:
- TaskDetail
- helpers interesados
- offer pending / decision gate
- task summary
- helper list
- state header

### Regla importante

No tocar logica del workflow.
Solo cambiar estructura visual, dependencias de shell y primitivas de UI.

### Orden interno recomendado

1. PageShell.
2. StateHeader.
3. TaskSummary.
4. HelperCard / helper list.
5. Decision gate.
6. Application list.

### Resultado esperado

- TaskDetail deja de depender del CSS global para verse estable;
- el flujo de decision, oferta y confirmacion usa una jerarquia visual unica.

## 9. Fase 6 - Payment components

Objetivo:
- consolidar la experiencia de pago y retorno como una ruta visual clara y confiable.

Componentes y pantallas:
- TaskPaymentPage
- `TaskPaymentPage.module.css`
- premium secondary option
- CostSummary
- StripeReturn

### Estrategia

- StripeReturn es la referencia de pantalla mas limpia.
- Payment debe alinearse con esa limpieza, no con los modales legacy.
- El estado de carga, confirmacion y fallback debe ser claro sin introducir tecnicismos visuales.

### Resultado esperado

- un solo lenguaje visual para coste, confirmacion, estado pendiente y retorno;
- el pago principal queda por encima de Premium;
- la ruta Stripe no compite con el resto del sistema.

## 10. Fase 7 - Home Map

Objetivo:
- normalizar el mapa y sus paneles sin romper marcadores, layout ni navegacion.

Areas:
- Home.module.css
- RequesterHome
- HelperHome
- HelpersMap
- NearbyHelpersFeed
- TaskFeed
- map cards
- drawers

### Especial cuidado

- no romper mapa;
- no romper layout;
- no romper markers;
- no reintroducir shells paralelos.

### Estrategia

- primero estabilizar PageShell y Card/Panel;
- luego migrar wrappers del mapa;
- despues unificar cards, drawers y previews;
- por ultimo limpiar estilos que solo existian para este espacio.

### Resultado esperado

- Home y el mapa comparten base visual con el resto de la app;
- requester y helper dejan de parecer dos productos diferentes.

## 11. Fase 8 - Profile / Settings / Landing

Objetivo:
- migrar pantallas grandes y custom cuando la base ya este lista.

Pantallas:
- Settings
- Profile
- Landing
- AuthModal

### Regla de orden

No migrarlas antes de:
- Tokens
- Button
- Cards / Panels
- PageShell

### Resultado esperado

- pantallas complejas se adaptan al sistema Figma sin construir un sistema paralelo;
- AuthModal deja de imponer excepciones locales.

## 12. Fase 9 - Eliminar deuda heredada

Objetivo:
- retirar lo que ya fue sustituido por la nueva base visual.

Se puede eliminar al final:
- CSS no usado
- wrapper duplicado de TaskCard
- clases antiguas
- hardcodes sustituidos
- inline styles migrados
- `!important` retirados

### Regla de cierre

Solo borrar cuando:
- el consumidor ya usa la base nueva;
- no queda dependencia activa en `styles.css` o en overrides locales;
- la pantalla pasa QA visual en desktop y mobile.

## 13. Tabla de archivos por prioridad

| Prioridad | Archivo | Motivo | Accion | Fase |
|---|---|---|---|---|
| Critical | `src/styles.css` | shell legacy global que pisa la base visual | conservar temporalmente y luego reducir/eliminar | 1, 4, 9 |
| Critical | `src/shared/theme/themePreferences.js` | fuente de tema con colores y tokens propios | mapear a tokens nuevos | 1 |
| Critical | `src/pages/TaskDetail/TaskDetail.jsx` | pantalla mas contaminada por clases globales | reemplazar por shell y primitives nuevas | 4, 5 |
| Critical | `src/pages/TaskPayment/TaskPaymentPage.jsx` | depende de botones y overrides globales | migrar a sistema de payment | 4, 6 |
| Critical | `src/pages/Home/Home.module.css` | mezcla layout propio con overrides globales | normalizar shell y home map | 4, 7 |
| High | `src/shared/components/AuthModal/AuthModal.module.css` | `!important` y overrides del panel auth | reemplazar por modal base | 2, 3, 8 |
| High | `src/features/helper-home/styles/helperHome.module.css` | `!important` y override de task cards | reemplazar por card base | 3, 7 |
| High | `src/pages/Settings/SettingsPage.module.css` | gran cantidad de hardcodes y estilos propios | migrar a PageShell + tokens | 1, 4, 8 |
| High | `src/features/profile/styles/profilePublicView.module.css` | pantalla custom con sombras y colores locales | migrar a PageShell + cards | 3, 4, 8 |
| High | `src/pages/Landing/Landing.module.css` | sistema propio de CTAs y surfaces | normalizar button/card/shell | 2, 3, 8 |
| High | `src/components/home/TaskCard.jsx` | wrapper duplicado sin valor adicional | eliminar wrapper | 9 |
| High | `src/features/tasks/components/TaskCard/TaskCard.jsx` | card canonica pero con tokens locales | convertir a card base unica | 3, 5, 7 |
| Medium | `src/features/home/need-help/components/HelperCard.jsx` | usa acciones legacy y card local | migrar a button/card base | 2, 3, 7 |
| Medium | `src/features/home/need-help/components/MyRequestCard.jsx` | depende de acciones legacy | migrar a button/card base | 2, 3, 7 |
| Medium | `src/features/chat/pages/ChatPage.jsx` | inline spacing y shell global | migrar a PageShell y layout chat limpio | 4 |
| Medium | `src/pages/Stripe/StripePage.module.css` | referencia limpia para payment/return | conservar como baseline | 6 |
| Low | `src/shared/ui/chat/*` | mayormente tokenizado, con pocos ajustes locales | conservar y limpiar al final | 9 |

## 14. Riesgos tecnicos

- Borrar `styles.css` demasiado pronto romperia media app.
- Tocar `themePreferences.js` sin mapear consumidores rompe el tema.
- Quitar `!important` sin una base nueva puede romper layout.
- Cambiar `primary-action` sin estrategia rompe Home, Detail y Payment a la vez.
- Redisenar pantalla por pantalla perpetua la mezcla visual.
- Mantener wrappers duplicados de botones o cards hace que Figma nunca sea dominante.

## 15. Plan de implementacion posterior

Prompts recomendados para ejecutar luego, en este orden:

```text
Prompt A: aplica solo Tokens globales. No toques componentes ni pantallas.
Prompt B: normaliza Buttons y elimina duplicados de acciones.
Prompt C: normaliza Cards / Panels.
Prompt D: introduce PageShell comun.
Prompt E: migra TaskDetail.
Prompt F: migra Payment.
Prompt G: migra Home Map.
Prompt H: limpia CSS heredado no usado.
```

## 16. Dependencias principales a vigilar

- `design-tokens.css` debe ser la base antes de cualquier rediseño.
- `styles.css` no debe seguir creciendo.
- `primary-action` y `secondary-action` deben dejar de ser la API final.
- `TaskCard` debe tener una unica implementacion canonica.
- `TaskPayment` y `TaskDetail` no deben migrarse antes de PageShell y Button.
- `Home Map` no debe migrarse antes de Card, Panel y PageShell.

## 17. Primer paso recomendado

Aplicar **Fase 1 - Tokens globales**.

## 18. Que NO debe hacerse todavia

- No implementar rediseno pantalla por pantalla.
- No tocar backend, Supabase, Stripe ni rutas.
- No borrar `styles.css` sin una migracion de consumidores.
- No eliminar `themePreferences.js` sin sustituir sus consumidores.
- No seguir parchando estilos locales.
- No introducir librerias nuevas.
- No cambiar logica de workflow.
- No ejecutar refactors visuales aislados fuera del orden de fases.

---

Archivo creado: `output/helpme-style-migration-map.md`

Siguiente instruccion recomendada:

```text
Aplica Fase 1 - Tokens globales. No toques componentes ni pantallas.
```

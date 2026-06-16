# HelpMe Figma Style Guide

Fuente auditada: Figma `helpme-styles`
File key: `o8s9He8f3Kk2h2A0WTNjcm`
Pagina principal detectada: `styles`

Estado de extraccion: documentacion visual, sin cambios de codigo.

## Nodos/secciones inspeccionadas

| Area | Nodos / frames inspeccionados | Resultado |
|---|---|---|
| Foundations | `1:3`, `1:26`, `1:102`, `1:119`, `1:122`, `1:123` | Colores, tipografia, estados, sombras, layout base |
| Componentes | `1:258`, `1:265`, `1:306`, `1:343`, `1:375`, `1:434`, `1:500`, `1:562`, `1:615`, `1:703` | Botones, inputs, headers, helper cards, task summary, cost summary, decision block, modal, drawer, chat, review |
| Page shells | `1:2667`, `1:2773`, `1:2878`, `1:3208`, `1:3318`, `1:3501`, `1:3683`, `1:3825` | Pantallas desktop/mobile de tarea publicada, helpers interesados, lista de helpers y oferta pendiente |
| Payment / Stripe | `1:3965`, `1:4352`, `1:4480`, `1:4688` | Confirmar pago, Stripe externo, retorno de pago recibido |
| Chat / cierre / review | `1:5100`, `1:5248`, `1:5395`, `1:5503`, `1:5610`, `1:5738`, `1:5865`, `1:5974` | Chat desbloqueado, cerrar tarea, valorar helper y pantalla de gracias |
| Pricing / Premium | `5:25`, textos de `Premium/Pricing` detectados en componentes | Toggle mensual/anual, badge descuento, Premium como accion secundaria |
| Mobile frames | frames de ancho `330`, `338`, `340`, `344`, `345`, `346`, `369` | Mobile modelado como composiciones separadas con CTA full-width/sticky |

## Limitaciones de extraccion

- El archivo no contiene variables locales Figma publicadas: `variableCollections: []`.
- El archivo no contiene estilos locales publicados de texto, pintura o efectos: `textStyles: []`, `paintStyles: []`, `effectStyles: []`.
- Los tokens existen como documentacion visual dentro de frames, no como Figma Variables consumibles directamente.
- Algunos nodos enormes, especialmente `0:1` / pagina completa, devuelven demasiada informacion. La extraccion se hizo por lotes compactos.
- `get_variable_defs` pidio una capa seleccionada en Figma Desktop, asi que los valores de variables reales no pudieron obtenerse por esa via.
- Los nodos son frames de especificacion visual, no componentes Figma publicados con variants formales.
- El codigo generado por Figma puede servir como referencia de medidas, pero no debe pegarse directamente en React.

## 1. Direccion visual

HelpMe debe sentirse como un marketplace local, humano y fiable. La direccion visual detectada combina fondo calido, superficies limpias, tipografia editorial y acciones claras.

Personalidad visual:

- Cercana, vecinal y util.
- Editorial y cuidada, no corporativa fria.
- Suficientemente premium para transmitir confianza en pagos y helpers.
- Sencilla en jerarquia: una decision importante por pantalla.
- Calida por color y textura, no por decoracion excesiva.

Debe transmitir:

- "Estoy contratando ayuda local de confianza".
- "Entiendo que paso sigue".
- "El pago esta protegido".
- "La app no me empuja a rutas laterales en momentos criticos".

No debe parecer:

- SaaS generico azul/blanco.
- Dashboard frio de administracion.
- Marketplace anonimo lleno de badges y ruido.
- App experimental con CTAs compitiendo entre si.
- Interfaz glass/gradiente mezclada con el nuevo sistema calido.

## 2. Color tokens

### Tokens detectados

| Figma | HEX | Uso recomendado | CSS recomendado |
|---|---|---|---|
| Background | `#F8F6F1` | Fondo global de app y shells | `--hm-color-bg` |
| Foreground | `#1C1916` | Texto principal, bordes fuertes, header negro | `--hm-color-text` |
| Card | `#FFFFFF` | Tarjetas, modales, summaries, drawer surfaces | `--hm-color-surface` |
| Primary | `#1F6B48` | CTA principal, precio total, marca funcional | `--hm-color-primary` |
| Secondary | `#F0EBE0` | Inputs, botones secundarios, superficies sutiles | `--hm-color-secondary` |
| Muted Fg | `#6E6860` | Texto secundario, metadata, captions, estado textual | `--hm-color-muted` |
| Accent | `#D9623B` | Enfasis puntual, avisos no destructivos | `--hm-color-accent` |
| Destructive | `#C0392B` | Eliminar, peligro, rechazo destructivo confirmado | `--hm-color-danger` |

### Colores detectados adicionales

| HEX | Uso observado | CSS recomendado |
|---|---|---|
| `#EAE6DD` | Borde/superficie sutil detectada | `--hm-color-border-subtle` |
| `#FEF3C7` | Fondo warning suave | `--hm-color-warning-bg` |
| `#92400E` | Texto warning | `--hm-color-warning-text` |
| `#D1FAE5` | Fondo success suave | `--hm-color-success-bg` |
| `#065F46` | Texto success fuerte | `--hm-color-success-text` |
| `#DCFCE7` | Fondo success alternativo | `--hm-color-success-soft` |
| `#14532D` | Texto success alternativo | `--hm-color-success-strong` |
| `#F3F4F6` | Fondo neutral frio puntual | `--hm-color-neutral-bg` |
| `#374151` | Texto neutral frio puntual | `--hm-color-neutral-text` |
| `#5B6EA6` | Avatar/helper alternativo | `--hm-color-avatar-blue` |
| `#A0622A` | Avatar/helper alternativo | `--hm-color-avatar-brown` |
| `#2D7A55` | Verde hover/variant detectado | `--hm-color-primary-hover` |
| `#3A8A63` | Verde progresivo/variant detectado | `--hm-color-primary-600` |
| `#4A9A72` | Verde progresivo/variant detectado | `--hm-color-primary-500` |

### Reglas de color

- Usar `Primary` solo para la accion principal de la pantalla.
- Usar `Secondary` para botones secundarios, inputs y bloques suaves.
- Usar `Muted Fg` para metadatos, estado textual y copy de apoyo.
- Usar `Destructive` solo cuando la accion cambie estado de forma peligrosa o irreversible.
- Evitar badges de color saturado para estados.
- Evitar introducir nuevos azules salvo avatares o elementos ya existentes de Figma.

## 3. Typography tokens

### Tokens detectados

| Token | Font | Weight | Size | Line-height recomendado | Uso | CSS recomendado |
|---|---|---:|---:|---:|---|---|
| Display | Lora | 600 | `24px` | `30px` | Titulos principales de decision, page headings | `--hm-font-display`, `--hm-text-display` |
| Heading | Lora | 500 | `20px` | `26px` | Titulos de card/tarea, subtitulos principales | `--hm-font-heading`, `--hm-text-heading` |
| Title | DM Sans | 500 | `18px` | `24px` | Titulos de helper, bloques y secciones | `--hm-text-title` |
| Body | DM Sans | 400 | `16px` | `24px` | Texto base, descripcion, mensajes principales | `--hm-text-body` |
| Small | DM Sans | 400 | `14px` | `20px` | Metadata, ubicacion, fechas, copy secundario | `--hm-text-small` |
| Caption | DM Sans | 500 | `10px` | `14px` | Eyebrow uppercase, estado textual, labels compactas | `--hm-text-caption` |

### Familias recomendadas

```css
:root {
  --hm-font-serif: "Lora", Georgia, "Times New Roman", serif;
  --hm-font-sans: "DM Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}
```

Fallback:

- Si `Lora` no esta disponible, usar `Georgia`.
- Si `DM Sans` no esta disponible, usar `Segoe UI` o `system-ui`.
- No sustituir por `Inter` como decision visual por defecto: cambiaria la personalidad editorial del producto.

### Reglas tipograficas

- Titulos emocionales o de decision: `Lora`.
- Texto operativo y controles: `DM Sans`.
- Estados: `DM Sans 500`, `10px`, uppercase solo cuando actua como eyebrow.
- Evitar mezclar muchos pesos dentro de una misma card.
- Mantener copy critico corto: titulo, subtitulo y CTA.

## 4. Spacing / layout

### Tokens recomendados

Figma usa valores recurrentes: `4`, `8`, `10`, `12`, `14`, `16`, `20`, `24`, `32`, `40`, `56`, `96`.

```css
:root {
  --hm-space-1: 4px;
  --hm-space-2: 8px;
  --hm-space-3: 12px;
  --hm-space-4: 16px;
  --hm-space-5: 20px;
  --hm-space-6: 24px;
  --hm-space-8: 32px;
  --hm-space-10: 40px;
  --hm-space-14: 56px;
  --hm-space-sticky: 96px;
}
```

### Layout desktop detectado

- Frame desktop ancho aproximado: `1207px` a `1277px`.
- Shell principal: fondo `#F8F6F1`.
- Container principal detectado: `1152px` con padding horizontal `16px`.
- Layout de detalle/pago: dos columnas.
- Sidebar/task summary: `320px`.
- Separacion entre columna principal y sidebar: `40px`.
- Cards principales: padding `20px`.
- Secciones de documentacion: padding vertical `56px`.

### Layout mobile detectado

- Frames mobile: `330px`, `338px`, `340px`, `344px`, `345px`, `346px`, `369px`.
- Padding horizontal mobile: `16px`.
- Padding vertical mobile: `24px`.
- Main content mobile deja espacio inferior para CTA sticky: `96px`.
- CTA sticky/full width detectado: botones de `56px` de alto.
- Cards mobile mantienen radio `16px` y padding `16px` o `20px` segun densidad.

### Reglas de layout

- Desktop: sidebar contextual + contenido principal.
- Mobile: columna unica, summary debajo o antes segun paso, CTA sticky cuando hay decision/pago.
- Decision gate y payment no deben competir con navegacion lateral.
- Mantener un max-width centrado para evitar pantallas demasiado dispersas.

## 5. Radius

### Tokens recomendados

```css
:root {
  --hm-radius-xs: 4px;
  --hm-radius-sm: 8px;
  --hm-radius-md: 12px;
  --hm-radius-lg: 14px;
  --hm-radius-xl: 16px;
  --hm-radius-pill: 999px;
}
```

### Uso detectado

| Elemento | Radius |
|---|---:|
| Cards / summaries | `16px` |
| Boton primary/secondary normal | `14px` |
| Boton pequeno / helper actions | `18px` |
| Inputs | `18px` |
| Header compact / notification | `18px` |
| Avatares / toggles / pills | `999px` |
| Contenedores sutiles | `16px` |
| Elementos pequenos | `4px`, `8px`, `10px`, `12px` |

Regla:

- Usar radios suaves y redondeados, pero no convertir toda la app en pills.
- Cards y shells deben sentirse solidos: `16px`.
- Botones de accion: `14px` o `16px`.
- Inputs y pills: `18px` o `999px`.

## 6. Shadows / borders

### Bordes

```css
:root {
  --hm-border-strong: 1px solid rgba(28, 25, 22, 0.16);
  --hm-border-soft: 1px solid rgba(28, 25, 22, 0.10);
  --hm-border-primary: 1px solid rgba(31, 107, 72, 0.22);
}
```

Observado:

- Las cards usan superficie blanca y stroke basado en `#1C1916`, visualmente como borde suave.
- Headers y bloques de ejemplo usan borde para separar sin usar fondos frios.
- Payment/pricing usa border-bottom `rgba(28,25,22,0.1)`.

### Sombras detectadas

| Token | Figma detectado | CSS recomendado |
|---|---|---|
| `shadow-sm` | Drop shadow `0 1px 2px -1px`, `0 1px 3px 0` | `--hm-shadow-sm` |
| `shadow-md` | Drop shadow `0 2px 4px -2px`, `0 4px 6px -1px` | `--hm-shadow-md` |
| `shadow-lg` | Drop shadow `0 4px 6px -4px`, `0 10px 15px -3px` | `--hm-shadow-lg` |

```css
:root {
  --hm-shadow-sm: 0 1px 2px rgba(28, 25, 22, 0.06), 0 1px 3px rgba(28, 25, 22, 0.08);
  --hm-shadow-md: 0 2px 4px rgba(28, 25, 22, 0.06), 0 4px 6px rgba(28, 25, 22, 0.08);
  --hm-shadow-lg: 0 4px 6px rgba(28, 25, 22, 0.08), 0 10px 15px rgba(28, 25, 22, 0.10);
}
```

Regla:

- Cards normales: `shadow-sm`.
- Modales/drawers/bottom sheets: `shadow-lg`.
- No usar sombras azuladas ni glassmorphism.

## 7. z-index

Figma no documenta tokens de z-index. Se recomiendan para implementacion porque hay header, drawer, modal, bottom sheet, sticky CTA y toasts/overlays.

```css
:root {
  --hm-z-base: 0;
  --hm-z-map: 1;
  --hm-z-header: 20;
  --hm-z-sticky-cta: 30;
  --hm-z-drawer: 40;
  --hm-z-modal-backdrop: 50;
  --hm-z-modal: 60;
  --hm-z-toast: 70;
}
```

Reglas:

- Header por encima del contenido, pero por debajo de modal/drawer.
- CTA sticky mobile por encima del contenido y debajo de modal/drawer.
- Drawer mobile debe tapar CTA sticky si ambos existen.
- Modal/backdrop siempre por encima de drawer salvo que el drawer sea el overlay activo.

## 8. Buttons

Regla principal: un CTA principal por pantalla.

### Primary

Detectado:

- Labels: `Confirmar y pagar`, `Pagar`, `Enviar valoración`, `Ver helpers`, `Simular: llegan helpers →`.
- Fondo: `#1F6B48`.
- Texto: `#FFFFFF`.
- Radio: `14px`, `16px` o `18px` segun contexto.
- Altura normal: `44px`.
- Altura mobile sticky: `56px`.
- Padding frecuente: `12px 16px`.

Uso correcto:

- Decision principal de la pantalla.
- Confirmar y pagar.
- Elegir helper.
- Enviar valoracion.
- Cerrar tarea si es la accion final del flujo.

Uso incorrecto:

- Acciones terciarias.
- Premium externo si el pago de tarea es el objetivo principal.
- Dos primarios simultaneos.

### Secondary

Detectado:

- Label: `Ver perfil`.
- Fondo: `#F0EBE0`.
- Texto: `#1C1916`.
- Radio: `18px`.
- Altura compacta: `32px`.

Uso correcto:

- Ver perfil sin perder contexto.
- Accion secundaria junto a CTA principal.
- Navegacion de apoyo.

### Ghost

Detectado:

- Label: `Cancelar`.
- Sin fill dominante.
- Texto `#1C1916` o `#6E6860`.

Uso correcto:

- Cancelar modal.
- Volver al origen.
- Acciones contextuales no comerciales.

### Danger

Detectado:

- Label: `Eliminar tarea`.
- Fondo: `#C0392B`.
- Texto: `#FFFFFF`.

Uso correcto:

- Eliminar/cancelar una tarea si hay confirmacion clara.
- Rechazo seguro de helper solo si existe backend/RPC seguro.

Uso incorrecto:

- Rechazar helper como CTA funcional si no existe operacion segura.
- Usar rojo para estados o alertas no destructivas.

### Disabled / Loading

Detectado como specimen: `Enviar valoración` disabled.

Recomendado:

- Disabled: opacity reducida, sin sombra fuerte, cursor disabled.
- Loading: mantener ancho del boton, texto estable o spinner discreto.
- No cambiar el label critico por estados tecnicos.

### Icon button

Detectado:

- Botones/iconos de `16px`, `18px`, `32px`.
- Campana/notificacion con card compacta.

Uso:

- Header, notification bell, cerrar modal.
- Debe tener label accesible.

## 9. Inputs / forms

### Text input

Detectado:

- Nombre Figma: `Text Input`.
- Fondo: `#F0EBE0`.
- Radio: `18px`.
- Altura: `40px`.
- Padding: `10px 12px`.
- Placeholder: `Cuéntanos qué necesitas...`.

### Search / location input

Detectado:

- Placeholder: `Buscar tareas...`.
- Fondo: `#F0EBE0`.
- Radio: `18px`.
- Altura: `40px`.
- Padding con icono: `10px 12px 10px 32px`.

### Textarea / comment

Detectado:

- Labels: `Comentario (opcional)`, `¿Qué destacarías de Aroa?`.
- Misma direccion visual: fondo suave, radio alto, padding comodo.

### Chat input

Detectado:

- Placeholder: `Escribe un mensaje...`.
- Desktop: ancho aproximado `690px`, alto `36px`.
- Mobile: ancho aproximado `245px`, alto `36px`.
- Fondo: `#F0EBE0`.
- Radio: `18px`.
- Padding: `8px 12px`.

### Estados recomendados

| Estado | Visual |
|---|---|
| Default | Fondo `Secondary`, texto muted |
| Focus | Borde `Primary`, sin glow azul |
| Error | Borde `Destructive`, helper text en danger |
| Disabled | Fondo secondary con opacity, texto muted |
| Helper text | `Small`, muted |

## 10. Cards

### TaskSummary

Detectado:

- Card: `#FFFFFF`.
- Border/stroke: `#1C1916` suavizado.
- Shadow: `shadow-sm`.
- Radio: `16px`.
- Padding: `20px`.
- Contenido: estado textual, titulo, descripcion breve, ubicacion, fecha.

Uso:

- Sidebar de detalle/pago.
- Resumen contextual en mobile.

### HelperCard compact

Detectado:

- Ejemplo: `Aroa Martínez`, `4.9`, `0.8 km`.
- Avatar con iniciales `AM`.
- Card blanca, borde suave, `shadow-sm`, radio `16px`, padding `16px`.
- Texto de experiencia breve.

Uso:

- Preview de helper.
- Decision gate.
- Lista de helpers.

### Helper list item

Detectado:

- Eyebrow: `Primera en ofrecerse`.
- Metadata: `4.9 (47)`, `0.8 km`, `Hace 5 min`.
- CTAs: `Elegir`, `Ver perfil`.
- Botones compactos: `32px` alto, radio `18px`.

Regla:

- `Elegir` puede ser primary dentro de lista.
- `Ver perfil` siempre secondary y no debe reemplazar la decision comercial principal.

### CostSummary

Detectado:

- Titulo: `Resumen de costes`.
- Lineas: `Presupuesto tarea`, `Tarifa de servicio`, `Total`.
- Total en `Primary`.
- Nota: `Pago protegido por Stripe`.
- Card blanca, radio `16px`, padding `20px`, `shadow-sm`.

### PaymentSummary

Detectado:

- Copy: `Pago seguro gestionado por Stripe. No se cobra hasta confirmar.`
- CTA: `Pagar €49.50 con Stripe`.
- Premium como enlace/accion secundaria: `¿Tienes Premium? Coordina el pago directamente`.
- Regla: no mezclar demasiadas opciones.

### ReviewCard

Detectado:

- Helper + tarea.
- Campo `Puntuación`.
- Textarea `¿Qué destacarías de Aroa?`.
- CTA `Enviar valoración`.

### EmptyState card

Detectado:

- Copy: `Sin helpers aún`, `Avisaremos cuando alguien se ofrezca.`
- Estructura: icono + titulo + subtitulo.
- Debe ser calmado, sin alarmismo.

### Map preview card

No se detecto un Home Map completo en Figma en esta auditoria. Se recomienda documentarlo como pendiente visual si el proyecto actual usa mapa.

## 11. Estados

Regla obligatoria: no usar badges de color con punto circular.

Los estados deben mostrarse como:

- State header.
- Eyebrow textual.
- Texto simple.
- Banner sutil.
- Progress stepper discreto si aporta claridad.

### Estados detectados / recomendados

| Estado producto | Estado tecnico probable | Visual recomendado |
|---|---|---|
| Publicada | `open` / `published` | Eyebrow `Publicada`, muted, sin dot |
| Helpers interesados | `open` con offers | Header textual `Tienes helpers interesados` |
| Oferta pendiente | `assigned` | Decision gate con `Confirmar y pagar` |
| En curso | `in_progress` | Header `Tarea en curso`, strip primary suave |
| Completada | `completed` | Texto simple o banner success suave |
| Cerrada | `closed` | Estado textual final |
| Cancelada | `cancelled` | Texto danger moderado, no alarma visual |
| Pago recibido | Stripe return pending | Titulo `Pago recibido`, copy de espera |
| Esperando confirmacion | webhook pendiente | Banner neutral, CTA de volver sin prometer confirmado |

Copy detectado:

- `Pago recibido`.
- `El chat y los datos del helper se desbloquean en cuanto confirmemos el pago.`
- `Pago confirmado · Chat desbloqueado`.

## 12. Page shells

### Desktop shell

Detectado:

- Fondo `Background`.
- Header con `HelpMe`, estado textual y avatar `TU`.
- Container central con padding horizontal `16px`.
- Layout de detalle: sidebar `320px` + main, gap `40px`.
- Cards contextuales a la izquierda, flujo decisional a la derecha.

### Mobile shell

Detectado:

- Ancho visual entre `330px` y `369px`.
- Padding `24px 16px`.
- Header compacto.
- Main content con padding inferior `96px`.
- CTA full-width/sticky `56px`.

### Task page template

Secuencia detectada:

- Tarea publicada.
- Helpers interesados.
- Lista de helpers.
- Oferta pendiente.
- Confirmar pago.
- Pago recibido.
- Tarea en curso/chat.
- Cerrar tarea.
- Valorar.
- Gracias por valorar.

### Payment page shell

Detectado:

- Debe ser directo.
- Mostrar resumen de tarea/costes.
- CTA principal `Confirmar y pagar` o `Pagar €49.50 con Stripe`.
- Premium externo como accion secundaria.
- Copy de confianza sobre Stripe.

### Settings/Profile shell

Los links de pagina existen como paginas/nodos (`Profile`, `Settings`), pero en esta extraccion no tienen contenido cargado como pagina independiente. Mantener estilo de shell base: fondo calido, cards blancas, headers discretos.

## 13. Home Map

No se detecto un Home Map completo en la pagina `styles`.

Estado: pendiente visual.

Recomendacion para Figma:

- Crear shell especifico de mapa antes de implementarlo visualmente.
- Usar fondo `Background` para paneles y controles, no UI azul generica.
- Markers discretos con `Primary` y superficies blancas.
- Bottom sheet mobile con radio superior `16px`, shadow-lg, handle pill.
- Task preview card con el mismo lenguaje de TaskSummary.
- Location denied como EmptyState calmado.

## 14. Payment / Premium / Pricing

### Payment

Detectado:

- Pantalla `Confirmar pago`.
- CTA `Confirmar y pagar`.
- CTA Stripe: `Pagar €49.50 con Stripe`.
- Copy: `Pago seguro gestionado por Stripe. No se cobra hasta confirmar.`
- Trust copy: `Pago seguro y protegido por Stripe`.

Reglas:

- El pago de tarea dentro de HelpMe es la accion principal.
- No mostrar estados tecnicos.
- No mezclar mas de una ruta principal.
- Premium nunca debe competir con el CTA de pago de tarea.

### Stripe return

Detectado:

- Titulo: `Pago recibido`.
- Copy: `El chat y los datos del helper se desbloquean en cuanto confirmemos el pago. No te moveremos de aquí hasta que todo esté listo.`

Regla:

- No decir `pago confirmado` hasta que el estado real este confirmado por backend/webhook.
- Si tarda, mantener estado pendiente y CTA seguro para volver.

### Premium / Pricing

Nodo inspeccionado: `5:25`.

Detectado:

- Toggle `Mensual` / `Anual`.
- `Mensual`: texto muted `#6E6860`, `DM Sans Medium`, `14px`.
- Toggle/pill activo: fondo `#1F6B48`, ancho aproximado `48px`, alto `24px`, radio pill.
- `Anual`: texto `#1C1916`, `DM Sans Medium`, `14px`.
- Badge descuento `-30%`: fondo `rgba(31,107,72,0.1)`, texto `#1F6B48`, `DM Sans SemiBold`, `10px`, full pill.
- Separador inferior: `rgba(28,25,22,0.1)`.

Reglas:

- Premium es secundario en task payment.
- Premium puede tener mayor protagonismo en settings/pricing dedicados.
- No usar copy alarmista.
- Costes siempre claros.

## 15. Mobile rules

- Usar padding horizontal `16px`.
- Usar padding vertical de pantalla `24px`.
- CTA sticky en decisiones y pago: alto `56px`, radio `16px`, full width.
- Mantener solo una accion primaria visible.
- Drawer mobile: handle + lista de opciones.
- Modal mobile: siempre con escape al origen.
- Formularios: inputs `40px`, chat input `36px`, evitar tap targets menores de `44px` salvo iconos auxiliares con area clicable mayor.
- Cuando haya teclado abierto, priorizar campo activo y CTA persistente solo si no tapa contenido critico.
- Bottom sheet/drawer debe ganarle en z-index al CTA sticky.

## 16. Que NO hacer

- No usar badges con punto circular.
- No usar Tailwind como dependencia nueva.
- No introducir shadcn.
- No usar CSS-in-JS.
- No mezclar estilo antiguo azul/glass con el nuevo sistema calido dentro de una misma pantalla.
- No inventar colores fuera de los tokens documentados.
- No mostrar estados tecnicos como `assigned`, `in_progress` o `checkout_session`.
- No crear CTAs falsos.
- No mandar al usuario a perfil completo como paso principal del flujo comercial.
- No usar `Ver perfil` o `Revisar helper` como CTA principal en oferta pendiente.
- No pegar codigo Figma directamente como React final.
- No prometer `Pago confirmado` antes de confirmacion real de backend/webhook.

## 17. Mapeo recomendado a codigo

### CSS tokens recomendados

```css
:root {
  --hm-color-bg: #F8F6F1;
  --hm-color-text: #1C1916;
  --hm-color-surface: #FFFFFF;
  --hm-color-primary: #1F6B48;
  --hm-color-secondary: #F0EBE0;
  --hm-color-muted: #6E6860;
  --hm-color-accent: #D9623B;
  --hm-color-danger: #C0392B;

  --hm-color-border-subtle: #EAE6DD;
  --hm-color-success-bg: #D1FAE5;
  --hm-color-success-text: #065F46;
  --hm-color-warning-bg: #FEF3C7;
  --hm-color-warning-text: #92400E;

  --hm-font-serif: "Lora", Georgia, "Times New Roman", serif;
  --hm-font-sans: "DM Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  --hm-space-1: 4px;
  --hm-space-2: 8px;
  --hm-space-3: 12px;
  --hm-space-4: 16px;
  --hm-space-5: 20px;
  --hm-space-6: 24px;
  --hm-space-8: 32px;
  --hm-space-10: 40px;
  --hm-space-14: 56px;
  --hm-space-sticky: 96px;

  --hm-radius-xs: 4px;
  --hm-radius-sm: 8px;
  --hm-radius-md: 12px;
  --hm-radius-lg: 14px;
  --hm-radius-xl: 16px;
  --hm-radius-pill: 999px;

  --hm-shadow-sm: 0 1px 2px rgba(28, 25, 22, 0.06), 0 1px 3px rgba(28, 25, 22, 0.08);
  --hm-shadow-md: 0 2px 4px rgba(28, 25, 22, 0.06), 0 4px 6px rgba(28, 25, 22, 0.08);
  --hm-shadow-lg: 0 4px 6px rgba(28, 25, 22, 0.08), 0 10px 15px rgba(28, 25, 22, 0.10);

  --hm-z-base: 0;
  --hm-z-map: 1;
  --hm-z-header: 20;
  --hm-z-sticky-cta: 30;
  --hm-z-drawer: 40;
  --hm-z-modal-backdrop: 50;
  --hm-z-modal: 60;
  --hm-z-toast: 70;
}
```

### Componentes prioritarios para implementacion

Orden recomendado:

1. Tokens CSS
2. Button
3. Input
4. Card
5. StateHeader
6. TaskSummary
7. HelperCard
8. CostSummary
9. PaymentSummary
10. PageShell
11. HomeMapShell
12. Modal/Drawer
13. Premium/Pricing

### 1. Tokens CSS

Donde aparece:

- Toda la app.

Variantes necesarias:

- Color, typography, radius, spacing, shadow, border, z-index.

Estados:

- Base, hover/focus, disabled, danger, success/warning textual.

CTA asociado:

- Ninguno.

Notas:

- Debe ser el primer paso antes de retocar pantallas.
- No usar Tailwind ni shadcn.

### 2. Button

Donde aparece:

- Landing, auth, task detail, helper list, decision gate, payment, chat close, review, premium.

Variantes:

- Primary.
- Secondary.
- Ghost.
- Danger.
- Text link.
- Icon.
- Full-width sticky mobile.

Estados:

- Default.
- Hover.
- Focus.
- Disabled.
- Loading.

CTA asociado:

- `Confirmar y pagar`, `Pagar`, `Elegir`, `Ver helpers`, `Cerrar tarea`, `Enviar valoración`.

Notas:

- Un primary por pantalla.
- Secondary para `Ver perfil`.
- Danger solo con side effect seguro.

### 3. Input

Donde aparece:

- Crear tarea, busqueda, comentario/review, chat.

Variantes:

- Text input.
- Search/location input.
- Textarea.
- Chat input.
- Price input recomendado si existe en codigo.
- Select/checkbox/toggle recomendado si existe en codigo.

Estados:

- Default.
- Focus.
- Error.
- Disabled.
- Helper text.

CTA asociado:

- Crear tarea, buscar, enviar mensaje, enviar valoracion.

Notas:

- Fondo secondary, radio `18px`, sin glow azul.

### 4. Card

Donde aparece:

- Task cards, summaries, helper cards, review, empty states, payment.

Variantes:

- Surface.
- Interactive.
- Compact.
- Summary.
- Empty.

Estados:

- Default.
- Hover.
- Selected.
- Disabled.

CTA asociado:

- Depende de card: `Elegir`, `Ver perfil`, `Confirmar y pagar`.

Notas:

- White surface, soft border, `shadow-sm`, radius `16px`.

### 5. StateHeader

Donde aparece:

- Tarea publicada, helpers interesados, oferta pendiente, en curso, pago recibido, cerrada.

Variantes:

- Eyebrow.
- Header textual.
- Banner subtle.
- Strip primary/neutral.

Estados:

- Publicada.
- Helpers interesados.
- Oferta pendiente.
- En curso.
- Pago recibido.
- Completada.
- Cerrada.
- Cancelada.

CTA asociado:

- Segun estado.

Notas:

- Sin dot circular.
- No mostrar estado tecnico.

### 6. TaskSummary

Donde aparece:

- Sidebar desktop.
- Resumen mobile.
- Payment.
- Review/cierre.

Variantes:

- Compact.
- With costs.
- With state.

Estados:

- Por estado de tarea.

CTA asociado:

- Normalmente ninguno; es contexto.

Notas:

- No debe robar foco al CTA principal.

### 7. HelperCard

Donde aparece:

- Lista de helpers, decision gate, perfil modal/drawer.

Variantes:

- Compact.
- List item.
- Selected.
- Profile modal.

Estados:

- Default.
- Selected.
- Pending offer.

CTA asociado:

- `Elegir`.
- `Ver perfil`.
- `Confirmar y pagar` si ya es oferta pendiente.

Notas:

- En `assigned`, la card debe apoyar el decision gate, no reemplazarlo.

### 8. CostSummary

Donde aparece:

- Task detail, payment, close/review context.

Variantes:

- Basic.
- Payment.
- Close payout.

Estados:

- Normal.
- Pending payment.
- Paid.

CTA asociado:

- No deberia tener CTA propio salvo payment summary.

Notas:

- Total en primary.
- Costes claros y sin ruido tecnico.

### 9. PaymentSummary

Donde aparece:

- TaskPaymentPage.
- Decision gate.

Variantes:

- Confirmar y pagar.
- Stripe external.
- Premium secondary.
- Pending webhook.

Estados:

- Ready.
- Loading checkout.
- Payment received.
- Waiting confirmation.
- Failed/cancelled.

CTA asociado:

- `Confirmar y pagar`.
- `Pagar €xx con Stripe`.
- Link secundario Premium.

Notas:

- Premium no compite con el pago principal.

### 10. PageShell

Donde aparece:

- Landing, auth, home, task, payment, chat, profile/settings.

Variantes:

- Desktop two-column.
- Mobile single-column.
- Payment focused.
- Chat.
- Settings/profile.

Estados:

- Authenticated.
- Guest.
- Loading.
- Empty.

CTA asociado:

- Depende de pantalla.

Notas:

- Fondo global `Background`.
- Header humano y ligero.

### 11. HomeMapShell

Donde aparece:

- Home requester/helper si el codigo actual usa mapa.

Variantes:

- Desktop map + side panel.
- Mobile map + bottom sheet.
- Empty.
- Location denied.

Estados:

- Loading location.
- Location denied.
- No tasks.
- Tasks available.

CTA asociado:

- Crear tarea, ver tarea, filtros.

Notas:

- Pendiente visual en Figma.
- No inventar estilo distinto: reutilizar cards, drawers y state headers.

### 12. Modal/Drawer

Donde aparece:

- Perfil helper.
- Elegir helper mobile.
- Confirmaciones.
- My requests drawer si aplica.

Variantes:

- Modal desktop.
- Drawer mobile.
- Bottom sheet.
- Confirm destructive.

Estados:

- Open.
- Closing.
- Loading.
- Error.

CTA asociado:

- `Elegir a Aroa`, `Confirmar`, `Cancelar`.

Notas:

- Siempre con escape al origen.
- Drawer con handle.
- Modal por encima de sticky CTA.

### 13. Premium/Pricing

Donde aparece:

- Pricing/Premium.
- Payment como alternativa secundaria.
- Settings premium.

Variantes:

- Monthly/yearly toggle.
- Discount badge.
- Premium card.
- Billing state.
- Cancelation state.

Estados:

- Monthly.
- Yearly.
- Active.
- Inactive.
- Loading external payment.
- Failed/cancelled.

CTA asociado:

- CTA premium dedicado en pricing/settings.
- Link secundario en payment.

Notas:

- Toggle detectado con pill primary y badge `-30%`.
- Mantener Premium separado del pago principal de tarea.

## Huecos o dudas

- Home Map no aparece como pantalla completa documentada en el archivo inspeccionado.
- Profile/Settings/Landing/Auth figuran como nodos/paginas en el archivo, pero no devolvieron contenido independiente en la lectura compacta.
- No hay variables Figma ni estilos locales publicados; si el equipo quiere un sistema Figma formal, habria que convertir estos tokens dibujados en variables reales.
- No se detectaron estados formales de hover/focus en Figma; se proponen en esta guia desde los tokens existentes.
- No se detecto escala completa de z-index; se propone una escala segura para implementacion.

## Recomendacion para siguiente fase

1. Implementar primero tokens CSS globales desde esta guia.
2. Migrar `Button`, `Input`, `Card` y `StateHeader`.
3. Aplicar componentes a flujo critico: oferta pendiente, pago, Stripe return, chat, cierre y review.
4. Revisar Home Map como caso especial porque Figma aun no lo documenta completamente.
5. Mantener Premium como estilo secundario dentro de payment y como flujo propio en pricing/settings.


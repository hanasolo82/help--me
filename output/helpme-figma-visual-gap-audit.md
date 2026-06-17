# HelpMe Figma Visual Gap Audit

Fecha: 2026-06-16

Fuente visual principal:
`\\HANASOLO-LAPTOP\Users\User\Downloads\helpme styles`

Fuentes de comparacion:
- Exports PNG/PDF locales de Figma.
- `output/helpme-figma-style-guide.md`.
- Codigo actual de HelpMe.

Scope:
- Auditoria visual solamente.
- No se modifico codigo, CSS, tokens, Supabase, Stripe, backend, rutas ni workflow.
- No se ejecuto lint/build porque esta fase no modifica codigo.

Selected agents:
- frontend-ui-agent
- ui-ux-pro-max
- helpme-architect
- agent-worklog

## 1. Archivos inspeccionados

| Archivo | Tipo | Que representa | Relevancia |
|---|---|---|---|
| `Body (1).png` | PNG | Global components: header, mobile header, bottom nav, notification bell, avatar menu, search, modal, drawer, confirm dialog, toast, loading, empty/error, cookie | Alta |
| `Body (2).png` | PNG | Task Flow requester: publicada, helpers interesados, elegir helper, perfil helper, decision gate, rechazo, en curso, valoracion | Critica |
| `Body (3).png` | PNG | Payment/Premium: confirmar pago, Stripe states, premium upsell, pago externo, Stripe Connect helper | Critica |
| `Visual language analysis.png` | PNG | Chat: lista de chats, chat privado, mensajes, chat bloqueado, empty/adjuntos | Alta |
| `Body (4).png` | PNG | Profile/trust: perfil publico helper, perfil propio, rating summary, reviews | Alta |
| `Body (5).png` | PNG | Settings: settings home, notificaciones, logout/eliminar cuenta | Media |
| `Body (6).png` | PNG | Landing: hero, como funciona, categorias | Media |
| `Body (7).png` | PNG | Auth/onboarding: login, seleccion rol, permisos, telefono, foto/bio helper | Alta |
| `Body (8).png` | PNG | Create task: descripcion, categoria, ubicacion, precio, revision | Alta |
| `Body (9).png` | PNG | Create task duplicado/variant del mismo flujo | Media |
| `Body (10).png` | PNG | Global system states/edge cases: offline, backend error, task unavailable, webhook pending, expired payment, long text, missing data | Alta |
| `Visual language analysis (1).png` | PNG | Home Map: desktop split map/list, mobile bottom sheet, markers, map errors, task preview, requester drawer | Critica |
| `Visual language analysis (2).png` | PNG | Mobile system: request modal sticky CTA, keyboard behavior, helper task detail, mobile profile | Critica |
| `App.png` | PNG | Support/legal: help center, report task/user, legal links | Media |
| `Body.png` | PNG | Long combined export: pricing, mobile pricing, tasker mobile, payment states, dashboard-like extended examples | Alta |
| `Visual language analysis.pdf` | PDF | PDF export agregado del visual analysis | Alta, usado como referencia duplicada |
| `Visual language analysis-1.pdf` to `Visual language analysis-20.pdf` | PDF | Exports PDF seccionados del mismo sistema visual | Media, listados y considerados como respaldo; la lectura visual se apoyo en PNG por no haber herramienta PDF local disponible |

## 2. Lenguaje visual real detectado

El sistema Figma es sobrio, calido y editorial. No es un rediseño decorativo: funciona como una libreria de componentes con specimens claros, estados documentados y una disciplina fuerte de jerarquia.

Fondo:
- Fondo global crema muy claro: `#F8F6F1`.
- Las pantallas no usan fondos oscuros, azules ni glass.
- El mapa usa una superficie gris-calida neutral y controles flotantes blancos/verdes.

Superficies:
- Cards y paneles principales blancos `#FFFFFF`.
- Secciones internas suaves en `#F0EBE0`.
- El borde separa mas que la sombra.
- Las sombras son discretas, de baja elevacion.

Cards:
- Radio principal de card: 16px.
- Padding frecuente: 16px a 20px.
- Bordes finos `#EAE6DD` o equivalente rgba de `#1C1916`.
- Contenido ordenado en bloques: eyebrow, titulo, metadata, accion.

Botones:
- Primary verde `#1F6B48`, texto blanco.
- Secondary crema `#F0EBE0`, texto `#1C1916`.
- Danger rojo `#C0392B`, reservado para acciones destructivas confirmadas.
- Un CTA principal por contexto.
- Botones compactos de helpers: altura aproximada 32px; botones principales de pantalla: 44px; sticky mobile: 56px.

Inputs:
- Fondo `#F0EBE0`.
- Radio alto, normalmente 18px.
- No hay glow azul.
- Focus verde sutil.

Modales/drawers:
- Modal centrado blanco con borde, sombra suave y escape visible.
- Drawer/bottom sheet mobile con handle, fondo blanco, radio superior 16px.
- Confirmaciones destructivas usan icono/cabecera suave y CTA rojo.

Iconografia:
- Iconos simples, lineales, funcionales.
- Avatares con iniciales y colores controlados.
- Se usan algunos emoji en categorias del specimen, pero no como estructura general de navegacion.

Densidad:
- Alta claridad, no alta complejidad.
- Cada specimen muestra CTA y estados documentados en una barra inferior, pero la app final no deberia enseñar estados tecnicos.
- Las pantallas criticas reducen ruido alrededor de la decision.

Tipografia:
- Titulos editoriales con Lora/fallback serif.
- UI/body con DM Sans/fallback sans.
- Eyebrows en uppercase pequeño, tracking moderado.
- Titulos de decision alrededor de 24px, headings de card alrededor de 20px, body 16px.

Jerarquia:
- StateHeader primero, luego contenido contextual, luego CTA.
- El precio y total usan verde como senal funcional.
- `Ver perfil` es secundario, nunca CTA principal.

Estados:
- Estados textuales o banners suaves.
- Sin badges con punto circular para estados de tarea.
- Loading/error/offline se resuelven con cards calmadas, no con pantallas alarmistas.

Mobile:
- Pantallas de 330-369px.
- Padding horizontal 16px.
- CTA sticky cuando hay accion critica.
- Bottom sheet para mapa/lista.
- Formularios de creacion con CTA pegado al fondo y consideracion de teclado.

## 3. Tokens visuales reales

| Token | Valor real / recomendado | Uso |
|---|---|---|
| Background | `#F8F6F1` | Fondo global |
| Text | `#1C1916` | Texto principal |
| Surface | `#FFFFFF` | Cards, modales, paneles |
| Primary | `#1F6B48` | CTA principal, precio/total, confirmacion positiva |
| Secondary | `#F0EBE0` | Inputs, botones secundarios, superficies internas |
| Muted | `#6E6860` | Metadata, subtitulos, captions |
| Accent | `#D9623B` | Acento puntual |
| Danger | `#C0392B` | Rechazo destructivo, reporte, eliminar |
| Border subtle | `#EAE6DD` | Bordes suaves |
| Success bg/text | `#D1FAE5` / `#065F46` | Exito suave |
| Warning bg/text | `#FEF3C7` / `#92400E` | Warning suave |
| Radius card | `16px` | Cards, summaries, sheets |
| Radius button | `14px` a `18px` | Acciones |
| Radius input | `18px` | Inputs/search/chat input |
| Radius pill | `999px` | Avatares, toggles, pills puntuales |
| Shadow sm | `0 1px 2px rgba(28,25,22,.06), 0 1px 3px rgba(28,25,22,.08)` | Cards |
| Shadow lg | `0 4px 6px rgba(28,25,22,.08), 0 10px 15px rgba(28,25,22,.10)` | Modales/drawers |
| Font heading | `Lora`, serif fallback | H1, decision titles, task titles |
| Font body | `DM Sans`, sans fallback | UI, body, buttons |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 56, 96 | Sistema base |

Brecha en codigo actual:
- `src/styles/design-tokens.css` ya contiene los tokens `--hm-*`, pero conserva escalas antiguas azules (`--primary-500: #28abff`, `--text-950: #0f172a`, etc.).
- Hay aliases antiguos (`--background-*`, `--primary-*`, `--accent-*`) que facilitan que componentes previos sigan usando el lenguaje viejo.
- `src/styles/globals.css` usa Lora/DM Sans, pero aplica `letter-spacing` negativa y tipografia fluida con `clamp`, lo que no coincide con el sistema Figma mas estable.

## 4. Componentes base detectados

| Componente | Apariencia esperada Figma | Uso correcto | Diferencias con app actual |
|---|---|---|---|
| Button | Verde primary plano, secondary crema, danger rojo, radio 14-18px, sin gradiente | Una accion principal por pantalla | `src/styles.css` y shared buttons aun usan gradientes, shadow-primary y algunos estilos heredados |
| Card | Blanco, borde sutil, shadow-sm, radio 16px, padding 16-20px | Resumenes, listas, panels | Varias cards actuales usan gradientes, sombras frias o demasiada elevacion |
| PageShell | Fondo crema, header ligero, container 1152px aprox | Task, payment, profile, settings | Home/Settings/Profile aun tienen decoracion radial y composicion mas pesada |
| Input | Fondo crema `#F0EBE0`, radio 18px, focus verde suave | Search, forms, chat | Algunos inputs actuales siguen blancos, con sombras internas frias o focus heredado |
| Modal | Card blanca, borde, shadow-lg, escape claro | Perfil helper, confirmar rechazo | Bastante alineado en request modals; avatar/settings modals aun usan blur/dark/glass |
| Drawer | Bottom sheet mobile o panel derecho desktop, blanco, handle, borde | Mis solicitudes, elegir helper | MyRequestsDrawer se acerco, pero falta el lenguaje de bottom sheet exacto y contenido menos denso |
| Header | Logo, nav simple, bell/avatar, altura contenida, sin barra pesada | App shell | HomeHeader actual tiene demasiados controles y dropdown con blur antiguo |
| TaskCard | Card blanca, title serif, metadata muted, precio claro, CTA discreto | Home map/list, helper feed | La app usa TaskCard generica con acciones multiples y widths raros (`50%`) que no se parecen al specimen |
| HelperCard | Avatar, nombre, rating/distancia, bio corta, `Elegir` + `Ver perfil` | Helpers interesados y decision | HelperCard actual en Home usa `Pedir ayuda`, skills y muchas metas; no esta normalizado al specimen |
| DecisionGate | Titulo `Aroa te ayudara`, resumen tarea/fecha/total, `Rechazar helper`, `Confirmar y pagar` | `assigned` requester | TaskDetail tiene el flujo, pero la estructura visual no coincide con el panel Figma de dos salidas claras |
| PaymentSummary | Resumen blanco, helper, desglose presupuesto/tarifa/total, CTA Stripe | TaskPayment | App no muestra tarifa de servicio si existe; Premium queda como bloque textual mas largo que Figma |
| ChatBubble | Incoming blanco, outgoing verde, input crema, send circular verde | Chat confirmado | Chat global mejoro, pero shared chat components aun tienen sombras/focus frios |
| SupportCard | Cards blancas, lista simple, danger solo en report | Support/legal | App actual no parece normalizada contra este specimen |
| Premium/Pricing | Cards limpias, toggle mensual/anual, premium como secundario en payment | Pricing/settings/payment | Algunos Settings/Premium estilos usan gradientes/glass y no el specimen plano |

## 5. Diferencias con la app actual

| Pantalla | Referencia Figma | App actual | Diferencia | Severidad |
|---|---|---|---|---|
| Home / Map | Split desktop 50/50 aprox: lista/filtros izquierda, mapa derecha; mobile bottom sheet; markers compactos | Home requester/helper usa otro layout y panels mas densos; header compite; helper cards tienen muchas acciones/metas | No replica la composicion Figma; se siente mas dashboard/app previa | P1 visual |
| Task publicada sin helpers | Card limpia con state header, titulo serif, metadata, empty state crema | TaskDetail usa global `detail-panel`, detail rows y mensajes genericos | Falta page template de task flow Figma | P1 visual |
| Helpers interesados | Card de resumen + lista helper item con `Elegir` y `Ver perfil` | TaskDetail lista candidaturas en `application-card` con varias acciones y densidad alta | CTA y layout no estan normalizados; visualmente no parece specimen | P0 visual |
| Helper elegido / DecisionGate | Panel comercial: `Aroa te ayudara`, tarea/fecha/total, dos salidas claras | Existe decision gate funcional, pero con detail rows, descripcion suelta, helper strip y acciones apiladas | El momento critico no se percibe tan limpio ni premium | P0 visual |
| Rechazar helper | Modal blanco, icono danger suave, cancelar + rechazar rojo | Actualmente usa `window.confirm`, no modal visual Figma | Desalineacion visual fuerte y UX nativa no integrada | P1 visual |
| Payment | Card payment con helper, presupuesto, tarifa, total, CTA `Pagar €49.50 con Stripe`; Premium como link | PaymentPage tiene cards correctas, pero Premium ocupa demasiado y no hay desglose de tarifa si no esta en logica | Cercano en color, no en composicion exacta | P1 visual |
| StripeReturn | Estados compactos: redirigiendo, pago recibido, confirmado, fallido | StripeReturn usa card central y status card suave | Bastante alineado; podria acercarse mas al listado de estados Figma | P2 visual |
| Chat | Lista de chats, chat privado con header blanco, input crema, burbujas verdes/blancas | Hay mezcla entre `src/styles.css` y shared chat module; algunos focus/shadows frios siguen | Alineacion parcial; falta normalizar shared chat | P1 visual |
| Profile | Perfil helper publico con avatar circular, rating, chips, review card; perfil propio con stats suaves | Profile public CSS mantiene gradientes, sombras frias, avatar oscuro/azul | Alto contraste con Figma | P1 visual |
| Settings | Lista de filas crema, toggles verdes, logout/delete simple | SettingsPage conserva radial gradients, blur, glass, muchas cards elevadas | Desalineado con specimen | P1 visual |
| Auth/onboarding | Cards blancas, inputs crema, primary verde, seleccion de rol clara | Onboarding CSS conserva blur/glass y focus azul | Visual viejo evidente | P1 visual |
| Create task | Modal/full-page por pasos, inputs crema, CTA verde, review card | RequestTaskModal se acerco, pero flujo actual no replica exactamente los pasos visuales Figma | Necesita normalizacion de wizard/form | P1 visual |
| Mobile task/payment | CTA bottom, sheet, una columna, teclado previsto | Payment mobile esta cerca; task detail mobile mantiene acciones densas | Mobile de decision necesita reduccion | P1 visual |
| Support/legal | Tres cards limpias, report danger controlado | No validado como pantalla implementada equivalente | Pendiente de aplicar si existe en app | P2 visual |

## 6. Estilos antiguos contaminantes

Contaminantes principales detectados:
- Escalas antiguas azules en `src/styles/design-tokens.css`: `--primary-500: #28abff`, `--text-950: #0f172a`, backgrounds azules.
- Gradientes de botones en `src/styles.css` y `src/shared/ui/RippleButton/RippleButton.module.css`.
- `backdrop-filter: blur(...)` en dropdowns, settings, onboarding y algunos modales.
- Sombras frias con `rgba(15, 23, 42, ...)` en Profile, Review, shared chat input y otros modulos.
- Cards con gradientes/radiales en Settings/Profile/Review.
- `window.confirm` para rechazo, que rompe el sistema visual de modal Figma.
- Estados con dots/badges en profile/settings/availability y algunos componentes de verificacion.
- Hardcoded reds/greens/blues (`#b42318`, `#dc2626`, `#166534`, `#6366f1`) en vez de tokens `--hm-*`.
- `border-radius: 999px` excesivo en botones, pills y tabs donde Figma usa 14/16/18px.
- Decoracion radial en Home/helper home, no presente en Home Map Figma.
- Shared UI experimental (`GlitchSoftButton`, `shine-border`, `particles`) que no pertenece al lenguaje Figma.

Archivos donde se ve mas contaminacion:
- `src/styles/design-tokens.css`
- `src/styles.css`
- `src/shared/ui/AnimatedDropdown.module.css`
- `src/shared/ui/RippleButton/RippleButton.module.css`
- `src/shared/ui/GlitchSoftButton/GlitchSoftButton.module.css`
- `src/features/onboarding/styles/onboarding.module.css`
- `src/pages/Settings/SettingsPage.module.css`
- `src/features/profile/styles/profilePublicView.module.css`
- `src/pages/TaskReview/TaskReviewPage.module.css`
- `src/shared/ui/chat/MessageInput.module.css`
- `src/shared/ui/chat/MessageBubble.module.css`

## 7. Plan de aplicacion visual

1. Tokens reales
   - Mantener `--hm-*` como fuente de verdad.
   - Deprecar o remapear escalas antiguas azules para que no contaminen.
   - Eliminar gradientes/shadows no Figma de aliases globales.

2. Button
   - Normalizar `primary-action`, `secondary-action`, `danger-action`, icon buttons y shared button modules.
   - Quitar gradientes y `shadow-primary` fuerte.
   - Asegurar un primary por contexto.

3. Card / Panel
   - Crear o consolidar patron: surface blanco, border subtle, shadow-sm, radius 16.
   - Aplicar a TaskCard, HelperCard, Settings/Profile panels y empty states.

4. PageShell
   - Normalizar fondo crema, container, header, gutters y mobile padding.
   - Quitar radiales decorativos en pantallas internas.

5. TaskDetail
   - Transformar visualmente cada estado al template Figma: publicada, helpers interesados, oferta pendiente, en curso, completada.
   - No cambiar workflow ni servicios.

6. Helpers interesados
   - Crear vista visual de helper list item: avatar, nombre, rating/distancia, `Elegir`, `Ver perfil`.
   - Reducir acciones visibles.

7. DecisionGate
   - Panel exacto de oferta pendiente: resumen tarea/fecha/total, helper compacto, CTA `Confirmar y pagar`, secondary `Rechazar helper`, link `Ver perfil`.
   - Reemplazar `window.confirm` por modal visual solo si se mantiene la misma llamada segura.

8. Payment
   - Ajustar PaymentSummary a specimen: helper, presupuesto, tarifa si existe, total, CTA Stripe.
   - Premium como link/bloque secundario corto.

9. StripeReturn
   - Mantener copy actual, alinear status card al specimen de payment states.

10. Home / Map cards
   - Reestructurar visualmente hacia split map/list y bottom sheet mobile.
   - Normalizar markers y requester drawer segun `Visual language analysis (1).png`.

11. Chat/Profile/Settings
   - Chat: normalizar shared chat components.
   - Profile/Settings: retirar gradientes/glass y acercar a cards/rows Figma.

## 8. Archivos candidatos a modificar

Tokens/base:
- `src/styles/design-tokens.css`
- `src/styles/globals.css`
- `src/styles.css`
- `src/shared/ui/RippleButton/RippleButton.module.css`
- `src/shared/ui/AnimatedDropdown.module.css`

Task flow:
- `src/pages/TaskDetail/TaskDetail.jsx`
- `src/features/tasks/components/TaskCard/TaskCard.jsx`
- `src/features/tasks/components/TaskCard/TaskCard.module.css`
- `src/features/home/need-help/components/MyRequestCard.jsx`
- `src/features/home/need-help/components/MyRequestCard.module.css`
- `src/features/home/need-help/components/MyRequestsDrawer.jsx`
- `src/features/home/need-help/components/MyRequestsDrawer.module.css`

Payment/Stripe:
- `src/pages/TaskPayment/TaskPaymentPage.jsx`
- `src/pages/TaskPayment/TaskPaymentPage.module.css`
- `src/pages/Stripe/StripeReturn.jsx`
- `src/pages/Stripe/StripePage.module.css`

Home/Map:
- `src/pages/Home/Home.module.css`
- `src/components/home/HomeHeader.jsx`
- `src/features/home/need-help/components/RequesterHome.jsx`
- `src/features/home/need-help/components/RequesterHero.module.css`
- `src/features/home/need-help/components/NeedHelpMapLayout.jsx`
- `src/features/home/need-help/components/NeedHelpMapLayout.module.css`
- `src/features/home/need-help/components/HelperCard.jsx`
- `src/features/home/need-help/components/HelperPreviewModal.module.css`
- `src/features/home/need-help/components/RequestTaskModal.jsx`
- `src/features/home/need-help/components/RequestTaskModal.module.css`
- `src/features/map/components/TaskMap/TaskMap.module.css`

Chat/Profile/Settings:
- `src/components/task/TaskChatModal.jsx`
- `src/shared/ui/chat/MessageInput.module.css`
- `src/shared/ui/chat/MessageBubble.module.css`
- `src/shared/ui/chat/ConversationList.module.css`
- `src/features/profile/styles/profilePublicView.module.css`
- `src/pages/Settings/SettingsPage.module.css`
- `src/pages/TaskReview/TaskReviewPage.module.css`
- `src/features/onboarding/styles/onboarding.module.css`

## 9. Riesgos

Riesgos de layout:
- Home Map es el mayor riesgo: Figma propone split map/list y bottom sheet mobile; el codigo actual tiene composicion propia y datos reales. Cambiarlo visualmente puede afectar scroll, altura de mapa, Leaflet y drawers.
- TaskDetail usa clases globales; tocar `src/styles.css` puede afectar varias pantallas a la vez.
- Mobile sticky CTA debe coordinarse con drawers, modal, teclado y chat.
- Settings/Profile tienen muchas subsecciones y estados; conviene migrar por bloques.

Riesgos de mezcla visual:
- Si solo se cambian colores, seguiran vivos gradientes, blur y sombras frias.
- Si no se normalizan Button/Card/PageShell primero, cada pantalla volvera a parchearse de forma distinta.
- Los shared UI components antiguos pueden contaminar pantallas aunque los modulos nuevos esten bien.

Pantallas que necesitan validacion manual:
- Home requester con mapa.
- Helper home con mapa/lista.
- TaskDetail en estados `open`, `assigned`, `in_progress`, `completed`.
- TaskPayment en mobile y desktop.
- StripeReturn con webhook lento.
- Chat bloqueado y desbloqueado.
- Profile publico/helper propio.
- Settings y onboarding.

No debe tocarse funcionalmente:
- Supabase, migrations, RLS, RPC.
- Stripe backend, payments service, webhooks.
- `task_applications`, conversations, chat gating.
- Rutas.
- Servicios funcionales.
- Workflow Mermaid.
- Semantica de estados de tarea.

## 10. Decision recomendada

La app no esta visualmente alineada con Figma todavia.

Alineacion aproximada actual:
- Tokens base: 75%.
- Pantallas criticas task/payment: 55-65%.
- Home Map: 40-50%.
- Chat: 60%.
- Profile/Settings/Auth/Review: 30-45%.
- Alineacion visual global estimada: 50-55%.

Lo primero que debe hacerse:
1. Normalizar tokens aliases y componentes base Button/Card/PageShell.
2. Rehacer visualmente TaskDetail desde los specimens de `Body (2).png`.
3. Ajustar Payment desde `Body (3).png`.
4. Reencauzar Home Map desde `Visual language analysis (1).png`.

Lo que no debe tocarse:
- La logica del workflow actual.
- Stripe/Supabase/backend.
- El gating de chat.
- Servicios de tareas, pagos y conversaciones.
- Migraciones existentes.

Conclusion:
El proyecto ya tiene parte de la piel Figma, pero aun no tiene la anatomia visual Figma. La siguiente fase debe ser sistemica: tokens reales, botones, cards/panels y shells antes de pantallas. Si se vuelve a parchear pantalla por pantalla, la mezcla antiguo/nuevo va a reaparecer.

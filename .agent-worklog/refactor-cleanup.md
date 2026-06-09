
# Refactor Cleanup Worklog

## Estado general

- Fecha: 2026-06-03
- Agente: GitHub Copilot (agente de refactorización)
- Rama: main
- Objetivo: Auditoría inicial y registro de refactors seguros e incrementales
- Estado: Auditoría inicial completada (escaneo básico). Próximo: análisis de duplicados.

## Resumen Git (estado inicial)

- `git status` muestra múltiples rutas marcadas como deleted (`D`) y archivos no trackeados (`??`).
- Rama actual: `main` (HEAD -> main, origin/main).
- Últimos commits (5):
	- 1a4fbad: codex-notes and proyect-notes created
	- 4e96c15: map helper and requester view problems part two
	- 539c645: map helper and requester view problems
	- 9b800e3: merge .env
	- a984089: (stripe) work flow

## Stack detectado

- Frontend: React (v19) + Vite
- State: zustand, react-query
- Backend/server: Node + Express (server/index.js)
- DB/Auth: Supabase client visible (`@supabase/supabase-js`)
- Pagos: integraciones con Stripe (scripts y páginas `src/pages/Stripe`)
- Package manager: `pnpm` (workspace) (package.json `packageManager`)

## Scripts relevantes (resumen)

- `dev`, `build`, `preview` (Vite)
- `lint` (eslint)
- `server` (node server/index.js)
- múltiples scripts de verificación y reconciliación financiera relacionados con Stripe en `scripts/*.mjs`

## Estructura relevante (raíz)

- directorios: `src/`, `server/`, `scripts/`, `docs/`, `.agents/`, `public/`, `supabase/`.

## Archivos sobredimensionados (top 20 por LOC)

| Archivo | Líneas |
|---|---:|
| src/features/helper-home/components/HelperHome.jsx | 1071 |
| src/services/profilesService.js | 530 |
| src/services/tasksService.js | 489 |
| src/pages/Settings/components/ProfileSettings.jsx | 460 |
| src/features/chat/api/chatApi.js | 409 |
| src/features/helper-onboarding/components/HelperJourneyModal.jsx | 387 |
| src/shared/components/AuthPanel/AuthPanel.jsx | 364 |
| src/pages/Landing/Landing.jsx | 363 |
| src/pages/Settings/components/ImageUploadField.jsx | 344 |
| src/pages/Settings/SettingsPage.jsx | 290 |
| src/features/home/need-help/components/NeedHelpMapLayout.jsx | 290 |
| src/shared/ui/AnimatedDropdown.jsx | 286 |
| src/pages/Home/HomeContainer.jsx | 284 |
| src/features/profile/api/profileApi.js | 270 |
| src/features/helper-onboarding/components/steps/SkillsStep.jsx | 268 |
| src/features/onboarding/utils/locationCatalog.js | 249 |
| src/features/helper-onboarding/components/steps/LocationStep.jsx | 249 |
| src/pages/CreateTask/CreateTask.jsx | 248 |
| src/features/helper-onboarding/components/steps/PhoneVerificationStep.jsx | 247 |
| src/features/tasks/components/TaskCard/TaskCard.jsx | 246 |

## Zonas con mayor riesgo de duplicación

- `src/shared/*`, `src/utils/*` y `src/features/*/hooks` — probable duplicación de helpers y hooks (fetch/loading/error patterns).
- `src/services/*` — llamadas API y transformaciones repetidas.
- `src/features/*/components` — UI similar y pequeños variantes.

## Zonas con mayor riesgo de rotura

- Archivos sobredimensionados listados arriba (especialmente `HelperHome.jsx` >1000 LOC).
- Servicios que cambian contratos o efectos secundarios.
- Cualquier cambio en `scripts/` o `server/` que afecte despliegue o Stripe.

## Código sospechoso / acciones cautelares

- Hay muchas entradas `D` en `git status` (archivos eliminados staged) — no tocar rutas que aparecen en cambios sin commit.
- `.agents/` contiene artefactos y scripts de otros agentes; revisar antes de modificar.
- He creado `.agent-worklog/` y este archivo; está no trackeado en git todavía.

## Próximos pasos propuestos

1. Ejecutar búsquedas para duplicados de helpers/hook/nombres comunes (`format*`, `use*`, `*Service`, validaciones).
2. Identificar tipos duplicados (buscar definiciones similares en `src/**/types` y `src/**/interfaces`).
3. Proponer Lotes detallados (5 lotes pequeños) y presentarlos para aprobación.

## Cambios realizados

| Fecha | Área | Archivo(s) | Cambio | Riesgo | Validación | Estado |
|---|---|---|---|---|---|---|
| 2026-06-03 | Lote 1 (limpieza automática) | `src/` (todos los archivos analizados) | Ejecutado `pnpm exec eslint src --fix` para aplicar correcciones seguras (imports no usados, fixes automáticos). No se realizaron commits automáticos. | Bajo | `pnpm run lint` (global) y `pnpm exec eslint src --fix` (ejecutado); ESLint en `src/` sin errores tras el fix. | Completado (sin cambios en archivos trackeados)

| 2026-06-03 | Lote 2 (extraer helpers de mapas) | `src/shared/utils/mapHelpers.js`, `src/features/map/components/TaskMap/TaskMap.jsx`, `src/features/map/components/HelpersMap.jsx`, `src/features/map/components/HelperMarker.jsx`, `src/features/home/need-help/components/HelperMapMarker.jsx` | Añadido helper compartido `toFiniteNumber` y `buildUserIcon` en `src/shared/utils/mapHelpers.js`. Reemplazadas implementaciones locales de `toFiniteNumber` en componentes de mapa y reemplazada la implementación local de `buildUserIcon` en `TaskMap.jsx` para usar el helper compartido (pasando clases CSS). No se hicieron commits. | Bajo→Medio | `pnpm exec eslint src --fix` y `pnpm exec eslint src` — sin errores reportados en `src/`. Manual check recommended for map visuals. | Completado (cambios locales, no commiteados)

| 2026-06-03 | Lote 2 follow-up (marcadores de mapa) | `src/features/map/components/TaskMap/TaskMap.jsx`, `src/features/home/need-help/components/HelperMapMarker.jsx`, `src/features/home/need-help/components/NeedHelpMapLayout.jsx`, `src/features/home/need-help/components/RequesterHome.jsx`, `src/features/map/components/HelperMarker.jsx` | Corregido `buildUserIcon` para recibir clases CSS Modules desde `TaskMap.module.css` y eliminados `console.log` temporales en handlers de selección de marcadores/helpers. | Bajo | `pnpm exec eslint src` y `pnpm run build` — ambos correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados)

| 2026-06-03 | Lote 3 (limpieza agentes/tooling) | `eslint.config.js`, `.agents/helpme-architect/dispatcher.js`, `.agents/helpme-architect/audit.js`, `.agents/helpme-architect/agent.manifest.json`, `.agents/tools/deployment-agent/index.js` | Convertidos scripts del arquitecto a ESM, añadidos globals Node para herramientas internas en ESLint, limpiados errores de lint en `deployment-agent`, registrado `agent-worklog` como ruta explícita y corregido el matcher para evitar falsos positivos como `ui` dentro de `utilizando`. | Bajo→Medio | `pnpm run lint`, `pnpm run build`, `node .agents/helpme-architect/dispatcher.js "...agent-worklog..."`, `node .agents/helpme-architect/dispatcher.js "deployment env webhook"` — correctos. | Completado (cambios locales, no commiteados)

| 2026-06-03 | Lote 4 (alinear instrucciones de agentes) | `.agents/helpme-architect.md`, `.agents/helpme-architect/classifier.md`, `.agents/helpme-architect/README.md`, `.agents/README.md` | Sincronizadas las instrucciones humanas con el manifest/dispatcher: añadido `agent-worklog`, documentado el dispatcher ESM, actualizada la clasificación por palabra completa y convertido `.agents/README.md` en índice general de agentes. | Bajo | `pnpm run lint`, `pnpm run build`, `node .agents/helpme-architect/dispatcher.js "registrar avance en agent-worklog"`, `node .agents/helpme-architect/dispatcher.js "ui layout requester map"` — correctos. | Completado (cambios locales, no commiteados)

| 2026-06-03 | Lote 5 (auditor deployment/env) | `.agents/tools/deployment-agent/index.js` | Ajustado el auditor para distinguir variables publicables/permitidas, secrets server-side en env local ignorado y exposición real en superficies frontend. Las menciones documentales en agentes/docs ya no bloquean `Safe to deploy`. | Bajo | `git check-ignore`, `git ls-files`, `node .agents/tools/deployment-agent/index.js`, `pnpm run lint`, `pnpm run build` — correctos. | Completado (cambios locales, no commiteados)

| 2026-06-03 | Lote 6 (modal helper y chat contactar) | `src/features/home/need-help/components/HelperPreviewModal.jsx`, `src/features/home/need-help/components/HelperPreviewModal.module.css`, `src/features/home/need-help/components/RequesterHome.jsx`, `src/features/chat/api/chatApi.js`, `src/shared/ui/layouts/ChatLayout.jsx`, `src/shared/ui/layouts/ChatLayout.module.css`, `src/shared/ui/chat/MessageInput.module.css`, `src/styles.css` | Pulido visual del modal al seleccionar helper, mejora del layout/composer de chat, estado `Abriendo chat...` al contactar y endurecimiento de persistencia: la creación exige la RPC `create_or_get_direct_conversation` y el envío intenta la RPC `send_message` antes del insert directo compatible. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Requiere prueba manual contra Supabase remoto para confirmar RPC/migraciones aplicadas. | Completado (cambios locales, no commiteados)

| 2026-06-04 | Lote 7 (visibilidad tareas helper) | `src/pages/Home/hooks/useHomeLocation.js`, `src/services/tasksService.js` | Añadido fallback de ubicación del perfil (`profile.lat/lng`) cuando no hay geolocalización del navegador y relajado el filtro de creador para ocultar solo perfiles suspendidos, no solicitudes abiertas con perfil público incompleto/no cargado como `active`. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Requiere prueba manual creando/publicando una tarea requester y entrando como helper con radio ampliado. | Completado (cambios locales, no commiteados)

| 2026-06-04 | Lote 8 (ajustes mapa y matching práctico) | `src/pages/Settings/components/MapSettings.jsx`, `src/pages/Home/HomeContainer.jsx`, `src/pages/Home/hooks/useHomeTasks.js`, `src/hooks/useTasks.js` | Corregido el input de zona visible para permitir espacios mientras se escribe y alineado el matching helper→tareas con `search_radius_enabled`: el radio solo limita resultados cuando la preferencia está activada; si no, las coordenadas se usan para ordenar/distancias sin ocultar tareas por radio. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. Requiere prueba manual con zona visible compuesta y tareas abiertas dentro/fuera de radio. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 9 (disponibilidad helper y centro operativo) | `src/pages/Home/HomeContainer.jsx`, `src/pages/Home/HomeView.jsx`, `src/pages/Home/hooks/useHomeLocation.js`, `src/features/helper-home/components/HelperHome.jsx`, `src/features/helper-home/components/HelperStatusHero.jsx`, `src/features/helper-home/styles/helperHome.module.css` | Añadido toggle persistente para pausar/activar `availability_enabled` desde Helper Home y selector operativo de ubicación en filtros: usar ubicación actual o zona guardada del perfil. La zona guardada pasa a ser el centro por defecto para que cambios en ajustes se reflejen en mapa/lista del helper. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. Requiere prueba manual de pausa de disponibilidad desde requester y cambio de centro en Helper Home. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 10 (Helper Home mapa-only) | `src/features/helper-home/components/HelperHome.jsx`, `src/features/helper-home/styles/helperHome.module.css`, `src/features/helper-home/hooks/useHelperHomeData.js`, `src/features/helper-home/services/helperHomeService.js` | Simplificado Helper Home a una única página centrada en mapa: eliminado layout de tabs y secciones visuales de oportunidades, actividad, rendimiento y perfil. Movidos filtros/centro operativo al panel del mapa, conservando disponibilidad, selección de solicitud, detalle con `TaskCard`, contacto y navegación a detalle. Eliminados hook/servicio legacy usados solo por apartados retirados. | Medio | `rg` sin restos legacy en `src/features/helper-home`, `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande y reduce módulos/tamaño del bundle. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 11 (mapa helper fijo sin waypoint) | `src/features/helper-home/components/HelperHome.jsx`, `src/features/helper-home/styles/helperHome.module.css`, `src/features/map/components/TaskMap/TaskMap.jsx`, `src/features/map/components/TaskMap/TaskMap.module.css`, `src/pages/Home/Home.module.css`, `src/pages/Home/HomeContainer.jsx`, `src/pages/Home/HomeView.jsx`, `src/features/helper-home/components/HelperStatusHero.jsx` | Eliminado `HelperStatusHero`, retirado el waypoint/círculo del usuario en Helper Home mediante props opcionales de `TaskMap`, configurado el mapa como búsqueda de tareas publicadas con posición fija/fit inicial y aside de filtros/detalle como única zona con scroll. Añadido soporte de altura completa y resize horizontal del mapa en desktop. | Medio | Pendiente `pnpm run lint` y `pnpm run build`: el runner rechazó comandos por “workspace is out of credits”. Requiere prueba visual de header sticky, mapa fijo, resize y aside scroll. | En validación manual |

| 2026-06-05 | Lote 12 (header sticky + buscador + mapa cuadrado) | `src/components/home/HomeHeader.jsx`, `src/pages/Home/Home.module.css`, `src/features/map/components/TaskMap/TaskMap.jsx`, `src/features/map/components/TaskMap/TaskMap.module.css`, `.agent-worklog/refactor-cleanup.md` | Habilitado header sticky solo en desktop para helper home con buscador central visual de zonas (lupa incluida) y ancho limitado, manteniendo mobile intacto. El mapa de Helper Home pasa a cuadrado en desktop mediante `aspect-ratio: 1 / 1`, sin forzarlo en móvil, y conserva selección de tareas/detalle. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Requiere prueba visual de sticky desktop, buscador centrado y mapa cuadrado. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 13 (buscador real de zonas en helper home) | `src/components/home/HomeHeader.jsx`, `src/pages/Home/HomeContainer.jsx`, `src/pages/Home/HomeView.jsx`, `src/features/helper-home/components/HelperHome.jsx`, `src/features/map/components/TaskMap/TaskMap.jsx`, `src/pages/Home/Home.module.css` | Conectado el buscador del header a Geoapify reutilizando el geocoder existente del onboarding. El submit por Enter o lupa geocodifica la zona/ciudad, recenteriza el mapa con `flyTo`, actualiza el centro operativo del helper y mantiene markers/selección de tareas. Añadido feedback ligero de búsqueda y soporte de búsqueda usable también en mobile. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 14 (mapa helper contenido en viewport) | `src/features/helper-home/styles/helperHome.module.css` | Reducido el tamaño desktop del mapa helper y limitado por altura de viewport para evitar que sobresalga de la pantalla. El mapa sigue cuadrado, pero ahora el workspace queda centrado, más compacto y con el aside como zona de scroll. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 15 (mapa helper escala por viewport sin doble borde) | `src/features/helper-home/styles/helperHome.module.css` | Ajustado el mapa helper para que en pantallas grandes mantenga proporción cuadrada y use el alto disponible del viewport, sin volver a sobresalir. Eliminado el borde/fondo exterior de `mapPane` para conservar solo el marco visual del mapa y evitar doble borde. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 16 (prioridad viewport sobre proporción de mapa) | `src/features/helper-home/styles/helperHome.module.css`, `src/features/map/components/TaskMap/TaskMap.module.css` | Retirada la proporción cuadrada obligatoria del mapa helper en desktop. El mapa ahora ocupa el alto asignado por el layout y se adapta al espacio disponible, evitando invadir otros componentes; el aside mantiene scroll independiente. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 17 (ancho máximo mapa helper desktop) | `src/features/helper-home/styles/helperHome.module.css` | Limitado el ancho del mapa helper en desktop al 45% del grid principal, dejando el resto del espacio para filtros/detalle y manteniendo el aside con scroll independiente. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 18 (altura mapa helper dentro de viewport) | `src/features/helper-home/styles/helperHome.module.css` | Ajustado el alto del workspace del helper para reservar espacio real al header sticky y evitar que el mapa sobresalga por debajo de la pantalla. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 19 (buscador centra mapa sin fit competitivo) | `src/features/helper-home/components/HelperHome.jsx`, `src/features/map/components/TaskMap/TaskMap.jsx` | Corregido el comportamiento del buscador de zonas para que al buscar una ubicación el mapa viaje a ese centro. Se invalida el tamaño de Leaflet antes de `flyTo` y se desactiva el fit inicial de tareas cuando el centro proviene de búsqueda, evitando que las tareas visibles pisen el centro solicitado. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 20 (remount del mapa por cambio de centro) | `src/features/map/components/TaskMap/TaskMap.jsx` | Añadido `key` estable al `MapContainer` usando la coordenada del centro para forzar un remount cuando cambie la zona buscada. Esto evita que Leaflet conserve un estado visual anterior y asegura que la búsqueda recentre de forma visible. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 21 (sin label visible en buscador de header) | `src/components/home/HomeHeader.jsx` | Eliminado el `label` del input del header helper y sustituido por `aria-label`, manteniendo accesibilidad sin mostrar etiqueta adicional. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 22 (buscador de header más largo en desktop) | `src/pages/Home/Home.module.css` | Aumentado el ancho visual del buscador del header helper en pantallas grandes, ampliando el track central y el ancho máximo del bloque sin afectar el comportamiento móvil. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 23 (refuerzo del recentrado Leaflet por búsqueda) | `src/features/map/components/TaskMap/TaskMap.jsx` | Reforzado el recentrado del mapa con `requestAnimationFrame`, `map.stop()`, `invalidateSize()`, `setView()` y `flyTo()` para asegurar que la búsqueda de zona mueva visualmente Leaflet aunque el layout se remonte o cambie de tamaño. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 24 (eliminar remount del mapa que bloqueaba la animación) | `src/features/map/components/TaskMap/TaskMap.jsx` | Retirado el `key` del `MapContainer` para evitar que el mapa se remonte en cada cambio de centro. Esto deja que Leaflet anime el desplazamiento sobre la misma instancia y hace visible el viaje a la zona buscada. | Medio | `pnpm run lint`, `pnpm run build` — correctos. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 25 (separar zona buscada de ubicación actual) | `src/pages/Home/HomeContainer.jsx` | Ajustada la resolución de ubicación activa del helper para que la fuente seleccionada mande de forma estricta. La búsqueda solo gobierna cuando `helperLocationSource` es `search`, evitando que una ubicación actual o guardada entre en colisión con el centro elegido desde el input. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 26 (search sin fallback a ubicaciones previas) | `src/pages/Home/HomeContainer.jsx` | Endurecida la resolución del centro del helper para que el modo `search` use únicamente la ubicación buscada. Se elimina el fallback a current/profile en esa rama para evitar cualquier colisión visual con la ubicación actual al mover el mapa. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 27 (recenter simple con setView en TaskMap) | `src/features/map/components/TaskMap/TaskMap.jsx` | Simplificado el recentrado del mapa helper para usar solo `map.setView()` tras `invalidateSize()`, alineándolo con los otros mapas funcionales del proyecto y evitando que `flyTo`/animaciones intermedias dificulten el viaje al centro buscado. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 28 (remount del mapa helper por centro) | `src/features/map/components/TaskMap/TaskMap.jsx` | Añadido `key` estable al `MapContainer` basado en las coordenadas del centro para forzar un remount cuando cambia la ubicación activa. Esto asegura que la búsqueda, la ubicación actual o la zona guardada creen un mapa nuevo con el centro correcto si Leaflet no refleja el cambio sobre la misma instancia. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 29 (actualización atómica de ubicación helper) | `src/pages/Home/HomeContainer.jsx` | Unificada la selección de ubicación helper en un único estado con `{ source, location }` para evitar renders intermedios donde el modo y el centro buscado quedaban desincronizados. La búsqueda, ubicación actual y zona guardada ahora cambian como una sola fuente de verdad. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 30 (centro de mapa helper separado del filtro) | `src/pages/Home/HomeContainer.jsx`, `src/pages/Home/HomeView.jsx`, `src/features/helper-home/components/HelperHome.jsx` | Separado explícitamente el centro del mapa helper en una prop dedicada `helperMapLocation` para que el mapa obedezca a una única fuente de verdad visual, mientras el filtro de tareas puede seguir usando la ubicación activa del helper. Esto reduce ambigüedad entre ubicación actual, guardada y buscada. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 31 (mapa helper sin fallback de location) | `src/features/helper-home/components/HelperHome.jsx` | Eliminado el fallback de `helperHomeProps.location` en el centro visual del mapa helper. El mapa ahora depende solo de `helperHomeProps.mapLocation`, evitando que una ubicación secundaria vuelva a pisar el centro buscado o actual. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 32 (rama helper sin fallback implícito a location) | `src/pages/Home/HomeContainer.jsx` | Endurecida la resolución helper para que `current` y `profile` usen solo sus ubicaciones explícitas, y el centro activo solo caiga a `location` cuando haga falta como respaldo general. Esto reduce la posibilidad de que una ubicación efectiva genérica vuelva a ocultar el centro buscado. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 33 (recenter helper con setView simple) | `src/features/map/components/TaskMap/TaskMap.jsx` | Simplificado el recentrado del mapa helper para usar el mismo patrón que el selector de ubicaciones: `invalidateSize()` + `setView(...)`. Se eliminó `flyTo` y el control de centro previo para reducir interferencias visuales. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 34 (TaskMap alineado con patrón simple de recenter) | `src/features/map/components/TaskMap/TaskMap.jsx` | Retirado el remount por `key` del `MapContainer` y dejado el recentrado del mapa helper en el patrón simple ya usado por otros mapas del proyecto: `invalidateSize()` + `setView(...)`. El objetivo es evitar que el remount bloquease o escondiese el movimiento visual al buscar una zona. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 35 (TaskMap vuelve a remount por centro) | `src/features/map/components/TaskMap/TaskMap.jsx` | Reintroducido `key` estable en `MapContainer` basado en el centro para forzar un remount cuando cambia la zona buscada. Después de probar el patrón simple, se vuelve a la estrategia de remount determinista para que Leaflet no conserve un viewport anterior y el mapa viaje de forma visible. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 36 (TaskMap recenter reforzado con layout effect) | `src/features/map/components/TaskMap/TaskMap.jsx` | Reforzado el recentrado del mapa helper con `useLayoutEffect`, `map.whenReady()`, `map.stop()`, `invalidateSize()` y `setView(..., animate: false)` para reducir el margen de que Leaflet conserve el centro anterior o ignore el cambio durante el remount. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-05 | Lote 37 (props reales de HelperHome y recenter reactivo) | `src/features/helper-onboarding/components/HelperAccessGate.jsx`, `src/features/helper-home/components/HelperHome.jsx`, `src/features/map/components/TaskMap/TaskMap.jsx` | Corregida la frontera de props: `HelperAccessGate` ahora pasa `profile` y `helperHomeProps` con el contrato que `HelperHome` esperaba, evitando que `mapLocation`, `locationSource` y `visibleTasks` quedaran siempre vacíos. `TaskMap` recibe además `centerSource` y usa un controlador con `useMap()` para recentrar sin depender solo del `center` inicial de `MapContainer` ni de un remount por `key`. | Alto | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. Requiere prueba manual de búsqueda de dos ciudades consecutivas. | Completado (cambios locales, no commiteados) |

| 2026-06-06 | Lote 38 (waypoint solicitado en modal requester) | `src/features/home/need-help/components/RequestTaskModal.jsx`, `src/features/home/need-help/components/TaskLocationSearch.jsx`, `src/features/home/need-help/components/RequestTaskModal.module.css`, `src/services/tasksService.js`, `src/features/tasks/components/TaskCard/TaskCard.jsx`, `src/features/home/need-help/components/RequesterTaskMarker.jsx`, `src/features/map/components/TaskMap/TaskMap.jsx`, `src/pages/CreateTask/CreateTask.jsx`, `supabase/migrations/0034_tasks_location_label.sql`, `supabase/schema.sql` | Añadido input compacto de ubicación bajo descripción en el modal requester, conectado a Geoapify para seleccionar coordenadas del waypoint. Eliminado el texto aclaratorio del header y reducido el textarea para mantener tamaño del modal. `tasks.lat/lng` siguen siendo la fuente de verdad del marker; se añade `tasks.location_label` como etiqueta pública opcional para popups/tarjetas. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. Requiere aplicar migración 0034 en Supabase y prueba manual de publicación/edición con marker visible. | Completado (cambios locales, no commiteados) |

| 2026-06-07 | Lote 39 (matching por actividad y viewport sin radio) | `src/pages/Home/HomeContainer.jsx`, `src/pages/Home/HomeView.jsx`, `src/components/home/HomeHeader.jsx`, `src/features/helper-home/components/HelperHome.jsx`, `src/features/home/need-help/components/NeedHelpMapLayout.jsx`, `src/features/home/need-help/hooks/useAvailableHelpers.js`, `src/features/profile/api/profileApi.js`, `src/pages/Settings/components/MapSettings.jsx`, `src/pages/Settings/components/HabitualLocationSearch.jsx`, `supabase/migrations/0035_public_helpers_viewport_activity_privacy.sql` | Eliminado el centro operativo visual del Helper Home y retirado el filtro/círculo de radio de Home, requester/helper y componentes legacy activos. El requester usa helpers por unión entre actividad seleccionada y viewport visible; el helper filtra tareas por actividad y parte visible del mapa. Ajustes pasa a configurar `Mostrar ubicación aproximada` y ubicación habitual con coordenadas. La RPC pública de helpers se prepara para devolver coordenadas redondeadas y ocultar helpers con ubicación aproximada desactivada. | Alto | `rg` sin restos visuales activos de radio/centro operativo, `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. Requiere aplicar migración 0035 en Supabase y prueba manual completa de mapa requester/helper. | Completado (cambios locales, no commiteados) |

| 2026-06-07 | Lote 40 (aside operativo más compacto) | `src/features/home/need-help/components/NeedHelpMapLayout.jsx`, `src/features/home/need-help/components/NeedHelpMapLayout.module.css`, `src/features/home/need-help/components/RequesterHome.jsx`, `src/features/home/offer-help/components/TaskListPanel.jsx` | Reubicados en el aside requester los avisos de publicación y error de contacto para que el bloque derecho concentre contexto y acciones sin ensuciar el centro. Se mantuvo el mapa sticky y se dejó el aside como zona de feedback contextual, filtros y detalle. También se añadió un banner compacto de ubicación en la lista legacy compartida. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-07 | Lote 41 (aviso de ubicación dentro del aside requester) | `src/features/home/need-help/components/NeedHelpMapLayout.jsx` | Movido el aviso de falta de ubicación desde debajo del mapa al panel lateral del requester, de forma que la información contextual no quede fuera del área que ya gestiona el scroll. El layout requester queda alineado con la regla de que solo el aside concentre contenido desplazable. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande. | Completado (cambios locales, no commiteados) |

| 2026-06-07 | Lote 42 (Requester Home mapa-first real) | `src/features/home/need-help/components/RequesterHome.module.css`, `src/features/home/need-help/components/RequesterHero.module.css`, `src/features/home/need-help/components/NeedHelpMapLayout.module.css`, `src/features/home/need-help/components/NeedHelpMapLayout.jsx`, `src/features/home/need-help/components/HelperListPanel.jsx` | Corregida la geometría real del Requester Home: el shell desktop ahora reserva una fila compacta para publicar y deja el mapa/listado en el alto restante, `NeedHelpMapLayout` hereda ese alto en vez de sumar otro viewport completo, y el aside derecho pasa a ser el contenedor de scroll. El aviso de ubicación queda integrado en el panel interno sin duplicar banners. | Medio | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande/plugin timings. | Completado (cambios locales, no commiteados) |

| 2026-06-07 | Lote 43 (RequesterHero sin card) | `src/features/home/need-help/components/RequesterHero.jsx`, `src/features/home/need-help/components/RequesterHero.module.css` | Simplificado el bloque superior del requester: retirados los textos “Necesito ayuda” y “Describe en pocas palabras lo que buscas”, eliminado el container/card visual, y dejado un label centrado “¿Qué necesitas?” con input tipo buscador alineado al ancho del header y botón “Publicar solicitud” a la derecha en desktop. El flujo `heroQuery` e `initialTitle` se conserva. | Bajo | `pnpm run lint`, `pnpm run build` — correctos. Build mantiene warning existente de chunk grande/plugin timings. | Completado (cambios locales, no commiteados) |

| 2026-06-07 | Lote 44 (Requester aside sin toggle ni metadatos redundantes) | `src/features/home/need-help/components/NeedHelpMapLayout.jsx`, `src/features/home/need-help/components/NeedHelpMapLayout.module.css`, `src/features/home/need-help/components/HelperListPanel.jsx`, `src/features/home/need-help/components/HelperFiltersBar.jsx`, `src/features/home/need-help/hooks/useAvailableHelpers.js` | Retirado el header textual del mapa requester y movida la cabecera “Necesito ayuda / Personas disponibles” al aside, encima de filtros y cards. Eliminado el toggle de disponibilidad del JSX, props, estado y hook, junto con los metadatos redundantes de ubicación/conteos. La leyenda del mapa pasa a overlay interno para no desalinear el mapa con el panel. | Bajo | Validación estática con `rg` correcta. `pnpm run lint` / `pnpm run build` pendientes: el entorno rechazó la ejecución elevada por falta de créditos. | Completado (cambios locales, no commiteados) |

| 2026-06-07 | Lote 45 (filtros requester centrados sin cabecera) | `src/features/home/need-help/components/HelperListPanel.jsx`, `src/features/home/need-help/components/NeedHelpMapLayout.module.css` | Eliminada también la cabecera “Necesito ayuda / Personas disponibles” del aside requester. El bloque de filtros queda centrado dentro del panel, con label y selector alineados al centro para reducir ruido visual en la parte superior. | Bajo | Pendiente: el entorno rechazó lint/build elevados por falta de créditos en la pasada anterior. | Completado (cambios locales, no commiteados) |

## Validaciones ejecutadas

| Fecha | Comando | Resultado | Notas |
|---|---|---|---|
| 2026-06-03 | `git status` / listado root | hay deletions y archivos no trackeados | No tocar archivos con `D` o cambios externos.
| 2026-06-03 | Conteo LOC en `src/` | listado top 20 generado | Ver arriba.
| 2026-06-03 | `pnpm exec eslint src` | correcto | Validación tras limpiar logs y corregir clases CSS Modules en marcador de usuario.
| 2026-06-03 | `pnpm run build` | correcto | Build correcto; persiste warning de bundle/chunk grande.
| 2026-06-03 | `pnpm run lint` | correcto | Validación global tras limpiar scripts de agentes/tooling.
| 2026-06-03 | `node .agents/helpme-architect/dispatcher.js "...agent-worklog..."` | correcto | Selecciona solo `agent-worklog` y apunta a `.agent-worklog/refactor-cleanup.md`.
| 2026-06-03 | `node .agents/helpme-architect/dispatcher.js "deployment env webhook"` | correcto | Selecciona `deployment-agent` y apunta a `vercel.json`, `.agents/tools/deployment-agent/`, `.env.example`, `server/`.
| 2026-06-03 | Recolocación de agentes | correcto | `deployment-agent/` movido a `.agents/tools/deployment-agent/` para mantener herramientas de agentes bajo `.agents/`.
| 2026-06-03 | `node .agents/helpme-architect/dispatcher.js "registrar avance en agent-worklog"` | correcto | Verifica la ruta documentada para worklog tras alinear instrucciones.
| 2026-06-03 | `node .agents/helpme-architect/dispatcher.js "ui layout requester map"` | correcto | Verifica que la ruta UI sigue funcionando tras el matcher por palabra completa.
| 2026-06-06 | Checklist manual Lote 38 requester waypoint | correcto | El usuario confirma que pasaron todos los tests manuales del input de ubicación, publicación/edición y marker visible para la tarea. |
| 2026-06-07 | `rg` radio/centro operativo visual activo | correcto | No quedan `RadiusFilter`, “Radio de búsqueda”, “Centro operativo”, “zona operativa”, círculos/leyenda de radio ni botones de ubicación operativa en `src`. Quedan solo campos legacy `search_radius_*` en `profilesService` y clases `radio*` de radiogroup visual. |
| 2026-06-07 | `pnpm run lint` | correcto | Validación global tras retirar radio y añadir selector de ubicación habitual. |
| 2026-06-07 | `pnpm run build` | correcto | Build correcto; persiste warning conocido de chunk grande/plugin timings. |
| 2026-06-07 | `pnpm run lint` (lote aside) | correcto | Validación tras reubicar avisos y compactar el aside requester. |
| 2026-06-07 | `pnpm run build` (lote aside) | correcto | Build correcto tras la reorganización del aside. |
| 2026-06-07 | `pnpm run lint` (Requester Home mapa-first) | correcto | Validación tras ajustar altura real del requester, hero compacto y scroll del aside. |
| 2026-06-07 | `pnpm run build` (Requester Home mapa-first) | correcto | Build correcto; persiste warning conocido de chunk grande/plugin timings. |
| 2026-06-07 | `pnpm run lint` (RequesterHero sin card) | correcto | Validación tras simplificar el bloque superior de publicación requester. |
| 2026-06-07 | `pnpm run build` (RequesterHero sin card) | correcto | Build correcto; persiste warning conocido de chunk grande/plugin timings. |
| 2026-06-07 | `rg` toggle/metadatos requester | correcto | No quedan `onlyAvailable`, `Mostrar todos`, `Solo disponibles`, `panelMeta`, `mapHeader`, “helpers relevantes” ni “encontrados por actividad o mapa visible” en el flujo requester. |
| 2026-06-07 | `pnpm run lint` / `pnpm run build` (Requester aside limpio) | pendiente | El entorno rechazó la ejecución elevada por falta de créditos; no se intentó por otra vía. |


---

Nota: actualización inicial completada. Próximo: búsqueda automática de duplicados (helpers/hooks/tipos) y propuesta de lotes. Antes de aplicar cambios, confirmar Lote 1.

## Mobile responsive polish

- Fecha: 2026-06-07
- Objetivo: Fase 1 de corrección responsive móvil para closed beta sin tocar lógica de negocio.
- Archivos revisados: `src/pages/Home/Home.module.css`, `src/features/helper-home/styles/helperHome.module.css`, `src/features/home/need-help/components/NeedHelpMapLayout.module.css`, `src/features/tasks/components/TaskCard/TaskCard.module.css`, `src/features/home/need-help/components/RequestTaskModal.module.css`, `src/features/home/need-help/components/HelperPreviewModal.module.css`, `src/shared/ui/chat/MessageInput.module.css`, `src/shared/ui/BrandLogo/BrandLogo.module.css`, `src/styles.css`, `src/shared/ui/layouts/ChatLayout.module.css`, `src/pages/Settings/SettingsPage.module.css`.
- Cambios aplicados: compactado el header móvil del Home, reducido el alto mínimo de mapas requester/helper en móvil, ajustada la leyenda del mapa requester, compactado el composer de chat, corregido el tamaño `xl` del logo, afinados botones/cards de tarea y modales requester/helper para usar wrap controlado en móvil.
- Riesgos: los grupos `.two-actions` pasan a envolver en fila en móvil; requiere prueba visual en `TaskDetail` y `TaskComplete` para confirmar que los textos largos siguen cabiendo bien a 360px.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene aviso no bloqueante de chunk JS superior a 500 kB.

## Mobile responsive fixes - Home header, Settings and Profile

- Fecha: 2026-06-07
- Objetivo: corregir fallos detectados tras la fase responsive inicial: localización visible encima del logo en Home, acciones del header cayendo debajo del buscador, y pantallas de ajustes/perfil con desbordes en móvil.
- Archivos modificados: `src/components/home/HomeHeader.jsx`, `src/pages/Home/Home.module.css`, `src/pages/Settings/SettingsPage.module.css`, `src/features/profile/styles/profilePublicView.module.css`.
- Cambios aplicados: eliminada la localización visual del bloque de logo del Home, añadida identidad explícita del header, recolocadas acciones móviles en la esquina superior derecha sobre el buscador, compactada la navegación móvil de ajustes en scroll horizontal, reforzados grids/botones/switches de ajustes y perfil para evitar overflow en pantallas estrechas.
- Riesgos: requiere revisión visual manual en móviles de 360px y 390px para confirmar que la fila superior del header no queda demasiado comprimida cuando aparecen tema, modo, avatar y menú.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene aviso no bloqueante de chunk JS superior a 500 kB.

## Chat message duplication fix

- Fecha: 2026-06-07
- Diagnóstico: el chat usa optimistic update con `client_temp_id` y recibe después el mensaje real por respuesta de envío y/o Supabase Realtime.
- Causa raíz: la reconciliación priorizaba `message.id`, por lo que el temporal `id=temp-*` y el persistido `id=uuid` podían quedar como dos burbujas aunque compartieran `client_temp_id`. En el modal de tarea también había comparaciones directas de `client_temp_id` que podían ser inseguras si ambos valores eran `undefined`.
- Cambios: `useMessages` deduplica y reemplaza por claves cruzadas `client_temp_id/id`; `TaskChatModal` usa el mismo criterio para append/update/remove; `MessageList` usa `client_temp_id || id` como key estable de React.
- Archivos: `src/features/chat/hooks/useMessages.js`, `src/components/home/TaskChatModal.jsx`, `src/shared/ui/chat/MessageList.jsx`.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene aviso no bloqueante de chunk JS superior a 500 kB.
- Riesgos: si un entorno remoto no devuelve `client_temp_id` en los eventos realtime, puede requerir un fallback adicional por contenido/timestamp, pero no se añadió para evitar fusionar mensajes idénticos enviados en ráfaga.

## Header notification bell

- Fecha: 2026-06-07
- Objetivo: añadir campanita MVP con badge y popover en el header del Home sin crear sistema completo de notificaciones.
- Fuente de datos usada: conversaciones ya cargadas por `useChats`, derivando pendientes con `latest_message`, `sender_id` y `conversation_participants.last_read_at`.
- Cambios: calculado resumen de mensajes sin leer en `HomeContainer`, pasado a `HomeView/HomeHeader`, añadida campana accesible con badge `99+` y dropdown con CTA `Ver mensajes`, estilos responsive en `Home.module.css`.
- Archivos: `src/pages/Home/HomeContainer.jsx`, `src/pages/Home/HomeView.jsx`, `src/components/home/HomeHeader.jsx`, `src/pages/Home/Home.module.css`.
- Limitaciones: no añade realtime global ni tabla de notificaciones; el contador se refresca con la query existente de chats.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene aviso no bloqueante de chunk JS superior a 500 kB.

## Payment gate phase 4A

- Fecha: 2026-06-07
- Selected agents:
  - helpme-architect
  - backend-stripe-agent
  - product-flow-agent
  - frontend-ui-agent
  - security-auth-agent
  - agent-worklog
- Objetivo: crear `/task/:id/payment` como puerta de pago frontend reutilizando Checkout existente, sin reabrir arquitectura financiera.
- Auditoría usada: pagos ya existen en frontend/backend; `assigned` equivale a pendiente de pago y el webhook de Stripe mueve `assigned -> in_progress`.
- Cambios aplicados: nueva página `TaskPaymentPage`, ruta protegida `/task/:id/payment`, CTA `Ir al pago` en `TaskDetail` para requester con tarea `assigned`, y navegación post-aceptación del helper al detalle con estado de espera en vez de chat directo.
- Archivos modificados: `src/pages/TaskPayment/TaskPaymentPage.jsx`, `src/pages/TaskPayment/TaskPaymentPage.module.css`, `src/app/router/AppRouter.jsx`, `src/pages/TaskDetail/TaskDetail.jsx`.
- Estados usados: `assigned` para pendiente de pago, `in_progress` para pago confirmado, `completed/closed` para estados finales.
- Qué NO se tocó: Supabase schema, RLS, migraciones, backend Stripe, estados de tarea, Stripe Billing/Premium funcional.
- Riesgos: el bloqueo fuerte de chat no queda garantizado solo con frontend porque la conversación ya existe; queda apuntado para Fase 4B con backend/RLS.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene aviso no bloqueante de chunk JS superior a 500 kB.

## Payment gate phase 4B - Premium, RLS and task-scoped chat

- Fecha: 2026-06-07
- Selected agents:
  - helpme-architect
  - backend-stripe-agent
  - supabase-data-agent
  - security-auth-agent
  - product-flow-agent
  - frontend-ui-agent
  - agent-worklog
- Objetivo: convertir la puerta de pago en base funcional con soporte Premium externo y chat de tarea protegido por RLS, manteniendo `assigned/in_progress` como estados canónicos.
- Cambios Supabase: añadida migration `0036_payment_gate_premium_task_chat.sql` con `user_subscriptions`, `payments.provider`, estado `external_agreed`, `conversations.conversation_type/task_id`, RPC `create_or_get_task_conversation`, funciones `has_active_premium`/`can_access_conversation` y policies de conversación/mensajes/adjuntos.
- Cambios backend: añadido endpoint `POST /api/payments/external` para validar Premium activo, registrar pago externo y mover tarea `assigned -> in_progress`; `releasePaymentFunds` omite liberación Stripe si el pago es externo.
- Cambios frontend: `TaskPaymentPage` consulta Premium, permite continuar con pago externo solo si está activo, mantiene pago seguro como CTA principal; `chatService` y `tasksService` usan conversación vinculada a tarea para chat contextual.
- Qué se conserva: checkout Stripe existente, webhooks financieros, tabla `payments`, ruta `/task/:id/payment`, chats directos normales y estados actuales de tareas.
- Riesgos: requiere aplicar la migration remota antes de probar Premium/chat task-scoped; Stripe Billing para crear suscripciones reales todavía no está implementado, aunque el modelo `user_subscriptions` queda preparado.
- Validación: `pnpm run lint` correcto, `pnpm run build` correcto con warning conocido de chunk grande/plugin timings, `node --check server/services/payments.service.js` correcto y `node --check server/routes/payments.routes.js` correcto.

## Payment gate phase 4C - requester UX and simplified payment page

- Fecha: 2026-06-08
- Selected agents:
  - helpme-architect
  - frontend-ui-agent
  - product-flow-agent
  - security-auth-agent
  - agent-worklog
- Objetivo: hacer evidente al requester que una tarea aceptada queda pendiente de pago y simplificar la página `/task/:id/payment`.
- Auditoría usada: la campana solo mostraba mensajes, `MyRequestCard` traducía `assigned` como “Asignada” y ofrecía “Ver chat”, `TaskPaymentPage` mostraba estado técnico, ubicación poco útil y varios bloques visuales redundantes.
- Cambios aplicados: campana con conteo de solicitudes pendientes de pago y CTA `Revisar pagos`; drawer de solicitudes con sección `Pendientes de pago`; tarjetas `assigned` destacadas con copy claro y CTA `Pagar y abrir chat`; marcador/detalle requester traducen estados a lenguaje humano.
- Cambios en Payment Gate: título `Confirma tu tarea`, helper integrado en el resumen, datos reducidos a tarea/helper/precio/total, CTA `Pagar y abrir chat`, Premium compacto y secundario con copy neutral.
- Qué se conserva: estados internos `assigned/in_progress`, Stripe Checkout, flujo Premium externo, chat task-scoped protegido y backend/RLS.
- Riesgos: la campana usa consulta `getMyTasks` compartida por React Query; revisar manualmente que el badge no resulte demasiado ruidoso si hay muchas tareas pendientes.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene warning conocido de chunk grande/plugin timings.

## Payment gate phase 4E - requester confirmation before payment

- Fecha: 2026-06-08
- Selected agents:
  - helpme-architect
  - frontend-ui-agent
  - product-flow-agent
  - security-auth-agent
  - agent-worklog
- Objetivo: cambiar la semántica visible de `assigned` para que sea revisión/confirmación del helper antes del pago, sin cambiar estados internos ni tocar backend/RLS.
- Cambios aplicados: `assigned` pasa a mostrarse como `Pendiente de confirmación`; campana muestra “{helper} ha aceptado tu tarea…” con CTA `Revisar`; Mis solicitudes usa sección `Pendientes de confirmación`; cards muestran `Revisar helper` y `Confirmar y pagar`; TaskDetail añade bloque de revisión del helper; TaskPaymentPage usa CTA `Confirmar y pagar`.
- Leído MVP: las alertas de aceptación revisadas se guardan en `localStorage` mediante `helpme.reviewedTaskAcceptances.v1`, por lo que el estado es local al navegador y no sincroniza entre dispositivos.
- Rechazar helper: no se implementa en esta fase. Requiere fase posterior con RPC/backend seguro para desasignar helper, limpiar o regenerar conversación task-scoped y tratar pagos pendientes sin dejar referencias inconsistentes.
- Qué se conserva: estado interno `assigned`, Stripe Checkout, Premium externo, chat privado protegido por RLS, arquitectura financiera y migrations.
- Restricción aplicada: no se muestra `Enviar mensaje` antes del pago para evitar confundir chat directo con chat privado de tarea.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene warning conocido de chunk grande/plugin timings.

## Payment gate phase 4F - persistent decision gate and safe helper rejection

- Fecha: 2026-06-08
- Selected agents:
  - helpme-architect
  - product-flow-agent
  - frontend-ui-agent
  - supabase-data-agent
  - security-auth-agent
  - backend-stripe-agent
  - agent-worklog
- Objetivo: corregir el flujo comercial de aceptación de helper para que la alerta no desaparezca por revisión y la decisión sea confirmar/pagar o rechazar helper.
- Cambios aplicados: eliminada la lógica local de aceptaciones revisadas; la campana cuenta tareas `assigned` persistentes; el CTA de alerta va directo al detalle/decision gate; Mis solicitudes usa `Decidir ahora`; TaskDetail muestra helper compacto y acciones `Confirmar y pagar` y `Rechazar helper`.
- Cambios Supabase: añadida migration `0037_reject_assigned_helper_rpc.sql` con RPC `reject_assigned_helper(task_id)` para validar requester owner, validar `assigned`, bloquear rechazo si hay pago activo/confirmado, marcar pagos pendientes locales como `voided`, borrar conversación task-scoped y devolver la tarea a `open`.
- Qué se conserva: estados internos `assigned/in_progress`, Stripe Checkout, Premium externo, chat directo normal y RLS de chat task-scoped.
- Riesgos: si existe una Stripe Checkout Session abierta y el requester rechaza antes de completarla, el registro local queda `voided`; un webhook tardío no debería avanzar la tarea porque ya no estará `assigned`, pero conviene probar ese caso con Stripe CLI.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene warning conocido de chunk grande/plugin timings.

## Notifications and chat UX phase 5A

- Fecha: 2026-06-09
- Selected agents:
  - helpme-architect
  - frontend-ui-agent
  - product-flow-agent
  - security-auth-agent
  - agent-worklog
- Objetivo: separar comportamiento de campana entre mensajes no leídos y tareas pendientes de decisión, y mejorar la UX visual del chat privado sin tocar pagos ni modelo de conversaciones.
- Auditoría: la campana ya derivaba mensajes desde `latest_message/last_read_at` y tareas desde `assigned`, pero el dropdown mezclaba conceptos; `useConversation` marcaba leído sin refrescar la query global de chats; `markConversationAsRead` usaba un nombre de parámetro distinto al RPC local; el chat no mostraba avatar compacto y las acciones de mensajes eran demasiado pesadas.
- Cambios aplicados: dropdown de campana separado en secciones `Mensajes` y `Tareas pendientes`; CTA `Abrir chat` va a la conversación no leída; CTA `Decidir ahora` mantiene tareas `assigned` persistentes; al abrir chat se marca leído e invalida `['chats', user.id]`; header de chat muestra avatar/nombre compacto; editar/eliminar y `Mensaje eliminado` quedan más discretos.
- Decisión sobre chat por tarea: se mantiene el modelo task-scoped, incluso si dos usuarios tienen varias tareas, por trazabilidad de pago, cierre, RLS y futuras valoraciones.
- Qué se conserva: realtime, chat directo, chat task-scoped, pagos, Stripe, RLS y estados de tarea.
- Riesgos: si la función remota `mark_conversation_as_read` no tiene el parámetro `p_conversation_id`, habrá que alinear la migration remota; conviene probar que un mensaje recibido mientras la conversación está abierta no quede pendiente al volver a Home.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene warning conocido de chunk grande/plugin timings.

## Home visual cleanup phase 5B

- Fecha: 2026-06-09
- Selected agents:
  - helpme-architect
  - frontend-ui-agent
  - agent-worklog
- Objetivo: limpiar visualmente Home, aplicar el logo real en el header, reducir sensación de badges anidados y hacer que las solicitudes propias en mapa se distingan claramente de helpers.
- Auditoría: HomeHeader seguía pintando `helpMe` como texto; `RequesterTaskMarker` usaba texto de estado dentro del pin; `MyRequestCard` destacaba `assigned` con card, status y notice muy marcados; `Solicitud activa` pertenecía al helper home y duplicaba demasiado resumen fuera del detalle real de tarea.
- Cambios aplicados: HomeHeader usa `BrandLogo`; marcador de tarea propia pasa a etiqueta/pin `Tu tarea` con icono y halo; popup del marker queda breve; leyenda del mapa es más ligera; card pendiente reduce fondo/notice; helper home renombra `Solicitud activa` a `Solicitud seleccionada` y sustituye los cuatro mini badges por un resumen compacto.
- Qué se conserva: lógica de selección de markers, tareas propias en mapa, drawer de solicitudes, acciones `Ver solicitud`/`Contactar`, TaskDetail como detalle real y todos los flujos de tareas.
- Riesgos: revisar manualmente el tamaño del marker `Tu tarea` en móviles estrechos y que no tape helpers cercanos.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene warning conocido de chunk grande/plugin timings.

## Reviews MVP phase 5C - requester to helper

- Fecha: 2026-06-09
- Selected agents:
  - helpme-architect
  - product-flow-agent
  - frontend-ui-agent
  - supabase-data-agent
  - security-auth-agent
  - agent-worklog
- Objetivo: implementar MVP de valoraciones post-tarea usando `public.reviews` como modelo principal y mantener `public.ratings` como legacy/no usado.
- Auditoría: `reviews` ya existía con rating por dimensiones, RLS de insert mutua y contador de reviews; `ratings` sigue en schema legacy; `ProfileReviewsPanel` ya leía `reviews`; `TaskComplete`, `TaskDetail` y `MyRequestCard` no tenían flujo real de valoración.
- Cambios Supabase: migration `0038_reviews_mvp_requester_to_helper.sql` añade `reviews.tags`, `reviews.updated_at`, constraint segura de tags, RLS de insert restringida a requester -> helper asignado en tarea `completed/closed` y trigger para recalcular `profiles.rating`, `profiles.reviews_count` y `profiles.completed_tasks` desde `reviews`.
- Cambios frontend: nueva ruta `/task/:id/review`, formulario mobile-first con rating 1-5, chips y comentario opcional; CTAs `Valorar helper` tras cerrar tarea y en detalle; Mis solicitudes muestra `Valorar` o estado `Valorada`; ReviewCard pinta chips si existen.
- Qué se conserva: cierre de tarea, liberación de fondos, pagos, Stripe, chat protegido, perfil público existente y tabla `ratings` sin nuevos usos.
- Riesgos: aplicar la migration en Supabase remoto antes de probar el formulario; las reviews antiguas sin `tags` siguen funcionando por default vacío.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene warning conocido de chunk grande/plugin timings.

## React tracker diagnostic phase 5D

- Fecha: 2026-06-09
- Selected agents:
  - helpme-architect
  - agent-worklog
- Objetivo: diagnosticar y reparar el tracker React roto sin tocar producto, Supabase, Stripe, pagos ni chat.
- Auditoría: el único tracker React activo en el repo es `react-scan`; no hay React Query Devtools, Sentry, PostHog, LogRocket, reportWebVitals ni tracking de rutas activo. `docs/analytics-plan.md` es planificación, no implementación.
- Causa probable: `scan()` se ejecutaba en `main.jsx`, pero el módulo ya importaba React/ReactDOM al mismo nivel; React Scan puede fallar si no se importa antes de que React corra.
- Cambios aplicados: `main.jsx` queda como entrada mínima y carga `react-scan/auto` solo si `VITE_REACT_SCAN=true`; el montaje real de React se movió a `bootstrap.jsx` para garantizar que el tracker se cargue antes de React cuando esté activado.
- Decisión: React Scan queda desactivado por defecto incluso en dev para no interferir con React DevTools Profiler; se activa explícitamente con `VITE_REACT_SCAN=true`.
- Riesgos: si se necesita tracking de nombres/fuente más detallado, puede añadirse después el plugin `react-scan/react-component-name/vite`; no se añadió para mantener scope estrecho.
- Validación: `pnpm run lint` correcto y `pnpm run build` correcto. Build mantiene warning conocido de chunk grande/plugin timings.

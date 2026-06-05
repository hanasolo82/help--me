
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


---

Nota: actualización inicial completada. Próximo: búsqueda automática de duplicados (helpers/hooks/tipos) y propuesta de lotes. Antes de aplicar cambios, confirmar Lote 1.

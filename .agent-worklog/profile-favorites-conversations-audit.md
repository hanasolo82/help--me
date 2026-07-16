# Perfil, favoritos y conversaciones: auditoría

Fecha: 2026-07-16. Alcance: auditoría previa a cambios de UI. No modifica el
modelo de conversaciones, mensajes, notificaciones ni RLS.

## Dictamen conjunto

**Sol (producto):** la dirección correcta es una conversación directa única
por pareja y una conversación independiente por tarea. La fecha es contexto de
la solicitud, nunca el identificador de un chat. Evita mezclar coordinación,
pagos e incidencias de tareas distintas.

**Terra (datos y RLS):** el modelo actual ya tiene ambos tipos, pero la
conversación directa no está lista para exponerse desde perfiles. Falta que su
RPC valide una preferencia específica de recepción, bloqueos y un límite
anti-spam en servidor. Tampoco existe una tabla persistente de notificaciones:
la campana deriva el estado de conversaciones y tareas. Por ello, no se cambia
ni se habilita el chat directo en esta etapa.

## Flujos actuales

1. **Mapa a solicitud privada.** `HelperCard` y `HelperPreviewModal` llaman a
   `RequesterHome.handleContactHelper`, que abre el único `RequestTaskModal`
   con `targetHelper`. El modal limita categorías a las skills del helper y
   llama a la RPC `create_direct_task`.
2. **Perfil a solicitud privada.** `ProfilePage` ya navega a `/home` con
   `state.directHelper`; `RequesterHome` consume ese estado y abre el mismo
   `RequestTaskModal`. No hay asignación ni desbloqueo de chat: el helper debe
   aceptar mediante `respond_to_direct_task`.
3. **Favoritos de perfiles.** `profile_favorites` tiene clave primaria
   `(viewer_id, favorited_profile_id)` e índice inverso. RLS limita lectura y
   escritura a `viewer_id = auth.uid()`. La UI los duplicaba como botones de
   texto en sidebar, bloque de contacto y barra móvil. La API cliente hace
   lectura previa e insert/delete; el nuevo control debe mantener rollback
   optimista para errores y compartir la query de React Query.
4. **Mensajes.** `conversations` usa `conversation_type` (`direct`/`task`) y
   `task_id`. `create_or_get_task_conversation` crea una conversación por
   tarea; `can_access_conversation` exige participación y, para tareas, que el
   usuario sea requester/helper y la tarea esté `in_progress`, `completed` o
   `closed`. `send_message`, lectura, edición y Realtime pasan por esa misma
   comprobación.
5. **No leídos y avisos.** `conversation_participants.last_read_at` es la
   fuente de verdad de no leídos. `/notifications` y el contador de Home se
   derivan de esos datos y de tareas/aplicaciones; no hay tabla `notifications`
   ni trigger de notificación persistente.

## Riesgos y decisión de conversaciones

| Alternativa | Decisión | Motivo |
| --- | --- | --- |
| A. Solo por tarea | Descartada como destino | Conserva el gate de pago, pero no permite preguntas previas. |
| B. Directa por pareja + una por tarea | Aprobada como dirección | Ya encaja en el modelo y conserva trazabilidad y el gate de pago. |
| C. Un hilo por pareja | Descartada | Mezcla tareas, pagos e incidencias; hace la auditoría ambigua. |
| D. Chat por fecha | Descartada | Las fechas cambian y multiplican hilos sin resolver trazabilidad. |

La implementación mínima de B se ha preparado localmente en la migración
`0053_direct_conversation_safety_controls.sql`, pendiente de aplicar y validar
en staging. Añade preferencia explícita de recepción, bloqueo bilateral, límite
transaccional de cinco hilos nuevos por hora y un mensaje consecutivo por lado.
Las conversaciones de tarea, su gate de pago, el layout de Mensajes, composer y
Realtime no se modifican. El verificador RLS cubre el flujo con tres usuarios y
falla antes de crear datos de prueba si la migración no está instalada.

## Archivos auditados

- Perfil y propuesta: `src/features/profile/pages/ProfilePage.jsx`,
  `src/features/home/need-help/components/RequesterHome.jsx`,
  `RequestTaskModal.jsx`, `tasksService.js`.
- Favoritos: `profileApi.js`, `useFavoriteProfile.js`, componentes de perfil,
  `HelperCard.jsx`, migración `0016_trust_network_architecture.sql`.
- Conversaciones: migraciones `0012`, `0015`, `0036`, `0040`; `chatApi.js`,
  `MessagesPage.jsx`, `MessagesThread.jsx`, hooks de mensajes/Reatime.
- Solicitudes directas: migraciones `0051` y `0052`.
- Validación existente: `verify:rls-payment-gate` y el caso de gate de chat en
  `verify:rls-ownership.mjs`.

## Rollback

La Etapa A solo cambia controles React y cache de favoritos. Su rollback es
revertir esos archivos; no requiere migración ni altera datos existentes.

La fase de hardening de conversaciones directas requiere una migración de
reversión revisada: restaura las funciones y grants previos de conversaciones y
elimina las tablas `direct_message_preferences` y `user_blocks` solo después de
preservar la decisión sobre los bloqueos existentes. No basta con revertir el
cliente porque los controles viven deliberadamente en servidor.

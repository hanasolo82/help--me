# HelpMe — Estado P0 Final

Fecha: 2026-06-01

## Veredicto técnico
No se detectan P0 funcionales restantes en el flujo principal.

## P0-1 Conversación Requester ↔ Helper
Estado: cerrado técnicamente.
Evidencia:
- Contactar crea conversación real o muestra error visible.
- Sin fallback silencioso a /chats.
- Perfil público corregido también.

Validación pendiente:
- Prueba manual con dos usuarios reales.

## P0-2 Activación Helper
Estado: cerrado técnicamente.
Evidencia:
- acceptTask valida el perfil real del helper.
- Helper incompleto queda bloqueado.
- Helper completo puede aceptar.

Validación pendiente:
- Probar helper incompleto y helper completo en Supabase real.

## P0-3 RequestTaskModal / controles fantasma
Estado: cerrado.
Evidencia:
- CTA corregido a “Publicar solicitud”.
- Eliminado placeholder de favoritos.
- Eliminado selectedHelper sin efecto.
- No se promete asignación directa inexistente.

## P0-4 Cierre de tarea
Estado: cerrado técnicamente.
Evidencia:
- No se puede cerrar en assigned.
- TaskDetail solo muestra cierre en in_progress/completed.
- TaskComplete bloquea cierre prematuro con error visible.
- markTaskCompleted ya no acepta assigned.

Validación pendiente:
- Probar flujo completo con pago y release.

## P0-5 Geolocalización
Estado: cerrado técnicamente.
Evidencia:
- RPC devuelve lat/lng/distance_km.
- Frontend normaliza coordenadas/distancia.
- Mapa y listado consumen la misma búsqueda.
- location_label público sigue siendo aproximado.

Validación pendiente:
- Probar radio, refresh, mapa y privacidad con datos reales.

## P1-1 Chunk grande en build Vite
Impacto:
- No bloquea beta cerrada.
- Puede afectar rendimiento inicial.

Acción recomendada:
- Post-beta o antes de beta si hay tiempo: revisar code splitting/rutas pesadas.

## P1-2 Sensibilidad a helpers sin lat/lng
Impacto:
- Helpers sin ubicación no aparecen en mapa/discovery.
- Correcto funcionalmente, pero puede generar confusión si el helper cree estar activo.

Acción recomendada:
- Asegurar copy claro en onboarding/settings: sin ubicación no apareces en discovery.

## P1-3 Copy residual de ubicación
Impacto:
- Bajo.
- Riesgo de ambigüedad entre ubicación exacta usada internamente y zona aproximada visible.

Acción recomendada:
- Pasada UX/copy antes de abrir beta a usuarios externos.

## HelpMe — Checklist Manual Beta Cerrada

### Requester

- [ ] Crear tarea con título, descripción, categoría, precio y ubicación.
- [ ] Refrescar la app y confirmar que la tarea persiste.
- [ ] Confirmar que ubicación/radio se mantienen según configuración.
- [ ] Abrir preview de helper.
- [ ] Pulsar Contactar.
- [ ] Confirmar navegación a /chat/:conversationId.
- [ ] Enviar mensaje.
- [ ] Confirmar que el mensaje persiste tras refresh.
- [ ] Pagar tarea cuando esté assigned.
- [ ] Confirmar que tras webhook/payment success la tarea pasa a in_progress.
- [ ] Ver botón de cierre solo en in_progress/completed.
- [ ] Confirmar cierre.
- [ ] Confirmar que release se inicia y el usuario no pierde estado.

### Helper

- [ ] Con perfil incompleto, intentar aceptar tarea.
- [ ] Confirmar bloqueo visible.
- [ ] Completar perfil helper.
- [ ] Confirmar que aparece en discovery.
- [ ] Aceptar tarea.
- [ ] Confirmar que la tarea pasa a assigned.
- [ ] Abrir chat con requester.
- [ ] Confirmar que puede enviar y recibir mensajes.

### Geolocalización

- [ ] Confirmar que el mapa muestra helpers cercanos.
- [ ] Confirmar que la distancia se ve correctamente.
- [ ] Cambiar radio en settings.
- [ ] Refrescar y confirmar que discovery respeta el radio.
- [ ] Confirmar que el perfil público muestra zona aproximada.
- [ ] Confirmar que no se muestran coordenadas exactas como texto público.

### Cierre

- [ ] Entrar manualmente a /complete/:id con tarea assigned.
- [ ] Confirmar bloqueo visible.
- [ ] Entrar con tarea in_progress.
- [ ] Confirmar que permite cierre.
- [ ] Si falla chat/release, confirmar error visible.

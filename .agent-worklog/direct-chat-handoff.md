# Traspaso — Perfil, favoritos y conversaciones directas

Fecha: 2026-07-17 · Rama: main · Último commit: `6d19415` (chat v1 III) · Árbol limpio.
Auditoría previa (Sol+Terra): `profile-favorites-conversations-audit.md`.

Estado verificado inspeccionando el repo (no de memoria): grep de superficies, migraciones y worklog.

---

## HECHO (verificado en código)

### Etapa A — Perfil y favoritos
- **CTA principal "Proponer una tarea" en perfil** — `src/features/profile/pages/ProfilePage.jsx` (`handlePrimaryAction`): navega a `/home` con `state.directHelper` (el mismo flujo del mapa: `RequesterHome` abre `RequestTaskModal` con el helper preseleccionado vía `useEffect` sobre `directHelper`). Sin formulario ni endpoint nuevos.
- **Corazón compartido `FavoriteHeart`** — `src/features/profile/components/FavoriteHeart.jsx` + `FavoriteHeart.module.css`. Colocado en:
  - Perfil: `ProfileSidebar.jsx` junto al nombre (`sidebarNameRow`), solo si no es perfil propio.
  - Home: `HelperCard.jsx:115` (card del helper del mapa requester).
- **Favoritos duplicados eliminados** — `ProfileContactPanel`, `ProfileSidebar` y `ProfileActionBar` ya no tienen botón textual "Guardar favorito"; el corazón es el único control. Persistencia sobre la tabla existente `profile_favorites` (RLS de propietario, verificada en la suite).

### Etapa B/C — Conversaciones directas (modelo aprobado: directa por pareja + una por tarea)
- **Migraciones locales** (NO aplicadas en remoto):
  - `supabase/migrations/0053_direct_conversation_safety_controls.sql` — preferencia `direct_message_preferences` (`accepts_direct_messages`), bloqueos, gate `can_start_direct_conversation(...)`, hardening de grants de RPC.
  - `supabase/migrations/0054_direct_message_contact_availability.sql` — disponibilidad booleana de contacto.
- **API frontend** — `src/features/chat/api/chatApi.js`: `getDirectMessagePreference`/`setDirectMessagePreference`, `canStartDirectConversation`, `createOrGetDirectConversation` (RPC transaccional, pareja normalizada, sin `user_id` arbitrario). Reexportado en `src/services/chatService.js`.
- **Ajustes** — `src/pages/Settings/components/NotificationSettings.jsx`: switch "Recibir mensajes directos".
- **Perfil** — `ProfilePage.jsx`: CTA secundario "Enviar mensaje" (jerarquía: Proponer tarea > Enviar mensaje > corazón). Se muestra solo si helper activo + `canStartDirectConversation` true; al pulsar crea/reutiliza la conversación y navega a `/messages` con `state.conversationId`. Propagado por `ProfilePublicView → ProfilePublicLayout → ProfileSidebar / ProfileContactPanel / ProfileActionBar` (props `onSecondaryAction`/`secondaryActionLabel`/`showSecondaryAction`).
- **Mensajes** — `src/pages/Messages/MessagesThread.jsx:161`: línea secundaria discreta "Conversación directa" cuando `conversation_type === 'direct' && !task_id`. Sin segunda bandeja ni layout nuevo.
- **Validación** — suite RLS ownership 56/56 OK (ver `rls-validation-run.md`); lint y build OK a fecha del traspaso.

---

## PENDIENTE (por agente)

### Agente frontend/UI — descubrimiento del chat directo fuera del perfil — ✅ HECHO (2026-07-17)
1. ✅ Hook `src/features/chat/hooks/useDirectMessage.js` extraído: encapsula gate + apertura + navegación. Estados: `idle` (gate pendiente) / `available` / `unavailable` (rechazo explícito → pista) / `error` (fallo del gate, p. ej. RPC sin desplegar → CTA oculto SIN pista) / `opening`.
2. ✅ `ProfilePage.jsx` refactorizado sobre el hook (lógica inline eliminada; mismo comportamiento, y el CTA ya no desaparece durante `opening`).
3. ✅ `HelperPreviewModal.jsx` — CTA secundario "Enviar mensaje" (gate-dependiente) + pista discreta `styles.directHint` cuando el helper rechaza mensajes. Jerarquía respetada: Publicar solicitud = primario; Pedir ayuda/Ver perfil/Enviar mensaje = secundarios.
4. ✅ `HelperCard.jsx` (decisión revisada por producto 2026-07-17, 2ª iteración): CTA discreto "Contacto" (icono MessageSquare, clase `helperContactLink` en `NeedHelpMapLayout.module.css`), primer elemento del footer `.helperActions`, renderizado SIEMPRE; el gate solo controla el estado: available → habilitado; unavailable → disabled + title "No recibe mensajes directos por ahora"; error/idle → disabled sin title (no se atribuye rechazo al helper). Disabled: opacity .5 + cursor not-allowed. OJO rendimiento: cada card dispara `can_start_direct_conversation` → N llamadas RPC por listado; si crece, cachear el gate (react-query keyed por helperId) dentro de `useDirectMessage`.
5. Drive-by: `HelperPreviewModal.module.css` primary-action `#ffffff` → `var(--hm-button-primary-fg)` (contraste en tema oscuro).
Nota: con 0053/0054 ya aplicadas en remoto (2026-07-17), el gate responde de verdad: CTA visible solo con opt-in del helper y sin bloqueos entre la pareja.

### Agente de notificaciones/Realtime — solo si Sol+Terra lo confirman
- Verificar que el primer mensaje directo genera notificación solo al destinatario, sin duplicar trigger+frontend, y que el deep-link abre la conversación correcta en `/messages`.
- Confirmar contadores no leídos con conversaciones `direct` en la bandeja (misma fuente de verdad que tareas).

### Terra — ✅ HECHO (2026-07-17)
- Owner confirma migraciones aplicadas en remoto.
- Suite `verify:rls-ownership` re-ejecutada contra el entorno real: **56/56 PASS, exit 0**. El preflight `assertDirectConversationHardeningInstalled` confirma 0053 (`direct_message_preferences` legible) y 0054 (`can_start_direct_conversation` invocable). Cubiertos: opt-in/opt-out, bloqueos, reuso por pareja, límite 1er mensaje sin respuesta, límite 5 conversaciones/hora, sin escrituras cliente directas a `conversations`/`messages`.
- (Verificar aparte si 0048 billing_profiles entró en el mismo push; no afecta al chat directo.)

### Agente QA/regresión
- Prueba manual con 2 usuarios reales: preferencia off → CTA oculto; bloqueo → no crea conversación; doble clic simultáneo → una sola conversación por pareja.
- Regresión: chat de tarea intacto (bloqueado hasta pago), flujo del mapa intacto, favoritos persisten tras recarga y coinciden perfil↔Home, corazón no abre perfil (stopPropagation), campana sin duplicados.
- Sin ejercitar aún: guardado real de disponibilidad/skills del perfil single-page (misma sesión requerida).

## Restricciones vigentes
No commit/push/deploy; no aplicar migraciones remotas sin autorización; no tocar Stripe; no crear segunda bandeja ni layout de mensajes paralelo.

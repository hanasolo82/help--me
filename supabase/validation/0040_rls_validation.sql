-- =============================================================================
-- Fase 1B · Validación real de la migración 0040 (payment-gate / RLS)
-- =============================================================================
-- CÓMO USAR (Supabase SQL Editor):
--   1. Ejecuta primero la SECCIÓN 0 para encontrar UUIDs reales de tu base.
--   2. Sustituye los placeholders <...> de la SECCIÓN A con esos UUIDs.
--   3. Ejecuta cada bloque BEGIN…ROLLBACK por separado y lee el resultado.
--
-- POR QUÉ FUNCIONA:
--   El SQL Editor corre como rol privilegiado y SALTA RLS. Para probar RLS de
--   verdad simulamos un usuario autenticado con:
--       set local role authenticated;
--       set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
--   `auth.uid()` lee ese claim, así que las policies se evalúan como ese usuario.
--   Todo va en BEGIN…ROLLBACK: NADA se persiste. Los inserts/updates "prohibidos"
--   deben fallar (ERROR / 0 filas). Los permitidos deben tener éxito antes del rollback.
--
-- CRITERIO DE ÉXITO:
--   ❌ PROHIBIDO  -> debe lanzar ERROR de RLS o afectar 0 filas.
--   ✅ PERMITIDO  -> debe afectar 1 fila / devolver registro.
-- =============================================================================


-- =============================================================================
-- SECCIÓN 0 · Encontrar UUIDs reales (ejecutar como rol normal del editor)
-- =============================================================================

-- 0.1 Policies activas en las tablas críticas (inspección directa)
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('chats', 'messages', 'tasks', 'task_applications', 'conversations')
order by tablename, cmd, policyname;

-- 0.2 Verifica que RLS está habilitado y FORZADO en esas tablas
select relname, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('chats', 'messages', 'tasks', 'task_applications', 'conversations');

-- 0.3 Una tarea OPEN sin helper (para probar apply/select)
select id as task_id, created_by as requester_id, status, accepted_by
from public.tasks
where status = 'open' and accepted_by is null
order by created_at desc
limit 5;

-- 0.4 Una tarea ASSIGNED (pagada o no) para probar el gate de chat
select t.id as task_id, t.created_by as requester_id, t.accepted_by as helper_id, t.status,
       c.id as conversation_id
from public.tasks t
left join public.conversations c on c.task_id = t.id and c.conversation_type = 'task'
where t.status in ('assigned', 'in_progress', 'completed')
order by t.created_at desc
limit 10;

-- 0.5 Un helper ACTIVO distinto del requester (para apply_to_task)
select id as helper_id, account_status, helper_status
from public.profiles
where account_status = 'active' and coalesce(helper_status, 'inactive') = 'active'
limit 5;


-- =============================================================================
-- SECCIÓN A · Rellena estos UUIDs (de la Sección 0) antes de continuar
-- =============================================================================
--   <REQUESTER_UUID>     = dueño de una tarea OPEN
--   <HELPER_UUID>        = helper activo, distinto del requester
--   <OPEN_TASK_UUID>     = tarea OPEN sin helper (de 0.3)
--   <ASSIGNED_TASK_UUID> = tarea ASSIGNED sin pago confirmado (de 0.4)
--   <ASSIGNED_CONVO_UUID>= conversación 'task' de esa tarea assigned (si existe)
--   <THIRD_PARTY_UUID>   = un usuario que NO es requester ni helper de la tarea


-- =============================================================================
-- TEST 1 · ❌ No se puede crear un chat legacy (policy "create chats" dropeada)
-- =============================================================================
-- Esperado: ERROR "new row violates row-level security policy for table chats"
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<REQUESTER_UUID>","role":"authenticated"}';

  insert into public.chats (user1_id, user2_id)
  values ('<REQUESTER_UUID>', '<HELPER_UUID>');
rollback;


-- =============================================================================
-- TEST 2 · ❌ No se puede insertar mensaje usando solo chat_id (legacy)
-- =============================================================================
-- En 0040 la rama chat_id se eliminó de la policy de insert de messages.
-- Necesitas un chat_id legacy existente; si tu base ya no tiene chats, este
-- test es N/A (no hay superficie). Si existe alguno, debe FALLAR el insert.
-- Esperado: ERROR de RLS.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<REQUESTER_UUID>","role":"authenticated"}';

  insert into public.messages (chat_id, sender_id, body, message_type)
  values ('<LEGACY_CHAT_UUID>', '<REQUESTER_UUID>', 'bypass intento', 'text');
rollback;


-- =============================================================================
-- TEST 3 · ❌ No se puede chatear en tarea ASSIGNED (antes del pago/in_progress)
-- =============================================================================
-- can_access_conversation exige status in ('in_progress','completed','closed').
-- Con la tarea en 'assigned' el insert por conversation_id debe FALLAR.
-- Esperado: ERROR de RLS.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<REQUESTER_UUID>","role":"authenticated"}';

  insert into public.messages (conversation_id, sender_id, body, message_type)
  values ('<ASSIGNED_CONVO_UUID>', '<REQUESTER_UUID>', 'hola antes de pagar', 'text');
rollback;


-- =============================================================================
-- TEST 4 · ❌ Requester NO puede mover la tarea a in_progress manualmente
-- =============================================================================
-- Las policies de update de tasks solo permiten al requester:
--   open/draft -> open/draft/cancelled  | cualquiera -> cancelled | in_progress -> completed
-- NUNCA -> in_progress. El webhook (server-side) hace esa transición.
-- Esperado: 0 filas actualizadas (UPDATE 0).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<REQUESTER_UUID>","role":"authenticated"}';

  update public.tasks
  set status = 'in_progress'
  where id = '<ASSIGNED_TASK_UUID>';
  -- Mira el "UPDATE N" en el resultado: debe ser 0.
rollback;


-- =============================================================================
-- TEST 5 · ❌ Helper NO puede mover la tarea a in_progress (ni tocarla)
-- =============================================================================
-- El helper no es created_by, así que ninguna policy de update aplica.
-- Esperado: 0 filas actualizadas (UPDATE 0).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<HELPER_UUID>","role":"authenticated"}';

  update public.tasks
  set status = 'in_progress'
  where id = '<ASSIGNED_TASK_UUID>';
rollback;


-- =============================================================================
-- TEST 6 · ❌ Nadie puede auto-seleccionarse / forzar candidatura por UPDATE
-- =============================================================================
-- 0040 dropeó "Application participants can update constrained state".
-- Sin RPC, un UPDATE directo a task_applications debe afectar 0 filas.
-- Esperado: 0 filas (UPDATE 0).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<HELPER_UUID>","role":"authenticated"}';

  update public.task_applications
  set status = 'selected'
  where task_id = '<OPEN_TASK_UUID>' and helper_id = '<HELPER_UUID>';
rollback;


-- =============================================================================
-- TEST 7 · ❌ Tercer usuario no participante no puede leer la conversación
-- =============================================================================
-- Esperado: 0 filas devueltas.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<THIRD_PARTY_UUID>","role":"authenticated"}';

  select id from public.conversations where id = '<ASSIGNED_CONVO_UUID>';
  select id from public.messages where conversation_id = '<ASSIGNED_CONVO_UUID>';
rollback;


-- =============================================================================
-- TEST 8 · ✅ RPC legítima: helper se ofrece (apply_to_task)
-- =============================================================================
-- Esperado: devuelve una fila task_applications con status 'pending'.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<HELPER_UUID>","role":"authenticated"}';

  select id, task_id, helper_id, status
  from public.apply_to_task('<OPEN_TASK_UUID>', 'Puedo ayudarte con esto');
rollback;


-- =============================================================================
-- TEST 9 · ✅ RPC legítima: requester elige helper (select_task_helper)
-- =============================================================================
-- Crea la candidatura como helper y la selecciona como requester en la MISMA
-- transacción (rollback al final). Esperado: la tarea queda 'assigned'.
begin;
  -- helper aplica
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<HELPER_UUID>","role":"authenticated"}';
  select id as application_id
  from public.apply_to_task('<OPEN_TASK_UUID>', 'apply para test select') \gset

  -- requester selecciona  (reset claim al requester)
  set local request.jwt.claims = '{"sub":"<REQUESTER_UUID>","role":"authenticated"}';
  select id, status, accepted_by
  from public.select_task_helper(:'application_id');
rollback;
-- NOTA: \gset funciona en psql. En el SQL Editor web, copia a mano el id de la
-- candidatura del primer SELECT y pásalo literal a select_task_helper('<id>').


-- =============================================================================
-- TEST 10 · ✅ RPC legítima: requester rechaza candidatura (reject_task_application)
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<HELPER_UUID>","role":"authenticated"}';
  select id as application_id
  from public.apply_to_task('<OPEN_TASK_UUID>', 'apply para test reject') \gset

  set local request.jwt.claims = '{"sub":"<REQUESTER_UUID>","role":"authenticated"}';
  select id, status from public.reject_task_application(:'application_id');
rollback;


-- =============================================================================
-- TEST 11 · ✅ RPC legítima: helper retira candidatura (withdraw_task_application)
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<HELPER_UUID>","role":"authenticated"}';
  select id as application_id
  from public.apply_to_task('<OPEN_TASK_UUID>', 'apply para test withdraw') \gset

  select id, status from public.withdraw_task_application(:'application_id');
rollback;


-- =============================================================================
-- TEST 12 · ✅ Chat SÍ se desbloquea cuando la tarea está in_progress
-- =============================================================================
-- Simula el estado post-webhook DENTRO de la transacción (con rollback) para
-- comprobar que can_access_conversation devuelve true y el insert pasa.
-- Esperado: el SELECT can_access_conversation = true y el INSERT tiene éxito.
begin;
  -- forzamos in_progress como rol privilegiado (simula lo que hace el webhook server-side)
  update public.tasks set status = 'in_progress' where id = '<ASSIGNED_TASK_UUID>';

  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<REQUESTER_UUID>","role":"authenticated"}';

  select public.can_access_conversation('<ASSIGNED_CONVO_UUID>') as should_be_true;

  insert into public.messages (conversation_id, sender_id, body, message_type)
  values ('<ASSIGNED_CONVO_UUID>', '<REQUESTER_UUID>', 'ahora sí puedo escribir', 'text')
  returning id, conversation_id, sender_id;
rollback;

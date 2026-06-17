-- Close the critical payment-gate bypasses around legacy chats and direct RLS updates.

-- Legacy task chats are no longer a client-write surface. Task chat access must go
-- through conversations + can_access_conversation, which enforces the payment gate.
drop policy if exists "Participants can create chats" on public.chats;

drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can read messages"
  on public.messages
  for select
  to authenticated
  using (
    conversation_id is not null
    and public.can_access_conversation(conversation_id)
  );

drop policy if exists "Participants can insert messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can insert messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and conversation_id is not null
    and public.can_access_conversation(conversation_id)
    and coalesce(body, content) is not null
    and char_length(trim(coalesce(body, content))) > 0
    and char_length(coalesce(body, content)) <= 2000
  );

drop policy if exists "Authors can update messages" on public.messages;
drop policy if exists "Participants can update own messages" on public.messages;
create policy "Authors can update messages"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = (select auth.uid())
    and conversation_id is not null
    and public.can_access_conversation(conversation_id)
  )
  with check (
    sender_id = (select auth.uid())
    and conversation_id is not null
    and public.can_access_conversation(conversation_id)
  );

drop policy if exists "Authors can delete messages" on public.messages;
drop policy if exists "Participants can delete own messages" on public.messages;

-- Client-side task state updates stay narrow; assignment/payment transitions run
-- through SECURITY DEFINER RPCs and server webhook code.
drop policy if exists "Requester or helper can update related tasks" on public.tasks;

drop policy if exists "Requester can update own draft or open tasks" on public.tasks;
create policy "Requester can update own draft or open tasks"
  on public.tasks
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    and status in ('draft', 'open')
    and accepted_by is null
  )
  with check (
    created_by = (select auth.uid())
    and status in ('draft', 'open', 'cancelled')
    and accepted_by is null
  );

drop policy if exists "Requester can cancel own unresolved tasks" on public.tasks;
create policy "Requester can cancel own unresolved tasks"
  on public.tasks
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    and status in ('draft', 'open', 'assigned', 'in_progress')
  )
  with check (
    created_by = (select auth.uid())
    and status = 'cancelled'
  );

drop policy if exists "Requester can complete own in-progress tasks" on public.tasks;
create policy "Requester can complete own in-progress tasks"
  on public.tasks
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    and accepted_by is not null
    and status in ('in_progress', 'completed')
  )
  with check (
    created_by = (select auth.uid())
    and accepted_by is not null
    and status = 'completed'
  );

-- Applications are state-machine controlled by RPCs:
-- apply_to_task, select_task_helper, reject_task_application, withdraw_task_application.
drop policy if exists "Application participants can update constrained state" on public.task_applications;

notify pgrst, 'reload schema';

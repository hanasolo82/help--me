-- A task conversation remains readable after completion, but only active work
-- may change its messages or attachments. Direct conversations keep the rules
-- established by 0053 unchanged.

create or replace function public.can_send_to_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  conversation_row record;
  direct_recipient_id uuid;
  direct_other_id uuid;
begin
  if me is null or not public.can_access_conversation(p_conversation_id) then
    return false;
  end if;

  select c.id, c.created_by, c.conversation_type, c.task_id
  into conversation_row
  from public.conversations c
  where c.id = p_conversation_id;

  if conversation_row.id is null then
    return false;
  end if;

  if conversation_row.conversation_type = 'task' then
    return exists (
      select 1
      from public.tasks t
      where t.id = conversation_row.task_id
        and t.status = 'in_progress'
        and (t.created_by = me or t.accepted_by = me)
    );
  end if;

  if conversation_row.conversation_type <> 'direct' then
    return false;
  end if;

  if conversation_row.task_id is not null
    or not exists (
      select 1
      from public.profiles p
      where p.id = me
        and p.account_status = 'active'
    )
    or (
      select count(*)
      from public.conversation_participants cp
      where cp.conversation_id = p_conversation_id
    ) <> 2 then
    return false;
  end if;

  select cp.user_id
  into direct_recipient_id
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.user_id <> conversation_row.created_by;

  direct_other_id := case
    when me = conversation_row.created_by then direct_recipient_id
    else conversation_row.created_by
  end;

  if direct_recipient_id is null
    or direct_other_id is null
    or public.is_direct_message_blocked(me, direct_other_id) then
    return false;
  end if;

  -- The non-creator is the recipient chosen by create_or_get_direct_conversation.
  -- A missing preference row means a pre-existing conversation; it remains usable
  -- until its recipient explicitly disables direct messages.
  if me = conversation_row.created_by
    and exists (
      select 1
      from public.direct_message_preferences dmp
      where dmp.profile_id = direct_recipient_id
        and dmp.accepts_direct_messages = false
    ) then
    return false;
  end if;

  return true;
end;
$$;

-- Message INSERT and UPDATE policies already call can_send_to_conversation.
-- Attachment reads continue to use can_access_conversation; all mutations use
-- the stricter write gate, including the underlying Storage objects.
drop policy if exists "Authors can insert attachments" on public.attachments;
create policy "Authors can insert attachments"
  on public.attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.sender_id = (select auth.uid())
        and public.can_send_to_conversation(m.conversation_id)
    )
  );

drop policy if exists "Authors can delete attachments" on public.attachments;
create policy "Authors can delete attachments"
  on public.attachments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.sender_id = (select auth.uid())
        and public.can_send_to_conversation(m.conversation_id)
    )
  );

drop policy if exists "chat-attachments sender upload" on storage.objects;
create policy "chat-attachments sender upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and cardinality(storage.foldername(name)) >= 3
    and exists (
      select 1
      from public.messages m
      where m.id = (storage.foldername(name))[2]::uuid
        and m.sender_id = (select auth.uid())
        and public.can_send_to_conversation(m.conversation_id)
        and m.conversation_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "chat-attachments sender delete" on storage.objects;
create policy "chat-attachments sender delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and cardinality(storage.foldername(name)) >= 3
    and exists (
      select 1
      from public.messages m
      where m.id = (storage.foldername(name))[2]::uuid
        and m.sender_id = (select auth.uid())
        and public.can_send_to_conversation(m.conversation_id)
        and m.conversation_id::text = (storage.foldername(name))[1]
    )
  );

revoke execute on function public.can_send_to_conversation(uuid) from public, anon;
grant execute on function public.can_send_to_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Las conversaciones directas sirven tambien para preguntas aclaratorias antes
-- de aceptar una tarea. Esta RPC crea siempre ambos participantes y es la unica
-- via recomendada para iniciar un chat 1-to-1 desde el cliente.

create or replace function public.create_or_get_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  found_conversation_id uuid;
  lock_key bigint;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if other_user_id is null or other_user_id = me then
    raise exception 'Invalid direct conversation target';
  end if;

  select hashtextextended(
    least(me::text, other_user_id::text) || ':' || greatest(me::text, other_user_id::text),
    0
  )
  into lock_key;

  perform pg_advisory_xact_lock(lock_key);

  select c.id
  into found_conversation_id
  from public.conversations c
  where exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = c.id
      and cp.user_id = me
  )
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = c.id
      and cp.user_id = other_user_id
  )
  and not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = c.id
      and cp.user_id not in (me, other_user_id)
  )
  order by c.created_at asc
  limit 1;

  if found_conversation_id is not null then
    return found_conversation_id;
  end if;

  insert into public.conversations (created_by)
  values (me)
  returning id into found_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (found_conversation_id, me),
    (found_conversation_id, other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return found_conversation_id;
end;
$$;

grant execute on function public.create_or_get_direct_conversation(uuid) to authenticated;

drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
on public.conversations
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_conversation_participant(id)
);

drop policy if exists "Participants can read conversation participants" on public.conversation_participants;
create policy "Participants can read conversation participants"
on public.conversation_participants
for select
to authenticated
using (
  public.is_conversation_participant(conversation_id)
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
  )
);

notify pgrst, 'reload schema';

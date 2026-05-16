-- Refuerzo para que la pantalla de Mensajes liste conversaciones iniciadas.
-- La regla principal sigue siendo "solo participantes", pero durante la transicion
-- tambien permitimos ver conversaciones creadas por el usuario autenticado.

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_participant(uuid) to authenticated;

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

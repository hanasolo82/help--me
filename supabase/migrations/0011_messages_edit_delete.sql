-- Permite editar y borrar mensajes propios, y mantiene una marca de modificacion.

alter table public.messages
  add column if not exists updated_at timestamptz not null default now();

alter table public.messages replica identity full;

drop policy if exists "Participants can update own messages" on public.messages;
create policy "Participants can update own messages"
on public.messages for update
to authenticated
using (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.chats c
    where c.id = chat_id
    and (c.user1_id = (select auth.uid()) or c.user2_id = (select auth.uid()))
  )
)
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.chats c
    where c.id = chat_id
    and (c.user1_id = (select auth.uid()) or c.user2_id = (select auth.uid()))
  )
);

drop policy if exists "Participants can delete own messages" on public.messages;
create policy "Participants can delete own messages"
on public.messages for delete
to authenticated
using (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.chats c
    where c.id = chat_id
    and (c.user1_id = (select auth.uid()) or c.user2_id = (select auth.uid()))
  )
);

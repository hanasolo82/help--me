-- A public profile only needs a yes/no contact affordance. This deliberately
-- does not disclose whether an unavailable result is caused by an opt-out,
-- a block, or an account state.

create or replace function public.can_start_direct_conversation(p_other_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null
    or p_other_user_id is null
    or p_other_user_id = me
    or not exists (
      select 1
      from public.profiles p
      where p.id = me
        and p.account_status = 'active'
    )
    or public.is_direct_message_blocked(me, p_other_user_id) then
    return false;
  end if;

  return exists (
    select 1
    from public.profiles p
    join public.direct_message_preferences dmp on dmp.profile_id = p.id
    where p.id = p_other_user_id
      and p.account_status = 'active'
      and p.helper_status = 'active'
      and dmp.accepts_direct_messages = true
  );
end;
$$;

revoke execute on function public.can_start_direct_conversation(uuid) from public, anon;
grant execute on function public.can_start_direct_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

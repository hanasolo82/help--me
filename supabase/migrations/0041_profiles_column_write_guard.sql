-- Close ownership gaps:
-- 1) profile owners may update only self-service profile columns.
-- 2) requesters may delete only draft/open tasks with no accepted helper.
-- 3) task deletion cannot cascade away non-terminal financial records.

revoke update on public.profiles from authenticated;

grant update (
  username,
  full_name,
  display_name,
  avatar_url,
  map_avatar_url,
  home_background_url,
  neighborhood,
  bio,
  phone_number,
  helper_status,
  helper_enabled,
  availability_enabled,
  response_time_minutes,
  hourly_rate,
  lat,
  lng,
  city,
  country,
  theme,
  accent_color,
  search_radius_enabled,
  search_radius_km,
  show_approx_location,
  visible_zone_name,
  notify_nearby_tasks,
  notify_messages,
  notify_payments,
  terms_accepted,
  terms_accepted_at,
  terms_version,
  updated_at
) on public.profiles to authenticated;

drop policy if exists "Requester can delete own tasks" on public.tasks;
create policy "Requester can delete own tasks"
on public.tasks
for delete
to authenticated
using (
  created_by = (select auth.uid())
  and status in ('draft', 'open')
  and accepted_by is null
);

create or replace function public.prevent_task_delete_with_active_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.payments p
    where p.task_id = old.id
      and p.status not in ('voided', 'failed', 'refunded')
  ) then
    raise exception 'Cannot delete task with non-terminal payment'
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists tasks_prevent_delete_with_active_payment on public.tasks;
create trigger tasks_prevent_delete_with_active_payment
before delete on public.tasks
for each row execute function public.prevent_task_delete_with_active_payment();

notify pgrst, 'reload schema';

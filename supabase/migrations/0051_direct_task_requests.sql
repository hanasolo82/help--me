-- Private direct requests: a requester can invite one opted-in helper without
-- exposing the task on the public board or creating an application race.

alter table public.profiles
  add column if not exists accepts_direct_requests boolean not null default false;

alter table public.tasks
  add column if not exists is_direct_request boolean not null default false,
  add column if not exists target_helper_id uuid references auth.users(id) on delete restrict,
  add column if not exists direct_request_response text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_direct_request_target_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_direct_request_target_check
      check (
        (is_direct_request = false and target_helper_id is null)
        or (is_direct_request = true and target_helper_id is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_direct_request_response_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_direct_request_response_check
      check (
        direct_request_response is null
        or (is_direct_request = true and direct_request_response in ('accepted', 'declined'))
      );
  end if;
end;
$$;

create index if not exists tasks_direct_target_open_idx
  on public.tasks (target_helper_id, ends_at)
  where is_direct_request = true and status = 'open';

grant update (accepts_direct_requests) on public.profiles to authenticated;

create or replace view public.public_profiles as
select
  p.id,
  p.username,
  coalesce(p.display_name, p.full_name, p.username) as full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.neighborhood,
  p.country,
  p.rating,
  p.completed_tasks,
  p.reviews_count,
  p.account_status,
  p.helper_status,
  p.availability_enabled,
  case
    when p.show_approx_location = false then 'Zona oculta'
    when nullif(trim(p.visible_zone_name), '') is not null then trim(p.visible_zone_name)
    when nullif(trim(p.city), '') is not null and nullif(trim(p.country), '') is not null then trim(p.city) || ', ' || trim(p.country)
    when nullif(trim(p.city), '') is not null then trim(p.city)
    when nullif(trim(p.neighborhood), '') is not null then trim(p.neighborhood)
    when nullif(trim(p.country), '') is not null then trim(p.country)
    else 'Zona no indicada'
  end as location_label,
  p.accepts_direct_requests
from public.profiles p;

grant select on public.public_profiles to anon, authenticated;

drop policy if exists "Authenticated users can view open and related tasks" on public.tasks;
create policy "Authenticated users can view open and related tasks"
on public.tasks for select
to authenticated
using (
  (status = 'draft' and created_by = (select auth.uid()))
  or (status = 'open' and is_direct_request = false)
  or created_by = (select auth.uid())
  or accepted_by = (select auth.uid())
  or target_helper_id = (select auth.uid())
);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
on public.tasks for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and accepted_by is null
  and status in ('draft', 'open')
  and is_direct_request = false
  and target_helper_id is null
);

drop policy if exists "Helper can accept open tasks" on public.tasks;
create policy "Helper can accept open tasks"
  on public.tasks
  for update
  to authenticated
  using (
    status = 'open'
    and accepted_by is null
    and created_by <> auth.uid()
    and is_direct_request = false
  )
  with check (
    status = 'assigned'
    and accepted_by = auth.uid()
    and created_by <> auth.uid()
    and is_direct_request = false
  );

create or replace function public.guard_authenticated_direct_task_routing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if old.is_direct_request = true then
    if new.is_direct_request is distinct from true
      or new.target_helper_id is distinct from old.target_helper_id then
      raise exception 'Direct task recipient cannot be changed';
    end if;

    if new.direct_request_response is distinct from old.direct_request_response
      and old.target_helper_id <> (select auth.uid()) then
      raise exception 'Only the invited helper can record a direct task response';
    end if;
  elsif new.is_direct_request = true or new.target_helper_id is not null then
    raise exception 'Direct tasks must be created through the direct request flow';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_guard_authenticated_direct_routing on public.tasks;
create trigger tasks_guard_authenticated_direct_routing
before update of is_direct_request, target_helper_id, direct_request_response on public.tasks
for each row execute function public.guard_authenticated_direct_task_routing();

create or replace function public.prevent_direct_task_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.tasks t
    where t.id = new.task_id
      and t.is_direct_request = true
  ) then
    raise exception 'Direct requests can only be answered by the invited helper';
  end if;

  return new;
end;
$$;

drop trigger if exists task_applications_block_direct_tasks on public.task_applications;
create trigger task_applications_block_direct_tasks
before insert on public.task_applications
for each row execute function public.prevent_direct_task_application();

drop policy if exists "Helpers can insert own pending applications" on public.task_applications;
create policy "Helpers can insert own pending applications"
  on public.task_applications
  for insert
  to authenticated
  with check (
    helper_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.tasks t
      join public.profiles p on p.id = (select auth.uid())
      where t.id = task_id
        and t.status = 'open'
        and t.accepted_by is null
        and t.created_by <> (select auth.uid())
        and t.is_direct_request = false
        and p.account_status = 'active'
        and coalesce(p.helper_status, 'inactive') = 'active'
    )
  );

create or replace function public.create_direct_task(
  p_target_helper_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_price numeric,
  p_lat double precision,
  p_lng double precision,
  p_location_label text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_timezone text default null,
  p_requested_time_note text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  clean_title text := trim(coalesce(p_title, ''));
  clean_description text := trim(coalesce(p_description, ''));
  clean_category text := trim(coalesce(p_category, ''));
  clean_location_label text := nullif(trim(coalesce(p_location_label, '')), '');
  clean_timezone text := nullif(trim(coalesce(p_timezone, '')), '');
  clean_time_note text := nullif(trim(coalesce(p_requested_time_note, '')), '');
  target_profile record;
  created_task public.tasks%rowtype;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if p_target_helper_id is null or p_target_helper_id = me then
    raise exception 'Choose a different helper for this direct request';
  end if;

  if char_length(clean_title) < 3 or char_length(clean_title) > 90 then
    raise exception 'Task title must contain between 3 and 90 characters';
  end if;

  if char_length(clean_description) < 3 or char_length(clean_description) > 600 then
    raise exception 'Task description must contain between 3 and 600 characters';
  end if;

  if clean_category not in (
    'Mascotas', 'Recados', 'Compras', 'Ayuda tecnica', 'Limpieza',
    'Mudanza', 'Reparaciones', 'Clases', 'Cuidado', 'Tecnología', 'Otros'
  ) then
    raise exception 'Invalid task category';
  end if;

  if p_price is null or p_price < 0 or p_price > 500 then
    raise exception 'Invalid task price';
  end if;

  if p_lat is null or p_lat < -90 or p_lat > 90 or p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'Invalid task location';
  end if;

  if p_starts_at is null or p_ends_at is null then
    raise exception 'Direct requests require a start and end time';
  end if;

  if p_starts_at < now() + interval '30 minutes'
    or p_ends_at <= p_starts_at
    or p_ends_at - p_starts_at < interval '30 minutes' then
    raise exception 'Invalid direct task time window';
  end if;

  if clean_location_label is not null and char_length(clean_location_label) > 240 then
    raise exception 'Task location label exceeds the maximum length';
  end if;

  if clean_timezone is not null and char_length(clean_timezone) > 64 then
    raise exception 'Task timezone exceeds the maximum length';
  end if;

  if clean_time_note is not null and char_length(clean_time_note) > 240 then
    raise exception 'Task time note exceeds the maximum length';
  end if;

  select p.id, p.account_status, p.helper_status, p.availability_enabled, p.accepts_direct_requests
  into target_profile
  from public.profiles p
  where p.id = p_target_helper_id
  for key share;

  if target_profile.id is null
    or target_profile.account_status <> 'active'
    or target_profile.helper_status <> 'active'
    or target_profile.availability_enabled <> true
    or target_profile.accepts_direct_requests <> true then
    raise exception 'This helper is not accepting direct requests';
  end if;

  if not exists (
    select 1
    from public.profile_skills ps
    join public.skills s on s.id = ps.skill_id
    where ps.profile_id = p_target_helper_id
      and coalesce(s.is_active, true) = true
      and (
        (clean_category in ('Limpieza', 'Mudanza', 'Reparaciones') and s.category = 'Hogar')
        or (clean_category = 'Mascotas' and s.category = 'Mascotas')
        or (clean_category in ('Recados', 'Compras') and s.category = 'Recados')
        or (clean_category in ('Ayuda tecnica', 'Tecnología') and s.category = 'Tecnología')
        or (clean_category = 'Cuidado' and s.category = 'Personas')
      )
  ) then
    raise exception 'This helper does not offer the selected category';
  end if;

  insert into public.tasks (
    created_by,
    target_helper_id,
    is_direct_request,
    title,
    description,
    category,
    price,
    status,
    lat,
    lng,
    location_label,
    starts_at,
    ends_at,
    timezone,
    requested_time_note,
    published_at,
    created_at,
    updated_at
  )
  values (
    me,
    p_target_helper_id,
    true,
    clean_title,
    clean_description,
    clean_category,
    p_price,
    'open',
    p_lat,
    p_lng,
    clean_location_label,
    p_starts_at,
    p_ends_at,
    clean_timezone,
    clean_time_note,
    now(),
    now(),
    now()
  )
  returning * into created_task;

  return created_task;
end;
$$;

create or replace function public.respond_to_direct_task(
  p_task_id uuid,
  p_response text
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  clean_response text := lower(trim(coalesce(p_response, '')));
  task_row public.tasks%rowtype;
  helper_profile record;
  updated_task public.tasks%rowtype;
  now_value timestamptz := now();
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if clean_response not in ('accept', 'decline') then
    raise exception 'Invalid direct task response';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id
  for update;

  if task_row.id is null or task_row.is_direct_request <> true then
    raise exception 'Direct request not found';
  end if;

  if task_row.target_helper_id <> me then
    raise exception 'Only the invited helper can respond to this request';
  end if;

  if task_row.status <> 'open' or task_row.accepted_by is not null then
    raise exception 'This direct request is no longer awaiting a response';
  end if;

  if task_row.ends_at is not null and task_row.ends_at <= now_value then
    raise exception 'This task time window has ended';
  end if;

  select p.id, p.account_status, p.helper_status, p.availability_enabled, p.accepts_direct_requests
  into helper_profile
  from public.profiles p
  where p.id = me;

  if helper_profile.id is null
    or helper_profile.account_status <> 'active'
    or helper_profile.helper_status <> 'active'
    or helper_profile.availability_enabled <> true
    or helper_profile.accepts_direct_requests <> true then
    raise exception 'Only active helpers accepting direct requests can respond';
  end if;

  if clean_response = 'accept' then
    update public.tasks
    set accepted_by = me,
        status = 'assigned',
        direct_request_response = 'accepted',
        modified_at = now_value,
        updated_at = now_value
    where id = task_row.id
      and target_helper_id = me
      and is_direct_request = true
      and status = 'open'
      and accepted_by is null
    returning * into updated_task;
  else
    update public.tasks
    set status = 'cancelled',
        direct_request_response = 'declined',
        cancelled_at = now_value,
        modified_at = now_value,
        updated_at = now_value
    where id = task_row.id
      and target_helper_id = me
      and is_direct_request = true
      and status = 'open'
      and accepted_by is null
    returning * into updated_task;
  end if;

  if updated_task.id is null then
    raise exception 'The direct request could not be updated safely';
  end if;

  return updated_task;
end;
$$;

revoke execute on function public.create_direct_task(uuid, text, text, text, numeric, double precision, double precision, text, timestamptz, timestamptz, text, text) from public;
revoke execute on function public.create_direct_task(uuid, text, text, text, numeric, double precision, double precision, text, timestamptz, timestamptz, text, text) from anon;
grant execute on function public.create_direct_task(uuid, text, text, text, numeric, double precision, double precision, text, timestamptz, timestamptz, text, text) to authenticated;

revoke execute on function public.respond_to_direct_task(uuid, text) from public;
revoke execute on function public.respond_to_direct_task(uuid, text) from anon;
grant execute on function public.respond_to_direct_task(uuid, text) to authenticated;

drop function if exists public.get_public_helpers_for_map(
  double precision, double precision, double precision, boolean,
  double precision, double precision, double precision, double precision,
  integer, uuid, text
);

create function public.get_public_helpers_for_map(
  p_center_lat double precision,
  p_center_lng double precision,
  p_radius_km double precision default 10,
  p_radius_enabled boolean default true,
  p_north double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_west double precision default null,
  p_limit integer default 12,
  p_exclude_profile_id uuid default null,
  p_skill_filter text default null
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  map_avatar_url text,
  helper_status text,
  availability_enabled boolean,
  accepts_direct_requests boolean,
  stripe_profile_verified boolean,
  location_label text,
  city text,
  neighborhood text,
  rating numeric,
  completed_tasks integer,
  reviews_count integer,
  lat double precision,
  lng double precision,
  distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with candidate_profiles as (
    select
      p.id,
      p.username,
      coalesce(p.display_name, p.full_name, p.username) as full_name,
      p.avatar_url,
      p.map_avatar_url,
      p.helper_status,
      p.availability_enabled,
      p.accepts_direct_requests,
      (
        coalesce(p.stripe_onboarding_completed, false)
        and coalesce(p.stripe_charges_enabled, false)
        and coalesce(p.stripe_payouts_enabled, false)
      ) as stripe_profile_verified,
      case
        when nullif(trim(p.visible_zone_name), '') is not null then trim(p.visible_zone_name)
        when nullif(trim(p.city), '') is not null and nullif(trim(p.country), '') is not null then trim(p.city) || ', ' || trim(p.country)
        when nullif(trim(p.city), '') is not null then trim(p.city)
        when nullif(trim(p.neighborhood), '') is not null then trim(p.neighborhood)
        when nullif(trim(p.country), '') is not null then trim(p.country)
        else 'Zona no indicada'
      end as location_label,
      p.city,
      p.neighborhood,
      p.rating,
      p.completed_tasks,
      p.reviews_count,
      round(p.lat::numeric, 2)::double precision as public_lat,
      round(p.lng::numeric, 2)::double precision as public_lng,
      exists (
        select 1
        from public.profile_skills ps
        join public.skills s on s.id = ps.skill_id
        where ps.profile_id = p.id
          and nullif(trim(p_skill_filter), '') is not null
          and (
            s.id::text = nullif(trim(p_skill_filter), '')
            or s.name = nullif(trim(p_skill_filter), '')
            or s.category = nullif(trim(p_skill_filter), '')
          )
      ) as skill_matches
    from public.profiles p
    where p.account_status = 'active'
      and p.helper_status = 'active'
      and p.availability_enabled = true
      and p.show_approx_location = true
      and p.lat is not null
      and p.lng is not null
      and (p_exclude_profile_id is null or p.id <> p_exclude_profile_id)
  ),
  candidates as (
    select
      cp.*,
      (
        6371 * 2 * asin(
          sqrt(
            power(sin(radians((cp.public_lat - p_center_lat) / 2)), 2)
            + cos(radians(p_center_lat)) * cos(radians(cp.public_lat))
              * power(sin(radians((cp.public_lng - p_center_lng) / 2)), 2)
          )
        )
      ) as distance_km
    from candidate_profiles cp
    where
      cp.skill_matches = true
      or (
        case
          when p_radius_enabled = true then
            cp.public_lat between p_center_lat - (greatest(coalesce(p_radius_km, 10), 1) / 111)
              and p_center_lat + (greatest(coalesce(p_radius_km, 10), 1) / 111)
            and cp.public_lng between p_center_lng - (greatest(coalesce(p_radius_km, 10), 1) / greatest(111 * cos(radians(p_center_lat)), 0.000001))
              and p_center_lng + (greatest(coalesce(p_radius_km, 10), 1) / greatest(111 * cos(radians(p_center_lat)), 0.000001))
          when p_north is not null and p_south is not null and p_east is not null and p_west is not null then
            cp.public_lat between least(p_south, p_north) and greatest(p_south, p_north)
            and cp.public_lng between least(p_west, p_east) and greatest(p_west, p_east)
          else false
        end
      )
  )
  select
    candidates.id,
    candidates.username,
    candidates.full_name,
    candidates.avatar_url,
    candidates.map_avatar_url,
    candidates.helper_status,
    candidates.availability_enabled,
    candidates.accepts_direct_requests,
    candidates.stripe_profile_verified,
    candidates.location_label,
    candidates.city,
    candidates.neighborhood,
    candidates.rating,
    candidates.completed_tasks,
    candidates.reviews_count,
    candidates.public_lat as lat,
    candidates.public_lng as lng,
    candidates.distance_km
  from candidates
  where
    candidates.skill_matches = true
    or p_radius_enabled = false
    or candidates.distance_km <= greatest(coalesce(p_radius_km, 10), 1)
  order by candidates.skill_matches desc, candidates.distance_km asc, candidates.rating desc nulls last
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

grant execute on function public.get_public_helpers_for_map(
  double precision, double precision, double precision, boolean,
  double precision, double precision, double precision, double precision,
  integer, uuid, text
) to anon, authenticated;

notify pgrst, 'reload schema';

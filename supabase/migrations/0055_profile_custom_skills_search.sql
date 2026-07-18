-- Helper-owned skills and indexed skill search.
-- Keeps the global skills catalog and task categories unchanged.

alter table public.profile_skills
  add column if not exists sort_order integer not null default 0;

with ranked_profile_skills as (
  select
    profile_id,
    skill_id,
    (row_number() over (
      partition by profile_id
      order by is_primary desc, years_experience desc, created_at asc, skill_id asc
    ))::integer - 1 as next_sort_order
  from public.profile_skills
)
update public.profile_skills ps
set sort_order = ranked_profile_skills.next_sort_order
from ranked_profile_skills
where ranked_profile_skills.profile_id = ps.profile_id
  and ranked_profile_skills.skill_id = ps.skill_id;

alter table public.skills
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'spanish'::regconfig,
      coalesce(name, '') || ' ' || coalesce(category, '')
    )
  ) stored;

create index if not exists skills_search_vector_idx
  on public.skills using gin (search_vector);

create table if not exists public.profile_custom_skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  sort_order integer not null default 0,
  search_vector tsvector generated always as (
    to_tsvector(
      'spanish'::regconfig,
      coalesce(name, '') || ' ' || coalesce(category, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (name = btrim(name)),
  check (char_length(name) between 2 and 50),
  check (category in ('Hogar', 'Mascotas', 'Tecnología', 'Recados', 'Personas')),
  check (sort_order between 0 and 5)
);

create unique index if not exists profile_custom_skills_owner_name_idx
  on public.profile_custom_skills (profile_id, lower(name));

create index if not exists profile_custom_skills_profile_order_idx
  on public.profile_custom_skills (profile_id, sort_order);

create index if not exists profile_custom_skills_search_vector_idx
  on public.profile_custom_skills using gin (search_vector);

alter table public.profile_custom_skills enable row level security;

drop policy if exists "Custom skills readable by authenticated users"
  on public.profile_custom_skills;
create policy "Custom skills readable by authenticated users"
on public.profile_custom_skills
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Users can insert their own custom skills"
  on public.profile_custom_skills;
create policy "Users can insert their own custom skills"
on public.profile_custom_skills
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "Users can update their own custom skills"
  on public.profile_custom_skills;
create policy "Users can update their own custom skills"
on public.profile_custom_skills
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "Users can delete their own custom skills"
  on public.profile_custom_skills;
create policy "Users can delete their own custom skills"
on public.profile_custom_skills
for delete
to authenticated
using (profile_id = (select auth.uid()));

-- All profile-skill writes go through the functions below so the total/custom
-- limits and ownership checks cannot be bypassed by a modified client.
revoke insert, update, delete on public.profile_skills from public, anon, authenticated;
revoke all on public.profile_custom_skills from public, anon;
revoke insert, update, delete on public.profile_custom_skills from authenticated;
grant select on public.profile_skills, public.profile_custom_skills to authenticated;

create or replace function public.replace_own_catalog_skills(
  p_skill_ids uuid[] default array[]::uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  clean_skill_ids uuid[] := array[]::uuid[];
  candidate_skill_id uuid;
  custom_skill_count integer;
  item_ordinal integer;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles p where p.id = me) then
    raise exception 'Profile not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(me::text, 0));

  foreach candidate_skill_id in array coalesce(p_skill_ids, array[]::uuid[])
  loop
    if candidate_skill_id is null or candidate_skill_id = any(clean_skill_ids) then
      continue;
    end if;

    if not exists (
      select 1
      from public.skills s
      where s.id = candidate_skill_id
        and coalesce(s.is_active, true) = true
    ) then
      raise exception 'Invalid or inactive catalog skill';
    end if;

    clean_skill_ids := array_append(clean_skill_ids, candidate_skill_id);
  end loop;

  select count(*)::integer
  into custom_skill_count
  from public.profile_custom_skills pcs
  where pcs.profile_id = me;

  if cardinality(clean_skill_ids) + custom_skill_count > 6 then
    raise exception 'A profile can publish at most 6 skills';
  end if;

  delete from public.profile_skills ps where ps.profile_id = me;

  insert into public.profile_skills (
    profile_id,
    skill_id,
    experience_level,
    years_experience,
    is_primary,
    sort_order
  )
  select
    me,
    selected.skill_id,
    'beginner',
    0,
    selected.ordinality = 1,
    selected.ordinality::integer - 1
  from unnest(clean_skill_ids) with ordinality as selected(skill_id, ordinality);

  with reordered_custom_skills as (
    select
      pcs.id,
      (row_number() over (order by pcs.sort_order, pcs.created_at, pcs.id))::integer - 1 as custom_ordinal
    from public.profile_custom_skills pcs
    where pcs.profile_id = me
  )
  update public.profile_custom_skills pcs
  set
    sort_order = cardinality(clean_skill_ids) + reordered_custom_skills.custom_ordinal,
    updated_at = now()
  from reordered_custom_skills
  where pcs.id = reordered_custom_skills.id;
end;
$$;

create or replace function public.replace_own_profile_skills(
  p_items jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  skill_item jsonb;
  item_ordinal integer;
  item_source text;
  item_skill_id uuid;
  clean_name text;
  clean_category text;
  selected_catalog_ids uuid[] := array[]::uuid[];
  selected_custom_names text[] := array[]::text[];
  custom_skill_count integer := 0;
  total_skill_count integer;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles p where p.id = me) then
    raise exception 'Profile not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(me::text, 0));

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Skills payload must be an array';
  end if;

  total_skill_count := jsonb_array_length(p_items);

  if total_skill_count > 6 then
    raise exception 'A profile can publish at most 6 skills';
  end if;

  for skill_item, item_ordinal in
    select value, ordinality::integer
    from jsonb_array_elements(p_items) with ordinality
  loop
    item_source := nullif(btrim(skill_item->>'source'), '');

    if item_source = 'catalog' then
      begin
        item_skill_id := (skill_item->>'id')::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Invalid catalog skill id';
      end;

      if item_skill_id is null
        or item_skill_id = any(selected_catalog_ids)
        or not exists (
          select 1
          from public.skills s
          where s.id = item_skill_id
            and coalesce(s.is_active, true) = true
        )
      then
        raise exception 'Invalid, duplicated, or inactive catalog skill';
      end if;

      selected_catalog_ids := array_append(selected_catalog_ids, item_skill_id);
    elsif item_source = 'custom' then
      custom_skill_count := custom_skill_count + 1;
      clean_name := regexp_replace(btrim(coalesce(skill_item->>'name', '')), '\s+', ' ', 'g');
      clean_category := btrim(coalesce(skill_item->>'category', ''));

      if custom_skill_count > 3 then
        raise exception 'A profile can publish at most 3 custom skills';
      end if;

      if char_length(clean_name) < 2 or char_length(clean_name) > 50 then
        raise exception 'Custom skill names must contain between 2 and 50 characters';
      end if;

      if clean_name ~* '(https?://|www\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,})' then
        raise exception 'Custom skills cannot contain links or email addresses';
      end if;

      if clean_category not in ('Hogar', 'Mascotas', 'Tecnología', 'Recados', 'Personas') then
        raise exception 'Invalid custom skill category';
      end if;

      if lower(clean_name) = any(selected_custom_names) then
        raise exception 'Duplicated custom skill';
      end if;

      if exists (
        select 1
        from public.skills s
        where coalesce(s.is_active, true) = true
          and lower(s.name) = lower(clean_name)
      ) then
        raise exception 'This skill already exists in the suggested catalog';
      end if;

      selected_custom_names := array_append(selected_custom_names, lower(clean_name));
    else
      raise exception 'Invalid skill source';
    end if;
  end loop;

  delete from public.profile_skills ps where ps.profile_id = me;
  delete from public.profile_custom_skills pcs where pcs.profile_id = me;

  for skill_item, item_ordinal in
    select value, ordinality::integer
    from jsonb_array_elements(p_items) with ordinality
  loop
    item_source := btrim(skill_item->>'source');

    if item_source = 'catalog' then
      item_skill_id := (skill_item->>'id')::uuid;

      insert into public.profile_skills (
        profile_id,
        skill_id,
        experience_level,
        years_experience,
        is_primary,
        sort_order
      )
      values (me, item_skill_id, 'beginner', 0, item_ordinal = 1, item_ordinal - 1);
    else
      clean_name := regexp_replace(btrim(skill_item->>'name'), '\s+', ' ', 'g');
      clean_category := btrim(skill_item->>'category');

      insert into public.profile_custom_skills (
        profile_id,
        name,
        category,
        sort_order
      )
      values (me, clean_name, clean_category, item_ordinal - 1);
    end if;
  end loop;
end;
$$;

revoke execute on function public.replace_own_catalog_skills(uuid[]) from public, anon;
revoke execute on function public.replace_own_profile_skills(jsonb) from public, anon;
grant execute on function public.replace_own_catalog_skills(uuid[]) to authenticated;
grant execute on function public.replace_own_profile_skills(jsonb) to authenticated;

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
  p_skill_filter text default null,
  p_search_query text default null
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
  with search_input as (
    select case
      when char_length(btrim(coalesce(p_search_query, ''))) >= 3
        then left(btrim(p_search_query), 80)
      else null
    end as raw_query
  ),
  parsed_search as (
    select
      search_input.raw_query,
      case
        when search_input.raw_query is null then null::tsquery
        else (
          select case
            when count(*) = 0 then null::tsquery
            else to_tsquery(
              'spanish'::regconfig,
              string_agg(quote_literal(search_lexeme) || ':*', ' | ')
            )
          end
          from unnest(
            tsvector_to_array(to_tsvector('spanish'::regconfig, search_input.raw_query))
          ) as search_terms(search_lexeme)
        )
      end as query
    from search_input
  ),
  search_profile_ids as (
    select ps.profile_id
    from parsed_search
    join public.skills s
      on parsed_search.query is not null
      and s.search_vector @@ parsed_search.query
      and coalesce(s.is_active, true) = true
    join public.profile_skills ps on ps.skill_id = s.id

    union

    select pcs.profile_id
    from parsed_search
    join public.profile_custom_skills pcs
      on parsed_search.query is not null
      and pcs.search_vector @@ parsed_search.query
  ),
  candidate_profiles as (
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
      ) or exists (
        select 1
        from public.profile_custom_skills pcs
        where pcs.profile_id = p.id
          and nullif(trim(p_skill_filter), '') is not null
          and (
            pcs.id::text = nullif(trim(p_skill_filter), '')
            or pcs.name = nullif(trim(p_skill_filter), '')
            or pcs.category = nullif(trim(p_skill_filter), '')
          )
      ) as skill_matches,
      (
        parsed_search.raw_query is null
        or (
          parsed_search.query is not null
          and search_profile_ids.profile_id is not null
        )
      ) as search_matches
    from public.profiles p
    cross join parsed_search
    left join search_profile_ids on search_profile_ids.profile_id = p.id
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
      cp.search_matches = true
      and (
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

revoke execute on function public.get_public_helpers_for_map(
  double precision, double precision, double precision, boolean,
  double precision, double precision, double precision, double precision,
  integer, uuid, text, text
) from public;

grant execute on function public.get_public_helpers_for_map(
  double precision, double precision, double precision, boolean,
  double precision, double precision, double precision, double precision,
  integer, uuid, text, text
) to anon, authenticated;

notify pgrst, 'reload schema';

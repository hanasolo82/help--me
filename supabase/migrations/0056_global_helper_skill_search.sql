-- Global skill search for the requester map.
-- A valid textual search intentionally ignores the current map viewport, while
-- preserving the public-profile and availability gates from migration 0055.

-- Retira también firmas heredadas que pudieron quedar de despliegues previos.
-- PostgreSQL identifica una función por nombre y tipos de argumentos, por lo
-- que un DROP de la firma actual no elimina overloads antiguos.
do $$
declare
  function_signature text;
begin
  for function_signature in
    select proc.oid::regprocedure::text
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = 'get_public_helpers_for_map'
  loop
    execute format('drop function %s', function_signature);
  end loop;
end;
$$;

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
  distance_km double precision,
  search_rank real,
  total_count bigint
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
              string_agg(quote_literal(search_lexeme) || ':*', ' | ' order by search_lexeme)
            )
          end
          from unnest(
            tsvector_to_array(to_tsvector('spanish'::regconfig, search_input.raw_query))
          ) as search_terms(search_lexeme)
        )
      end as any_terms_query,
      case
        when search_input.raw_query is null then null::tsquery
        else (
          select case
            when count(*) = 0 then null::tsquery
            else to_tsquery(
              'spanish'::regconfig,
              string_agg(quote_literal(search_lexeme) || ':*', ' & ' order by search_lexeme)
            )
          end
          from unnest(
            tsvector_to_array(to_tsvector('spanish'::regconfig, search_input.raw_query))
          ) as search_terms(search_lexeme)
        )
      end as all_terms_query
    from search_input
  ),
  catalog_search_matches as (
    select
      ps.profile_id,
      bool_or(s.search_vector @@ parsed_search.all_terms_query) as all_terms_match,
      max(ts_rank(s.search_vector, parsed_search.any_terms_query))::real as search_rank
    from parsed_search
    join public.skills s
      on parsed_search.any_terms_query is not null
      and s.search_vector @@ parsed_search.any_terms_query
      and coalesce(s.is_active, true) = true
    join public.profile_skills ps on ps.skill_id = s.id
    group by ps.profile_id
  ),
  custom_search_matches as (
    select
      pcs.profile_id,
      bool_or(pcs.search_vector @@ parsed_search.all_terms_query) as all_terms_match,
      max(ts_rank(pcs.search_vector, parsed_search.any_terms_query))::real as search_rank
    from parsed_search
    join public.profile_custom_skills pcs
      on parsed_search.any_terms_query is not null
      and pcs.search_vector @@ parsed_search.any_terms_query
    group by pcs.profile_id
  ),
  search_profile_matches as (
    select
      profile_id,
      bool_or(all_terms_match) as all_terms_match,
      max(search_rank)::real as search_rank
    from (
      select * from catalog_search_matches
      union all
      select * from custom_search_matches
    ) as matches
    group by profile_id
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
      parsed_search.raw_query is not null as search_active,
      coalesce(search_profile_matches.all_terms_match, false) as all_terms_match,
      coalesce(search_profile_matches.search_rank, 0::real) as search_rank,
      (
        parsed_search.raw_query is null
        or search_profile_matches.profile_id is not null
      ) as search_matches
    from public.profiles p
    cross join parsed_search
    left join search_profile_matches on search_profile_matches.profile_id = p.id
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
    where cp.search_matches = true
      and (
        cp.search_active = true
        or cp.skill_matches = true
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
  ),
  ranked_candidates as (
    select candidates.*, count(*) over() as total_count
    from candidates
    where
      candidates.search_active = true
      or candidates.skill_matches = true
      or p_radius_enabled = false
      or candidates.distance_km <= greatest(coalesce(p_radius_km, 10), 1)
  )
  select
    ranked_candidates.id,
    ranked_candidates.username,
    ranked_candidates.full_name,
    ranked_candidates.avatar_url,
    ranked_candidates.map_avatar_url,
    ranked_candidates.helper_status,
    ranked_candidates.availability_enabled,
    ranked_candidates.accepts_direct_requests,
    ranked_candidates.stripe_profile_verified,
    ranked_candidates.location_label,
    ranked_candidates.city,
    ranked_candidates.neighborhood,
    ranked_candidates.rating,
    ranked_candidates.completed_tasks,
    ranked_candidates.reviews_count,
    ranked_candidates.public_lat as lat,
    ranked_candidates.public_lng as lng,
    ranked_candidates.distance_km,
    ranked_candidates.search_rank,
    ranked_candidates.total_count
  from ranked_candidates
  order by
    case
      when ranked_candidates.search_active and ranked_candidates.all_terms_match then 0
      when ranked_candidates.search_active then 1
      when ranked_candidates.skill_matches then 0
      else 1
    end,
    case when ranked_candidates.search_active then ranked_candidates.search_rank else 0 end desc,
    ranked_candidates.distance_km asc,
    ranked_candidates.rating desc nulls last,
    ranked_candidates.id
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

do $$
begin
  if (
    select count(*)
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname = 'get_public_helpers_for_map'
  ) <> 1 then
    raise exception 'Expected exactly one public.get_public_helpers_for_map function';
  end if;
end;
$$;

notify pgrst, 'reload schema';

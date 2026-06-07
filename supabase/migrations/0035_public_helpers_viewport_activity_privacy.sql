-- HelpMe public helper discovery now uses viewport bounds and activity matching
-- instead of requester-controlled radius. It also stops exposing exact helper
-- coordinates: public map coordinates are rounded to an approximate area.

drop function if exists public.get_public_helpers_for_map(
  double precision,
  double precision,
  double precision,
  boolean,
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  uuid,
  text
);

drop function if exists public.get_public_helpers_for_map(
  double precision,
  double precision,
  double precision,
  boolean,
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  uuid
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
      cp.id,
      cp.username,
      cp.full_name,
      cp.avatar_url,
      cp.map_avatar_url,
      cp.helper_status,
      cp.availability_enabled,
      cp.location_label,
      cp.city,
      cp.neighborhood,
      cp.rating,
      cp.completed_tasks,
      cp.reviews_count,
      cp.public_lat as lat,
      cp.public_lng as lng,
      cp.skill_matches,
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
    candidates.location_label,
    candidates.city,
    candidates.neighborhood,
    candidates.rating,
    candidates.completed_tasks,
    candidates.reviews_count,
    candidates.lat,
    candidates.lng,
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
  double precision,
  double precision,
  double precision,
  boolean,
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  uuid,
  text
) to anon, authenticated;

notify pgrst, 'reload schema';

-- Rollback note: re-run migration 0033_update_public_helpers_map_rpc.sql to
-- restore exact-coordinate radius discovery. Do not drop profile columns.

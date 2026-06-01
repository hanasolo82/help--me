-- Public profile surface for third-party UI.
-- Keeps public reads away from private profile settings before profiles RLS is tightened.

drop view if exists public.public_profiles;

create view public.public_profiles as
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
  end as location_label
from public.profiles p;

grant select on public.public_profiles to anon, authenticated;

create or replace function public.get_public_helpers_for_map(
  p_center_lat double precision,
  p_center_lng double precision,
  p_radius_km double precision default 10,
  p_radius_enabled boolean default true,
  p_north double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_west double precision default null,
  p_limit integer default 12,
  p_exclude_profile_id uuid default null
)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  lat double precision,
  lng double precision,
  helper_status text,
  availability_enabled boolean,
  location_label text,
  distance_km double precision,
  rating numeric,
  completed_tasks integer
)
language sql
stable
security definer
set search_path = public
as $$
  with candidates as (
    select
      p.id,
      coalesce(p.display_name, p.full_name, p.username) as full_name,
      p.avatar_url,
      p.lat,
      p.lng,
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
      p.rating,
      p.completed_tasks,
      (
        6371 * 2 * asin(
          sqrt(
            power(sin(radians((p.lat - p_center_lat) / 2)), 2)
            + cos(radians(p_center_lat)) * cos(radians(p.lat))
            * power(sin(radians((p.lng - p_center_lng) / 2)), 2)
          )
        )
      ) as distance_km
    from public.profiles p
    where p.account_status = 'active'
      and p.helper_status = 'active'
      and p.availability_enabled = true
      and p.lat is not null
      and p.lng is not null
      and (p_exclude_profile_id is null or p.id <> p_exclude_profile_id)
      and (
        coalesce(p.verified, false) = true
        or coalesce(p.verified_email, false) = true
        or coalesce(p.verified_identity, false) = true
        or coalesce(p.identity_verified, false) = true
        or exists (
          select 1
          from public.profile_verifications pv
          where pv.profile_id = p.id
            and (
              pv.email_verified = true
              or pv.identity_verified = true
              or pv.background_checked = true
            )
        )
      )
      and (
        case
          when p_radius_enabled = true then
            p.lat between p_center_lat - (greatest(coalesce(p_radius_km, 10), 1) / 111)
              and p_center_lat + (greatest(coalesce(p_radius_km, 10), 1) / 111)
            and p.lng between p_center_lng - (greatest(coalesce(p_radius_km, 10), 1) / greatest(111 * cos(radians(p_center_lat)), 0.000001))
              and p_center_lng + (greatest(coalesce(p_radius_km, 10), 1) / greatest(111 * cos(radians(p_center_lat)), 0.000001))
          when p_north is not null and p_south is not null and p_east is not null and p_west is not null then
            p.lat between least(p_south, p_north) and greatest(p_south, p_north)
            and p.lng between least(p_west, p_east) and greatest(p_west, p_east)
          else false
        end
      )
  )
  select
    candidates.id,
    candidates.full_name,
    candidates.avatar_url,
    candidates.lat,
    candidates.lng,
    candidates.helper_status,
    candidates.availability_enabled,
    candidates.location_label,
    candidates.distance_km,
    candidates.rating,
    candidates.completed_tasks
  from candidates
  where p_radius_enabled = false or candidates.distance_km <= greatest(coalesce(p_radius_km, 10), 1)
  order by candidates.distance_km asc, candidates.rating desc nulls last
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
  uuid
) to anon, authenticated;

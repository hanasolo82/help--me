alter table public.profiles
  add column if not exists search_radius_enabled boolean not null default false,
  add column if not exists show_approx_location boolean not null default true,
  add column if not exists visible_zone_name text;

update public.profiles
set
  search_radius_enabled = coalesce(search_radius_enabled, false),
  show_approx_location = coalesce(show_approx_location, true)
where search_radius_enabled is null
   or show_approx_location is null;

alter table public.profiles
  alter column search_radius_enabled set default false,
  alter column search_radius_enabled set not null,
  alter column show_approx_location set default true,
  alter column show_approx_location set not null;

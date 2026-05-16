-- Extiende public.profiles con preferencias de settings sin romper el schema anterior.
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists map_avatar_url text,
  add column if not exists home_background_url text,
  add column if not exists theme text default 'light',
  add column if not exists accent_color text default '#2563eb',
  add column if not exists search_radius_km int default 10,
  add column if not exists show_approx_location boolean default true,
  add column if not exists notify_nearby_tasks boolean default true,
  add column if not exists notify_messages boolean default true,
  add column if not exists notify_payments boolean default true;

-- Mantiene datos antiguos visibles en la nueva UI.
update public.profiles
set
  display_name = coalesce(display_name, full_name, username),
  theme = coalesce(theme, 'light'),
  accent_color = coalesce(accent_color, '#2563eb'),
  search_radius_km = coalesce(search_radius_km, 10),
  show_approx_location = coalesce(show_approx_location, true),
  notify_nearby_tasks = coalesce(notify_nearby_tasks, true),
  notify_messages = coalesce(notify_messages, true),
  notify_payments = coalesce(notify_payments, true)
where display_name is null
   or theme is null
   or accent_color is null
   or search_radius_km is null
   or show_approx_location is null
   or notify_nearby_tasks is null
   or notify_messages is null
   or notify_payments is null;

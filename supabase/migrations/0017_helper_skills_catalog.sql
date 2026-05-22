-- Helper skills catalog and matching metadata.
-- TODO: task_skills will be introduced later to match tasks and helpers by compatibility.

alter table public.skills
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

alter table public.profile_skills
  add column if not exists is_primary boolean not null default false;

update public.skills
set
  is_active = coalesce(is_active, true),
  sort_order = coalesce(sort_order, 0);

insert into public.skills (name, icon, category, is_active, sort_order)
values
  ('Montaje de muebles', '🛠️', 'Hogar', true, 10),
  ('Limpieza puntual', '🧽', 'Hogar', true, 20),
  ('Jardinería', '🌿', 'Hogar', true, 30),
  ('Pequeñas reparaciones', '🔧', 'Hogar', true, 40),
  ('Organización del hogar', '📦', 'Hogar', true, 50),
  ('Pintura básica', '🎨', 'Hogar', true, 60),
  ('Paseo de perros', '🐶', 'Mascotas', true, 110),
  ('Cuidado de mascotas', '🐾', 'Mascotas', true, 120),
  ('Visitas a domicilio', '🏠', 'Mascotas', true, 130),
  ('Alimentación y medicación', '💊', 'Mascotas', true, 140),
  ('Limpieza de areneros', '🧼', 'Mascotas', true, 150),
  ('Ayuda con móvil', '📱', 'Tecnología', true, 210),
  ('Ayuda con ordenador', '💻', 'Tecnología', true, 220),
  ('Configuración WiFi', '📶', 'Tecnología', true, 230),
  ('Instalación de apps', '⬇️', 'Tecnología', true, 240),
  ('Videollamadas y configuración', '🎥', 'Tecnología', true, 250),
  ('Copias de seguridad', '☁️', 'Tecnología', true, 260),
  ('Compras', '🛒', 'Recados', true, 310),
  ('Farmacia', '💊', 'Recados', true, 320),
  ('Gestiones', '📄', 'Recados', true, 330),
  ('Recogida de paquetes', '📦', 'Recados', true, 340),
  ('Entregas cercanas', '🚲', 'Recados', true, 350),
  ('Acompañamiento', '🤝', 'Personas', true, 410),
  ('Ayuda a mayores', '👵', 'Personas', true, 420),
  ('Apoyo puntual', '🫶', 'Personas', true, 430),
  ('Conversación y compañía', '☕', 'Personas', true, 440),
  ('Ir a citas o gestiones', '🚶', 'Personas', true, 450),
  ('Lectura y apoyo en casa', '📖', 'Personas', true, 460),
  ('Traslados cortos', '🚗', 'Personas', true, 470),
  ('Acompañamiento digital', '🧠', 'Personas', true, 480)
on conflict (name) do update
set
  icon = excluded.icon,
  category = excluded.category,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;


-- helpMe migration 0003
-- Estado publico/operativo del profile para ocultar tareas de usuarios dados de baja o suspendidos.
-- Ejecutar en SQL editor de Supabase despues de las migraciones anteriores.

alter table public.profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'unavailable', 'suspended'));

create index if not exists profiles_account_status_idx on public.profiles(account_status);

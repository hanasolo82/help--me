-- Adds a human-readable task location label for map popups and task cards.
-- Safe additive migration: lat/lng already exist and remain the source of truth
-- for task waypoints and matching.

alter table public.tasks
  add column if not exists location_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_location_label_length'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_location_label_length
      check (location_label is null or char_length(location_label) <= 240);
  end if;
end $$;

-- RLS: no policy change is required. Existing task insert/update policies already
-- restrict writes to the authenticated requester for their own task.
-- Rollback note: drop constraint tasks_location_label_length and column
-- public.tasks.location_label only after removing frontend reads/writes.

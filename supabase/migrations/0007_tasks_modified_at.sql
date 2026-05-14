alter table public.tasks
  add column if not exists modified_at timestamptz;

create index if not exists tasks_modified_at_idx
on public.tasks(modified_at desc);

alter table public.tasks
  add column if not exists cancelled_at timestamptz;

create index if not exists tasks_cancelled_at_idx
on public.tasks(cancelled_at desc);

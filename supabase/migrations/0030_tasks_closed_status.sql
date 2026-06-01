-- Allow tasks to enter the terminal closed state after transfer settlement.

alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('draft', 'open', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled'));

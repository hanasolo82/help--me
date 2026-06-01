-- Security & Persistence Hardening
-- - Normal users can read related payments, but only trusted backend/service_role flows write them.
-- - Helpers can accept/progress tasks, but only requesters can complete or cancel them.
-- - Helper certificates are stored in a private bucket with owner-only metadata.

-- Payments: keep participant visibility, remove direct client writes.
alter table public.payments enable row level security;

drop policy if exists "Payments readable by participants" on public.payments;
drop policy if exists "Payments insertable by payer" on public.payments;
drop policy if exists "Payment statuses manageable by participants" on public.payments;

create policy "Payments readable by participants"
  on public.payments
  for select
  to authenticated
  using (payer_id = auth.uid() or receiver_id = auth.uid());

revoke insert, update, delete on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- Tasks: replace the broad requester/helper update policy with narrower transition policies.
drop policy if exists "Requester or helper can update related tasks" on public.tasks;
drop policy if exists "Requester can update own tasks" on public.tasks;
drop policy if exists "Helper can accept open tasks" on public.tasks;
drop policy if exists "Helper can progress accepted tasks" on public.tasks;

create policy "Requester can update own tasks"
  on public.tasks
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Helper can accept open tasks"
  on public.tasks
  for update
  to authenticated
  using (
    status = 'open'
    and accepted_by is null
    and created_by <> auth.uid()
  )
  with check (
    status = 'assigned'
    and accepted_by = auth.uid()
    and created_by <> auth.uid()
  );

create policy "Helper can progress accepted tasks"
  on public.tasks
  for update
  to authenticated
  using (
    accepted_by = auth.uid()
    and status in ('assigned', 'in_progress')
  )
  with check (
    accepted_by = auth.uid()
    and created_by <> auth.uid()
    and status in ('assigned', 'in_progress')
  );

-- Certificates: private storage + owner-only metadata. Approved public metadata can be
-- added later through a dedicated view/RPC without exposing file contents.
insert into storage.buckets (id, name, public)
values ('profile-certificates', 'profile-certificates', false)
on conflict (id) do update
set public = excluded.public;

create table if not exists public.profile_certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_certificates_profile_id_idx
  on public.profile_certificates(profile_id);

create index if not exists profile_certificates_status_idx
  on public.profile_certificates(status);

alter table public.profile_certificates enable row level security;

drop policy if exists "Profile certificates readable by owner" on public.profile_certificates;
drop policy if exists "Profile certificates insertable by owner" on public.profile_certificates;
drop policy if exists "Profile certificates deletable by owner" on public.profile_certificates;

create policy "Profile certificates readable by owner"
  on public.profile_certificates
  for select
  to authenticated
  using (profile_id = auth.uid());

create policy "Profile certificates insertable by owner"
  on public.profile_certificates
  for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "Profile certificates deletable by owner"
  on public.profile_certificates
  for delete
  to authenticated
  using (profile_id = auth.uid());

grant select, insert, delete on public.profile_certificates to authenticated;

drop policy if exists "Certificate objects readable by owner" on storage.objects;
drop policy if exists "Certificate objects insertable by owner" on storage.objects;
drop policy if exists "Certificate objects deletable by owner" on storage.objects;

create policy "Certificate objects readable by owner"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Certificate objects insertable by owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Certificate objects deletable by owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

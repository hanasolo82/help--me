-- Durable payment release queue.
-- Stripe is deliberately called outside these transactions. The database owns
-- the state machine and a leased job; the worker owns the external request.

create table if not exists public.payment_release_jobs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'retry_wait', 'succeeded', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  idempotency_key text,
  next_attempt_at timestamptz not null default now(),
  processing_started_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_release_jobs_ready_idx
  on public.payment_release_jobs (next_attempt_at, created_at)
  where status in ('queued', 'retry_wait');

create index if not exists payment_release_jobs_lease_idx
  on public.payment_release_jobs (processing_started_at)
  where status = 'processing';

alter table public.payment_release_jobs enable row level security;
revoke all on public.payment_release_jobs from anon, authenticated;

-- The browser must never advance an in-progress task to completed directly.
-- Service-role code reaches this transition through queue_task_payment_release.
create or replace function public.guard_authenticated_task_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    return new;
  end if;

  if old.status is not distinct from new.status
    and old.accepted_by is not distinct from new.accepted_by then
    return new;
  end if;

  if old.created_by <> me then
    raise exception 'Only the requester can change task state';
  end if;

  if old.status in ('draft', 'open')
    and old.accepted_by is null
    and new.created_by = old.created_by
    and new.accepted_by is null
    and new.status in ('draft', 'open', 'cancelled') then
    return new;
  end if;

  if old.status = 'open'
    and old.accepted_by is null
    and new.created_by = old.created_by
    and new.accepted_by is not null
    and new.accepted_by <> old.created_by
    and new.status = 'assigned' then
    return new;
  end if;

  if old.status = 'assigned'
    and old.accepted_by is not null
    and new.created_by = old.created_by
    and new.accepted_by is null
    and new.status = 'open' then
    return new;
  end if;

  if old.status in ('draft', 'open', 'assigned', 'in_progress')
    and new.created_by = old.created_by
    and new.accepted_by is not distinct from old.accepted_by
    and new.status = 'cancelled' then
    return new;
  end if;

  raise exception 'Invalid client task state transition from % to %', old.status, new.status;
end;
$$;

create or replace function public.queue_task_payment_release(
  p_task_id uuid,
  p_requester_id uuid
)
returns table (
  job_id uuid,
  payment_id uuid,
  task_status text,
  payment_status text,
  job_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.tasks%rowtype;
  payment_row public.payments%rowtype;
  job_row public.payment_release_jobs%rowtype;
  now_at timestamptz := now();
begin
  select * into task_row
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  if task_row.created_by <> p_requester_id then
    raise exception 'Only the requester can complete this task' using errcode = '42501';
  end if;

  if task_row.accepted_by is null then
    raise exception 'Task has no accepted helper' using errcode = 'P0001';
  end if;

  select * into payment_row
  from public.payments
  where task_id = task_row.id
  for update;

  if not found then
    raise exception 'Task has no payment to release' using errcode = 'P0002';
  end if;

  if payment_row.requester_profile_id <> task_row.created_by
    or payment_row.helper_profile_id <> task_row.accepted_by then
    raise exception 'Payment participants do not match the task' using errcode = 'P0001';
  end if;

  if task_row.status = 'closed' then
    if payment_row.status <> 'released' then
      raise exception 'Closed task has no released payment' using errcode = 'P0001';
    end if;

    select * into job_row
    from public.payment_release_jobs
    where payment_id = payment_row.id;

    return query select job_row.id, payment_row.id, task_row.status, payment_row.status,
      coalesce(job_row.status, 'succeeded');
    return;
  end if;

  if task_row.status not in ('in_progress', 'completed') then
    raise exception 'Task must be in progress or completed before release' using errcode = 'P0001';
  end if;

  if payment_row.provider = 'external' or payment_row.status = 'external_agreed' then
    update public.tasks
    set status = 'completed',
        completed_at = coalesce(completed_at, now_at),
        updated_at = now_at,
        modified_at = now_at
    where id = task_row.id
      and status in ('in_progress', 'completed');

    return query select null::uuid, payment_row.id, 'completed'::text, payment_row.status, 'external'::text;
    return;
  end if;

  if payment_row.status = 'released' then
    raise exception 'Released payment is not paired with a closed task' using errcode = 'P0001';
  end if;

  if payment_row.status not in ('held', 'release_pending', 'transferring') then
    raise exception 'Payment must be held before release' using errcode = 'P0001';
  end if;

  select * into job_row
  from public.payment_release_jobs
  where payment_id = payment_row.id
  for update;

  update public.tasks
  set status = 'completed',
      completed_at = coalesce(completed_at, now_at),
      updated_at = now_at,
      modified_at = now_at
  where id = task_row.id
    and status in ('in_progress', 'completed');

  if job_row.id is null then
    update public.payments
    set status = 'release_pending',
        reconciliation_status = 'pending',
        reconciliation_error = null,
        updated_at = now_at
    where id = payment_row.id;

    insert into public.payment_release_jobs (
      payment_id,
      task_id,
      requested_by,
      status,
      next_attempt_at
    ) values (
      payment_row.id,
      task_row.id,
      p_requester_id,
      'queued',
      now_at
    )
    returning * into job_row;
  end if;

  select * into payment_row
  from public.payments
  where id = payment_row.id;

  return query select job_row.id, payment_row.id, 'completed'::text, payment_row.status, job_row.status;
end;
$$;

create or replace function public.claim_payment_release_jobs(
  p_limit integer default 10,
  p_lease_seconds integer default 300,
  p_job_id uuid default null
)
returns table (
  job_id uuid,
  payment_id uuid,
  task_id uuid,
  attempt_count integer,
  idempotency_key text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.payment_release_jobs j
    where (p_job_id is null or j.id = p_job_id)
      and (
        (j.status in ('queued', 'retry_wait') and j.next_attempt_at <= now())
        or (
          j.status = 'processing'
          and j.processing_started_at < now() - make_interval(secs => greatest(p_lease_seconds, 30))
        )
      )
    order by j.next_attempt_at, j.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 50)
  ), claimed as (
    update public.payment_release_jobs j
    set status = 'processing',
        attempt_count = case when j.idempotency_key is null then j.attempt_count + 1 else j.attempt_count end,
        idempotency_key = case
          when j.idempotency_key is null then format('transfer:payment:%s:attempt:%s', j.payment_id, j.attempt_count + 1)
          else j.idempotency_key
        end,
        processing_started_at = now(),
        last_attempt_at = now(),
        updated_at = now()
    from candidates c
    where j.id = c.id
    returning j.*
  )
  select c.id, c.payment_id, c.task_id, c.attempt_count, c.idempotency_key
  from claimed c;
end;
$$;

create or replace function public.finalize_payment_release(
  p_job_id uuid,
  p_payment_id uuid,
  p_stripe_transfer_id text,
  p_stripe_balance_transaction_id text,
  p_destination_account_id text,
  p_source_transaction_id text,
  p_amount_cents bigint,
  p_currency text,
  p_attempt_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  job_row public.payment_release_jobs%rowtype;
  payment_row public.payments%rowtype;
  task_row public.tasks%rowtype;
  transfer_row public.transfers%rowtype;
  expected_destination text;
  now_at timestamptz := now();
begin
  select * into job_row
  from public.payment_release_jobs
  where id = p_job_id
    and payment_id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment release job not found' using errcode = 'P0002';
  end if;

  if p_attempt_idempotency_key is not null
    and job_row.idempotency_key is distinct from p_attempt_idempotency_key then
    raise exception 'Payment release attempt does not own this job' using errcode = 'P0001';
  end if;

  select * into payment_row
  from public.payments
  where id = p_payment_id
  for update;

  select * into task_row
  from public.tasks
  where id = payment_row.task_id
  for update;

  if task_row.id is null
    or task_row.created_by <> payment_row.requester_profile_id
    or task_row.accepted_by <> payment_row.helper_profile_id then
    raise exception 'Payment participants do not match the task' using errcode = 'P0001';
  end if;

  if p_source_transaction_id is not null
    and payment_row.stripe_charge_id is distinct from p_source_transaction_id then
    raise exception 'Transfer source transaction does not match the payment charge' using errcode = 'P0001';
  end if;

  if payment_row.helper_amount_cents <> p_amount_cents
    or lower(payment_row.currency) <> lower(p_currency) then
    raise exception 'Transfer amount or currency does not match the payment' using errcode = 'P0001';
  end if;

  select stripe_account_id into expected_destination
  from public.connect_accounts
  where profile_id = payment_row.helper_profile_id;

  if expected_destination is distinct from p_destination_account_id then
    raise exception 'Transfer destination does not match the helper account' using errcode = 'P0001';
  end if;

  select * into transfer_row
  from public.transfers
  where payment_id = payment_row.id
  for update;

  if p_source_transaction_id is null
    and (transfer_row.id is null or transfer_row.stripe_transfer_id <> p_stripe_transfer_id) then
    raise exception 'A source transaction is required for a new Stripe transfer' using errcode = 'P0001';
  end if;

  if transfer_row.id is not null
    and transfer_row.stripe_transfer_id is not null
    and transfer_row.stripe_transfer_id <> p_stripe_transfer_id then
    raise exception 'Payment already has a different Stripe transfer' using errcode = 'P0001';
  end if;

  insert into public.transfers (
    payment_id,
    requester_profile_id,
    helper_profile_id,
    connect_account_profile_id,
    stripe_transfer_id,
    stripe_balance_transaction_id,
    amount_cents,
    currency,
    correlation_id,
    idempotency_key,
    status,
    failure_code,
    reversed_at,
    metadata,
    updated_at
  ) values (
    payment_row.id,
    payment_row.requester_profile_id,
    payment_row.helper_profile_id,
    payment_row.helper_profile_id,
    p_stripe_transfer_id,
    p_stripe_balance_transaction_id,
    payment_row.helper_amount_cents,
    lower(payment_row.currency),
    payment_row.correlation_id,
    job_row.idempotency_key,
    'paid',
    null,
    null,
    jsonb_build_object(
      'payment_id', payment_row.id,
      'task_id', payment_row.task_id,
      'source_transaction', p_source_transaction_id,
      'destination_account', p_destination_account_id,
      'release_job_id', job_row.id
    ),
    now_at
  )
  on conflict (payment_id) do update
  set stripe_transfer_id = excluded.stripe_transfer_id,
      stripe_balance_transaction_id = excluded.stripe_balance_transaction_id,
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      correlation_id = coalesce(public.transfers.correlation_id, excluded.correlation_id),
      idempotency_key = coalesce(public.transfers.idempotency_key, excluded.idempotency_key),
      status = 'paid',
      failure_code = null,
      reversed_at = null,
      metadata = public.transfers.metadata || excluded.metadata,
      updated_at = now_at;

  update public.payments
  set status = 'released',
      stripe_transfer_id = p_stripe_transfer_id,
      stripe_balance_transaction_id = p_stripe_balance_transaction_id,
      released_at = coalesce(released_at, now_at),
      reconciliation_status = 'reconciled',
      reconciliation_error = null,
      last_reconciled_at = now_at,
      updated_at = now_at
  where id = payment_row.id;

  if task_row.status not in ('completed', 'closed') then
    raise exception 'Task is not eligible for closing after transfer' using errcode = 'P0001';
  end if;

  update public.tasks
  set status = 'closed',
      updated_at = now_at,
      modified_at = now_at
  where id = task_row.id
    and status in ('completed', 'closed');

  update public.payment_release_jobs
  set status = 'succeeded',
      completed_at = coalesce(completed_at, now_at),
      processing_started_at = null,
      next_attempt_at = now_at,
      last_error = null,
      last_error_code = null,
      updated_at = now_at
  where id = job_row.id;

  insert into public.payment_ledger_entries (
    payment_id,
    requester_profile_id,
    helper_profile_id,
    entry_type,
    direction,
    account_code,
    amount_cents,
    platform_fee_cents,
    helper_amount_cents,
    currency,
    stripe_object_type,
    stripe_object_id,
    correlation_id,
    idempotency_key,
    created_by_system,
    metadata
  ) values (
    payment_row.id,
    payment_row.requester_profile_id,
    payment_row.helper_profile_id,
    'transfer_created',
    'debit',
    'payments.transfer_created',
    payment_row.helper_amount_cents,
    payment_row.platform_fee_cents,
    payment_row.helper_amount_cents,
    lower(payment_row.currency),
    'transfer',
    p_stripe_transfer_id,
    coalesce(payment_row.correlation_id, gen_random_uuid()),
    format('ledger:release:%s:%s', payment_row.id, p_stripe_transfer_id),
    'backend',
    jsonb_build_object('payment_id', payment_row.id, 'task_id', task_row.id, 'release_job_id', job_row.id)
  ) on conflict (idempotency_key) do nothing;

  return jsonb_build_object(
    'payment_id', payment_row.id,
    'task_id', task_row.id,
    'job_id', job_row.id,
    'payment_status', 'released',
    'task_status', 'closed',
    'transfer_status', 'paid',
    'stripe_transfer_id', p_stripe_transfer_id
  );
end;
$$;

create or replace function public.schedule_payment_release_retry(
  p_job_id uuid,
  p_error_code text,
  p_error_message text,
  p_definitive boolean,
  p_mark_needs_review boolean default false
)
returns public.payment_release_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job_row public.payment_release_jobs%rowtype;
  next_status text;
  next_attempt timestamptz;
  next_error text := left(coalesce(nullif(trim(p_error_message), ''), 'Payment release attempt failed.'), 1000);
  next_error_code text := left(coalesce(nullif(trim(p_error_code), ''), 'payment_release_failed'), 120);
begin
  select * into job_row
  from public.payment_release_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Payment release job not found' using errcode = 'P0002';
  end if;

  if job_row.status = 'succeeded' then
    return job_row;
  end if;

  next_status := case when p_definitive and job_row.attempt_count >= 5 then 'dead_letter' else 'retry_wait' end;
  next_attempt := case
    when next_status = 'dead_letter' then now()
    else now() + make_interval(mins => least(60, power(2::numeric, least(job_row.attempt_count, 5))::integer))
  end;

  update public.payment_release_jobs
  set status = next_status,
      idempotency_key = case when p_definitive then null else idempotency_key end,
      processing_started_at = null,
      next_attempt_at = next_attempt,
      last_error = next_error,
      last_error_code = next_error_code,
      updated_at = now()
  where id = job_row.id
  returning * into job_row;

  if p_mark_needs_review or next_status = 'dead_letter' then
    update public.payments
    set status = 'held',
        reconciliation_status = 'needs_review',
        reconciliation_error = next_error,
        updated_at = now()
    where id = job_row.payment_id
      and status <> 'released';
  end if;

  return job_row;
end;
$$;

create or replace function public.mark_payment_transfer_reversed(
  p_payment_id uuid,
  p_stripe_transfer_id text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.transfers
  set status = 'reversed',
      reversed_at = coalesce(reversed_at, now()),
      failure_code = left(coalesce(nullif(trim(p_reason), ''), 'transfer_reversed'), 120),
      updated_at = now()
  where payment_id = p_payment_id
    and stripe_transfer_id = p_stripe_transfer_id;

  update public.payments
  set reconciliation_status = 'needs_review',
      reconciliation_error = left(coalesce(nullif(trim(p_reason), ''), 'Transfer reversed.'), 1000),
      last_reconciled_at = now(),
      updated_at = now()
  where id = p_payment_id;
end;
$$;

revoke all on function public.queue_task_payment_release(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_payment_release_jobs(integer, integer, uuid) from public, anon, authenticated;
revoke all on function public.finalize_payment_release(uuid, uuid, text, text, text, text, bigint, text, text) from public, anon, authenticated;
revoke all on function public.schedule_payment_release_retry(uuid, text, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.mark_payment_transfer_reversed(uuid, text, text) from public, anon, authenticated;

grant execute on function public.queue_task_payment_release(uuid, uuid) to service_role;
grant execute on function public.claim_payment_release_jobs(integer, integer, uuid) to service_role;
grant execute on function public.finalize_payment_release(uuid, uuid, text, text, text, text, bigint, text, text) to service_role;
grant execute on function public.schedule_payment_release_retry(uuid, text, text, boolean, boolean) to service_role;
grant execute on function public.mark_payment_transfer_reversed(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

-- Financial architecture hardening: ledger-first, idempotent webhooks, Connect mirror.
-- Designed to coexist with the existing requester/helper flows while moving Stripe state
-- out of profiles and into canonical financial tables.

create extension if not exists pgcrypto;

-- Canonical Connect state. profiles keeps a legacy mirror for frontend compatibility.
create table if not exists public.connect_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique,
  country text not null default 'ES',
  default_currency text not null default 'eur',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  disabled_reason text,
  capabilities jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '{}'::jsonb,
  future_requirements jsonb not null default '{}'::jsonb,
  last_stripe_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists connect_accounts_stripe_account_id_idx
  on public.connect_accounts(stripe_account_id);

alter table public.connect_accounts enable row level security;

drop policy if exists "Connect accounts readable by owner" on public.connect_accounts;
create policy "Connect accounts readable by owner"
  on public.connect_accounts
  for select
  to authenticated
  using (profile_id = auth.uid());

revoke insert, update, delete on public.connect_accounts from anon, authenticated;
grant select on public.connect_accounts to authenticated;

create or replace function public.sync_legacy_profile_stripe_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set stripe_account_id = new.stripe_account_id,
      stripe_onboarding_completed = coalesce(new.details_submitted, false),
      stripe_charges_enabled = coalesce(new.charges_enabled, false),
      stripe_payouts_enabled = coalesce(new.payouts_enabled, false),
      last_stripe_sync_at = coalesce(new.last_stripe_sync_at, now()),
      updated_at = now()
  where id = new.profile_id;

  return new;
end;
$$;

drop trigger if exists connect_accounts_after_write on public.connect_accounts;
create trigger connect_accounts_after_write
after insert or update on public.connect_accounts
for each row execute function public.sync_legacy_profile_stripe_fields();

insert into public.connect_accounts (
  profile_id,
  stripe_account_id,
  country,
  default_currency,
  charges_enabled,
  payouts_enabled,
  details_submitted,
  disabled_reason,
  capabilities,
  requirements,
  future_requirements,
  last_stripe_sync_at,
  created_at,
  updated_at
)
select
  p.id,
  p.stripe_account_id,
  'ES',
  'eur',
  coalesce(p.stripe_charges_enabled, false),
  coalesce(p.stripe_payouts_enabled, false),
  coalesce(p.stripe_onboarding_completed, false),
  null,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  p.last_stripe_sync_at,
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
from public.profiles p
where p.stripe_account_id is not null
on conflict (profile_id) do update
set stripe_account_id = excluded.stripe_account_id,
    charges_enabled = excluded.charges_enabled,
    payouts_enabled = excluded.payouts_enabled,
    details_submitted = excluded.details_submitted,
    last_stripe_sync_at = excluded.last_stripe_sync_at,
    updated_at = now();

update public.profiles
set stripe_onboarding_completed = coalesce(c.details_submitted, false),
    stripe_charges_enabled = coalesce(c.charges_enabled, false),
    stripe_payouts_enabled = coalesce(c.payouts_enabled, false),
    last_stripe_sync_at = coalesce(c.last_stripe_sync_at, public.profiles.last_stripe_sync_at),
    updated_at = now()
from public.connect_accounts c
where c.profile_id = public.profiles.id;

-- Payments: canonical data + legacy compatibility fields.
alter table public.payments
  add column if not exists requester_profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists helper_profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists currency text not null default 'eur',
  add column if not exists amount_cents bigint,
  add column if not exists platform_fee_cents bigint not null default 0,
  add column if not exists helper_amount_cents bigint not null default 0,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_checkout_session_status text,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_balance_transaction_id text,
  add column if not exists correlation_id uuid,
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists reconciliation_status text not null default 'pending',
  add column if not exists last_reconciled_at timestamptz,
  add column if not exists reconciliation_error text,
  add column if not exists captured_at timestamptz,
  add column if not exists held_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists disputed_at timestamptz,
  add column if not exists voided_at timestamptz;

update public.payments
set requester_profile_id = coalesce(requester_profile_id, payer_id),
    helper_profile_id = coalesce(helper_profile_id, receiver_id),
    amount_cents = coalesce(amount_cents, round(coalesce(amount, 0)::numeric * 100)::bigint),
    platform_fee_cents = coalesce(platform_fee_cents, round(coalesce(platform_fee, 0)::numeric * 100)::bigint),
    helper_amount_cents = coalesce(helper_amount_cents, greatest(round((coalesce(amount, 0) - coalesce(platform_fee, 0))::numeric * 100)::bigint, 0)),
    currency = coalesce(currency, 'eur'),
    metadata = coalesce(metadata, '{}'::jsonb)
where requester_profile_id is null
   or helper_profile_id is null
   or amount_cents is null;

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status in (
      'draft',
      'requires_checkout',
      'processing',
      'captured',
      'held',
      'release_pending',
      'transferring',
      'released',
      'refunding',
      'refunded',
      'disputed',
      'failed',
      'voided',
      'pending',
      'requires_action',
      'succeeded'
    )
  );

alter table public.payments
  add constraint payments_reconciliation_status_check
  check (reconciliation_status in ('pending', 'reconciled', 'mismatch', 'needs_review'));

create index if not exists payments_task_id_idx on public.payments(task_id);
create index if not exists payments_requester_profile_id_idx on public.payments(requester_profile_id);
create index if not exists payments_helper_profile_id_idx on public.payments(helper_profile_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_correlation_id_idx on public.payments(correlation_id);
create index if not exists payments_reconciliation_status_idx on public.payments(reconciliation_status);

create unique index if not exists payments_stripe_payment_intent_id_idx
  on public.payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists payments_stripe_checkout_session_id_idx
  on public.payments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists payments_idempotency_key_idx
  on public.payments(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists payments_task_id_unique_idx
  on public.payments(task_id);

drop policy if exists "Payments readable by participants" on public.payments;
create policy "Payments readable by participants"
  on public.payments
  for select
  to authenticated
  using (
    payer_id = auth.uid()
    or receiver_id = auth.uid()
    or requester_profile_id = auth.uid()
    or helper_profile_id = auth.uid()
  );

revoke insert, update, delete on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- Ledger inbox and append-only journal.
create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  type text not null,
  livemode boolean not null default false,
  stripe_account_id text,
  payload jsonb not null,
  payload_hash text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'failed')),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  correlation_id uuid
);

create index if not exists stripe_webhook_events_type_idx on public.stripe_webhook_events(type);
create index if not exists stripe_webhook_events_processing_status_idx on public.stripe_webhook_events(processing_status);
create index if not exists stripe_webhook_events_received_at_idx on public.stripe_webhook_events(received_at desc);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

create table if not exists public.payment_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  requester_profile_id uuid references public.profiles(id) on delete cascade,
  helper_profile_id uuid references public.profiles(id) on delete cascade,
  entry_type text not null,
  direction text not null check (direction in ('debit', 'credit')),
  account_code text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  platform_fee_cents bigint not null default 0 check (platform_fee_cents >= 0),
  helper_amount_cents bigint not null default 0 check (helper_amount_cents >= 0),
  currency text not null default 'eur',
  stripe_object_type text,
  stripe_object_id text,
  source_event_id uuid references public.stripe_webhook_events(id) on delete set null,
  correlation_id uuid not null,
  idempotency_key text not null unique,
  created_by_system text not null default 'backend',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_ledger_entries_payment_id_idx on public.payment_ledger_entries(payment_id);
create index if not exists payment_ledger_entries_source_event_id_idx on public.payment_ledger_entries(source_event_id);
create index if not exists payment_ledger_entries_entry_type_idx on public.payment_ledger_entries(entry_type);
create index if not exists payment_ledger_entries_correlation_id_idx on public.payment_ledger_entries(correlation_id);
alter table public.payment_ledger_entries enable row level security;
revoke all on public.payment_ledger_entries from anon, authenticated;

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  requester_profile_id uuid references public.profiles(id) on delete cascade,
  helper_profile_id uuid not null references public.profiles(id) on delete cascade,
  connect_account_profile_id uuid references public.connect_accounts(profile_id) on delete cascade,
  stripe_transfer_id text unique,
  stripe_balance_transaction_id text,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'pending', 'paid', 'failed', 'reversed')),
  failure_code text,
  reversed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transfers_payment_id_idx on public.transfers(payment_id);
create index if not exists transfers_helper_profile_id_idx on public.transfers(helper_profile_id);
create index if not exists transfers_status_idx on public.transfers(status);
alter table public.transfers enable row level security;

drop policy if exists "Transfers readable by participants" on public.transfers;
create policy "Transfers readable by participants"
  on public.transfers
  for select
  to authenticated
  using (requester_profile_id = auth.uid() or helper_profile_id = auth.uid());

revoke insert, update, delete on public.transfers from anon, authenticated;
grant select on public.transfers to authenticated;

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  transfer_id uuid references public.transfers(id) on delete set null,
  requester_profile_id uuid references public.profiles(id) on delete cascade,
  helper_profile_id uuid not null references public.profiles(id) on delete cascade,
  connect_account_profile_id uuid references public.connect_accounts(profile_id) on delete cascade,
  stripe_payout_id text unique,
  stripe_balance_transaction_id text,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'eur',
  arrival_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_transit', 'paid', 'failed', 'canceled')),
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payouts_helper_profile_id_idx on public.payouts(helper_profile_id);
create index if not exists payouts_status_idx on public.payouts(status);
alter table public.payouts enable row level security;

drop policy if exists "Payouts readable by owner" on public.payouts;
create policy "Payouts readable by owner"
  on public.payouts
  for select
  to authenticated
  using (helper_profile_id = auth.uid() or requester_profile_id = auth.uid());

revoke insert, update, delete on public.payouts from anon, authenticated;
grant select on public.payouts to authenticated;

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  requester_profile_id uuid references public.profiles(id) on delete cascade,
  helper_profile_id uuid references public.profiles(id) on delete cascade,
  stripe_refund_id text unique,
  charge_id text,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'requested'
    check (status in ('requested', 'pending', 'succeeded', 'failed', 'canceled')),
  reason text,
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists refunds_payment_id_idx on public.refunds(payment_id);
create index if not exists refunds_status_idx on public.refunds(status);
create unique index if not exists refunds_payment_id_unique_idx on public.refunds(payment_id);
alter table public.refunds enable row level security;

drop policy if exists "Refunds readable by participants" on public.refunds;
create policy "Refunds readable by participants"
  on public.refunds
  for select
  to authenticated
  using (requester_profile_id = auth.uid() or helper_profile_id = auth.uid());

revoke insert, update, delete on public.refunds from anon, authenticated;
grant select on public.refunds to authenticated;

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  requester_profile_id uuid references public.profiles(id) on delete cascade,
  helper_profile_id uuid references public.profiles(id) on delete cascade,
  stripe_dispute_id text unique,
  charge_id text,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'opened'
    check (status in ('opened', 'needs_response', 'under_review', 'won', 'lost', 'closed')),
  reason text,
  evidence_due_by timestamptz,
  has_evidence boolean not null default false,
  outcome text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disputes_payment_id_idx on public.disputes(payment_id);
create index if not exists disputes_status_idx on public.disputes(status);
alter table public.disputes enable row level security;

drop policy if exists "Disputes readable by participants" on public.disputes;
create policy "Disputes readable by participants"
  on public.disputes
  for select
  to authenticated
  using (requester_profile_id = auth.uid() or helper_profile_id = auth.uid());

revoke insert, update, delete on public.disputes from anon, authenticated;
grant select on public.disputes to authenticated;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'error', 'critical')),
  actor_type text,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  before_state jsonb,
  after_state jsonb,
  correlation_id uuid,
  stripe_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_event_type_idx on public.audit_events(event_type);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id);
create index if not exists audit_events_correlation_id_idx on public.audit_events(correlation_id);
create index if not exists audit_events_created_at_idx on public.audit_events(created_at desc);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;

-- The legacy payments table remains readable to participants only; no direct client writes.
-- Existing tasks/chat/profile policies stay intact.

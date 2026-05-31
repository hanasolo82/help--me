-- Mirror Stripe transfer ids on payments for release/reconciliation tracking.

alter table public.payments
  add column if not exists stripe_transfer_id text;

create unique index if not exists payments_stripe_transfer_id_idx
  on public.payments(stripe_transfer_id)
  where stripe_transfer_id is not null;

-- Ensure transfers can be safely upserted by payment_id.

drop index if exists public.transfers_payment_id_unique_idx;

create unique index if not exists transfers_payment_id_unique_idx
  on public.transfers(payment_id);

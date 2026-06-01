-- Transfer release hardening for Sprint 3B.
-- Adds canonical correlation/idempotency tracing for transfers and a one-transfer-per-payment guarantee.

alter table public.transfers
  add column if not exists correlation_id uuid,
  add column if not exists idempotency_key text;

update public.transfers t
set correlation_id = coalesce(t.correlation_id, p.correlation_id)
from public.payments p
where p.id = t.payment_id
  and t.correlation_id is null;

create index if not exists transfers_payment_id_idx on public.transfers(payment_id);
create index if not exists transfers_correlation_id_idx on public.transfers(correlation_id);
create index if not exists transfers_idempotency_key_idx on public.transfers(idempotency_key);

create unique index if not exists transfers_payment_id_unique_idx
  on public.transfers(payment_id)
  where payment_id is not null;

create unique index if not exists transfers_idempotency_key_unique_idx
  on public.transfers(idempotency_key)
  where idempotency_key is not null;

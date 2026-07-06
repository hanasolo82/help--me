-- Premium comprable: una fila canónica de suscripción por usuario.
-- El upsert de billing.service.js (webhooks customer.subscription.*) usa
-- on conflict (user_id); esta migración lo hace posible.

-- Dedupe defensivo: si algún usuario acumuló varias filas, conserva la más
-- reciente (updated_at) y elimina el resto antes de imponer la unicidad.
delete from public.user_subscriptions older
using public.user_subscriptions newer
where older.user_id = newer.user_id
  and older.id <> newer.id
  and (
    older.updated_at < newer.updated_at
    or (older.updated_at = newer.updated_at and older.id < newer.id)
  );

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_user_id_unique;

alter table public.user_subscriptions
  add constraint user_subscriptions_user_id_unique unique (user_id);

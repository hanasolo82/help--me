-- Reviews MVP: requester -> helper after task completion.
-- Keeps public.ratings as legacy/no-op for new UI.

alter table public.reviews
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'reviews'
      and c.contype = 'u'
      and (
        select array_agg(a.attname order by keys.ordinality)
        from unnest(c.conkey) with ordinality as keys(attnum, ordinality)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = keys.attnum
      ) = array['task_id', 'reviewer_id', 'reviewed_user_id']::text[]
  ) then
    alter table public.reviews
      add constraint reviews_task_reviewer_reviewed_unique
      unique (task_id, reviewer_id, reviewed_user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_tags_count_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_tags_count_check
      check (cardinality(tags) <= 8);
  end if;
end $$;

create or replace function public.touch_reviews_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at
before update on public.reviews
for each row execute function public.touch_reviews_updated_at();

drop policy if exists "Users can leave reviews after completed tasks" on public.reviews;
drop policy if exists "Requesters can review helpers after closed tasks" on public.reviews;

create policy "Requesters can review helpers after closed tasks"
on public.reviews for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and reviewer_id <> reviewed_user_id
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.created_by = (select auth.uid())
      and t.created_by = reviewer_id
      and t.accepted_by = reviewed_user_id
      and t.status in ('completed', 'closed')
  )
);

create or replace function public.recompute_profile_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile_id uuid;
  next_rating numeric;
  next_reviews_count integer;
  next_completed_tasks integer;
begin
  target_profile_id := coalesce(new.reviewed_user_id, old.reviewed_user_id);

  select
    round(avg(r.rating)::numeric, 2),
    count(*)::integer
  into next_rating, next_reviews_count
  from public.reviews r
  where r.reviewed_user_id = target_profile_id;

  select count(*)::integer
  into next_completed_tasks
  from public.tasks t
  where t.accepted_by = target_profile_id
    and t.status in ('completed', 'closed');

  update public.profiles
  set rating = coalesce(next_rating, 0),
      reviews_count = coalesce(next_reviews_count, 0),
      completed_tasks = coalesce(next_completed_tasks, completed_tasks),
      updated_at = now()
  where id = target_profile_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_after_write on public.reviews;
create trigger reviews_after_write
after insert or update or delete on public.reviews
for each row execute function public.recompute_profile_review_stats();

notify pgrst, 'reload schema';

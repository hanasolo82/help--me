-- Close public.profiles reads to the authenticated owner only.
-- Public third-party reads must go through public.public_profiles or approved RPCs.

alter table public.profiles enable row level security;

drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
drop policy if exists "Users can select their own profile" on public.profiles;
create policy "Users can select their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- No DELETE policy yet. Account deletion needs a dedicated secure flow.

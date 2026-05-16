-- Buckets para settings de usuario.
-- Mantienen el mismo modelo de acceso que el bucket de avatars: lectura publica y subida/borrado por propietario.

insert into storage.buckets (id, name, public)
values ('map-avatars', 'map-avatars', true)
on conflict (id) do nothing;

drop policy if exists "map-avatars public read" on storage.objects;
create policy "map-avatars public read"
on storage.objects for select
to public
using (bucket_id = 'map-avatars');

drop policy if exists "map-avatars owner upload" on storage.objects;
create policy "map-avatars owner upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'map-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "map-avatars owner delete" on storage.objects;
create policy "map-avatars owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'map-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

insert into storage.buckets (id, name, public)
values ('home-backgrounds', 'home-backgrounds', true)
on conflict (id) do nothing;

drop policy if exists "home-backgrounds public read" on storage.objects;
create policy "home-backgrounds public read"
on storage.objects for select
to public
using (bucket_id = 'home-backgrounds');

drop policy if exists "home-backgrounds owner upload" on storage.objects;
create policy "home-backgrounds owner upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'home-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "home-backgrounds owner delete" on storage.objects;
create policy "home-backgrounds owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'home-backgrounds'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- helpMe migration 0008
-- Permite que cada usuario borre sus propios archivos del bucket 'avatars'.
-- Sin esta policy el avatar anterior queda huerfano cuando el usuario sube otro.
-- Ya incluida en schema.sql; esta migration es para aplicar contra DBs existentes.

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

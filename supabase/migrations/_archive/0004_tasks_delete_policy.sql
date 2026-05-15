-- helpMe migration 0004
-- Permite borrar tareas propias en estado editable para que Cancelar elimine la fila.
-- Ejecutar en el SQL editor de Supabase despues de las migraciones anteriores.

drop policy if exists "Requester can delete own tasks" on public.tasks;
create policy "Requester can delete own tasks"
on public.tasks for delete
to authenticated
using (
  requester_id = (select auth.uid())
  and status in ('open', 'assigned', 'in_progress')
);

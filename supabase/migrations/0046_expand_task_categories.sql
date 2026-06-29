-- Amplía las categorías permitidas de public.tasks al catálogo HelpMoji (Fase 4 / 3D.2).
-- Mantiene válidos los valores históricos (Mascotas/Recados/Compras/Ayuda tecnica) y añade
-- el resto de actividades. Idempotente: dropea el CHECK existente y lo recrea.
-- Tras aplicar esto, re-habilitar la lista ampliada en src/services/tasksService.js (allowedCategories).

alter table public.tasks
  drop constraint if exists tasks_category_check;

alter table public.tasks
  add constraint tasks_category_check
  check (
    category in (
      -- históricas (no borrar: tareas antiguas)
      'Mascotas',
      'Recados',
      'Compras',
      'Ayuda tecnica',
      -- catálogo HelpMoji ampliado
      'Limpieza',
      'Mudanza',
      'Reparaciones',
      'Clases',
      'Cuidado',
      'Tecnología',
      'Otros'
    )
  );

notify pgrst, 'reload schema';

# HelpMe - Habilidades propias y búsqueda de helpers

## Objetivo

Permitir que cada helper combine habilidades sugeridas con hasta tres habilidades
propias y que el requester encuentre helpers por necesidad concreta desde el
buscador ya presente en Home.

## Límites del MVP

- Máximo 6 habilidades publicadas por perfil, de las cuales como máximo 3 son propias.
- Las habilidades propias pertenecen a una categoría general de helper existente.
- La búsqueda usa texto indexado en español, sin IA ni servicios externos.
- Las categorías de tarea, HelpMoji, solicitudes directas y pagos no cambian.
- Card: tres habilidades visibles y contador `+N`; perfil: lista completa ordenada.

## Fases

1. **Datos y seguridad**
   - `profile_custom_skills`, índices GIN y RLS.
   - RPCs transaccionales para sustituir habilidades del perfil.
   - Ampliación compatible de `get_public_helpers_for_map` con búsqueda textual.
2. **Perfil**
   - Añadir habilidades propias con nombre y categoría.
   - Mezclar sugeridas y propias en una lista ordenable.
   - Validación local alineada con los límites del servidor.
3. **Descubrimiento**
   - Conectar el input actual al mapa y al listado con debounce.
   - Mostrar el nombre específico de la habilidad en cards y previews.
   - Feedback específico cuando una búsqueda no encuentra helpers.
4. **Verificación**
   - Ownership negativo, límites, duplicados y búsqueda positiva.
   - Lint, build, RLS ownership y `git diff --check`.

## Fuera de alcance

- IA, embeddings, matching automático o recomendaciones.
- Nuevas categorías de tarea o cambios al catálogo HelpMoji.
- Cambios de pagos, Stripe, webhooks, chat o solicitudes directas.
- Moderación avanzada o panel de administración de habilidades.

## Criterios de aceptación

- Un helper guarda sugeridas y propias de forma atómica y conserva su orden.
- Ningún usuario puede escribir habilidades de otro ni saltarse los límites.
- Tildes, mayúsculas y flexión española básica no impiden encontrar coincidencias.
- Una búsqueda filtra simultáneamente marcadores y listado.
- Las pills no desbordan cards ni perfil en móvil o escritorio.
- Limpiar la búsqueda recupera los resultados del mapa sin recentrarlo.

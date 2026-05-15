# Migrations archivadas

Estas migrations representan el historial del esquema **antes** de que se
renombraran columnas y FKs en la DB de produccion. Se conservan como
referencia historica.

Los nombres que aparecen aqui (`requester_id`, `helper_id`, `price_cents`,
`urgency`, `latitude`, `longitude`, `body`) **ya no existen** en la DB real
ni en el codigo. La fuente de verdad es ahora `supabase/schema.sql`, que
refleja el esquema vigente (`created_by`, `accepted_by`, `price`, `lat`,
`lng`, `content`).

No ejecutar contra la DB de produccion: las policies y constraints que
contienen apuntan a columnas inexistentes y fallarian.

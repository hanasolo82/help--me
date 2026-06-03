# Clasificador y reglas de enrutamiento — helpme-architect

Propósito: dar un formato repetible para clasificar tareas y seleccionar agentes especialistas.

1) Resumen rápido
- `task_summary`: Una frase que describe la petición.

2) Clasificación (keywords -> dominio)
- contiene `stripe` -> Stripe backend
- contiene `sql|table|index|migration|rls|policy` -> Supabase / data
- contiene `auth|jwt|session|service_role|sensitive` -> Security / auth
- contiene `ui|component|css|layout|modal|drawer` -> Frontend UI
- contiene `onboard|journey|ux|flow|permission` -> Product flow
- contiene `vercel|deploy|env|webhook|domain` -> Deployment
- contiene `worklog|agent-worklog|registro` -> Project worklog

3) Selección de agentes (ordenada por prioridad)
- Mapear keywords a `backend-stripe-agent`, `supabase-data-agent`, `security-auth-agent`, `frontend-ui-agent`, `product-flow-agent`, `deployment-agent`, `agent-worklog`.
- Usar coincidencias por palabra completa para evitar falsos positivos como `ui` dentro de `utilizando`.

4) Auditoría objetivo
- Listar archivos concretos a inspeccionar (por ejemplo `src/*`, `server/*`, `migrations/*`, `.env`, `vercel.json`, `.agent-worklog/refactor-cleanup.md`).

5) Propuesta mínima
- Un enunciado que diga exactamente qué archivo cambiar y qué pequeño cambio realizar.

6) Ejemplo
- Task summary: "Add endpoint to create Stripe account links"
- Classification: Stripe backend
- Selected agents: `backend-stripe-agent`, `security-auth-agent`
- Audit targets: `server/routes/stripe.js`, `.env`, `server/webhooks/stripe.js`
- Proposed minimal change: "Add `POST /stripe/account-link` that uses server-side secret to create account link and returns URL."
- Risk level: Medium

7) Ejemplo worklog
- Task summary: "Registrar el avance del lote de limpieza"
- Classification: Project worklog
- Selected agents: `agent-worklog`
- Audit targets: `.agent-worklog/refactor-cleanup.md`
- Proposed minimal change: "Append a dated entry with scope, validation and remaining risks."
- Risk level: Low

# Fase 1B · Validación RLS payment-gate (0040) — Run log

Equivalente ejecutable de `supabase/validation/0040_rls_validation.sql` tests 1-12.
Implementado como `scripts/verify-rls-payment-gate.mjs` (`pnpm run verify:rls-payment-gate`)
porque `pg_policies`/`relforcerowsecurity` no son accesibles vía PostgREST y no hay
conexión psql directa. En su lugar se prueba el **comportamiento real** con sesiones
de usuario autenticadas (anon key + JWT), que sí quedan sujetas a RLS — una garantía
más fuerte que leer las policies: si la operación prohibida falla para un usuario real,
el gate funciona.

## 2026-06-17 · verify:rls-payment-gate

- **Entorno:** Supabase `zaikijuzgeatbwtbjqcp` ("helpMe", único proyecto) · Stripe test.
  Aceptado correr contra la base canónica (usuarios namespaced `rls-gate-*`, autolimpieza).
- **Baseline:** profiles 10 · tasks 13 · payments 7 · ledger 37 · webhook_events 62 ·
  audit 169 · conversations 3 · task_applications 1 · chats 0 · messages 14.
- **Resultado:** **12/12 PASS · exit 0.**

| Test | Gate | Veredicto |
|------|------|-----------|
| T1 | Crear chat legacy bloqueado | ✅ RLS 42501 |
| T2 | Mensaje con solo `chat_id` bloqueado (rama legacy eliminada) | ✅ RLS 42501 |
| T3 | Chat en tarea `assigned` (pre-pago) bloqueado | ✅ RLS 42501 |
| T4 | Requester no mueve a `in_progress` | ✅ denegado RLS 42501, task sigue `assigned` |
| T5 | Helper no mueve a `in_progress` | ✅ 0 filas, task sigue `assigned` |
| T6 | No auto-seleccionar candidatura por UPDATE directo | ✅ 0 filas |
| T7 | Tercero no lee conversación ajena | ✅ 0 convos / 0 msgs |
| T8 | RPC `apply_to_task` | ✅ pending |
| T9 | RPC `select_task_helper` | ✅ assigned + accepted_by helper |
| T10 | RPC `reject_task_application` | ✅ rejected |
| T11 | RPC `withdraw_task_application` | ✅ withdrawn |
| T12 | Chat se desbloquea con tarea `in_progress` (post-webhook) | ✅ can_access=true, insert ok |

- **Post-run:** conteos idénticos al baseline → **cero huérfanos**.
- **Nota de método:** T4 inicialmente marcó FAIL por una aserción demasiado estricta
  (esperaba "0 filas"; el gate devuelve denegación explícita 42501 vía el `WITH CHECK`
  de la policy "cancel own unresolved tasks"). Corregido: bloqueo = error RLS **o** 0 filas,
  verificando además que `status` sigue `assigned`. No fue un agujero de seguridad.

## Veredicto Fase 1B

- RLS / gate de acceso: **cerrado.** 1-7 bloquean como se espera, 8-12 funcionan.
- Webhook / pagos colgados: cerrado (ver `webhook-qa-plan.md`).
- **Frontera cruzada:** la beta pasa de "riesgo crítico abierto" a "pre-beta con QA UX/flujo pendiente".
- Pendiente no bloqueante: checklist manual de Stripe Return (frontend).

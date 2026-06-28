# HelpMe — Fase 4 / Bloque 2: plan de beta controlada

> Plan operativo para abrir HelpMe a usuarios reales en modo beta cerrada. Define a quién invitar,
> qué probar, qué medir, cuándo parar y qué tiene que estar listo antes de la primera invitación.
> Última revisión: 2026-06-28. Stripe en **modo test** durante toda la beta cerrada.
> Documentos hermanos: [`phase-4-beta-smoke-checklist.md`](./phase-4-beta-smoke-checklist.md) (smoke de 13 pasos),
> [`financial-reconciliation.md`](./financial-reconciliation.md) (mirror-vs-execute + 6 warnings),
> [`ci-financial-gates.md`](./ci-financial-gates.md) (gates de CI).

---

## 0. Recomendación

**Empezar en BETA CERRADA (closed beta), no externa.**

Motivo: las capas críticas (RLS, dinero, webhooks) están verdes y sin bloqueantes a nivel código,
pero **falta la corrida en navegador** del camino de pago real (pasos 7,8,9-UI,10,13 del smoke) y las
páginas legales aún no llevan la identidad del responsable. Una beta cerrada con invitados conocidos y
Stripe en test nos deja validar la experiencia real con riesgo financiero y legal acotado antes de
exponerla a desconocidos.

Progresión propuesta:

| Fase | Quién entra | Stripe | Requisito para pasar a la siguiente |
|---|---|---|---|
| **Beta interna** (ahora) | owner + 1-2 personas de confianza | test | smoke en navegador 7,8,9-UI,10,13 registrado en verde |
| **Beta cerrada** | 5-15 invitados nominales | test | 0 criterios de stop disparados en 1 semana + legales con identidad |
| **Beta externa / GA** | abierta / lista de espera | **live** | decisión separada, fuera de este documento |

No saltar a externa hasta cerrar los pendientes de owner (§6) y un ciclo limpio de beta cerrada.

---

## 1. Perfiles de beta

| Perfil | Quién | Qué hace | Qué vigilar especialmente |
|---|---|---|---|
| **Requester (R)** | invitado o cuenta propia | publica tareas, acepta helper, paga, valora | que el chat NO se abra antes de pagar; que el pago no quede colgado |
| **Helper (H)** | invitado con Stripe Connect completo (charges + payouts enabled, test) | se ofrece, ejecuta, cobra al cierre | que el transfer se libere una sola vez; que no cobre sin completar |
| **Admin/Owner** | tú | observa métricas, drift, soporte; corta la beta | drift `critical`, dinero retenido sin estado, reports de soporte |

Requisito de cada invitado helper: completar onboarding de Stripe Connect en test antes de aceptarlo en
una tarea (sin esto, el checkout/transfer no puede cerrar el ciclo).

---

## 2. Escenarios obligatorios

Cada invitado R↔H debe recorrer al menos una vez el ciclo completo. Anclas de código y cobertura
automática están en [`phase-4-beta-smoke-checklist.md`](./phase-4-beta-smoke-checklist.md).

1. **Publicar tarea** (R) — tarea en `open`, visible, sin `accepted_by`.
2. **Ofrecer ayuda** (H) — `task_application` en `pending`.
3. **Retirar candidatura** (H) — aplicación → `withdrawn`, puede re-ofrecerse.
4. **Aceptar helper** (R) — tarea → `assigned`, aplicación → `selected`.
5. **Pagar / checkout** (R) — redirige a Stripe Checkout (`4242…`); **chat sigue bloqueado**.
6. **Recovery de pago no confirmado** (R) — con timeout corto, aparece panel `unconfirmed` con 3
   acciones (Reintentar / Volver / Contactar soporte); sin spinner infinito.
7. **Chat** (R+H) — solo se abre tras pago (`in_progress`); un tercero no ve nada.
8. **Cerrar tarea** (R) — liberación del pago; `transfer.paid` cierra (`completed → closed`),
   payment `released`, sin duplicar dinero.
9. **Valorar** (R → H) — review creada; no se puede valorar dos veces la misma tarea.
10. **Cancelar / no avanzar** — tarea que no progresa: no debe dejar a nadie atrapado ni dinero en
    limbo (ver criterios de stop §4).

Cobertura automática ya verde respalda 2,3,4,7(gate),8(state machine),9: `rls-payment-gate` 12/12,
`rls-ownership` 34/34, `stripe-event-layer` + `webhook-reliability` verdes. **Lo que la beta añade es la
corrida humana de 5,6,7-UI,8-real** (Stripe Checkout/Return/transfer reales en test).

---

## 3. Métricas mínimas

Mirar al menos una vez al día durante la beta. Casi todas son observables sin instrumentación nueva
(panel Stripe test + `verify:financial-drift` + soporte por email).

| Métrica | De dónde sale | Señal sana |
|---|---|---|
| Tiempo hasta checkout | timestamp aceptar → iniciar checkout | minutos, no abandono |
| Éxito de retorno Stripe | tareas que llegan a `in_progress` / pagos iniciados | alto; pocos `unconfirmed` |
| Tareas completadas | tareas en `completed`/`closed` | crece sin atascos |
| Errores de pago | payments fuera de la state machine feliz; logs webhook `failed` | ~0 |
| Findings `financial-drift` | `pnpm run verify:financial-drift` | 0 `critical`, ≤6 warnings conocidos |
| Reports de soporte | correo `helpme.app.contact@gmail.com` | bajo; ninguno financiero/legal grave |

Frecuencia: `verify:financial-drift` **a diario** y tras cualquier incidencia de pago. Panel Stripe test
tras cada ciclo de pago de un invitado las primeras veces.

---

## 4. Criterios de STOP (cortar la beta de inmediato)

Si cualquiera ocurre: **pausar invitaciones, no aceptar pagos nuevos, diagnosticar antes de seguir.**

| # | Síntoma | Por qué es stop | Primer chequeo |
|---|---|---|---|
| S1 | **Pago duplicado** (doble cobro / doble transfer) | dinero real mal movido | panel Stripe + ledger `idempotency_key`; `verify:webhook-reliability` |
| S2 | **Dinero retenido sin estado claro** (held/processing sin avanzar) | usuario pagó y no sabe qué pasa | `verify:financial-drift`; estado payment vs task |
| S3 | **Chat desbloqueado sin pago** | rompe el gate de valor del producto | `verify:rls-payment-gate` T3; `can_access_conversation` |
| S4 | **Usuario atrapado sin salida** (spinner infinito, no puede cancelar ni contactar) | trampa de UX | reproducir en navegador; revisar `StripeReturn` recovery |
| S5 | **Error legal / contacto** (mailto roto, placeholder visible, legales sin identidad ante usuario externo) | exposición legal | `rg` de placeholders; abrir páginas Legal |
| S6 | **`financial-drift` = critical** | invariante financiera rota | `pnpm run verify:financial-drift` (exit 1) |

Criterio de **GO / reanudar**: causa raíz entendida, fix o mitigación aplicada, verificación verde de la
capa afectada, y registro del incidente en el worklog.

---

## 5. Checklist pre-beta (gate de entrada)

No invitar a nadie externo hasta que **todo** esté en verde. Marcar `[x]` con fecha/evidencia.

### Sistema (verificable por agente / CI)
- [x] `verify:rls-payment-gate` 12/12 · `verify:rls-ownership` 34/34 (2026-06-26).
- [x] `verify:stripe-event-layer` · `verify:webhook-reliability` verdes (Fase 3).
- [x] `verify:financial-drift` 0 critical / 6 warnings clasificados.
- [x] CI en GitHub Actions verde (ambos jobs) — gate financiero documentado en `ci-financial-gates.md`.
- [x] Recovery terminal de `StripeReturn` (corte de polling + panel `unconfirmed`) en código (Fase 3 cierre).
- [x] Contacto de soporte real (`helpme.app.contact@gmail.com`) en StripeReturn + Legal; `rg` del
      placeholder de contacto = 0 en código/docs.

### Owner (requiere navegador / acción humana) — **pendiente**
- [ ] Corrida en navegador registrada de smoke pasos **7, 8, 9-UI, 10, 13** (Stripe Checkout/Return/
      transfer reales en test + recovery con timeout corto). → ver §6.
- [ ] Secrets de GitHub Actions verificados OK (los 5 del gate financiero; `SUPABASE_URL` sin path REST).
- [ ] Páginas legales con **identidad del responsable** completada
      (`[NOMBRE Y APELLIDOS]`, `[NIF_O_NIE]`, `[DIRECCION POSTAL]`) — **bloqueante para usuarios externos**.
- [ ] 6 warnings de `financial-drift` revisados y aceptados como conocidos (ver `financial-reconciliation.md`).
- [ ] Cada invitado **helper** con Stripe Connect test completo (charges + payouts enabled).

---

## 6. Pendientes de owner (acciones humanas)

1. **Smoke en navegador (pasos 7,8,9-UI,10,13).** Dos sesiones R y H en Stripe test, tarjeta `4242…`.
   Registrar resultado en el checklist. Para el paso 13 (recovery): bajar `PAYMENT_HARD_TIMEOUT_MS` a
   ~5s en local, forzar tarea que no avanza, comprobar el panel `unconfirmed` y restaurar a `90_000`.
2. **Identidad legal.** Rellenar `[NOMBRE Y APELLIDOS]`, `[NIF_O_NIE]`, `[DIRECCION POSTAL]` en
   `Terms.jsx`/`Privacy.jsx`. Bloqueante antes de usuarios externos; no antes de la beta interna del owner.
3. **Verificar secrets de CI.** Confirmar los 5 secrets del gate financiero (especialmente `SUPABASE_URL`
   normalizado a `origin`, sin `/rest/v1`).
4. **Limpieza opcional de señal:** borrar el scratch `tmp/prod-bootstrap.js` (bundle minificado que aún
   contiene el token de placeholder) si se quiere `rg` global a 0. No es código shipeado.
5. **Lista de invitados** de la beta cerrada (5-15 nominales) y canal para recibir su feedback además del
   correo de soporte.

---

## 7. Decisión Stop / Go de apertura

- **GO a beta interna (owner + confianza):** ya, con Stripe en test. El sistema está verde a nivel código.
- **GO a beta cerrada (invitados externos):** solo tras cerrar §5-owner (smoke navegador + identidad
  legal + secrets verificados).
- **STOP / no abrir externa:** si queda algún criterio de stop §4 latente o el smoke navegador revela un
  bloqueante.
- **Cuándo parar una beta en curso:** cualquier criterio §4. Reanudar solo con la regla GO de §4.

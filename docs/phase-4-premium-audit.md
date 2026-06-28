# HelpMe — Fase 4 / Bloque 3A: Auditoría Premium

> Auditoría de producto + arquitectura + seguridad de flujo del concepto **Premium** antes de beta
> cerrada. Solo auditoría: sin editar código, sin implementar, sin tocar dinero/refunds/disputes/payouts.
> Última revisión: 2026-06-28.

---

# Veredicto

**Premium incompleto → debe OCULTARSE en beta** (sin tocar la capa de datos/servidor).

Matiz importante: **no es un agujero de seguridad.** El único beneficio cableado (acuerdo de pago
externo) está **protegido en servidor** y la tabla de suscripciones es **solo lectura** para usuarios.
El problema es de **producto, no de dinero**: Premium se *muestra* (upsell + CTAs) pero **no se puede
comprar** y promete una vía (pago externo) que **sale de la protección de la plataforma** sin avisar.
Por eso se oculta en beta; no hace falta tocar el flujo financiero.

---

# Qué es Premium hoy (según código)

Premium = una fila en `user_subscriptions` con `subscription_status in ('active','trialing')`. Su **único
beneficio cableado** es habilitar el **"acuerdo de pago externo"**: el requester marca que pagará al
helper **fuera de Stripe**, lo que mueve la tarea a `in_progress` sin checkout ni pago retenido, con
`platform_fee_cents = 0` (helper cobra el 100%, plataforma 0 comisión).

No existe **ninguna forma de comprar Premium**: no hay checkout de suscripción Stripe, ni plan en
Settings; `user_subscriptions` tiene INSERT/UPDATE/DELETE revocados a `anon`/`authenticated` (solo
service-role escribe). El botón "Ver Premium" de la pantalla de pago **navega a `/settings`, que no tiene
nada de Premium** → callejón sin salida.

| Pregunta | Respuesta |
|---|---|
| ¿A quién aplica? | **Requester** (el CTA vive en su pantalla de pago; el servidor exige `task.created_by = requester`). Helper no recibe beneficio Premium en código. |
| ¿Beneficio real? | Coordinar pago **externo** con el helper: 0 comisión, fuera del flujo Stripe; marca la tarea `in_progress`. |
| ¿Salta Checkout? | No lo "salta": lo **sustituye** por un acuerdo externo. Efecto: avanza la tarea sin Stripe, pero solo premium+dueño+tarea `assigned`. |
| ¿Permite pago externo? | Sí — **es** el beneficio. Gateado en servidor. |
| ¿Desbloquea chat? | **No directamente.** El chat se abre con `in_progress` (`can_access_conversation` **no** mira Premium). El pago externo lleva a `in_progress` → desbloquea chat de forma indirecta. |
| ¿Afecta visibilidad/prioridad en mapa? | **No.** Ningún código de mapa/feed referencia Premium. |
| ¿Afecta comisión? | Solo en la vía externa (`platform_fee_cents = 0`). El pago Stripe normal mantiene su fee. |
| ¿Protegido en servidor o solo UI? | **Servidor.** Ver abajo. |

---

# Mapa actual de Premium

| Elemento | Estado actual | Riesgo | Acción |
|---|---|---|---|
| `user_subscriptions` (tabla) | Existe; RLS **read-only** para usuarios; escritura solo service-role | Bajo | Mantener; documentar |
| `has_active_premium(uuid)` RPC | Definido y `grant execute`, pero **no se usa** en enforcement (el server usa su propia query) | Bajo (código muerto) | Dejar; no tocar DB en beta |
| `getActivePremiumSubscription()` (server) | Lee `user_subscriptions` con `supabaseAdmin` | — | Mantener |
| `createExternalPaymentAgreement()` (server) | Gatea: sesión + dueño + `assigned` + helper asignado + **premium activo** + idempotencia; fija `provider='external'`, `status='external_agreed'`, fee 0, tarea→`in_progress`; escribe audit | Bajo (sólido) | Mantener |
| `payments.provider='external'` / `external_agreed` / `external_payment_confirmed_at` | En esquema y constraints (0036) | Bajo | Mantener |
| `can_access_conversation()` | **No** referencia Premium; chat por estado de tarea | Ninguno | Mantener |
| Ruta `POST /api/payments/external` + `continueWithExternalPayment()` (cliente) | Llaman al server gateado | Bajo | Mantener (pero ocultar disparador UI) |
| `TaskPaymentPage` — bloque `premiumCompact` | Texto upsell + botón "Coordinar pago con el helper" (si premium activo) + "Ver Premium" (si no) | **Medio** | **Ocultar en beta** |
| "Ver Premium" → `/settings` | Settings **no** tiene plan Premium → callejón sin salida | **Medio** (promesa rota) | **Ocultar en beta** |
| Compra de Premium | **No existe** (sin checkout de suscripción ni plan UI) | — | Documentar como deuda post-beta |
| Aviso "sales de la protección de la plataforma" en pago externo | **No se muestra** (metadata `warning_acknowledged:true` hardcodeado) | **Medio** | Si se reactiva algún día, exigir aviso real |

---

# Decisión recomendada para beta

- **Beta interna (owner):** Premium puede quedar visible **solo** si el owner se autoasigna una
  suscripción manual para probar la vía externa. Para todos los demás, ocultar.
- **Beta cerrada (externos):** **Premium OCULTO.** Nadie puede comprarlo y el pago externo saca al
  usuario de la protección de la plataforma. No prometer ventajas no cerradas.
- **Beta externa / GA:** reabrir Premium solo con flujo de compra real (checkout de suscripción),
  aviso explícito de "pago externo = fuera del pago retenido de HelpMe", y decisión de comisión documentada.

---

# Riesgos si se activa (se muestra) en beta

| Riesgo | Severidad | Por qué importa | Mitigación |
|---|---|---|---|
| Upsell "Ver Premium" lleva a un callejón sin salida | Media | Promesa rota; resta confianza en beta | Ocultar el CTA en beta |
| Pago externo = fuera del pago retenido y sin mirror de dispute, sin aviso | Media | El usuario cree estar cubierto por HelpMe y no lo está | Ocultar el CTA externo en beta; si se usa, exigir aviso |
| Vía de 0 comisión | Baja-Media | Si Premium fuese auto-otorgable, se evitaría la comisión | Hoy no es auto-otorgable (RLS); mantener así |
| "Premium" sugiere ventajas (visibilidad/prioridad) inexistentes | Baja | Expectativa falsa | No prometer nada que no exista; copy honesto o sin copy |
| Confusión `assigned` vs pago | Baja | El botón externo solo aparece en `assigned`; coherente con el modelo | Sin acción (ya correcto) |

> **No hay riesgo financiero directo** (no se mueve dinero mal): la vía externa no toca Stripe ni
> transfiere; solo registra un acuerdo y avanza la tarea, todo server-gateado e idempotente.

---

# Qué debe hacer Codex (prompt cerrado y acotado)

```
HelpMe — Ocultar Premium para beta cerrada (sin tocar dinero/DB)

Objetivo: que ningún usuario de beta vea ni dispare Premium / pago externo, sin alterar la
capa financiera ni la base de datos (el flujo está server-gateado y acotado; es decisión
de visibilidad de producto).

Hacer:
1. En src/pages/TaskPayment/TaskPaymentPage.jsx: ocultar el bloque `premiumCompact`
   completo (texto upsell + botón "Coordinar pago con el helper" + botón "Ver Premium")
   detrás de un flag de build apagado por defecto, p.ej.
   `const PREMIUM_UI_ENABLED = import.meta.env.VITE_PREMIUM_UI === 'true'` (default false).
   Si el flag está off, no renderizar nada de Premium: la pantalla queda solo con
   "Pagar de forma segura" (Stripe happy path).
2. No eliminar la lógica de `externalPaymentMutation` ni la llamada a la API: solo no
   exponer su disparador en UI.
3. Documentar en docs/ (o ampliar este audit) que Premium/pago-externo está oculto en beta
   y por qué, y que el server sigue protegiéndolo.

Validación:
- `pnpm run lint` y `pnpm run build` verdes.
- Con VITE_PREMIUM_UI sin definir, la pantalla de pago no muestra ningún texto/CTA de Premium.
- `git diff --check` limpio.

No hacer:
- No tocar server/services/payments.service.js ni la ruta /api/payments/external.
- No tocar migraciones, RLS, ni user_subscriptions.
- No tocar refunds/disputes/payouts ni el checkout Stripe.
- No borrar el RPC has_active_premium.
```

---

# Qué NO abrir ahora

- **No** implementar checkout de suscripción Stripe ni plan de compra de Premium.
- **No** automatizar ni "mejorar" el pago externo (es la vía sensible: fuera del pago retenido).
- **No** tocar refunds / disputes / payouts.
- **No** tocar RLS, `user_subscriptions`, ni el RPC `has_active_premium` (déjalo aunque esté sin uso).
- **No** tocar el server de pagos ni el happy path de Stripe.
- **No** abrir lo visual/categorías/disponibilidad todavía (vuelve a 3B/3C/3D tras esto).
- **No** reabrir Fase 3 (no se encontró contradicción: el gate de chat y la idempotencia siguen sanos).

---

## Conclusión para el owner

Premium está **a medias y server-gateado**: el motor (tabla + servidor + idempotencia) está bien hecho
y protegido, pero **falta todo el producto** (cómo se compra, qué promete, aviso de salir de la
protección). Para beta cerrada la jugada correcta es **ocultar los CTAs** y dejar **solo el pago Stripe**
como happy path, documentando Premium como deuda post-beta. Coincide con tu criterio: Premium no bloquea
la mejora visual, pero **sí** debe bloquear cualquier beta externa si queda visible prometiendo ventajas
no cerradas. Tras cerrar esto (ocultar + documentar), volvemos a **3B categorías/iconos → 3C
disponibilidad → 3D estilo visual**.

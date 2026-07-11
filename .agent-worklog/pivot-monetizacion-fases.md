# Pivote de monetización — fases (relevo entre agentes)

> Documento de relevo: si otro agente (Codex u otro) continúa este trabajo, este archivo es la
> fuente de verdad del estado. Actualízalo al cerrar cada fase.

## Filosofía (resumen operativo)

HelpMe no vende "favores entre vecinos": vende **solución** — tiempo, urgencia, confianza y
garantía. El usuario paga por disponibilidad, compromiso y tranquilidad. Sin premium "al uso":
monetización futura = comisión por tarea (10–15%) → más adelante suscripción para helpers y
paquetes para empresas. Nunca cobrar por entrar; cobrar cuando hay valor. Flujo canónico (todo
lo que no lo sirva es candidato a eliminarse): publicar tarea → ver helpers cercanos → elegir
helper → confirmar precio → pagar retenido → chat → finalizar y valorar.
Referencia completa: memoria del agente (`helpme-brand-philosophy`, `helpme-monetization-pivot`).

## Estado de las fases

### Fase 1 — Desactivar Planes en landing — HECHA (2026-07-03)
- `src/pages/Landing/Landing.jsx`: eliminado el enlace "Ver planes y precios" (→ /planes) de la
  sección #planes; el copy "Publicar es gratis · Premium opcional" pasó a "Publicar es gratis ·
  Pagas solo cuando aceptas un precio"; el JSON-LD FAQ ya no menciona "HelpMe Premium".
- `src/pages/Landing/Landing.module.css`: retirada la clase huérfana `.plansPageLink`.
- Los CTAs "Publicar tarea"/"Quiero ayudar" se mantienen (flujo canónico, no venta de plan).
- El bloque "Más adelante" (roadmap) se mantiene: coincide con la monetización futura.
- Lint OK. Las rutas /facturacion /planes /pago siguen vivas hasta la Fase 5.

### Fase 2 — Página independiente /pagos — HECHA (2026-07-03, subagente Sonnet, revisada)
- Nuevos: `src/pages/Payments/PaymentsPage.jsx`, `src/pages/Payments/Payments.module.css`.
- `src/services/paymentsService.js`: nueva `getMyPayments()` — pagos del usuario como requester
  (gastos) o helper (cobros), vía RLS "Payments readable by participants" (0028).
- Ruta protegida `/pagos` en `src/app/router/AppRouter.jsx`.
- Menú de cuenta del header de Home: entrada "Pagos" (HomeHeader → HomeView → HomeContainer,
  `navigate('/pagos')`).
- Página: tiles Gastado / Retenido ahora / Cobrado (céntimos → EUR con formatEuro/100), tablas
  de Gastos y Cobros con pill de estado (mapeo es-ES agrupado), estados de carga/error/vacío,
  card que enlaza la config de Stripe en `/settings#pagos`.
- eslint + `npm run build` limpios.

### Fase 3 — Facturación (datos fiscales + justificante por tarea) — HECHA (2026-07-03, subagente Sonnet, revisada)
- `supabase/migrations/0048_billing_profiles.sql`: tabla billing_profiles (RLS owner select/insert/
  update, sin delete; trigger updated_at; notify pgrst). **Pendiente de aplicar en Supabase por el
  owner (supabase db push) antes de probar el formulario.**
- `src/services/billingProfileService.js` (getMyBillingProfile/saveMyBillingProfile) y
  `getPaymentById` en paymentsService (confía en la RLS: pago ajeno = "no encontrado").
- /pagos: card "Datos de facturación" (7 campos, react-query + mutation) y columna "Justificante"
  (enlace solo en released/succeeded/refunded).
- Página imprimible `/pagos/justificante/:paymentId` (perspectiva pago/cobro, número
  PREFIJO-AÑO-ID8, window.print, @media print). Mapeo de estados extraído a
  `src/pages/Payments/paymentStatus.js` (compartido con PaymentsPage).
- El documento se llama "justificante" a propósito: numeración no secuencial legal — decidir en el
  futuro si se convierte en factura fiscal real (numeración correlativa, requisitos AEAT).
- eslint + build limpios (verificado por el subagente y lint re-verificado aquí).

### Fase 4 — Gráficas en /pagos — HECHA (2026-07-03, subagente Sonnet + skill dataviz, revisada)
- `src/pages/Payments/ActivityChart.jsx`: SVG propio sin dependencias — barras agrupadas por mes
  (últimos 6, incluidos vacíos), Gastos = amount_cents comprometido como requester
  (COMMITTED_STATUSES en paymentStatus.js), Cobros = helper_amount_cents released como helper.
  Colores por tokens (--color-accent gastos, --color-primary cobros), leyenda con texto, ticks
  "bonitos" es-ES, tooltips <title>, tabla visually-hidden con los datos, sin animaciones.
- Card "Actividad" en PaymentsPage entre las tiles y la tabla de Gastos.
- El validador de paleta de la skill dataviz pasó los checks críticos (CVD ΔE>18, contraste ≥3:1)
  en ambos temas; dos fallos marginales (chroma del verde en claro, banda de luminosidad en
  oscuro) aceptados por venir mandatados los tokens de marca.

## Verificación final (2026-07-03)
- `npm run build` ✓ (9.19s) y eslint limpio sobre todo lo tocado.
- Smoke con navegador (dev server + Playwright, sin sesión): landing con 0 enlaces a /planes y
  0 menciones "Premium opcional" (copy nuevo presente); /facturacion → /pagos → /login;
  /planes → /; /pago → /pagos → /login; /pagos → /login. Único error de consola: el aviso
  preexistente `fetchpriority` del hero (anterior a este trabajo).
- No verificado con sesión real (requiere login + datos): página /pagos con datos, guardado de
  billing_profiles (necesita aplicar la migración 0048) y justificante imprimible.

### Fase 5 — Retirar infraestructura premium (frontend) — HECHA (2026-07-03, inline)
- Borrados: `src/pages/Billing/*` (BillingPage/PlansPage/CheckoutPage + css),
  `src/config/subscriptionPlans.js`, `src/hooks/usePremiumStatus.js`, `src/services/billingService.js`.
- `AppRouter.jsx`: /facturacion y /pago redirigen a /pagos; /planes redirige a / (mismo patrón que
  /chats → /messages). Imports retirados.
- `PaymentsSettings.jsx` reescrito: solo Stripe Connect + card "Seguimiento" que enlaza a /pagos.
  Sin usePremiumStatus/startPremiumCheckout/openBillingPortal/PREMIUM_PLAN ni ?premium= de la URL.
- `config/pricing.js`: PREMIUM_PLAN eliminado; PRICING_FLAGS.subscriptionsEnabled → false y
  premiumExternalPaymentVisibleInBeta eliminado (nadie los leía en frontend).
- `Terms.jsx` §8: el párrafo que describía "HelpMe Premium" ahora dice que no se requiere
  suscripción y que el precio por tarea se muestra antes de aceptar (cambio mínimo y veraz;
  revisar con criterio legal si se quiere otra redacción).
- Deuda cosmética consciente: las clases `premium*` de `SettingsPage.module.css` quedan muertas
  (module-scoped, sin consumidores); retirarlas en una pasada de limpieza de CSS aparte.
- PENDIENTE backend/DB (fase futura, NO tocar sin plan): tabla `user_subscriptions` (0036/0047),
  webhooks de suscripción en billing.service.js del backend, STRIPE_PREMIUM_PRICE_ID, y el flujo
  "pago externo" (continueWithExternalPayment sigue exportado en paymentsService sin consumidores
  de frontend).

## Cómo verificar (owner)
- `npm run dev` → landing sin enlace a planes; login → menú ⋮ → Pagos.
- Aplicar migración 0048 (supabase db push o dashboard) antes de probar la card de facturación.

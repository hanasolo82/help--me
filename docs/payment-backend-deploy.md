# Payment backend deploy

This document restores the production wiring for HelpMe payments by deploying the
existing Express backend in `server/` as a separate Node service.

## Decision

Use a separate Node/Express service for the payment backend.

Recommended providers:

- Render
- Railway
- Fly.io

Do not convert the backend to Vercel Functions for this recovery step. The
current Express server already handles Stripe raw webhooks, Supabase service
role access, Checkout creation, Connect onboarding, and payment release logic.
Keeping it as a Node service is the lowest-risk path.

## Fast path: Render Blueprint

The repo includes `render.yaml`, so the simplest path is:

1. Go to Render.
2. Create a new Blueprint.
3. Connect the GitHub repo.
4. Select the blueprint from `render.yaml`.
5. Fill the secret env vars marked `sync: false`.
6. Deploy.

The blueprint creates:

```txt
Service name: helpme-api
Runtime: Node
Root directory: server
Build command: pnpm install --prod --frozen-lockfile --ignore-workspace
Start command: pnpm start
Healthcheck path: /health
```

Render will provide a public URL similar to:

```txt
https://helpme-api.onrender.com
```

Use that URL as `VITE_API_URL` in Vercel after `/health` responds.

## Backend Express

### Local start

From the repo root:

```bash
pnpm run server
```

Equivalent command:

```bash
node server/index.js
```

Local frontend and backend together:

```bash
pnpm start
```

### Production start

Preferred deployment setup:

```txt
Root directory: server
Install command: pnpm install --prod --frozen-lockfile --ignore-workspace
Start command: pnpm start
Healthcheck path: /health
```

If the platform does not support `--frozen-lockfile` during first setup, use it
only temporarily without that flag, then commit the updated lockfile and restore
the frozen install. The expected production command is:

```txt
Install command: pnpm install --prod --frozen-lockfile --ignore-workspace
```

Alternative if the provider must use the repo root:

```txt
Root directory: .
Install command: pnpm --dir server install --prod --frozen-lockfile
Start command: pnpm --dir server start
Healthcheck path: /health
```

The server package owns the Stripe dependency, so production installs must
install dependencies for `server/`. The `--ignore-workspace` flag is intentional:
Render runs inside `server/`, but the repo root has a `pnpm-workspace.yaml`.
Ignoring the parent workspace ensures pnpm uses `server/package.json` and
`server/pnpm-lock.yaml` as the deploy app.

## Required backend env vars

Configure these in the backend hosting provider, not in Vercel frontend:

```env
NODE_ENV=production
PORT=3001
APP_URL=https://helpme-community.com
CLIENT_URL=https://helpme-community.com
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
HELPME_PLATFORM_FEE_BPS=0
```

If using `render.yaml`, `NODE_ENV`, `APP_URL`, `CLIENT_URL`, and
`HELPME_PLATFORM_FEE_BPS` are already declared. You still need to fill these
secret values in Render:

```env
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
```

Notes:

- `PORT` may be provided automatically by the hosting provider. Keep the
  provider value if it injects one.
- `APP_URL` is used to build Stripe return and cancel URLs.
- `CLIENT_URL` is allowed by CORS.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- Prefer a Stripe restricted API key when permissions are confirmed for the
  production integration.

## Exposed endpoints

The backend currently exposes:

```txt
GET  /health
POST /api/payments/checkout
POST /api/payments/external
POST /api/payments/:paymentId/release
POST /api/stripe/connect/account
POST /api/stripe/connect/account-link
GET  /api/stripe/connect/account-status
POST /api/stripe/webhook
```

Protected app endpoints require:

```txt
Authorization: Bearer <supabase_access_token>
```

The Stripe webhook endpoint requires Stripe signature verification through
`STRIPE_WEBHOOK_SECRET`.

## CORS

Production frontend origin:

```txt
https://helpme-community.com
```

Backend CORS allows origins from:

```env
APP_URL=https://helpme-community.com
CLIENT_URL=https://helpme-community.com
```

If you add a Vercel preview environment, deploy a separate preview backend or
add the preview frontend origin to the backend env before testing.

## Vercel frontend env

After the backend is deployed and has a public HTTPS URL, set this in the
Vercel frontend project for Production:

```env
VITE_API_URL=https://your-backend.example.com
```

Then redeploy the frontend. Vite injects `VITE_*` variables at build time.

Do not point `VITE_API_URL` to `https://helpme-community.com` unless a working
proxy for `/api/*` exists.

## Stripe Dashboard

Configure the production webhook endpoint:

```txt
https://your-backend.example.com/api/stripe/webhook
```

Use the signing secret from that endpoint as:

```env
STRIPE_WEBHOOK_SECRET=...
```

For local development only:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Verification

### 1. Backend health

```bash
curl https://your-backend.example.com/health
```

Expected:

```json
{"ok":true,"service":"helpme-api"}
```

### 2. Protected checkout route exists

Without auth, this should return `401`, not `404`:

```bash
curl -i -X POST https://your-backend.example.com/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"test\"}"
```

### 3. Vercel frontend build contains backend URL

After redeploying Vercel, confirm the frontend no longer calls `/api` on the
frontend domain and no longer references `localhost:3001`.

### 4. Manual app test

1. Login as requester.
2. Open a task accepted by a helper.
3. Click `Confirmar y pagar`.
4. Confirm the browser calls:

```txt
https://your-backend.example.com/api/payments/checkout
```

5. Confirm Stripe Checkout opens.

## Rollback

If checkout fails after deploy:

1. Keep the frontend deployed.
2. Fix backend env vars or Stripe webhook settings.
3. Restart/redeploy only the backend.
4. If the backend URL changes, update `VITE_API_URL` in Vercel and redeploy the frontend.

Do not mark payments as confirmed manually from the frontend.

# Payment backend connection

HelpMe payments and Stripe Connect calls must go through the private Express backend.
The frontend must never call Stripe with secret keys and must never rely on
`localhost` outside local development.

For the backend deployment checklist, see `docs/payment-backend-deploy.md`.

## Frontend env

Set this variable in the Vercel frontend project for Production and Preview:

```env
VITE_API_URL=https://your-backend.example.com
```

For local development, use `.env.local`:

```env
VITE_API_URL=http://localhost:3001
```

Vite injects `VITE_*` variables at build time, so redeploy the frontend after
changing `VITE_API_URL` in Vercel.

## Backend env

Set these variables in the backend hosting provider:

```env
APP_URL=https://helpme-community.com
CLIENT_URL=https://helpme-community.com
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
```

Do not add backend secrets to any `VITE_*` variable.

## Verification

The backend must answer:

```bash
curl https://your-backend.example.com/health
```

Expected result:

```json
{"ok":true,"service":"helpme-api"}
```

The checkout route without a valid Supabase token should not return `404`:

```bash
curl -i -X POST https://your-backend.example.com/api/payments/checkout
```

An authorization error is acceptable for this smoke test because it proves the
route exists and is protected by the backend.

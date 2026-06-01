# Security hardening notes

## Secrets rotation required

Local server secrets were detected during the audit in `server/.env`. Do not commit or paste those values. Rotate these keys manually before deploying or continuing production-like testing:

- `STRIPE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended process:

1. Create replacement keys in the Stripe and Supabase dashboards.
2. Update local and deployed environment variables.
3. Restart the API/server processes.
4. Revoke the old keys after the new ones are confirmed working.
5. Prefer a Stripe restricted key for backend operations when the required Connect operations are covered.

The repository already ignores real `.env` files. Keep using `.env.example` and `server/.env.example` for placeholders only.

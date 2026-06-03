Deployment Agent
================

This small CLI audits the repo for deployment readiness with a focus on Vercel, Supabase, and Stripe.

Quick start

1. Install Node 18+.
2. From the `deployment-agent` folder run:

```bash
node index.js
```

What it checks
- Reads common `.env` files
- Looks for `vercel.json` and `package.json`
- Flags forbidden secrets present in frontend environment files or source
- Reports Stripe test/live keys found
- Outputs a deployment summary and manual verification checklist

Notes
- This tool is an assistant for audits — it does not modify source or secrets.
- Review the output and follow the checklist before deploying to production.

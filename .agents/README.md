# HelpMe Agents

This folder contains the project agents used to keep HelpMe work scoped, reviewable, and aligned with the product architecture.

Primary orchestrator:
- `helpme-architect.md` — human-readable orchestration rules.
- `helpme-architect/agent.manifest.json` — machine-readable routing rules.
- `helpme-architect/dispatcher.js` — CLI dispatcher for task classification.
- `helpme-architect/classifier.md` — classification examples.
- `helpme-architect/audit.js` — repository audit helper.

Specialist agents:
- `frontend-ui-agent.md` — React, CSS Modules, layout, visual polish.
- `product-flow-agent.md` — requester/helper journeys, onboarding, UX copy.
- `supabase-data-agent.md` — SQL, RLS, schema, indexes, policies.
- `backend-stripe-agent.md` — Express and Stripe Connect backend flows.
- `security-auth-agent.md` — auth, sessions, privacy, service_role safety.
- `deployment-agent.md` — Vercel, env vars, builds, production webhooks.

Worklog:
- `.agent-worklog/refactor-cleanup.md` records completed cleanup batches, validation, and remaining risks.

How to use:
- Start with `helpme-architect` for every task.
- Select the specialist agent(s) based on the routing rules.
- Keep changes narrow and validate with build/lint/tests when possible.
- Append meaningful completed work to the worklog.

CLI examples:
- `node .agents/helpme-architect/dispatcher.js "ui map requester helper"`
- `node .agents/helpme-architect/dispatcher.js "deployment env webhook"`
- `node .agents/helpme-architect/dispatcher.js "registrar avance en agent-worklog"`

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const manifestPath = path.join(currentDir, 'agent.manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found at', manifestPath);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));

function toKeywords(key) {
  return key.split('|').map(k => k.trim()).filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(text, keyword) {
  const escaped = escapeRegExp(keyword);
  const boundary = '[^a-z0-9_-]';
  return new RegExp(`(^|${boundary})${escaped}(?=$|${boundary})`, 'i').test(text);
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => matchesKeyword(text, keyword));
}

function classifyTask(text) {
  const txt = text.toLowerCase();
  const selected = new Set();
  const matchedKeys = [];
  for (const [key, agent] of Object.entries(manifest.routingRules || {})) {
    const kws = toKeywords(key);
    for (const kw of kws) {
      if (kw.length === 0) continue;
      if (matchesKeyword(txt, kw)) {
        selected.add(agent);
        matchedKeys.push(kw);
      }
    }
  }
  // fallback heuristics
  if (selected.size === 0) {
    if (hasAnyKeyword(txt, ['ui', 'component', 'css', 'layout'])) selected.add('frontend-ui-agent');
    if (hasAnyKeyword(txt, ['onboard', 'journey', 'ux'])) selected.add('product-flow-agent');
    if (hasAnyKeyword(txt, ['stripe', 'connect'])) selected.add('backend-stripe-agent');
    if (hasAnyKeyword(txt, ['supabase', 'rls', 'schema'])) selected.add('supabase-data-agent');
    if (hasAnyKeyword(txt, ['auth', 'jwt', 'service_role'])) selected.add('security-auth-agent');
  }

  return { agents: Array.from(selected), matched: matchedKeys };
}

function proposeMinimalChange(classification) {
  // Simple heuristic proposals based on agent selection
  const agents = classification.agents;
  const proposals = [];
  if (agents.includes('backend-stripe-agent')) {
    proposals.push('Add server-side endpoint (Express) to handle Stripe Connect flows; do not expose secret keys to frontend.');
  }
  if (agents.includes('supabase-data-agent')) {
    proposals.push('Create an incremental migration SQL file and RLS policy draft; avoid bulk schema rewrites.');
  }
  if (agents.includes('security-auth-agent')) {
    proposals.push('Audit auth middleware; ensure no `service_role` key is used on client and session tokens are validated.');
  }
  if (agents.includes('frontend-ui-agent')) {
    proposals.push('Add/modify React component with minimal UI change and responsive CSS Module; keep state logic in product-flow-agent scope.');
  }
  if (agents.includes('product-flow-agent')) {
    proposals.push('Define step-by-step UX flow and edge-case handling; keep onboarding gating server-side.');
  }
  if (agents.includes('deployment-agent')) {
    proposals.push('Update `vercel.json` and env var docs; ensure webhooks point to production URLs and are signed.');
  }
  if (agents.includes('agent-worklog')) {
    proposals.push('Append a concise entry to `.agent-worklog/refactor-cleanup.md` with scope, validation, and remaining risks.');
  }
  if (proposals.length === 0) proposals.push('Describe the requested change in more detail so an agent can propose a minimal patch.');
  return proposals;
}

function auditTargets(text) {
  const targets = [];
  const t = text.toLowerCase();
  if (hasAnyKeyword(t, ['stripe'])) targets.push('server/routes/stripe.js', 'server/webhooks/stripeWebhook.js', '.env');
  if (hasAnyKeyword(t, ['supabase', 'rls', 'migration', 'schema'])) targets.push('migrations/', 'db/schema.sql', 'policies/');
  if (hasAnyKeyword(t, ['auth', 'jwt'])) targets.push('server/middleware/auth.js', 'src/lib/auth/');
  if (hasAnyKeyword(t, ['ui', 'component', 'css', 'layout'])) targets.push('src/components/', 'src/pages/');
  if (hasAnyKeyword(t, ['vercel', 'deploy', 'env', 'webhook', 'domain'])) targets.push('vercel.json', 'deployment-agent/', '.env.example', 'server/');
  if (hasAnyKeyword(t, ['worklog', 'agent-worklog', 'registro'])) targets.push('.agent-worklog/refactor-cleanup.md');
  if (targets.length === 0) targets.push('src/', 'server/');
  return targets;
}

function risksForClassification(classification) {
  const risks = [];
  const a = classification.agents;
  if (a.includes('backend-stripe-agent')) risks.push('Ensure Stripe secrets stay server-side; validate webhook signatures.');
  if (a.includes('supabase-data-agent')) risks.push('RLS/policy mistakes could expose user data; prefer incremental migrations.');
  if (a.includes('security-auth-agent')) risks.push('Misuse of `service_role` key or client-side token leakage.');
  if (a.includes('frontend-ui-agent')) risks.push('UX regressions and accessibility issues; keep changes minimal.');
  if (a.includes('deployment-agent')) risks.push('Incorrect env/webhook configuration can break preview or production deploys.');
  if (a.includes('agent-worklog')) risks.push('Worklog entries should be append-only and must not overwrite prior context.');
  return risks;
}

function validationChecklist(classification) {
  const checklist = [];
  checklist.push('Run build and lint for affected layer');
  checklist.push('Verify no secrets committed or exposed to frontend');
  checklist.push('Run unit tests covering changed code');
  if (classification.agents.includes('supabase-data-agent')) checklist.push('Run migration in staging and verify RLS policies');
  if (classification.agents.includes('backend-stripe-agent')) checklist.push('Verify webhook signature validation and test via Stripe CLI');
  if (classification.agents.includes('deployment-agent')) checklist.push('Verify preview/prod env vars and webhook URLs');
  if (classification.agents.includes('agent-worklog')) checklist.push('Confirm the worklog entry is dated and references validation');
  return checklist;
}

function buildOutput(text) {
  const classification = classifyTask(text);
  const proposals = proposeMinimalChange(classification);
  const targets = auditTargets(text);
  const risks = risksForClassification(classification);
  const checklist = validationChecklist(classification);

  return {
    selected_agents: classification.agents,
    scope: classification.matched.length ? classification.matched.join(', ') : 'general',
    plan: [
      'Classify task',
      'Select agents',
      'Audit target files',
      'Propose minimal changes',
      'Apply only after explicit approval',
      'Validate changes in staging'
    ],
    files_likely_affected: targets,
    proposed_changes: proposals,
    risks,
    validation_checklist: checklist
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const input = process.argv.slice(2).join(' ');
  if (!input) {
    console.log('Usage: node dispatcher.js "<task description>"');
    process.exit(0);
  }
  const out = buildOutput(input);
  console.log(JSON.stringify(out, null, 2));
}

export { classifyTask, buildOutput };

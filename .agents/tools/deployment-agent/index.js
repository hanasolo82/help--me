#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

async function readJsonIfExists(p) {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readIfExists(p) {
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return null;
  }
}

function parseEnv(content) {
  const map = {};
  if (!content) return map;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    map[k] = v.replace(/^"|"$/g, '');
  }
  return map;
}

async function walk(dir, list = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return list;
  }
  for (const e of entries) {
    const res = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      await walk(res, list);
    } else {
      list.push(res);
    }
  }
  return list;
}

async function searchForStrings(pathsToSearch, patterns) {
  const files = [];
  for (const target of pathsToSearch) {
    try {
      const stat = await fs.stat(target);
      if (stat.isDirectory()) {
        files.push(...await walk(target));
      } else {
        files.push(target);
      }
    } catch {
      // Missing optional frontend surfaces are fine.
    }
  }

  const hits = [];
  for (const f of files) {
    if (!f.match(/\.(js|ts|jsx|tsx|json|env|md)$/i)) continue;
    try {
      const txt = await fs.readFile(f, 'utf8');
      for (const p of patterns) {
        if (txt.includes(p)) hits.push({ file: path.relative(process.cwd(), f), pattern: p });
      }
    } catch {
      // Ignore unreadable files during repository scans.
    }
  }
  return hits;
}

async function main() {
  const repoRoot = path.resolve(process.cwd());
  console.log('Deployment summary');

  // Gather env files
  const envFiles = ['.env', '.env.local', '.env.development', '.env.preview', '.env.production', 'server/.env', 'server/.env.local'];
  const envs = {};
  for (const ef of envFiles) {
    const p = path.join(repoRoot, ef);
    const content = await readIfExists(p);
    if (content) envs[ef] = parseEnv(content);
  }

  const pkg = await readJsonIfExists(path.join(repoRoot, 'package.json'));
  const vercel = await readJsonIfExists(path.join(repoRoot, 'vercel.json'));
  const viteConfig = await readIfExists(path.join(repoRoot, 'vite.config.js')) || await readIfExists(path.join(repoRoot, 'vite.config.ts'));

  // Check env var rules
  const frontendAllowed = ['VITE_API_URL','VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','VITE_STRIPE_PUBLISHABLE_KEY','VITE_APP_URL'];
  const forbidden = ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SUPABASE_SERVICE_ROLE_KEY'];

  const localServerEnvKeys = [];
  const foundForbiddenInFrontendEnv = [];
  for (const [fname, map] of Object.entries(envs)) {
    for (const k of Object.keys(map)) {
      if (frontendAllowed.includes(k)) continue;
      if (forbidden.includes(k)) {
        if (fname.startsWith('server/')) {
          localServerEnvKeys.push({ file: fname, key: k });
        } else {
          foundForbiddenInFrontendEnv.push({ file: fname, key: k });
        }
      }
    }
  }

  // Search only frontend-exposed surfaces for accidental server secret usage.
  const patterns = [...forbidden, 'process.env.STRIPE', 'process.env.SUPABASE_SERVICE_ROLE_KEY'];
  const frontendSurfaces = ['src', 'public', 'index.html', 'vite.config.js', 'vite.config.ts']
    .map((rel) => path.join(repoRoot, rel));
  const frontendHits = await searchForStrings(frontendSurfaces, patterns);

  // Check for API/server presence
  const hasApiDir = await fs.stat(path.join(repoRoot, 'api')).then(() => true).catch(() => false);
  const hasServer = await fs.stat(path.join(repoRoot, 'server')).then(() => true).catch(() => false);
  const hasExpress = await (async () => {
    if (!pkg) return false;
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    return Boolean(deps.express || deps['@vercel/node']);
  })();

  // Build config
  const buildScript = pkg && pkg.scripts && (pkg.scripts.build || pkg.scripts['build:client']);
  const outputDirGuess = viteConfig ? 'dist (vite default) or configured' : 'unknown';

  // Vercel checks
  const vercelIssues = [];
  if (!vercel) vercelIssues.push('Missing vercel.json');
  else {
    if (!vercel.builds && !vercel.routes && !vercel.rewrites) {
      vercelIssues.push('vercel.json present but no builds/routes/rewrites configured');
    }
  }

  // Stripe checks
  const stripeTestKeys = [];
  const stripeLiveKeys = [];
  for (const [f,map] of Object.entries(envs)) {
    for (const k of Object.keys(map)) {
      if (/STRIPE_.*_KEY/i.test(k) || /STRIPE_/.test(k)) {
        if (map[k].includes('sk_test') || map[k].includes('pk_test')) stripeTestKeys.push({file: f, key: k});
        if (map[k].includes('sk_live') || map[k].includes('pk_live')) stripeLiveKeys.push({file: f, key: k});
      }
    }
  }

  // Supabase auth URLs check
  const supabaseUrls = [];
  for (const map of Object.values(envs)) {
    for (const k of Object.keys(map)) {
      if (/SUPABASE_.*URL/i.test(k) || /SUPABASE_.*ANON/i.test(k)) supabaseUrls.push({key: k, val: map[k]});
    }
  }

  // Prepare output in requested format
  console.log('\n### Deployment summary');
  console.log('- Role: senior deployment and infrastructure engineer (deployment-agent)');
  console.log(`- Repo root: ${repoRoot}`);
  console.log(`- Detected package.json: ${pkg ? 'yes' : 'no'}`);
  console.log(`- Detected vercel.json: ${vercel ? 'yes' : 'no'}`);
  console.log(`- Detected server/API: ${hasApiDir || hasServer || hasExpress ? 'yes' : 'no'}`);
  console.log(`- Build script: ${buildScript || 'missing'}`);
  console.log(`- Output dir guess: ${outputDirGuess}`);

  console.log('\n### Files touched');
  console.log('- Added: .agents/tools/deployment-agent/index.js, .agents/tools/deployment-agent/package.json, .agents/tools/deployment-agent/README.md');

  console.log('\n### Dashboard actions');
  console.log('- Review vercel.json and ensure builds/rewrites for API routes');
  console.log('- Set env vars in Vercel for Preview and Production separately');
  console.log('- Configure Supabase auth callback URLs for local, preview, production');
  console.log('- Configure Stripe webhook endpoints: preview (test) and production (live)');

  console.log('\n### Required env vars');
  console.log('- Frontend: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY, VITE_APP_URL');
  console.log('- Backend: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY (server-only)');

  console.log('\n### Safe to deploy');
  const safe = (foundForbiddenInFrontendEnv.length === 0 && frontendHits.length === 0 && (stripeLiveKeys.length === 0));
  console.log(safe ? 'YES' : 'NO');

  console.log('\n### Manual verification checklist');
  console.log('- Ensure server secrets are only in ignored local env files or backend platform env vars');
  console.log('- Verify Vercel env vars: preview uses test keys, production uses live keys');
  console.log('- Verify Supabase callback URLs include local, preview, and production');
  console.log('- Verify Stripe webhook signing secret configured in server env for production');
  if (foundForbiddenInFrontendEnv.length) {
    console.log('\n### Issues found: Server-only secrets in root frontend env files');
    for (const it of foundForbiddenInFrontendEnv) console.log(`- ${it.key} in ${it.file}`);
  }
  if (frontendHits.length) {
    console.log('\n### Issues found: Server-only env names in frontend-exposed source');
    for (const h of frontendHits.slice(0, 20)) console.log(`- ${h.pattern} found in ${h.file}`);
  }
  if (localServerEnvKeys.length) {
    console.log('\n### Local backend env vars detected');
    for (const it of localServerEnvKeys) console.log(`- ${it.key} in ${it.file} (expected if ignored and server-only)`);
  }
  if (stripeLiveKeys.length) {
    console.log('\n### Warning: Live Stripe keys found in env files (ensure these are only in production envs)');
    for (const k of stripeLiveKeys) console.log(`- ${k.key} in ${k.file}`);
  }

  console.log('\nDone. For next steps run `node .agents/tools/deployment-agent/index.js` from the repo root or `npm start` from the deployment agent folder.');
}

main().catch(err => {
  console.error('deployment-agent error:', err);
  process.exit(2);
});

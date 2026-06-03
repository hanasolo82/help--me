import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(currentDir, '..', '..');
const checks = [
  'package.json',
  'vite.config.js',
  'src',
  'server',
  'migrations',
  'migrations.sql',
  'vercel.json',
  '.env',
  'routes',
  'server/routes',
  'src/components',
  'src/pages'
];

console.log('Audit root:', root);
checks.forEach(rel => {
  const p = path.join(root, rel);
  console.log(`${rel}: ${exists(p) ? 'FOUND' : 'missing'}`);
});

// simple file search for keywords
const keywords = ['stripe', 'supabase', 'service_role', 'helper_status', 'accountLinks', 'rls', 'policy', 'onboard', 'iban'];
function searchFiles(dir, depth=3) {
  if (depth<0) return [];
  let results = [];
  let list;
  try {
    list = fs.readdirSync(dir);
  } catch {
    return results;
  }
  list.forEach(name => {
    const p = path.join(dir, name);
    let stat;
    try {
      stat = fs.statSync(p);
    } catch {
      return;
    }
    if (stat.isDirectory()) results = results.concat(searchFiles(p, depth-1));
    else {
      try {
        const txt = fs.readFileSync(p,'utf8');
        keywords.forEach(k => { if (txt.includes(k)) results.push({file:p, keyword:k}); });
      } catch {
        // Ignore files that cannot be read as text.
      }
    }
  });
  return results;
}

console.log('\nScanning repo for keywords (depth 3)...');
const found = searchFiles(root, 3);
found.slice(0,50).forEach(f => console.log(f.keyword, 'in', f.file));

console.log(`\nAudit complete. Matches: ${found.length}`);

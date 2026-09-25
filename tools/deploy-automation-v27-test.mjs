import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.argv[2] || '.');
const checks = [];
const add = (name, ok, detail = '') => checks.push({
  name,
  ok: Boolean(ok),
  detail: String(detail || '')
});

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    add(`file exists: ${rel}`, false, 'missing');
    return '';
  }
  add(`file exists: ${rel}`, true);
  return fs.readFileSync(file, 'utf8');
}

const quality = read('.github/workflows/quality-gate.yml');
const deploy = read('.github/workflows/production-deploy.yml');
const verify = read('.github/workflows/production-verification.yml');
const postdeploy = read('tools/postdeploy-ui-acceptance-v21.mjs');

add('quality gate runs RC25', quality.includes('npm run release25:verify'));
add('quality gate runs v27 automation check', quality.includes('npm run deploy27:check'));
add('quality gate writes RC25 evidence', quality.includes('release-candidate-v25.json'));

add('production deploy validates RC25 before deploy', deploy.includes('npm run release25:verify'));
add('production deploy runs v27 automation check', deploy.includes('npm run deploy27:check'));
add('production deploy executes postdeploy UI gate', deploy.includes('postdeploy-ui-acceptance-v21.mjs'));
add('production deploy writes postdeploy UI evidence', deploy.includes('postdeploy-ui-v21.json'));
add('production deploy uploads postdeploy UI evidence', deploy.includes('reports/postdeploy-ui-v21.json'));

add('manual production verification checks UI in canary mode',
  verify.includes("inputs.mode == 'canary'") &&
  verify.includes('postdeploy-ui-acceptance-v21.mjs'));
add('manual verification uploads postdeploy UI evidence',
  verify.includes('reports/postdeploy-ui-v21.json'));

add('postdeploy gate checks v24 shell marker',
  postdeploy.includes("shell enables Creator OS v24") &&
  postdeploy.includes("cfs-os-v24"));
add('postdeploy gate checks v24 component layer',
  postdeploy.includes('CSS contains Creator OS v24 component layer') &&
  postdeploy.includes('BEGIN CREATOR OS REDESIGN V24'));
add('postdeploy gate checks v24 theme layer',
  postdeploy.includes('theme contains Creator OS v24 global layer') &&
  postdeploy.includes('v24 CREATOR OS REDESIGN'));
add('postdeploy live fetch bypasses normal cache',
  postdeploy.includes("'cache-control': 'no-cache'") &&
  postdeploy.includes("pragma: 'no-cache'"));

const failed = checks.filter(check => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` · ${check.detail}` : ''}`);
}

console.log(`\nDeploy Automation v27: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exitCode = 1;

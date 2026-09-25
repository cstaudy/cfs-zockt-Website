import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || '.');
const jsonMode = process.argv.includes('--json');

const required = [
  'public/assets/css/cfs-theme-v3.css',
  'public/assets/css/cfs-onboarding-v4.css',
  'public/assets/css/cfs-ui-v18.css',
  'public/assets/js/cfs-shell-v3.js',
  'public/assets/js/cfs-onboarding-v4.js',
  'public/assets/js/cfs-ui-v18.js',
  'public/assets/img/brand/cfs-zockt-mark-original.png',
  'public/assets/img/brand/cfs-zockt-wordmark-transparent.png',
  'tools/postdeploy-ui-acceptance-v21.mjs'
];

const retired = [
  'cfs-guide-v5.css','cfs-help-v6.css','cfs-empty-v7.css','cfs-nav-v8.css',
  'cfs-dashboard-v9.css','cfs-forms-v10.css','cfs-mobile-v11.css','cfs-accessibility-v12.css',
  'cfs-home-v13.css','cfs-suite-v14.css','cfs-plans-v15.css','cfs-support-v16.css',
  'cfs-security-v17.css','cfs-guide-v5.js','cfs-help-v6.js','cfs-empty-v7.js','cfs-nav-v8.js',
  'cfs-dashboard-v9.js','cfs-forms-v10.js','cfs-mobile-v11.js','cfs-accessibility-v12.js',
  'cfs-home-v13.js','cfs-suite-v14.js','cfs-plans-v15.js','cfs-support-v16.js','cfs-security-v17.js'
];

const checks = [];
const add = (name, ok, detail = '') => checks.push({name, ok: Boolean(ok), detail: String(detail || '')});

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

for (const rel of required) {
  add(`required file ${rel}`, fs.existsSync(path.join(root, rel)));
}

const shellPath = path.join(root, 'public/assets/js/cfs-shell-v3.js');
if (fs.existsSync(shellPath)) {
  const shell = fs.readFileSync(shellPath, 'utf8');
  add('shell references cfs-ui-v18.css', shell.includes('/assets/css/cfs-ui-v18.css'));
  add('shell references cfs-ui-v18.js', shell.includes('/assets/js/cfs-ui-v18.js'));
  add('shell has no retired split runtime names', !retired.some(name => shell.includes(name)));
}

const existingRetired = [];
for (const name of retired) {
  for (const prefix of ['public/assets/css','public/assets/js']) {
    const file = path.join(root, prefix, name);
    if (fs.existsSync(file)) existingRetired.push(path.relative(root, file));
  }
}
add('retired split runtime files absent', existingRetired.length === 0, existingRetired.join(', '));

const files = walk(root);
const obviousSecretPatterns = [
  ['Stripe live key', /sk_live_[A-Za-z0-9]{12,}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{20,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{12,}/],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
];

const secretHits = [];
for (const file of files) {
  if (/\.(png|jpg|jpeg|ico|webp|zip)$/i.test(file)) continue;
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  for (const [label, pattern] of obviousSecretPatterns) {
    if (pattern.test(text)) secretHits.push(`${path.relative(root,file)}: ${label}`);
  }
}
add('obvious secret literal scan', secretHits.length === 0, secretHits.join('\n'));

const commands = [
  ['postdeploy local', 'npm', ['run','postdeploy21:ui:local']],
  ['website acceptance', 'node', ['tools/website-acceptance-pass21-3-14-test.mjs','.']],
  ['accessibility responsive', 'node', ['tools/website-accessibility-responsive-pass21-3-12-test.mjs','.']],
  ['visual polish', 'node', ['tools/website-visual-polish-pass21-3-13-test.mjs','.']],
  ['website security', 'node', ['tools/website-security-pass-test.mjs','.']],
  ['MFA security', 'node', ['tools/account-mfa-security-test.mjs','.']],
  ['passkey security', 'node', ['tools/account-passkey-security-test.mjs','.']],
  ['GitHub readiness', 'node', ['tools/github-repository-readiness-pass21-test.mjs','.']],
  ['deployment readiness', 'node', ['tools/production-deployment-readiness-pass13-test.mjs','.']],
  ['predeploy doctor', 'node', ['tools/predeploy-production-doctor-r68.mjs','.']]
];

for (const [name, command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore','pipe','pipe']
  });
  const tail = String(result.stdout || result.stderr || '').trim().split(/\r?\n/).slice(-1)[0] || '';
  add(name, result.status === 0, tail);
}

const manifest = {};
for (const rel of required) {
  const file = path.join(root, rel);
  if (fs.existsSync(file)) manifest[rel] = sha256(file);
}

const failed = checks.filter(item => !item.ok);
const output = {
  release: 'v22',
  root,
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  total: checks.length,
  checks,
  manifest
};

if (jsonMode) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log('cfs_zockt Release Candidate v22');
  console.log(`Root: ${root}\n`);
  for (const item of checks) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` · ${item.detail}` : ''}`);
  }
  console.log(`\nRelease Candidate v22: ${output.passed}/${output.total} PASS`);
  console.log(output.ok ? 'RC22_READY' : 'RC22_BLOCKED');
}

if (failed.length) process.exitCode = 1;

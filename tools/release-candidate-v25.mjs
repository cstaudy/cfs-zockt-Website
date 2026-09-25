import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const rootArg = args.find(arg => !arg.startsWith('--')) || '.';
const root = path.resolve(rootArg);

const checks = [];
const add = (name, ok, detail = '') => checks.push({
  name,
  ok: Boolean(ok),
  detail: String(detail || '')
});

const required = [
  'public/assets/css/cfs-theme-v3.css',
  'public/assets/css/cfs-onboarding-v4.css',
  'public/assets/css/cfs-ui-v18.css',
  'public/assets/js/cfs-shell-v3.js',
  'public/assets/js/cfs-onboarding-v4.js',
  'public/assets/js/cfs-ui-v18.js',
  'public/assets/img/brand/cfs-zockt-mark-original.png',
  'public/assets/img/brand/cfs-zockt-wordmark-transparent.png',
  'tools/postdeploy-ui-acceptance-v21.mjs',
  'tools/account-auth-production-progress-r62-v23.mjs'
];

const forbiddenRuntime = [
  'public/assets/css/cfs-v24.css',
  'public/assets/js/cfs-v24.js',
  'public/assets/css/cfs-creator-os-v24.css',
  'public/assets/js/cfs-creator-os-v24.js'
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function sha256(rel) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(root, rel)))
    .digest('hex');
}

for (const rel of required) {
  add(`required file ${rel}`, fs.existsSync(path.join(root, rel)));
}

for (const rel of forbiddenRuntime) {
  add(`no extra v24 runtime ${rel}`, !fs.existsSync(path.join(root, rel)));
}

const shell = read('public/assets/js/cfs-shell-v3.js');
const theme = read('public/assets/css/cfs-theme-v3.css');
const ui = read('public/assets/css/cfs-ui-v18.css');

add('v24 class installed on html', shell.includes('document.documentElement.classList.add("cfs-ui-v3", "cfs-os-v24")'));
add('v24 class installed on body', shell.includes('document.body.classList.add("cfs-ui-v3", "cfs-os-v24")'));
add('v24 global design block present', theme.includes('v24 CREATOR OS REDESIGN'));
add('v24 component design block present', ui.includes('BEGIN CREATOR OS REDESIGN V24'));
add('v24 keeps consolidated v18 JS runtime', shell.includes('/assets/js/cfs-ui-v18.js'));
add('v24 keeps consolidated v18 CSS runtime', shell.includes('/assets/css/cfs-ui-v18.css'));

const visualMarkers = [
  ['dark creator OS base', 'linear-gradient(180deg,#05070a 0%,#040609 52%,#020305 100%)', theme],
  ['flat creator sidebar', 'body.cfs-os-v24 .cfs-global-sidebar', theme],
  ['public editorial hero', 'body.cfs-os-v24.public-home .brand-hero', theme],
  ['dashboard working surface', 'body.cfs-os-v24 .cfs-dashboard-v9-focus', ui],
  ['creator suite matrix', 'body.cfs-os-v24 .cfs-suite-v14-goals', ui],
  ['plans matrix', 'body.cfs-os-v24 .cfs-plans-v15-live-grid', ui],
  ['support routing matrix', 'body.cfs-os-v24 .cfs-support-v16-grid', ui],
  ['security center', 'body.cfs-os-v24 .cfs-security-v17-grid', ui],
  ['mobile app toolbar', 'body.cfs-os-v24 .cfs-mobile-dock', ui]
];

for (const [label, marker, source] of visualMarkers) {
  add(label, source.includes(marker));
}

add('theme CSS brace balance', (theme.match(/{/g) || []).length === (theme.match(/}/g) || []).length);
add('UI CSS brace balance', (ui.match(/{/g) || []).length === (ui.match(/}/g) || []).length);

const secretPatterns = [
  ['Stripe live key', /sk_live_[A-Za-z0-9]{12,}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{20,}/],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
];

const scanFiles = [
  'public/assets/css/cfs-theme-v3.css',
  'public/assets/css/cfs-ui-v18.css',
  'public/assets/js/cfs-shell-v3.js'
];

const secretHits = [];
for (const rel of scanFiles) {
  const text = read(rel);
  for (const [label, regex] of secretPatterns) {
    if (regex.test(text)) secretHits.push(`${rel}: ${label}`);
  }
}
add('v24 changed-files secret literal scan', secretHits.length === 0, secretHits.join('\n'));

const commands = [
  ['shell syntax', 'node', ['--check','public/assets/js/cfs-shell-v3.js']],
  ['UI bundle syntax', 'node', ['--check','public/assets/js/cfs-ui-v18.js']],
  ['homepage', 'node', ['tools/website-homepage-pass21-3-3-test.mjs','.']],
  ['creator shell', 'node', ['tools/website-creator-shell-pass21-3-7-test.mjs','.']],
  ['dashboard', 'node', ['tools/website-dashboard-pass21-3-8-test.mjs','.']],
  ['creator tools', 'node', ['tools/website-creator-tools-pass21-3-9-test.mjs','.']],
  ['management', 'node', ['tools/website-management-pass21-3-10-test.mjs','.']],
  ['accessibility responsive', 'node', ['tools/website-accessibility-responsive-pass21-3-12-test.mjs','.']],
  ['visual polish', 'node', ['tools/website-visual-polish-pass21-3-13-test.mjs','.']],
  ['website acceptance', 'node', ['tools/website-acceptance-pass21-3-14-test.mjs','.']],
  ['website security', 'node', ['tools/website-security-pass-test.mjs','.']],
  ['MFA security', 'node', ['tools/account-mfa-security-test.mjs','.']],
  ['passkey security', 'node', ['tools/account-passkey-security-test.mjs','.']],
  ['postdeploy local', 'npm', ['run','postdeploy21:ui:local']],
  ['GitHub readiness', 'node', ['tools/github-repository-readiness-pass21-test.mjs','.']],
  ['deployment readiness', 'node', ['tools/production-deployment-readiness-pass13-test.mjs','.']],
  ['predeploy doctor', 'node', ['tools/predeploy-production-doctor-r68.mjs','.']]
];

for (const [name, command, commandArgs] of commands) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore','pipe','pipe']
  });
  const lines = String(result.stdout || result.stderr || '').trim().split(/\r?\n/);
  const tail = lines.slice(-1)[0] || '';
  add(name, result.status === 0, tail);
}

const manifest = {};
for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) manifest[rel] = sha256(rel);
}

for (const rel of [
  'public/assets/css/cfs-theme-v3.css',
  'public/assets/css/cfs-ui-v18.css',
  'public/assets/js/cfs-shell-v3.js'
]) {
  manifest[rel] = sha256(rel);
}

const failed = checks.filter(check => !check.ok);

const output = {
  release: 'v25',
  based_on_design: 'v24 Creator OS Redesign',
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
  console.log('cfs_zockt Release Candidate v25');
  console.log('Design basis: v24 Creator OS Redesign');
  console.log(`Root: ${root}\n`);

  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` · ${check.detail}` : ''}`);
  }

  console.log(`\nRelease Candidate v25: ${output.passed}/${output.total} PASS`);
  console.log(output.ok ? 'RC25_READY' : 'RC25_BLOCKED');
}

if (failed.length) process.exitCode = 1;

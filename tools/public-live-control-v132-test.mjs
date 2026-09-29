import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const server = read('server.js');
const html = read('public/pages/dashboard.html');
const js = read('public/assets/js/cfs-dashboard-neon-v128.js');
const css = read('public/assets/css/cfs-dashboard-neon-v128.css');
const checks = [
  ['server has creator live control module key', server.includes('PUBLIC_LIVE_OVERRIDE_MODULE_KEY = "public_live_control"')],
  ['server has authenticated GET live control route', server.includes('"/api/creator/public-live-control"') && server.includes('requireCreatorAccount')],
  ['server stores manual control in creator module state', server.includes('INSERT INTO creator_module_state (creator_id,module_key,state,updated_at)')],
  ['manual LIVE signal participates in public evidence', server.includes('const manualLive = manualControl?.active === true') && server.includes('source = "creator_dashboard"')],
  ['manual control expires automatically', server.includes('PUBLIC_LIVE_OVERRIDE_MAX_MS = 12 * 60 * 60 * 1000')],
  ['dashboard includes website live status panel', html.includes('id="cfsPublicLiveControl"') && html.includes('WEBSITE AUF LIVE SETZEN')],
  ['dashboard JS reads and updates live control', js.includes('/api/creator/public-live-control') && js.includes('setPublicLiveControl')],
  ['dashboard sends CSRF token for write', js.includes('X-CSRF-Token') && js.includes('__Host-cfs_csrf')],
  ['dashboard live control is styled', css.includes('.cfs-public-live-control') && css.includes('.cfs-public-live-pill.is-live')],
];
let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (ok) passed += 1;
}
console.log(`\nPublic LIVE Control v132: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

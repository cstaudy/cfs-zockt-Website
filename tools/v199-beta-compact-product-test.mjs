import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const checks = [];
const ok = (name, cond) => checks.push([name, Boolean(cond)]);

const server = read('server.js');
const env = read('.env.example');
const login = read('public/pages/login.html');
const studio = read('public/pages/stream-studio.html');
const dashboard = read('public/pages/dashboard.html');
const css = read('public/assets/css/cfs-product-v199.css');
const js = read('public/assets/js/cfs-product-v199.js');

ok('Beta tester env declared', server.includes('CFS_BETA_TESTER_EMAILS'));
ok('Beta tester env example safe', env.includes('CFS_BETA_TESTER_EMAILS=') && !env.includes('cstaudygaming@googlemail.com'));
ok('Configured beta tester helper', server.includes('ensureConfiguredBetaTester'));
ok('Configured beta tester access source', server.includes('beta_email_allowlist'));
ok('Registration keeps explicit terms', login.includes('id="termsAccepted"'));
ok('Registration keeps privacy acknowledgement', login.includes('id="privacyAcknowledged"'));
ok('Registration keeps beta acknowledgement', login.includes('id="betaAcknowledged"'));
ok('Registration keeps 18+ confirmation', login.includes('id="ageConfirmed"'));
ok('v199 stylesheet linked on login', login.includes('cfs-product-v199.css'));
ok('v199 stylesheet linked on studio', studio.includes('cfs-product-v199.css'));
ok('v199 stylesheet linked on dashboard', dashboard.includes('cfs-product-v199.css'));
ok('Compact registration checkbox fix', css.includes('.legal-consent input[type="checkbox"]'));
ok('Compact studio tabs implemented', js.includes('data-studio-v199-tab'));
ok('Compact studio view state implemented', js.includes('studioV199View'));
ok('Dashboard beta badge implemented', js.includes('BETA TESTER'));
ok('Creator nav simplified', js.includes("link.textContent = 'STUDIO'") && js.includes("link.textContent = 'VERBINDUNGEN'"));
ok('No token hardcoded in v199 files', !css.includes('CFS_AI_BRIDGE_TOKEN=') && !js.includes('CFS_AI_BRIDGE_TOKEN='));

const failed = checks.filter(([,v])=>!v);
for (const [name,v] of checks) console.log(`${v?'PASS':'FAIL'} ${name}`);
console.log(`CFS v199: ${checks.length-failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);

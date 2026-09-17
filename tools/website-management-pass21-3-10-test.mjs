import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const read = (p) => fs.readFileSync(path.join(base, p), 'utf8');
const pages = {
  account: read('public/pages/account.html'),
  settings: read('public/pages/settings.html'),
  setup: read('public/pages/setup.html'),
  integrations: read('public/pages/integrations.html'),
};
const css = read('public/assets/css/styles.css');
let pass = 0, total = 0;
function check(name, ok) {
  total++;
  if (ok) { pass++; console.log(`PASS ${String(total).padStart(2,'0')} ${name}`); }
  else { console.error(`FAIL ${String(total).padStart(2,'0')} ${name}`); process.exitCode = 1; }
}
for (const [name, html] of Object.entries(pages)) {
  check(`${name}: management hub`, html.includes('class="management-hub"'));
  check(`${name}: all management links`, ['/pages/account.html','/pages/settings.html','/pages/setup.html','/pages/integrations.html'].every(x => html.includes(x)));
  check(`${name}: private/noindex`, html.includes('noindex,nofollow,noarchive'));
}
check('account keeps profile form', pages.account.includes('id="profileForm"'));
check('account keeps session list', pages.account.includes('id="sessionList"'));
check('account keeps MFA controls', pages.account.includes('id="mfaSetupForm"') && pages.account.includes('id="mfaDisableForm"'));
check('account keeps passkey controls', pages.account.includes('id="passkeyAddForm"'));
check('setup keeps setup form', pages.setup.includes('id="setupForm"'));
check('setup keeps preview ids', ['previewPlan','previewTheme','previewWidgets','previewStart'].every(x => pages.setup.includes(`id="${x}"`)));
check('integrations keeps TikTok status ids', pages.integrations.includes('id="ttStatus"') && pages.integrations.includes('id="ttText"'));
check('integrations keeps NEXUS status id', pages.integrations.includes('id="nexusInfo"'));
check('integrations exposes launcher path', pages.integrations.includes('/pages/launcher.html') && pages.integrations.includes('/pages/launcher-connect.html'));
check('roadmap stays explicit', pages.integrations.includes('Twitch') && pages.integrations.includes('OBS') && (pages.integrations.match(/ROADMAP/g) || []).length >= 2);
check('settings no obsolete 2FA-not-released claim', !pages.settings.includes('2FA und Benachrichtigungspräferenzen sind noch kein fertiger Self-Service-Bestandteil'));
check('settings points MFA/Passkeys to account', pages.settings.includes('Passkeys') && pages.settings.includes('TOTP'));
check('management CSS present', css.includes('Pass 21.3.10 — Creator management hub') && css.includes('.management-hub-nav'));
console.log(`\nCreator Management Pass 21.3.10: ${pass}/${total} PASS`);
if (pass !== total) process.exit(1);

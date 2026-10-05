import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const sys = read('public/assets/js/page-system-check.js');
const ux = read('public/assets/js/cfs-creator-ux-v189.js');
const css = read('public/assets/css/cfs-creator-ux-v189.css');
const integrations = read('public/assets/js/page-integrations.js');
const flow = read('PROJECT_FLOW_PLAN.md');
const env = read('.env.example');
const pages = [
  'account.html','audio-studio.html','cut-studio.html','dashboard.html','editor.html','games.html','integrations.html',
  'launcher-connect.html','launcher-download.html','launcher-provider-connect.html','launcher.html','nexus.html','scene-studio.html',
  'settings.html','setup.html','stream-studio.html','system-check.html','technical-status.html','tiktok.html','widget-studio.html'
];
let total = 0, passed = 0;
const check = (name, cond) => {
  total++;
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { console.error(`FAIL ${name}`); process.exitCode = 1; }
};
const ver = String(pkg.version).split('.').map(Number);
check('Backend 3.20.34+', ver[0] > 3 || ver[0] === 3 && (ver[1] > 20 || ver[1] === 20 && ver[2] >= 34));
check('Backend synchronized', server.includes(`Version ${pkg.version}`) && sys.includes(`backend:"${pkg.version}"`));
check('Schema remains 78', sys.includes('schema:78'));
check('Launcher remains 0.47.30', sys.includes('launcher:"0.47.30"'));
check('Shared Creator UX JS exists', exists('public/assets/js/cfs-creator-ux-v189.js'));
check('Shared Creator UX CSS exists', exists('public/assets/css/cfs-creator-ux-v189.css'));
check('UX runs only in creator workspace', ux.includes('classList.contains("creator-workspace")'));
check('UX exposes explicit helper', ux.includes('window.CFSCreatorUX'));
check('UX has contextual help map', ux.includes('const HELP = Object.freeze'));
check('UX covers dashboard help', ux.includes('"/pages/dashboard.html"'));
check('UX covers account help', ux.includes('"/pages/account.html"'));
check('UX covers integrations help', ux.includes('"/pages/integrations.html"'));
check('UX covers widget studio help', ux.includes('"/pages/widget-studio.html"'));
check('UX covers scene studio help', ux.includes('"/pages/scene-studio.html"'));
check('UX covers stream studio help', ux.includes('"/pages/stream-studio.html"'));
check('UX covers cut studio help', ux.includes('"/pages/cut-studio.html"'));
check('UX covers launcher help', ux.includes('"/pages/launcher.html"'));
check('UX covers system check help', ux.includes('"/pages/system-check.html"'));
check('Empty states are normalized', ux.includes('creator-ux-state-empty') && ux.includes('EMPTY_SELECTORS'));
check('Danger states receive alert semantics', ux.includes('type === "error" ? "alert" : "status"'));
check('Dynamic states receive aria-live', ux.includes('setAttribute("aria-live"'));
check('Real load failures can receive retry', ux.includes('ERNEUT LADEN') && ux.includes('konnte[n]? nicht geladen'));
check('Retry is manual page reload only', ux.includes('retry.addEventListener("click", () => location.reload())'));
check('UX observes dynamically added states', ux.includes('new MutationObserver'));
check('Context help uses internal fixed map', !ux.includes('fetch(') && !ux.includes('localStorage') && !ux.includes('sessionStorage'));
check('Mobile actions are marked consistently', ux.includes('creator-ux-mobile-actions'));
check('Mobile actions collapse to one column', css.includes('grid-template-columns: 1fr !important'));
check('Mobile touch targets are enlarged', css.includes('min-height: 46px'));
check('Mobile tab/toolbar overflow stays reachable', css.includes('overflow-x: auto'));
check('Reduced motion is respected', css.includes('prefers-reduced-motion: reduce'));
check('Error text can wrap safely', css.includes('overflow-wrap: anywhere'));
check('Integration helper uses inline UX announce', integrations.includes('window.CFSCreatorUX?.announce'));
check('Twitch sync error is inline', integrations.includes('Twitch-Synchronisierung fehlgeschlagen'));
check('Twitch disconnect error is inline', integrations.includes('Twitch konnte nicht getrennt werden'));
check('YouTube sync error is inline', integrations.includes('YouTube-Synchronisierung fehlgeschlagen'));
check('YouTube disconnect error is inline', integrations.includes('YouTube konnte nicht getrennt werden'));
check('Provider action errors no longer use alert', !integrations.includes('alert(error.message)'));
check('No new UX API endpoint', !server.includes('/api/creator/ux') && !server.includes('/api/public/ux'));
check('Flow marks remaining Creator UX code block complete', flow.includes('[x] Fehler-/Leerzustände und mobile Bedienung im übrigen Creator-Layer') && flow.includes('[x] Hilfetexte im Creator-Layer konsistent halten.'));
check('Real browser acceptance remains open', flow.includes('Browser-visuelle Abnahme Public + Creator + Admin durchführen.'));
check('Commerce remains disabled', env.includes('CFS_COMMERCIAL_MODE=false'));
check('v189 release gate exists', pkg.scripts?.['creatorux189:check'] === 'node tools/creator-ux-polish-v189-test.mjs .' && pkg.scripts?.['release:v189'] === 'npm run release:v188 && npm run creatorux189:check');
for (const page of pages) {
  const html = read(`public/pages/${page}`);
  check(`${page} loads v189 UX assets`, html.includes('/assets/css/cfs-creator-ux-v189.css') && html.includes('/assets/js/cfs-creator-ux-v189.js'));
}
for (const f of ['CREATOR-UX-POLISH-v189.md','TECHNIK-v189.md','CREATOR-SUITE-COMPLETION-v189.md','SECURITY-BASELINE-v189.md','VALIDATION-v189.md','handoff/HANDOFF-v189.md']) {
  check(`${f} exists`, exists(f));
}
console.log(`Creator UX Polish v189: ${passed}/${total} PASS`);
if (passed !== total) process.exit(1);

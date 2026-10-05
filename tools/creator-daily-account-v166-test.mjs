import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const json = rel => JSON.parse(read(rel));
const results = [];
const check = (name, ok, detail='') => {
  results.push({name, ok: Boolean(ok), detail});
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` · ${detail}` : ''}`);
};
const semverGte = (actual, minimum) => {
  const a=String(actual).split('.').map(Number), b=String(minimum).split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}
  return true;
};

const pkg = json('package.json');
const launcher = json('launcher/package.json');
const dashboard = read('public/pages/dashboard.html');
const dashboardJs = read('public/assets/js/page-dashboard.js');
const dashboardPolish = read('public/assets/js/cfs-dashboard-neon-v128.js');
const onboarding = read('public/assets/js/cfs-onboarding-v4.js');
const dashboardCss = read('public/assets/css/cfs-dashboard-neon-v128.css');
const account = read('public/pages/account.html');
const accountCss = read('public/assets/css/account-professional.css');
const accountJs = read('public/assets/js/page-account.js');
const accountTabs = read('public/assets/js/account-tabs.js');
const server = read('server.js');
const systemCheck = read('public/assets/js/page-system-check.js');

check('backend >= 3.20.12', semverGte(pkg.version,'3.20.12'), pkg.version);
check('launcher remains >= 0.47.29', semverGte(launcher.version,'0.47.29'), launcher.version);
const serverVersion=(server.match(/const BACKEND_VERSION\s*=\s*\n?\s*"([^"]+)"/)||[])[1]||'0.0.0';
check('server runtime remains >= 3.20.12', semverGte(serverVersion,'3.20.12'), serverVersion);
const systemBackend=(systemCheck.match(/backend:"([^"]+)"/)||[])[1]||'0.0.0';
check('system check expects backend >= 3.20.12', semverGte(systemBackend,'3.20.12'), systemBackend);
check('system check keeps schema 73', /schema:(?:7[3-9]|[89]\d|\d{3,})/.test(systemCheck));
check('system check matches current launcher', systemCheck.includes(`launcher:"${launcher.version}"`));

check('dashboard uses current CFS mark', dashboard.includes('/assets/img/brand/cfs-zockt-mark.png'));
check('dashboard uses daily-flow root', dashboard.includes('creator-dashboard-v166'));
check('dashboard hero is concise', dashboard.includes('DEIN CREATOR<br><span>DASHBOARD.</span>') && dashboard.includes('Starte mit dem nächsten Schritt'));
check('dashboard primary next step preserved', dashboard.includes('id="nextStepCard"') && dashboard.includes('id="nextStepTitle"') && dashboard.includes('id="nextStepAction"'));
check('next step comes before quick actions', dashboard.indexOf('id="nextStepCard"') < dashboard.indexOf('id="creatorTodayActions"'));
check('quick actions come before live control', dashboard.indexOf('id="creatorTodayActions"') < dashboard.indexOf('id="cfsPublicLiveControl"'));
for (const route of ['/pages/stream-studio.html','/pages/widget-studio.html','/pages/launcher.html','/pages/integrations.html']) {
  check(`dashboard quick route ${route}`, dashboard.includes(`href="${route}"`));
}
check('dashboard no old visible beginner actions', !dashboard.includes('<section class="beginner-actions">'));
check('dashboard live control preserved', dashboard.includes('id="cfsPublicLiveControl"') && dashboard.includes('WEBSITE AUF LIVE SETZEN'));
check('dashboard has collapsed diagnostics', dashboard.includes('<details class="creator-dashboard-diagnostics-v166">') && dashboard.includes('STATUS &amp; DIAGNOSE'));
check('diagnostics contains connection status', dashboard.indexOf('class="beginner-status"') > dashboard.indexOf('creator-dashboard-diagnostics-v166'));
check('diagnostics contains STREAM STARTCHECK', dashboard.includes('STREAM STARTCHECK') && dashboard.includes('id="streamReadySteps"'));
check('diagnostics retains operations runtime ids', ['dashboardGameCard','dashboardPlayingCard','dashboardStreamCard','dashboardCutCard','dashboardLauncherCard'].every(id=>dashboard.includes(`id="${id}"`)));
for (const label of ['01 · START &amp; STATUS','02 · GESTALTEN','03 · PRODUZIEREN','04 · VERBINDEN','05 · COMMUNITY','06 · SYSTEM &amp; TESTS']) {
  check(`dashboard taxonomy retained ${label}`, dashboard.includes(label));
}
for (const id of ['toolReadyCount','toolAccessPlan','toolTotalCount','simpleToolGrid','moduleGrid','progressSetup','progressWidget','progressTikTok','progressLauncher','setupWarning']) {
  check(`dashboard runtime id retained ${id}`, dashboard.includes(`id="${id}"`));
}
check('legacy setup journey hidden from everyday view', dashboard.includes('creator-contract-only-v166') && dashboard.includes('hidden aria-hidden="true"'));
check('onboarding follows quick actions', onboarding.includes('document.getElementById("creatorTodayActions") || hero'));
check('dashboard polish keeps live control API', dashboardPolish.includes('/api/creator/public-live-control'));
check('dashboard polish keeps CSRF write', dashboardPolish.includes('X-CSRF-Token') && dashboardPolish.includes('__Host-cfs_csrf'));
check('dashboard polish no longer injects duplicate primary grids', !dashboardPolish.includes('cfsDashboardV128Primary') && !dashboardPolish.includes('buildStudioOverview'));
check('diagnostics toggle label implemented', dashboardPolish.includes('creator-dashboard-diagnostics-v166') && dashboardPolish.includes('AUSBLENDEN'));
check('daily quick grid responsive', dashboardCss.includes('.creator-dashboard-actions-grid-v166') && dashboardCss.includes('@media(max-width:1040px)') && dashboardCss.includes('@media(max-width:680px)'));
check('diagnostics overrides legacy hidden rules', dashboardCss.includes('creator-dashboard-diagnostics-v166 .beginner-status{display:grid!important') && dashboardCss.includes('creator-dashboard-diagnostics-v166 .creator-stream-ready{display:block!important'));
check('next step JS still consumes journey', dashboardJs.includes('renderNextStep') && dashboardJs.includes('nextStepTitle') && dashboardJs.includes('nextStepAction'));
check('stream-ready API still consumed', dashboardJs.includes('/api/creator/stream-ready'));

check('account uses current CFS mark', account.includes('/assets/img/brand/cfs-zockt-mark.png'));
check('account hero is concise', account.includes('ACCOUNT &amp; SICHERHEIT') && account.includes('Dein <span>Account.</span>'));
check('redundant management hub removed', !account.includes('<section class="management-hub"'));
for (const tab of ['Profil','Sicherheit','Sitzungen','Daten &amp; Konto']) {
  check(`account tab ${tab}`, account.includes(`<span>${tab}</span>`));
}
check('overview keeps profile form', account.includes('data-account-panel="overview"') && account.includes('id="profileForm"') && account.includes('id="displayName"') && account.includes('id="email"'));
check('overview keeps access plan', account.includes('id="plan"') && account.includes('id="accountAccessBadges"') && account.includes('id="accountFeatureGrid"'));
check('overview points advanced controls to tabs', account.includes('account-overview-hint-v166') && account.includes('Passkeys, 2FA, Sitzungen und Datenexport'));
check('security summary moved into security panel', account.indexOf('account-security-summary-v166') > account.indexOf('data-account-panel="security"'));
for (const id of ['emailVerificationStatus','passkeySummaryStatus','mfaSummaryStatus','securitySignalStatus']) {
  check(`security status retained ${id}`, account.includes(`id="${id}"`));
}
for (const id of ['passkeyAddForm','mfaSetupForm','mfaEnableForm','mfaRecoveryForm','mfaDisableForm','passwordChangeForm']) {
  check(`security action retained ${id}`, account.includes(`id="${id}"`));
}
check('technical protection details collapsed', account.includes('<details class="account-card account-security-explainer">') && account.includes('TECHNISCHE SCHUTZDETAILS'));
check('login protection explanation retained', account.includes('Login-Schutz') && account.includes('Rate Limits gegen automatisierte Versuche'));
for (const id of ['sessionList','logoutAllBtn','securityEventList']) {
  check(`session control retained ${id}`, account.includes(`id="${id}"`));
}
for (const id of ['dataExportForm','disconnectTikTokBtn','deleteAccountForm','deleteAccountBtn']) {
  check(`data/account control retained ${id}`, account.includes(`id="${id}"`));
}
check('account tab hash contract preserved', accountTabs.includes('#account-(overview|security|sessions|advanced)'));
check('account API behavior file retained', accountJs.includes('/api/account/passkeys') && accountJs.includes('/api/account/mfa'));
check('account v166 layout responsive', accountCss.includes('.account-overview-hint-v166') && accountCss.includes('.account-security-summary-v166') && accountCss.includes('@media(max-width:680px)'));
check('account technical details full-width', accountCss.includes('.account-security-explainer{grid-column:1/-1'));

for (const doc of ['TECHNIK-v166.md','CREATOR-SUITE-COMPLETION-v166.md','SECURITY-BASELINE-v166.md','CREATOR-DASHBOARD-ACCOUNT-v166.md']) {
  check(`v166 document ${doc}`, fs.existsSync(path.join(root, doc)));
}

check('v166 check registered', pkg.scripts?.['creator-daily166:check'] === 'node tools/creator-daily-account-v166-test.mjs .');
check('v166 release chains v165', pkg.scripts?.['release:v166'] === 'npm run release:v165 && npm run creator-daily166:check');

const passed = results.filter(r=>r.ok).length;
console.log(`\nCreator Daily + Account v166: ${passed}/${results.length} ${passed===results.length?'PASS':'FAIL'}`);
if (passed !== results.length) process.exit(1);

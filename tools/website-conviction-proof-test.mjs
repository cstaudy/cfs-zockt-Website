import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const home=read('public/index.html');
const css=read('public/assets/css/styles.css');
const readme=read('README.md');
const state=read('PROJECT_CURRENT_STATE.md');
const plan=read('CFS_CREATOR_SUITE_MASTER_PLAN.md');
const doctor=read('lib/config-doctor.js');
const bootstrap=read('lib/github-bootstrap-plan.js');
const bug=read('.github/ISSUE_TEMPLATE/bug_report.yml');
const acceptance=read('.github/ISSUE_TEMPLATE/release_acceptance.yml');
const pkg=JSON.parse(read('package.json'));

const checks=[]; const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
check('Homepage hero states concrete creator value',home.includes('Widgets, interaktive Games, Creator Tools und Desktop-Steuerung')&&home.includes('Verständlich für den Einstieg'));
check('Homepage has dedicated product proof section',home.includes('id="produktbeweis"')&&home.includes('HEUTE IM PRODUKT'));
check('Product proof covers Widget Studio core flows',home.includes('Fünf Kernflows direkt startklar')&&home.includes('Goal, Counter, Timer, Chat und Kamera/Overlay'));
check('Product proof covers media and non-destructive editing',home.includes('Eigene Bilder, Video und Audio')&&home.includes('nicht-destruktiv'));
check('Product proof covers Stream Board formats',home.includes('16:9 und 9:16 vor dem Stream planen'));
check('Product proof covers output and launcher',home.includes('Browser Source & Launcher zusammengedacht'));
check('Homepage explicitly limits OBS claims',home.includes('steuert OBS nicht automatisch'));
check('Homepage explicitly limits Twitch claims',home.includes('Twitch-Anbindung wird noch nicht als fertig bezeichnet'));
check('Homepage explicitly limits merch claims',home.includes('noch kein Shop und keine Bestellung'));
check('Homepage keeps current release status transparent',home.includes('Automatisierte interne Release-Prüfungen sind grün')&&home.includes('DNS/TLS, Lockfiles')&&home.includes('LIVE-Prüfungen bleiben separate Go-Live-Gates'));
check('Product proof has security CTA',home.includes('href="/pages/security.html">SICHERHEIT PRÜFEN'));
check('Hero trust links to product proof',home.includes('href="#produktbeweis"><strong>KEINE FAKE-ZAHLEN</strong>'));
check('Footer prioritizes current product status',home.includes('href="/pages/creator-suite.html#status">Was funktioniert</a>'));
check('Proof section has dedicated responsive styling',css.includes('Website conviction / product proof pass')&&css.includes('.brand-proof-layout')&&css.includes('@media(max-width:620px)'));
check('README is current',readme.includes('Backend: **3.12.0**')&&readme.includes('Launcher: **0.42.0**')&&readme.includes('PROJECT_CURRENT_STATE.md'));
check('Current state document exists and prioritizes trust',state.includes('Website-Sicherheit, Transparenz und Überzeugungskraft')&&state.includes('Backend: 3.12.0')&&state.includes('Launcher: 0.42.0'));
check('Master plan records post-V42 passes',plan.includes('POST-V42 WEBSITE / TRUST HARDENING')&&plan.includes('Website Conviction / Product Proof Pass'));
check('Config doctor examples use launcher 0.42.0',doctor.includes('z. B. 0.42.0')&&!doctor.includes('z. B. 0.41.0'));
check('GitHub bootstrap defaults use current versions',bootstrap.includes('options.backendVersion||"3.12.0"')&&bootstrap.includes('options.launcherVersion||"0.42.0"'));
check('Issue templates use current version examples',bug.includes('Backend 3.12.0 / Launcher 0.42.0')&&acceptance.includes('0.42.0 / Backend 3.12.0'));
check('Package exposes conviction check',pkg.scripts?.['conviction:check']==='node tools/website-conviction-proof-test.mjs .');
check('Backend version stays 3.12.0',pkg.version==='3.12.0');

const forbidden=[/100\s*%\s+sicher/i,/garantiert\s+sicher/i,/tausende\s+(?:nutzer|creator)/i,/twitch\s+ist\s+(?:fertig|vollständig\s+verfügbar)/i,/vollständige\s+twitch-anbindung\s+ist\s+fertig/i];
check('Homepage avoids absolute/fake marketing claims',!forbidden.some(rx=>rx.test(home)));

const failed=checks.filter(x=>!x.ok);
for(const item of checks) console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} conviction/product-proof checks passed.`);
if(failed.length) process.exit(1);

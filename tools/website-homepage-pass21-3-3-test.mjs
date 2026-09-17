import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const home=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/css/styles.css'),'utf8');
const checks=[]; const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const pos=id=>home.indexOf(`id="${id}"`);

check('Hero communicates creator platform value', home.includes('Widgets, interaktive Games, Creator Tools und Desktop-Steuerung') && home.includes('KOSTENLOS STARTEN'));
check('Runtime strip is present', home.includes('home-runtime-strip') && home.includes('publicHealthDot') && home.includes('Backend 3.12.0') && home.includes('Launcher 0.42.0'));
check('Product proof is early in page', pos('produktbeweis') > 0 && pos('produktbeweis') < pos('widget-studio'));
check('Widget Studio comes before Creator Suite tools', pos('widget-studio') > 0 && pos('widget-studio') < pos('suite'));
check('Launcher and Games have dedicated sections', pos('launcher') > pos('suite') && pos('games') > pos('launcher'));
check('Account trust comes before detailed trust section', pos('account-start') > pos('games') && pos('vertrauen') > pos('account-start'));
check('Plans and roadmap follow trust', pos('plans') > pos('vertrauen') && pos('roadmap') > pos('plans'));
check('Community/support is late in journey', pos('community') > pos('roadmap'));
check('Homepage avoids primary merch section', !home.includes('id="merch"') && !home.includes('brand-merch-showcase'));
check('No fake public metrics promise', home.includes('Keine erfundenen Nutzerzahlen') && home.includes('keine Live-, Nutzer- oder Erfolgsstatistiken'));
check('FREE signup transparency remains', home.includes('Neue Creator-Konten starten im FREE Plan') && home.includes('Für die Registrierung werden keine Zahlungsdaten abgefragt.'));
check('Security boundary stays visible', home.includes('KEIN 100-%-VERSPRECHEN') && home.includes('Sicherheit ist ein laufender Prozess.'));
check('Pass 21.3.3 styles exist', css.includes('PASS 21.3.3 · FINAL HOMEPAGE STRUCTURE') && css.includes('.home-runtime-strip') && css.includes('.home-community-grid'));

const failed=checks.filter(x=>!x.ok);
for(const item of checks) console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} homepage Pass 21.3.3 checks passed.`);
if(failed.length) process.exit(1);

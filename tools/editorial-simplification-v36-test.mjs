import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const home = read('public/index.html');
const css = read('public/assets/css/cfs-ui-v18.css');
const shell = read('public/assets/js/cfs-shell-v3.js');
const suite = read('public/pages/creator-suite.html');
const roadmap = read('public/pages/roadmap.html');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const main=(home.match(/<main>[\s\S]*?<\/main>/i)||[''])[0];
const visibleText=main.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const wordCount=visibleText ? visibleText.split(/\s+/).length : 0;
const sectionCount=(main.match(/<section\b/gi)||[]).length;
const articleCount=(main.match(/<article\b/gi)||[]).length;
const h2Count=(main.match(/<h2\b/gi)||[]).length;
const pos=id=>home.indexOf(`id="${id}"`);

check('v24 remains the global OS activation', shell.includes('cfs-os-v24') && !home.includes('cfs-os-v36') && !css.includes('cfs-os-v36'));
check('homepage is editorially reduced', sectionCount <= 9 && articleCount <= 10 && h2Count <= 7 && wordCount <= 850);
check('homepage is explicitly about the project and personal plan', home.includes('ÜBER CFS_ZOCKT · MEIN PLAN') && home.includes('mein eigener Plan') && home.includes('mein Projekt'));
check('homepage keeps the recognizable community-first identity', home.includes('MEHR ALS NUR GAMES.') && home.includes('GEMEINSAM CREATOR SEIN.') && home.includes('COMMUNITY FIRST'));
check('homepage explains the offer in four clear areas', home.includes('WAS ICH ANBIETE') && (home.match(/class="home-offer-grid"/g)||[]).length === 1 && ['Widget &amp; Stream Studio','Creator Suite &amp; Dashboard','Launcher &amp; Cut Studio','Games &amp; Community'].every(v=>home.includes(v)));
check('homepage keeps a simple three-step start path', home.includes('ERST VERSTEHEN. DANN ENTSCHEIDEN.') && ['Erst ansehen, dann verbinden.','Kostenlos starten','Nur verbinden, was du brauchst'].every(v=>home.includes(v)));
check('community has a dedicated late-page home', pos('community') > pos('vertrauen') && home.includes('DU SOLLST DICH HIER WILLKOMMEN FÜHLEN'));
check('trust remains compact and concrete', home.includes('SICHERHEIT & TRANSPARENZ') && home.includes('Absolute Sicherheit kann niemand seriös versprechen.') && home.includes('/pages/datenschutz.html'));
check('deep details are delegated to dedicated pages', ['/pages/creator-suite.html','/pages/roadmap.html','/pages/plans.html','/pages/security.html','/pages/support.html'].every(v=>home.includes(v)));
check('Creator Suite and Roadmap retain the detail removed from home', suite.includes('WIDGET STUDIO') && suite.includes('LAUNCHER 0.42.0') && roadmap.includes('BETA / AUSBAU') && roadmap.includes('ROADMAP'));
check('runtime truth remains visible', home.includes('home-runtime-strip') && home.includes('Backend 3.12.0') && home.includes('Launcher 0.42.0'));
check('home navigation prioritizes plan, offer and community', home.includes('class="home-plan-nav" href="#mein-plan">MEIN PLAN') && home.includes('>ANGEBOT</a>') && home.includes('class="home-community-nav" href="#community">COMMUNITY'));
check('detailed navigation is visually demoted on home only', css.includes('.public-home .public-nav a[href="/pages/creator-suite.html#widget-studio"]') && css.includes('.public-home .public-nav a[href="/pages/plans.html"]') && css.includes('.public-home .public-nav a[href="/pages/support.html"]'));
check('hero uses brand identity rather than setup-photo concept', !/KURZE PAUSE/i.test(home) && !/setup[-_ ]?(bild|photo|image)/i.test(main));
check('homepage avoids fake scale and certainty claims', !/(tausende\s+(nutzer|creator)|garantiert\s+sicher|100\s*%\s+sicher|garantierter\s+erfolg)/i.test(home));
check('v36 stays inside the consolidated component stylesheet', css.includes('v36 editorial simplification') && !fs.existsSync(path.join(root,'public/assets/css/cfs-v36.css')) && !fs.existsSync(path.join(root,'public/assets/js/cfs-v36.js')));

for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}`);
const pass=checks.filter(c=>c.ok).length;
const report={
  ok: pass===checks.length,
  generated_at:new Date().toISOString(),
  status: pass===checks.length?'EDITORIAL_SIMPLIFICATION_V36_PASS':'EDITORIAL_SIMPLIFICATION_V36_FAIL',
  checks_passed:pass,
  checks_total:checks.length,
  live_evidence:false,
  browser_evidence:false,
  metrics:{section_count:sectionCount,article_count:articleCount,h2_count:h2Count,word_count:wordCount},
  note:'Local/static editorial-density verification only. Deep product detail remains on dedicated pages; no production/browser PASS is implied.',
  checks
};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports','editorial-simplification-v36.json'),JSON.stringify(report,null,2)+'\n');
console.log(`\nEditorial Simplification v36: ${pass}/${checks.length} PASS · ${sectionCount} sections · ${articleCount} articles · ${wordCount} words`);
if(pass!==checks.length) process.exit(1);

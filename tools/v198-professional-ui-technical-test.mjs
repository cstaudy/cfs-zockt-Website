import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
let pass = 0;
let fail = 0;
const check = (name, ok) => {
  if (ok) { console.log(`PASS ${name}`); pass += 1; }
  else { console.error(`FAIL ${name}`); fail += 1; }
};

check('v198 stylesheet exists', exists('public/assets/css/cfs-brand-v198.css'));
check('clean transparent mark exists', exists('public/assets/img/brand/cfs-zockt-mark-clean.png'));
const css = read('public/assets/css/cfs-brand-v198.css');
check('v198 uses one UI font stack', css.includes('--cfs198-font:') && css.includes('font-family:var(--cfs198-font)!important'));
check('v198 avoids Impact in its own layer', !/Impact\s*,/i.test(css));
check('v198 fixes checkbox dimensions', css.includes('input[type="checkbox"]') && css.includes('width:18px!important'));
check('v198 constrains content width', css.includes('--cfs198-content:1220px'));
check('v198 keeps header at top', css.includes('top:0!important'));
check('v198 uses restrained semantic palette', css.includes('--cfs198-primary:#2b9df4') && css.includes('--cfs198-success:#45c98b'));

const shell = read('public/assets/js/cfs-shell-v3.js');
check('shell uses transparent wordmark', shell.includes('cfs-zockt-wordmark-transparent.png'));
check('shell ensures v198', shell.includes('ensureBrandV198()'));

const htmlFiles = ['public/index.html', ...fs.readdirSync(path.join(root,'public/pages')).filter(x=>x.endsWith('.html')).map(x=>`public/pages/${x}`)];
let branded = 0;
for (const rel of htmlFiles) {
  const html = read(rel);
  if (!html.includes('cfs-shell-v3.js') && !html.includes('cfs-brand-unified-v192.css')) continue;
  branded += 1;
  check(`${rel} loads v198`, html.includes('/assets/css/cfs-brand-v198.css'));
  check(`${rel} marks v198 body`, html.includes('data-cfs-brand-v198="1"'));
}
check('v198 applies across website shell', branded >= 40);

const jsFiles = ['public/assets/js/cfs-nav-v8.js','public/assets/js/cfs-ui-v18.js'];
for (const rel of jsFiles) {
  const js = read(rel);
  check(`${rel} uses real Datenschutz route`, js.includes('/pages/datenschutz.html'));
  check(`${rel} uses real Impressum route`, js.includes('/pages/impressum.html'));
  check(`${rel} has no stale privacy route`, !js.includes('/pages/privacy.html'));
  check(`${rel} has no stale imprint route`, !js.includes('/pages/imprint.html'));
}

const publicDir = path.join(root,'public');
const pageNames = new Set(fs.readdirSync(path.join(publicDir,'pages')).filter(x=>x.endsWith('.html')));
const badRefs = [];
const walk = dir => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir,name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(?:html|js|css)$/.test(name)) {
      const text = fs.readFileSync(full,'utf8');
      for (const match of text.matchAll(/["']\/pages\/([A-Za-z0-9._-]+\.html)/g)) {
        if (!pageNames.has(match[1])) badRefs.push(`${path.relative(root,full)} -> ${match[1]}`);
      }
    }
  }
};
walk(publicDir);
check('no static references to missing /pages/*.html routes', badRefs.length === 0);
if (badRefs.length) badRefs.forEach(x=>console.error(`  ${x}`));

const env = read('.env.example');
check('GitHub example bridge token stays empty', /^CFS_AI_BRIDGE_TOKEN=\s*$/m.test(env));

console.log(`\nCFS v198 Professional UI/Technical: ${pass}/${pass+fail} PASS`);
if (fail) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const buf=rel=>fs.readFileSync(path.join(root,rel));
const exists=rel=>fs.existsSync(path.join(root,rel));
const checks=[];
const check=(name,cond)=>{const ok=typeof cond==='function'?Boolean(cond()):Boolean(cond);checks.push({name,ok});console.log(`${ok?'PASS':'FAIL'} ${name}`)};
const pngSize=rel=>{const b=buf(rel);if(b.subarray(1,4).toString()!=='PNG')return null;return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)}};
const sha=rel=>crypto.createHash('sha256').update(buf(rel)).digest('hex');
const versionAtLeast=(a,b)=>{a=String(a).split('.').map(Number);b=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true};

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const launcher=JSON.parse(read('launcher/package.json'));
const system=read('public/assets/js/page-system-check.js');
const shell=read('public/assets/js/cfs-shell-v3.js');
const css=read('public/assets/css/cfs-brand-unified-v192.css');
const home=read('public/index.html');
const callback=read('public/auth/tiktok/callback.html');

check('backend is 3.20.37+',versionAtLeast(pkg.version,'3.20.37')&&pkg.version===lock.version&&lock.packages?.['']?.version===pkg.version);
check('schema remains 78',system.includes('schema:78'));
check('launcher remains 0.47.30',launcher.version==='0.47.30'&&system.includes('launcher:"0.47.30"'));
check('system check follows backend version',system.includes(`backend:"${pkg.version}"`));
check('recovery policy follows backend version',read('ops/application-recovery-policy.json').includes(`"backend_version": "${pkg.version}"`));

const pageDir=path.join(root,'public/pages');
const humanPages=['public/index.html',...fs.readdirSync(pageDir).filter(x=>x.endsWith('.html')).sort().map(x=>`public/pages/${x}`),'public/auth/tiktok/callback.html'];
check('40 human-facing pages are covered',humanPages.length===40);
for(const rel of humanPages){
  const html=read(rel);
  check(`${rel} loads v192 brand css`,html.includes('/assets/css/cfs-brand-unified-v192.css')&&html.includes('data-cfs-brand-v192'));
  check(`${rel} carries v192 body marker`,html.includes('data-cfs-brand-v192="1"'));
  check(`${rel} has current icon contract`,html.includes('/assets/img/favicon.ico')&&html.includes('/assets/img/app-icon.png')&&html.includes('/assets/img/apple-touch-icon.png'));
  check(`${rel} has no legacy visible wordmark`,!html.includes('cfs-zockt-wordmark-transparent.png'));
}

check('shared shell uses current CFS mark',shell.includes('const BRAND_MARK = "/assets/img/brand/cfs-zockt-mark.png"'));
check('shared shell renders CFS ZOCKT text',shell.includes('<strong>CFS ZOCKT</strong>'));
check('public shell keeps gaming/community label',shell.includes('GAMING · STREAMS · COMMUNITY'));
check('creator shell keeps Creator Suite label',shell.includes('creator ? "CREATOR SUITE"'));
check('shell upgrades plain brand anchors too',shell.includes('.site-header a.brand, header.top a.brand'));
check('shell generates missing utility header',shell.includes('function injectFallbackBrandHeader()')&&shell.includes('cfs-shell-generated-header'));
check('footer branding is centralized',shell.includes('cfs-footer-lockup')&&shell.includes('footerBrand.innerHTML = brandMarkup'));
check('creator product signature reuses same brand markup',shell.includes('brandMarkup({ creator: true })'));

check('v192 css defines one token layer',css.includes('--cfs192-bg:')&&css.includes('--cfs192-accent:')&&css.includes('--cfs192-header-h:'));
check('v192 css unifies public creator admin headers',css.includes('.gaming-header')&&css.includes('.creator-site-header')&&css.includes('header.top'));
check('v192 css styles new mark lockup',css.includes('.cfs-brand-wordmark')&&css.includes('.cfs-brand-copy strong'));
check('v192 css has unified focus-visible',css.includes(':focus-visible'));
check('v192 css has mobile contract',css.includes('@media(max-width:820px)')&&css.includes('@media(max-width:520px)'));
check('v192 css honors reduced motion',css.includes('@media(prefers-reduced-motion:reduce)'));
check('v192 css covers utility pages',css.includes('.cfs192-utility-shell')&&css.includes('.cfs192-utility-card'));

check('TikTok callback uses unified public shell',callback.includes('public-marketing public-auth-page')&&callback.includes('cfs192-utility-shell')&&callback.includes('cfs-brand-lockup'));
check('homepage structured data uses current mark',home.includes('https://cfs-zockt.de/assets/img/brand/cfs-zockt-mark.png'));
check('public homepage still brands cfs_zockt not Creator Suite in title',home.includes('<title>cfs_zockt – Gaming, Streams, Games & Community</title>'));

check('current mark asset exists',exists('public/assets/img/brand/cfs-zockt-mark.png'));
check('current mark is square 1024 PNG',()=>{const s=pngSize('public/assets/img/brand/cfs-zockt-mark.png');return s?.w===1024&&s?.h===1024});
check('app icon is 600 square current-family PNG',()=>{const s=pngSize('public/assets/img/app-icon.png');return s?.w===600&&s?.h===600});
check('apple touch icon is 180 square current-family PNG',()=>{const s=pngSize('public/assets/img/apple-touch-icon.png');return s?.w===180&&s?.h===180});
check('root app icon matches assets app icon',sha('public/app-icon.png')===sha('public/assets/img/app-icon.png'));
check('legacy header alias now matches current lockup',sha('public/assets/img/logo-header.png')===sha('public/assets/img/brand/cfs-zockt-logo.png'));
check('legacy root logo alias now matches current lockup',sha('public/cfs-zockt-logo.png')===sha('public/assets/img/brand/cfs-zockt-logo.png'));
check('widget follower goal no longer uses legacy header path',!read('public/widgets/follower-goal.html').includes('/assets/img/logo-header.png'));
check('editor fallback no longer uses legacy header path',!read('public/assets/js/page-editor.js').includes('/assets/img/logo-header.png'));

check('commerce stays off',read('PROJECT_CURRENT_STATE.md').includes('CFS_COMMERCIAL_MODE=false')||read('server.js').includes('CFS_COMMERCIAL_MODE'));
check('real acceptance is not claimed',read('PROJECT_CURRENT_STATE.md').toLowerCase().includes('acceptance')&&read('PROJECT_CURRENT_STATE.md').toLowerCase().includes('offen'));

const passed=checks.filter(x=>x.ok).length;
console.log(`\nWebsite Brand Unification v192: ${passed}/${checks.length} PASS`);
if(passed!==checks.length) process.exit(1);

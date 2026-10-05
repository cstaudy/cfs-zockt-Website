import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
let pass=0, fail=0;
const ok=(cond,msg)=>{ if(cond){pass++;console.log(`PASS ${pass}: ${msg}`)} else {fail++;console.error(`FAIL: ${msg}`)} };
const pkg=JSON.parse(read('package.json'));
const server=read('server.js');
const home=read('public/index.html');
const shell=read('public/assets/js/cfs-shell-v3.js');
const login=read('public/assets/js/page-login.js');
const sitemap=read('public/sitemap.xml');
const robots=read('public/robots.txt');
const ui=read('public/assets/js/cfs-ui-v18.js');
const nav=read('public/assets/js/cfs-nav-v8.js');
const shop=read('public/pages/shop.html');

ok(/^3\.20\.(?:2[5-9]|[3-9]\d)$/.test(pkg.version),'package version is v180 or newer');
ok(server.includes(`"${pkg.version}"`),'backend version follows package');
ok(read('public/assets/js/page-system-check.js').includes(`backend:"${pkg.version}"`) && /schema:(?:7[7-9]|[89]\d)/.test(read('public/assets/js/page-system-check.js')) && read('public/assets/js/page-system-check.js').includes('launcher:"0.47.30"'),'system check synchronized');
ok(read('ops/application-recovery-policy.json').includes(`"backend_version": "${pkg.version}"`),'recovery policy synchronized');
ok(pkg.scripts['brand180:check']==='node tools/brand-public-website-v180-test.mjs .','brand180 gate registered');
ok(pkg.scripts['release:v180']==='npm run release:v179 && npm run brand180:check','release v180 chains v179');

ok(home.includes('<title>cfs_zockt – Gaming, Streams, Games & Community</title>'),'public title is cfs_zockt brand-first');
ok(home.includes('id="warum"'),'homepage has Warum cfs_zockt section');
ok(home.includes('id="streams"') && home.includes('id="games"') && home.includes('id="community"'),'homepage keeps streams/games/community sections');
ok(home.includes('Warum cfs_zockt?'),'homepage explains project motivation');
ok(home.includes('Twitch') && home.includes('TikTok') && home.includes('Discord'),'homepage foregrounds community platforms');
ok(home.includes('id="statTikTok"') && home.includes('id="statDiscord"'),'homepage keeps live community metrics');
ok(home.includes('id="recentGamesGrid"') || home.includes('data-recent-games'),'homepage keeps current/recent games surface');
ok(home.includes('/assets/img/brand/cfs-zockt-mark.png'),'homepage uses current cfs_zockt mark');
ok(home.includes('Creator Bereich') && home.includes('href="/pages/login.html"'),'public product entry routes through Creator login');
ok(!/<nav class="gaming-nav"[\s\S]*?href="\/pages\/(?:creator-suite|shop|launcher-download|launcher|dashboard|widget-studio|scene-studio)\.html"/i.test(home),'public main nav does not expose private products');
ok(home.includes('© <span data-cfs-current-year>2026</span> cfs_zockt · Alle Rechte vorbehalten.'),'public copyright is centrally branded and dynamic');
ok(home.includes('data-funnel-cta="tiktok-streams"') && home.includes('data-funnel-cta="tiktok-community"'),'TikTok source journey stays public-first');

ok(shell.includes('cfs-zockt-mark.png'),'Creator shell uses current cfs_zockt logo');
ok(shell.includes('CREATOR SUITE'),'Creator shell carries product label');
ok(shell.includes('injectCreatorProductSignature')&&shell.includes('brandMarkup({ creator: true })'),'Creator product signature exists');
ok(shell.includes('data-cfs-current-year'),'Creator product copyright year is dynamic');
ok(shell.includes('injectCreatorProductSignature'),'Creator signature is injected centrally');
ok(read('public/assets/css/cfs-unified-v172.css').includes('.cfs-product-signature-v180'),'Creator signature has shared styling');

ok(server.includes('CREATOR PRODUCT HTML ACCESS · v180 BRAND / PUBLIC BOUNDARY'),'server has explicit Creator HTML boundary');
ok(server.includes('PUBLIC_PAGE_HTML_ALLOWLIST'),'server has public HTML allowlist');
ok(server.includes('getCreatorFromRequest(req)'),'protected HTML resolves Creator session');
ok(server.includes('/pages/login.html?returnTo=${returnTo}'),'unauthenticated product HTML redirects to login with returnTo');
ok(server.includes('X-Robots-Tag') && server.includes('noindex, nofollow, noarchive'),'protected HTML receives robots header');
ok(server.includes('Cache-Control') && server.includes('no-store'),'protected HTML is not cached publicly');
ok(server.includes('ensureCreatorCsrfCookie(req, res)'),'authenticated product HTML retains CSRF setup');
ok(login.includes('const safeReturnTo = () =>'),'login validates returnTo');
ok(login.includes('raw.startsWith("/pages/")') && login.includes('raw.startsWith("//")'),'login returnTo rejects external/protocol-relative redirects');

const protectedPages=['creator-suite','dashboard','shop','shop-product','launcher','launcher-download','widget-studio','scene-studio','stream-studio','account','setup','integrations','admin-creators'];
for(const page of protectedPages){
  const rel=`public/pages/${page}.html`;
  if(!exists(rel)) continue;
  const html=read(rel);
  ok(/<meta name="robots" content="noindex,nofollow,noarchive">/.test(html),`${page} is noindex/nofollow`);
}

const sitemapUrls=[...sitemap.matchAll(/<loc>https:\/\/cfs-zockt\.de([^<]*)<\/loc>/g)].map(m=>m[1]||'/');
ok(sitemapUrls.length===4,'sitemap exposes exactly four indexable public URLs');
ok(['/','/pages/roadmap.html','/pages/support.html','/pages/security.html'].every(u=>sitemapUrls.includes(u)),'sitemap contains only brand/status public pages');
ok(!sitemap.includes('creator-suite') && !sitemap.includes('launcher') && !sitemap.includes('shop') && !sitemap.includes('dashboard'),'sitemap excludes Creator products');
ok(robots.includes('Disallow: /pages/creator-suite.html') && robots.includes('Disallow: /pages/shop.html') && robots.includes('Disallow: /pages/launcher.html'),'robots reinforces product privacy boundary');

ok(!ui.includes('[start,suite,shop,launcher,plans,support]'),'shared UI no longer injects private products into public nav');
ok(!nav.includes('[start,suite,shop,launcher,plans,support]'),'standalone nav no longer injects private products into public nav');
ok(shop.includes('BUNDLES ODER EINZELSTÜCKE'),'private Shop retains bundle/standalone offer model');
ok(server.includes('publisher:"cfs_zockt"') || server.includes('publisher: "cfs_zockt"') || server.includes('"cfs_zockt"'),'server contains cfs_zockt publisher identity');
ok(!read('public/pages/creator-suite.html').includes('Audio Studio folgt später'),'private Creator product has no stale Audio Studio promise');

ok(/^# PROJECT CURRENT STATE · v(?:180|18[1-9]|19\d)/.test(read('PROJECT_CURRENT_STATE.md')),'current state points to v180 or newer');
ok(read('PROJECT_FLOW_PLAN.md').includes('Nicht verhandelbare Produktgrenze'),'flow plan codifies public/creator/admin boundary');
ok(/Stand: \*\*v(?:180|18[1-9]|19\d)\*\*/.test(read('CFS_CREATOR_SUITE_MASTER_PLAN.md')),'master plan points to v180 or newer');
for(const doc of ['BRAND-PUBLIC-WEBSITE-v180.md','CREATOR-SUITE-COMPLETION-v180.md','SECURITY-BASELINE-v180.md','TECHNIK-v180.md']) ok(exists(doc),`${doc} exists`);
ok(read('BRAND-PUBLIC-WEBSITE-v180.md').includes('Die öffentliche Website ist die Marke **cfs_zockt**'),'brand document states public identity');
ok(read('SECURITY-BASELINE-v180.md').includes('HTML-Zugriffsgrenze'),'security baseline documents HTML access boundary');
ok(read('PROJECT_FLOW_PLAN.md').includes('Commerce ganz zum Schluss') || read('PROJECT_FLOW_PLAN.md').includes('Commerce') && read('PROJECT_FLOW_PLAN.md').includes('Schluss'),'commerce remains deferred');
ok(server.includes('CFS_COMMERCIAL_MODE') && !/CFS_COMMERCIAL_MODE\s*=\s*true/.test(server),'commercial mode is not hard-enabled');

console.log(`Brand/Public Website v180: ${pass}/${pass+fail} PASS`);
if(fail) process.exit(1);

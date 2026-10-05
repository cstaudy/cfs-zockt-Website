import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
let pass=0,fail=0;const ok=(cond,msg)=>{if(cond){pass++;console.log(`PASS ${pass}: ${msg}`)}else{fail++;console.error(`FAIL: ${msg}`)}};
const pkg=JSON.parse(read('package.json'));
const server=read('server.js');
const admin=read('public/pages/admin-creators.html');
const adminJs=read('public/assets/js/admin-control-center-v181.js');
const adminCss=read('public/assets/css/admin-control-center-v181.css');
const home=read('public/index.html');
const publicJs=read('public/assets/js/cfs-public-content-v181.js');
const schema=read('lib/database-schema-contract.js');
const system=read('public/assets/js/page-system-check.js');
const versionAtLeast=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)>(y[i]||0))return true;if((x[i]||0)<(y[i]||0))return false}return true};

ok(versionAtLeast(pkg.version,'3.20.26'),'package version is v181 or newer');
ok(server.includes(`"${pkg.version}"`),'backend version follows package');
ok(schema.includes('DATABASE_SCHEMA_VERSION = 78'),'schema contract is 78');
ok(system.includes(`backend:"${pkg.version}",schema:78,launcher:"0.47.30"`),'system check synchronized');
ok(pkg.scripts['admin181:check']==='node tools/private-admin-control-center-v181-test.mjs .','admin181 gate registered');
ok(pkg.scripts['release:v181']==='npm run release:v180 && npm run admin181:check','release v181 chains v180');

ok(server.includes('CREATE TABLE IF NOT EXISTS admin_site_content'),'site content table exists');
ok(server.includes('draft_content JSONB'),'draft content is persisted');
ok(server.includes('published_content JSONB'),'published content is persisted separately');
ok(server.includes('draft_revision INTEGER'),'draft revisions exist');
ok(server.includes('published_revision INTEGER'),'published revisions exist');
ok(server.includes('UNIQUE(owner_creator_id,content_key)'),'site content is isolated per admin owner/key');
ok(server.includes('idx_admin_site_content_owner'),'site content owner index exists');

ok(server.includes('PRIVATE ADMIN CONTROL CENTER · V181'),'server has v181 control center section');
ok(server.includes('ADMIN_SITE_CONTENT_KEYS'),'server owns explicit site content allowlist');
ok(server.includes('home.identity')&&server.includes('home.games')&&server.includes('home.community')&&server.includes('home.creator_entry')&&server.includes('home.announcement'),'all planned site sections are allowlisted');
ok(server.includes('normalizeAdminSiteContent'),'site content is structurally normalized');
ok(server.includes('Nur HTTPS-Links sind erlaubt.'),'external URLs are HTTPS-only');
ok(server.includes('raw.startsWith("/")&&!raw.startsWith("//")'),'internal URLs reject protocol-relative paths');

ok(server.includes('app.get("/api/admin/control-center/summary"'),'private control-center summary endpoint exists');
ok(server.includes('app.get("/api/admin/site-content"'),'private draft read endpoint exists');
ok(server.includes('requireCreatorAdminSensitiveRead,async(req,res)=>'),'draft read uses sensitive admin read gate');
ok(server.includes('app.put("/api/admin/site-content/:key/draft"'),'draft save endpoint exists');
ok(server.includes('app.post("/api/admin/site-content/:key/publish"'),'publish endpoint exists');
ok(server.includes('app.post("/api/admin/site-content/:key/revert"'),'revert endpoint exists');
ok(server.includes('app.use("/api/admin/"'),'global admin write middleware remains present');
ok(server.includes('requireCreatorAdminElevation(req,res,()=>'),'admin writes remain elevation-gated');
ok(server.includes('recordAdminAuditEvent(req,res.statusCode)'),'privileged admin writes remain audited');

ok(server.includes('app.get("/api/public/site-content"'),'public published-content endpoint exists');
const publicBlock=server.slice(server.indexOf('app.get("/api/public/site-content"'),server.indexOf('app.get("/api/admin/control-center/summary"'));
ok(publicBlock.includes('loadPublicSiteContent'),'public endpoint only uses public content loader');
ok(!publicBlock.includes('draft_content'),'public endpoint block does not expose draft field');
const loaderBlock=server.slice(server.indexOf('async function loadPublicSiteContent'),server.indexOf('app.get("/api/public/site-content"'));
ok(loaderBlock.includes('published_content')&&loaderBlock.includes('published_revision>0'),'public loader reads only published snapshots');
ok(!loaderBlock.includes('draft_content'),'public loader does not query drafts');

ok(server.includes('pagePath === "/pages/admin-creators.html"'),'admin HTML gets explicit server-side check');
ok(server.includes('!(await isCreatorSuiteAdmin(account))'),'admin HTML check uses real admin authorization');
ok(server.includes('res.status(404).sendFile'),'non-admin creators do not receive admin HTML');

ok(admin.includes('adminControlCenterPanel'),'admin page contains personal control center');
ok(admin.includes('PRIVATE ADMIN ONLY'),'admin page clearly marks private scope');
ok(admin.includes('WEBSITE STUDIO'),'admin page includes website studio');
ok(admin.includes('siteContentKey'),'website section selector exists');
ok(admin.includes('siteSaveDraft')&&admin.includes('sitePreview')&&admin.includes('sitePublish')&&admin.includes('siteRevert'),'draft/preview/publish/revert controls exist');
ok(admin.includes('BUNDLES & EINZELSTÜCKE'),'existing production engine is linked from control center');
ok(admin.includes('adminBundleFactoryPanel'),'bundle factory remains part of same admin page');
ok(admin.includes('/assets/js/admin-control-center-v181.js'),'v181 admin runtime loaded');
ok(admin.includes('/assets/css/admin-control-center-v181.css'),'v181 admin styling loaded');

ok(adminJs.includes('/api/admin/control-center/summary'),'admin UI loads private summary');
ok(adminJs.includes('/api/admin/site-content'),'admin UI loads site drafts');
ok(adminJs.includes('/draft')&&adminJs.includes('/publish')&&adminJs.includes('/revert'),'admin UI calls site lifecycle endpoints');
ok(adminJs.includes('Maximal 6 hervorgehobene Games'),'featured game limit is surfaced');
ok(adminJs.includes('confirm("Diesen Website-Bereich jetzt öffentlich veröffentlichen?"') ,'publish action requires explicit confirmation');
ok(adminJs.includes('Website-Entwurf gespeichert. Öffentlich ist noch nichts geändert.'),'draft save makes non-public behavior explicit');
ok(adminCss.includes('.admin-control-center-v181'),'control center has dedicated styling');
ok(adminCss.includes('.admin-site-preview-host'),'private preview has dedicated styling');

ok(home.includes('/assets/js/cfs-public-content-v181.js'),'public homepage loads published-content runtime');
ok(home.includes('data-site="identity.hero_text"'),'hero content is publish-controlled');
ok(home.includes('data-site="identity.why_title"'),'why section is publish-controlled');
ok(home.includes('data-site="games.title"'),'games heading is publish-controlled');
ok(home.includes('id="adminFeaturedGames"'),'published featured games have a public surface');
ok(home.includes('data-site="community.intro"'),'community copy is publish-controlled');
ok(home.includes('data-site-href="community.twitch_url"')&&home.includes('data-site-href="community.tiktok_url"')&&home.includes('data-site-href="community.discord_url"'),'community links are publish-controlled');
ok(home.includes('id="cfsAdminAnnouncement"')&&home.includes('hidden'),'optional announcement is hidden by default');
ok(home.includes('data-site="creator_entry.title"'),'creator entry is publish-controlled');

ok(publicJs.includes('/api/public/site-content'),'public runtime only fetches public site-content endpoint');
ok(!publicJs.includes('/api/admin/'),'public runtime never calls admin APIs');
ok(publicJs.includes('textContent'),'public content is inserted as text, not arbitrary HTML');
ok(!publicJs.includes('innerHTML'),'public content runtime avoids HTML injection');
ok(publicJs.includes('featured.slice(0,6)')||publicJs.includes('featured)?games.featured.slice(0,6)'), 'public featured games stay capped');

ok(/^# PROJECT CURRENT STATE · v(\d+)/.test(read('PROJECT_CURRENT_STATE.md')) && Number(read('PROJECT_CURRENT_STATE.md').match(/^# PROJECT CURRENT STATE · v(\d+)/)?.[1]||0)>=181,'current state points to v181 or newer');
ok(/Website[- ]Draft\/Preview\/Publish\/Revert/.test(read('PROJECT_FLOW_PLAN.md')),'flow plan includes private website workflow');
ok(/Stand: \*\*v(\d+)\*\*/.test(read('CFS_CREATOR_SUITE_MASTER_PLAN.md')) && Number(read('CFS_CREATOR_SUITE_MASTER_PLAN.md').match(/Stand: \*\*v(\d+)\*\*/)?.[1]||0)>=181,'master plan points to v181 or newer');
for(const doc of ['PRIVATE-ADMIN-CONTROL-CENTER-v181.md','TECHNIK-v181.md','SECURITY-BASELINE-v181.md','CREATOR-SUITE-COMPLETION-v181.md','handoff/HANDOFF-v181.md'])ok(exists(doc),`${doc} exists`);
ok(read('SECURITY-BASELINE-v181.md').includes('Admin-Seite ist nach Creator-Login zusätzlich serverseitig Admin-only'),'security baseline documents admin HTML boundary');
ok(read('PRIVATE-ADMIN-CONTROL-CENTER-v181.md').includes('Entwurf speichern → private Vorschau → veröffentlichen'),'admin control center document states workflow');
ok(server.includes('CFS_COMMERCIAL_MODE')&&!/CFS_COMMERCIAL_MODE\s*=\s*true/.test(server),'commercial mode is not hard-enabled');

console.log(`Private Admin Control Center v181: ${pass}/${pass+fail} PASS`);if(fail)process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const server=read('server.js');
const html=read('public/pages/admin-creators.html');
const js=read('public/assets/js/admin-creators.js');
const css=read('public/assets/css/admin-creators.css');
const security=read('public/pages/security.html');
const env=read('.env.example');
const doctor=read('lib/config-doctor.js');
const blueprint=read('render.blueprint.example.yaml');
const pkg=JSON.parse(read('package.json'));
const checks=[];
function check(name,ok){checks.push({name,ok:Boolean(ok)});console.log(`${ok?'PASS':'FAIL'}  ${name}`)}

check('separate audit HMAC secret exists',/CFS_ADMIN_AUDIT_HMAC_SECRET/.test(server));
check('audit HMAC has development-only fallback',/cfs-admin-audit-dev-hmac-secret-change-me/.test(server));
check('production requires audit HMAC secret',/requireEnv\(\s*"CFS_ADMIN_AUDIT_HMAC_SECRET",\s*ADMIN_AUDIT_HMAC_SECRET/.test(server));
check('production requires >=32 char audit secret',/ADMIN_AUDIT_HMAC_SECRET\.length < 32/.test(server));
check('env example documents audit secret',/CFS_ADMIN_AUDIT_HMAC_SECRET=/.test(env));
check('config doctor treats audit secret as secret',/"CFS_ADMIN_AUDIT_HMAC_SECRET"/.test(doctor)&&/Admin-Audit-Kette/.test(doctor));
check('render blueprint generates audit secret',/key:\s*CFS_ADMIN_AUDIT_HMAC_SECRET[\s\S]{0,80}generateValue:\s*true/.test(blueprint));

check('audit table has chain version',/chain_version SMALLINT NOT NULL DEFAULT 0/.test(server));
check('audit table has previous hash',/prev_hash VARCHAR\(64\)/.test(server));
check('audit table has event hash',/event_hash VARCHAR\(64\)/.test(server));
check('legacy migration adds integrity columns without back-signing',/ALTER TABLE creator_admin_audit_events ADD COLUMN IF NOT EXISTS chain_version/.test(server)&&/Legacy/.test(server));
check('audit checkpoint table exists',/CREATE TABLE IF NOT EXISTS creator_admin_audit_checkpoint/.test(server));
check('retention stores checkpoint before delete',/INSERT INTO creator_admin_audit_checkpoint[\s\S]{0,900}DELETE FROM creator_admin_audit_events/.test(server));
check('audit writes use transaction',/async function recordAdminAuditEvent[\s\S]{0,1500}BEGIN/.test(server)&&/COMMIT/.test(server));
check('audit writes use advisory transaction lock',/recordAdminAuditEvent[\s\S]{0,1500}pg_advisory_xact_lock/.test(server));
check('audit chain uses HMAC SHA-256',/signAdminAuditEvent[\s\S]{0,350}createHmac\("sha256",ADMIN_AUDIT_HMAC_SECRET\)/.test(server));
check('canonical payload binds previous hash',/canonicalAdminAuditPayload[\s\S]{0,500}event\.prev_hash/.test(server));
check('canonical payload binds admin id',/canonicalAdminAuditPayload[\s\S]{0,500}event\.admin_creator_id/.test(server));
check('canonical payload binds route and outcome',/canonicalAdminAuditPayload[\s\S]{0,500}event\.route/.test(server)&&/event\.outcome/.test(server));
check('canonical payload binds request id and time',/canonicalAdminAuditPayload[\s\S]{0,650}event\.request_id/.test(server)&&/event\.created_at/.test(server));
check('new events use chain version one',/ADMIN_AUDIT_CHAIN_VERSION\s*=\s*1/.test(server));
check('root hash is explicit',/ADMIN_AUDIT_ROOT_HASH\s*=\s*"0"\.repeat\(64\)/.test(server));
check('verification recomputes HMAC',/verifyAdminAuditIntegrity[\s\S]{0,2200}signAdminAuditEvent\(row\)/.test(server));
check('verification checks previous hash linkage',/verifyAdminAuditIntegrity[\s\S]{0,1800}row\.prev_hash[\s\S]{0,180}expectedPrev/.test(server));
check('verification uses timing-safe text comparison',/safeEqualText\(String\(row\.event_hash\|\|""\),expectedHash\)/.test(server));
check('integrity returns first bad event id only',/first_bad_event_id/.test(server)&&!/tampered_payload/.test(server));
check('legacy events are counted separately',/legacy_events:legacyCount/.test(server));
check('audit endpoint returns integrity result',/audit-events[\s\S]{0,850}verifyAdminAuditIntegrity/.test(server));
check('audit endpoint remains admin protected',/"\/api\/admin\/creator-suite\/audit-events",requireCreatorAccount,requireCreatorAdmin/.test(server));
check('forensic export is a POST admin route',/app\.post\("\/api\/admin\/creator-suite\/audit-export"/.test(server));
check('forensic export is covered by central admin step-up',/app\.use\("\/api\/admin\/"[\s\S]{0,900}requireCreatorAdminElevation/.test(server));
check('forensic export contains integrity snapshot',/format:"cfs-admin-audit-v1"/.test(server)&&/integrity,\n\s*events:rows\.rows/.test(server));
check('forensic export creates security event',/admin_audit_exported/.test(server));
check('audit storage still avoids request body',!/creator_admin_audit_events[\s\S]{0,650}(request_body|body_json|payload_json)/i.test(server));
check('audit storage still avoids IP or user agent',!/creator_admin_audit_events[\s\S]{0,650}(ip_address|user_agent|remote_addr)/i.test(server));
check('audit retention remains 180 days',/ADMIN_AUDIT_RETENTION_DAYS\s*=\s*\n?\s*180/.test(server));

check('admin UI exposes integrity badge',/id="adminAuditIntegrity"/.test(html)&&/KETTE OK/.test(js));
check('admin UI distinguishes legacy rows',/LEGACY/.test(js));
check('admin UI exposes forensic export',/id="exportAdminAudit"/.test(html)&&/exportAdminAudit/.test(js));
check('forensic export uses adminJson wrapper',/adminJson\("\/api\/admin\/creator-suite\/audit-export"/.test(js));
check('admin UI downloads JSON locally',/new Blob\(\[payload\],\{type:"application\/json"\}\)/.test(js));
check('integrity failure has visible bad state',/admin-audit-integrity\.bad/.test(css)&&/INTEGRITÄTSFEHLER/.test(js));
check('public security page describes HMAC chaining',/HMAC-verkettet/.test(security));
check('package script exposes admin17 check',pkg.scripts?.['admin17:check']==='node tools/admin-audit-integrity-security-pass17-test.mjs .');

const failed=checks.filter(c=>!c.ok);
console.log(`\nAdmin audit integrity security: ${checks.length-failed.length}/${checks.length}`);
if(failed.length)process.exit(1);

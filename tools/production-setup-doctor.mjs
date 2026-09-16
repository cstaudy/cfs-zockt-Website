import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {runtimeDoctor}=require('../lib/config-doctor.js');
const root=path.resolve(process.argv[2]||'.');
const strict=process.argv.includes('--strict');
const canonical='https://cfs-zockt.de';
const expectedHost='cfs-zockt.de';
const checks=[];
const warnings=[];

function add(id,label,ok,detail='',blocking=true){checks.push({id,label,ok:Boolean(ok),detail,blocking});}
function exists(rel){return fs.existsSync(path.join(root,rel));}
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function env(name){return String(process.env[name]??'').trim();}
function validHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&Boolean(u.hostname)}catch{return false}}

const packageJson=JSON.parse(read('package.json'));
const launcherPackage=JSON.parse(read('launcher/package.json'));
const exact=/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const rootDeps=Object.entries(packageJson.dependencies||{});
const launcherDeps=Object.entries(launcherPackage.dependencies||{});
add('node_engine','Node.js 22+ declared',/^>=?22(?:\.|$)/.test(String(packageJson.engines?.node||'')),String(packageJson.engines?.node||'missing'));
add('root_deps_exact','Backend direct dependencies are exact',rootDeps.every(([,v])=>exact.test(String(v))),`${rootDeps.length} dependencies`);
add('launcher_deps_exact','Launcher direct dependencies are exact',launcherDeps.every(([,v])=>exact.test(String(v))),`${launcherDeps.length} dependencies`);
add('root_lock','Backend package-lock.json exists',exists('package-lock.json'),'package-lock.json');
add('launcher_lock','Launcher package-lock.json exists',exists('launcher/package-lock.json'),'launcher/package-lock.json');

const blueprintFile='render.blueprint.example.yaml';
add('blueprint_present','Render Blueprint example exists',exists(blueprintFile),blueprintFile);
if(exists(blueprintFile)){
  const y=read(blueprintFile);
  add('blueprint_manual_deploy','Blueprint disables auto deploy',/autoDeployTrigger:\s*["\']?off["\']?/.test(y));
  add('blueprint_npm_ci','Blueprint build uses npm ci',/buildCommand:\s*npm ci\b/.test(y));
  add('blueprint_health','Blueprint uses application health check',/healthCheckPath:\s*\/api\/health/.test(y));
  add('blueprint_domain','Blueprint declares canonical domain',/\n\s*-\s*cfs-zockt\.de\s*(?:\n|$)/.test(y));
  add('blueprint_origin','Blueprint pins canonical APP_BASE_URL',/APP_BASE_URL[\s\S]{0,100}value:\s*https:\/\/cfs-zockt\.de/.test(y));
  add('blueprint_rp','Blueprint pins WebAuthn RP ID',/CFS_WEBAUTHN_RP_ID[\s\S]{0,100}value:\s*cfs-zockt\.de/.test(y));
  add('blueprint_secrets','Blueprint does not hardcode production secrets',!/(sk_live_|whsec_|postgres(?:ql)?:\/\/[^\s]+@|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/.test(y));
}

const hasRuntimeSignal=['DATABASE_URL','TIKTOK_CLIENT_KEY','TIKTOK_CLIENT_SECRET','CFS_LAUNCHER_API_KEY','CFS_TOKEN_ENCRYPTION_KEY'].some(k=>env(k));
if(hasRuntimeSignal || strict){
  const runtime=runtimeDoctor(process.env);
  add('runtime_config','Production runtime configuration passes config doctor',runtime.ready,runtime.blocking.join(', ')||`${runtime.passed}/${runtime.total}`);
  const appBase=env('APP_BASE_URL');
  add('canonical_origin','APP_BASE_URL is canonical production origin',appBase===canonical,appBase||'missing');
  const redirect=env('TIKTOK_REDIRECT_URI');
  add('oauth_callback','TikTok callback is canonical',redirect===`${canonical}/auth/tiktok/callback`,redirect||'missing');
  const rp=env('CFS_WEBAUTHN_RP_ID')||expectedHost;
  add('webauthn_rp','WebAuthn RP ID is canonical',rp===expectedHost,rp);
  const hosts=env('CFS_ALLOWED_HOSTS').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  add('host_allowlist','Host allowlist contains root and www',hosts.includes(expectedHost)&&hosts.includes(`www.${expectedHost}`),hosts.join(', ')||'missing');
  const mailMode=(env('CFS_ACCOUNT_MAIL_MODE')||'disabled').toLowerCase();
  if(mailMode==='webhook'){
    add('mail_url','Mail webhook URL uses HTTPS',validHttps(env('CFS_ACCOUNT_MAIL_WEBHOOK_URL')),env('CFS_ACCOUNT_MAIL_WEBHOOK_URL')?'configured':'missing');
    add('mail_secret','Mail webhook secret has >=32 chars',env('CFS_ACCOUNT_MAIL_WEBHOOK_SECRET').length>=32,env('CFS_ACCOUNT_MAIL_WEBHOOK_SECRET')?'configured':'missing');
  }
}else{
  warnings.push('Runtime environment was not supplied; secret/value checks were skipped. Run with production env or --strict on the deployment host.');
  checks.push({id:'runtime_config',label:'Production runtime configuration',ok:null,detail:'not evaluated (no production env supplied)',blocking:false});
}

const failed=checks.filter(c=>c.blocking&&c.ok===false);
const evaluated=checks.filter(c=>c.ok!==null);
const status=failed.length?'NO-GO':'GO';
const report={schema:1,generated_at:new Date().toISOString(),status,root,summary:{passed:evaluated.filter(c=>c.ok).length,failed:failed.length,skipped:checks.filter(c=>c.ok===null).length},checks,warnings};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports','production-setup-doctor.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(root,'reports','production-setup-doctor.md'),`# Production Setup Doctor\n\n**Generated:** ${report.generated_at}\n\n**Status:** **${status}**\n\n${checks.map(c=>`- ${c.ok===true?'PASS':c.ok===false?'FAIL':'SKIP'} — ${c.label}${c.detail?` (${c.detail})`:''}`).join('\n')}\n${warnings.length?`\n## Hinweise\n\n${warnings.map(w=>`- ${w}`).join('\n')}\n`:''}`);
for(const c of checks)console.log(`${c.ok===true?'PASS':c.ok===false?'FAIL':'SKIP'}  ${c.label}${c.detail?` · ${c.detail}`:''}`);
if(warnings.length)for(const w of warnings)console.log(`WARN  ${w}`);
console.log(`\nProduction Setup Doctor: ${status}`);
console.log('Report: reports/production-setup-doctor.json');
if(failed.length)process.exitCode=1;

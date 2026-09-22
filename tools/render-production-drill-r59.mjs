import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dns from 'node:dns/promises';
import tls from 'node:tls';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {runtimeDoctor}=require('../lib/config-doctor.js');
const {databaseRuntimeSecurity}=require('../lib/database-runtime-security.js');
const {DATABASE_SCHEMA_VERSION}=require('../lib/database-schema-contract.js');
const args=process.argv.slice(2);
function value(name,fallback=''){const i=args.indexOf(name);return i>=0?(args[i+1]||fallback):fallback}
const positional=args.find((arg,i)=>!arg.startsWith('--')&&(i===0||!['--target','--out'].includes(args[i-1])))||'.';
const root=path.resolve(positional);
const live=args.includes('--live');
const strictEnv=args.includes('--strict-env');
const externalOnly=args.includes('--external-only');
if(strictEnv&&externalOnly)throw new Error('--strict-env und --external-only dürfen nicht kombiniert werden.');
const targetRaw=value('--target',process.env.CFS_PRODUCTION_URL||process.env.APP_BASE_URL||'https://cfs-zockt.de');
const outFile=path.resolve(root,value('--out','reports/render-production-drill-r59.json'));
const canonical=new URL(targetRaw);
if(canonical.protocol!=='https:')throw new Error('Production target muss HTTPS verwenden.');
const expectedOrigin=canonical.origin;
const expectedHost=canonical.hostname.toLowerCase();
const packageJson=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const checks=[];
function add(scope,id,label,ok,detail='',blocking=true){checks.push({scope,id,label,status:ok===null?'SKIP':ok?'PASS':'FAIL',ok,detail,blocking,blocked:false});}
function blocked(scope,id,label,detail=''){checks.push({scope,id,label,status:'BLOCKED',ok:null,detail,blocking:false,blocked:true});}
function exists(rel){return fs.existsSync(path.join(root,rel))}
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8')}
function safeDetail(error){return String(error?.message||error||'unbekannter Fehler').replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'postgresql://[redacted]').slice(0,300)}
function headerContains(res,name,needle){return String(res.headers.get(name)||'').toLowerCase().includes(String(needle).toLowerCase())}
async function request(url,options={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10_000);try{return await fetch(url,{redirect:'manual',...options,signal:controller.signal,headers:{'user-agent':'cfs-zockt-render-drill/1.0',...(options.headers||{})}})}finally{clearTimeout(timer)}}
// ---------- Static repository / Blueprint readiness ----------
add('static','package_lock','Backend lockfile exists',exists('package-lock.json'),'package-lock.json');
add('static','start_command','npm start launches server.js',packageJson.scripts?.start==='node server.js',String(packageJson.scripts?.start||'missing'));
add('static','node_engine','Node.js 22+ declared',/^>=?22(?:\.|$)/.test(String(packageJson.engines?.node||'')),String(packageJson.engines?.node||'missing'));
add('static','server_syntax_source','server.js exists',exists('server.js'),'server.js');
add('static','blueprint','Render Blueprint exists',exists('render.blueprint.example.yaml'),'render.blueprint.example.yaml');
if(exists('render.blueprint.example.yaml')){
  const y=read('render.blueprint.example.yaml');
  add('static','manual_deploy','Render auto deploy disabled',/autoDeployTrigger:\s*["']?off["']?/.test(y));
  add('static','npm_ci','Render build uses npm ci',/buildCommand:\s*npm ci\s+--omit=dev\s+--ignore-scripts\s+--no-audit\s+--no-fund/.test(y));
  add('static','render_start','Render start command uses npm start',/startCommand:\s*npm start/.test(y));
  add('static','health_path','Render health check uses /api/health',/healthCheckPath:\s*\/api\/health/.test(y));
  add('static','shutdown_delay','Render allows 30s graceful shutdown',/maxShutdownDelaySeconds:\s*(?:3\d|[4-9]\d|\d{3,})/.test(y));
  add('static','canonical_domain','Canonical domain declared',new RegExp(`\\n\\s*-\\s*${expectedHost.replaceAll('.','\\.')}\\s*(?:\\n|$)`).test(y),expectedHost);
  add('static','production_origin','Blueprint pins production APP_BASE_URL',new RegExp(`APP_BASE_URL[\\s\\S]{0,100}value:\\s*${expectedOrigin.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`).test(y),expectedOrigin);
  add('static','database_external_secret','DATABASE_URL is not hardcoded',/key:\s*DATABASE_URL[\s\S]{0,80}sync:\s*false/.test(y));
  add('static','launcher_key_external_secret','Launcher API key is not hardcoded',/key:\s*CFS_LAUNCHER_API_KEY[\s\S]{0,80}sync:\s*false/.test(y));
  const generated=['CFS_TOKEN_ENCRYPTION_KEY','CFS_CSRF_SIGNING_SECRET','CFS_PUBLIC_REVIEW_HASH_SALT','CFS_PUBLIC_SUPPORT_HASH_SALT','CFS_MFA_RECOVERY_HASH_SALT','CFS_ADMIN_ELEVATION_SECRET','CFS_ACCOUNT_ELEVATION_SECRET','CFS_ADMIN_AUDIT_HMAC_SECRET'];
  add('static','generated_secrets','Independent security secrets are generated',generated.every(name=>new RegExp(`key:\\s*${name}[\\s\\S]{0,80}generateValue:\\s*true`).test(y)),`${generated.length} secrets`);
  add('static','no_plaintext_secrets','Blueprint contains no obvious plaintext production credential',!/(sk_live_|rk_live_|whsec_[A-Za-z0-9_-]{12,}|postgres(?:ql)?:\/\/[^\s]+@|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/.test(y));
}
// ---------- Runtime environment readiness ----------
const runtimeSignal=['DATABASE_URL','TIKTOK_CLIENT_KEY','TIKTOK_CLIENT_SECRET','CFS_LAUNCHER_API_KEY','CFS_TOKEN_ENCRYPTION_KEY'].some(name=>String(process.env[name]||'').trim());
if(!externalOnly&&(runtimeSignal||strictEnv)){
  const doctor=runtimeDoctor(process.env);
  add('runtime','config_doctor','Production environment passes runtime doctor',doctor.ready,doctor.blocking.length?doctor.blocking.join(', '):`${doctor.passed}/${doctor.total}`);
  if(process.env.DATABASE_URL){
    try{
      const db=databaseRuntimeSecurity({databaseUrl:process.env.DATABASE_URL,nodeEnv:'production'});
      add('runtime','database_transport','Database transport policy accepted',true,`${db.hostname} · ${db.transport}`);
    }catch(error){add('runtime','database_transport','Database transport policy accepted',false,safeDetail(error));}
  }else add('runtime','database_transport','Database transport policy accepted',false,'DATABASE_URL missing');
}else{
  const reason=externalOnly?'skipped by --external-only; Render-internal secrets are intentionally not required':'not evaluated; run on Render with --strict-env';
  add('runtime','config_doctor','Production environment supplied to drill',null,reason,false);
  add('runtime','database_transport','Database transport policy supplied to drill',null,reason,false);
}
// ---------- Live deployment verification ----------
if(live){
  let dnsOk=false;
  let externalBlocked=false;
  try{const addresses=await dns.lookup(expectedHost,{all:true});dnsOk=addresses.length>0;add('live','dns','Canonical DNS resolves',dnsOk,addresses.map(a=>a.address).join(', '));}
  catch(error){
    const code=String(error?.code||'');
    if(['EAI_AGAIN','ETIMEOUT','ECONNREFUSED'].includes(code)){externalBlocked=true;blocked('live','dns','Canonical DNS verification blocked by test environment',`${code}: ${safeDetail(error)}`);}
    else add('live','dns','Canonical DNS resolves',false,`${code||'DNS'}: ${safeDetail(error)}`);
  }
  if(externalBlocked){
    blocked('live','external_suite','External HTTP/TLS suite not executed','DNS resolver in this test environment is temporarily unavailable; rerun from Render or another external network.');
  }else{
  try{
    const res=await request(`http://${expectedHost}/`);
    const loc=res.headers.get('location')||'';
    add('live','http_redirect','HTTP permanently redirects to HTTPS',res.status===301||res.status===308,`HTTP ${res.status}`);
    add('live','http_redirect_origin','HTTP redirect targets canonical origin',loc.startsWith(expectedOrigin),loc||'Location missing');
  }catch(error){add('live','http_redirect','HTTP permanently redirects to HTTPS',false,safeDetail(error));}
  try{
    const res=await request(`${expectedOrigin}/`,{redirect:'follow'});
    add('live','root_https','Production root responds over HTTPS',res.ok,`HTTP ${res.status}`);
    add('live','canonical_final','Final root origin is canonical',new URL(res.url).origin===expectedOrigin,res.url);
    add('live','hsts','HSTS header present',Boolean(res.headers.get('strict-transport-security')),res.headers.get('strict-transport-security')||'missing');
    add('live','csp','CSP header present',Boolean(res.headers.get('content-security-policy')),'content-security-policy');
    add('live','nosniff','X-Content-Type-Options nosniff',headerContains(res,'x-content-type-options','nosniff'),res.headers.get('x-content-type-options')||'missing');
    add('live','referrer','Referrer-Policy present',Boolean(res.headers.get('referrer-policy')),res.headers.get('referrer-policy')||'missing');
    add('live','permissions','Permissions-Policy present',Boolean(res.headers.get('permissions-policy')),'permissions-policy');
    add('live','powered_by','X-Powered-By absent',!res.headers.get('x-powered-by'),res.headers.get('x-powered-by')||'absent');
    add('live','request_id','X-Request-ID present',Boolean(res.headers.get('x-request-id')),res.headers.get('x-request-id')?'present':'missing');
  }catch(error){add('live','root_https','Production root responds over HTTPS',false,safeDetail(error));}
  try{
    const res=await request(`${expectedOrigin}/api/health`,{redirect:'error'});
    let body={};try{body=await res.json()}catch{}
    add('live','health_http','Render health endpoint returns 200',res.status===200,`HTTP ${res.status}`);
    add('live','health_payload','Health confirms app and database online',body?.ok===true&&body?.status==='online'&&body?.database==='connected',JSON.stringify({ok:body?.ok,status:body?.status,database:body?.database}));
    add('live','health_version','Health version matches deployed package',String(body?.version||'')===String(packageJson.version||''),String(body?.version||'missing'));
    add('live','health_schema','Health schema generation matches this release',Number(body?.schema_version)===DATABASE_SCHEMA_VERSION,String(body?.schema_version??'missing'));
    add('live','health_no_store','Health response is no-store',headerContains(res,'cache-control','no-store'),res.headers.get('cache-control')||'missing');
    add('live','health_no_cookie','Health response sets no cookies',!res.headers.get('set-cookie'),res.headers.get('set-cookie')?'unexpected Set-Cookie':'none');
  }catch(error){add('live','health_http','Render health endpoint returns 200',false,safeDetail(error));}
  try{
    const res=await request(`${expectedOrigin}/api/public/status`,{redirect:'error'});
    let body={};try{body=await res.json()}catch{}
    add('live','public_status','Public status endpoint healthy',res.status===200&&body?.ok===true&&['online','degraded'].includes(String(body?.status||'')),`HTTP ${res.status} · ${body?.status||'unknown'}`);
    add('live','public_status_no_store','Public status is no-store',headerContains(res,'cache-control','no-store'),res.headers.get('cache-control')||'missing');
  }catch(error){add('live','public_status','Public status endpoint healthy',false,safeDetail(error));}
  for(const probe of ['/.env','/.git/config','/package.json']){
    try{const res=await request(`${expectedOrigin}${probe}`,{redirect:'error'});add('live',`private_${probe.replace(/\W+/g,'_')}`,`${probe} is not publicly exposed`,[403,404].includes(res.status),`HTTP ${res.status}`);}
    catch(error){add('live',`private_${probe.replace(/\W+/g,'_')}`,`${probe} is not publicly exposed`,false,safeDetail(error));}
  }
  try{
    const res=await request(`${expectedOrigin}/api/account/login`,{method:'POST',headers:{'content-type':'application/json'},body:'{'});
    add('live','malformed_json','Malformed JSON is rejected as client error',res.status===400,`HTTP ${res.status}`);
  }catch(error){add('live','malformed_json','Malformed JSON is rejected as client error',false,safeDetail(error));}
  await new Promise(resolve=>{
    const socket=tls.connect({host:expectedHost,port:443,servername:expectedHost,rejectUnauthorized:true,timeout:10_000},()=>{
      const cert=socket.getPeerCertificate();const validTo=cert?.valid_to?new Date(cert.valid_to):null;
      add('live','tls_trust','TLS certificate is trusted',socket.authorized,socket.authorizationError||'trusted');
      add('live','tls_expiry','TLS certificate is not expired',Boolean(validTo&&validTo.getTime()>Date.now()),validTo?.toISOString()||'missing');
      socket.end();resolve();
    });
    socket.on('error',error=>{add('live','tls_trust','TLS certificate is trusted',false,safeDetail(error));resolve();});
    socket.on('timeout',()=>{add('live','tls_trust','TLS certificate is trusted',false,'timeout');socket.destroy();resolve();});
  });
  }
}else{
  add('live','external_verification','Live Render/DNS/TLS verification requested',null,'skipped; run with --live after deployment',false);
}
const blockingFails=checks.filter(c=>c.blocking&&c.ok===false);
const staticRuntimeFails=blockingFails.filter(c=>c.scope!=='live');
const liveFails=blockingFails.filter(c=>c.scope==='live');
const blockedChecks=checks.filter(c=>c.blocked);
const status=staticRuntimeFails.length?'NO_GO':live?(blockedChecks.length?'EXTERNAL_BLOCKED':liveFails.length?'LIVE_FAIL':'LIVE_PASS'):'STATIC_READY';
const report={schema:1,generated_at:new Date().toISOString(),status,target:expectedOrigin,live_requested:live,strict_env:strictEnv,external_only:externalOnly,render_git_commit:String(process.env.RENDER_GIT_COMMIT||'').trim(),render_service_id:String(process.env.RENDER_SERVICE_ID||'').trim(),summary:{passed:checks.filter(c=>c.ok===true).length,failed:blockingFails.length,skipped:checks.filter(c=>c.status==='SKIP').length,blocked:blockedChecks.length,static_runtime_failed:staticRuntimeFails.length,live_failed:liveFails.length},checks};
fs.mkdirSync(path.dirname(outFile),{recursive:true});fs.writeFileSync(outFile,JSON.stringify(report,null,2));
for(const c of checks)console.log(`${c.status.padEnd(4)}  [${c.scope}] ${c.label}${c.detail?` · ${c.detail}`:''}`);
console.log(`\nRender Production Drill: ${status}`);
console.log(`Report: ${path.relative(root,outFile)}`);
if(blockingFails.length)process.exitCode=1;
else if(blockedChecks.length)process.exitCode=2;

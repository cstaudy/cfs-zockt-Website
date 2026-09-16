import dns from 'node:dns/promises';
import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';

const rawArgs=process.argv.slice(2);
const value=name=>{const i=rawArgs.indexOf(name);return i>=0?(rawArgs[i+1]||''):''};
let positional=''; for(let i=0;i<rawArgs.length;i++){if(rawArgs[i]==='--out'){i++;continue} if(!rawArgs[i].startsWith('--')){positional=rawArgs[i];break}}
const base=new URL(positional||process.env.APP_BASE_URL||'https://cfs-zockt.de');
if(base.protocol!=='https:')throw new Error('APP_BASE_URL muss https:// verwenden.');
const host=base.hostname;
const wwwHost=host.startsWith('www.')?host:`www.${host}`;
const expectedOrigin=base.origin;
const results=[];
const push=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});

async function request(url,{redirect='manual'}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{return await fetch(url,{redirect,signal:controller.signal,headers:{'user-agent':'cfs-zockt-edge-check/2.0'}})}
  finally{clearTimeout(timer)}
}
async function resolveHost(label,name){
  try{const addresses=await dns.lookup(name,{all:true});push(`${label} DNS resolves`,addresses.length>0,addresses.map(a=>a.address).join(', '));return addresses.length>0}
  catch(error){push(`${label} DNS resolves`,false,error.message);return false}
}
await resolveHost('canonical',host);
if(wwwHost!==host)await resolveHost('www alias',wwwHost);

try{
  const httpUrl=`http://${host}${base.pathname==='/'?'':base.pathname}`;
  const res=await request(httpUrl);
  const loc=res.headers.get('location')||'';
  push('HTTP redirects permanently',res.status===301||res.status===308,`HTTP ${res.status}`);
  push('HTTP redirect targets HTTPS canonical host',loc.startsWith(expectedOrigin),loc||'kein Location Header');
}catch(error){push('HTTP redirect reachable',false,error.message)}

if(wwwHost!==host){
  try{
    const res=await request(`https://${wwwHost}/`);
    const loc=res.headers.get('location')||'';
    push('www redirects permanently to canonical',res.status===301||res.status===308,`HTTP ${res.status}`);
    push('www redirect target canonical',loc.startsWith(expectedOrigin),loc||'kein Location Header');
  }catch(error){push('www HTTPS redirect reachable',false,error.message)}
}

try{
  const res=await request(base.href,{redirect:'follow'});
  push('HTTPS responds',res.ok,`HTTP ${res.status}`);
  push('Final origin is canonical',new URL(res.url).origin===expectedOrigin,res.url);
  const h=res.headers;
  push('HSTS present',Boolean(h.get('strict-transport-security')),h.get('strict-transport-security')||'fehlt');
  push('CSP present',Boolean(h.get('content-security-policy')),h.get('content-security-policy')?'gesetzt':'fehlt');
  push('nosniff present',(h.get('x-content-type-options')||'').toLowerCase()==='nosniff',h.get('x-content-type-options')||'fehlt');
  push('Referrer-Policy present',Boolean(h.get('referrer-policy')),h.get('referrer-policy')||'fehlt');
  push('Permissions-Policy present',Boolean(h.get('permissions-policy')),h.get('permissions-policy')?'gesetzt':'fehlt');
}catch(error){push('HTTPS request reachable',false,error.message)}

for(const [name,url,needle] of [
  ['security.txt',`${expectedOrigin}/.well-known/security.txt`,'Contact:'],
  ['robots.txt',`${expectedOrigin}/robots.txt`,'Sitemap:'],
  ['sitemap.xml',`${expectedOrigin}/sitemap.xml`,'<urlset']
]){
  try{const res=await request(url,{redirect:'follow'});const text=await res.text();push(`${name} reachable`,res.ok,`HTTP ${res.status}`);push(`${name} content plausible`,text.includes(needle),needle)}
  catch(error){push(`${name} reachable`,false,error.message)}
}

await new Promise(resolve=>{
  const socket=tls.connect({host,port:443,servername:host,rejectUnauthorized:true,timeout:10000},()=>{
    const cert=socket.getPeerCertificate();
    const validTo=cert?.valid_to?new Date(cert.valid_to):null;
    push('TLS certificate trusted',socket.authorized,socket.authorizationError||'trusted');
    push('TLS certificate not expired',Boolean(validTo&&validTo.getTime()>Date.now()),validTo?.toISOString()||'kein Datum');
    socket.end();resolve();
  });
  socket.on('error',error=>{push('TLS connection',false,error.message);resolve()});
  socket.on('timeout',()=>{push('TLS connection',false,'timeout');socket.destroy();resolve()});
});

const failed=results.filter(r=>!r.ok);
const report={schema:1,generated_at:new Date().toISOString(),target:expectedOrigin,ok:failed.length===0,passed:results.length-failed.length,total:results.length,results};
const out=value('--out');
if(out){const outPath=path.resolve(out);fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(report,null,2));}
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` · ${r.detail}`:''}`);
console.log(`\n${results.length-failed.length}/${results.length} edge checks passed for ${expectedOrigin}`);
if(out)console.log(`Report: ${out}`);
if(failed.length)process.exit(1);

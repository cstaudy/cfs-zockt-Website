import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
let failed=0;
function check(name,ok,detail=''){
  console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?` · ${detail}`:''}`);
  if(!ok)failed++;
}
function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function exactMap(obj={}){return Object.fromEntries(Object.entries(obj).sort(([a],[b])=>a.localeCompare(b)))}
function verifyOne(label,dir){
  const pkgFile=path.join(dir,'package.json');
  const lockFile=path.join(dir,'package-lock.json');
  check(`${label} package-lock present`,fs.existsSync(lockFile),lockFile);
  if(!fs.existsSync(lockFile))return;
  let pkg,lock;
  try{pkg=loadJson(pkgFile);lock=loadJson(lockFile)}catch(e){check(`${label} lockfile parses`,false,e.message);return}
  check(`${label} lockfile v3+`,Number(lock.lockfileVersion)>=3,`v${lock.lockfileVersion||'?'}`);
  const top=lock.packages?.['']||{};
  check(`${label} lockfile package name`,String(top.name||'')===String(pkg.name||''),String(top.name||''));
  check(`${label} lockfile package version`,String(top.version||'')===String(pkg.version||''),String(top.version||''));
  const wantDeps=exactMap(pkg.dependencies||{}), gotDeps=exactMap(top.dependencies||{});
  check(`${label} direct dependencies locked`,JSON.stringify(wantDeps)===JSON.stringify(gotDeps));
  const wantDev=exactMap(pkg.devDependencies||{}), gotDev=exactMap(top.devDependencies||{});
  check(`${label} devDependencies locked`,JSON.stringify(wantDev)===JSON.stringify(gotDev));
  const entries=Object.keys(lock.packages||{}).filter(Boolean);
  check(`${label} transitive package tree present`,entries.length>Object.keys(wantDeps).length+Object.keys(wantDev).length,`${entries.length} package entries`);
  let bad=0;
  for(const [key,entry] of Object.entries(lock.packages||{})){
    if(!key||!entry||typeof entry!=='object')continue;
    if(key.startsWith('node_modules/') && (!entry.version || !entry.integrity))bad++;
  }
  check(`${label} registry packages carry integrity`,bad===0,bad?`${bad} entries missing version/integrity`:'ok');
}
verifyOne('backend',root);
verifyOne('launcher',path.join(root,'launcher'));
if(failed){console.error(`\n${failed} lockfile checks failed.`);process.exit(1)}
console.log('\nDependency lockfile enforcement passed.');

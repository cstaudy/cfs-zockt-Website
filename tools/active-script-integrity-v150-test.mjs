import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const scripts=pkg.scripts||{};
const roots=['release:v150','project:check','website150:check'];
const seen=new Set();
const missingScripts=[];
const missingFiles=[];

function inspectScript(name){
  if(seen.has(name)) return;
  seen.add(name);
  const cmd=scripts[name];
  if(typeof cmd!=='string'){
    missingScripts.push(name);
    return;
  }
  for(const match of cmd.matchAll(/\bnpm\s+run\s+([A-Za-z0-9_.:-]+)/g)){
    const child=match[1];
    if(!(child in scripts)) missingScripts.push(`${name} -> ${child}`);
    else inspectScript(child);
  }
  for(const match of cmd.matchAll(/\bnode\s+(?:--check\s+)?([^\s;&|]+)/g)){
    let file=match[1].replace(/^['"]|['"]$/g,'');
    if(file.startsWith('-')) continue;
    const resolved=path.resolve(root,file);
    if(!fs.existsSync(resolved)) missingFiles.push(`${name} -> ${file}`);
  }
}

for(const name of roots) inspectScript(name);

const checks=[
  ['active script roots exist',roots.every(name=>typeof scripts[name]==='string')],
  ['active npm-run graph has no missing script aliases',missingScripts.length===0],
  ['active node targets exist on disk',missingFiles.length===0],
  ['active graph includes release v149 compatibility gate',seen.has('release:v149')],
  ['active graph includes v150 hardening gate',seen.has('website150:check')],
  ['active graph includes current project regression',seen.has('project:check')]
];
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'}  ${name}`);
console.log(`Active script graph: ${seen.size} scripts inspected`);
if(missingScripts.length) console.log('Missing scripts:\n'+missingScripts.join('\n'));
if(missingFiles.length) console.log('Missing files:\n'+missingFiles.join('\n'));
if(checks.some(([,ok])=>!ok)) process.exit(1);

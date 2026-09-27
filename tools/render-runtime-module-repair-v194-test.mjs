import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const require=createRequire(import.meta.url);
const checks=[];
function check(name,ok,detail=''){checks.push({name,ok:Boolean(ok),detail});}
const modules=[
  'lib/cut-candidate-engine.js',
  'lib/cut-reference-provider.js',
  'lib/game-profile-portability.js',
  'lib/creator-cut-studio.js'
];
for(const rel of modules){
  const abs=path.join(root,rel);
  check(`file:${rel}`,fs.existsSync(abs),abs);
}
for(const rel of modules){
  try{require(path.join(root,rel));check(`require:${rel}`,true);}catch(err){check(`require:${rel}`,false,err?.stack||String(err));}
}
const creator=fs.readFileSync(path.join(root,'lib/creator-cut-studio.js'),'utf8');
check('creator requires cut-candidate-engine',creator.includes('require("./cut-candidate-engine")'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
check('package script render194:check',pkg?.scripts?.['render194:check']==='node tools/render-runtime-module-repair-v194-test.mjs');
const failed=checks.filter(x=>!x.ok);
for(const item of checks) console.log(`${item.ok?'PASS':'FAIL'} ${item.name}${item.detail?` :: ${item.detail}`:''}`);
console.log(`RESULT ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length) process.exit(1);

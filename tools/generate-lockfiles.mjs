import {spawn} from "node:child_process";
import path from "node:path";
import process from "node:process";

const root=path.resolve(process.argv[2]||'.');
const npm=process.platform==='win32'?'npm.cmd':'npm';

function run(cwd,args){
  return new Promise((resolve,reject)=>{
    const child=spawn(npm,args,{cwd,stdio:'inherit',env:{...process.env,npm_config_audit:'false',npm_config_fund:'false'}});
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(new Error(`npm ${args.join(' ')} failed in ${cwd} with exit ${code}`)));
  });
}

console.log('Generating backend package-lock.json...');
await run(root,['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund']);
console.log('Generating launcher/package-lock.json...');
await run(path.join(root,'launcher'),['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund']);
console.log('Lockfiles generated. Run npm run lockfiles:check next.');

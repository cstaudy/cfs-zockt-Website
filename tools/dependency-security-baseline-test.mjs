import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const launcher=JSON.parse(fs.readFileSync(path.join(root,'launcher/package.json'),'utf8'));
const npmrc=fs.readFileSync(path.join(root,'.npmrc'),'utf8');
const specs=[...Object.entries(pkg.dependencies||{}),...Object.entries(launcher.dependencies||{}),...Object.entries(launcher.devDependencies||{})];
let failed=0;
const checks=[
 ['Backend Node >=22',String(pkg.engines?.node||'').includes('>=22')],
 ['npm save-exact enabled',npmrc.includes('save-exact=true')],
 ['npm engine-strict enabled',npmrc.includes('engine-strict=true')],
 ['all direct dependency versions exact',specs.every(([,v])=>/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(v))],
 ['no git/http/file dependency specs',specs.every(([,v])=>!/(?:git\+|https?:|file:|github:|workspace:)/i.test(v))],
];
for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${n}`); if(!ok)failed++;}
const rootLock=fs.existsSync(path.join(root,'package-lock.json'));
const launcherLock=fs.existsSync(path.join(root,'launcher','package-lock.json'));
console.log(`${rootLock?'PASS':'WARN'}  backend transitive lockfile ${rootLock?'present':'missing; generate and commit after a trusted npm registry install'}`);
console.log(`${launcherLock?'PASS':'WARN'}  launcher transitive lockfile ${launcherLock?'present':'missing; generate and commit after a trusted npm registry install'}`);
if(failed)process.exit(1);

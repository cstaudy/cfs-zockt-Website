import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const exists=(p)=>fs.existsSync(path.join(root,p));
let pass=0, fail=0;
function check(name, ok){ if(ok){pass++; console.log(`PASS ${name}`);} else {fail++; console.error(`FAIL ${name}`);} }

const expectedRepo='cstaudy/cfs-zockt-Website';
const expectedRemote='https://github.com/cstaudy/cfs-zockt-Website.git';
const bootstrap=read('GITHUB_REPOSITORY_BOOTSTRAP_PASS21.md');
const gitignore=read('.gitignore');
const pr=read('.github/PULL_REQUEST_TEMPLATE.md');
const security=read('.github/SECURITY.md');
const pkg=JSON.parse(read('package.json'));

check('bootstrap exists', exists('GITHUB_REPOSITORY_BOOTSTRAP_PASS21.md'));
check('bootstrap current repository slug', bootstrap.includes(expectedRepo));
check('bootstrap current remote', bootstrap.includes(expectedRemote));
check('security policy exists', exists('.github/SECURITY.md'));
check('security policy discourages public vulnerability issues', /nicht als öffentliches GitHub Issue/i.test(security));
check('security policy forbids secrets in reports', /Passwörter.*Tokens.*private Schlüssel/is.test(security));
check('CODEOWNERS exists', exists('.github/CODEOWNERS'));
check('dependabot exists', exists('.github/dependabot.yml'));
check('PR template uses current project check', pr.includes('npm run project:check'));
check('PR template uses github21 check', pr.includes('npm run github21:check'));
check('Node runtime is 22+', String(pkg.engines?.node||'').includes('22'));

for(const pattern of ['node_modules/','.env','*.zip','*.exe','*.cfsbackup','backups/','reports/application-recovery-evidence.json']){
  check(`gitignore contains ${pattern}`, gitignore.includes(pattern));
}

const workflows=fs.readdirSync(path.join(root,'.github/workflows')).filter(f=>f.endsWith('.yml')||f.endsWith('.yaml'));
check('GitHub workflows present', workflows.length>=8);
for(const file of workflows){
  const text=read(`.github/workflows/${file}`);
  if(text.includes('actions/setup-node@')) check(`${file} uses Node 22`, /node-version:\s*["']?22["']?/.test(text));
}

const forbiddenExt=new Set(['.zip','.exe','.msi','.dmg','.appx','.cfsbackup']);
const skipDirs=new Set(['.git','node_modules']);
const violations=[];
const large=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skipDirs.has(ent.name)) continue;
    const full=path.join(dir,ent.name); const rel=path.relative(root,full).replaceAll('\\','/');
    if(ent.isDirectory()){ walk(full); continue; }
    const st=fs.statSync(full);
    if(st.size>50*1024*1024) large.push([rel,st.size]);
    if(forbiddenExt.has(path.extname(ent.name).toLowerCase())) violations.push(rel);
    if(/^\.env($|\.)/.test(ent.name) && ent.name!=='.env.example') violations.push(rel);
  }
}
walk(root);
check('no forbidden release/runtime artifacts in source tree', violations.length===0);
check('no source file exceeds 50 MiB', large.length===0);

const historical=read('GITHUB_BOOTSTRAP_V41.md');
check('historical bootstrap points to Pass 21', historical.includes('GITHUB_REPOSITORY_BOOTSTRAP_PASS21.md'));

console.log(`GitHub repository readiness Pass 21: ${pass}/${pass+fail}`);
if(violations.length) console.error('Forbidden:', violations.join(', '));
if(large.length) console.error('Large:', large.map(([p,s])=>`${p} (${s})`).join(', '));
if(fail) process.exit(1);

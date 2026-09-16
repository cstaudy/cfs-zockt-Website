import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.');
const args=process.argv.slice(2);
const value=name=>{const i=args.indexOf(name); return i>=0 ? (args[i+1]||'') : ''};
const out=path.resolve(root,value('--out')||'reports/release-state-snapshot.json');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const gitSha=()=>{
  if(process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try{return execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{return ''}
};
const critical=[
  'package.json','server.js','render.blueprint.example.yaml',
  '.github/workflows/production-deploy.yml',
  '.github/workflows/production-verification.yml',
  'ops/database-recovery-policy.json','ops/application-recovery-policy.json'
].filter(file=>fs.existsSync(path.join(root,file)));
const requiredSecretNames=[
  'DATABASE_URL','CFS_TOKEN_ENCRYPTION_KEY','CFS_CSRF_SIGNING_SECRET',
  'CFS_PUBLIC_REVIEW_HASH_SALT','CFS_PUBLIC_SUPPORT_HASH_SALT','CFS_MFA_RECOVERY_HASH_SALT',
  'CFS_ADMIN_ELEVATION_SECRET','CFS_ADMIN_AUDIT_HMAC_SECRET'
];
const pkg=readJson('package.json');
const launcher=readJson('launcher/package.json');
const snapshot={
  schema:1,
  generated_at:new Date().toISOString(),
  git_sha:gitSha(),
  versions:{backend:pkg.version,launcher:launcher.version,node_engine:pkg.engines?.node||''},
  canonical_origin:process.env.CFS_PRODUCTION_URL||process.env.APP_BASE_URL||'https://cfs-zockt.de',
  lockfiles:{root:fs.existsSync(path.join(root,'package-lock.json')),launcher:fs.existsSync(path.join(root,'launcher/package-lock.json'))},
  required_secrets:requiredSecretNames.map(name=>({name,configured:Boolean(process.env[name])})),
  critical_files:Object.fromEntries(critical.map(file=>[file,sha256(file)])),
  notes:'No secret values are stored. required_secrets records presence only.'
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(snapshot,null,2));
console.log(JSON.stringify({ok:true,out:path.relative(root,out),git_sha:snapshot.git_sha||null,files:critical.length,lockfiles:snapshot.lockfiles}));

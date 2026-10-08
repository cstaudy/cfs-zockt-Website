import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:'.');
const args=process.argv.slice(2),strict=args.includes('--strict'),reports=path.join(root,'reports');
const lib=require(path.join(root,'lib/beta-acceptance-v32057.js'));
const read=f=>JSON.parse(fs.readFileSync(path.join(reports,f),'utf8'));
let acceptance,preflight,evidence;
try{acceptance=read('beta-acceptance-3.20.57.json')}catch{acceptance=lib.baseline(root)}
try{preflight=read('beta-preflight-3.20.57.json')}catch{preflight={ready_for_real_acceptance:false,blockers:['preflight.missing']}}
try{evidence=read('beta-evidence-3.20.57.json')}catch{evidence={files:[]}}
const evalA=lib.evaluate(root,acceptance),refs=new Set((evidence.files||[]).map(f=>f.file));
const missingEvidence=evalA.records.filter(r=>r.status==='pass'&&r.reference.startsWith('evidence/')&&!refs.has(r.reference)).map(r=>r.id);
const ready=evalA.ready&&preflight.ready_for_real_acceptance&&missingEvidence.length===0;
const out={version:'3.20.57',status:ready?'READY_FOR_MANUAL_GO_NO_GO':'HOLD',automatic_go:false,acceptance:{resolved:evalA.resolved,total:evalA.total,blockers:evalA.blockers},preflight:{ready:!!preflight.ready_for_real_acceptance,blockers:preflight.blockers||[]},evidence:{files:(evidence.files||[]).length,missing_references:missingEvidence},generated_at:new Date().toISOString()};
fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,'beta-go-no-go-3.20.57.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));if(strict&&!ready)process.exitCode=2;

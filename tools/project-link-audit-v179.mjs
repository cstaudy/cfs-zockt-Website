import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const pub=path.join(root,'public');
const htmls=[];
const walk=d=>{for(const ent of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,ent.name); if(ent.isDirectory()) walk(p); else if(p.endsWith('.html')) htmls.push(p)}}; walk(pub);
let checks=0; const missing=[];
const attrs=/\b(?:href|src)=["']([^"']+)["']/gi;
for(const file of htmls){const text=fs.readFileSync(file,'utf8'); let m; while((m=attrs.exec(text))){let u=m[1]; if(!u.startsWith('/')||u.startsWith('//')||u.startsWith('/api/')||u.startsWith('/auth/')||u.startsWith('/.well-known/')) continue; u=u.split('#')[0].split('?')[0]; if(!u||u==='/') continue; checks++; let target=path.join(pub,u.replace(/^\//,'')); if(u.endsWith('/')) target=path.join(target,'index.html'); if(!fs.existsSync(target)) missing.push(`${path.relative(root,file)} -> ${u}`); }}
console.log(`Project Link Audit v179: ${checks} lokale Referenzen geprüft`);
if(missing.length){for(const x of missing) console.error('MISSING',x); process.exit(1)}
console.log('Project Link Audit v179: PASS');

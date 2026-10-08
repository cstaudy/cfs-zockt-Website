'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname),manifest=JSON.parse(fs.readFileSync(path.join(root,'update-manifest.json'),'utf8'));
const args=process.argv.slice(2),mode=args[0],target=args[1]&&path.resolve(args[1]);
if(!['--check','--apply'].includes(mode)||!target){console.error('Aufruf: node install-update.cjs --check /pfad/zur/website\n        node install-update.cjs --apply /pfad/zur/website');process.exit(2);}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function contained(base,rel){const dest=path.resolve(base,rel);if(dest!==base&&!dest.startsWith(base+path.sep))throw Error('Ungültiger Paketpfad: '+rel);return dest;}
function checkLinks(dest){let p=dest;while(true){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw Error('Symbolischer Link im Zielpfad: '+p);if(p===target)break;const next=path.dirname(p);if(next===p)break;p=next;}}
let changes=[];
try{
 const pkgPath=path.join(target,'package.json');if(!fs.existsSync(pkgPath))throw Error('package.json fehlt im Zielordner.');
 const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));if(pkg.name!=='cfs-zockt-creator-suite-web')throw Error('Der Zielordner enthält nicht die CFS Creator Suite.');
 if(![manifest.from_release,manifest.release].includes(String(pkg.version)))throw Error('Dieses Delta erwartet '+manifest.from_release+' oder '+manifest.release+'; gefunden wurde '+pkg.version+'.');
 for(const entry of manifest.files){const source=contained(path.join(root,'files'),entry.path),dest=contained(target,entry.path);checkLinks(dest);const content=fs.readFileSync(source);if(sha(content)!==entry.sha256)throw Error('Beschädigte Paketdatei: '+entry.path);let old=null;if(fs.existsSync(dest)){if(!fs.statSync(dest).isFile())throw Error('Ziel ist keine Datei: '+entry.path);old=fs.readFileSync(dest);const hash=sha(old);if(hash===entry.sha256)continue;if(!entry.accepted_previous_sha256.includes(hash))throw Error('Eigene/abweichende Änderung in '+entry.path+'. Nichts wurde überschrieben. Diese Datei manuell zusammenführen.');}else if(!entry.may_be_absent)throw Error('Erwartete Ausgangsdatei fehlt: '+entry.path);changes.push({entry,dest,content,old});}
 if(mode==='--check'){console.log('Prüfung erfolgreich. '+changes.length+' Dateien können aktualisiert werden. Keine Änderungen vorgenommen.');process.exit(0);}
 if(!changes.length){console.log('Version '+manifest.release+' ist bereits vollständig installiert.');process.exit(0);}
 const backup=path.join(target,'update-backups','cfs-'+manifest.release+'-'+Date.now());fs.mkdirSync(backup,{recursive:true});for(const item of changes){if(item.old!==null){const file=contained(backup,item.entry.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,item.old);}}
 fs.writeFileSync(path.join(backup,'backup-manifest.json'),JSON.stringify({release:manifest.release,new_files:changes.filter(x=>x.old===null).map(x=>x.entry.path),replaced_files:changes.filter(x=>x.old!==null).map(x=>x.entry.path)},null,2));
 const written=[];try{for(const item of changes){fs.mkdirSync(path.dirname(item.dest),{recursive:true});written.push(item);fs.writeFileSync(item.dest,item.content);}}catch(error){for(const item of written.reverse()){if(item.old===null){if(fs.existsSync(item.dest))fs.unlinkSync(item.dest);}else fs.writeFileSync(item.dest,item.old);}throw Error('Schreibfehler; bereits geänderte Dateien zurückgesetzt: '+error.message);}
 console.log('Update '+manifest.release+' eingebaut: '+changes.length+' Dateien.\nDateisicherung: '+backup+'\nDanach npm run check:v32058 ausführen.');
}catch(error){console.error('Update abgebrochen: '+error.message);process.exit(1);}

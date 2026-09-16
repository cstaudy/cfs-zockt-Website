import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {RecoveryManager}=require("../src/recovery-manager.js");

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-recovery-"));
const settings=path.join(dir,"settings.json");
const spool=path.join(dir,"queue","pending-events.json");
fs.mkdirSync(path.dirname(spool),{recursive:true});
fs.writeFileSync(settings,JSON.stringify({value:"before",bridgeTokenEncrypted:"encrypted-local"}));
fs.writeFileSync(spool,JSON.stringify({items:[{event_key:"e1",event_type:"follow"}]}));
const manager=new RecoveryManager({rootDir:path.join(dir,"recovery"),settingsPath:settings,spoolPath:spool,logger:{info(){},warn(){}},maxPoints:3});
const point=manager.create("manual-test","0.16.0");
fs.writeFileSync(settings,JSON.stringify({value:"after"}));
fs.writeFileSync(spool,JSON.stringify({items:[]}));
const verified=manager.verify(point.id);
if(!verified.ok)throw new Error("Restore point verification failed");
manager.restore(point.id);
const restored=JSON.parse(fs.readFileSync(settings,"utf8"));
const restoredSpool=JSON.parse(fs.readFileSync(spool,"utf8"));
if(restored.value!=="before"||restored.bridgeTokenEncrypted!=="encrypted-local")throw new Error("Settings restore failed");
if(restoredSpool.items?.length!==1)throw new Error("Spool restore failed");

console.log(JSON.stringify({ok:true,id:point.id,points:manager.list().length}));

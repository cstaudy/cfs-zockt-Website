import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {createBackup,parseBackup}=require("../src/config-backup.js");

const settings={
  backendUrl:"https://cfs-zockt.de",machineName:"Gaming-PC",provider:"tiktool",
  tiktokUsername:"creator",ttsEnabled:true,ttsRate:1.1,ttsPitch:.9,ttsVolume:.8,
  autoStart:true,startMinimized:false,autoUpdate:true,updateChannel:"stable",
  autoRecoverLive:true,tokenStored:true,tiktoolKeyStored:true,
  bridgeTokenEncrypted:"MUST_NOT_EXPORT",tiktoolApiKeyEncrypted:"MUST_NOT_EXPORT"
};
const backup=createBackup(settings,"0.16.0");
const text=JSON.stringify(backup);
if(text.includes("MUST_NOT_EXPORT")||text.includes("bridgeTokenEncrypted"))throw new Error("Secret leaked into portable backup");
if(backup.secrets_included!==false)throw new Error("Backup secret flag wrong");
const parsed=parseBackup(text);
if(parsed.config.machineName!=="Gaming-PC"||parsed.config.provider!=="tiktool")throw new Error("Backup roundtrip failed");

const tampered=JSON.parse(text);tampered.config.machineName="Hacked";
let blocked=false;try{parseBackup(tampered)}catch{blocked=true}
if(!blocked)throw new Error("Tampered backup was accepted");

console.log(JSON.stringify({ok:true,fields:Object.keys(parsed.config).length,checksum:parsed.checksum.slice(0,12)}));

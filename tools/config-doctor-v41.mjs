import fs from "node:fs";import path from "node:path";import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {runtimeDoctor,githubProductionDoctor,githubWindowsDoctor}=require("../lib/config-doctor.js");
const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]||"":""};
const profile=value("--profile")||"runtime",out=value("--out")||"";
const fn=profile==="github-production"?githubProductionDoctor:profile==="github-windows"?githubWindowsDoctor:runtimeDoctor;
const report={schema:1,profile,generated_at:new Date().toISOString(),...fn(process.env)};
const payload=JSON.stringify(report,null,2);
if(out){const file=path.resolve(out);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,payload,"utf8")}
console.log(JSON.stringify({ok:report.ready,profile,passed:report.passed,total:report.total,blocking:report.blocking,out:out||null}));
if(!report.ready)process.exitCode=2;

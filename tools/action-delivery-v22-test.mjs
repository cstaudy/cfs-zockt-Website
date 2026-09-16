import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const {ACTION_LEASE_SECONDS,ACTION_MAX_ATTEMPTS,retryDecision}=require("../lib/live-action-delivery.js");
const must=(v,m)=>{if(!v)throw new Error(m)};
must(ACTION_LEASE_SECONDS>=30,"lease too short");
must(ACTION_MAX_ATTEMPTS>=3,"retry cap too low");
must(retryDecision({attempts:1,expiresAt:new Date(Date.now()+60000).toISOString()}).retry,"retry should be scheduled");
must(!retryDecision({attempts:ACTION_MAX_ATTEMPTS,expiresAt:new Date(Date.now()+60000).toISOString()}).retry,"max attempts should expire");
must(!retryDecision({attempts:1,expiresAt:new Date(Date.now()-1000).toISOString()}).retry,"expired action should not retry");

const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
for(const token of [
  "FOR UPDATE SKIP LOCKED",
  "lease_until",
  "attempts=action.attempts+1",
  '"/api/bridge/widget-studio/actions/nack"',
  "status='expired'"
]) must(server.includes(token),`leasing SQL missing ${token}`);
console.log(JSON.stringify({ok:true,lease_seconds:ACTION_LEASE_SECONDS,max_attempts:ACTION_MAX_ATTEMPTS}));

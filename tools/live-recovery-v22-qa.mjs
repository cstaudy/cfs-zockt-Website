import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const {canResumeSessionRow,releasePolicyAllowsLive,buildResumedLiveState}=require("../lib/live-session-recovery.js");
const must=(v,m)=>{if(!v)throw new Error(m)};

const now=Date.now();
const session={id:"11111111-1111-4111-8111-111111111111",status:"live",likes:100,shares:7,gifts_count:3,gifts_value:250,followers_gained:4,started_at:new Date(now-3600000).toISOString(),updated_at:new Date(now-1000).toISOString()};
must(canResumeSessionRow(session,{now}).ok,"live session should resume");
must(!canResumeSessionRow({...session,status:"ended"},{now}).ok,"ended session must not resume");

const current={session_id:session.id,likes:156,viewers:22,shares:9,gifts_count:4,gifts_value:333,followers_gained:6,started_at:session.started_at,last_event_at:new Date(now-500).toISOString()};
const resumed=buildResumedLiveState(session,current);
must(resumed.likes===156&&resumed.viewers===22&&resumed.gifts_value===333,"same-session metrics were reset");

must(releasePolicyAllowsLive({live_allowed:true,update_required:false,version_blocked:false,safety:{maintenance:{active:false}}}).ok,"safe policy blocked");
must(!releasePolicyAllowsLive({live_allowed:false,safety:{maintenance:{active:true}}}).ok,"maintenance allowed");

const server=fs.readFileSync(path.join(root,"server.js"),"utf8");
for(const token of [
  '"/api/bridge/widget-studio/session/resume"',
  "dry_run",
  "buildResumedLiveState",
  "releasePolicyAllowsLive",
  "live_session_active:true"
]) must(server.includes(token),`server missing ${token}`);

console.log(JSON.stringify({ok:true,session_id:resumed.session_id,likes:resumed.likes,viewers:resumed.viewers}));

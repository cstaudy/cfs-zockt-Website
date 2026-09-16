import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||"."),read=p=>fs.readFileSync(path.join(root,p),"utf8"),fail=m=>{console.error("FAIL:",m);process.exitCode=1},ok=m=>console.log("OK:",m);
const s=read("server.js"),h=read("public/pages/widget-studio.html"),j=read("public/assets/js/widget-studio.js"),r=read("public/widgets/studio.html");
for(const x of ["creator_live_sessions","creator_interaction_rules","creator_live_actions","processStudioInteractionEvent","cleanupStudioLiveHistory","studioProviderRegistryPublic","follower_gain_goal","/api/bridge/widget-studio/actions"])s.includes(x)?ok(x):fail(x+" missing");
for(const x of ["wsWidgetSort","wsInteractionsModal","wsOfflineBehavior","wsLastSessionTitle"])h.includes(x)?ok(x):fail(x+" missing");
for(const x of ["openInteractionsModal","dashboardSort","offlineBehavior","LIVE DATA OFFLINE","interactionLabel"])j.includes(x)?ok(x):fail(x+" missing");
for(const x of ["offlineBehavior","liveOffline","behavior===\"hide\""])r.includes(x)?ok("runtime "+x):fail("runtime "+x+" missing");
const types=[...s.matchAll(/^    ([a-z_]+): \{/gm)].map(m=>m[1]);new Set(types).size>=19?ok("widget registry >=19"):fail("widget registry too small");
for(const v of ["dashboard","create","editor"]){const c=(h.match(new RegExp(`data-view=\\"${v}\\"`,"g"))||[]).length;c===1?ok(v+" view"):fail(v+" view count "+c)}
if(!process.exitCode)console.log("V8 static QA passed.");

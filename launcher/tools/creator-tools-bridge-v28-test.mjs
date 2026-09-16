import fs from "node:fs";import os from "node:os";import path from "node:path";import {createRequire} from "node:module";import {createFakeBridge} from "./support/fake-bridge.mjs";
const require=createRequire(import.meta.url),{BridgeClient}=require("../src/bridge-client.js"),{EventSpool}=require("../src/event-spool.js");
const fake=await createFakeBridge(),dir=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-tools-v28-"));
try{
 const c=new BridgeClient({settings:{backendUrl:fake.url,machineName:"tools-pc",provider:"mock",updateChannel:"beta"},token:fake.token,logger:{info(){},warn(){},error(){}},version:"0.28.0",spool:new EventSpool(path.join(dir,"events.json"),{info(){},warn(){}},100)});
 await c.connect();
 const lib=await c.fetchLibrary();if(!lib.game||lib.cut_projects.length!==1||!lib.widgets.some(w=>w.id==="game_runtime"))throw new Error("library");
 let g=(await c.gameStart()).runtime;if(g.status!=="running")throw new Error("start");
 g=(await c.gameScore("a",1)).runtime;if(g.state.score_a!==1)throw new Error("score");
 g=(await c.gameReset()).runtime;if(g.state.score_a!==0)throw new Error("reset");
 g=(await c.gameStop()).runtime;if(g.status!=="idle")throw new Error("stop");
 const cuts=await c.cutProjects();if(cuts.projects[0].id!=="cut-1")throw new Error("cuts");
 console.log(JSON.stringify({ok:true,game:g.status,cut_projects:cuts.projects.length,scene_game_layer:true}));
}finally{await fake.close()}
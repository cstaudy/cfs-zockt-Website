import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {createFakeBridge} from "./support/fake-bridge.mjs";

const require=createRequire(import.meta.url);
const {BridgeClient}=require("../src/bridge-client.js");

const launcherRoot=path.resolve(import.meta.dirname,"..");
const projectRoot=path.resolve(launcherRoot,"..");
const bridgeSource=fs.readFileSync(path.join(launcherRoot,"src/bridge-client.js"),"utf8");
const serverSource=fs.readFileSync(path.join(projectRoot,"server.js"),"utf8");

for(const symbol of ["getStreamBot()","saveStreamBot(streamBot = {})","controlWidget(widgetId, control = {})"]){
  if(!bridgeSource.includes(symbol))throw new Error(`BridgeClient symbol missing: ${symbol}`);
}
for(const route of [
  "/api/bridge/widget-studio/stream-bot",
  "/api/bridge/widget-studio/widgets/:id/control"
]){
  if(!serverSource.includes(route))throw new Error(`Backend bridge route missing: ${route}`);
}

const fake=await createFakeBridge();
const logger={info(){},warn(){},error(){}};
const client=new BridgeClient({settings:{backendUrl:fake.url,machineName:"POST-V42",provider:"mock"},token:fake.token,logger,version:"0.42.0"});
try{
  const botConfig={enabled:true,prefix:"!",commands:[{command:"discord",enabled:true,response:"Discord",response_mode:"both",cooldown_seconds:10}]};
  await client.saveStreamBot(botConfig);
  const bot=await client.getStreamBot();
  if(!bot?.stream_bot?.enabled||bot.stream_bot.commands?.length!==1)throw new Error("Stream Bot bridge round-trip failed");

  const counter=await client.controlWidget("wins-widget",{action:"increment",amount:3});
  if(counter.value!==5)throw new Error(`Counter bridge control failed: ${counter.value}`);

  const timer=await client.controlWidget("timer-widget",{action:"toggle"});
  if(timer.value!==90||timer.running!==true)throw new Error("Timer bridge control failed");

  const scenes=await client.fetchScenes();
  if(!Array.isArray(scenes)||scenes.length!==1)throw new Error("Scene bridge fetch failed");

  console.log(JSON.stringify({ok:true,stream_bot:true,widget_control:true,scenes:true}));
}finally{
  client.stop();
  await fake.close();
}

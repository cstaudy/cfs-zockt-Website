import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {createFakeBridge} from "./support/fake-bridge.mjs";

const require=createRequire(import.meta.url);
const {BridgeClient}=require("../src/bridge-client.js");
const {EventSpool}=require("../src/event-spool.js");
const {executeStreamDeckAction}=require("../src/stream-deck-actions.js");

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const logger={info(){},warn(){},error(){}};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"cfs-part2-"));
const spoolPath=path.join(tmp,"events.json");
const fake=await createFakeBridge({latencyMs:8});

try{
  const settings={backendUrl:fake.url,machineName:"PART2-PC",provider:"mock"};
  let client=new BridgeClient({settings,token:fake.token,logger,version:"0.42.0",spool:new EventSpool(spoolPath,logger,1000)});
  client.start();
  await client.connect();
  await client.startSession({provider:"mock"});

  // Creator-scoped bot config must round-trip through the same authenticated bridge.
  const botConfig={enabled:true,prefix:"!",commands:[
    {command:"discord",enabled:true,response:"Discord kommt gleich",response_mode:"both",cooldown_seconds:15},
    {command:"wins",enabled:true,response:"Aktueller Win Counter",response_mode:"overlay",cooldown_seconds:5}
  ]};
  await client.saveStreamBot(botConfig);
  const bot=await client.getStreamBot();
  if(!bot?.stream_bot?.enabled||bot.stream_bot.commands.length!==2)throw new Error("Stream Bot config round-trip failed");

  // Simulate a real network interruption while all six LIVE event families arrive.
  fake.setOnline(false);
  const events=[
    {event_key:"part2-follow",event_type:"follow",actor_name:"Follower",amount:1,payload:{}},
    {event_key:"part2-like",event_type:"like",actor_name:"Liker",amount:9,payload:{total_likes:90}},
    {event_key:"part2-gift",event_type:"gift",actor_name:"Gifter",amount:2,value:2,payload:{gift_name:"Rose",repeat_count:2}},
    {event_key:"part2-share",event_type:"share",actor_name:"Sharer",amount:1,payload:{}},
    {event_key:"part2-viewer",event_type:"viewer_update",amount:88,payload:{}},
    {event_key:"part2-chat",event_type:"chat",actor_name:"Chatter",amount:1,payload:{message:"!discord"}}
  ];
  events.forEach(event=>client.enqueueEvent(event));
  await client.flushEvents();
  if(client.eventQueue.length!==events.length)throw new Error(`Offline queue lost events: ${client.eventQueue.length}/${events.length}`);
  if(!fs.existsSync(spoolPath)||new EventSpool(spoolPath,logger,1000).all().length!==events.length)throw new Error("Offline spool persistence failed");

  // Controlled restart while still offline: queue must survive process replacement.
  await client.waitForFlushIdle(1500);
  client.stop();
  client=new BridgeClient({settings,token:fake.token,logger,version:"0.42.0",spool:new EventSpool(spoolPath,logger,1000)});
  client.start();
  if(client.eventQueue.length!==events.length)throw new Error("Restart did not restore spooled events");

  // Network comes back; resume the same cloud session and drain exactly once.
  fake.setOnline(true);
  await client.connect();
  await client.resumeSession();
  const drained=await client.drainEvents(5000);
  if(!drained.ok)throw new Error(`Queue did not drain after reconnect: ${drained.remaining}`);
  if(fake.state.receivedEvents.length!==events.length)throw new Error(`Expected ${events.length} accepted events, got ${fake.state.receivedEvents.length}`);
  if(fake.state.duplicateKeys.length)throw new Error(`Duplicate events after reconnect: ${fake.state.duplicateKeys.join(",")}`);

  // Stream Bot TTS action must be leased/polled and ACKed once.
  fake.pushAction({id:"part2-tts",type:"tts",text:"Discord kommt gleich"});
  const actions=[];
  client.on("action",action=>actions.push(action));
  await client.pollActions();
  if(actions.length!==1||actions[0].id!=="part2-tts")throw new Error("Bot/TTS action polling failed");
  await client.ackActions([actions[0].id]);
  if(fake.state.ackedActions.filter(id=>id==="part2-tts").length!==1)throw new Error("Bot/TTS action ACK failed");

  // Use the exact Stream Deck action executor for real counter/timer control paths.
  const ctx={controlWidget:(id,control)=>client.controlWidget(id,control)};
  await executeStreamDeckAction({action:"counter_plus_1",target:"wins-widget"},ctx);
  await executeStreamDeckAction({action:"counter_plus_5",target:"wins-widget"},ctx);
  await executeStreamDeckAction({action:"counter_minus_1",target:"wins-widget"},ctx);
  if(fake.state.widgetControls["wins-widget"].value!==7)throw new Error("Counter deck controls produced wrong value");
  await executeStreamDeckAction({action:"counter_reset",target:"wins-widget"},ctx);
  if(fake.state.widgetControls["wins-widget"].value!==0)throw new Error("Counter reset failed");

  await executeStreamDeckAction({action:"timer_toggle",target:"timer-widget"},ctx);
  if(!fake.state.widgetControls["timer-widget"].running)throw new Error("Timer start/toggle failed");
  await executeStreamDeckAction({action:"timer_plus_60",target:"timer-widget"},ctx);
  await executeStreamDeckAction({action:"timer_minus_60",target:"timer-widget"},ctx);
  if(fake.state.widgetControls["timer-widget"].value!==90)throw new Error("Timer +/- controls produced wrong value");
  await executeStreamDeckAction({action:"timer_reset",target:"timer-widget"},ctx);
  if(fake.state.widgetControls["timer-widget"].value!==0||fake.state.widgetControls["timer-widget"].running)throw new Error("Timer reset failed");

  await client.endSession({reason:"part2_acceptance_complete"});
  client.stop();

  console.log(JSON.stringify({
    ok:true,
    live_event_types:6,
    offline_spool:true,
    restart_recovery:true,
    reconnect_exactly_once:true,
    bot_config:true,
    bot_tts_action:true,
    counter_controls:true,
    timer_controls:true,
    accepted_events:fake.state.receivedEvents.length
  }));
}finally{
  await fake.close();
  fs.rmSync(tmp,{recursive:true,force:true});
}

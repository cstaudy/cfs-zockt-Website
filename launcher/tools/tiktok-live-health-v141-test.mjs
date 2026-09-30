import {EventEmitter} from "node:events";
import {createRequire} from "node:module";
import Module from "node:module";

const require=createRequire(import.meta.url);
const originalLoad=Module._load;
function assert(value,message){if(!value)throw new Error(message)}

class FakeTikTokLive extends EventEmitter{
  constructor(username,options={}){super();this.username=username;this.options=options;this.connected=false;}
  async connect(){this.connected=true;this.emit("connected");return true;}
  async disconnect(){this.connected=false;this.emit("disconnected");return true;}
}

Module._load=function(request,parent,isMain){
  if(request==="tiktok-live-api")return {TikTokLive:FakeTikTokLive};
  return originalLoad.call(this,request,parent,isMain);
};

try{
  const {TikToolProvider}=require("../src/providers/tiktool-provider.js");
  const provider=new TikToolProvider({info(){},warn(){},error(){}});
  const events=[]; provider.on("event",event=>events.push(event));
  let info=await provider.start({username:"@cfs_zockt",apiKey:"v141-test-provider-key"});
  assert(info.connected===true&&info.status==="connected","TikTok LIVE provider did not expose connected health");
  assert(info.reconnectManaged===true,"TikTok reconnect ownership missing");
  assert(info.thirdParty===true&&info.official===false,"TikTool must stay explicitly marked as third-party/non-official");
  assert(info.metrics.connectAttempts===1,"TikTok connect attempt metric missing");
  assert(Boolean(info.lastConnectedAt),"TikTok connected timestamp missing");

  provider.client.emit("chat",{msgId:"health-chat",comment:"v141 health event",user:{uniqueId:"tester"}});
  info=provider.info();
  assert(info.metrics.events===1&&Boolean(info.lastEventAt),"TikTok event health metadata missing");
  assert(events[0]?.event_type==="chat","TikTok normalized event path regressed");

  provider.client.connected=false;
  provider.client.emit("disconnected");
  info=provider.info();
  assert(info.status==="reconnecting"&&Boolean(info.lastDisconnectedAt),"TikTok reconnect health state missing");
  provider.client.connected=true;
  provider.client.emit("connected");
  assert(provider.info().status==="connected","TikTok reconnect recovery state missing");

  await provider.stop();
  info=provider.info();
  assert(info.status==="idle"&&info.connected===false,"TikTok stop health state incorrect");
  console.log(JSON.stringify({ok:true,status:info.status,events:info.metrics.events,reconnectManaged:info.reconnectManaged,official:info.official}));
}finally{
  Module._load=originalLoad;
}

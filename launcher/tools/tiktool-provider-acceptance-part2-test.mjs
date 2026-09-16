import {EventEmitter} from "node:events";
import {createRequire} from "node:module";
import Module from "node:module";

const require=createRequire(import.meta.url);
const originalLoad=Module._load;

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
  const events=[];
  const states=[];
  provider.on("event",event=>events.push(event));
  provider.on("state",state=>states.push(state));

  const info=await provider.start({username:"@CFS_Test",apiKey:"part2-test-key"});
  if(!info.connected||info.username!=="CFS_Test")throw new Error("TikTool start/username normalization failed");
  for(const capability of ["follow","like","gift","share","viewer_update","chat"]){
    if(!info.capabilities.includes(capability))throw new Error(`TikTool capability missing: ${capability}`);
  }

  provider.client.emit("follow",{msgId:"f-1",user:{uniqueId:"Follower",avatarUrl:"https://example.test/f.png"}});
  provider.client.emit("like",{msgId:"l-1",likeCount:7,totalLikes:77,user:{uniqueId:"Liker"}});
  provider.client.emit("share",{msgId:"s-1",user:{nickname:"Sharer"}});
  provider.client.emit("chat",{msgId:"c-1",comment:"!discord\n<script>alert(1)</script>",user:{uniqueId:"Chatter"}});
  provider.client.emit("roomUserSeq",{msgId:"v-1",viewerCount:123});
  provider.emitGift({msgId:"g-1",giftName:"Rose",giftId:"5655",repeatCount:3,diamondCount:1,user:{uniqueId:"Gifter"}});

  const types=events.map(event=>event.event_type);
  for(const type of ["follow","like","gift","share","viewer_update","chat"]){
    if(!types.includes(type))throw new Error(`Normalized TikTool event missing: ${type}`);
  }
  const chat=events.find(event=>event.event_type==="chat");
  if(chat.payload.message.includes("\n"))throw new Error("Chat normalization kept newline");
  if(chat.payload.message.length>280)throw new Error("Chat normalization exceeded 280 chars");
  if(chat.actor_name!=="Chatter")throw new Error("Chat actor normalization failed");
  const like=events.find(event=>event.event_type==="like");
  if(like.amount!==7||like.payload.total_likes!==77)throw new Error("Like normalization failed");
  const viewer=events.find(event=>event.event_type==="viewer_update");
  if(viewer.amount!==123)throw new Error("Viewer normalization failed");
  const gift=events.find(event=>event.event_type==="gift");
  if(gift.amount!==3||gift.value!==3||gift.payload.gift_name!=="Rose")throw new Error("Gift normalization failed");

  await provider.stop();
  if(provider.info().connected)throw new Error("TikTool stop failed");
  if(!states.some(state=>state.connected===true)||!states.some(state=>state.connected===false))throw new Error("TikTool connection states missing");

  console.log(JSON.stringify({ok:true,provider:"tiktool",events:events.length,types:[...new Set(types)].sort(),chat_normalized:true,connect_disconnect:true}));
}finally{
  Module._load=originalLoad;
}

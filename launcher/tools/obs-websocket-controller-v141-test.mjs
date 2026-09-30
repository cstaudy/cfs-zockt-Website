import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {ObsWebSocketController,normalizeObsWebSocketUrl,computeObsAuthentication,ALLOWED_REQUESTS}=require("../src/obs-websocket-controller.js");

function assert(value,message){if(!value)throw new Error(message)}

class FakeWebSocket extends EventEmitter{
  static instances=[];
  constructor(url){super();this.url=url;this.sent=[];this.closed=false;FakeWebSocket.instances.push(this);queueMicrotask(()=>this.emit("message",{data:JSON.stringify({op:0,d:{rpcVersion:1,authentication:{salt:"salt",challenge:"challenge"}}})}))}
  addEventListener(name,fn){this.on(name,fn)}
  send(raw){const msg=JSON.parse(raw);this.sent.push(msg);if(msg.op===1){queueMicrotask(()=>this.emit("message",{data:JSON.stringify({op:2,d:{negotiatedRpcVersion:1}})}));return}if(msg.op!==6)return;const type=msg.d.requestType;let responseData={};if(type==="GetVersion")responseData={obsVersion:"31.0.0",obsWebSocketVersion:"5.6.0"};if(type==="GetInputList")responseData={inputs:[{inputName:"CFS Overlay",inputUuid:"i1",inputKind:"browser_source"},{inputName:"Mic",inputUuid:"i2",inputKind:"wasapi_input_capture"}]};if(type==="GetSceneList")responseData={scenes:[{sceneName:"Starting",sceneUuid:"s1"},{sceneName:"Gameplay",sceneUuid:"s2"}]};if(type==="GetCurrentProgramScene")responseData={sceneName:"Starting",sceneUuid:"s1"};if(type==="GetInputSettings")responseData={inputKind:"browser_source",inputSettings:{url:"https://example.test/old"}};queueMicrotask(()=>this.emit("message",{data:JSON.stringify({op:7,d:{requestType:type,requestId:msg.d.requestId,requestStatus:{result:true,code:100},responseData}})}))}
  close(code=1000,reason=""){this.closed=true;queueMicrotask(()=>this.emit("close",{code,reason}))}
}

assert(normalizeObsWebSocketUrl("ws://127.0.0.1")==="ws://127.0.0.1:4455","localhost default port normalization failed");
let remoteBlocked=false;try{normalizeObsWebSocketUrl("ws://192.168.1.10:4455")}catch{remoteBlocked=true}assert(remoteBlocked,"remote plaintext OBS websocket must be blocked");
assert(normalizeObsWebSocketUrl("wss://obs.example.test:4455")==="wss://obs.example.test:4455","wss URL normalization failed");
const secret=crypto.createHash("sha256").update("passwordsalt").digest("base64");
const expected=crypto.createHash("sha256").update(secret+"challenge").digest("base64");
assert(computeObsAuthentication("password","salt","challenge")===expected,"OBS authentication algorithm mismatch");
assert(!ALLOWED_REQUESTS.has("StartStream"),"dangerous OBS request unexpectedly allowed");

const controller=new ObsWebSocketController({WebSocketImpl:FakeWebSocket,reconnect:false});
const password="super-secret-v141";
await controller.connect({url:"ws://127.0.0.1:4455",password});
await new Promise(resolve=>setTimeout(resolve,10));
let snap=controller.snapshot();
assert(snap.connected,"controller did not connect");
assert(snap.scenes.length===2&&snap.browserSources.length===1,"OBS inventory refresh failed");
assert(snap.currentScene==="Starting","current scene missing");
assert(!JSON.stringify(snap).includes(password),"password value leaked into public snapshot");

await controller.switchScene("Gameplay");
snap=controller.snapshot();
assert(snap.currentScene==="Gameplay","scene switch did not update state");
const update=await controller.updateBrowserSource("CFS Overlay","https://cfs-zockt.de/widgets/studio.html#token=secret-value");
assert(!update.url.includes("secret-value"),"browser source token leaked from result");
const socket=FakeWebSocket.instances.at(-1);
const setInput=socket.sent.find(item=>item?.d?.requestType==="SetInputSettings");
assert(setInput?.d?.requestData?.inputSettings?.url?.includes("#token=secret-value"),"browser source URL was not sent to OBS");
let denied=false;try{await controller.request("StartStream")}catch{denied=true}assert(denied,"request allowlist not enforced");
await controller.disconnect({forget:true});
console.log(JSON.stringify({ok:true,scenes:snap.scenes.length,browserSources:snap.browserSources.length,allowedRequests:ALLOWED_REQUESTS.size}));

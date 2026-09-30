import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ObsWebSocketController,ALLOWED_REQUESTS}=require('../src/obs-websocket-controller.js');
function assert(v,m){if(!v)throw new Error(m)}
class FakeWebSocket extends EventEmitter{
  static last=null;
  constructor(url){super();this.url=url;this.sent=[];FakeWebSocket.last=this;queueMicrotask(()=>this.emit('message',{data:JSON.stringify({op:0,d:{rpcVersion:1}})}))}
  addEventListener(n,fn){this.on(n,fn)}
  send(raw){const msg=JSON.parse(raw);this.sent.push(msg);if(msg.op===1){queueMicrotask(()=>this.emit('message',{data:JSON.stringify({op:2,d:{negotiatedRpcVersion:1}})}));return}if(msg.op!==6)return;let responseData={};const t=msg.d.requestType;if(t==='GetVersion')responseData={obsVersion:'31.0.0',obsWebSocketVersion:'5.6.0'};if(t==='GetSceneList')responseData={scenes:[{sceneName:'Gameplay',sceneUuid:'s1'}]};if(t==='GetCurrentProgramScene')responseData={sceneName:'Gameplay'};if(t==='GetInputList')responseData={inputs:[]};queueMicrotask(()=>this.emit('message',{data:JSON.stringify({op:7,d:{requestId:msg.d.requestId,requestStatus:{result:true,code:100},responseData}})}))}
  close(code=1000,reason=''){queueMicrotask(()=>this.emit('close',{code,reason}))}
}
assert(ALLOWED_REQUESTS.has('CreateInput'),'CreateInput must be explicitly allowlisted');
assert(!ALLOWED_REQUESTS.has('StartStream'),'StartStream must remain blocked');
const c=new ObsWebSocketController({WebSocketImpl:FakeWebSocket,reconnect:false});
await c.connect({url:'ws://127.0.0.1:4455'});
await new Promise(r=>setTimeout(r,10));
const result=await c.installBrowserSource({inputName:'cfs_zockt · Test · abc123',url:'https://cfs-zockt.de/widgets/studio.html#token=private-token-v142',width:640,height:180});
assert(result.ok===true&&result.created===true,'browser source was not created');
assert(result.sceneName==='Gameplay','current OBS scene was not used');
assert(!JSON.stringify(result).includes('private-token-v142'),'public result leaked widget token');
const create=FakeWebSocket.last.sent.find(row=>row?.d?.requestType==='CreateInput');
assert(create,'CreateInput request missing');
assert(create.d.requestData.sceneName==='Gameplay','CreateInput scene mismatch');
assert(create.d.requestData.inputKind==='browser_source','CreateInput kind mismatch');
assert(create.d.requestData.inputSettings.width===640&&create.d.requestData.inputSettings.height===180,'browser source dimensions missing');
assert(create.d.requestData.inputSettings.url.includes('#token=private-token-v142'),'OBS did not receive full private source URL');
await c.disconnect({forget:true});
console.log(JSON.stringify({ok:true,feature:'one_click_obs_widget_install',scene:'Gameplay',allowlist:ALLOWED_REQUESTS.size}));

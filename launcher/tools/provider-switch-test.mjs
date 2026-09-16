import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {ProviderManager}=require("../src/provider-manager.js");
const log=[];
class FakeProvider extends EventEmitter{
  constructor(key,delay){super();this.key=key;this.delay=delay}
  info(){return{key:this.key,ready:true}}
  async start(){log.push(`start:${this.key}`);return this.info()}
  async stop(){log.push(`stop-begin:${this.key}`);await new Promise(r=>setTimeout(r,this.delay));log.push(`stop-end:${this.key}`)}
}
const manager=new ProviderManager({},{factories:{mock:()=>new FakeProvider("mock",30),tiktool:()=>new FakeProvider("tiktool",10)}});
await manager.use("mock");
const a=manager.use("tiktool");
const b=manager.use("mock");
await Promise.all([a,b]);
const firstStopEnd=log.indexOf("stop-end:mock"),secondStopBegin=log.indexOf("stop-begin:tiktool");
if(firstStopEnd<0||secondStopBegin<0||secondStopBegin<firstStopEnd)throw new Error(`provider switches overlapped: ${log.join(",")}`);
if(manager.info().key!=="mock")throw new Error("final provider wrong");
console.log(JSON.stringify({ok:true,sequence:log}));

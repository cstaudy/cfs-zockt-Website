import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const source=fs.readFileSync(path.join(root,"public/assets/js/cfs-widget-runtime.js"),"utf8");

const listeners={};
const audio={contexts:0,oscillators:0,starts:0,stops:0,gains:0,resume:0};
class FakeParam{
  setValueAtTime(){}
  exponentialRampToValueAtTime(){}
}
class FakeGain{
  constructor(){audio.gains++;this.gain=new FakeParam();}
  connect(){}
}
class FakeOscillator{
  constructor(){audio.oscillators++;this.frequency=new FakeParam();this.type="sine";}
  connect(){}
  start(){audio.starts++;}
  stop(){audio.stops++;}
}
class FakeAudioContext{
  constructor(){audio.contexts++;this.currentTime=1;this.destination={};this.state="suspended";}
  createGain(){return new FakeGain();}
  createOscillator(){return new FakeOscillator();}
  resume(){audio.resume++;this.state="running";return Promise.resolve();}
}

const stage={innerHTML:""};
const scene={};
let mounts=0;
const renderer={
  OUTPUT_PROFILES:{obs:{}},
  esc:value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"),
  runtimeData:()=>({current:1,goal:10}),
  mountScene(){mounts++;}
};
const payload={
  widget:{definition:{mode:"alert",event_type:"follow",source_kind:"live_bridge"},config:{settings:{alertSound:"cfs_pop",alertVolume:.55,alertDurationMs:1800},elements:[]}},
  data:{live:{connected:true,stale:false}},
  events:[]
};

const context={
  window:{
    CFSWidgetRenderer:renderer,
    AudioContext:FakeAudioContext,
    addEventListener(type,handler){listeners[type]=handler;}
  },
  document:{
    body:{dataset:{defaultProfile:"obs"}},
    getElementById(id){return id==="cfsScene"?scene:stage;},
    addEventListener(){}
  },
  location:{hash:"#token=part2-test"},
  URLSearchParams,
  fetch:async()=>({ok:true,json:async()=>payload}),
  setInterval(){return 1;},
  clearInterval(){},
  setTimeout(){return 1;},
  clearTimeout(){},
  console,
  Date,
  Math,
  Promise
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:"cfs-widget-runtime.js"});

await new Promise(resolve=>setImmediate(resolve));
if(typeof listeners.message!=="function")throw new Error("Widget runtime message listener missing");
listeners.message({data:{type:"cfs:test-event",event:{id:"test-follow",event_type:"follow",actor_name:"Tester",payload:{test:true}}}});
await new Promise(resolve=>setImmediate(resolve));

if(audio.contexts!==1)throw new Error(`Expected one AudioContext, got ${audio.contexts}`);
if(audio.starts<2||audio.oscillators<2)throw new Error("Alert sound did not synthesize expected tones");
if(audio.resume<1)throw new Error("Suspended AudioContext was not resumed");
if(mounts<1)throw new Error("Alert preview was not rendered");

// "off" must remain a valid silent option in the source and every public preset must be recognized.
for(const preset of ["off","cfs_pop","chime","pulse","success","soft_bell"]){
  if(!source.includes(`\"${preset}\"`))throw new Error(`Alert sound preset missing: ${preset}`);
}

console.log(JSON.stringify({ok:true,audio_context:true,test_alert_rendered:true,tone_starts:audio.starts,presets:6}));

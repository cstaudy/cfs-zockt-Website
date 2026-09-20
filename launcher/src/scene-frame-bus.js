"use strict";

const { EventEmitter } = require("node:events");

function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback}
function safeText(value,max=180){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function even(value,fallback){const n=clamp(value,2,7680,fallback);return n%2===0?n:n-1}
function frameSizeFor(width,height,pixelFormat="yuv420p"){
  const w=even(width,1920),h=even(height,1080),fmt=String(pixelFormat||"yuv420p").toLowerCase();
  if(fmt!=="yuv420p")throw new Error("Scene Frame Bus unterstützt aktuell nur yuv420p.");
  return Math.round(w*h*3/2);
}
function blackFrame(width,height,pixelFormat="yuv420p"){
  const w=even(width,1920),h=even(height,1080),size=frameSizeFor(w,h,pixelFormat),ySize=w*h;
  const frame=Buffer.alloc(size,128);frame.fill(16,0,ySize);return frame;
}

class SceneFrameBusManager extends EventEmitter{
  constructor({logger=null,now=()=>Date.now()}={}){
    super();this.logger=logger;this.now=now;this.buses=new Map();this.sequence=0;
  }

  ensureBus(spec={}){
    const key=safeText(spec.key,160);if(!key)throw new Error("Scene Frame Bus Key fehlt.");
    const width=even(spec.width,1920),height=even(spec.height,1080),fps=clamp(spec.fps,1,60,60),pixelFormat=String(spec.pixelFormat||"yuv420p").toLowerCase();
    const frameSize=frameSizeFor(width,height,pixelFormat);
    let bus=this.buses.get(key);
    if(bus&&(bus.width!==width||bus.height!==height||bus.fps!==fps||bus.pixelFormat!==pixelFormat)){
      if(bus.subscribers.size)throw new Error(`Scene Frame Bus ${key} kann während aktiver Ausgänge nicht in Größe/FPS geändert werden.`);
      this.destroyBus(key);bus=null;
    }
    if(!bus){
      bus={key,width,height,fps,pixelFormat,frameSize,latestFrame:blackFrame(width,height,pixelFormat),subscribers:new Set(),timer:null,activeProducer:null,pendingProducer:null,metrics:{framesIn:0,framesOut:0,droppedWrites:0,switches:0,producerErrors:0,lastFrameAt:0,lastSwitchAt:0}};
      this.buses.set(key,bus);this.startTicker(bus);
    }
    return bus;
  }

  startTicker(bus){
    if(bus.timer)return;
    const intervalMs=Math.max(16,Math.round(1000/bus.fps));
    bus.timer=setInterval(()=>{
      const frame=bus.latestFrame;
      for(const sub of [...bus.subscribers]){
        if(sub.closed||sub.blocked||sub.writable?.destroyed||sub.writable?.writableEnded)continue;
        try{if(sub.writable.write(frame)===false)sub.blocked=true;else bus.metrics.framesOut+=1}catch{this.detachSubscriber(bus,sub)}
      }
    },intervalMs);bus.timer.unref?.();
  }

  currentFrame(key){const bus=this.buses.get(String(key||""));if(!bus)throw new Error("Scene Frame Bus ist nicht vorbereitet.");return Buffer.from(bus.latestFrame)}

  attach(key,writable){
    const bus=this.buses.get(String(key||""));if(!bus)throw new Error("Scene Frame Bus ist nicht vorbereitet.");
    if(!writable||typeof writable.write!=="function")throw new Error("FFmpeg Scene-Video-Pipe fehlt.");
    const sub={writable,blocked:false,closed:false,onDrain:null,onClose:null};
    sub.onDrain=()=>{sub.blocked=false};sub.onClose=()=>this.detachSubscriber(bus,sub);
    writable.on?.("drain",sub.onDrain);writable.on?.("close",sub.onClose);writable.on?.("error",sub.onClose);
    bus.subscribers.add(sub);
    try{if(writable.write(bus.latestFrame)===false)sub.blocked=true}catch{this.detachSubscriber(bus,sub)}
    return()=>this.detachSubscriber(bus,sub);
  }

  detachSubscriber(bus,sub){
    if(!sub||sub.closed)return;sub.closed=true;bus?.subscribers?.delete(sub);
    try{sub.writable?.off?.("drain",sub.onDrain);sub.writable?.off?.("close",sub.onClose);sub.writable?.off?.("error",sub.onClose)}catch{}
    try{sub.writable?.end?.()}catch{}
  }

  stageProducer(key,child,{detachers=[],autoCommit=false,timeoutMs=8000,label=""}={}){
    const bus=this.buses.get(String(key||""));if(!bus)throw new Error("Scene Frame Bus ist nicht vorbereitet.");
    if(!child?.stdout||typeof child.stdout.on!=="function")throw new Error("Scene-Compositor besitzt keinen lesbaren Video-Ausgang.");
    if(bus.pendingProducer)this.abortPending(key,"superseded");
    const id=`producer_${++this.sequence}`,producer={id,key:bus.key,label:safeText(label,120),child,detachers:Array.isArray(detachers)?detachers:[],buffer:Buffer.alloc(0),latestFrame:null,ready:false,activated:false,closed:false,settled:false,timeout:null,resolve:null,reject:null,onData:null,onClose:null,onError:null};
    bus.pendingProducer=producer;
    const ready=new Promise((resolve,reject)=>{producer.resolve=resolve;producer.reject=reject});
    const settleReady=()=>{if(producer.settled)return;producer.settled=true;clearTimeout(producer.timeout);producer.resolve({key:bus.key,producerId:id,label:producer.label})};
    const fail=error=>{if(producer.closed)return;bus.metrics.producerErrors+=1;if(!producer.settled){producer.settled=true;clearTimeout(producer.timeout);producer.reject(error instanceof Error?error:new Error(String(error||"Scene-Compositor Fehler")))}if(bus.pendingProducer===producer)bus.pendingProducer=null;this.stopProducer(producer,false)};
    const acceptFrame=frame=>{
      producer.latestFrame=frame;producer.ready=true;bus.metrics.framesIn+=1;bus.metrics.lastFrameAt=this.now();
      if(autoCommit&&!producer.activated)this.commitProducer(bus.key,id);
      else if(producer.activated)bus.latestFrame=frame;
      settleReady();
    };
    producer.onData=chunk=>{
      if(producer.closed)return;const data=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);producer.buffer=producer.buffer.length?Buffer.concat([producer.buffer,data]):Buffer.from(data);
      while(producer.buffer.length>=bus.frameSize){const frame=Buffer.from(producer.buffer.subarray(0,bus.frameSize));producer.buffer=producer.buffer.subarray(bus.frameSize);acceptFrame(frame)}
      if(producer.buffer.length>bus.frameSize*2)producer.buffer=producer.buffer.subarray(producer.buffer.length-bus.frameSize);
    };
    producer.onClose=code=>{if(!producer.activated&&bus.pendingProducer===producer)fail(new Error(`Scene-Compositor endete vor dem ersten Frame${Number.isInteger(code)?` (Code ${code})`:""}.`));else{if(bus.activeProducer===producer){bus.activeProducer=null;this.emit("producer-lost",{key:bus.key,producerId:producer.id,label:producer.label,code:Number.isInteger(code)?code:null,at:this.now()})}this.stopProducer(producer,false)}};
    producer.onError=error=>fail(new Error(`Scene-Compositor Fehler: ${safeText(error?.message||error,220)}`));
    child.stdout.on("data",producer.onData);child.once?.("close",producer.onClose);child.once?.("error",producer.onError);
    producer.timeout=setTimeout(()=>fail(new Error("Scene-Compositor lieferte innerhalb des Timeouts keinen Frame.")),clamp(timeoutMs,1000,30000,8000));producer.timeout.unref?.();
    return{producerId:id,ready};
  }

  commitProducer(key,producerId){
    const bus=this.buses.get(String(key||""));if(!bus)throw new Error("Scene Frame Bus fehlt.");
    const producer=bus.pendingProducer;if(!producer||producer.id!==String(producerId||""))throw new Error("Vorbereiteter Scene-Compositor ist nicht mehr aktuell.");
    if(!producer.ready||!Buffer.isBuffer(producer.latestFrame))throw new Error("Vorbereiteter Scene-Compositor besitzt noch keinen Frame.");
    const old=bus.activeProducer;bus.pendingProducer=null;producer.activated=true;bus.activeProducer=producer;bus.latestFrame=producer.latestFrame;bus.metrics.switches+=1;bus.metrics.lastSwitchAt=this.now();
    if(old&&old!==producer)this.stopProducer(old,true);
    this.emit("switch",{key:bus.key,producerId:producer.id,label:producer.label,at:bus.metrics.lastSwitchAt});
    return this.snapshotBus(bus);
  }

  abortPending(key,reason="aborted"){
    const bus=this.buses.get(String(key||""));const producer=bus?.pendingProducer;if(!producer)return false;bus.pendingProducer=null;
    if(!producer.settled){producer.settled=true;clearTimeout(producer.timeout);producer.reject(new Error(`Scene-Compositor Vorbereitung abgebrochen: ${safeText(reason,120)}`))}
    this.stopProducer(producer,true);return true;
  }

  stopProducer(producer,kill=true){
    if(!producer||producer.closed)return;producer.closed=true;clearTimeout(producer.timeout);
    try{producer.child?.stdout?.off?.("data",producer.onData)}catch{}
    try{producer.child?.off?.("close",producer.onClose);producer.child?.off?.("error",producer.onError)}catch{}
    for(const detach of producer.detachers.splice(0))try{detach?.()}catch{}
    if(kill){try{producer.child?.kill?.("SIGTERM")}catch{}}
    producer.buffer=Buffer.alloc(0);
  }

  destroyBus(key){
    const bus=this.buses.get(String(key||""));if(!bus)return;
    clearInterval(bus.timer);if(bus.pendingProducer)this.stopProducer(bus.pendingProducer,true);if(bus.activeProducer)this.stopProducer(bus.activeProducer,true);
    for(const sub of [...bus.subscribers])this.detachSubscriber(bus,sub);this.buses.delete(bus.key);
  }

  releaseAll(){for(const key of [...this.buses.keys()])this.destroyBus(key)}

  snapshotBus(bus){return{key:bus.key,width:bus.width,height:bus.height,fps:bus.fps,pixelFormat:bus.pixelFormat,subscribers:bus.subscribers.size,activeProducer:bus.activeProducer?{id:bus.activeProducer.id,label:bus.activeProducer.label}:null,pendingProducer:bus.pendingProducer?{id:bus.pendingProducer.id,label:bus.pendingProducer.label,ready:bus.pendingProducer.ready}:null,metrics:{...bus.metrics}}}
  snapshot(){return{schema:1,buses:[...this.buses.values()].map(bus=>this.snapshotBus(bus))}}
}

module.exports={SceneFrameBusManager,frameSizeFor,blackFrame};

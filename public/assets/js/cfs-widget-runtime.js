(()=>{"use strict";
const renderer=window.CFSWidgetRenderer;
const scene=document.getElementById("cfsScene");
const stage=document.getElementById("cfsWidgetStage");
const params=new URLSearchParams(location.hash.slice(1));
const token=params.get("token")||"";
const requested=params.get("profile")||document.body.dataset.defaultProfile||"obs";
const profile=renderer?.OUTPUT_PROFILES?.[requested]?requested:"obs";

let firstRender=true;
let previousValue=null;
let seen=new Set();
let queue=[];
let showing=false;
let initializedEvents=false;
let lastLatestId=null;
let localTestUntil=0;
let localTestTimer=null;
let alertAudioContext=null;
function playAlertSound(settings={}){
  const preset=String(settings.alertSound||"off");
  if(preset==="off"||!["cfs_pop","chime","pulse","success","soft_bell"].includes(preset))return;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    const ctx=alertAudioContext||(alertAudioContext=new Ctx());if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    const now=ctx.currentTime,master=ctx.createGain(),volume=Math.max(0,Math.min(1,Number(settings.alertVolume??.7)));master.gain.setValueAtTime(volume,now);master.connect(ctx.destination);
    const tone=(freq,start,duration,type="sine",gain=.18,endFreq=null)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now+start);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),now+start+duration);g.gain.setValueAtTime(.0001,now+start);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),now+start+.015);g.gain.exponentialRampToValueAtTime(.0001,now+start+duration);o.connect(g);g.connect(master);o.start(now+start);o.stop(now+start+duration+.03)};
    if(preset==="cfs_pop"){tone(420,0,.11,"triangle",.24,780);tone(820,.08,.13,"sine",.12,1080)}
    else if(preset==="chime"){tone(660,0,.28,"sine",.16);tone(880,.09,.34,"sine",.13);tone(1320,.18,.38,"sine",.09)}
    else if(preset==="pulse"){tone(180,0,.12,"square",.12,260);tone(260,.14,.12,"square",.11,360);tone(360,.28,.16,"triangle",.1,520)}
    else if(preset==="success"){tone(523.25,0,.18,"sine",.14);tone(659.25,.12,.2,"sine",.14);tone(783.99,.24,.32,"sine",.16)}
    else if(preset==="soft_bell"){tone(740,0,.48,"sine",.13);tone(1110,.025,.58,"sine",.07);tone(1480,.05,.68,"sine",.035)}
  }catch{}
}

function clear(){stage.innerHTML=""}
function error(message){stage.innerHTML=`<div class="cfs-runtime-error">${renderer.esc(message)}</div>`}

async function loadOnce(){
  if(!token){error("Widget Token fehlt.");return null}
  const response=await fetch("/api/widgets/studio/"+encodeURIComponent(token),{cache:"no-store"});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload.error||"Widget konnte nicht geladen werden.");
  return payload;
}
function draw(payload,event=null,changed=false,enter=true){
  const config=payload.widget.config;
  const data=renderer.runtimeData(payload,event);
  renderer.mountScene({scene,stage,config,data,profile,animate:enter,changed,prefix:"cfs-render"});
  return data;
}
function enqueue(events){
  for(const event of [...events].reverse()){
    if(!seen.has(event.id)){seen.add(event.id);queue.push(event)}
  }
  runQueue();
}
function runQueue(){
  if(showing||!queue.length)return;
  showing=true;
  const item=queue.shift();
  loadOnce().then(payload=>{
    if(!payload)return;
    playAlertSound(payload.widget.config.settings||{});
    draw(payload,item,false,true);
    const ms=Math.max(1000,Math.min(20000,Number(payload.widget.config.settings?.alertDurationMs||4500)));
    setTimeout(()=>{clear();showing=false;setTimeout(runQueue,180)},ms);
  }).catch(()=>{showing=false;runQueue()});
}
async function tick(){
  if(Date.now()<localTestUntil)return;
  try{
    const payload=await loadOnce();
    if(!payload)return;
    const definition=payload.widget.definition||{};
    const mode=definition.mode||"counter";
    const behavior=payload.widget.config.settings?.offlineBehavior||"hold";
    const liveOffline=definition.source_kind==="live_bridge"&&(!payload.data?.live?.connected||payload.data?.live?.stale);
    const events=Array.isArray(payload.events)?payload.events:[];

    if(liveOffline&&behavior==="hide"){clear();return}

    if(mode==="chat"){
      const latestId=events[0]?.id||null;
      const changed=lastLatestId!==null&&latestId!==lastLatestId;
      lastLatestId=latestId;
      draw(payload,null,changed,changed||firstRender);
      firstRender=false;
      return;
    }

    if(mode==="alert"){
      if(!initializedEvents){
        events.forEach(event=>seen.add(event.id));
        initializedEvents=true;
        clear();
      }else enqueue(events);
      return;
    }

    if(mode==="latest"){
      const latest=events[0]||null;
      if(!latest){clear();return}
      const timeout=Math.max(0,Number(payload.widget.config.settings?.latestTimeoutMs||0));
      if(timeout&&latest.created_at&&Date.now()-new Date(latest.created_at).getTime()>timeout){clear();return}
      const changed=lastLatestId!==null&&latest.id!==lastLatestId;
      lastLatestId=latest.id;
      draw(payload,latest,changed,changed||firstRender);
      firstRender=false;
      return;
    }

    const data=renderer.runtimeData(payload);
    if(mode==="goal_alert"){
      if(previousValue===null){
        previousValue=data.current;
        clear();
        firstRender=false;
        return;
      }
      const crossed=previousValue<data.goal&&data.current>=data.goal;
      previousValue=data.current;
      if(crossed&&!showing){
        showing=true;
        playAlertSound(payload.widget.config.settings||{});
        draw(payload,null,false,true);
        const ms=Math.max(1000,Math.min(20000,Number(payload.widget.config.settings?.alertDurationMs||6000)));
        setTimeout(()=>{clear();showing=false},ms);
      }
      return;
    }

    const changed=previousValue!==null&&previousValue!==data.current;
    draw(payload,null,changed,firstRender);
    previousValue=data.current;
    firstRender=false;
  }catch(err){
    if(firstRender)error(err.message);
  }
}

async function showLocalTestEvent(event){
  try{
    const payload=await loadOnce();
    if(!payload)return;
    const definition=payload.widget?.definition||{};
    const mode=definition.mode||"counter";
    const expected=String(definition.event_type||"");
    const actual=String(event?.event_type||"");
    if(expected&&expected!==actual)return;
    if(!["alert","latest"].includes(mode))return;

    clearTimeout(localTestTimer);
    showing=true;
    localTestUntil=Date.now()+Math.max(1200,Math.min(12000,Number(payload.widget.config.settings?.alertDurationMs||4500)));
    playAlertSound(payload.widget.config.settings||{});
    draw(payload,{...event,payload:{...(event?.payload||{}),test:true}},false,true);
    localTestTimer=setTimeout(()=>{
      showing=false;
      localTestUntil=0;
      clear();
      tick();
    },Math.max(1200,localTestUntil-Date.now()));
  }catch{}
}

window.addEventListener("message",event=>{
  const data=event?.data||{};
  if(data.type==="cfs:test-event"&&data.event)showLocalTestEvent(data.event);
});

tick();
setInterval(tick,1000);
window.addEventListener("online",tick);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
window.CFSWidgetRuntime={profile,tick};
})();
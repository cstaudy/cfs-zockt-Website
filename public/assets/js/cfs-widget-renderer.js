(function(root,factory){
"use strict";
const api=factory();
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(root)root.CFSWidgetRenderer=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";

const OUTPUT_PROFILES=Object.freeze({
  obs:{
    key:"obs",label:"OBS Widget",kind:"intrinsic"
  },
  tiktok_vertical:{
    key:"tiktok_vertical",label:"TikTok Vertical",kind:"scene",width:1080,height:1920
  },
  landscape:{
    key:"landscape",label:"Landscape 16:9",kind:"scene",width:1920,height:1080
  }
});

const ANCHORS=new Set([
  "top-left","top-center","top-right",
  "center-left","center","center-right",
  "bottom-left","bottom-center","bottom-right"
]);

function esc(value){
  return String(value??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
function fmt(value){
  return Number(value||0).toLocaleString("de-DE");
}
function formatTimer(seconds){
  const total=Math.max(0,Math.floor(Number(seconds)||0));
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;
  return h>0
    ?`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
    :`${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function clamp(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function eventLabel(type){
  return {follow:"Follow",gift:"Gift",share:"Share",chat:"Chat"}[type]||"LIVE Event";
}
function metric(metricKey,data){
  const [group,key]=String(metricKey||"").split(".");
  return Number(data?.[group]?.[key]||0);
}
function runtimeData(payload={},event=null){
  const config=payload.widget?.config||payload.config||{};
  const definition=payload.widget?.definition||payload.definition||{};
  const snapshot=payload.data||payload.snapshot||{profile:{},live:{},bridge:{}};
  const profile=snapshot.profile||{};
  const live=snapshot.live||{};
  const bridge=snapshot.bridge||payload.bridge||{};
  const e=event||{};
  const sourceKind=definition.source_kind||"";
  const staticMode=sourceKind==="static";
  const manualCounterMode=definition.mode==="manual_counter";
  const manualTimerMode=definition.mode==="manual_timer";
  const manualMode=manualCounterMode||manualTimerMode||sourceKind==="manual";
  const liveTimerMode=definition.mode==="timer";
  const offline=sourceKind==="live_bridge"&&(!live.connected||live.stale);
  const behavior=config.settings?.offlineBehavior||"hold";

  let raw=0;
  if(manualTimerMode){
    const base=Math.max(0,Number(config.settings?.manualTimerSeconds||0));
    const running=Boolean(config.settings?.manualTimerRunning);
    const updated=config.settings?.manualTimerUpdatedAt?new Date(config.settings.manualTimerUpdatedAt).getTime():0;
    const elapsed=running&&Number.isFinite(updated)&&updated>0
      ?Math.max(0,Math.floor((Date.now()-updated)/1000))
      :0;
    raw=Math.min(359999,base+elapsed);
  }else if(manualCounterMode||sourceKind==="manual"){
    raw=Math.max(0,Number(config.settings?.manualValue||0));
  }else if(liveTimerMode){
    const started=live.started_at?new Date(live.started_at).getTime():0;
    if(Number.isFinite(started)&&started>0){
      const freshness=Math.max(
        live.last_event_at?new Date(live.last_event_at).getTime():0,
        live.bridge_heartbeat_at?new Date(live.bridge_heartbeat_at).getTime():0,
        live.updated_at?new Date(live.updated_at).getTime():0
      );
      const end=offline&&behavior==="hold"
        ?(Number.isFinite(freshness)&&freshness>0?Math.min(Date.now(),Math.max(started,freshness)):started)
        :Date.now();
      raw=Math.max(0,Math.floor((end-started)/1000));
    }
  }else if(!staticMode){
    raw=metric(config.data?.metric||definition.metric||"",snapshot);
  }

  const current=offline&&behavior==="zero"?0:raw;
  const goal=Math.max(1,Number(config.settings?.goal||definition.default_goal||1));
  const recentEvents=Array.isArray(payload.events)?payload.events:[];
  const chatTimeout=Math.max(0,Number(config.settings?.chatMessageTimeoutMs||0));
  const now=Date.now();
  const chatMessages=recentEvents
    .filter(item=>String(item?.event_type||"")==="chat")
    .filter(item=>!chatTimeout||!item?.created_at||now-new Date(item.created_at).getTime()<=chatTimeout)
    .map(item=>({
      id:String(item.id||""),
      actor:String(item.actor_name||"Viewer"),
      avatar:String(item.actor_avatar||""),
      message:String(item.payload?.message||"").slice(0,280),
      isBot:item.payload?.is_bot===true,
      createdAt:item.created_at||null
    }));

  return {
    current,
    goal,
    remaining:Math.max(0,goal-current),
    percent:Math.max(0,Math.min(100,Math.round(current/goal*100))),
    offline,
    offlineBehavior:behavior,
    avatar:(staticMode||sourceKind==="manual")?"":(profile.avatar_url||payload.tiktok?.avatar_url||""),
    displayName:staticMode?"Creator":sourceKind==="manual"?(payload.creator?.display_name||"Creator"):(profile.display_name||payload.creator?.display_name||"Creator"),
    profileFollowers:(staticMode||sourceKind==="manual")?0:Number(profile.followers||payload.tiktok?.follower_count||0),
    profileLikes:(staticMode||sourceKind==="manual")?0:Number(profile.likes_total||payload.tiktok?.likes_count||0),
    status:staticMode
      ?"OBS OVERLAY"
      :manualTimerMode
        ?(config.settings?.manualTimerRunning?"LÄUFT":"PAUSE")
        :manualMode
          ?"MANUELL"
          :sourceKind==="profile"
            ?(profile.connected?"PROFIL":"OFFLINE")
            :sourceKind==="hybrid"
              ?"CREATOR SUITE"
              :(live.connected&&!live.stale
                ?(live.provider==="simulator"?"SIMULATOR":"LIVE")
                :(bridge.online?"BRIDGE READY":"OFFLINE / STALE")),
    timer:formatTimer(current),
    actor:staticMode?"Creator":(e.actor_name||"Creator"),
    actorAvatar:staticMode?"":(e.actor_avatar||""),
    gift:staticMode?"Gift":(e.payload?.gift_name||"Gift"),
    amount:staticMode?0:Number(e.amount||1),
    eventValue:staticMode?0:Number(e.value||0),
    event:staticMode?"":eventLabel(e.event_type),
    message:staticMode?"":(e.payload?.message||""),
    eventType:staticMode?"":(e.event_type||""),
    eventId:staticMode?"":(e.id||""),
    eventCreatedAt:staticMode?null:(e.created_at||null),
    chatMessages:offline&&behavior==="zero"?[]:chatMessages
  };
}
function text(value,data){
  return String(value??"")
    .replaceAll("{{current}}",fmt(data.current))
    .replaceAll("{{target}}",fmt(data.goal))
    .replaceAll("{{remaining}}",fmt(data.remaining))
    .replaceAll("{{percent}}",String(data.percent))
    .replaceAll("{{timer}}",String(data.timer||formatTimer(data.current)))
    .replaceAll("{{displayName}}",String(data.displayName||"Creator"))
    .replaceAll("{{profileFollowers}}",fmt(data.profileFollowers))
    .replaceAll("{{profileLikes}}",fmt(data.profileLikes))
    .replaceAll("{{status}}",String(data.status||""))
    .replaceAll("{{actor}}",String(data.actor||"Creator"))
    .replaceAll("{{gift}}",String(data.gift||"Gift"))
    .replaceAll("{{amount}}",fmt(data.amount||0))
    .replaceAll("{{value}}",fmt(data.eventValue||0))
    .replaceAll("{{event}}",String(data.event||"LIVE Event"))
    .replaceAll("{{message}}",String(data.message||""));
}
function effectStyle(element,isText=false){
  const s=element.style||{},parts=[];
  const sb=Number(s.shadowBlur||0),sx=Number(s.shadowX||0),sy=Number(s.shadowY||0),gb=Number(s.glowBlur||0);
  if(sb>0)parts.push(`${sx}px ${sy}px ${sb}px ${s.shadowColor||"rgba(0,0,0,.35)"}`);
  if(gb>0)parts.push(`0 0 ${gb}px ${s.glowColor||"#148cff"}`);
  return parts.length?`${isText?"text-shadow":"box-shadow"}:${parts.join(",")};`:"";
}
function frameStyle(element){
  const s=element.style||{};
  return `background:${esc(s.backgroundColor||"transparent")};padding:${Math.max(0,Number(s.padding||0))}px;border-radius:${Math.max(0,Number(s.borderRadius||0))}px;border:${Math.max(0,Number(s.borderWidth||0))}px ${esc(s.borderStyle||"solid")} ${esc(s.borderColor||"transparent")};${effectStyle(element,false)}`;
}
function gradient(style={},fallback="#148cff"){
  return style.gradientEnabled
    ?`linear-gradient(${Math.round(Number(style.gradientAngle||90))}deg,${style.gradientFrom||fallback},${style.gradientTo||"#20d4e6"})`
    :(fallback||"transparent");
}
function animationClass(element,animate,prefix){
  if(!animate||element.animation?.enabled===false)return"";
  const enter=["fade","pop","slide-up"].includes(element.animation?.enter)?element.animation.enter:"none";
  return enter==="none"?"":` ${prefix}-enter-${enter}`;
}
function animationVars(element){
  return `--cfs-anim-duration:${Math.max(100,Number(element.animation?.durationMs||500))}ms;`;
}
function imageMaskStyle(style={}){
  const mask=String(style.imageMask||"none");
  if(mask==="hex")return"clip-path:polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%);";
  if(mask==="diamond")return"clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);";
  if(mask==="circle")return"clip-path:circle(50% at 50% 50%);";
  return"";
}
function imageFilterStyle(style={}){
  const brightness=clamp(style.brightness,0,300,100),contrast=clamp(style.contrast,0,300,100),saturation=clamp(style.saturation,0,300,100),grayscale=clamp(style.grayscale,0,100,0),blur=clamp(style.blur,0,40,0);
  return `filter:brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) blur(${blur}px);`;
}
function renderElement(element,data,{prefix="cfs-render",animate=false,changed=false}={}){
  const p=element.position||{x:0,y:0},s=element.size||{width:100,height:30};
  const base=`left:${Number(p.x||0)}px;top:${Number(p.y||0)}px;width:${Number(s.width||100)}px;height:${Number(s.height||30)}px;transform:rotate(${Number(element.rotation||0)}deg);opacity:${element.opacity??1};z-index:${Number(element.zIndex||0)};${animationVars(element)}`;
  let cls=animationClass(element,animate,prefix);
  const change=element.animation?.enabled!==false&&["pulse","glow"].includes(element.animation?.change)?element.animation.change:"none";
  if(changed&&change!=="none")cls+=` ${prefix}-change-${change}`;

  if(element.type==="chat"){
    const st=element.style||{},cfg=element.data||{};
    const max=Math.max(1,Math.min(12,Number(cfg.maxMessages||6)));
    const rows=(Array.isArray(data.chatMessages)?data.chatMessages:[]).slice(0,max);
    const ordered=cfg.newestAtBottom===false?rows:[...rows].reverse();
    const avatarSize=Math.max(18,Math.min(96,Number(st.avatarSize||38)));
    const body=ordered.length?ordered.map(item=>{
      const time=item.createdAt?new Date(item.createdAt):null;
      const timeText=cfg.showTimestamp&&time&&!Number.isNaN(time.getTime())?`<time>${esc(time.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}))}</time>`:"";
      const avatar=cfg.showAvatar!==false&&item.avatar?`<img src="${esc(item.avatar)}" alt="" style="width:${avatarSize}px;height:${avatarSize}px">`:"";
      return `<div class="${prefix}-chat-row${item.isBot?` ${prefix}-chat-bot`:""}" style="background:${esc(st.messageBackground||"rgba(15,36,56,.76)")};border-radius:${Math.max(0,Number(st.borderRadius||22)*.55)}px;padding:${Math.max(4,Number(st.padding||16)*.55)}px;display:flex;gap:10px;align-items:flex-start">${avatar}<div style="min-width:0;flex:1"><div style="display:flex;gap:8px;align-items:center"><strong style="color:${esc(item.isBot?(st.botColor||"#73e6ff"):(st.usernameColor||"#27d0ff"))};font-weight:${Number(st.fontWeight||700)}">${esc(item.actor||"Viewer")}</strong>${timeText}</div><div style="color:${esc(st.messageColor||"#f4f8ff")};line-height:1.35;overflow-wrap:anywhere">${esc(item.message||"")}</div></div></div>`;
    }).join(""):`<div class="${prefix}-chat-empty" style="opacity:.62;text-align:center;padding:20px">Noch keine Chat-Nachrichten</div>`;
    return `<div class="${prefix}-element ${prefix}-chat${cls}" data-element="${esc(element.id)}" style="${base}${effectStyle(element)}background:${esc(st.backgroundColor||"rgba(5,15,27,.82)")};border:${Math.max(0,Number(st.borderWidth||0))}px ${esc(st.borderStyle||"solid")} ${esc(st.borderColor||"transparent")};border-radius:${Math.max(0,Number(st.borderRadius||0))}px;padding:${Math.max(0,Number(st.padding||0))}px;font-family:${esc(st.fontFamily||"Inter")};font-size:${Math.max(9,Number(st.fontSize||18))}px;display:flex;flex-direction:column;gap:${Math.max(0,Number(st.gap||10))}px;overflow:hidden;box-sizing:border-box">${body}</div>`;
  }
  if(element.type==="text"){
    return `<div class="${prefix}-element ${prefix}-text${cls}" data-element="${esc(element.id)}" style="${base}${frameStyle(element)}${effectStyle(element,true)}font-family:${esc(element.style?.fontFamily||"Inter")};font-size:${Number(element.style?.fontSize||20)}px;font-weight:${Number(element.style?.fontWeight||700)};letter-spacing:${Number(element.style?.letterSpacing||0)}px;text-transform:${esc(element.style?.textTransform||"none")};color:${esc(element.style?.color||"#fff")};text-align:${esc(element.style?.textAlign||"left")};justify-content:${element.style?.textAlign==="center"?"center":element.style?.textAlign==="right"?"flex-end":"flex-start"}">${esc(text(element.data?.text||"Text",data))}</div>`;
  }
  if(element.type==="counter"){
    return `<div class="${prefix}-element ${prefix}-counter${cls}" data-element="${esc(element.id)}" style="${base}${frameStyle(element)}${effectStyle(element,true)}font-family:${esc(element.style?.fontFamily||"Inter")};font-size:${Number(element.style?.fontSize||18)}px;font-weight:${Number(element.style?.fontWeight||800)};letter-spacing:${Number(element.style?.letterSpacing||0)}px;text-transform:${esc(element.style?.textTransform||"none")};color:${esc(element.style?.color||"#fff")};justify-content:${element.style?.textAlign==="left"?"flex-start":element.style?.textAlign==="center"?"center":"flex-end"}">${esc(text(element.data?.format||"{{current}}",data))}</div>`;
  }
  if(element.type==="progress"){
    return `<div class="${prefix}-element ${prefix}-progress${cls}" data-element="${esc(element.id)}" style="${base}${effectStyle(element)}background:${esc(element.style?.backgroundColor||"rgba(255,255,255,.12)")};border-radius:${Number(element.style?.borderRadius||0)}px;border:${Number(element.style?.borderWidth||0)}px ${esc(element.style?.borderStyle||"solid")} ${esc(element.style?.borderColor||"transparent")}"><div class="${prefix}-progress-fill" style="width:${Number(data.percent||0)}%;background:${gradient(element.style,element.style?.fillColor||"#148cff")};border-radius:inherit;transition-duration:${Math.max(100,Number(element.animation?.durationMs||600))}ms"></div></div>`;
  }
  if(element.type==="shape"){
    return `<div class="${prefix}-element${cls}" data-element="${esc(element.id)}" style="${base}${effectStyle(element)}background:${gradient(element.style,element.style?.backgroundColor||"transparent")};border-radius:${element.data?.shape==="ellipse"?"999px":Number(element.style?.borderRadius||0)+"px"};border:${Number(element.style?.borderWidth||0)}px ${esc(element.style?.borderStyle||"solid")} ${esc(element.style?.borderColor||"transparent")}"></div>`;
  }
  if(element.type==="image"){
    const src=element.data?.binding==="tiktok.avatar"
      ?data.avatar
      :element.data?.binding==="event.actor_avatar"
        ?data.actorAvatar
        :element.data?.src||"";
    if(!src)return"";
    const st=element.style||{},fit=["cover","contain","fill"].includes(st.objectFit)?st.objectFit:"cover",px=clamp(st.objectPositionX,0,100,50),py=clamp(st.objectPositionY,0,100,50),zoom=clamp(st.imageScale,1,3,1),radius=st.imageMask==="circle"?999:Math.max(0,Number(st.borderRadius||0));
    const inner=`width:100%;height:100%;display:block;pointer-events:none;object-fit:${esc(fit)};object-position:${px}% ${py}%;transform:scale(${zoom});transform-origin:${px}% ${py}%;${imageFilterStyle(st)}border-radius:inherit;`;
    return `<div class="${prefix}-element ${prefix}-image-shell${cls}" data-element="${esc(element.id)}" style="${base}${effectStyle(element)}overflow:hidden;border-radius:${radius}px;border:${Number(st.borderWidth||0)}px ${esc(st.borderStyle||"solid")} ${esc(st.borderColor||"transparent")};${imageMaskStyle(st)}"><img class="${prefix}-image" src="${esc(src)}" alt="${esc(element.data?.alt||"")}" style="${inner}"></div>`;
  }
  if(element.type==="video"){
    const src=element.data?.src||"";
    if(!src)return"";
    const muted=element.data?.muted!==false?" muted":"";
    const loop=element.data?.loop!==false?" loop":"";
    const autoplay=element.data?.autoplay!==false?" autoplay":"";
    return `<video class="${prefix}-element ${prefix}-video${cls}" data-element="${esc(element.id)}" src="${esc(src)}" playsinline preload="auto"${muted}${loop}${autoplay} style="${base}${effectStyle(element)}object-fit:${esc(element.style?.objectFit||"cover")};border-radius:${Number(element.style?.borderRadius||0)}px;border:${Number(element.style?.borderWidth||0)}px ${esc(element.style?.borderStyle||"solid")} ${esc(element.style?.borderColor||"transparent")}"></video>`;
  }
  return "";
}
function renderElements(config,data,options={}){
  if(!config)return"";
  return [...(config.elements||[])]
    .filter(element=>element.visible!==false)
    .sort((a,b)=>(a.zIndex||0)-(b.zIndex||0))
    .map(element=>renderElement(element,data,options))
    .join("");
}
function defaultOutput(profile,config={}){
  const canvas=config.canvas||{};
  if(profile==="tiktok_vertical")return {enabled:true,anchor:"top-center",offsetX:0,offsetY:180,scale:1,safeArea:true};
  if(profile==="landscape")return {enabled:true,anchor:"bottom-center",offsetX:0,offsetY:-90,scale:1,safeArea:true};
  return {enabled:true,anchor:"top-left",offsetX:0,offsetY:0,scale:1,safeArea:false};
}
function outputConfig(config={},profile="obs"){
  const key=OUTPUT_PROFILES[profile]?profile:"obs";
  return {...defaultOutput(key,config),...(config.outputs?.[key]||{})};
}
function profileScene(config={},profile="obs"){
  const key=OUTPUT_PROFILES[profile]?profile:"obs";
  const def=OUTPUT_PROFILES[key];
  const canvas=config.canvas||{width:600,height:120};
  const out=outputConfig(config,key);
  if(def.kind==="intrinsic"){
    return {
      profile:key,
      width:Number(canvas.width||600),
      height:Number(canvas.height||120),
      placement:{left:0,top:0,scale:1,anchor:"top-left"},
      safeArea:false
    };
  }

  const width=def.width,height=def.height;
  const scale=clamp(out.scale,.25,3,1);
  const widgetW=Number(canvas.width||600)*scale;
  const widgetH=Number(canvas.height||120)*scale;
  const safe=out.safeArea!==false;
  const marginX=safe?(key==="tiktok_vertical"?70:60):0;
  const marginY=safe?(key==="tiktok_vertical"?120:54):0;
  const innerLeft=marginX,innerTop=marginY;
  const innerW=width-marginX*2,innerH=height-marginY*2;
  const anchor=ANCHORS.has(out.anchor)?out.anchor:defaultOutput(key).anchor;

  let left=innerLeft,top=innerTop;
  if(anchor.includes("center")&&!anchor.startsWith("center-"))left=innerLeft+(innerW-widgetW)/2;
  if(anchor.endsWith("-center"))left=innerLeft+(innerW-widgetW)/2;
  if(anchor.endsWith("-right"))left=innerLeft+innerW-widgetW;
  if(anchor==="center-left")left=innerLeft;
  if(anchor==="center")left=innerLeft+(innerW-widgetW)/2;
  if(anchor==="center-right")left=innerLeft+innerW-widgetW;

  if(anchor.startsWith("center"))top=innerTop+(innerH-widgetH)/2;
  if(anchor.startsWith("bottom"))top=innerTop+innerH-widgetH;
  if(anchor==="center")top=innerTop+(innerH-widgetH)/2;

  left+=Number(out.offsetX||0);
  top+=Number(out.offsetY||0);

  return {
    profile:key,width,height,
    placement:{left:Math.round(left),top:Math.round(top),scale,anchor},
    safeArea:safe,
    safeMargins:{x:marginX,y:marginY}
  };
}
function mountScene({scene,stage,config,data,profile="obs",animate=false,changed=false,prefix="cfs-render"}={}){
  if(!scene||!stage||!config)return null;
  const spec=profileScene(config,profile);
  scene.style.position="relative";
  scene.style.width=`${spec.width}px`;
  scene.style.height=`${spec.height}px`;
  scene.style.background="transparent";
  scene.dataset.profile=spec.profile;

  stage.style.position="absolute";
  stage.style.left=`${spec.placement.left}px`;
  stage.style.top=`${spec.placement.top}px`;
  stage.style.width=`${Number(config.canvas?.width||600)}px`;
  stage.style.height=`${Number(config.canvas?.height||120)}px`;
  stage.style.background=config.canvas?.background||"transparent";
  stage.style.transformOrigin="top left";
  stage.style.transform=`scale(${spec.placement.scale})`;
  stage.innerHTML=renderElements(config,data,{prefix,animate,changed});
  return spec;
}

return {
  OUTPUT_PROFILES,
  ANCHORS,
  esc,fmt,formatTimer,metric,runtimeData,text,effectStyle,gradient,
  renderElement,renderElements,defaultOutput,outputConfig,profileScene,mountScene
};
});

"use strict";

const { EventEmitter } = require("node:events");

const BACKGROUND_MODES = Object.freeze({
  transparent:{key:"transparent",transparent:true,backgroundColor:"#00000000",label:"Transparent"},
  black:{key:"black",transparent:false,backgroundColor:"#000000",label:"Schwarz"},
  chroma_green:{key:"chroma_green",transparent:false,backgroundColor:"#00ff00",label:"Chroma Grün"}
});

const PROFILE_DIMENSIONS = Object.freeze({
  tiktok_vertical:{width:1080,height:1920,label:"TikTok Vertical"},
  landscape:{width:1920,height:1080,label:"Landscape 16:9"}
});

function clamp(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}

function sceneDimensions(scene={}){
  const published=scene.published_config||{};
  const canvas=published.canvas||{};
  const profile=String(scene.profile||published.profile||"tiktok_vertical");
  const fallback=PROFILE_DIMENSIONS[profile]||PROFILE_DIMENSIONS.tiktok_vertical;
  return {
    profile,
    width:Math.round(clamp(canvas.width,320,4096,fallback.width)),
    height:Math.round(clamp(canvas.height,180,4096,fallback.height))
  };
}

function normalizeScene(scene={}){
  const url=String(scene.source_url||"").trim();
  if(!url)throw new Error("Scene Output URL fehlt.");
  let parsed;
  try{parsed=new URL(url)}catch{throw new Error("Scene Output URL ist ungültig.");}
  if(parsed.protocol!=="https:"&&parsed.hostname!=="127.0.0.1"&&parsed.hostname!=="localhost"){
    throw new Error("Scene Output benötigt HTTPS.");
  }
  if(!/\/widgets\/scene\.html$/i.test(parsed.pathname)){
    throw new Error("Nur veröffentlichte CFS Scene URLs sind als lokaler Output erlaubt.");
  }
  if(!parsed.hash.includes("token=")){
    throw new Error("Scene Token fehlt.");
  }
  const dims=sceneDimensions(scene);
  const items=Array.isArray(scene.published_config?.items)
    ? scene.published_config.items.slice(0,24).map(item=>({
        id:String(item?.id||""),
        widget_id:String(item?.widget_id||""),
        visible:item?.visible!==false
      })).filter(item=>item.widget_id)
    : [];
  return {
    id:String(scene.id||""),
    name:String(scene.name||"Scene").slice(0,120),
    source_url:url,
    items,
    ...dims
  };
}

class OutputWindowManager extends EventEmitter {
  constructor({BrowserWindow,screen,logger=null,maxCrashRestarts=3,crashWindowMs=60000,crashRestartDelayMs=900}={}){
    super();
    if(!BrowserWindow)throw new Error("BrowserWindow fehlt.");
    this.BrowserWindow=BrowserWindow;
    this.screen=screen;
    this.logger=logger;
    this.maxCrashRestarts=Math.max(0,Math.min(10,Number(maxCrashRestarts)||0));
    this.crashWindowMs=Math.max(5000,Number(crashWindowMs)||60000);
    this.crashRestartDelayMs=Math.max(100,Number(crashRestartDelayMs)||900);
    this.crashHistory=[];
    this.recoveryTimer=null;
    this.window=null;
    this.state={
      running:false,
      ready:false,
      crashed:false,
      recovering:false,
      restartCount:0,
      lastCrashAt:null,
      scene:null,
      backgroundMode:"transparent",
      displayId:null,
      alwaysOnTop:false,
      widgetVisibility:{},
      startedAt:null,
      loadedAt:null,
      lastError:""
    };
  }

  snapshot(){
    return JSON.parse(JSON.stringify(this.state));
  }

  displays(){
    const all=this.screen?.getAllDisplays?.()||[];
    const primary=this.screen?.getPrimaryDisplay?.();
    return all.map((display,index)=>({
      id:String(display.id),
      label:`Display ${index+1}${primary&&String(primary.id)===String(display.id)?" · PRIMARY":""}`,
      primary:Boolean(primary&&String(primary.id)===String(display.id)),
      bounds:{
        x:Number(display.bounds?.x||0),
        y:Number(display.bounds?.y||0),
        width:Number(display.bounds?.width||0),
        height:Number(display.bounds?.height||0)
      },
      workArea:{
        x:Number(display.workArea?.x||display.bounds?.x||0),
        y:Number(display.workArea?.y||display.bounds?.y||0),
        width:Number(display.workArea?.width||display.bounds?.width||0),
        height:Number(display.workArea?.height||display.bounds?.height||0)
      },
      scaleFactor:Number(display.scaleFactor||1)
    }));
  }

  resolveDisplay(displayId){
    const all=this.screen?.getAllDisplays?.()||[];
    if(displayId!==undefined&&displayId!==null){
      const match=all.find(d=>String(d.id)===String(displayId));
      if(match)return match;
    }
    return this.screen?.getPrimaryDisplay?.()||all[0]||{id:"0",workArea:{x:0,y:0,width:1920,height:1080}};
  }

  positionFor(display,width,height){
    const area=display?.workArea||display?.bounds||{x:0,y:0,width:1920,height:1080};
    return {
      x:Math.round(Number(area.x||0)+(Number(area.width||1920)-width)/2),
      y:Math.round(Number(area.y||0)+(Number(area.height||1080)-height)/2)
    };
  }

  async start(sceneInput,options={}){
    const scene=normalizeScene(sceneInput);
    const mode=BACKGROUND_MODES[options.backgroundMode]||BACKGROUND_MODES.transparent;
    const display=this.resolveDisplay(options.displayId);
    const position=this.positionFor(display,scene.width,scene.height);

    await this.stop();

    const win=new this.BrowserWindow({
      x:position.x,
      y:position.y,
      width:scene.width,
      height:scene.height,
      useContentSize:true,
      frame:false,
      transparent:mode.transparent,
      backgroundColor:mode.backgroundColor,
      resizable:false,
      movable:true,
      minimizable:true,
      maximizable:false,
      fullscreenable:false,
      autoHideMenuBar:true,
      show:false,
      title:`CFS LIVE OUTPUT · ${scene.name}`,
      webPreferences:{
        contextIsolation:true,
        nodeIntegration:false,
        sandbox:true,
        backgroundThrottling:false
      }
    });

    this.window=win;
    this.state={
      running:true,
      ready:false,
      crashed:false,
      recovering:false,
      restartCount:0,
      lastCrashAt:null,
      scene,
      backgroundMode:mode.key,
      displayId:String(display?.id??""),
      alwaysOnTop:Boolean(options.alwaysOnTop),
      widgetVisibility:Object.fromEntries(scene.items.map(item=>[item.widget_id,item.visible!==false])),
      startedAt:new Date().toISOString(),
      loadedAt:null,
      lastError:""
    };

    win.setMenuBarVisibility?.(false);
    win.setAlwaysOnTop?.(Boolean(options.alwaysOnTop),"floating");
    win.webContents?.setAudioMuted?.(true);
    win.webContents?.setWindowOpenHandler?.(()=>({action:"deny"}));

    let allowedOrigin="";
    try{allowedOrigin=new URL(scene.source_url).origin}catch{}
    win.webContents?.on?.("will-navigate",(event,url)=>{
      try{
        if(new URL(url).origin!==allowedOrigin)event.preventDefault();
      }catch{event.preventDefault()}
    });

    win.webContents?.on?.("did-finish-load",()=>{
      if(!this.window||this.window!==win)return;
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer=null;
      this.state.ready=true;
      this.state.crashed=false;
      this.state.recovering=false;
      this.state.loadedAt=new Date().toISOString();
      this.state.lastError="";
      try{win.showInactive?.()}catch{try{win.show?.()}catch{}}
      this.emit("state",this.snapshot());
    });

    win.webContents?.on?.("render-process-gone",(_event,details)=>{
      if(!this.window||this.window!==win)return;
      const now=Date.now();
      this.crashHistory=this.crashHistory.filter(ts=>now-ts<=this.crashWindowMs);
      this.crashHistory.push(now);
      const restartCount=this.crashHistory.length;
      const canRecover=this.maxCrashRestarts>0&&restartCount<=this.maxCrashRestarts;
      this.state.ready=false;
      this.state.crashed=true;
      this.state.recovering=canRecover;
      this.state.restartCount=restartCount;
      this.state.lastCrashAt=new Date(now).toISOString();
      this.state.lastError=canRecover
        ? `Output Renderer beendet: ${details?.reason||"unknown"} · Wiederherstellung ${restartCount}/${this.maxCrashRestarts}`
        : `Output Renderer wiederholt beendet: ${details?.reason||"unknown"} · automatische Wiederherstellung pausiert`;
      this.emit("state",this.snapshot());
      this.logger?.warn?.("Local output renderer gone",this.state.lastError);

      clearTimeout(this.recoveryTimer);
      this.recoveryTimer=null;
      if(!canRecover)return;
      this.recoveryTimer=setTimeout(()=>{
        this.recoveryTimer=null;
        if(!this.window||this.window!==win||win.isDestroyed?.())return;
        try{
          win.webContents?.reloadIgnoringCache?.();
        }catch(error){
          this.state.recovering=false;
          this.state.lastError=`Output Wiederherstellung fehlgeschlagen: ${String(error?.message||error)}`;
          this.emit("state",this.snapshot());
        }
      },this.crashRestartDelayMs);
      this.recoveryTimer.unref?.();
    });

    win.on?.("closed",()=>{
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer=null;
      if(this.window===win)this.window=null;
      this.state={...this.state,running:false,ready:false,recovering:false};
      this.emit("state",this.snapshot());
    });

    try{
      await win.loadURL(scene.source_url);
      if(!win.isDestroyed?.())win.show?.();
    }catch(error){
      this.state.ready=false;
      this.state.lastError=String(error?.message||error);
      this.emit("state",this.snapshot());
      try{win.close?.()}catch{}
      throw error;
    }

    this.logger?.info?.("Local output started",`${scene.name} ${scene.width}x${scene.height} ${mode.key}`);
    this.emit("state",this.snapshot());
    return this.snapshot();
  }

  async stop(){
    clearTimeout(this.recoveryTimer);
    this.recoveryTimer=null;
    this.crashHistory=[];
    const win=this.window;
    this.window=null;
    if(win&&!win.isDestroyed?.()){
      try{win.close?.()}catch{}
    }
    this.state={...this.state,running:false,ready:false,recovering:false};
    this.emit("state",this.snapshot());
    return this.snapshot();
  }

  async reload(){
    if(!this.window||this.window.isDestroyed?.())throw new Error("Kein lokaler Output aktiv.");
    this.state.ready=false;
    this.state.lastError="";
    this.window.webContents?.reloadIgnoringCache?.();
    this.emit("state",this.snapshot());
    return this.snapshot();
  }

  async postToScene(message){
    if(!this.window||this.window.isDestroyed?.())throw new Error("Kein lokaler Output aktiv.");
    if(!this.state.ready)throw new Error("Lokaler Output ist noch nicht bereit.");
    const payload=JSON.stringify(message||{});
    await this.window.webContents?.executeJavaScript?.(
      `window.postMessage(${payload},"*");`,
      true
    );
    return this.snapshot();
  }

  async testEvent(type,payload={}){
    const eventType=String(type||"");
    if(!["follow","gift","share"].includes(eventType))throw new Error("Dieser Test-Alert wird nicht unterstützt.");
    const event={
      id:`launcher_test_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      event_type:eventType,
      provider:"launcher_test",
      actor_name:"CFS TEST",
      actor_avatar:"",
      amount:eventType==="gift"?3:1,
      value:eventType==="gift"?3:0,
      payload:{
        test:true,
        gift_name:eventType==="gift"?"Test Gift":"",
        message:"Lokaler Stream-Deck Test",
        ...(payload&&typeof payload==="object"?payload:{})
      },
      created_at:new Date().toISOString()
    };
    await this.postToScene({type:"cfs:test-event",event});
    return {ok:true,event_type:eventType,test:true};
  }

  async setWidgetVisibility(widgetId,visible){
    const id=String(widgetId||"");
    if(!id)throw new Error("Widget-ID fehlt.");
    if(!this.state.scene?.items?.some(item=>item.widget_id===id)){
      throw new Error("Dieses Widget ist nicht in der aktiven Scene.");
    }
    const next=Boolean(visible);
    await this.postToScene({type:"cfs:widget-visibility",widget_id:id,visible:next});
    this.state.widgetVisibility={...(this.state.widgetVisibility||{}),[id]:next};
    this.emit("state",this.snapshot());
    return {ok:true,widget_id:id,visible:next};
  }

  async toggleWidget(widgetId){
    const id=String(widgetId||"");
    if(!id)throw new Error("Widget-ID fehlt.");
    const item=this.state.scene?.items?.find(item=>item.widget_id===id);
    if(!item)throw new Error("Dieses Widget ist nicht in der aktiven Scene.");
    const current=Object.prototype.hasOwnProperty.call(this.state.widgetVisibility||{},id)
      ? Boolean(this.state.widgetVisibility[id])
      : item.visible!==false;
    return this.setWidgetVisibility(id,!current);
  }

  setAlwaysOnTop(enabled){
    const value=Boolean(enabled);
    this.state.alwaysOnTop=value;
    if(this.window&&!this.window.isDestroyed?.())this.window.setAlwaysOnTop?.(value,"floating");
    this.emit("state",this.snapshot());
    return this.snapshot();
  }
}

module.exports={OutputWindowManager,BACKGROUND_MODES,PROFILE_DIMENSIONS,normalizeScene,sceneDimensions};

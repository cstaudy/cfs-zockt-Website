import {createRequire} from "node:module";import {EventEmitter} from "node:events";
const require=createRequire(import.meta.url);
const {OutputWindowManager,normalizeScene,sceneDimensions}=require("../src/output-window-manager.js");

class FakeWebContents extends EventEmitter{
  constructor(){super();this.windowOpenHandler=null;this.muted=false;this.executed=[]}
  setAudioMuted(v){this.muted=v}
  setWindowOpenHandler(fn){this.windowOpenHandler=fn}
  reloadIgnoringCache(){this.emit("did-finish-load")}
  async executeJavaScript(code){this.executed.push(code);return true}
}
class FakeWindow extends EventEmitter{
  static instances=[];
  constructor(options){super();this.options=options;this.webContents=new FakeWebContents();this.destroyed=false;this.loaded=null;this.top=false;FakeWindow.instances.push(this)}
  setMenuBarVisibility(){}
  setAlwaysOnTop(v){this.top=v}
  async loadURL(url){this.loaded=url;this.webContents.emit("did-finish-load")}
  show(){}
  showInactive(){}
  close(){if(this.destroyed)return;this.destroyed=true;this.emit("closed")}
  isDestroyed(){return this.destroyed}
}
const displays=[
  {id:1,bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1040},scaleFactor:1},
  {id:2,bounds:{x:1920,y:0,width:1080,height:1920},workArea:{x:1920,y:0,width:1080,height:1880},scaleFactor:1}
];
const screen={getAllDisplays:()=>displays,getPrimaryDisplay:()=>displays[0]};
const manager=new OutputWindowManager({BrowserWindow:FakeWindow,screen,logger:{info(){}}});
const scene={id:"s1",name:"TikTok Main",profile:"tiktok_vertical",source_url:"https://cfs-zockt.de/widgets/scene.html#token=cfss_test",published_config:{profile:"tiktok_vertical",canvas:{width:1080,height:1920},items:[{id:"i1",widget_id:"w1",visible:true}]}};
const norm=normalizeScene(scene);if(norm.width!==1080||norm.height!==1920)throw new Error("normalize dimensions");
await manager.start(scene,{backgroundMode:"transparent",displayId:"2",alwaysOnTop:true});
let snap=manager.snapshot();
if(!snap.running||!snap.ready||snap.displayId!=="2"||!snap.alwaysOnTop)throw new Error("start snapshot");
const win=FakeWindow.instances.at(-1);
if(!win.options.transparent||win.options.width!==1080||win.options.height!==1920)throw new Error("window config");
if(win.loaded!==scene.source_url||!win.webContents.muted)throw new Error("load settings");
await manager.testEvent("gift");
const toggled=await manager.toggleWidget("w1");
if(toggled.visible!==false)throw new Error("widget toggle");
if(!win.webContents.executed.some(code=>code.includes("cfs:test-event")))throw new Error("test event not posted");
if(!win.webContents.executed.some(code=>code.includes("cfs:widget-visibility")))throw new Error("widget visibility not posted");
await manager.reload();if(!manager.snapshot().ready)throw new Error("reload");
manager.setAlwaysOnTop(false);if(manager.snapshot().alwaysOnTop)throw new Error("always on top");
await manager.stop();if(manager.snapshot().running)throw new Error("stop");
let blocked=false;try{normalizeScene({...scene,source_url:"http://evil.test/widgets/scene.html#token=x"})}catch{blocked=true}
if(!blocked)throw new Error("http should be blocked");
console.log(JSON.stringify({ok:true,display_count:manager.displays().length,width:norm.width,height:norm.height,https_only:true}));

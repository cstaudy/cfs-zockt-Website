(() => {
"use strict";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let state = null;
const ttsQueue = [];
const queuedActionIds = new Set();
let speaking = false;
let voices = [];
let setupStep = 1;
let setupCheckOk = false;
let streamDeckEditMode=false;
let streamDeckEditingId=null;
let streamDeckEditorColor="auto";
let syncHistory=[];
let syncSnapshot={};
let menuOpen=true;
let streamBotConfig={enabled:false,prefix:"!",commands:[]};
let streamBotLoaded=false;
let experienceMode="simple";
const EXPERIENCE_STORAGE_KEY="cfsLauncherExperienceMode";
const PRO_ONLY_PAGES=new Set(["sync","audio","events","bot","output","obs","system","beta"]);
const EXPERIENCE_HELP=Object.freeze({
  live:{title:"Dein Stream auf einen Blick.",text:"Arbeite die vier Karten von links nach rechts ab. Der Launcher nennt dir immer den nächsten sinnvollen Schritt."},
  deck:{title:"Deine wichtigsten Aktionen als Tasten.",text:"Wähle zuerst eine Deck-Seite. Ein normaler Klick führt die Aktion aus; über Bearbeiten passt du einzelne Tasten an."},
  tools:{title:"Creator Tools ohne Umwege.",text:"Hier startest du Games und Cut Studio. Erweiterte Media-Details brauchst du nur im Profi-Modus."},
  bridge:{title:"Verbinde diesen PC mit deinem Creator Account.",text:"Für normale Creator reicht der Device-Link. Provider-Keys und Diagnose sind nur für erweiterte Setups nötig."},
  settings:{title:"Nur Einstellungen, die du wirklich brauchst.",text:"Im Einfach-Modus bleiben technische Release-, Queue- und Diagnoseoptionen ausgeblendet."},
  sync:{title:"Hier siehst du, ob alles synchron läuft.",text:"Diese Detailansicht ist hauptsächlich für Fehlersuche gedacht. Auf der Startseite reicht normalerweise der grüne Sync-Status."},
  audio:{title:"AutoThanks spricht Stream-Ereignisse aus.",text:"Aktiviere es nur, wenn du automatische Sprachausgabe nutzen möchtest."},
  events:{title:"LIVE Events sind die eingehenden TikTok-Signale.",text:"Diese Ansicht hilft beim Testen. Im normalen Streambetrieb musst du sie nicht dauerhaft offen haben."},
  bot:{title:"Der Stream Bot reagiert auf Chat-Kommandos.",text:"Nutze Vorlagen oder eigene Commands. Der Bot schreibt derzeit nicht automatisch in fremde Chats zurück."},
  output:{title:"Output ist deine lokale Stream-Ausgabe.",text:"Hier startest oder prüfst du veröffentlichte Scenes. Für Anfänger reicht meistens die empfohlene Standardausgabe."},
  obs:{title:"OBS Doctor hilft bei Browser-Source-Problemen.",text:"Öffne ihn nur, wenn eine Widget-URL in OBS nicht so aussieht oder lädt wie erwartet."},
  system:{title:"System ist die technische Diagnose.",text:"Diese Werte sind vor allem für Support und Fehlersuche gedacht."},
  beta:{title:"Beta Test sammelt reproduzierbares Feedback.",text:"Nur relevant, wenn du aktiv an einem Testlauf teilnimmst."}
});

const STREAM_DECK_PRESETS=Object.freeze({
  live:{
    label:"TikTok LIVE",
    buttons:[
      {label:"LIVE",action:"live_toggle"},
      {label:"FOLLOW TEST",action:"alert_follow"},
      {label:"GIFT TEST",action:"alert_gift"},
      {label:"SHARE TEST",action:"alert_share"},
      {label:"AUTOTHANKS",action:"autothanks_toggle"},
      {label:"DATEN SYNC",action:"refresh_library"},
      {label:"WIDGET STUDIO",action:"open_widget_studio"},
      {label:"DASHBOARD",action:"open_dashboard"},
      {label:"SCENE STUDIO",action:"open_scene_studio"},
      {label:"CUT STUDIO",action:"open_cut_studio"},
      {label:"GAMES",action:"open_games"},
      {label:"FREI",action:"none"}
    ]
  },
  gaming:{
    label:"Gaming",
    buttons:[
      {label:"LIVE",action:"live_toggle"},
      {label:"SIEG +1",action:"counter_plus_1",targetType:"wins_counter"},
      {label:"TOD +1",action:"counter_plus_1",targetType:"deaths_counter"},
      {label:"TIMER ▶ / ‖",action:"timer_toggle",targetType:"stream_timer"},
      {label:"TIMER RESET",action:"timer_reset",targetType:"stream_timer"},
      {label:"GAME START/STOP",action:"game_toggle"},
      {label:"TEAM A +1",action:"game_score_a"},
      {label:"TEAM B +1",action:"game_score_b"},
      {label:"RUNDE RESET",action:"game_reset"},
      {label:"NÄCHSTE SCENE",action:"scene_next"},
      {label:"WIDGET STUDIO",action:"open_widget_studio"},
      {label:"FREI",action:"none"}
    ]
  },
  obs:{
    label:"OBS / Output",
    buttons:[
      {label:"NÄCHSTE SCENE",action:"scene_next"},
      {label:"OUTPUT RELOAD",action:"output_reload"},
      {label:"OUTPUT STOP",action:"output_stop"},
      {label:"FOLLOW TEST",action:"alert_follow"},
      {label:"GIFT TEST",action:"alert_gift"},
      {label:"SHARE TEST",action:"alert_share"},
      {label:"SCENE STUDIO",action:"open_scene_studio"},
      {label:"WIDGET STUDIO",action:"open_widget_studio"},
      {label:"DATEN SYNC",action:"refresh_library"},
      {label:"DASHBOARD",action:"open_dashboard"},
      {label:"CUT STUDIO",action:"open_cut_studio"},
      {label:"FREI",action:"none"}
    ]
  },
  creator:{
    label:"Creator Tools",
    buttons:[
      {label:"DASHBOARD",action:"open_dashboard"},
      {label:"WIDGET STUDIO",action:"open_widget_studio"},
      {label:"SCENE STUDIO",action:"open_scene_studio"},
      {label:"CUT STUDIO",action:"open_cut_studio"},
      {label:"GAMES",action:"open_games"},
      {label:"DATEN SYNC",action:"refresh_library"},
      {label:"LIVE",action:"live_toggle"},
      {label:"AUTOTHANKS",action:"autothanks_toggle"},
      {label:"FOLLOW TEST",action:"alert_follow"},
      {label:"GIFT TEST",action:"alert_gift"},
      {label:"OUTPUT RELOAD",action:"output_reload"},
      {label:"FREI",action:"none"}
    ]
  }
});

const STREAM_DECK_PROFILE_META=Object.freeze({
  live:{label:"TikTok LIVE",description:"LIVE, Alerts, AutoThanks und Creator-Tools"},
  gaming:{label:"Gaming",description:"Counter, Timer, Game-Steuerung und Szenen"},
  obs:{label:"OBS / Output",description:"Szenen, Output, Widgets und Tests"},
  creator:{label:"Creator Tools",description:"Dashboard, Studios, Sync und Tools"}
});

function deckProfileMeta(profileId,deck=state?.streamDeck){
  const id=String(profileId||deck?.active_profile||"live");
  const fromState=(deck?.profiles||[]).find(profile=>String(profile.id)===id);
  return {id,label:fromState?.label||STREAM_DECK_PROFILE_META[id]?.label||"Stream Deck",description:fromState?.description||STREAM_DECK_PROFILE_META[id]?.description||"Deine Stream-Tasten"};
}

function deckActionGroup(actionKey){
  const key=String(actionKey||"");
  if(["live_toggle","autothanks_toggle"].includes(key))return "LIVE";
  if(["counter_plus_1","counter_minus_1","counter_plus_5","counter_reset","timer_toggle","timer_reset","timer_plus_60","timer_minus_60"].includes(key))return "COUNTER & TIMER";
  if(["scene_next","scene_start","output_stop","output_reload","widget_toggle"].includes(key))return "OBS / OUTPUT";
  if(["alert_follow","alert_gift","alert_share"].includes(key))return "ALERTS";
  if(["game_toggle","game_score_a","game_score_b","game_reset","open_games"].includes(key))return "GAMING";
  if(["refresh_library","open_dashboard","open_widget_studio","open_scene_studio","open_cut_project","open_cut_studio"].includes(key))return "CREATOR TOOLS";
  return "SONSTIGES";
}

function deckActionTone(actionKey){
  const group=deckActionGroup(actionKey);
  return group==="LIVE"?"live":group==="COUNTER & TIMER"?"counter":group==="OBS / OUTPUT"?"output":group==="ALERTS"?"alert":group==="GAMING"?"game":group==="CREATOR TOOLS"?"tool":"neutral";
}

const DECK_BUTTON_COLORS=new Set(["auto","cyan","blue","green","orange","red","white"]);

function deckButtonColor(value){
  const key=String(value||"auto").toLowerCase();
  return DECK_BUTTON_COLORS.has(key)?key:"auto";
}

function deckButtonIcon(button,definition){
  const own=String(button?.icon||"").trim().slice(0,4);
  return own||String(definition?.icon||"·");
}

function widgetTypeLabel(type){
  return ({
    manual_counter:"Freier Counter",
    wins_counter:"Siege Counter",
    deaths_counter:"Tode Counter",
    manual_goal:"Manuelles Goal",
    stream_timer:"Stream Timer",
    chat_overlay:"TikTok Chat",
    follower_goal:"Follower Goal",
    follower_counter:"Follower Counter",
    live_like_goal:"LIVE Like Goal",
    live_like_counter:"LIVE Like Counter",
    viewer_counter:"Viewer Counter",
    gift_goal:"Gift Goal",
    gift_counter:"Gift Counter",
    share_goal:"Share Goal",
    share_counter:"Share Counter",
    follower_gain:"Follower Gain",
    follower_gain_goal:"Follower Gain Goal",
    follow_alert:"Follow Alert",
    gift_alert:"Gift Alert",
    share_alert:"Share Alert",
    goal_reached_alert:"Goal Alert",
    latest_follower:"Latest Follower",
    latest_gift:"Latest Gift",
    latest_share:"Latest Share"
  })[String(type||"")]||String(type||"Widget").replaceAll("_"," ");
}

function widgetPlatformLabel(type){
  const shared=new Set(["manual_counter","wins_counter","deaths_counter","manual_goal","stream_timer"]);
  return shared.has(String(type||""))?"TIKTOK + OBS":"TIKTOK LIVE";
}

function renderDeckTargetPreview(actionKey,targetId=""){
  const box=$("#deckTargetPreview");
  if(!box)return;
  const def=deckActionDefinition(actionKey);
  const target=String(targetId||"");
  if(!target||def.target_kind==="none"){
    box.hidden=true;
    box.innerHTML="";
    return;
  }
  if(def.target_kind==="widget"){
    const widget=(state?.creatorLibrary?.widgets||[]).find(item=>String(item.id)===target);
    if(!widget){box.hidden=true;box.innerHTML="";return;}
    const type=String(widget.widget_type||"");
    const glyph=type==="stream_timer"?"TMR":type==="wins_counter"?"WIN":type==="deaths_counter"?"TOD":type.includes("goal")?"GOAL":type.includes("chat")?"CHAT":"W";
    box.hidden=false;
    box.innerHTML=`<div class="deck-target-icon">${escapeHtml(glyph)}</div><div><span>AUSGEWÄHLTES WIDGET</span><strong>${escapeHtml(widget.name||widgetTypeLabel(type))}</strong><small>${escapeHtml(widgetTypeLabel(type))} · ${escapeHtml(widgetPlatformLabel(type))} · VERÖFFENTLICHT</small></div><i>✓</i>`;
    return;
  }
  if(def.target_kind==="scene"){
    const scene=(state?.creatorLibrary?.scenes||[]).find(item=>String(item.id)===target);
    if(!scene){box.hidden=true;box.innerHTML="";return;}
    box.hidden=false;
    box.innerHTML=`<div class="deck-target-icon">SCN</div><div><span>AUSGEWÄHLTE SCENE</span><strong>${escapeHtml(scene.name||"Scene")}</strong><small>Veröffentlichte Scene · Local Output</small></div><i>✓</i>`;
    return;
  }
  if(def.target_kind==="cut_project"){
    const project=(state?.creatorLibrary?.cutProjects||[]).find(item=>String(item.id)===target);
    if(!project){box.hidden=true;box.innerHTML="";return;}
    box.hidden=false;
    box.innerHTML=`<div class="deck-target-icon">CUT</div><div><span>AUSGEWÄHLTES PROJEKT</span><strong>${escapeHtml(project.title||"Cut Projekt")}</strong><small>Cut Studio Projekt</small></div><i>✓</i>`;
    return;
  }
  box.hidden=true;
}

function renderDeckButtonPreview(){
  const preview=$("#deckButtonPreview");
  if(!preview)return;
  const button=(state?.streamDeck?.buttons||[]).find(item=>item.id===streamDeckEditingId)||{};
  const action=$("#deckButtonAction")?.value||button.action||"none";
  const def=deckActionDefinition(action);
  const label=$("#deckButtonLabel")?.value||button.label||"BUTTON";
  const customIcon=String($("#deckButtonIcon")?.value||"").trim().slice(0,4);
  const color=deckButtonColor(streamDeckEditorColor);
  const tone=deckActionTone(action);
  preview.className=`stream-key deck-button-preview-key tone-${tone} user-color-${color}`;
  $("#deckButtonPreviewLabel").textContent=label||"BUTTON";
  $("#deckButtonPreviewAction").textContent=def.label||action;
  $("#deckButtonPreviewIcon").textContent=customIcon||def.icon||"·";
  const match=/^slot_(\d+)$/.exec(String(streamDeckEditingId||""));
  const slot=preview.querySelector(".stream-key-slot");
  if(slot)slot.textContent=String(match?Number(match[1]):1).padStart(2,"0");
}

function deckActionOptions(actions,current=""){
  const order=["LIVE","COUNTER & TIMER","OBS / OUTPUT","ALERTS","GAMING","CREATOR TOOLS","SONSTIGES"];
  const groups=new Map(order.map(name=>[name,[]]));
  for(const action of actions||[]){
    const group=deckActionGroup(action.key);
    (groups.get(group)||groups.get("SONSTIGES")).push(action);
  }
  return order.map(group=>{
    const items=groups.get(group)||[];
    if(!items.length)return "";
    return `<optgroup label="${escapeHtml(group)}">${items.map(action=>`<option value="${escapeHtml(action.key)}" ${String(action.key)===String(current)?"selected":""}>${escapeHtml(action.label)}</option>`).join("")}</optgroup>`;
  }).join("");
}

async function applyStreamDeckPreset(key){
  const preset=STREAM_DECK_PRESETS[String(key||"")];
  if(!preset)throw new Error("Deck-Vorlage nicht gefunden.");
  const features=currentCreatorFeatures();
  const max=features.stream_deck===true?Math.max(0,Math.min(12,Number(features.max_stream_deck_buttons||0))):0;
  if(!max)throw new Error("Stream Deck ist für diesen Creator nicht freigeschaltet.");
  if(!confirm(`Vorlage „${preset.label}“ auf deine ${max} verfügbaren Tasten anwenden?`))return false;
  for(let index=0;index<max;index++){
    const button=preset.buttons[index]||{label:"FREI",action:"none",target:""};
    const autoTarget=button.targetType
      ? (state?.creatorLibrary?.widgets||[]).find(widget=>String(widget.widget_type||"")===String(button.targetType||""))?.id||""
      : "";
    state=await window.CFSLauncher.saveStreamDeckButton({id:`slot_${index+1}`,label:button.label,action:button.action,target:button.target||autoTarget,color:"auto",icon:""});
  }
  streamDeckEditMode=false;
  streamDeckEditingId=null;
  if($("#streamDeckEditor"))$("#streamDeckEditor").hidden=true;
  render(state);
  toast(`${preset.label} Vorlage angewendet.`);
  return true;
}

function toast(message, danger = false) {
  const el = $("#toast");
  el.textContent = String(message || "");
  el.className = "toast" + (danger ? " danger" : "");
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.hidden = true, 4200);
}

function fmtTime(value) {
  if (!value) return "–";
  try { return new Date(value).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return "–"; }
}

function providerLabel(key) {
  return key === "tiktool" ? "TIKTOK LIVE · TIKTOOL" : "SIMULATOR";
}

function syncNow(){
  return new Date().toLocaleTimeString("de-DE", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function addSyncLine(kind,message,tone="info"){
  const text=String(message||"").trim();
  if(!text)return;
  const previous=syncHistory[syncHistory.length-1];
  if(previous&&previous.kind===kind&&previous.message===text)return;
  syncHistory.push({time:syncNow(),kind:String(kind||"SYNC").toUpperCase(),message:text,tone});
  if(syncHistory.length>80)syncHistory=syncHistory.slice(-80);
}

function setSyncCard(id,stateText,meta,tone){
  const card=$(id);
  if(!card)return;
  card.classList.remove("ok","work","warn","fail");
  if(tone)card.classList.add(tone);
  const strong=card.querySelector("strong"),p=card.querySelector("p");
  if(strong)strong.textContent=stateText;
  if(p)p.textContent=meta;
}

function recordSyncState(nextState=state){
  if(!nextState)return;
  const bridge=nextState.bridge||{},health=nextState.cloudHealth||{},library=nextState.creatorLibrary||{},spool=nextState.spool||bridge.spool||{},metrics=bridge.metrics||{};
  const cloudKey=`${Boolean(health.ok)}:${health.checkedAt||""}:${health.error||""}`;
  if(syncSnapshot.cloud!==cloudKey&&health.checkedAt){
    addSyncLine("CLOUD",health.ok?`Creator Cloud online · Datenbank ${health.database?"verbunden":"nicht verbunden"} · ${Number(health.latencyMs||0)} ms`:`Creator Cloud nicht erreichbar · ${health.error||"Healthcheck fehlgeschlagen"}`,health.ok&&health.database?"ok":"fail");
    syncSnapshot.cloud=cloudKey;
  }
  const bridgeKey=`${Boolean(bridge.connected)}:${bridge.lastHeartbeatAt||""}:${bridge.lastError||""}`;
  if(syncSnapshot.bridge!==bridgeKey){
    if(bridge.connected&&bridge.lastHeartbeatAt)addSyncLine("BRIDGE",`Heartbeat OK · PC verbunden · ${bridge.latencyMs==null?"Latenz –":`${Number(bridge.latencyMs)} ms`}`,"ok");
    else if(bridge.lastError)addSyncLine("BRIDGE",`Verbindung unterbrochen · ${bridge.lastError}`,"fail");
    syncSnapshot.bridge=bridgeKey;
  }
  const libraryKey=`${library.loadedAt||""}:${library.error||""}:${Array.isArray(library.widgets)?library.widgets.length:0}:${Array.isArray(library.scenes)?library.scenes.length:0}`;
  if(syncSnapshot.library!==libraryKey){
    if(library.loadedAt&&!library.error)addSyncLine("WIDGETS",`Bibliothek synchronisiert · ${library.widgets.length} Widgets · ${library.scenes.length} Scenes`,"ok");
    else if(library.error&&bridge.connected)addSyncLine("WIDGETS",`Bibliothek konnte nicht synchronisiert werden · ${library.error}`,"warn");
    syncSnapshot.library=libraryKey;
  }
  const flushKey=`${bridge.lastFlushAt||""}:${Number(metrics.sent||0)}:${Number(spool.pending||bridge.queuedEvents||0)}:${Number(metrics.flushFailures||0)}`;
  if(syncSnapshot.flush!==flushKey&&bridge.lastFlushAt){
    addSyncLine("EVENTS",`Event-Sync bestätigt · ${Number(metrics.sent||0)} gesendet · ${Number(spool.pending||bridge.queuedEvents||0)} wartend`,Number(spool.pending||bridge.queuedEvents||0)===0?"ok":"work");
    syncSnapshot.flush=flushKey;
  }
}

function renderSyncMonitor(nextState=state){
  if(!nextState)return;
  const bridge=nextState.bridge||{},health=nextState.cloudHealth||{},library=nextState.creatorLibrary||{},spool=nextState.spool||bridge.spool||{};
  const cloudOk=Boolean(health.ok&&health.database);
  const bridgeOk=Boolean(bridge.connected);
  const libraryOk=Boolean(bridgeOk&&library.loadedAt&&!library.error);
  const pending=Number(spool.pending??bridge.queuedEvents??0);
  const eventsOk=bridgeOk&&pending===0;
  const allOk=cloudOk&&bridgeOk&&libraryOk&&eventsOk;

  setSyncCard("#syncCardCloud",cloudOk?"ONLINE":health.checkedAt?"PRÜFEN":"WIRD GEPRÜFT",cloudOk?`Backend ${health.version||"online"} · DB verbunden · ${Number(health.latencyMs||0)} ms`:(health.error||"Noch kein Healthcheck."),cloudOk?"ok":health.checkedAt?"fail":"work");
  setSyncCard("#syncCardBridge",bridgeOk?"VERBUNDEN":"OFFLINE",bridgeOk?`Heartbeat ${fmtTime(bridge.lastHeartbeatAt)} · ${bridge.latencyMs==null?"Latenz –":`${Number(bridge.latencyMs)} ms`}`:(bridge.lastError||"Device-Link / Bridge noch nicht verbunden."),bridgeOk?"ok":"fail");
  setSyncCard("#syncCardLibrary",libraryOk?"SYNCHRONISIERT":bridgeOk?"WARTET":"OFFLINE",libraryOk?`${library.widgets.length} Widgets · ${library.scenes.length} Scenes · ${fmtTime(library.loadedAt)}`:(library.error||"Wird geladen, sobald die Bridge verbunden ist."),libraryOk?"ok":bridgeOk?"warn":"fail");
  setSyncCard("#syncCardEvents",eventsOk?"SYNCHRON":bridgeOk?"ÜBERTRÄGT":"OFFLINE",bridgeOk?(pending?`${pending} Event${pending===1?"":"s"} warten auf Übertragung.`:`Queue leer · letzter Sync ${fmtTime(bridge.lastFlushAt)}`):"Bridge muss verbunden sein.",eventsOk?"ok":bridgeOk?"work":"fail");

  const pill=$("#syncOverallPill");
  if(pill){pill.textContent=allOk?"ALLES SYNCHRON":bridgeOk?"SYNC LÄUFT":"OFFLINE";pill.className=`sync-overall-pill ${allOk?"ok":bridgeOk?"work":"fail"}`;}
  const led=$("#syncGlanceLed"),title=$("#syncGlanceTitle"),text=$("#syncGlanceText");
  if(led)led.className=`sync-led ${allOk?"ok":bridgeOk?"work":"fail"}`;
  if(title)title.textContent=allOk?"Alles synchronisiert":bridgeOk?"Synchronisierung läuft":"Launcher noch nicht verbunden";
  if(text)text.textContent=allOk?`${library.widgets.length} Widgets · ${library.scenes.length} Scenes · Queue leer`:bridgeOk?(pending?`${pending} Event${pending===1?"":"s"} warten noch auf Sync.`:"Widgets / Cloud werden geprüft."):(bridge.lastError||"Verbinde den PC mit deinem Creator Account.");

  const terminal=$("#syncTerminal");
  if(terminal){
    terminal.innerHTML=syncHistory.length?syncHistory.map(row=>`<div class="sync-line ${escapeHtml(row.tone)}"><time>${escapeHtml(row.time)}</time><b>[${escapeHtml(row.kind)}]</b><span>${escapeHtml(row.message)}</span></div>`).join(""):`<div class="sync-terminal-empty">Noch keine Sync-Meldungen. Klicke auf „Sync prüfen“ oder warte auf den nächsten Heartbeat.</div>`;
    terminal.scrollTop=terminal.scrollHeight;
  }
}


function storedExperienceMode(){
  try{
    const value=String(localStorage.getItem(EXPERIENCE_STORAGE_KEY)||"").toLowerCase();
    if(value==="simple"||value==="pro")return value;
  }catch{}
  return "simple";
}

function renderExperienceHelp(pageName){
  const help=$("#experienceHelp");
  if(!help)return;
  const info=EXPERIENCE_HELP[String(pageName||"live")]||EXPERIENCE_HELP.live;
  const title=$("#experienceHelpTitle"),text=$("#experienceHelpText");
  if(title)title.textContent=info.title;
  if(text)text.textContent=info.text;
}

function applyExperienceMode(mode,{remember=true,announce=false,keepPage=false}={}){
  const next=String(mode||"").toLowerCase()==="pro"?"pro":"simple";
  experienceMode=next;
  document.documentElement.dataset.experience=next;
  document.body?.setAttribute("data-experience",next);
  $$('[data-experience-mode]').forEach(button=>{
    const active=button.dataset.experienceMode===next;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  $$('[data-setup-experience]').forEach(button=>button.classList.toggle("selected",button.dataset.setupExperience===next));
  const pill=$("#experienceSettingsPill");
  if(pill)pill.textContent=next==="pro"?"PROFI":"EINFACH";
  if(remember){try{localStorage.setItem(EXPERIENCE_STORAGE_KEY,next)}catch{}}
  const activePage=$('[data-page].active')?.dataset.page||"live";
  if(next==="simple"&&!keepPage&&PRO_ONLY_PAGES.has(activePage)){
    showPage("live");
    if(announce)toast("Einfach starten ist aktiv. Technische Bereiche sind ausgeblendet.");
    return;
  }
  renderExperienceHelp(activePage);
  if(announce)toast(next==="pro"?"Profi-Modus aktiviert. Alle Bereiche sind sichtbar.":"Einfach starten aktiviert. Nur wichtige Bereiche bleiben sichtbar.");
}

function setHomeHubCard(id,status,meta,tone="work"){
  const card=$(id);
  if(!card)return;
  card.classList.remove("ok","work","warn","fail","active");
  card.classList.add(tone||"work");
  const strong=card.querySelector("strong"),copy=card.querySelector("p");
  if(strong)strong.textContent=String(status||"OFFEN");
  if(copy)copy.textContent=String(meta||"");
}

function creatorToolUrl(pathname="/pages/widget-studio.html"){
  const base=String(state?.settings?.backendUrl||"https://cfs-zockt.de").trim().replace(/\/+$/g,"");
  const path=String(pathname||"").startsWith("/")?String(pathname):`/${String(pathname||"")}`;
  return `${base}${path}`;
}

async function runHomeHubAction(action){
  const key=String(action||"");
  if(key==="bridge"){showPage("bridge");return;}
  if(key==="tiktok"){
    showPage("bridge");
    requestAnimationFrame(()=>$("#providerSelect")?.scrollIntoView({behavior:"smooth",block:"center"}));
    return;
  }
  if(key==="widgets"){
    window.open(creatorToolUrl("/pages/widget-studio.html"),"_blank","noopener");
    return;
  }
  if(key==="output"){showPage("output");return;}
  if(key==="sync"){
    if(!state?.bridge?.connected){showPage("bridge");return;}
    try{state=await window.CFSLauncher.refreshCreatorLibrary();render(state);toast("Widget-Bibliothek synchronisiert.");}
    catch(error){toast(error.message,true);}
    return;
  }
  if(key==="live"){
    const details=$(".home-tech-details");
    $(".home-live-panel")?.scrollIntoView({behavior:"smooth",block:"center"});
    if(state?.preflight?.ok===false&&details)details.open=true;
  }
}

function renderHomeHub(nextState=state){
  if(!nextState)return;
  const bridge=nextState.bridge||{},settings=nextState.settings||{},library=nextState.creatorLibrary||{};
  const connected=Boolean(bridge.connected);
  const creator=bridge.creator||library.creator||{},profile=creator.profile||{};
  const creatorName=profile.display_name||creator.display_name||"Creator Account";
  const provider=String(settings.provider||"mock");
  const tiktokReady=provider==="tiktool"&&Boolean(String(settings.tiktokUsername||"").trim())&&Boolean(settings.tiktoolKeyStored);
  const simulator=provider==="mock";
  const loaded=Boolean(library.loadedAt&&!library.error);
  const widgets=Array.isArray(library.widgets)?library.widgets:[];
  const scenes=Array.isArray(library.scenes)?library.scenes:[];
  const output=nextState.localOutput||{};

  setHomeHubCard("#homeCardBridge",connected?"VERBUNDEN":"PC VERBINDEN",connected?`${creatorName} · Heartbeat ${fmtTime(bridge.lastHeartbeatAt)}`:(bridge.lastError||"Creator Account per Device-Link verbinden"),connected?"ok":"warn");
  setHomeHubCard("#homeCardTikTok",tiktokReady?"BEREIT":simulator?"SIMULATOR":"EINRICHTEN",tiktokReady?`@${settings.tiktokUsername} · LIVE-Daten vorbereitet`:simulator?"Testmodus aktiv · echte TikTok-Daten noch nicht verbunden":"TikTok LIVE Provider und Username einrichten",tiktokReady?"ok":simulator?"work":"warn");
  setHomeHubCard("#homeCardWidgets",loaded?(widgets.length?`${widgets.length} WIDGET${widgets.length===1?"":"S"}`:"NOCH LEER"):connected?"SYNC LÄUFT":"WARTET",loaded?(widgets.length?`${scenes.length} veröffentlichte Scene${scenes.length===1?"":"s"}`:"Erstelle dein erstes Widget im Widget Studio"):(library.error||"Nach Device-Link automatisch synchronisiert"),loaded&&widgets.length?"ok":connected?"work":"warn");
  setHomeHubCard("#homeCardOutput",output.running?(output.ready?"AKTIV":"LÄDT"):scenes.length?"BEREIT":"NOCH LEER",output.running?(output.ready?`${output.scene?.name||"Scene"} läuft als Local Output`:"Scene wird geladen"):scenes.length?`${scenes.length} Scene${scenes.length===1?"":"s"} für OBS / Output verfügbar`:"Zuerst eine Scene im Widget Studio veröffentlichen",output.running&&output.ready?"ok":scenes.length?"work":"warn");

  let next={title:"PC mit deinem Creator Account verbinden",label:"PC VERBINDEN",action:"bridge"};
  if(connected&&!loaded)next={title:"Deine Widgets vom Creator Account laden",label:"JETZT SYNCHRONISIEREN",action:"sync"};
  else if(connected&&loaded&&widgets.length===0)next={title:"Dein erstes Widget erstellen",label:"WIDGET STUDIO ÖFFNEN",action:"widgets"};
  else if(connected&&loaded&&widgets.length>0&&scenes.length===0)next={title:"Widgets im Stream Board prüfen und veröffentlichen",label:"WIDGET STUDIO ÖFFNEN",action:"widgets"};
  else if(connected&&scenes.length>0&&!output.running)next={title:"Deine veröffentlichte Scene für OBS / Output öffnen",label:"OUTPUT ÖFFNEN",action:"output"};
  else if(connected&&output.running&&!bridge.liveActive)next={title:"Output läuft – jetzt LIVE-Verbindung prüfen",label:"LIVE CONTROL",action:"live"};
  else if(connected&&bridge.liveActive)next={title:"Stream läuft – Synchronisierung im Blick behalten",label:"SYNC STATUS",action:"sync"};

  const title=$("#homeNextTitle"),button=$("#homeNextAction");
  if(title)title.textContent=next.title;
  if(button){button.textContent=next.label;button.dataset.hubAction=next.action;}
  const hint=$("#homeLiveHint");
  if(hint)hint.textContent=!connected?"Verbinde zuerst diesen PC. Danach führt dich der Launcher weiter.":bridge.liveActive?"LIVE Session läuft. Events, Widgets und Sync werden überwacht.":nextState.preflight?.ok===false?"Der Preflight hat noch offene Punkte. Öffne Technik & Tests für Details.":"Dein Setup wird automatisch geprüft. LIVE starten ist erst möglich, wenn die notwendigen Voraussetzungen passen.";
}

function applyMenuState(open,{remember=true}={}){
  const shell=$(".shell"),toggle=$("#launcherMenuToggle"),backdrop=$("#sidebarBackdrop");
  if(!shell||!toggle)return;
  menuOpen=Boolean(open);
  shell.classList.toggle("menu-open",menuOpen);
  shell.classList.toggle("menu-closed",!menuOpen);
  toggle.setAttribute("aria-expanded",String(menuOpen));
  toggle.setAttribute("aria-label",menuOpen?"Menü schließen":"Menü öffnen");
  if(backdrop)backdrop.hidden=!menuOpen||!window.matchMedia("(max-width: 900px)").matches;
  if(remember){try{localStorage.setItem("cfsLauncherMenuOpen",menuOpen?"1":"0")}catch{}}
}

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  voices = speechSynthesis.getVoices() || [];
  const select = $("#ttsVoiceName");
  if (!select) return;
  const selected = state?.settings?.ttsVoiceName || select.value || "";
  select.innerHTML = '<option value="">Systemstandard</option>' + voices
    .filter(v => /^de[-_]/i.test(v.lang) || /german|deutsch/i.test(v.name))
    .map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)} · ${escapeHtml(v.lang)}</option>`)
    .join("");
  select.value = voices.some(v => v.name === selected) ? selected : "";
}

function selectedVoice(name) {
  if (!name) return null;
  return voices.find(v => v.name === name) || null;
}

function renderUpdate(update = {}) {
  const status = String(update.status || "idle");
  const policy = state?.bridge?.releasePolicy || {};
  $("#updateCurrentVersion").textContent = update.currentVersion || state?.appVersion || "–";
  $("#updateLatestVersion").textContent = update.latestVersion || "–";
  $("#updateStatusText").textContent = update.message || "Bereit.";
  $("#updateProgress").style.width = `${Math.max(0, Math.min(100, Number(update.progress || 0)))}%`;
  $("#updateStatusPill").textContent = ({
    checking:"PRÜFEN", available:"VERFÜGBAR", downloading:"DOWNLOAD",
    downloaded:"BEREIT", current:"AKTUELL", error:"FEHLER",
    development:"DEV", unavailable:"NICHT VERFÜGBAR"
  })[status] || "BEREIT";
  $("#updateStatusPill").className = "pill" + (status === "downloaded" ? " online" : status === "error" ? " danger" : "");
  $("#downloadUpdate").hidden = status !== "available";
  $("#installUpdate").hidden = status !== "downloaded";

  $("#policyMinimum").textContent = policy.minimum_version || "–";
  $("#policyRecommended").textContent = policy.recommended_version || "–";
  $("#policyChannel").textContent = String(policy.channel || state?.settings?.updateChannel || "stable").toUpperCase();
  $("#policyRollout").textContent = policy.rollout?.percent == null
    ? "–"
    : `${policy.rollout.percent}% · ${policy.rollout.eligible ? "IN" : "WAIT"}`;
  $("#policyLiveGate").textContent = policy.live_allowed === false ? "BLOCKIERT" : "ERLAUBT";
  const notice = $("#policyNotice");
  notice.className = "policy-notice";
  if (policy.safety?.maintenance?.active) {
    $("#policyStatus").textContent = "WARTUNGSMODUS";
    notice.classList.add("danger");
    notice.textContent = policy.safety.maintenance.message || "Neue LIVE-Sessions sind vorübergehend gesperrt.";
  } else if (policy.version_blocked) {
    $("#policyStatus").textContent = "VERSION GESPERRT";
    notice.classList.add("danger");
    notice.textContent = policy.message || "Diese Launcher-Version ist serverseitig gesperrt.";
  } else if (policy.update_required) {
    $("#policyStatus").textContent = "UPDATE ERFORDERLICH";
    notice.classList.add("danger");
    notice.textContent = policy.message || `Diese Version liegt unter dem Cloud-Minimum ${policy.minimum_version}.`;
  } else if (policy.rollback_recommended) {
    $("#policyStatus").textContent = "ROLLBACK EMPFOHLEN";
    notice.classList.add("warn");
    notice.textContent = policy.message || `Creator Cloud empfiehlt vorübergehend Version ${policy.recommended_version}.`;
  } else if (policy.update_available) {
    $("#policyStatus").textContent = "UPDATE VERFÜGBAR";
    notice.classList.add("warn");
    notice.textContent = `Creator Cloud empfiehlt Version ${policy.recommended_version}. Deine Version bleibt kompatibel.`;
  } else if (policy.status === "rollout_pending") {
    $("#policyStatus").textContent = "ROLLOUT WARTET";
    notice.textContent = policy.message || "Die nächste Version wird gestaffelt ausgerollt.";
  } else if (policy.compatible === true) {
    $("#policyStatus").textContent = "KOMPATIBEL";
    notice.textContent = "Deine installierte Version erfüllt die aktuelle Creator-Cloud-Policy.";
  } else {
    $("#policyStatus").textContent = "NOCH UNBEKANNT";
    notice.textContent = "Release-Policy wird nach erfolgreicher Bridge-Verbindung geladen.";
  }
}

function renderPreflight(preflight = {}) {
  const checks = Array.isArray(preflight.checks) ? preflight.checks : [];
  const host = $("#preflightGrid");
  if (host) host.innerHTML = checks.map(item => `
    <div class="preflight-item ${item.ok ? "ok" : item.blocking ? "fail" : "warn"}">
      <span>${item.ok ? "✓" : item.blocking ? "!" : "•"}</span>
      <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail || "")}</small></div>
    </div>`).join("") || '<div class="preflight-empty">Preflight noch nicht ausgeführt.</div>';
  const pill = $("#preflightPill");
  if (pill) {
    pill.textContent = preflight.ok ? "BEREIT" : checks.length ? "PRÜFEN" : "OFFEN";
    pill.className = "pill" + (preflight.ok ? " online" : (preflight.blockers?.length ? " danger" : ""));
  }
}


function renderStreamBot(){
  const connected=Boolean(state?.bridge?.connected);
  const cfg=streamBotConfig||{enabled:false,prefix:"!",commands:[]};
  const commands=Array.isArray(cfg.commands)?cfg.commands:[];
  const enabled=$("#streamBotEnabled"),prefix=$("#streamBotPrefix"),host=$("#streamBotCommands"),pill=$("#streamBotPill"),count=$("#streamBotCommandCount"),meta=$("#streamBotCreatorMeta");
  if(enabled){enabled.value=String(cfg.enabled===true);enabled.disabled=!connected;}
  if(prefix){prefix.value=cfg.prefix||"!";prefix.disabled=!connected;}
  if(pill){pill.textContent=!connected?"BRIDGE OFFLINE":!streamBotLoaded?"BEREIT ZUM LADEN":cfg.enabled?"AKTIV":"AUS";pill.className="pill"+(connected&&cfg.enabled?" online":"");}
  if(count)count.textContent=`${commands.length} COMMAND${commands.length===1?"":"S"}`;
  if(meta){const creator=state?.bridge?.creator||{};meta.textContent=connected?`Creatorbezogen synchronisiert${creator.display_name?` · ${creator.display_name}`:""}. Andere Creator erhalten eigene Regeln.`:"Bridge verbinden, um creatorbezogene Bot-Regeln zu laden.";}
  for(const id of ["#refreshStreamBot","#saveStreamBot","#addStreamBotCommand","#testStreamBotChat"]){const el=$(id);if(el)el.disabled=!connected;}
  if(!host)return;
  if(!connected){host.innerHTML='<div class="bot-empty">Verbinde zuerst diesen PC mit einem Creator Account.</div>';return;}
  if(!streamBotLoaded){host.innerHTML='<div class="bot-empty">Öffne den Stream Bot oder klicke auf „Neu laden“.</div>';return;}
  host.innerHTML=commands.length?commands.map((row,index)=>`
    <article class="bot-command-card" data-bot-row="${index}">
      <div class="bot-command-head">
        <label class="bot-command-toggle"><input type="checkbox" data-bot-enabled ${row.enabled!==false?"checked":""}><span>AKTIV</span></label>
        <strong>${escapeHtml((cfg.prefix||"!")+(row.command||"command"))}</strong>
        <button type="button" class="bot-delete" data-bot-delete="${index}" aria-label="Command löschen">×</button>
      </div>
      <div class="bot-command-grid">
        <label><span>COMMAND</span><div class="bot-command-input"><b>${escapeHtml(cfg.prefix||"!")}</b><input data-bot-command maxlength="24" value="${escapeHtml(row.command||"")}" placeholder="discord"></div></label>
        <label><span>AUSGABE</span><select data-bot-mode><option value="overlay" ${row.response_mode==="overlay"?"selected":""}>Chat Overlay</option><option value="tts" ${row.response_mode==="tts"?"selected":""}>Launcher TTS</option><option value="both" ${row.response_mode==="both"?"selected":""}>Overlay + TTS</option></select></label>
        <label class="bot-response"><span>ANTWORT</span><textarea data-bot-response maxlength="220" rows="2" placeholder="Antwort im Stream">${escapeHtml(row.response||"")}</textarea></label>
        <label><span>COOLDOWN</span><div class="bot-cooldown"><input data-bot-cooldown type="number" min="0" max="600" value="${Number(row.cooldown_seconds||0)}"><b>Sek.</b></div></label>
      </div>
    </article>`).join(""):'<div class="bot-empty">Noch keine Commands. Klicke auf „+ Command“.</div>';
  $$('[data-bot-delete]',host).forEach(btn=>btn.onclick=()=>{streamBotConfig.commands.splice(Number(btn.dataset.botDelete),1);renderStreamBot();});
}

function collectStreamBot(){
  const prefix=String($("#streamBotPrefix")?.value||"!").replace(/\s/g,"").slice(0,3)||"!";
  const commands=$$("[data-bot-row]").map(card=>({
    enabled:card.querySelector("[data-bot-enabled]")?.checked!==false,
    command:String(card.querySelector("[data-bot-command]")?.value||"").trim().toLowerCase().replace(/^[!/#]+/,"").replace(/[^a-z0-9_-]/g,"").slice(0,24),
    response:String(card.querySelector("[data-bot-response]")?.value||"").trim().slice(0,220),
    response_mode:String(card.querySelector("[data-bot-mode]")?.value||"overlay"),
    cooldown_seconds:Math.max(0,Math.min(600,Math.round(Number(card.querySelector("[data-bot-cooldown]")?.value||0))))
  })).filter(row=>row.command&&row.response).slice(0,30);
  return {enabled:$("#streamBotEnabled")?.value==="true",prefix,commands};
}

async function loadStreamBot({silent=false}={}){
  if(!state?.bridge?.connected){streamBotLoaded=false;renderStreamBot();if(!silent)toast("Creator Bridge ist nicht verbunden.",true);return;}
  try{
    const data=await window.CFSLauncher.getStreamBot();
    streamBotConfig=data?.stream_bot||{enabled:false,prefix:"!",commands:[]};
    streamBotLoaded=true;renderStreamBot();
    if(!silent)toast("Stream-Bot-Regeln geladen.");
  }catch(error){streamBotLoaded=false;renderStreamBot();if(!silent)toast(error.message,true);}
}

async function saveStreamBotSettings(){
  if(!state?.bridge?.connected)throw new Error("Creator Bridge ist nicht verbunden.");
  const cfg=collectStreamBot();
  const data=await window.CFSLauncher.saveStreamBot(cfg);
  streamBotConfig=data?.stream_bot||cfg;streamBotLoaded=true;renderStreamBot();
  toast("Stream Bot für diesen Creator gespeichert.");
}

function renderEventMonitor(monitor = {}) {
  const counts = monitor.counts || {};
  const amounts = monitor.amounts || {};
  const viewer = monitor.viewer || {};
  const coverage = monitor.coverage || {};
  const types = [
    ["follow","Follow"],
    ["like","LIVE Likes"],
    ["gift","Gifts"],
    ["share","Shares"],
    ["viewer_update","Viewer"]
  ];
  $("#eventFollow").textContent = String(amounts.follows || counts.follow || 0);
  $("#eventLikes").textContent = String(amounts.likes || 0);
  $("#eventGifts").textContent = String(amounts.gifts || 0);
  $("#eventShares").textContent = String(amounts.shares || 0);
  $("#eventViewerPeak").textContent = String(viewer.peak || 0);
  if($("#eventChat")) $("#eventChat").textContent = String(counts.chat || 0);
  if($("#eventChatState")){const seen=Number(counts.chat||0)>0;$("#eventChatState").textContent=seen?"CHAT EMPFANGEN":"noch keine Nachricht";$("#eventChatState").className=seen?"event-seen":"";}

  for (const [key,id] of [
    ["follow","eventFollowState"],["like","eventLikesState"],["gift","eventGiftsState"],
    ["share","eventSharesState"],["viewer_update","eventViewerState"]
  ]) {
    const el = $("#"+id);
    if (el) el.textContent = coverage[key] ? "REAL EVENT GESEHEN" : "noch nicht gesehen";
    if (el) el.className = coverage[key] ? "event-seen" : "";
  }

  const passed = types.filter(([key]) => coverage[key]).length;
  $("#coveragePill").textContent = `${passed} / ${types.length}`;
  $("#coveragePill").className = "pill" + (passed === types.length ? " online" : "");
  $("#coverageGrid").innerHTML = types.map(([key,label]) => `
    <div class="coverage-item ${coverage[key] ? "done" : ""}">
      <span>${coverage[key] ? "✓" : "○"}</span>
      <div><strong>${label}</strong><small>${coverage[key] ? "empfangen" : "ausstehend"}</small></div>
    </div>`).join("");

  const recent = Array.isArray(monitor.recent) ? monitor.recent : [];
  $("#eventTraceCount").textContent = `${recent.length} EVENTS`;
  $("#eventTrace").innerHTML = recent.length ? recent.map(item => `
    <div class="trace-row">
      <span class="trace-type ${escapeHtml(item.type)}">${escapeHtml(item.type)}</span>
      <div class="trace-main">
        <strong>${escapeHtml(item.actor || (item.type === "viewer_update" ? "Room" : "Unbekannt"))}</strong>
        <small>${item.type==="chat"?escapeHtml(item.message||""):`${escapeHtml(item.gift_name || "")}${item.amount ? `${item.gift_name ? " · " : ""}×${Number(item.amount)}` : ""}`}</small>
      </div>
      <time>${item.at ? new Date(item.at).toLocaleTimeString("de-DE") : "–"}</time>
    </div>`).join("") : '<div class="event-trace-empty">Noch keine LIVE Events empfangen.</div>';
}


function setSetupStep(step) {
  setupStep = Math.max(1, Math.min(4, Number(step) || 1));
  $$("[data-setup-step]").forEach(el => el.classList.toggle("active", Number(el.dataset.setupStep) === setupStep));
  $("#setupProgress").textContent = `${setupStep} / 4`;
  $("#setupBack").hidden = setupStep === 1;
  $("#setupNext").hidden = setupStep === 4;
  $("#setupFinish").hidden = setupStep !== 4;
}

function openSetupWizard() {
  const settings = state?.settings || {};
  $("#setupBackendUrl").value = settings.backendUrl || "https://cfs-zockt.de";
  $("#setupMachineName").value = settings.machineName || "";
  $("#setupProvider").value = settings.provider || "mock";
  $("#setupTikTokUsername").value = settings.tiktokUsername || "";
  $("#setupBridgeToken").value = "";
  $("#setupTiktoolKey").value = "";
  renderDeviceLinkState(state);
  $("#setupEncryption").textContent = state?.encryptionAvailable
    ? "Lokale Betriebssystem-Verschlüsselung ist verfügbar."
    : "Lokale Verschlüsselung fehlt. Ein neuer Bridge-Key kann nicht sicher gespeichert werden.";
  $("#setupEncryption").className = "notice" + (state?.encryptionAvailable ? "" : " warn");
  setupCheckOk = false;
  $("#setupChecks").innerHTML = "<span>Noch nicht geprüft.</span>";
  setSetupStep(1);
  $("#setupWizard").hidden = false;
}

function closeSetupWizard() {
  $("#setupWizard").hidden = true;
}

function wizardPayload() {
  return {
    backendUrl:$("#setupBackendUrl").value,
    machineName:$("#setupMachineName").value,
    bridgeToken:$("#setupBridgeToken").value,
    provider:$("#setupProvider").value,
    tiktokUsername:$("#setupTikTokUsername").value,
    tiktoolApiKey:$("#setupTiktoolKey").value
  };
}

function renderObsDoctor(result) {
  const host = $("#obsDoctorResult");
  if (!result) {
    host.innerHTML = '<div class="obs-doctor-empty">Noch keine Browser Source geprüft.</div>';
    return;
  }
  const checks = Array.isArray(result.checks) ? result.checks : [];
  host.innerHTML = `
    <div class="obs-doctor-head">
      <div><span>ERGEBNIS</span><strong>${result.ok ? "OBS SOURCE BEREIT" : "PRÜFUNG FEHLGESCHLAGEN"}</strong></div>
      <b class="${result.ok ? "ok" : "fail"}">${result.ok ? "PASS" : "FAIL"}</b>
    </div>
    <div class="obs-doctor-checks">${checks.map(item => `
      <div class="${item.ok ? "ok" : item.warning ? "warn" : "fail"}">
        <span>${item.ok ? "✓" : item.warning ? "•" : "!"}</span>
        <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail || "")}</small></div>
      </div>`).join("")}</div>
    <div class="obs-doctor-meta"><span>${escapeHtml(result.url || "")}</span><b>${Number(result.latencyMs || 0)} ms</b></div>`;
}


function renderSystem(next = {}) {
  const ready = next.creatorReady || {score:0,checks:[],blockers:[]};
  const health = next.cloudHealth || {};
  const score = Math.max(0, Math.min(100, Number(ready.score || 0)));
  $("#creatorReadyScore").style.setProperty("--score", `${score}%`);
  $("#creatorReadyScore").innerHTML = `<strong>${score}%</strong><span>CREATOR READY</span>`;
  $("#creatorReadyKicker").textContent = ready.ready ? "SYSTEM BEREIT" : `${Number(ready.blockers?.length || 0)} OFFENE PUNKTE`;
  $("#creatorReadyTitle").textContent = ready.ready ? "Creator Suite ist bereit." : "Vor LIVE fehlen noch Voraussetzungen.";
  $("#creatorReadyText").textContent = ready.ready
    ? "Cloud, Bridge, Provider-Grundlage und Recovery sind einsatzbereit."
    : (ready.blockers || []).map(x => x.label).join(" · ") || "Systemcheck läuft.";
  $("#creatorReadyChecks").innerHTML = (ready.checks || []).map(item => `
    <div class="${item.ok ? "ok" : "fail"}">
      <span>${item.ok ? "✓" : "!"}</span>
      <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail || "")}</small></div>
    </div>`).join("");

  $("#cloudHealthPill").textContent = health.ok ? "ONLINE" : "OFFLINE";
  $("#cloudHealthPill").className = "pill" + (health.ok ? " online" : " danger");
  $("#cloudHealthStatus").textContent = health.status || (health.online ? "online" : "offline");
  $("#cloudHealthDb").textContent = health.database ? "CONNECTED" : "OFFLINE";
  $("#cloudHealthVersion").textContent = health.version || "–";
  $("#cloudHealthLatency").textContent = health.latencyMs == null ? "–" : `${Number(health.latencyMs)} ms`;

  const modules = health.modules || {};
  $("#cloudModules").innerHTML = Object.keys(modules).length
    ? Object.entries(modules).map(([key,value]) => `<span class="${value === "online" ? "online" : ""}"><b>${escapeHtml(key)}</b>${escapeHtml(value)}</span>`).join("")
    : `<span><b>health</b>${escapeHtml(health.error || "keine Daten")}</span>`;

  const points = Array.isArray(next.recoveryPoints) ? next.recoveryPoints : [];
  $("#recoveryList").innerHTML = points.length ? points.map(point => `
    <div class="recovery-row">
      <div class="recovery-icon">↺</div>
      <div class="recovery-copy">
        <strong>${escapeHtml(point.reason || "restore")}</strong>
        <small>${point.created_at ? new Date(point.created_at).toLocaleString("de-DE") : "–"} · Launcher ${escapeHtml(point.launcher_version || "–")} · ${Object.keys(point.files || {}).length} Dateien</small>
      </div>
      <button class="btn recovery-restore" data-restore-id="${escapeHtml(point.id)}">WIEDERHERSTELLEN</button>
    </div>`).join("") : '<div class="recovery-empty">Noch keine Restore Points.</div>';
}

function renderDeviceLinkState(nextState=state){
  const settings=nextState?.settings||{};
  const link=settings.deviceLink||null;
  const pending=Boolean(settings.deviceLinkPending&&link);
  const connected=Boolean(nextState?.bridge?.connected||settings.tokenStored);
  const code=$("#setupDeviceCode"),status=$("#setupDeviceStatus"),open=$("#setupOpenDeviceLink"),check=$("#setupCheckDeviceLink");
  if(!code||!status)return;
  if(connected&&!pending){
    code.textContent="VERBUNDEN";
    status.textContent="Dieser PC ist mit deinem CFS Creator Account verbunden.";
  }else if(pending){
    code.textContent=link.userCode||"CFS-…";
    const expires=link.expiresAt?new Date(link.expiresAt):null;
    status.textContent=expires?`Warte auf Bestätigung · gültig bis ${expires.toLocaleTimeString("de-DE")}`:"Warte auf Bestätigung auf der Website.";
  }else{
    code.textContent="NOCH NICHT GESTARTET";
    status.textContent="Starte die Verknüpfung, um einen einmaligen Code zu erhalten.";
  }
  if(open){open.disabled=!pending;open.dataset.url=pending?link.verificationUrl||"":""}
  if(check)check.disabled=!pending;
  const start=$("#setupStartDeviceLink");
  if(start)start.textContent=pending?"NEUEN CODE ERZEUGEN":connected?"NEU VERKNÜPFEN":"GERÄT VERKNÜPFEN";
}

function renderCreatorIdentity(bridge = {}) {
  const creator=bridge.creator||{};
  const profile=creator.profile||{};
  const name=profile.display_name||creator.display_name||"Noch kein Creator verbunden";
  $("#creatorDisplayName").textContent=name;
  const betaActive=creator.beta?.active===true;
  const betaSuffix=betaActive?" · BETA TESTER":"";
  const sub=creator.subscription||{},billingSuffix=sub.access_active?` · BILLING ${String(sub.plan||"").toUpperCase()}${sub.cancel_at_period_end?" BIS PERIODENENDE":""}`:sub.status==="past_due"?" · BILLING ZAHLUNG OFFEN":"";
  $("#creatorAccountMeta").textContent=profile.connected
    ?`TikTok synchronisiert · ${profile.updated_at ? new Date(profile.updated_at).toLocaleString("de-DE") : "bereit"}${billingSuffix}${betaSuffix}`
    :`Creator Account verbunden · TikTok Profil noch nicht synchronisiert${billingSuffix}${betaSuffix}`;
  $("#creatorFollowers").textContent=profile.connected ? Number(profile.followers||0).toLocaleString("de-DE") : "–";
  $("#creatorLikes").textContent=profile.connected ? Number(profile.likes_total||0).toLocaleString("de-DE") : "–";
  $("#creatorPlan").textContent=String(creator.effective_plan||creator.plan||"–").toUpperCase();
  const library=state?.creatorLibrary||{};
  $("#creatorWidgetCount").textContent=Array.isArray(library.widgets)?String(library.widgets.length):"–";
  $("#creatorSceneCount").textContent=Array.isArray(library.scenes)?String(library.scenes.length):"–";
  const avatar=$("#creatorAvatar");
  avatar.innerHTML=profile.avatar_url
    ?`<img src="${escapeHtml(profile.avatar_url)}" alt="">`
    :escapeHtml(String(name).slice(0,2).toUpperCase());
  $("#creatorIdentity").classList.toggle("connected",Boolean(creator.display_name||profile.connected));
}

function currentCreatorFeatures(){
  return state?.bridge?.creator?.features || state?.creatorLibrary?.creator?.features || {};
}
function deckSlotAllowed(button){
  const features=currentCreatorFeatures(),match=/^slot_(\d+)$/.exec(String(button?.id||"")),index=match?Number(match[1]):0;
  return features.stream_deck===true&&index>0&&index<=Number(features.max_stream_deck_buttons||0);
}
function deckActionPlanAllowed(button){
  const features=currentCreatorFeatures();
  const required={live_toggle:"live_bridge",scene_next:"local_output",scene_start:"local_output",output_stop:"local_output",output_reload:"local_output",alert_follow:"alerts",alert_gift:"alerts",alert_share:"alerts",autothanks_toggle:"auto_thanks",widget_toggle:"local_output",counter_plus_1:"widget_studio",counter_minus_1:"widget_studio",counter_plus_5:"widget_studio",counter_reset:"widget_studio",timer_toggle:"widget_studio",timer_reset:"widget_studio",timer_plus_60:"widget_studio",timer_minus_60:"widget_studio",game_toggle:"games",game_score_a:"games",game_score_b:"games",game_reset:"games",open_cut_project:"cut_studio"}[button?.action];
  return !required||features[required]===true;
}
function renderBetaCenter(nextState=state){
  const c=nextState?.betaCenter||{},cloud=c.cloud||{},beta=cloud.beta||nextState?.bridge?.creator?.beta||{},local=c.localSession||{},active=Boolean(beta.active),session=cloud.active_session||(local.active?{id:local.sessionId,label:local.label,started_at:local.startedAt}:null),banner=$("#betaAccessBanner");
  if(banner){banner.className="entitlement-banner "+(active?"beta":"beta-off");banner.textContent=active?"BETA TESTER AKTIV · FEEDBACK UND TESTSESSIONS FREIGESCHALTET":"BETA TEST IST FÜR DIESEN CREATOR NICHT AKTIV"}
  $("#betaSessionPill").textContent=session?"RUNNING":"OFF";$("#betaSessionId").textContent=session?.id?String(session.id).slice(0,12)+"…":"–";$("#betaSessionStarted").textContent=session?.started_at?new Date(session.started_at).toLocaleTimeString("de-DE"):"–";$("#betaRecentFeedback").textContent=String((cloud.recent_feedback||[]).length);$("#betaLauncherVersion").textContent=nextState?.appVersion||"–";$("#startBetaSession").disabled=!active||Boolean(session);$("#endBetaSession").disabled=!active||!session;$("#submitBetaFeedback").disabled=!active;
  const gate=nextState?.outputGate?.summary||{};$("#betaDiagBridge").textContent=nextState?.bridge?.connected?"ONLINE":"OFFLINE";$("#betaDiagLive").textContent=nextState?.bridge?.liveActive?"LIVE":"OFF";$("#betaDiagOutput").textContent=nextState?.localOutput?.running?(nextState.localOutput.ready?"READY":"LÄDT"):"OFF";$("#betaDiagGate").textContent=`${Number(gate.pass||0)} PASS / ${Number(gate.fail||0)} FAIL / ${Number(gate.untested||0)} OFFEN`;
}

function renderEntitlementBanners(){
  const features=currentCreatorFeatures(),deck=$("#deckEntitlementBanner"),output=$("#outputEntitlementBanner");
  if(deck){const ok=features.stream_deck===true;deck.className="entitlement-banner "+(ok?"ok":"lock");deck.textContent=ok?`STREAM DECK FREIGESCHALTET · ${Number(features.max_stream_deck_buttons||0)} TASTEN`:"STREAM DECK BENÖTIGT CREATOR / PRO ODER AKTIVE BETA-FREIGABE";}
  if(output){const ok=features.local_output===true;output.className="entitlement-banner "+(ok?"ok":"lock");output.textContent=ok?"LOCAL OUTPUT FREIGESCHALTET":"LOCAL OUTPUT BENÖTIGT CREATOR / PRO ODER AKTIVE BETA-FREIGABE";if($("#startLocalOutput"))$("#startLocalOutput").disabled=!ok;}
}

function deckActionDefinition(actionKey){
  return (state?.streamDeck?.action_catalog||[]).find(action=>action.key===actionKey)||{key:actionKey,label:actionKey,icon:"·",target_kind:"none"};
}

function activeSceneWidgetVisible(widgetId){
  const output=state?.localOutput||{};
  const id=String(widgetId||"");
  if(Object.prototype.hasOwnProperty.call(output.widgetVisibility||{},id))return Boolean(output.widgetVisibility[id]);
  const item=output.scene?.items?.find(item=>String(item.widget_id)===id);
  return item?item.visible!==false:false;
}

function deckButtonActive(button){
  const action=button.action;
  if(action==="live_toggle")return Boolean(state?.bridge?.liveActive);
  if(action==="autothanks_toggle")return state?.settings?.ttsEnabled!==false;
  if(action==="scene_start")return String(state?.localOutput?.scene?.id||"")===String(button.target||"");
  if(action==="widget_toggle")return activeSceneWidgetVisible(button.target);
  if(action==="game_toggle")return state?.creatorLibrary?.game?.status==="running";
  return false;
}

function deckButtonDisabled(button){
  const action=button.action;
  const outputRunning=Boolean(state?.localOutput?.running);
  if(["output_stop","output_reload","alert_follow","alert_gift","alert_share","widget_toggle"].includes(action)&&!outputRunning)return true;
  const def=deckActionDefinition(action);
  if(def.target_kind!=="none"&&!button.target)return true;
  return false;
}

function renderStreamDeck(nextState=state){
  const deck=nextState?.streamDeck||{};
  const activeProfile=String(deck.active_profile||"live");
  const profileMeta=deckProfileMeta(activeProfile,deck);
  const buttons=deck.buttons||[];
  $$('[data-deck-profile]').forEach(button=>{
    const active=String(button.dataset.deckProfile||"")===activeProfile;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",active?"true":"false");
  });
  if($("#deckPagePill"))$("#deckPagePill").textContent=profileMeta.label.toUpperCase();
  if($("#deckPageTitle"))$("#deckPageTitle").textContent=profileMeta.label;
  if($("#deckPageDescription"))$("#deckPageDescription").textContent=profileMeta.description;
  if($("#deckControlsTitle"))$("#deckControlsTitle").textContent=profileMeta.label;
  if($("#deckControlsDescription"))$("#deckControlsDescription").textContent=`12 Tasten für ${profileMeta.label}. Bearbeiten ändert nur diese Seite.`;
  const grid=$("#streamDeckGrid");
  if(grid){
    grid.innerHTML=buttons.map((button,index)=>{
      const def=(deck.action_catalog||[]).find(action=>action.key===button.action)||{label:button.action,icon:"·"};
      const planAllowed=deckSlotAllowed(button)&&deckActionPlanAllowed(button);
      const active=deckButtonActive(button),disabled=deckButtonDisabled(button)||!planAllowed,editing=streamDeckEditingId===button.id;
      const tone=deckActionTone(button.action);
      const color=deckButtonColor(button.color);
      const icon=deckButtonIcon(button,def);
      return `<button class="stream-key tone-${tone} user-color-${color} ${active?"active":""} ${disabled?"disabled":""} ${!planAllowed?"plan-locked":""} ${editing?"editing":""}" data-deck-button="${escapeHtml(button.id)}" data-deck-action="${escapeHtml(button.action)}" ${disabled&&!streamDeckEditMode?"disabled":""}>
        <span class="stream-key-slot">${String(index+1).padStart(2,"0")}</span>
        <span class="stream-key-icon">${escapeHtml(icon)}</span>
        <span class="stream-key-label">${escapeHtml(button.label||"BUTTON")}</span>
        <span class="stream-key-action">${escapeHtml(def.label||button.action)}</span>
      </button>`;
    }).join("");
  }

  const creator=nextState?.bridge?.creator||nextState?.creatorLibrary?.creator||{};
  const creatorProfile=creator.profile||{};
  $("#deckCreatorName").textContent=creatorProfile.display_name||creator.display_name||"Nicht verbunden";
  $("#deckCreatorMeta").textContent=creatorProfile.connected?"TikTok synchronisiert · Creator Cloud verbunden":"Creator Account / TikTok noch nicht vollständig verbunden";
  $("#deckFollowers").textContent=creatorProfile.connected?Number(creatorProfile.followers||0).toLocaleString("de-DE"):"–";
  $("#deckLikes").textContent=creatorProfile.connected?Number(creatorProfile.likes_total||0).toLocaleString("de-DE"):"–";
  $("#deckPlan").textContent=String(creator.effective_plan||creator.plan||"–").toUpperCase();
  $("#deckLiveState").textContent=nextState?.bridge?.liveActive?"ON":"OFF";
  $("#deckLiveState").className=nextState?.bridge?.liveActive?"on":"";
  $("#deckOutputState").textContent=nextState?.localOutput?.running?(nextState.localOutput.ready?"ON":"LOAD"):"OFF";
  $("#deckOutputState").className=nextState?.localOutput?.running?"on":"";
  $("#deckTtsState").textContent=nextState?.settings?.ttsEnabled!==false?"ON":"OFF";
  $("#deckTtsState").className=nextState?.settings?.ttsEnabled!==false?"on":"";
  const avatar=$("#deckAvatar");
  avatar.innerHTML=creatorProfile.avatar_url?`<img src="${escapeHtml(creatorProfile.avatar_url)}" alt="">`:escapeHtml(String(creatorProfile.display_name||creator.display_name||"CFS").slice(0,2).toUpperCase());

  $("#streamDeckEdit").textContent=streamDeckEditMode?"FERTIG":"BEARBEITEN";
}

function renderDeckEditor(buttonId){
  const button=(state?.streamDeck?.buttons||[]).find(item=>item.id===buttonId);
  if(!button)return;
  streamDeckEditingId=button.id;
  $("#streamDeckEditor").hidden=false;
  $("#deckEditorTitle").textContent=`${button.id.replace("slot_","BUTTON ")} · ${button.label}`;
  $("#deckButtonLabel").value=button.label||"";
  const actions=state?.streamDeck?.action_catalog||[];
  $("#deckButtonAction").innerHTML=deckActionOptions(actions,button.action);
  $("#deckButtonAction").value=button.action;
  streamDeckEditorColor=deckButtonColor(button.color);
  $("#deckButtonIcon").value=String(button.icon||"").slice(0,4);
  $$("[data-deck-color]").forEach(el=>el.classList.toggle("selected",el.dataset.deckColor===streamDeckEditorColor));
  $$("[data-deck-icon]").forEach(el=>el.classList.toggle("selected",el.dataset.deckIcon===String(button.icon||"")));
  renderDeckTarget(button.action,button.target);
  renderDeckButtonPreview();
  renderStreamDeck(state);
}

function renderDeckTarget(actionKey,currentTarget=""){
  const def=deckActionDefinition(actionKey);
  const wrap=$("#deckTargetWrap"),select=$("#deckButtonTarget");
  wrap.hidden=def.target_kind==="none";
  if(def.target_kind==="scene"){
    $("#deckTargetLabel").textContent="SCENE";
    const scenes=state?.creatorLibrary?.scenes||[];
    select.innerHTML='<option value="">Scene auswählen…</option>'+scenes.map(scene=>`<option value="${escapeHtml(scene.id)}">${escapeHtml(scene.name||"Scene")}</option>`).join("");
  }else if(def.target_kind==="widget"){
    $("#deckTargetLabel").textContent=def.widget_filter==="manual_timer"?"TIMER-WIDGET":def.widget_filter==="manual_counter"?"COUNTER-WIDGET":"WIDGET";
    const allWidgets=state?.creatorLibrary?.widgets||[];
    const manualCounterTypes=new Set(["manual_counter","wins_counter","deaths_counter","manual_goal"]);
    const widgets=def.widget_filter==="manual_timer"
      ? allWidgets.filter(widget=>String(widget.widget_type||"")==="stream_timer")
      : def.widget_filter==="manual_counter"
        ? allWidgets.filter(widget=>manualCounterTypes.has(String(widget.widget_type||"")))
        : allWidgets;
    select.innerHTML='<option value="">Widget auswählen…</option>'+widgets.map(widget=>`<option value="${escapeHtml(widget.id)}">${escapeHtml(widget.name||widget.widget_type||"Widget")}</option>`).join("");
  }else if(def.target_kind==="cut_project"){
    $("#deckTargetLabel").textContent="CUT-PROJEKT";
    const projects=state?.creatorLibrary?.cutProjects||[];
    select.innerHTML='<option value="">Projekt auswählen…</option>'+projects.map(project=>`<option value="${escapeHtml(project.id)}">${escapeHtml(project.title||"Cut Projekt")}</option>`).join("");
  }else{
    select.innerHTML="";
  }
  if([...select.options].some(option=>option.value===String(currentTarget||"")))select.value=String(currentTarget||"");
  renderDeckTargetPreview(actionKey,select.value||"");
  $("#deckActionHint").textContent=def.target_kind==="scene"
    ?"Dieser Button startet die gewählte veröffentlichte Scene als lokalen Output."
    :def.target_kind==="widget"&&def.widget_filter==="manual_counter"
      ?"Wähle Freier Counter, Siege, Tode oder ein manuelles Goal. Der Wert wird direkt im Creator-Widget gespeichert und erscheint im Stream."
      :def.target_kind==="widget"&&def.widget_filter==="manual_timer"
        ?"Wähle deinen Stream Timer. Start/Pause, Reset und Zeitänderungen wirken direkt auf das veröffentlichte Widget."
        :def.target_kind==="widget"
          ?"Widget-Toggle wirkt nur auf die aktive lokale Scene und verändert nicht die veröffentlichte Cloud-Konfiguration."
          :def.target_kind==="cut_project"
            ?"Der Button öffnet genau dieses Cut-Projekt in deinem eingeloggten Creator Account."
            :"Diese Aktion benötigt kein zusätzliches Ziel.";
}

function renderCreatorTools(nextState=state){
  const library=nextState?.creatorLibrary||{},game=library.game||{},config=game.config||{},score=game.state||{},running=game.status==="running",features=currentCreatorFeatures();
  const pill=$("#toolsGamePill");
  if(!pill)return;
  pill.textContent=running?"RUNNING":"IDLE";pill.className="pill"+(running?" ok":"");
  $("#toolsGameTitle").textContent=game.title||config.title||"Community Battle";
  $("#toolsTeamA").textContent=config.team_a_name||"TEAM A";$("#toolsTeamB").textContent=config.team_b_name||"TEAM B";
  $("#toolsScoreA").textContent=String(Number(score.score_a||0));$("#toolsScoreB").textContent=String(Number(score.score_b||0));
  $("#toolsGameTarget").textContent=String(Number(score.target_score||config.target_score||100));$("#toolsGameRound").textContent=String(Number(score.round||1));$("#toolsGameAccess").textContent=features.games===true?"FREI":"GESPERRT";
  $("#toolsGameRuleCount").textContent=String((library.gameRules||[]).filter(rule=>rule.enabled!==false).length);
  $("#toolsGameHitCount").textContent=String((library.gameRuleHits||[]).length);
  $("#toolsGameStart").disabled=features.games!==true||running;$("#toolsGameStop").disabled=features.games!==true||!running;$("#toolsGameReset").disabled=features.games!==true;
  $("#toolsScoreAPlus").disabled=features.games!==true||!running;$("#toolsScoreBPlus").disabled=features.games!==true||!running;
  const url=game.source_url||"";$("#toolsGameUrl").value=url;$("#toolsCopyGameUrl").disabled=!url;$("#toolsPreviewGame").disabled=!url;$("#toolsPreviewGame").dataset.url=url;

  const projects=library.cutProjects||[],jobs=library.cutJobs||[],sources=nextState?.mediaSources?.sources||{},media=nextState?.mediaEngine||{};
  $("#toolsCutCount").textContent=String(projects.length);$("#toolsCutClips").textContent=String(projects.reduce((sum,p)=>sum+Number(p.clip_count||0),0));$("#toolsCutJobs").textContent=String(jobs.filter(job=>["queued","claimed","processing"].includes(job.status)).length);
  const checked=Boolean(media.checkedAt),available=Boolean(media.available);
  $("#toolsMediaStatus").textContent=!checked?"NICHT GEPRÜFT":available?"BEREIT":"FEHLT";
  $("#toolsMediaStatus").className=available?"source-ok":checked?"source-missing":"";
  $("#toolsMediaVersion").textContent=media.version||media.ffmpegPath||"FFmpeg noch nicht erkannt";
  const caps=media.capabilities||{},enc=caps.encoders||{};
  $("#toolsMediaFilters").textContent=[caps.drawtext?"CAPTION":null,caps.xfade&&caps.acrossfade?"TRANSITION":null,caps.loudnorm?"LOUDNORM":null,caps.zoompan?"KEYFRAME":null,caps.rotate&&caps.blend?"ROT/OPACITY":null,caps.amix?"MULTITRACK":null,caps.sidechaincompress?"DUCKING":null].filter(Boolean).join(" · ")||"BASIS";
  $("#toolsMediaSource").textContent=`Quelle: ${String(media.ffmpegSource||"unbekannt").toUpperCase()}`;
  $("#toolsMediaGpu").textContent=["nvenc","qsv","amf"].filter(k=>enc[k]).map(k=>k.toUpperCase()).join(" · ")||"SOFTWARE";
  $("#toolsMediaProgress").textContent=media.status==="processing"?`${Number(media.progress||0)}% · ${String(media.phase||"clips").toUpperCase()} · ${String(media.encoder||"software").toUpperCase()}`:String(media.status||"idle").toUpperCase();
  $("#toolsMediaError").textContent=media.error||media.lastOutputDir||"Lokale Verarbeitung";

  const musicMap=nextState?.mediaSources?.music||{},voiceMap=nextState?.mediaSources?.voice||{},musicTrackMap=nextState?.mediaSources?.musicTracks||{},voiceTrackMap=nextState?.mediaSources?.voiceTracks||{},sfxMap=nextState?.mediaSources?.sfx||{};
  $("#toolsCutProjects").innerHTML=projects.length?projects.map(project=>{
    const pid=String(project.id),source=sources[pid]||null,music=musicMap[pid]||null,voice=voiceMap[pid]||null,localMusicTracks=musicTrackMap[pid]||{},localVoiceTracks=voiceTrackMap[pid]||{},localSfx=sfxMap[pid]||{},preset=project.export_preset||{};
    const musicWanted=preset.music_enabled===true&&preset.music_mute!==true,voiceWanted=preset.voiceover_enabled===true&&preset.voiceover_mute!==true;
    const extraMusic=(preset.music_tracks||[]).filter(track=>track.enabled!==false),extraVoice=(preset.voice_tracks||[]).filter(track=>track.enabled!==false),sfxTracks=(preset.sfx_tracks||[]).filter(track=>track.enabled!==false);
    const extraMusicReady=extraMusic.filter(track=>localMusicTracks[String(track.id)]?.exists).length,extraVoiceReady=extraVoice.filter(track=>localVoiceTracks[String(track.id)]?.exists).length,sfxReady=sfxTracks.filter(track=>localSfx[String(track.id)]?.exists).length;
    return `<article class="tools-cut-card"><div><strong>${escapeHtml(project.title||"Cut Projekt")}</strong><small>${escapeHtml(String(project.format||"vertical").toUpperCase())} · ${escapeHtml(String(project.status||"draft").toUpperCase())} · ${Number(project.clip_count||0)} Clips</small><small class="${source?.exists?"source-ok":"source-missing"}">${source?.exists?`VIDEO · ${escapeHtml(source.fileName||"Datei zugeordnet")}`:"KEINE LOKALE VIDEOQUELLE"}</small><small class="${!musicWanted||music?.exists?"source-ok":"source-missing"}">${musicWanted?(music?.exists?`MUSIK 1 · ${escapeHtml(music.fileName||"zugeordnet")}`:"MUSIK 1 FEHLT"):"MUSIK 1 AUS"}</small>${audioAnalysisHtml(music)}<small class="${extraMusicReady===extraMusic.length?"source-ok":"source-missing"}">MUSIK EXTRA · ${extraMusicReady}/${extraMusic.length} LOKAL</small><small class="${!voiceWanted||voice?.exists?"source-ok":"source-missing"}">${voiceWanted?(voice?.exists?`VOICE 1 · ${escapeHtml(voice.fileName||"zugeordnet")}`:"VOICE 1 FEHLT"):"VOICE 1 AUS"}</small>${audioAnalysisHtml(voice)}<small class="${extraVoiceReady===extraVoice.length?"source-ok":"source-missing"}">VOICE EXTRA · ${extraVoiceReady}/${extraVoice.length} LOKAL</small><small class="${sfxReady===sfxTracks.length?"source-ok":"source-missing"}">SFX · ${sfxReady}/${sfxTracks.length} LOKAL</small></div><div class="tools-cut-card-actions"><button class="btn" data-select-cut-source="${escapeHtml(pid)}" data-source-name="${escapeHtml(project.source_name||"")}">${source?.exists?"VIDEO ÄNDERN":"VIDEO ZUORDNEN"}</button><button class="btn" data-select-cut-music="${escapeHtml(pid)}" data-music-name="${escapeHtml(preset.music_name||"")}">${music?.exists?"MUSIK 1 ÄNDERN":"MUSIK 1"}</button><button class="btn" data-select-cut-voice="${escapeHtml(pid)}" data-voice-name="${escapeHtml(preset.voiceover_name||"")}">${voice?.exists?"VOICE 1 ÄNDERN":"VOICE 1"}</button>${extraMusic.map((track,index)=>`<button class="btn" data-select-cut-music-track="${escapeHtml(pid)}" data-track-id="${escapeHtml(track.id)}" data-track-name="${escapeHtml(track.name||`Musik ${index+2}`)}">${localMusicTracks[String(track.id)]?.exists?"MUSIC ✓":"MUSIC"} ${index+2} · ${escapeHtml(track.name||track.id)}</button>`).join("")}${extraVoice.map((track,index)=>`<button class="btn" data-select-cut-voice-track="${escapeHtml(pid)}" data-track-id="${escapeHtml(track.id)}" data-track-name="${escapeHtml(track.name||`Voice ${index+2}`)}">${localVoiceTracks[String(track.id)]?.exists?"VOICE ✓":"VOICE"} ${index+2} · ${escapeHtml(track.name||track.id)}</button>`).join("")}${sfxTracks.map(track=>`<button class="btn" data-select-cut-sfx="${escapeHtml(pid)}" data-sfx-id="${escapeHtml(track.id)}" data-sfx-name="${escapeHtml(track.name||"SFX")}">${localSfx[String(track.id)]?.exists?"SFX ✓":"SFX"} · ${escapeHtml(track.name||track.id)}</button>`).join("")}<button class="btn" data-open-cut-project="${escapeHtml(pid)}">ÖFFNEN</button></div></article>`
  }).join(""):`<div class="launcher-scene-empty">Noch keine Cut-Projekte.</div>`;

  $("#toolsCutJobList").innerHTML=jobs.length?jobs.slice(0,20).map(job=>{
    const manifest=job.manifest||{},preset=manifest.export_preset||{},pid=String(job.project_id),source=sources[pid]||null,music=musicMap[pid]||null,voice=voiceMap[pid]||null,localMusicTracks=musicTrackMap[pid]||{},localVoiceTracks=voiceTrackMap[pid]||{},localSfx=sfxMap[pid]||{},reelMode=["reel","both"].includes(String(preset.mode||"clips"));
    const musicWanted=preset.music_enabled===true&&preset.music_mute!==true&&reelMode,voiceWanted=preset.voiceover_enabled===true&&preset.voiceover_mute!==true&&reelMode;
    const extraMusic=(preset.music_tracks||[]).filter(track=>track.enabled!==false&&track.mute!==true&&reelMode),extraVoice=(preset.voice_tracks||[]).filter(track=>track.enabled!==false&&track.mute!==true&&reelMode),sfxTracks=(preset.sfx_tracks||[]).filter(track=>track.enabled!==false&&track.mute!==true&&reelMode);
    const missingMusic=extraMusic.filter(track=>!localMusicTracks[String(track.id)]?.exists),missingVoice=extraVoice.filter(track=>!localVoiceTracks[String(track.id)]?.exists),missingSfx=sfxTracks.filter(track=>!localSfx[String(track.id)]?.exists);
    const ready=source?.exists&&(!musicWanted||music?.exists)&&(!voiceWanted||voice?.exists)&&!missingMusic.length&&!missingVoice.length&&!missingSfx.length,canRun=["queued","claimed","failed"].includes(job.status),isCurrent=String(media.jobId||"")===String(job.id)&&media.status==="processing";
    return `<article class="tools-job-card"><div><strong>${escapeHtml(manifest.project_title||"Cut Export")}</strong><small>${(manifest.clips||[]).length} Clips · ${escapeHtml(String(preset.mode||"clips").toUpperCase())} · MUSIC ${Number(musicWanted)+extraMusic.length} · VOICE ${Number(voiceWanted)+extraVoice.length} · SFX ${sfxTracks.length}</small><small class="${ready?"source-ok":"source-missing"}">${source?.exists?"VIDEO ✓":"VIDEO FEHLT"}${musicWanted?` · ${music?.exists?"M1 ✓":"M1 FEHLT"}`:""}${extraMusic.length?` · MX ${extraMusic.length-missingMusic.length}/${extraMusic.length}`:""}${voiceWanted?` · ${voice?.exists?"V1 ✓":"V1 FEHLT"}`:""}${extraVoice.length?` · VX ${extraVoice.length-missingVoice.length}/${extraVoice.length}`:""}${sfxTracks.length?` · SFX ${sfxTracks.length-missingSfx.length}/${sfxTracks.length}`:""}${isCurrent?` · ${Number(media.progress||0)}%`:""}</small></div><span class="${escapeHtml(job.status||"queued")}">${escapeHtml(String(job.status||"queued").toUpperCase())}</span><div class="tools-job-actions">${!source?.exists&&canRun?`<button class="btn" data-select-cut-source="${escapeHtml(pid)}" data-source-name="${escapeHtml(manifest.source_name||"")}">VIDEO</button>`:""}${musicWanted&&!music?.exists&&canRun?`<button class="btn" data-select-cut-music="${escapeHtml(pid)}" data-music-name="${escapeHtml(preset.music_name||"")}">MUSIK 1</button>`:""}${missingMusic.map(track=>`<button class="btn" data-select-cut-music-track="${escapeHtml(pid)}" data-track-id="${escapeHtml(track.id)}" data-track-name="${escapeHtml(track.name||"Musik")}">MUSIC · ${escapeHtml(track.name||track.id)}</button>`).join("")}${voiceWanted&&!voice?.exists&&canRun?`<button class="btn" data-select-cut-voice="${escapeHtml(pid)}" data-voice-name="${escapeHtml(preset.voiceover_name||"")}">VOICE 1</button>`:""}${missingVoice.map(track=>`<button class="btn" data-select-cut-voice-track="${escapeHtml(pid)}" data-track-id="${escapeHtml(track.id)}" data-track-name="${escapeHtml(track.name||"Voice")}">VOICE · ${escapeHtml(track.name||track.id)}</button>`).join("")}${missingSfx.map(track=>`<button class="btn" data-select-cut-sfx="${escapeHtml(pid)}" data-sfx-id="${escapeHtml(track.id)}" data-sfx-name="${escapeHtml(track.name||"SFX")}">SFX · ${escapeHtml(track.name||track.id)}</button>`).join("")}${ready&&canRun?`<button class="btn primary" data-process-cut-job="${escapeHtml(job.id)}" ${media.status==="processing"?"disabled":""}>${job.status==="failed"?"ERNEUT EXPORTIEREN":"LOKAL EXPORTIEREN"}</button>`:""}${job.status==="completed"?`<button class="btn" data-open-exports>ORDNER</button>`:""}</div></article>`
  }).join(""):`<div class="launcher-scene-empty">Noch keine Export-Jobs.</div>`;
}

function renderLocalOutput(nextState=state){
  const output=nextState?.localOutput||{};
  const running=Boolean(output.running);
  const ready=Boolean(output.ready);
  const scene=output.scene||{};
  const pill=$("#localOutputPill");
  if(pill){
    pill.textContent=running?(ready?"RUNNING":"LÄDT…"):"GESTOPPT";
    pill.className="pill"+(running&&ready?" ok":"");
  }
  $("#localOutputStatus").textContent=running?(ready?"Capture bereit":output.lastError||"Scene lädt…"):"Nicht gestartet";
  $("#localOutputFormat").textContent=scene.width&&scene.height?`${scene.width} × ${scene.height}`:"–";
  $("#localOutputScene").textContent=scene.name||"–";
  $("#localOutputLoaded").textContent=output.loadedAt?new Date(output.loadedAt).toLocaleTimeString("de-DE"):"–";
  $("#stopLocalOutput").disabled=!running;
  $("#reloadLocalOutput").disabled=!running;
  if($("#outputAlwaysOnTop"))$("#outputAlwaysOnTop").checked=Boolean(output.alwaysOnTop);

  const displays=nextState?.outputDisplays||[];
  const ds=$("#outputDisplaySelect");
  if(ds){
    const selected=ds.value||String(output.displayId||"");
    ds.innerHTML=displays.map(d=>`<option value="${escapeHtml(String(d.id))}">${escapeHtml(d.label)} · ${d.bounds.width}×${d.bounds.height}</option>`).join("");
    if(displays.some(d=>String(d.id)===selected))ds.value=selected;
  }

  const modes=nextState?.outputBackgroundModes||[];
  const bg=$("#outputBackgroundMode");
  if(bg&&modes.length){
    const selected=bg.value||output.backgroundMode||"transparent";
    bg.innerHTML=modes.map(m=>`<option value="${escapeHtml(m.key)}">${escapeHtml(m.label)}</option>`).join("");
    bg.value=modes.some(m=>m.key===selected)?selected:"transparent";
  }
}

function renderOutputGate(gate=state?.outputGate){
  if(!gate)return;
  const summary=gate.summary||{};
  $("#outputGatePass").textContent=String(summary.pass||0);
  $("#outputGateFail").textContent=String(summary.fail||0);
  $("#outputGateUntested").textContent=String(summary.untested||0);
  $("#outputGateTotal").textContent=String(summary.total||0);
  $("#outputGateList").innerHTML=(gate.checks||[]).map(check=>`
    <div class="output-gate-row ${check.status}">
      <div class="output-gate-copy"><strong>${escapeHtml(check.label)}</strong><small>${check.updated_at?`Zuletzt: ${escapeHtml(new Date(check.updated_at).toLocaleString("de-DE"))}`:"Noch nicht getestet"}</small></div>
      <div class="output-gate-actions">
        <button class="pass ${check.status==="pass"?"active":""}" data-gate-key="${escapeHtml(check.key)}" data-gate-status="pass">PASS</button>
        <button class="fail ${check.status==="fail"?"active":""}" data-gate-key="${escapeHtml(check.key)}" data-gate-status="fail">FAIL</button>
        <button class="clear ${check.status==="untested"?"active":""}" data-gate-key="${escapeHtml(check.key)}" data-gate-status="untested">OFFEN</button>
      </div>
    </div>`).join("");
}

function selectedOutputSceneId(){
  return $("#outputSceneSelect")?.value||"";
}

async function startSelectedLocalOutput(sceneId=selectedOutputSceneId()){
  if(!sceneId)throw new Error("Bitte zuerst eine Scene auswählen.");
  const displayId=$("#outputDisplaySelect")?.value||null;
  const backgroundMode=$("#outputBackgroundMode")?.value||"transparent";
  const alwaysOnTop=Boolean($("#outputAlwaysOnTop")?.checked);
  state=await window.CFSLauncher.startLocalOutput({sceneId,displayId,backgroundMode,alwaysOnTop});
  render(state);
  toast("Lokaler Scene Output gestartet.");
}

function renderLauncherScenes(scenes=[]){
  const grid=$("#launcherSceneGrid");if(!grid)return;
  grid.innerHTML=scenes.length?scenes.map(scene=>`
    <article class="launcher-scene-card">
      <div class="launcher-scene-head"><div><span>${escapeHtml(scene.profile==="landscape"?"LANDSCAPE 16:9":"TIKTOK VERTICAL")}</span><strong>${escapeHtml(scene.name||"Scene")}</strong></div><b>LIVE</b></div>
      <div class="launcher-scene-meta"><span>VERSION ${Number(scene.version||1)}</span><span>${scene.published_at?new Date(scene.published_at).toLocaleString("de-DE"):"–"}</span></div>
      <input value="${escapeHtml(scene.source_url||"")}" readonly>
      <div class="inline">
        <button class="btn copy-launcher-scene" data-scene-url="${escapeHtml(scene.source_url||"")}">URL KOPIEREN</button>
        <button class="btn open-launcher-scene" data-scene-url="${escapeHtml(scene.source_url||"")}">VORSCHAU</button>
      </div>
      <div class="scene-local-actions">
        <button class="btn primary start-scene-output" data-scene-id="${escapeHtml(scene.id)}">LOCAL OUTPUT</button>
        <button class="btn select-scene-output" data-scene-id="${escapeHtml(scene.id)}">AUSWÄHLEN</button>
      </div>
    </article>`).join(""):`<div class="launcher-scene-empty">Noch keine veröffentlichte Scene.</div>`;
  const select=$("#outputSceneSelect");
  if(select){
    const current=select.value;
    select.innerHTML='<option value="">Scene auswählen…</option>'+scenes.map(scene=>`<option value="${escapeHtml(scene.id)}">${escapeHtml(scene.name||"Scene")} · ${escapeHtml(scene.profile==="landscape"?"16:9":"9:16")}</option>`).join("");
    if(scenes.some(scene=>String(scene.id)===current))select.value=current;
  }
}
async function loadLauncherScenes(){try{const r=await window.CFSLauncher.listScenes();renderLauncherScenes(r?.scenes||[]);if(r?.error)toast(r.error,true)}catch(e){toast(e.message,true);renderLauncherScenes([])}}

function render(next) {
  state = next || state;
  if (!state) return;
  const bridge = state.bridge || {};
  const settings = state.settings || {};
  const live = Boolean(bridge.liveActive);
  const connected = Boolean(bridge.connected);

  $("#sideStatus").textContent = live ? "LIVE" : connected ? "ONLINE" : "OFFLINE";
  $("#sideDot").className = "dot" + (live ? " live" : connected ? " online" : "");
  $("#bridgePill").textContent = live ? "LIVE VERBUNDEN" : connected ? "BRIDGE ONLINE" : "BRIDGE OFFLINE";
  $("#bridgePill").className = "pill status" + (live ? " live" : connected ? " online" : "");
  $("#providerPill").textContent = providerLabel(settings.provider);
  $("#statProvider").textContent = providerLabel(settings.provider);
  $("#statProviderDetail").textContent = settings.provider === "tiktool" ? (settings.tiktokUsername ? `@${settings.tiktokUsername}` : "Username fehlt") : "Bereit zum Testen";

  $("#statBridge").textContent = connected ? "ONLINE" : "OFFLINE";
  $("#statHeartbeat").textContent = connected ? `Heartbeat ${fmtTime(bridge.lastHeartbeatAt)}` : (bridge.lastError || "Noch keine Verbindung");
  $("#statSession").textContent = live ? "LIVE" : "GESTOPPT";
  $("#statSessionId").textContent = bridge.live?.session_id ? String(bridge.live.session_id).slice(0, 18) + "…" : "Keine aktive Session";
  $("#statQueue").textContent = String(bridge.queuedEvents || 0);
  const delivery = bridge.metrics || {};
  $("#statDelivery").textContent = String(delivery.sent || 0);
  $("#statDeliveryMeta").textContent = `${Number(delivery.flushBatches || 0)} Batches · ${Number(delivery.flushFailures || 0)} Fehler · ${Number(delivery.reconnects || 0)} Reconnects`;
  const spool = state.spool || bridge.spool || {};
  $("#statQueueMeta").textContent = spool.persistent
    ? `${Number(spool.pending || 0)} persistent · ${Number(spool.dropped || 0)} verworfen`
    : "nur im Arbeitsspeicher";
  const spoolSetting = $("#spoolSettingMeta");
  if (spoolSetting) spoolSetting.textContent = `${Number(spool.pending || 0)} Events persistent gespeichert · ${Math.round(Number(spool.bytes || 0)/1024)} KB`;
  renderPreflight(state.preflight || {});
  renderEventMonitor(state.monitor || {});
  renderStreamBot();
  renderCreatorIdentity(bridge);
  renderDeviceLinkState(state);
  renderStreamDeck(state);
  renderEntitlementBanners();
  renderBetaCenter(state);
  renderCreatorTools(state);
  renderLocalOutput(state);
  renderOutputGate(state.outputGate);
  renderSystem(state);
  recordSyncState(state);
  renderSyncMonitor(state);
  renderHomeHub(state);
  const remoteLive = Boolean(bridge.live?.connected && bridge.live?.session_id && !bridge.liveActive);
  $("#recoverLive").hidden = !remoteLive;

  $("#liveOrb").className = "live-orb" + (live ? " live" : connected ? " online" : "");
  $("#liveOrbText").textContent = live ? "LIVE" : connected ? "READY" : "OFFLINE";
  $("#startLive").disabled = !connected || live || state.preflight?.ok === false;
  $("#endLive").disabled = !live;
  $$("[data-sim]").forEach(b => b.disabled = !live || settings.provider !== "mock");

  $("#backendUrl").value = settings.backendUrl || "";
  $("#machineName").value = settings.machineName || "";
  $("#bridgeToken").placeholder = settings.tokenStored ? "Sicher gespeichert · zum Ersetzen neuen Key einfügen" : "cfsb_...";
  $("#providerSelect").value = settings.provider || "mock";
  $("#tiktokUsername").value = settings.tiktokUsername || "";
  $("#tiktoolApiKey").placeholder = settings.tiktoolKeyStored ? "Sicher gespeichert · zum Ersetzen neuen Key einfügen" : "Provider-Key";
  $("#ttsEnabled").value = String(settings.ttsEnabled !== false);
  $("#ttsRate").value = String(settings.ttsRate ?? 1);
  $("#ttsPitch").value = String(settings.ttsPitch ?? 1);
  $("#ttsVolume").value = String(settings.ttsVolume ?? 1);
  $("#autoStart").checked = Boolean(settings.autoStart);
  $("#startMinimized").checked = Boolean(settings.startMinimized);
  $("#autoUpdate").checked = settings.autoUpdate !== false;
  $("#autoRecoverLive").checked = settings.autoRecoverLive !== false;
  $("#updateChannel").value = settings.updateChannel === "beta" ? "beta" : "stable";
  $("#appVersion").textContent = state.appVersion || "0.42.0";
  loadVoices();
  $("#ttsVoiceName").value = settings.ttsVoiceName || "";
  renderUpdate(state.update || {});

  const enc = $("#encryptionNotice");
  enc.textContent = state.encryptionAvailable
    ? "Sichere Betriebssystem-Verschlüsselung verfügbar. Der Bridge-Key wird nicht im Klartext gespeichert."
    : "Sichere Betriebssystem-Verschlüsselung ist nicht verfügbar. Ein neuer Bridge-Key kann deshalb nicht gespeichert werden.";
  enc.className = "notice" + (state.encryptionAvailable ? "" : " warn");

  const d = $("#diag");
  d.innerHTML = [
    ["Bridge", connected ? "ONLINE" : "OFFLINE"],
    ["Backend", settings.backendUrl || "–"],
    ["Bridge Token", settings.tokenStored ? "SICHER GESPEICHERT" : "NICHT GESETZT"],
    ["Provider Key", settings.tiktoolKeyStored ? "SICHER GESPEICHERT" : "NICHT GESETZT"],
    ["PC", settings.machineName || "–"],
    ["Provider", providerLabel(settings.provider)],
    ["Queue", `${bridge.queuedEvents || 0} Events · persistent`],
    ["Latenz", bridge.latencyMs == null ? "–" : `${bridge.latencyMs} ms`],
    ["Letzter Flush", fmtTime(bridge.lastFlushAt)],
    ["Heartbeat", fmtTime(bridge.lastHeartbeatAt)],
    ["Fehler", bridge.lastError || "Keiner"],
    ["Session", bridge.live?.session_id ? String(bridge.live.session_id) : "–"]
  ].map(([a,b]) => `<div><span>${a}</span><strong>${escapeHtml(b)}</strong></div>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function localFileUrl(value){
  const raw=String(value||"").replace(/\\/g,"/");
  if(!raw)return"";
  return encodeURI(raw.startsWith("/")?`file://${raw}`:`file:///${raw}`);
}
function audioAnalysisHtml(item){
  const a=item?.analysis||{};
  if(!item?.exists)return"";
  const peak=Number.isFinite(Number(a.peak_db))?`${Number(a.peak_db).toFixed(1)} dB`:"–";
  const mean=Number.isFinite(Number(a.mean_db))?`${Number(a.mean_db).toFixed(1)} dB`:"–";
  const wave=a.waveform_path?`<img class="tools-waveform" src="${escapeHtml(localFileUrl(a.waveform_path))}" alt="">`:"";
  return `<div class="tools-audio-analysis">${wave}<small>PEAK ${escapeHtml(peak)} · MEAN ${escapeHtml(mean)}</small></div>`;
}

function showPage(name) {
  $$("[data-page]").forEach(v => v.classList.toggle("active", v.dataset.page === name));
  $$(".nav").forEach(v => v.classList.toggle("active", v.dataset.view === name));
  $("#pageTitle").textContent = ({ live:"LIVE CONTROL", deck:"STREAM DECK", tools:"CREATOR TOOLS", bridge:"BRIDGE", sync:"SYNC STATUS", audio:"AUTOTHANKS", events:"LIVE EVENTS", bot:"STREAM BOT", output:"LIVE OUTPUT", obs:"OBS DOCTOR", system:"SYSTEM", beta:"BETA TEST", settings:"EINSTELLUNGEN" })[name] || "CREATOR SUITE";
  renderExperienceHelp(name);
  if(window.matchMedia("(max-width: 900px)").matches)applyMenuState(false,{remember:false});
}

async function saveSettings(extra = {}) {
  const data = {
    backendUrl: $("#backendUrl").value,
    machineName: $("#machineName").value,
    bridgeToken: $("#bridgeToken").value,
    provider: $("#providerSelect").value,
    tiktokUsername: $("#tiktokUsername").value,
    tiktoolApiKey: $("#tiktoolApiKey").value,
    ttsEnabled: $("#ttsEnabled").value === "true",
    ttsRate: Number($("#ttsRate").value || 1),
    ttsPitch: Number($("#ttsPitch").value || 1),
    ttsVolume: Number($("#ttsVolume").value || 1),
    ttsVoiceName: $("#ttsVoiceName").value || "",
    autoStart: $("#autoStart").checked,
    startMinimized: $("#startMinimized").checked,
    autoUpdate: $("#autoUpdate").checked,
    autoRecoverLive: $("#autoRecoverLive").checked,
    updateChannel: $("#updateChannel").value === "beta" ? "beta" : "stable",
    ...extra
  };
  state = await window.CFSLauncher.saveSettings(data);
  $("#bridgeToken").value = "";
  $("#tiktoolApiKey").value = "";
  render(state);
  return state;
}

function queueTts(action) {
  const id = String(action?.id || "");
  if (id && queuedActionIds.has(id)) return;
  if (id) queuedActionIds.add(id);
  ttsQueue.push(action);
  if (ttsQueue.length > 100) ttsQueue.splice(0, ttsQueue.length - 100);
  playNextTts();
}

function playNextTts() {
  if (speaking || !ttsQueue.length) return;
  const action = ttsQueue.shift();
  const settings = state?.settings || {};
  const log = $("#actionLog");
  log.innerHTML = `<strong>${escapeHtml(action.action_text || "")}</strong><br><span class="time">${new Date().toLocaleTimeString("de-DE")} · ${escapeHtml(action.action_type || "launcher_tts")}</span>`;

  if (settings.ttsEnabled === false || !("speechSynthesis" in window)) {
    if (action.id) queuedActionIds.delete(String(action.id));
    window.CFSLauncher.ackAction(action.id).catch(() => {});
    playNextTts();
    return;
  }

  speaking = true;
  const utter = new SpeechSynthesisUtterance(String(action.action_text || ""));
  utter.lang = "de-DE";
  utter.rate = Number(settings.ttsRate || 1);
  utter.pitch = Number(settings.ttsPitch || 1);
  utter.volume = Number(settings.ttsVolume ?? 1);
  const voice = selectedVoice(settings.ttsVoiceName);
  if (voice) utter.voice = voice;
  const finish = async (ok, error = "") => {
    speaking = false;
    if (action.id) queuedActionIds.delete(String(action.id));
    try {
      if (ok) await window.CFSLauncher.ackAction(action.id);
      else await window.CFSLauncher.nackAction(action.id, error || "speech_synthesis_error");
    } catch {}
    playNextTts();
  };
  utter.onend = () => finish(true);
  utter.onerror = event => finish(false, event?.error || "speech_synthesis_error");
  speechSynthesis.speak(utter);
}

async function init() {
  state = await window.CFSLauncher.getBootstrap();
  applyExperienceMode(storedExperienceMode(),{remember:false,keepPage:true});
  addSyncLine("SYSTEM","Sync Monitor gestartet.","info");
  recordSyncState(state);
  render(state);
  const narrow=window.matchMedia("(max-width: 900px)").matches;
  let stored=null;try{stored=localStorage.getItem("cfsLauncherMenuOpen")}catch{}
  applyMenuState(narrow?false:stored!=="0",{remember:false});
  $("#launcherMenuToggle").onclick=()=>applyMenuState(!menuOpen);
  $("#sidebarBackdrop").onclick=()=>applyMenuState(false,{remember:false});
  window.addEventListener("keydown",event=>{if(event.key==="Escape"&&menuOpen&&window.matchMedia("(max-width: 900px)").matches)applyMenuState(false,{remember:false});});
  window.matchMedia("(max-width: 900px)").addEventListener?.("change",event=>applyMenuState(event.matches?false:true,{remember:false}));
  $$('[data-experience-mode]').forEach(button=>button.onclick=()=>applyExperienceMode(button.dataset.experienceMode,{announce:true}));
  $$('[data-setup-experience]').forEach(button=>button.onclick=()=>applyExperienceMode(button.dataset.setupExperience,{announce:false,keepPage:true}));
  $("#experienceHelpPro").onclick=()=>applyExperienceMode("pro",{announce:true});
  if (state.firstRun) requestAnimationFrame(openSetupWizard);

  $$(".nav").forEach(button => button.onclick = async () => {
    showPage(button.dataset.view);
    if(button.dataset.view==="deck"&&state?.bridge?.connected&&!state?.creatorLibrary?.loadedAt){
      try{state=await window.CFSLauncher.refreshCreatorLibrary();render(state)}catch{}
    }
    if(button.dataset.view==="beta"&&state?.bridge?.connected){try{state=await window.CFSLauncher.refreshBetaCenter();render(state)}catch{}}
    if(button.dataset.view==="bot"&&state?.bridge?.connected){await loadStreamBot({silent:true});}
    if(button.dataset.view==="tools"&&state?.bridge?.connected){try{state=await window.CFSLauncher.refreshCreatorTools();render(state);if(currentCreatorFeatures().cut_studio===true&&!state?.mediaEngine?.checkedAt){state=await window.CFSLauncher.probeMediaEngine();render(state)}}catch{}}

  });

  $("#launcherHomeHub")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-hub-action]");
    if(button)runHomeHubAction(button.dataset.hubAction);
  });
  $("#openSyncTerminal").onclick=()=>showPage("sync");
  $("#syncClear").onclick=()=>{syncHistory=[];addSyncLine("SYSTEM","Anzeige geleert. Neue Sync-Meldungen erscheinen automatisch.","info");renderSyncMonitor(state);};
  $("#syncRefresh").onclick=async()=>{
    const button=$("#syncRefresh");button.disabled=true;button.textContent="PRÜFE…";addSyncLine("SYNC","Manuelle Sync-Prüfung gestartet.","work");renderSyncMonitor(state);
    try{
      state=await window.CFSLauncher.refreshCloudHealth();render(state);
      if(state?.bridge?.connected){state=await window.CFSLauncher.refreshCreatorLibrary();render(state);}
      addSyncLine("SYNC","Manuelle Sync-Prüfung abgeschlossen.",state?.bridge?.connected?"ok":"warn");
    }catch(error){addSyncLine("SYNC",`Prüfung fehlgeschlagen · ${error.message}`,"fail");toast(error.message,true);}
    finally{button.disabled=false;button.textContent="SYNC PRÜFEN";renderSyncMonitor(state);}
  };

  $("#setupBack").onclick = () => setSetupStep(setupStep - 1);
  $("#setupNext").onclick = async () => {
    try {
      if (setupStep === 1) {
        if (!$("#setupBackendUrl").value.trim()) throw new Error("Backend URL fehlt.");
        if (!$("#setupMachineName").value.trim()) throw new Error("PC Name fehlt.");
      }
      if (setupStep === 2 && !state.settings?.tokenStored && !$("#setupBridgeToken").value.trim()) {
        throw new Error("Bitte bestätige zuerst diesen PC über den CFS Device-Link.");
      }
      if (setupStep === 3 && $("#setupProvider").value === "tiktool") {
        if (!$("#setupTikTokUsername").value.trim()) throw new Error("TikTok Username fehlt.");
        if (!state.settings?.tiktoolKeyStored && !$("#setupTiktoolKey").value.trim()) throw new Error("Provider API-Key fehlt.");
      }
      setSetupStep(setupStep + 1);
    } catch (error) { toast(error.message, true); }
  };

  $("#setupStartDeviceLink").onclick = async () => {
    try {
      const backend=$("#setupBackendUrl").value.trim();
      const machine=$("#setupMachineName").value.trim();
      if(!backend||!machine)throw new Error("Backend URL und PC Name fehlen.");
      state=await window.CFSLauncher.saveSettings({backendUrl:backend,machineName:machine});
      state=await window.CFSLauncher.startDeviceLink();
      render(state);
      toast("Geräte-Code erstellt. Bestätige ihn jetzt auf der Website.");
    } catch(error){toast(error.message,true)}
  };

  $("#setupOpenDeviceLink").onclick = () => {
    const url=$("#setupOpenDeviceLink").dataset.url;
    if(url)window.open(url,"_blank","noopener");
  };

  $("#setupCheckDeviceLink").onclick = async () => {
    try{
      state=await window.CFSLauncher.pollDeviceLink();
      render(state);
      if(state.settings?.tokenStored)toast("Creator Account verbunden.");
      else toast("Noch nicht bestätigt.");
    }catch(error){toast(error.message,true)}
  };

  $("#setupRunCheck").onclick = async () => {
    const host = $("#setupChecks");
    host.innerHTML = "<span>Systemcheck läuft…</span>";
    try {
      const payload = wizardPayload();
      state = await window.CFSLauncher.saveSettings(payload);
      $("#setupBridgeToken").value = "";
      $("#setupTiktoolKey").value = "";
      try { state = await window.CFSLauncher.connect(); } catch {}
      const preflight = await window.CFSLauncher.runPreflight();
      state = { ...state, preflight };
      setupCheckOk = Boolean(preflight.ok);
      host.innerHTML = (preflight.checks || []).map(item => `
        <div class="${item.ok ? "ok" : item.blocking ? "fail" : "warn"}">
          <span>${item.ok ? "✓" : item.blocking ? "!" : "•"}</span>
          <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail || "")}</small></div>
        </div>`).join("");
      render(state);
      toast(setupCheckOk ? "Setup-Systemcheck erfolgreich." : "Systemcheck zeigt noch offene Punkte.", !setupCheckOk);
    } catch (error) {
      setupCheckOk = false;
      host.innerHTML = `<div class="fail"><span>!</span><div><strong>Systemcheck fehlgeschlagen</strong><small>${escapeHtml(error.message)}</small></div></div>`;
      toast(error.message, true);
    }
  };

  $("#setupFinish").onclick = async () => {
    try {
      if (!setupCheckOk) throw new Error("Bitte zuerst den Systemcheck ausführen.");
      state = await window.CFSLauncher.completeSetup();
      render(state);
      closeSetupWizard();
      toast("Creator Suite Einrichtung abgeschlossen.");
    } catch (error) { toast(error.message, true); }
  };

  $("#saveBridge").onclick = async () => {
    try {
      await saveSettings();
      state = await window.CFSLauncher.connect();
      render(state);
      toast("Bridge gespeichert und verbunden.");
    } catch (error) { toast(error.message, true); }
  };

  $("#connectBridge").onclick = async () => {
    try {
      state = await window.CFSLauncher.connect();
      render(state);
      toast("Bridge-Verbindung erfolgreich.");
    } catch (error) { toast(error.message, true); }
  };

  $("#clearToken").onclick = async () => {
    try {
      state = await window.CFSLauncher.clearToken();
      render(state);
      toast("Lokaler Bridge-Schlüssel gelöscht.");
    } catch (error) { toast(error.message, true); }
  };

  $("#clearProviderKey").onclick = async () => {
    try {
      state = await window.CFSLauncher.clearProviderKey();
      render(state);
      toast("Lokaler Provider API-Key gelöscht.");
    } catch (error) { toast(error.message, true); }
  };

  $("#startLive").onclick = async () => {
    try {
      const preflight = await window.CFSLauncher.runPreflight();
      state = { ...state, preflight };
      render(state);
      if (!preflight.ok) {
        toast("LIVE Preflight ist noch nicht vollständig bereit.", true);
        return;
      }
      await window.CFSLauncher.startLive();
      toast("LIVE-Session gestartet.");
    } catch (error) { toast(error.message, true); }
  };

  $("#endLive").onclick = async () => {
    try { await window.CFSLauncher.endLive(); toast("LIVE-Session beendet."); }
    catch (error) { toast(error.message, true); }
  };

  $$("[data-sim]").forEach(button => button.onclick = async () => {
    try {
      const type = button.dataset.sim;
      const amount = button.dataset.amount ? Number(button.dataset.amount) : undefined;
      const message = button.dataset.message || undefined;
      await window.CFSLauncher.simulate(type, { amount, message });
      toast(`${type} Event an Bridge Queue übergeben.`);
    } catch (error) { toast(error.message, true); }
  });

  $("#refreshStreamBot").onclick=()=>loadStreamBot();
  $("#saveStreamBot").onclick=async()=>{try{await saveStreamBotSettings()}catch(error){toast(error.message,true)}};
  $("#addStreamBotCommand").onclick=()=>{
    if(!streamBotLoaded){toast("Lade zuerst die creatorbezogenen Bot-Regeln.",true);return;}
    const cfg=collectStreamBot();streamBotConfig={...cfg,commands:[...(cfg.commands||[]),{command:"command",enabled:true,response:"Meine Info erscheint hier im Stream.",response_mode:"overlay",cooldown_seconds:15}].slice(0,30)};renderStreamBot();
  };
  $("#streamBotPrefix").oninput=()=>{$$(".bot-command-input b").forEach(el=>el.textContent=String($("#streamBotPrefix").value||"!").slice(0,3)||"!");};
  $("#testStreamBotChat").onclick=async()=>{
    try{
      if(state?.settings?.provider!=="mock")throw new Error("Bot-Test bitte mit dem Simulator-Provider ausführen.");
      if(!state?.bridge?.liveActive)throw new Error("Starte zuerst die LIVE-Session.");
      const message=String($("#streamBotTestMessage").value||"!discord").trim().slice(0,280);
      if(!message)throw new Error("Chat-Nachricht fehlt.");
      await window.CFSLauncher.simulate("chat",{message,actor_name:"BotTester"});toast(`Chat Event gesendet: ${message}`);
    }catch(error){toast(error.message,true);}
  };

  $("#refreshCreatorLibrary").onclick = async () => {
    try{state=await window.CFSLauncher.refreshCreatorLibrary();render(state);toast("Creator-Bibliothek aktualisiert.")}
    catch(error){toast(error.message,true)}
  };

  $("#logoutDevice").onclick = async () => {
    if(!confirm("Diesen Launcher wirklich vom Creator Account abmelden?"))return;
    try{state=await window.CFSLauncher.logoutDevice();render(state);toast("Dieses Gerät wurde abgemeldet.")}
    catch(error){toast(error.message,true)}
  };

  $("#saveAudio").onclick = async () => {
    try { await saveSettings(); toast("AutoThanks Audio gespeichert."); }
    catch (error) { toast(error.message, true); }
  };

  $("#testTts").onclick = () => {
    const utter = new SpeechSynthesisUtterance("cfs zockt Creator Suite. Auto Thanks ist bereit.");
    utter.lang = "de-DE";
    utter.rate = Number($("#ttsRate").value || 1);
    utter.pitch = Number($("#ttsPitch").value || 1);
    utter.volume = Number($("#ttsVolume").value || 1);
    const voice = selectedVoice($("#ttsVoiceName").value);
    if (voice) utter.voice = voice;
    speechSynthesis.speak(utter);
  };

  $("#autoStart").onchange = async () => {
    try { await saveSettings(); } catch (error) { toast(error.message, true); }
  };
  $("#startMinimized").onchange = async () => {
    try { await saveSettings(); } catch (error) { toast(error.message, true); }
  };
  $("#autoUpdate").onchange = async () => {
    try { await saveSettings(); } catch (error) { toast(error.message, true); }
  };
  $("#autoRecoverLive").onchange = async () => {
    try { await saveSettings(); } catch (error) { toast(error.message, true); }
  };
  $("#updateChannel").onchange = async () => {
    try { await saveSettings(); toast("Update-Kanal gespeichert."); } catch (error) { toast(error.message, true); }
  };

  $("#runPreflight").onclick = async () => {
    try {
      const preflight = await window.CFSLauncher.runPreflight();
      state = { ...state, preflight };
      render(state);
      toast(preflight.ok ? "Preflight: bereit für LIVE." : "Preflight: es fehlen noch Voraussetzungen.", !preflight.ok);
    } catch (error) { toast(error.message, true); }
  };

  $("#recoverLive").onclick = async () => {
    try {
      state = await window.CFSLauncher.recoverLive();
      render(state);
      toast("LIVE-Session wurde wieder aufgenommen.");
    } catch (error) { toast(error.message, true); }
  };

  $("#clearSpool").onclick = async () => {
    try {
      const result = await window.CFSLauncher.clearSpool();
      toast(`${result.cleared || 0} wartende Events entfernt.`);
      state = await window.CFSLauncher.getBootstrap();
      render(state);
    } catch (error) { toast(error.message, true); }
  };

  $("#clearEventMonitor").onclick = async () => {
    try {
      const result = await window.CFSLauncher.clearEventMonitor();
      state = { ...state, monitor: result.monitor || {} };
      render(state);
      toast("LIVE Event Monitor wurde geleert.");
    } catch (error) { toast(error.message, true); }
  };

  $("#exportFieldTest").onclick = async () => {
    try {
      const result = await window.CFSLauncher.exportFieldTest();
      if (result?.ok) {
        const passed = Object.values(result.coverage || {}).filter(Boolean).length;
        toast(`Field-Test-Bericht gespeichert · ${passed}/5 Eventtypen beobachtet.`);
      }
    } catch (error) { toast(error.message, true); }
  };

  $("#runObsDoctor").onclick = async () => {
    const host = $("#obsDoctorResult");
    host.innerHTML = '<div class="obs-doctor-empty">OBS Browser Source wird geprüft…</div>';
    try {
      const result = await window.CFSLauncher.obsDoctor($("#obsDoctorUrl").value);
      renderObsDoctor(result);
      toast(result.ok ? "OBS Browser Source ist erreichbar." : "OBS Doctor hat Probleme gefunden.", !result.ok);
    } catch (error) {
      renderObsDoctor({ok:false,checks:[{label:"Prüfung",ok:false,detail:error.message}],latencyMs:0,url:""});
      toast(error.message, true);
    }
  };

  $("#clearObsDoctor").onclick = () => {
    $("#obsDoctorUrl").value = "";
    renderObsDoctor(null);
  };

  $("#createSupportBundle").onclick = async () => {
    try {
      const result = await window.CFSLauncher.createSupportBundle();
      if (result?.ok) toast(`Support-Paket erstellt · ${result.files?.length || 0} Dateien.`);
    } catch (error) { toast(error.message, true); }
  };

  $("#resetSetup").onclick = async () => {
    try {
      state = await window.CFSLauncher.resetSetup();
      render(state);
      openSetupWizard();
      toast("Setup-Assistent wurde zurückgesetzt.");
    } catch (error) { toast(error.message, true); }
  };

  $("#refreshCreatorTools").onclick=async()=>{try{state=await window.CFSLauncher.refreshCreatorTools();render(state);toast("Creator Tools aktualisiert.")}catch(error){toast(error.message,true)}};
  $("#toolsGameStart").onclick=async()=>{try{state=await window.CFSLauncher.gameControl({action:"start"});render(state);toast("Game gestartet.")}catch(error){toast(error.message,true)}};
  $("#toolsGameStop").onclick=async()=>{try{state=await window.CFSLauncher.gameControl({action:"stop"});render(state);toast("Game gestoppt.")}catch(error){toast(error.message,true)}};
  $("#toolsGameReset").onclick=async()=>{try{state=await window.CFSLauncher.gameControl({action:"reset"});render(state);toast("Game-Runde zurückgesetzt.")}catch(error){toast(error.message,true)}};
  $("#toolsScoreAPlus").onclick=async()=>{try{state=await window.CFSLauncher.gameControl({action:"score",team:"a",delta:1});render(state)}catch(error){toast(error.message,true)}};
  $("#toolsScoreBPlus").onclick=async()=>{try{state=await window.CFSLauncher.gameControl({action:"score",team:"b",delta:1});render(state)}catch(error){toast(error.message,true)}};
  $("#toolsCopyGameUrl").onclick=async()=>{const url=$("#toolsGameUrl").value;if(url){try{await navigator.clipboard.writeText(url);toast("Game Output URL kopiert.")}catch(error){toast(error.message,true)}}};
  $("#toolsPreviewGame").onclick=()=>{const url=$("#toolsPreviewGame").dataset.url;if(url)window.open(url,"_blank","noopener")};
  $("#toolsOpenCutStudio").onclick=()=>window.open((state?.settings?.backendUrl||"https://cfs-zockt.de").replace(/\/+$/,"")+"/pages/cut-studio.html","_blank","noopener");
  $("#toolsProbeMedia").onclick=async()=>{try{state=await window.CFSLauncher.probeMediaEngine();render(state);toast(state?.mediaEngine?.available?"FFmpeg ist bereit.":state?.mediaEngine?.error||"FFmpeg wurde nicht gefunden.",!state?.mediaEngine?.available)}catch(error){toast(error.message,true)}};
  $("#toolsOpenExports").onclick=async()=>{try{state=await window.CFSLauncher.openCutExportFolder();render(state)}catch(error){toast(error.message,true)}};
  async function selectCutSource(projectId,sourceName=""){try{state=await window.CFSLauncher.selectCutSource({projectId,sourceName});render(state);if(!state?.mediaSourceAction?.canceled)toast("Lokale Videodatei zugeordnet.")}catch(error){toast(error.message,true)}}
  $("#toolsCutProjects").onclick=async event=>{const open=event.target.closest("[data-open-cut-project]"),select=event.target.closest("[data-select-cut-source]"),music=event.target.closest("[data-select-cut-music]"),voice=event.target.closest("[data-select-cut-voice]"),musicTrack=event.target.closest("[data-select-cut-music-track]"),voiceTrack=event.target.closest("[data-select-cut-voice-track]"),sfx=event.target.closest("[data-select-cut-sfx]");if(open){try{state=await window.CFSLauncher.openCutProject(open.dataset.openCutProject);render(state)}catch(error){toast(error.message,true)};return}if(select){await selectCutSource(select.dataset.selectCutSource,select.dataset.sourceName||"");return}if(music){await selectCutMusic(music.dataset.selectCutMusic,music.dataset.musicName||"");return}if(voice){await selectCutVoice(voice.dataset.selectCutVoice,voice.dataset.voiceName||"");return}if(musicTrack){await selectCutMusicTrack(musicTrack.dataset.selectCutMusicTrack,musicTrack.dataset.trackId,musicTrack.dataset.trackName||"");return}if(voiceTrack){await selectCutVoiceTrack(voiceTrack.dataset.selectCutVoiceTrack,voiceTrack.dataset.trackId,voiceTrack.dataset.trackName||"");return}if(sfx){await selectCutSfx(sfx.dataset.selectCutSfx,sfx.dataset.sfxId,sfx.dataset.sfxName||"");return}};
  $("#toolsCutJobList").onclick=async event=>{const select=event.target.closest("[data-select-cut-source]"),music=event.target.closest("[data-select-cut-music]"),voice=event.target.closest("[data-select-cut-voice]"),musicTrack=event.target.closest("[data-select-cut-music-track]"),voiceTrack=event.target.closest("[data-select-cut-voice-track]"),sfx=event.target.closest("[data-select-cut-sfx]"),run=event.target.closest("[data-process-cut-job]"),folder=event.target.closest("[data-open-exports]");if(select){await selectCutSource(select.dataset.selectCutSource,select.dataset.sourceName||"");return}if(music){await selectCutMusic(music.dataset.selectCutMusic,music.dataset.musicName||"");return}if(voice){await selectCutVoice(voice.dataset.selectCutVoice,voice.dataset.voiceName||"");return}if(musicTrack){await selectCutMusicTrack(musicTrack.dataset.selectCutMusicTrack,musicTrack.dataset.trackId,musicTrack.dataset.trackName||"");return}if(voiceTrack){await selectCutVoiceTrack(voiceTrack.dataset.selectCutVoiceTrack,voiceTrack.dataset.trackId,voiceTrack.dataset.trackName||"");return}if(sfx){await selectCutSfx(sfx.dataset.selectCutSfx,sfx.dataset.sfxId,sfx.dataset.sfxName||"");return}if(folder){try{state=await window.CFSLauncher.openCutExportFolder();render(state)}catch(error){toast(error.message,true)};return}if(run){try{toast("Lokaler Cut-Export läuft …");state=await window.CFSLauncher.processCutJob(run.dataset.processCutJob);render(state);toast("Cut-Export lokal abgeschlossen.")}catch(error){toast(error.message,true)}}};

  $("#refreshBetaCenter").onclick=async()=>{try{state=await window.CFSLauncher.refreshBetaCenter();render(state);toast("Beta-Status aktualisiert.")}catch(error){toast(error.message,true)}};
  $("#startBetaSession").onclick=async()=>{try{state=await window.CFSLauncher.startBetaSession({label:$("#betaSessionLabel").value});render(state);toast("Beta-Testsession gestartet.")}catch(error){toast(error.message,true)}};
  $("#endBetaSession").onclick=async()=>{try{state=await window.CFSLauncher.endBetaSession({resultSummary:$("#betaSessionSummary").value});$("#betaSessionSummary").value="";render(state);toast("Beta-Testsession abgeschlossen.")}catch(error){toast(error.message,true)}};
  $("#submitBetaFeedback").onclick=async()=>{const title=$("#betaFeedbackTitle").value.trim();if(title.length<4){toast("Bitte einen kurzen Feedback-Titel eingeben.",true);return}try{state=await window.CFSLauncher.submitBetaFeedback({kind:$("#betaFeedbackKind").value,severity:$("#betaFeedbackSeverity").value,category:$("#betaFeedbackCategory").value,title,description:$("#betaFeedbackDescription").value,reproSteps:$("#betaFeedbackSteps").value,expected:$("#betaFeedbackExpected").value,actual:$("#betaFeedbackActual").value});for(const id of ["betaFeedbackTitle","betaFeedbackDescription","betaFeedbackSteps","betaFeedbackExpected","betaFeedbackActual"])$("#"+id).value="";render(state);toast("Beta-Feedback gesendet.")}catch(error){toast(error.message,true)}};

  $$("[data-deck-profile]").forEach(button=>button.onclick=async()=>{
    const profileId=String(button.dataset.deckProfile||"live");
    if(profileId===String(state?.streamDeck?.active_profile||"live"))return;
    try{
      streamDeckEditMode=false;
      streamDeckEditingId=null;
      if($("#streamDeckEditor"))$("#streamDeckEditor").hidden=true;
      state=await window.CFSLauncher.setStreamDeckProfile(profileId);
      render(state);
      const meta=deckProfileMeta(profileId,state?.streamDeck);
      toast(`${meta.label} geöffnet.`);
    }catch(error){toast(error.message,true)}
  });

  $("#streamDeckGrid").onclick=async event=>{
    const button=event.target.closest("[data-deck-button]");
    if(!button)return;
    const id=button.dataset.deckButton;
    const deckButton=(state?.streamDeck?.buttons||[]).find(item=>item.id===id);
    if(streamDeckEditMode){if(!deckSlotAllowed(deckButton)){toast("Diese Stream-Deck Taste ist in deinem aktuellen Plan gesperrt.",true);return}renderDeckEditor(id);return;}
    try{
      state=await window.CFSLauncher.runStreamDeckAction(id);
      render(state);
      const message=state?.streamDeckAction?.message||"Aktion ausgeführt.";
      toast(message);
    }catch(error){toast(error.message,true)}
  };

  $("#streamDeckEdit").onclick=()=>{
    streamDeckEditMode=!streamDeckEditMode;
    if(!streamDeckEditMode){
      streamDeckEditingId=null;
      $("#streamDeckEditor").hidden=true;
    }
    renderStreamDeck(state);
  };

  $("#streamDeckReset").onclick=async()=>{
    const meta=deckProfileMeta(state?.streamDeck?.active_profile,state?.streamDeck);
    if(!confirm(`${meta.label} auf die Standardbelegung zurücksetzen? Andere Deck-Seiten bleiben unverändert.`))return;
    try{
      state=await window.CFSLauncher.resetStreamDeck();
      streamDeckEditingId=null;
      $("#streamDeckEditor").hidden=true;
      render(state);
      toast(`${meta.label} zurückgesetzt.`);
    }catch(error){toast(error.message,true)}
  };

  $("#closeDeckEditor").onclick=()=>{
    streamDeckEditingId=null;
    $("#streamDeckEditor").hidden=true;
    renderStreamDeck(state);
  };

  $("#deckButtonAction").onchange=event=>{
    renderDeckTarget(event.target.value,"");
    renderDeckButtonPreview();
  };
  $("#deckButtonTarget").onchange=event=>{
    renderDeckTargetPreview($("#deckButtonAction").value,event.target.value);
  };
  $("#deckButtonLabel").oninput=()=>renderDeckButtonPreview();
  $("#deckButtonIcon").oninput=()=>{
    $$("[data-deck-icon]").forEach(el=>el.classList.toggle("selected",el.dataset.deckIcon===$("#deckButtonIcon").value));
    renderDeckButtonPreview();
  };
  $$("[data-deck-color]").forEach(button=>button.onclick=()=>{
    streamDeckEditorColor=deckButtonColor(button.dataset.deckColor);
    $$("[data-deck-color]").forEach(el=>el.classList.toggle("selected",el===button));
    renderDeckButtonPreview();
  });
  $$("[data-deck-icon]").forEach(button=>button.onclick=()=>{
    $("#deckButtonIcon").value=button.dataset.deckIcon||"";
    $$("[data-deck-icon]").forEach(el=>el.classList.toggle("selected",el===button));
    renderDeckButtonPreview();
  });

  $("#saveDeckButton").onclick=async()=>{
    if(!streamDeckEditingId)return;
    try{
      const action=$("#deckButtonAction").value;
      const def=deckActionDefinition(action);
      const target=def.target_kind==="none"?"":$("#deckButtonTarget").value;
      state=await window.CFSLauncher.saveStreamDeckButton({
        id:streamDeckEditingId,
        label:$("#deckButtonLabel").value,
        action,
        target,
        color:streamDeckEditorColor,
        icon:$("#deckButtonIcon").value
      });
      render(state);
      renderDeckEditor(streamDeckEditingId);
      toast("Stream-Deck Button gespeichert.");
    }catch(error){toast(error.message,true)}
  };

  $("#refreshScenes").onclick=()=>loadLauncherScenes();
  $("#launcherSceneGrid").onclick=event=>{
    const start=event.target.closest(".start-scene-output");
    const select=event.target.closest(".select-scene-output");
    const b=event.target.closest("[data-scene-url]");
    if(start?.dataset.sceneId){
      $("#outputSceneSelect").value=start.dataset.sceneId;
      startSelectedLocalOutput(start.dataset.sceneId).catch(e=>toast(e.message,true));
      return;
    }
    if(select?.dataset.sceneId){
      $("#outputSceneSelect").value=select.dataset.sceneId;
      toast("Scene für Local Output ausgewählt.");
      return;
    }
    if(!b?.dataset.sceneUrl)return;
    if(b.classList.contains("copy-launcher-scene"))navigator.clipboard.writeText(b.dataset.sceneUrl).then(()=>toast("Scene URL kopiert.")).catch(e=>toast(e.message,true));
    else window.open(b.dataset.sceneUrl,"_blank","noopener");
  };

  $("#startLocalOutput").onclick=()=>startSelectedLocalOutput().catch(e=>toast(e.message,true));

  $("#stopLocalOutput").onclick=async()=>{
    try{state=await window.CFSLauncher.stopLocalOutput();render(state);toast("Lokaler Output gestoppt.")}
    catch(e){toast(e.message,true)}
  };

  $("#reloadLocalOutput").onclick=async()=>{
    try{state=await window.CFSLauncher.reloadLocalOutput();render(state);toast("Output wird neu geladen.")}
    catch(e){toast(e.message,true)}
  };

  $("#outputAlwaysOnTop").onchange=async event=>{
    try{state=await window.CFSLauncher.setOutputAlwaysOnTop(event.target.checked);render(state)}
    catch(e){toast(e.message,true)}
  };

  $("#outputGateList").onclick=async event=>{
    const button=event.target.closest("[data-gate-key]");
    if(!button)return;
    try{
      state=await window.CFSLauncher.updateOutputGate({key:button.dataset.gateKey,status:button.dataset.gateStatus});
      render(state);
    }catch(e){toast(e.message,true)}
  };

  $("#resetOutputGate").onclick=async()=>{
    if(!confirm("Alle manuellen Output-Testergebnisse zurücksetzen?"))return;
    try{state=await window.CFSLauncher.resetOutputGate();render(state);toast("Output-Testliste zurückgesetzt.")}
    catch(e){toast(e.message,true)}
  };

  $("#exportOutputGate").onclick=async()=>{
    try{const result=await window.CFSLauncher.exportOutputGate();if(result?.ok)toast("Output-Testbericht exportiert.")}
    catch(e){toast(e.message,true)}
  };

  $("#refreshSystemHealth").onclick = async () => {
    try {
      state = await window.CFSLauncher.refreshCloudHealth();
      render(state);
      toast(state.creatorReady?.ready ? "Creator Ready: System ist bereit." : "Systemcheck abgeschlossen – es gibt noch offene Punkte.", !state.creatorReady?.ready);
    } catch (error) { toast(error.message, true); }
  };

  $("#exportConfig").onclick = async () => {
    try {
      const result = await window.CFSLauncher.exportConfig();
      if (result?.ok) toast("Portable Konfiguration exportiert – ohne Secrets.");
    } catch (error) { toast(error.message, true); }
  };

  $("#importConfig").onclick = async () => {
    try {
      const result = await window.CFSLauncher.importConfig();
      if (result?.canceled) return;
      state = result;
      render(state);
      openSetupWizard();
      toast("Konfiguration importiert. Bridge- und Provider-Key bitte neu setzen.");
    } catch (error) { toast(error.message, true); }
  };

  $("#createRestorePoint").onclick = async () => {
    try {
      state = await window.CFSLauncher.createRestorePoint("manual");
      render(state);
      toast("Lokaler Restore Point erstellt.");
    } catch (error) { toast(error.message, true); }
  };

  $("#recoveryList").onclick = async event => {
    const button = event.target.closest("[data-restore-id]");
    if (!button) return;
    try {
      state = await window.CFSLauncher.restorePoint(button.dataset.restoreId);
      render(state);
      toast("Restore Point wiederhergestellt.");
    } catch (error) { toast(error.message, true); }
  };

  $("#bridgeSelfTest").onclick = async () => {
    const out = $("#selfTestResult");
    out.hidden = false;
    out.innerHTML = "<strong>Bridge-Test läuft…</strong>";
    try {
      const result = await window.CFSLauncher.bridgeSelfTest();
      out.innerHTML = `<strong>${result.ok ? "SELBSTTEST ERFOLGREICH" : "SELBSTTEST FEHLER"}</strong>` +
        (result.checks || []).map(x => `<div><span>${escapeHtml(x.label)}</span><b>${x.ok ? "OK" : "FEHLER"}</b></div>`).join("") +
        `<small>${Number(result.duration_ms || 0)} ms</small>`;
      toast(result.ok ? "Bridge-Selbsttest erfolgreich." : "Bridge-Selbsttest meldet Fehler.", !result.ok);
    } catch (error) {
      out.innerHTML = `<strong>SELBSTTEST FEHLGESCHLAGEN</strong><p>${escapeHtml(error.message)}</p>`;
      toast(error.message, true);
    }
  };

  $("#exportDiagnostics").onclick = async () => {
    try {
      const result = await window.CFSLauncher.exportDiagnostics();
      if (result?.ok) toast("Diagnosebericht gespeichert.");
    } catch (error) { toast(error.message, true); }
  };

  $("#checkUpdate").onclick = async () => {
    try {
      const update = await window.CFSLauncher.checkForUpdates();
      state = { ...state, update };
      render(state);
    } catch (error) { toast(error.message, true); }
  };
  $("#downloadUpdate").onclick = async () => {
    try {
      const update = await window.CFSLauncher.downloadUpdate();
      state = { ...state, update };
      render(state);
    } catch (error) { toast(error.message, true); }
  };
  $("#installUpdate").onclick = async () => {
    try { await window.CFSLauncher.installUpdate(); }
    catch (error) { toast(error.message, true); }
  };

  $("#openLogs").onclick = () => window.CFSLauncher.openLogs();

  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  window.CFSLauncher.onState(next => render(next));
  window.CFSLauncher.onAction(action => queueTts(action));
}

async function selectCutMusic(projectId,musicName=""){
  try{
    state=await window.CFSLauncher.selectCutMusic({projectId,musicName});render(state);
    if(!state?.mediaMusicAction?.canceled)toast("Lokale Musikdatei zugeordnet.");
  }catch(error){toast(error.message,true)}
}

async function selectCutVoice(projectId,voiceName=""){
  try{
    state=await window.CFSLauncher.selectCutVoice({projectId,voiceName});render(state);
    if(!state?.mediaVoiceAction?.canceled)toast("Lokale Voiceover-Datei zugeordnet.");
  }catch(error){toast(error.message,true)}
}
async function selectCutMusicTrack(projectId,trackId,trackName=""){
  try{
    state=await window.CFSLauncher.selectCutMusicTrack({projectId,trackId,trackName});render(state);
    if(!state?.mediaExtraMusicAction?.canceled)toast(`Zusätzliche Musik zugeordnet: ${trackName||trackId}`);
  }catch(error){toast(error.message,true)}
}
async function selectCutVoiceTrack(projectId,trackId,trackName=""){
  try{
    state=await window.CFSLauncher.selectCutVoiceTrack({projectId,trackId,trackName});render(state);
    if(!state?.mediaExtraVoiceAction?.canceled)toast(`Zusätzliche Voice zugeordnet: ${trackName||trackId}`);
  }catch(error){toast(error.message,true)}
}

async function selectCutSfx(projectId,trackId,sfxName=""){
  try{
    state=await window.CFSLauncher.selectCutSfx({projectId,trackId,sfxName});render(state);
    if(!state?.mediaSfxAction?.canceled)toast(`Lokale SFX-Datei zugeordnet: ${sfxName||trackId}`);
  }catch(error){toast(error.message,true)}
}


document.addEventListener("DOMContentLoaded", init);
})();

import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||".");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const json=rel=>JSON.parse(read(rel));
const results=[];
const check=(name,ok)=>{results.push({name,ok:!!ok});console.log(`${ok?"PASS":"FAIL"} ${name}`);};
const versionAtLeast=(actual,min)=>{
  const a=String(actual).split(".").map(Number),b=String(min).split(".").map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}
  return true;
};

const pkg=json("package.json");
const launcher=json("launcher/package.json");
const stream=read("public/pages/stream-studio.html");
const streamCss=read("public/assets/css/stream-studio.css");
const scene=read("public/pages/scene-studio.html");
const sceneCss=read("public/assets/css/scene-studio.css");
const integrations=read("public/pages/integrations.html");
const styles=read("public/assets/css/styles.css");
const systemJs=read("public/assets/js/page-system-check.js");
const server=read("server.js");

check("backend >= 3.20.4",versionAtLeast(pkg.version,"3.20.4"));
check("launcher remains >= 0.47.28",versionAtLeast(launcher.version,"0.47.28"));
const serverBackend=(server.match(/const BACKEND_VERSION\s*=\s*\n?\s*"([^"]+)"/)||[])[1]||"0.0.0";
check("server runtime remains >= 3.20.4",versionAtLeast(serverBackend,"3.20.4"));
const systemBackend=(systemJs.match(/backend:"([^"]+)"/)||[])[1]||"0.0.0";
check("system check remains >= 3.20.4",versionAtLeast(systemBackend,"3.20.4"));
check("schema remains 73",systemJs.includes("schema:73"));

for(const topic of ["START & STATUS","GESTALTEN","PRODUZIEREN","VERBINDEN","COMMUNITY","SYSTEM & TESTS"]){
  check(`stream hub taxonomy ${topic}`,stream.includes(`<b>${topic}</b>`));
}
for(const step of ["Bühne bauen","Bild, Ton & Output","Stream prüfen","LIVE Session","Überwachen"]){
  check(`stream workflow step ${step}`,stream.includes(`<strong>${step}</strong>`));
}
for(const anchor of ['href="#scene-composer"','href="#stream-io"','href="#stream-preflight"','href="#stream-session"','href="#stream-live-operations"']){
  check(`stream workflow anchor ${anchor}`,stream.includes(anchor));
}
for(const id of ["previewMonitor","programMonitor","streamSceneList","streamSourceLibrary","activeOverlayRack","streamMixer","streamOutputProfile","streamDestination","streamEncoder","streamBitrate","takeScene","stream-preflight","stream-session","stream-activity"]){
  check(`stream core id retained ${id}`,stream.includes(`id="${id}"`));
}
check("stream categories separate stage",stream.includes("Bühne & Szenen"));
check("stream categories separate io",stream.includes("Bild, Ton & Output"));
check("stream categories separate live control",stream.includes("Prüfen, starten, überwachen"));
check("stream security wording stays local",stream.includes("Rohdaten und Stream-Credentials bleiben im Launcher"));
check("stream workflow css exists",streamCss.includes(".stream-workflow-guide"));
check("stream headings css exists",streamCss.includes(".stream-flow-heading"));
check("stream workflow responsive two columns",streamCss.includes("@media(max-width:980px)")&&streamCss.includes("repeat(2,minmax(0,1fr))"));
check("stream workflow responsive one column",streamCss.includes("@media(max-width:620px)")&&streamCss.includes(".stream-workflow-guide{grid-template-columns:1fr}"));

for(const step of ["Plattform verbinden","Launcher verbinden","Im Stream Studio nutzen"]){
  check(`integration journey ${step}`,integrations.includes(`<strong>${step}</strong>`));
}
check("integrations provider group",integrations.includes('id="integrationProvidersTitle"')&&integrations.includes("Streaming-Plattformen"));
check("integrations local group",integrations.includes('id="integrationLocalTitle"')&&integrations.includes("PC, Launcher & OBS"));
check("integrations advanced group",integrations.includes('id="integrationAdvancedTitle"')&&integrations.includes("Erweitert & Diagnose"));
for(const id of ["ttStatus","ttText","twitchIntegrationCard","twitchIntegrationBadge","twitchConnect","twitchSync","twitchDisconnect","youtubeIntegrationCard","youtubeIntegrationBadge","youtubeConnect","youtubeSync","youtubeDisconnect","obsIntegrationStatus","nexusInfo"]){
  check(`integration runtime id retained ${id}`,integrations.includes(`id="${id}"`));
}
check("integrations explain provider isolation",integrations.includes("Jeder Provider bleibt technisch getrennt"));
check("integrations explain local secret boundary",integrations.includes("Stream-Credentials")&&integrations.includes("lokalen Desktop-Weg"));
check("integrations direct to stream studio",integrations.includes('/pages/stream-studio.html#stream-live-operations'));
check("integration grouped css exists",styles.includes(".integration-group-head")&&styles.includes(".integrations-provider-grid"));
check("integration journey responsive",styles.includes(".integration-journey,.integrations-provider-grid{grid-template-columns:1fr}"));

check("scene studio marked compatibility editor",scene.includes("SCENE STUDIO · DIREKT-EDITOR")&&scene.includes("kompatibler Direkt-Editor"));
check("scene normal path points to stream composer",scene.includes('/pages/stream-studio.html#scene-composer'));
check("scene keeps published-widget rule",scene.includes("Nur veröffentlichte Widgets stehen in der Scene-Library bereit."));
check("scene transition build language retained",scene.includes("Ebenen, Übergang, Skalierung"));
for(const id of ["newVerticalScene","newLandscapeScene","sceneCanvas","sceneName","publishScene","sceneTransition","sceneTransitionDuration","sceneTransitionEase","previewSceneTransition","sceneOutputUrl","widgetLibrary"]){
  check(`scene core id retained ${id}`,scene.includes(`id="${id}"`));
}
check("scene compatibility css exists",sceneCss.includes(".scene-routing-card")&&sceneCss.includes(".scene-hero-compact"));

check("v158 check registered",pkg.scripts?.["workspace158:check"]==="node tools/workspace-flow-v158-test.mjs .");
check("v158 release chains v157",pkg.scripts?.["release:v158"]==="npm run release:v157 && npm run workspace158:check");

const passed=results.filter(x=>x.ok).length;
console.log(`\nWorkspace Flow v158: ${passed}/${results.length} ${passed===results.length?"PASS":"FAIL"}`);
if(passed!==results.length)process.exit(1);

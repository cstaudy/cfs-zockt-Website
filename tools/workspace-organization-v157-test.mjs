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
const launcherPkg=json("launcher/package.json");
const launcher=read("launcher/renderer/index.html");
const launcherCss=read("launcher/renderer/styles.css");
const widget=read("public/pages/widget-studio.html");
const widgetCss=read("public/assets/css/widget-studio.css");
const dashboard=read("public/pages/dashboard.html");
const styles=read("public/assets/css/styles.css");
const suite=read("public/pages/creator-suite.html");
const systemJs=read("public/assets/js/page-system-check.js");

check("backend >= 3.20.3",versionAtLeast(pkg.version,"3.20.3"));
check("launcher >= 0.47.28",versionAtLeast(launcherPkg.version,"0.47.28"));

for(const group of ["START & STATUS","VERBINDEN","PRODUZIEREN","COMMUNITY","CREATOR TOOLS","SYSTEM & TESTS"]){
  check(`launcher group ${group}`,launcher.includes(`>${group}</div>`));
}
for(const view of ["live","bridge","sync","deck","streamengine","output","obs","events","audio","bot","tools","system","beta","settings"]){
  check(`launcher nav remains reachable: ${view}`,launcher.includes(`data-view="${view}"`));
  check(`launcher view remains present: ${view}`,launcher.includes(`data-page="${view}"`));
}
check("launcher generic tools renamed explicitly",launcher.includes("GAMES & CUT</button>")&&launcher.includes("<h1>GAMES & CUT.</h1>"));
check("launcher nav scrolls on short screens",launcherCss.includes(".sidebar nav{")&&launcherCss.includes("overflow-y:auto")&&launcherCss.includes("@media(max-height:820px)"));

for(const label of ["01 · ERSTELLEN","02 · VERWALTEN","03 · WEITER ZUM STREAM"]){
  check(`widget category ${label}`,widget.includes(label));
}
for(const action of ['data-action="open-create"','data-action="open-latest-widget"','data-action="open-brand"','data-action="open-bridge"']){
  check(`widget action preserved ${action}`,widget.includes(action));
}
for(const filter of ['data-dashboard-filter="favorites"','data-dashboard-filter="draft"','data-dashboard-filter="live"']){
  check(`widget library shortcut preserved ${filter}`,widget.includes(filter));
}
check("widget flow links Scene Studio",widget.includes('href="/pages/scene-studio.html"'));
check("widget flow links CFS Studio",widget.includes('href="/pages/stream-studio.html"'));
check("widget categorized layout responsive",widgetCss.includes(".ws-simple-category-grid")&&widgetCss.includes("@media(max-width:720px)"));

for(const label of ["01 · START &amp; STATUS","02 · GESTALTEN","03 · PRODUZIEREN","04 · VERBINDEN","05 · COMMUNITY","06 · SYSTEM &amp; TESTS"]){
  check(`dashboard taxonomy ${label}`,dashboard.includes(label));
}
check("dashboard taxonomy responsive grid",styles.includes(".creator-workspace-map-grid-v157{grid-template-columns:repeat(3")&&styles.includes(".creator-workspace-map-grid-v157{grid-template-columns:repeat(2")&&styles.includes(".creator-workspace-map-grid-v157{grid-template-columns:1fr}"));

for(const topic of ["Start &amp; Status","Gestalten","Produzieren","Verbinden","Community","System &amp; Tests"]){
  check(`public suite topic ${topic}`,suite.includes(`<strong>${topic}</strong>`));
}
check("multistream safety wording retained",suite.includes("LOCAL MULTISTREAM")&&suite.includes("Capture und Zugangsdaten bleiben im Launcher"));
const systemBackend=(systemJs.match(/backend:"([^"]+)"/)||[])[1]||"0.0.0";
const systemLauncher=(systemJs.match(/launcher:"([^"]+)"/)||[])[1]||"0.0.0";
check("system check backend remains >= v157",versionAtLeast(systemBackend,"3.20.3"));
check("system check launcher remains >= v157",versionAtLeast(systemLauncher,"0.47.28"));
check("v157 check registered",pkg.scripts?.["workspace157:check"]==="node tools/workspace-organization-v157-test.mjs .");
check("v157 release chains v156",pkg.scripts?.["release:v157"]==="npm run release:v156 && npm run workspace157:check");

const passed=results.filter(x=>x.ok).length;
console.log(`\nWorkspace Organization v157: ${passed}/${results.length} ${passed===results.length?"PASS":"FAIL"}`);
if(passed!==results.length)process.exit(1);

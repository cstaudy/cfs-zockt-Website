import fs from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv[2] || ".");
let failed = 0, passed = 0;
function check(ok, label) { if (ok) { console.log("PASS", label); passed++; } else { console.error("FAIL", label); failed++; } }
const html = fs.readFileSync(path.join(root,"public","pages","dashboard.html"),"utf8");
const js = fs.readFileSync(path.join(root,"public","assets","js","page-dashboard.js"),"utf8");
const css = fs.readFileSync(path.join(root,"public","assets","css","styles.css"),"utf8");
check(html.includes('id="dashboardGreeting"'), "dashboard greeting hook");
check(html.includes('id="nextStepCard"') && html.includes('id="nextStepTitle"') && html.includes('id="nextStepAction"'), "next-step card");
check(html.includes('id="progressSetup"') && html.includes('id="progressWidget"') && html.includes('id="progressTikTok"') && html.includes('id="progressLauncher"'), "four-step creator journey");
check(html.includes('id="toolReadyCount"') && html.includes('id="toolAccessPlan"') && html.includes('id="toolTotalCount"'), "tool summary hooks");
check(js.includes('const journey = { setup: null, widget: null, tiktok: null, launcher: null }'), "journey state is explicit");
check(js.includes('const renderNextStep = () =>'), "next-step renderer");
check(js.includes('Dafür brauchst du weder TikTok noch eine LIVE-Verbindung.'), "manual widget independence copy");
check(js.includes('journey.tiktok = "unknown"') && js.includes('journey.launcher = "unknown"') && js.includes('journey.widget = "unknown"') && js.includes('journey.setup = "unknown"'), "API failures remain unknown");
check(js.includes('const statusLabel = status =>') && js.includes('roadmap:"ROADMAP"'), "product status labels");
check(js.includes('const usableModules = modules.filter'), "tool counts use real module registry output");
check(css.includes('PASS 21.3.8 · Dashboard guidance and tool entry hierarchy'), "dashboard pass styles");
check(css.includes('.creator-next-step') && css.includes('.creator-journey-grid') && css.includes('.creator-tool-summary'), "dashboard hierarchy styles");
check(!html.includes('<script>'), "no inline dashboard script");
check(html.includes('noindex,nofollow,noarchive'), "dashboard remains noindex");
if (failed) { console.error(`Dashboard Pass 21.3.8: ${failed} failed / ${passed} passed`); process.exit(1); }
console.log(`Dashboard Pass 21.3.8: ${passed}/${passed} PASS`);

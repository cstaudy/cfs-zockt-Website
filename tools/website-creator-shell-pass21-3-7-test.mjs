import fs from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv[2] || ".");
const pages = path.join(root,"public","pages");
const targets = ['dashboard.html','account.html','setup.html','launcher.html','launcher-connect.html','games.html','widget-studio.html','scene-studio.html','cut-studio.html','nexus.html','audio-studio.html','editor.html','integrations.html','tiktok.html','settings.html'];
let failed = 0, passed = 0;
function check(ok, label) { if (ok) { console.log("PASS", label); passed++; } else { console.error("FAIL", label); failed++; } }
for (const file of targets) {
  const html = fs.readFileSync(path.join(pages,file),"utf8");
  check(html.includes('class="site-header creator-site-header"'), `${file} creator header`);
  check(html.includes('data-creator-nav'), `${file} creator nav marker`);
  check(html.includes('/pages/dashboard.html') && html.includes('/pages/widget-studio.html') && html.includes('/pages/tiktok.html') && html.includes('/pages/integrations.html') && html.includes('/pages/launcher.html') && html.includes('/pages/account.html'), `${file} core creator routes`);
  check(html.includes('/pages/scene-studio.html') && html.includes('/pages/editor.html') && html.includes('/pages/games.html') && html.includes('/pages/cut-studio.html') && html.includes('/pages/nexus.html') && html.includes('/pages/setup.html') && html.includes('/pages/settings.html'), `${file} extended creator routes`);
  check(html.includes('data-logout'), `${file} logout control`);
  check(html.includes('noindex,nofollow,noarchive'), `${file} noindex`);
}
const dashboard = fs.readFileSync(path.join(pages,"dashboard.html"),"utf8");
check(dashboard.includes('id="adminCreatorNav"') && dashboard.includes('creator-workspace-map'), "dashboard admin gate and workspace map");
const app = fs.readFileSync(path.join(root,"public","assets","js","app.js"),"utf8");
check(app.includes('function initCreatorNavigation()') && app.includes('initCreatorNavigation();'), "central creator navigation behavior");
const css = fs.readFileSync(path.join(root,"public","assets","css","styles.css"),"utf8");
check(css.includes('PASS 21.3.7 · Unified Creator Suite workspace') && css.includes('.creator-nav-more-menu'), "creator workspace styles");
if (failed) { console.error(`Creator Shell Pass 21.3.7: ${failed} failed / ${passed} passed`); process.exit(1); }
console.log(`Creator Shell Pass 21.3.7: ${passed}/${passed} PASS`);

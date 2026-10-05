import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const expect = (name, condition) => checks.push({name, pass:Boolean(condition)});

const dashboard = read("public/pages/dashboard.html");
const widgets = read("public/pages/widget-studio.html");
const builder = read("public/pages/universal-builder.html");
const shop = read("public/pages/shop.html");
const styles = read("public/assets/css/cfs-suite-v203.css");
const shell = read("public/assets/js/cfs-shell-v3.js");
const navigation = read("public/assets/js/cfs-suite-navigation-v204.js");

for (const [name, html] of [["Dashboard",dashboard],["Widget Studio",widgets],["Universal Builder",builder]]) {
  expect(`${name}: gemeinsamer UI-Layer geladen`, html.includes('href="/assets/css/cfs-suite-v203.css"'));
  expect(`${name}: Suite-Datenattribut gesetzt`, html.includes('data-cfs-suite-v203="1"'));
}

expect("Dashboard: Builder-Schnellzugriff vorhanden", dashboard.includes('href="/pages/universal-builder.html"><b>✦</b>'));
expect("Dashboard: sechs Schnellzugriffe sichtbar", (dashboard.match(/class="creator-dashboard-actions-grid-v166"/g) || []).length === 1 && (dashboard.match(/<a href="\/pages\//g) || []).length >= 6);
expect("Dashboard: kleine Legacy-Kacheln werden überschrieben", styles.includes('.creator-dashboard-actions-grid-v166>a:nth-child(n+4){\n  display:grid!important;'));
expect("Widget Studio: geführte Bereiche lesbarer", styles.includes('.ws-simple-category>header>strong'));
expect("Widget Studio: Editor-Schritte lesbarer", styles.includes('.ws-simple-editor-nav button strong'));
expect("Widget Studio: Umwandler sichtbar im Ablauf", widgets.includes('id="wsWidgetConverter"') && widgets.includes('id="wsPanelConverter"'));
expect("Widget Studio: Standardroute ohne Anfänger-/Profi-Auswahl", widgets.includes('STANDARD-ABLAUF') && !widgets.includes('ANFÄNGER-MODUS') && styles.includes('.ws-experience-switch{\n  display:none!important;'));
expect("Dashboard: Umwandler direkt erreichbar", dashboard.includes('href="/pages/widget-studio.html?open=converter"'));
expect("Shop: Bereiche nach Aufgabe sichtbar", shop.includes('class="shop-route-grid"') && shop.includes('data-shop-quick-filter="bundles"') && shop.includes('Umwandler öffnen'));
expect("Shop: Filterkarten funktionieren", read("public/assets/js/page-shop-v172.js").includes("data-shop-quick-filter"));
expect("Creator-Shell: Suite-Layer auf weiteren Seiten", shell.includes("function ensureSuiteV203()") && shell.includes("cfs-suite-v203.css"));
expect("Deep-Link: Umwandler öffnet sich direkt", navigation.includes('open === "converter"') && navigation.includes('wsWidgetConverter'));
expect("Universal Builder: lesbare Arbeitsfläche", styles.includes('.ub-panel-head h2') && styles.includes('.ub-form-section label>span'));
expect("Responsive Suite-Breakpoints vorhanden", styles.includes('@media(max-width:680px)'));
expect("CSS-Klammern ausgeglichen", (styles.match(/{/g) || []).length === (styles.match(/}/g) || []).length);

const failed = checks.filter(check => !check.pass);
for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
if (failed.length) process.exit(1);
console.log(`Creator Suite UI v204: ${checks.length}/${checks.length} PASS`);

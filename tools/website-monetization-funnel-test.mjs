import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

const server = read("server.js");
const home = read("public/index.html");
const app = read("public/assets/js/app.js");
const login = read("public/pages/login.html");
const loginJs = read("public/assets/js/page-login.js");
const styles = read("public/assets/css/styles.css");
const configPath = path.join(root, "public/config/monetization.json");

// TikTok funnel routes are fixed redirects, never open redirects.
for (const route of ["/go/tiktok", "/go/tiktok/tools", "/go/tiktok/community"]) {
  expect(server.includes(`app.get("${route}"`), `TikTok Funnel Route fehlt: ${route}`);
}
expect(server.includes("utm_source=tiktok"), "TikTok Funnel braucht eine eindeutige utm_source Attribution.");
expect(server.includes("utm_medium=social"), "TikTok Funnel braucht utm_medium=social.");
expect(!/res\.redirect\([^\n]*req\.(query|body|params)/.test(server), "Funnel darf keinen offenen Redirect aus Request-Daten erzeugen.");

// Source-aware public landing experience.
expect(home.includes("data-source-entry hidden"), "Source Entry Banner muss standardmäßig verborgen sein.");
expect(home.includes('data-funnel-cta="tiktok-tools"'), "TikTok Tools CTA fehlt.");
expect(home.includes('data-funnel-cta="tiktok-community"'), "TikTok Community CTA fehlt.");
expect(home.includes('data-funnel-cta="tiktok-register"'), "TikTok Registration CTA fehlt.");
expect(app.includes('source === "tiktok"'), "Frontend erkennt TikTok-Traffic nicht.");
expect(app.includes('sessionStorage.setItem("cfsTrafficSource"'), "Funnel Source wird nicht flüchtig in der Session erhalten.");
expect(app.includes('target.searchParams.set("source", "tiktok")'), "TikTok Source wird nicht bis zur Registrierung erhalten.");
expect(login.includes("data-login-source-context hidden"), "Login/Registrierung braucht einen verborgenen TikTok-Kontext.");
expect(loginJs.includes('source === "tiktok"'), "Login-Seite erkennt TikTok Source nicht.");

// Monetization surface must be opt-in and empty by default.
expect(fs.existsSync(configPath), "Monetarisierungs-Konfiguration fehlt.");
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.version === 1, "Monetarisierungs-Konfiguration braucht Version 1.");
    expect(config.enabled === false, "Partnerfläche muss standardmäßig deaktiviert sein.");
    expect(Array.isArray(config.items) && config.items.length === 0, "Keine erfundenen Partner/Produkte in der Default-Konfiguration.");
    expect(/WERBUNG|AFFILIATE/i.test(String(config.disclosure || "")), "Disclosure muss Werbung/Affiliate klar benennen.");
  } catch (error) {
    errors.push(`Monetarisierungs-Konfiguration ist ungültiges JSON: ${error.message}`);
  }
}
expect(home.includes("data-partner-section hidden"), "Partnerfläche muss ohne echte Partner verborgen bleiben.");
expect(app.includes('fetch("/config/monetization.json"'), "Partnerfläche lädt nicht aus der kontrollierten Konfiguration.");
expect(app.includes('config?.enabled !== true'), "Partnerfläche besitzt keinen expliziten Opt-in-Schalter.");
expect(app.includes('link.rel = "sponsored noopener noreferrer"'), "Affiliate-Ausgänge brauchen sponsored/noopener/noreferrer.");
expect(app.includes('url.protocol !== "https:"'), "Partnerlinks müssen HTTPS erzwingen.");
expect(app.includes("textContent"), "Partnerdaten müssen als Text statt unsicherem HTML gerendert werden.");
expect(styles.includes("brand-partner-grid"), "Partnerflächen-Styles fehlen.");

// This pass deliberately adds no third-party trackers, ad networks, fake price claims or fake social proof.
const publicBundle = [home, app, login, loginJs, configPath && fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : ""].join("\n");
for (const marker of ["googletagmanager.com", "google-analytics.com", "doubleclick.net", "connect.facebook.net", "analytics.tiktok.com", "ttq.track", "fbq("]) {
  expect(!publicBundle.includes(marker), `Drittanbieter-Tracking wurde ohne Consent-Pass eingebaut: ${marker}`);
}
for (const fakeMarker of ["1000 Nutzer", "10.000 Nutzer", "4.9/5", "50% Rabatt", "BESTSELLER"]) {
  expect(!publicBundle.includes(fakeMarker), `Unbelegte Marketingbehauptung gefunden: ${fakeMarker}`);
}

if (errors.length) {
  console.error("MONETIZATION / TIKTOK FUNNEL PASS CHECK: FEHLER");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("MONETIZATION / TIKTOK FUNNEL PASS CHECK: OK");
console.log("- TikTok Shortlinks + Source Attribution geprüft");
console.log("- TikTok Landing-/Registrierungs-Kontext geprüft");
console.log("- Partnerfläche opt-in, standardmäßig leer und unsichtbar");
console.log("- Affiliate-Kennzeichnung + HTTPS/sponsored Linkschutz geprüft");
console.log("- keine externen Tracking-/Ad-Skripte hinzugefügt");

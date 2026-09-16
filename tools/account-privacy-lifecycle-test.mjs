import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||".");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const server=read("server.js");
const account=read("public/pages/account.html");
const accountJs=read("public/assets/js/page-account.js");
const privacy=read("public/pages/datenschutz.html");
const settings=read("public/pages/settings.html");
const pkg=JSON.parse(read("package.json"));

const checks=[
  ["session list route",server.includes('"/api/account/sessions"')],
  ["session revoke route",server.includes('"/api/account/sessions/:sessionRef"')],
  ["session refs hide token hash",server.includes("creatorSessionReference") && !accountJs.includes("token_hash")],
  ["data export route",server.includes('"/api/account/export"')],
  ["export requires password",server.includes("verifyCreatorPasswordForLifecycle")],
  ["export rate limited",server.includes("accountExportLimiter")],
  ["export redaction",server.includes("sanitizeAccountExportValue") && server.includes("[redacted]")],
  ["raw asset content excluded",server.includes("SELECT id,original_name,label,media_type,mime_type,file_ext,byte_size,auto_category,category,metadata,created_at,updated_at FROM creator_widget_assets")],
  ["oauth tokens not selected in export",server.includes("tiktok_connection") && server.includes("SELECT connected,scope,display_name,avatar_url")],
  ["security event export",server.includes('"data_export_requested"')],
  ["session revoke event",server.includes('"session_revoked"')],
  ["tiktok disconnect event",server.includes('"tiktok_disconnected"')],
  ["account page session UI",account.includes('id="sessionList"')],
  ["account page export UI",account.includes('id="dataExportForm"')],
  ["account page tiktok lifecycle UI",account.includes('id="disconnectTikTokBtn"')],
  ["frontend downloads JSON",accountJs.includes("cfs_zockt-account-export-") && accountJs.includes("URL.createObjectURL")],
  ["frontend revokes individual session",accountJs.includes("/api/account/sessions/${encodeURIComponent(item.id)}")],
  ["privacy describes self service",privacy.includes("Self-Service: Sessions, TikTok, Export und Löschung")],
  ["privacy excludes secrets",privacy.includes("OAuth-Tokens") && privacy.includes("Source-/Bridge-Keys")],
  ["settings no longer claims password change",!settings.includes("Passwort ändern")],
  ["settings exposes privacy tools",settings.includes("DATENSCHUTZ-TOOLS")],
  ["delete tries provider revoke",server.includes("account_delete_tiktok_revoke")],
  ["lifecycle script wired",pkg.scripts?.["lifecycle:check"]?.includes("account-privacy-lifecycle-test.mjs")],
  ["account still noindex",account.includes('name="robots" content="noindex,nofollow,noarchive"')],
];

let passed=0;
for(const [name,ok] of checks){
  if(ok){console.log(`PASS ${name}`);passed++;}
  else console.error(`FAIL ${name}`);
}
console.log(`\n${passed}/${checks.length} lifecycle checks passed.`);
if(passed!==checks.length) process.exit(1);

import fs from "node:fs";
import path from "node:path";
const root=path.resolve(process.argv[2]||".");
const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");
const server=read("server.js");
const js=read("public/assets/js/widget-studio.js");
const html=read("public/pages/widget-studio.html");
const checks=[];
const ok=(name,cond)=>checks.push([name,!!cond]);
ok("runtime taxonomy guard",server.includes("assertWidgetProviderTaxonomy();")&&server.includes("widget_provider_event_mismatch")&&server.includes("widget_provider_metric_mismatch"));
ok("twitch forbids TikTok event words",/twitch: Object\.freeze\(\{forbidden_events:new Set\(\[[^\]]*\"gift\"[^\]]*\"share\"[^\]]*\"like\"[^\]]*\"viewer\"/.test(server));
ok("TikTok forbids Twitch-only event words",/tiktok: Object\.freeze\(\{forbidden_events:new Set\(\[[^\]]*\"subscribe\"[^\]]*\"cheer\"/.test(server));
ok("provider UI taxonomy exists",js.includes("const providerWidgetTaxonomy=")&&js.includes("TikTok Follow-, Gift-, Share-")&&js.includes("Twitch Follow-, Sub-/Gift-Sub- und Cheer-Alerts"));
ok("Twitch search examples are Twitch-only",js.includes('search:"z. B. Twitch Chat, Follow, Sub, Gift-Sub oder Cheer"'));
ok("TikTok search examples are TikTok-only",js.includes('search:"z. B. LIVE Like, Gift, Share, Follower oder TikTok Chat"'));
ok("Twitch Latest guide excludes TikTok gift/share",js.includes("TWITCH · LETZTE EVENTS")&&js.includes("Letzter Twitch-Follower"));
ok("TikTok Latest guide is explicit",js.includes("TIKTOK · LETZTE EVENTS")&&js.includes("Letztes TikTok-Gift + Sender"));
ok("Twitch card vocabulary",html.includes("Subs/Gift-Subs, Cheers/Bits")&&!/data-platform-filter="twitch"[\s\S]{0,220}Likes, Gifts, Shares/.test(html));
ok("generic search placeholder",html.includes("Widgets im gewählten Stream-Bereich suchen"));
ok("backend version",versionAtLeast(JSON.parse(read("package.json")).version,"3.16.1"));
const failed=checks.filter(([,v])=>!v);
for(const [n,v] of checks)console.log(`${v?"PASS":"FAIL"} ${n}`);
if(failed.length){console.error(`\n${failed.length} checks failed`);process.exit(1)}
console.log(`\nProvider Widget Taxonomy v147: ${checks.length}/${checks.length} PASS`);
function versionAtLeast(actual,minimum){
  const a=String(actual||'').split('.').map(Number),m=String(minimum||'').split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}
  return true;
}


import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root=path.resolve(process.argv[2]||".");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const json=rel=>JSON.parse(read(rel));
const home=read("public/index.html");
const css=read("public/assets/css/cfs-gaming-home-v112.css");
const impressum=read("public/pages/impressum.html");
const privacy=read("public/pages/datenschutz.html");
const terms=read("public/pages/nutzungsbedingungen.html");
const pkg=json("package.json");
const lock=json("package-lock.json");
const launcher=json("launcher/package.json");
const server=read("server.js");
const system=read("public/assets/js/page-system-check.js");
const checks=[];
const check=(name,ok)=>{checks.push({name,ok:Boolean(ok)});console.log(`${ok?"PASS":"FAIL"} ${name}`)};
const versionAtLeast=(actual,minimum)=>{const a=String(actual||"").split(".").map(Number),m=String(minimum||"").split(".").map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}return true;};
const visibleText=home
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&[a-z0-9#]+;/gi," ")
  .replace(/\s+/g," ")
  .trim();
const visibleWords=(visibleText.match(/[A-Za-zÀ-ž0-9_'-]+/g)||[]).length;
const emailPattern=/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;

const backendParts=String(pkg.version||"").split(".").map(Number);
const backendAtLeast162=backendParts.length===3&&(backendParts[0]>3||(backendParts[0]===3&&(backendParts[1]>20||(backendParts[1]===20&&backendParts[2]>=8))));
check("backend version at least 3.20.8",backendAtLeast162&&lock.version===pkg.version&&lock.packages?.[""]?.version===pkg.version&&server.includes(`"${pkg.version}"`));
check("schema remains 73",system.includes("schema:73"));
check("launcher remains >= 0.47.29",versionAtLeast(launcher.version,"0.47.29")&&system.includes(`launcher:"${launcher.version}"`));
check("homepage visible copy stays compact",visibleWords<=400);
check("duplicated about-me section removed",!home.includes('id="about-me"')&&!home.includes("gaming-about-me"));
check("header navigation no longer links duplicate about section",!home.includes('href="#about-me"'));
check("hero copy is one concise sentence",home.includes("Gaming, LIVE-Streams, Community und Creator-Tools."));
check("hero no longer uses personal intro wording",!home.includes("ICH BIN")&&!home.includes("GAMING IST MEIN ZUHAUSE"));
check("PlayStation heading is neutral and compact",home.includes('gaming-kicker-line">PLAYSTATION</span><h2>ZULETZT GESPIELT</h2>'));
check("offer intro is concise or removed in later cleanup",!home.includes('id="angebot"')||home.includes("Vier Wege. Direkt zum Ziel."));
check("launcher technical metadata is compact when offer is present",!home.includes('id="angebot"')||home.includes(`Launcher ${launcher.version} · Windows x64`));
check("beta copy is concise",(home.match(/(?:Aktuell )?[Kk]ostenlose geschlossene Beta\./g)||[]).length>=1);
check("live intro is concise",home.includes("LIVE-Status für Twitch und TikTok."));
check("live functionality remains",home.includes('id="twitchLiveIndicator"')&&home.includes('id="tiktokLiveIndicator"')&&home.includes('id="liveStatusBadge"'));
check("Twitch and TikTok channel links remain",home.includes("TWITCH-KANAL ÖFFNEN")&&home.includes("TIKTOK-KANAL ÖFFNEN"));
const scheduleIconCount=(home.match(/gaming-schedule-icon/g)||[]).length;
check("stream expectation cards are either compact legacy trio or removed",scheduleIconCount===0||scheduleIconCount===3);
const scheduleCopies=[...home.matchAll(/<div class="gaming-schedule-copy">([\s\S]*?)<\/div>/gi)].map(match=>match[1]);
check("stream expectation cards contain no explanatory paragraphs",scheduleCopies.length===0||scheduleCopies.every(block=>!/<p\b/i.test(block)));
check("PlayStation cards remain three slots",(home.match(/data-game-slot=/g)||[]).length===3);
check("verbose PlayStation data note removed",!home.includes("gaming-recent-note"));
check("community cards remain reachable",home.includes("TIKTOK ÖFFNEN")&&home.includes("DISCORD BEITRETEN")&&home.includes("CREATOR SUITE →"));
check("homepage contains no email address",!emailPattern.test(home));
check("homepage contains no mailto contact",!home.includes("mailto:"));
check("homepage contains no postal address markup",!/<address\b/i.test(home));
check("homepage contains no phone or birth-date labels",!/(Telefon|Geburtsdatum|Geboren am|Anschrift:)/i.test(home));
check("legal contact data remains confined to legal pages",emailPattern.test(impressum)&&emailPattern.test(privacy)&&emailPattern.test(terms));
check("legal pages stay linked from footer",home.includes('/pages/impressum.html')&&home.includes('/pages/datenschutz.html')&&home.includes('/pages/nutzungsbedingungen.html'));
check("public social identity remains present",home.includes("https://www.twitch.tv/cfs_zockt")&&home.includes("https://www.tiktok.com/@cfs_zockt"));
check("v162 compact CSS overrides exist",css.includes("v162: kompaktere öffentliche Startseite")&&css.includes("gaming-offer-grid small"));
check("privacy audit document exists",fs.existsSync(path.join(root,"PUBLIC-PRIVACY-AUDIT-v162.md")));
check("v162 check registered",pkg.scripts?.["homepage162:check"]==="node tools/homepage-concise-privacy-v162-test.mjs .");
check("v162 release chains v161",pkg.scripts?.["release:v162"]==="npm run release:v161 && npm run homepage162:check");

const pass=checks.filter(x=>x.ok).length;
console.log(`\nHomepage concise + privacy v162: ${pass}/${checks.length} ${pass===checks.length?"PASS":"FAIL"}`);
if(pass!==checks.length)process.exit(1);

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const root=path.resolve(process.argv[2]||".");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const json=rel=>JSON.parse(read(rel));
const checks=[];
const check=(name,ok)=>{checks.push({name,ok:Boolean(ok)});console.log(`${ok?"PASS":"FAIL"} ${name}`)};
const pkg=json("package.json"),lock=json("package-lock.json"),launcher=json("launcher/package.json");
const versionAtLeast=(actual,minimum)=>{
  const a=String(actual||"").split(".").map(Number),m=String(minimum||"").split(".").map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}
  return true;
};
const server=read("server.js"),home=read("public/index.html"),js=read("public/assets/js/cfs-gaming-home-v112.js"),css=read("public/assets/css/cfs-gaming-home-v112.css"),snapshotSource=read("lib/creator-state-snapshot.js"),system=read("public/assets/js/page-system-check.js");

check("backend version is at least 3.20.7",versionAtLeast(pkg.version,"3.20.7")&&versionAtLeast(lock.version,"3.20.7")&&versionAtLeast(lock.packages?.[""]?.version,"3.20.7")&&server.includes(`"${pkg.version}"`));
check("schema remains 73",system.includes("schema:73"));
check("launcher remains >= 0.47.29",versionAtLeast(launcher.version,"0.47.29")&&system.includes(`launcher:"${launcher.version}"`));

check("homepage uses transparent wordmark in header",home.includes('<img src="/assets/img/brand/cfs-zockt-wordmark-transparent.png" alt="cfs_zockt">'));
check("homepage no longer uses opaque logo asset",!home.includes('/assets/img/brand/cfs-zockt-logo.png'));
const wordmark=fs.readFileSync(path.join(root,"public/assets/img/brand/cfs-zockt-wordmark-transparent.png"));
check("wordmark is PNG RGBA with alpha channel",wordmark.length>32&&wordmark.subarray(1,4).toString()==="PNG"&&wordmark[25]===6);
check("header logo has transparent-friendly object-fit styling",css.includes("object-fit:contain")&&css.includes("gaming-brand img"));
check("footer uses same transparent wordmark",(home.match(/cfs-zockt-wordmark-transparent\.png/g)||[]).length>=2);
check("structured data lists Twitch and TikTok profiles",home.includes('https://www.twitch.tv/cfs_zockt')&&home.includes('https://www.tiktok.com/@cfs_zockt'));

check("public live evidence reads integration_health live provider",server.includes("integrationHealth.live_provider")&&server.includes("liveProviderHealth.status")&&server.includes("liveProviderHealth.ready"));
check("TikTok provider keys are explicit",server.includes('PUBLIC_TIKTOK_TRACKING_PROVIDERS = new Set(["tiktool","tiktok","tikfinity"])'));
check("TikTok inactive provider states are explicit",server.includes('PUBLIC_TIKTOK_INACTIVE_STATES = new Set(["idle","offline","disconnected","stopped"])'));
check("TikTok public snapshot reads only safe profile metadata",server.includes("SELECT connected,display_name,updated_at")&&!server.match(/SELECT connected,display_name,updated_at[\s\S]{0,120}(access_token|refresh_token)/));
check("TikTok history is derived from stored live sessions",server.includes("FROM creator_live_sessions")&&server.includes("metadata->>'provider'")&&server.includes("'tiktool','tiktok','tikfinity'"));
check("TikTok tracker persists provider transitions",server.includes("savePublicTikTokTrackingState")&&server.includes("creator_provider_live_state")&&server.includes("provider='tiktok'"));
check("TikTok tracker records detected start",server.includes("providerLive && trackingState?.connected !== true")&&server.includes("startedAt:detectedStart"));
check("TikTok tracker records detected end",server.includes("providerOffline && trackingState?.connected === true")&&server.includes("connected:false,lastEventAt:new Date().toISOString()"));
check("TikTok LIVE requires active provider or matching evidence",server.includes("const evidenceTikTokLive")&&server.includes("const live = providerLive || evidenceTikTokLive"));
check("inactive TikTok provider blocks stale generic live",server.includes("&& !(providerIsTikTok && providerOffline)"));
check("TikTok snapshot exposes tracking readiness",server.includes("tracking_ready:trackingReady")&&server.includes("tracking_provider:providerIsTikTok ? providerKey"));
check("TikTok snapshot exposes last live timestamps",server.includes("last_live_started_at:latestEnded?.started_at")&&server.includes("last_live_ended_at:latestEnded?.at"));
check("TikTok public status is non-authoritative",server.includes("authoritative:false")&&server.includes("launcher_tiktok_provider"));
check("overall public state evaluates Twitch and TikTok independently",server.includes("const channelStates = []")&&server.includes("publicTikTok?.tracking_ready")&&server.includes("channelStates.every(value => value === \"offline\")"));
check("simultaneous Twitch and TikTok becomes multistream",server.includes('if (twitchLive && tiktokLive) provider = "multistream"'));
check("latest live history chooses newest provider",server.includes("latestPublicLiveHistory")&&server.includes('{provider:"tiktok",at:tiktokLastLiveAt'));
check("public payload contains detailed TikTok channel state",server.includes("tracking_provider:String(publicTikTok?.tracking_provider")&&server.includes("last_live_at:tiktokLastLiveAt"));
check("public signal contains TikTok tracking state",server.includes("tiktok_tracking_ready:publicTikTok?.tracking_ready === true")&&server.includes("tiktok_tracking_provider"));
check("browser payload has no TikTok tokens",!server.match(/channels:\{[\s\S]{0,1800}(access_token|refresh_token|client_secret)/i));

check("creator state builder preserves TikTok status",snapshotSource.includes("status:text(liveSession?.channels?.tiktok?.status"));
check("creator state builder preserves TikTok last live",snapshotSource.includes("last_live_at:isoOrNull(liveSession?.channels?.tiktok?.last_live_at)"));
check("creator state builder preserves TikTok tracking provider",snapshotSource.includes("tracking_provider:text(liveSession?.channels?.tiktok?.tracking_provider"));
check("creator state builder preserves TikTok tracking signal",snapshotSource.includes("tiktok_tracking_ready:liveSession?.signal?.tiktok_tracking_ready === true"));

check("homepage has compact Twitch platform state",home.includes('id="twitchLiveIndicator"')&&home.includes('id="twitchLastLive"'));
check("homepage has compact TikTok platform state",home.includes('id="tiktokLiveIndicator"')&&home.includes('id="tiktokLastLive"'));
check("platform status layout is responsive",css.includes(".gaming-live-platform-status")&&css.includes("grid-template-columns:1fr"));
check("frontend renders platform states independently",js.includes('renderPlatformState("twitch"')&&js.includes('renderPlatformState("tiktok"'));
check("frontend labels TikTok CFS detection honestly",js.includes("Über CFS Launcher / TikTok-LIVE-Signal erkannt"));
check("frontend shows per-platform last live",js.includes('detail.textContent = `Zuletzt live: ${formatLastPlayed(channel.last_live_at)}`'));
check("frontend updates TikTok channel href safely",js.includes("tiktokButton.href = String(tiktokChannel.url)"));
check("frontend handles multistream",js.includes('provider === "multistream"')&&js.includes("Twitch und TikTok"));
check("frontend only shows TikTok likes/shares when TikTok is live",js.includes("const showTikTokMetrics = isLive && (isTikTok || isMulti)"));
check("TikTok and Twitch buttons remain present",home.includes("TWITCH-KANAL ÖFFNEN")&&home.includes("TIKTOK-KANAL ÖFFNEN"));

check("v161 check registered",pkg.scripts?.["public-tiktok161:check"]==="node tools/public-tiktok-live-brand-v161-test.mjs .");
check("v161 release chains v160",pkg.scripts?.["release:v161"]==="npm run release:v160 && npm run public-tiktok161:check");

const require=createRequire(import.meta.url);
const snapshot=require(path.join(root,"lib/creator-state-snapshot.js"));
const built=snapshot.buildPublicCreatorState({
  community:{ok:true,tiktok:{url:"https://www.tiktok.com/@cfs_zockt"}},
  liveSession:{
    ok:true,live:false,status:"offline",provider:"tiktok",live_source:"launcher_tiktok_end",last_live_at:"2026-09-30T17:45:00.000Z",last_live_provider:"tiktok",
    channels:{
      twitch:{connected:true,available:true,status:"offline",authoritative:true,url:"https://www.twitch.tv/cfs_zockt"},
      tiktok:{connected:true,available:true,status:"offline",authoritative:false,tracking_ready:true,tracking_provider:"tiktool",provider_status:"idle",profile_name:"cfs_zockt",url:"https://www.tiktok.com/@cfs_zockt",last_live_at:"2026-09-30T17:45:00.000Z",last_live_started_at:"2026-09-30T17:00:00.000Z"}
    },
    signal:{tiktok_tracking_ready:true,tiktok_tracking_provider:"tiktool"}
  }
});
check("builder runtime keeps TikTok status",built.creator.channels.tiktok.status==="offline"&&built.creator.channels.tiktok.tracking_ready===true);
check("builder runtime keeps TikTok last live ISO",built.creator.channels.tiktok.last_live_at==="2026-09-30T17:45:00.000Z");
check("builder runtime keeps TikTok tracking provider",built.creator.channels.tiktok.tracking_provider==="tiktool"&&built.live.signal.tiktok_tracking_provider==="tiktool");
check("builder runtime keeps general latest live provider",built.live.last_live_provider==="tiktok"&&built.live.last_live_at==="2026-09-30T17:45:00.000Z");

const pass=checks.filter(x=>x.ok).length;
console.log(`\nPublic TikTok LIVE + transparent brand v161: ${pass}/${checks.length} ${pass===checks.length?"PASS":"FAIL"}`);
if(pass!==checks.length)process.exit(1);

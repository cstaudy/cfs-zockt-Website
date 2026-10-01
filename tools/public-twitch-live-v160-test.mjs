import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root=path.resolve(process.argv[2]||".");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const json=rel=>JSON.parse(read(rel));
const checks=[];
const check=(name,ok)=>{checks.push({name,ok:Boolean(ok)});console.log(`${ok?"PASS":"FAIL"} ${name}`)};
const versionAtLeast=(actual,minimum)=>{const a=String(actual||"").split(".").map(Number),m=String(minimum||"").split(".").map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}return true;};
const pkg=json("package.json"),lock=json("package-lock.json"),launcher=json("launcher/package.json");
const server=read("server.js"),home=read("public/index.html"),js=read("public/assets/js/cfs-gaming-home-v112.js"),css=read("public/assets/css/cfs-gaming-home-v112.css"),env=read(".env.example"),system=read("public/assets/js/page-system-check.js");

check("backend version is at least 3.20.6",(()=>{
  const [maj,min,patch]=String(pkg.version||"").split(".").map(Number);
  return maj===3&&min===20&&patch>=6&&lock.version===pkg.version&&lock.packages?.[""]?.version===pkg.version&&server.includes(`"${pkg.version}"`);
})());
check("schema remains 73",system.includes("schema:73"));
check("launcher remains >= 0.47.29",versionAtLeast(launcher.version,"0.47.29")&&system.includes(`launcher:"${launcher.version}"`));
check("public Twitch URL configurable",env.includes("CFS_PUBLIC_TWITCH_PROFILE_URL=https://www.twitch.tv/cfs_zockt"));
check("public Twitch cache configurable",env.includes("CFS_PUBLIC_TWITCH_LIVE_CACHE_TTL_MS=12000"));
check("Twitch public URL validates https and twitch host",server.includes('url.protocol !== "https:"')&&server.includes('["twitch.tv","www.twitch.tv"].includes'));
check("dynamic Twitch channel URL is login based",server.includes("function publicTwitchChannelUrl")&&server.includes("https://www.twitch.tv/${normalized}"));
check("public Twitch lookup reads only safe connection metadata",server.includes("SELECT connected,twitch_user_id,login,display_name,updated_at")&&!server.match(/SELECT connected,twitch_user_id,login,display_name,updated_at[\s\S]{0,120}access_token/));
check("public Twitch status uses app access token",server.includes("const appToken = await twitchAppAccessToken()"));
check("public Twitch status checks Helix streams",server.includes("`${TWITCH_STREAMS_URL}?user_id=${encodeURIComponent(connection.twitch_user_id)}`"));
check("offline history can bootstrap from Twitch archives",server.includes('const TWITCH_VIDEOS_URL = "https://api.twitch.tv/helix/videos"')&&server.includes("latestTwitchArchive")&&server.includes('type:"archive"'));
check("Twitch archive duration is converted to an end timestamp",server.includes("twitchVideoDurationSeconds")&&server.includes("startedAt.getTime()+durationSeconds*1000"));
check("Twitch archive history is persisted without tokens",server.includes("seedTwitchLastLiveHistory")&&server.includes("started_at=COALESCE(creator_provider_live_state.started_at,EXCLUDED.started_at)"));
check("public Twitch cache prevents per-visitor API hammering",server.includes("PUBLIC_TWITCH_LIVE_CACHE_TTL_MS")&&server.includes("publicTwitchLiveCache")&&server.includes("cached?.in_flight"));
check("Twitch API live result is authoritative",server.includes('status:stream ? "live" : "offline"')&&server.includes("authoritative:true"));
check("short stale live fallback is bounded",server.includes("PUBLIC_TWITCH_STALE_LIVE_MAX_MS = 2 * 60 * 1000")&&server.includes("recentCachedLive"));
check("LIVE to OFFLINE transition stores end timestamp",server.includes("previous?.connected === true")&&server.includes("connected:false,lastEventAt:checkedAt"));
check("runtime Twitch reconcile also stores transition end",server.includes("else if(previous?.connected===true)")&&server.includes("connected:false,lastEventAt:new Date().toISOString()"));
check("EventSub offline still stores timestamp",server.includes('if(type==="stream.offline")')&&server.includes("connected:false,lastEventAt:new Date().toISOString()"));
check("public live session polls Twitch alongside generic evidence",server.includes("getPublicTwitchLiveSnapshot(creatorId)"));
check("Twitch LIVE participates with highest direct-source priority",server.includes("const twitchLiveEntry = states.find")&&server.includes("const selected = twitchLiveEntry || tiktokLiveEntry || genericLiveEntry"));
check("Twitch authoritative offline participates in channel-aware status",server.includes('publicTwitch?.authoritative === true ? String(publicTwitch.status || "unknown") : "unknown"')&&server.includes('channelStates.every(value => value === "offline")'));
check("public payload exposes live provider",server.includes("provider,\n        live_source:source"));
check("public payload exposes Twitch viewers",server.includes("twitchLiveEntry?.twitch?.viewer_count")&&server.includes("const combinedViewers"));
check("public payload exposes Twitch game and title",server.includes("twitchLiveEntry?.twitch?.game_name")&&server.includes("twitchLiveEntry?.twitch?.title"));
check("public payload exposes last live timestamp",server.includes("last_live_at:twitchLastLiveAt")&&server.includes("last_live_started_at"));
check("public payload exposes safe channel links",server.includes("channels:{")&&server.includes("url:twitchProfileUrl")&&server.includes("url:PUBLIC_TIKTOK_PROFILE_URL"));
check("browser payload does not expose Twitch token",!server.match(/channels:\{[\s\S]{0,900}(access_token|refresh_token|client_secret)/i));
check("creator state builder preserves provider",read("lib/creator-state-snapshot.js").includes("provider:text(liveSession?.provider"));
check("creator state builder preserves last live",read("lib/creator-state-snapshot.js").includes("last_live_at:isoOrNull(liveSession?.last_live_at)"));
check("creator state builder preserves Twitch channel",read("lib/creator-state-snapshot.js").includes("channels:{")&&read("lib/creator-state-snapshot.js").includes("twitch:{"));
check("homepage has Twitch channel button",home.includes('id="twitchChannelButton"')&&home.includes("TWITCH-KANAL ÖFFNEN"));
check("homepage keeps TikTok channel button",home.includes('id="tiktokChannelButton"')&&home.includes("TIKTOK-KANAL"));
check("homepage live tags include Twitch",home.includes("<span>Twitch LIVE</span>"));
check("homepage channel buttons are grouped",home.includes('class="gaming-live-channel-actions"'));
check("homepage channel buttons stack on mobile",css.includes(".gaming-live-channel-actions{grid-template-columns:1fr}"));
check("frontend understands Twitch provider",js.includes('const isTwitch = provider === "twitch"'));
check("frontend updates Twitch href from safe public payload",js.includes("twitchButton.href = String(twitchChannel.url)"));
check("frontend displays last live timestamp",js.includes("Zuletzt live:")&&js.includes("session.last_live_at"));
check("frontend labels direct Twitch detection",js.includes("Twitch LIVE · direkt erkannt"));
check("frontend does not show TikTok likes/shares for Twitch",js.includes("const showTikTokMetrics = isLive && (isTikTok || isMulti)")&&js.includes("showTikTokMetrics ? compactNumber(session.likes)"));
check("frontend refresh remains near realtime",js.includes("window.setInterval(loadCreatorState, 15000)"));
check("creator state adapter carries Twitch data",js.includes("channels:state?.creator?.channels || {}")&&js.includes("last_live_at:state?.live?.last_live_at || null"));
check("v160 check registered",pkg.scripts?.["public-twitch160:check"]==="node tools/public-twitch-live-v160-test.mjs .");
check("v160 release chains v159",pkg.scripts?.["release:v160"]==="npm run release:v159 && npm run public-twitch160:check");

const require=createRequire(import.meta.url);
const snapshot=require(path.join(root,"lib/creator-state-snapshot.js"));
const built=snapshot.buildPublicCreatorState({
  community:{ok:true,tiktok:{url:"https://www.tiktok.com/@cfs_zockt"}},
  liveSession:{ok:true,live:false,status:"offline",provider:"twitch",live_source:"twitch_api",last_live_at:"2026-09-30T16:30:00.000Z",channels:{twitch:{connected:true,available:true,status:"offline",authoritative:true,profile_name:"cfs_zockt",url:"https://www.twitch.tv/cfs_zockt",last_live_at:"2026-09-30T16:30:00.000Z"}}}
});
check("builder runtime test keeps Twitch provider",built.live.provider==="twitch"&&built.live.source==="twitch_api");
check("builder runtime test keeps last live ISO",built.live.last_live_at==="2026-09-30T16:30:00.000Z");
check("builder runtime test keeps public Twitch URL",built.creator.channels.twitch.url==="https://www.twitch.tv/cfs_zockt");
check("builder runtime test keeps authoritative offline",built.creator.channels.twitch.authoritative===true&&built.creator.channels.twitch.status==="offline");

const pass=checks.filter(x=>x.ok).length;
console.log(`\nPublic Twitch LIVE v160: ${pass}/${checks.length} ${pass===checks.length?"PASS":"FAIL"}`);
if(pass!==checks.length)process.exit(1);

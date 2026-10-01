import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const html=read('public/pages/widget-studio.html');
const js=read('public/assets/js/widget-studio.js');
const css=read('public/assets/css/widget-studio.css');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));
const checks=[];const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)process.exitCode=1};
const versionAtLeast=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)>(y[i]||0))return true;if((x[i]||0)<(y[i]||0))return false}return true};

check('Backend mindestens 3.20.13',versionAtLeast(pkg.version,'3.20.13'));
check('Converter section exists',html.includes('id="wsWidgetConverter"'));
check('Converter TikTok choice exists',html.includes('data-converter-platform="tiktok"'));
check('Converter Twitch choice exists',html.includes('data-converter-platform="twitch"'));
check('Converter type select exists',html.includes('id="wsConverterType"'));
check('Converter image upload exists',html.includes('id="wsConverterUpload"'));
check('Converter image upload is image-only',html.includes('accept="image/png,image/jpeg,image/webp"'));
check('Converter preview exists',html.includes('id="wsConverterAssetPreview"'));
check('Converter create button exists',html.includes('id="wsConverterCreate"'));
check('Converter copy says platform first',html.includes('Wähle zuerst TikTok oder Twitch'));
check('TikTok main category exists',html.includes('data-platform-filter="tiktok"'));
check('Twitch main category exists',html.includes('data-platform-filter="twitch"'));
check('Neutral category exists',html.includes('data-platform-filter="obs"')&&html.includes('<strong>Allgemein</strong>'));
check('Strict category copy exists',html.includes('TikTok → nur TikTok Widgets.')&&html.includes('Twitch → nur Twitch Widgets.'));

check('Platform metadata includes TikTok',js.includes('tiktok:{key:"tiktok"'));
check('Platform metadata includes Twitch',js.includes('twitch:{key:"twitch"'));
check('Platform metadata includes YouTube',js.includes('youtube:{key:"youtube"'));
check('Platform metadata includes neutral',js.includes('obs:{key:"obs"'));
check('Provider resolver exists',js.includes('function providerForDef(d)'));
check('Area resolver is provider-pure',js.includes('function areasForDef(d){return [providerForDef(d)]}'));
check('Area predicate is exact',js.includes('providerForDef(d)===String(area||"")'));
check('Connected-area helper exists',js.includes('function platformAvailable(area)'));
check('Unavailable platform cards are hidden',js.includes('b.hidden=!platformAvailable(area)'));
check('Deep link platform selection exists',js.includes('new URLSearchParams(location.search).get("platform")'));

check('TikTok quickstart has follower goal',js.includes('if(area==="tiktok"){if(kind==="goal")return["follower_goal"'));
check('Twitch quickstart has live timer',js.includes('if(area==="twitch"){if(kind==="timer")return["twitch_live_timer"]'));
check('Twitch quickstart has chat',js.includes('if(kind==="chat")return["twitch_chat_overlay"]'));
check('Twitch quickstart does not claim follower total goal',!js.includes('twitch_follower_goal'));
check('Neutral quickstart stays manual',js.includes('if(area==="obs"){if(kind==="goal")return["manual_goal"]'));

check('Converter definitions are platform-pure',js.includes('providerForDef(d)===platform'));
check('Converter excludes manual/static provider-free definitions',js.includes('!["static","manual"].includes(String(d.source_kind||""))'));
check('TikTok converter prefers follower goal',js.includes('tiktok:["follower_goal","live_like_goal","follow_alert"]'));
check('Twitch converter prefers follow alert',js.includes('twitch:["twitch_follow_alert","twitch_latest_follower","twitch_live_timer"]'));
check('Converter upload validates image',js.includes('Der Widget-Umwandler benötigt ein Bild oder Logo.'));
check('Converter stores asset id',js.includes('state.converterAssetId=asset.id'));
check('Converter integrates image as branding element',js.includes('name:`Branding · ${asset.name||"Logo"}`'));
check('Converter uses normal widget create API',js.includes('api("/api/creator/widget-studio/widgets"'));
check('Converter sends requested platform',js.includes('requested_platform:platform'));
check('Converter opens normal editor',js.includes('await openEditor(data.widget.id,{newWidget:true})'));
check('Converter saves resulting draft',js.includes('await saveDraft()'));
check('Converter Twitch note rejects fake total follower goal',js.includes('Ein Gesamt-Follower-Ziel wird nicht angeboten'));

check('Server reads requested platform',server.includes('const requestedPlatform=String(req.body?.requested_platform||"").toLowerCase()'));
check('Server rejects platform mismatch',server.includes('code:"widget_platform_mismatch"'));
check('Server mismatch response reports actual provider',server.includes('provider:widgetProvider,requested_platform:requestedPlatform'));
check('Server taxonomy requires one exact area',server.includes('areas.length!==1||areas[0]!==provider'));

for(const key of ['follower_goal','follower_counter','live_like_goal','gift_goal','follow_alert','gift_alert','latest_follower']){
 check(`TikTok ${key} is TikTok-only`,new RegExp(`${key}: \\{[\\s\\S]{0,520}?provider: "tiktok"[\\s\\S]{0,180}?studio_areas: \\["tiktok"\\]`).test(server));
}
for(const key of ['twitch_live_timer','twitch_chat_overlay','twitch_follow_alert','twitch_latest_follower','twitch_sub_alert','twitch_cheer_alert']){
 check(`Twitch ${key} is Twitch-only`,new RegExp(`${key}: \\{[\\s\\S]{0,520}?provider: "twitch"[\\s\\S]{0,180}?studio_areas: \\["twitch"\\]`).test(server));
}
for(const key of ['manual_goal','manual_counter','stream_timer','camera_frame','obs_overlay']){
 check(`Neutral ${key} stays provider-free`,new RegExp(`${key}: \\{[\\s\\S]{0,520}?provider: "obs"[\\s\\S]{0,180}?studio_areas: \\["obs"\\]`).test(server));
}
check('No TikTok definition advertises OBS category',!server.includes('provider: "tiktok", platform: "tiktok", studio_areas: ["tiktok", "obs"]'));
check('No Twitch definition advertises OBS category',!server.includes('provider: "twitch", platform: "twitch", studio_areas: ["twitch", "obs"]'));
check('No YouTube definition advertises OBS category',!server.includes('provider: "youtube", platform: "youtube", studio_areas: ["youtube", "obs"]'));

check('Converter CSS exists',css.includes('.ws-widget-converter'));
check('Converter flow CSS exists',css.includes('.ws-converter-flow'));
check('Converter mobile CSS exists',css.includes('@media(max-width:900px)'));

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'}  ${name}`);
console.log(`\nWidget Converter v169: ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length)process.exit(1);

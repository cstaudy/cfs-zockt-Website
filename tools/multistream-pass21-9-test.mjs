import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const results=[];
const add=(name,ok)=>results.push({name,ok:Boolean(ok)});
const has=(text,token)=>String(text).includes(token);

for(const file of [
  'public/pages/stream-studio.html',
  'public/assets/js/stream-studio.js',
  'public/assets/css/stream-studio.css',
  'server.js',
  'package.json'
]) add(`${file} exists`,exists(file));

const html=read('public/pages/stream-studio.html');
const js=read('public/assets/js/stream-studio.js');
const css=read('public/assets/css/stream-studio.css');
const server=read('server.js');
const plans=read('public/pages/plans.html');
const home=read('public/index.html');
const suite=read('public/pages/creator-suite.html');
const pkg=JSON.parse(read('package.json'));

for(const id of ['multistreamTitle','multistreamLimit','multistreamActiveCount','multistreamUpload','multistreamRecommended','multistreamTargets','addCustomStreamTarget','checkMultistreamConfig','saveMultistream']) {
  add(`Multistream UI exposes ${id}`,has(html,`id="${id}"`));
}
for(const provider of ['YouTube','Twitch','TikTok','Custom RTMP/RTMPS']) add(`provider ${provider} is represented`,has(html,provider)||has(js,provider));
add('credentials are explicitly launcher-local',has(html,'Stream-Keys, Tokens, Passwörter')&&has(html,'ausschließlich im lokalen Launcher'));
add('cloud relay is explicitly disabled for now',has(html,'Cloud Relay bleibt deaktiviert'));
add('failure isolation is documented',has(html,'nicht automatisch alle anderen Ausgänge stoppen'));
add('custom RTMP target can be added',has(js,'function addCustomStreamTarget')&&has(js,'provider:"custom_rtmp"'));
add('custom RTMP target can be removed',has(js,'function removeStreamTarget'));
add('client enforces target plan limit before enabling',has(js,'current>=state.multistreamLimit'));
add('client calculates aggregate upload',has(js,'function multistreamUploadKbps')&&has(js,'bitrate_kbps')&&has(js,'audio_bitrate_kbps'));
add('client calculates upload reserve',has(js,'upload*1.3'));
add('client validates config before launcher use',has(js,'function checkMultistreamConfig'));
add('launcher connection is considered in config check',has(js,'launcher_devices')&&has(js,'Für echtes Streaming muss der Launcher verbunden sein'));
add('client never asks for a stream key input',!/<input[^>]+(?:stream.?key|token|password|rtmp.?url)/i.test(html));
add('client config carries credential mode only',has(js,'credential_mode:"launcher_local"'));
add('client config fixes failure policy to isolate destination',has(js,'failure_policy:"isolate_destination"'));
add('client config keeps cloud relay off',has(js,'cloud_relay:false'));
add('responsive styles exist for multistream',has(css,'.multistream-targets')&&has(css,'@media(max-width:980px)')&&has(css,'.multistream-summary'));

add('server declares local multistream providers',has(server,'STREAM_STUDIO_MULTISTREAM_PROVIDERS'));
for(const provider of ['"youtube"','"twitch"','"tiktok"','"kick"','"facebook"','"custom_rtmp"']) add(`server provider ${provider} allowed`,has(server,provider));
add('server defines plan-based multistream limit',has(server,'function streamStudioMultistreamLimit'));
add('FREE server limit is one destination',has(server,'plan==="pro"?4:(plan==="creator"?2:1)'));
add('CREATOR server limit is two destinations',has(server,'plan==="pro"?4:(plan==="creator"?2:1)'));
add('PRO server limit is four destinations',has(server,'plan==="pro"?4:(plan==="creator"?2:1)'));
add('admin test ceiling is bounded',has(server,'if(access?.admin)return 8'));
add('server sanitizes every target',has(server,'function sanitizeStreamStudioTarget'));
add('server sanitizes target IDs',has(server,'STREAM_STUDIO_TARGET_ID_RX'));
add('server bounds prepared target count',has(server,'clean.multistream.destinations.length<8'));
add('server caps enabled target count',has(server,'if(enabled>limit)target.enabled=false'));
add('server rejects saves above plan limit',has(server,'requestedDestinations>multistreamLimit')&&has(server,'requested_destinations:requestedDestinations'));
add('server returns 403 on plan overflow',has(server,'return res.status(403).json'));
add('server keeps credential storage launcher-local',has(server,'credentials:"launcher_local_only"'));
add('server keeps cloud relay disabled',has(server,'cloud_relay:false'));
add('server bridge exposes failure isolation',has(server,'failure_policy:"isolate_destination"'));
add('server bridge marks multistream launcher-local',has(server,'multistream:"launcher_local"'));
add('bridge protocol bumped for multistream config',has(server,'protocol:2'));

const streamBlock=server.slice(server.indexOf('// CFS STREAM STUDIO - CONTROL PLANE'),server.indexOf('// CREATOR AUTH MIDDLEWARE'));
for(const forbidden of ['source.stream_key','source.streamKey','source.rtmp_url','source.rtmpUrl','source.password','source.token']) add(`server stream config does not persist ${forbidden}`,!has(streamBlock,forbidden));
add('server stream sanitizer is allowlist-based',has(streamBlock,'return {\n        id,label,provider,enabled:source.enabled===true,profile,'));

add('FREE plan page documents one local target',has(plans,'1 lokales Ziel (Engine in Aufbau)'));
add('CREATOR plan page documents two local targets',has(plans,'bis 2 Ziele (Engine in Aufbau)'));
add('PRO plan page documents four local targets',has(plans,'bis 4 Ziele (Engine in Aufbau)'));
add('public homepage announces local multistream without claiming live engine',has(home,'LOCAL MULTISTREAM')&&has(home,'Capture und Zugangsdaten bleiben im Launcher'));
add('Creator Suite announces local multistream without claiming live engine',has(suite,'LOCAL MULTISTREAM')&&has(suite,'Capture und Zugangsdaten bleiben im Launcher'));
add('multistream21 check script registered',pkg.scripts?.['multistream21:check']==='node tools/multistream-pass21-9-test.mjs .');
add('production multistream smoke registered',pkg.scripts?.['production21:multistream-smoke']==='node tools/production-multistream-smoke-pass21-9.mjs https://cfs-zockt.de');

const failed=results.filter(r=>!r.ok);
for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}`);
console.log(`\nLocal Multistream Pass 21.9: ${results.length-failed.length}/${results.length} PASS`);
if(failed.length) process.exitCode=1;

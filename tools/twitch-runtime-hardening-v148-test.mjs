import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));
const schema=read('lib/database-schema-contract.js');
let pass=0,total=0;
function ok(name,value){total++;console.log(`${value?'PASS':'FAIL'} ${name}`);if(value)pass++;}
ok('backend >= 3.17.0',versionAtLeast(pkg.version,'3.17.0'));
ok('schema >= 71',/DATABASE_SCHEMA_VERSION\s*=\s*(?:7[1-9]|[89]\d|\d{3,})/.test(schema));
ok('remote EventSub user reconciliation',server.includes('listTwitchEventSubSubscriptionsForUser')&&server.includes('user_id:${')===false&&server.includes('new URLSearchParams({user_id:String(broadcasterUserId||"")})'));
ok('remote subscription matcher checks callback',server.includes('twitchEventSubRemoteMatches')&&server.includes('String(transport.callback)!==TWITCH_EVENTSUB_CALLBACK_URL'));
ok('only enabled subscriptions count ready',server.includes('String(row.status)==="enabled"')&&!server.includes('const enabled=new Set(rows.filter(row=>["enabled","webhook_callback_verification_pending"]'));
ok('disabled remote subscriptions are not adopted as healthy',server.includes('twitchEventSubRemoteMatches(definition,item,row.twitch_user_id)&&["enabled","webhook_callback_verification_pending"].includes(String(item.status))'));
ok('stale callback cleanup',server.includes('Twitch EventSub Alt-Callback Cleanup Warnung'));
ok('duplicate cleanup',server.includes('Twitch EventSub Duplicate Cleanup Warnung'));
ok('409 conflict becomes reconcile required',server.includes('conflictId')&&server.includes('"reconcile_required"'));
ok('live state is seeded from Get Streams',server.includes('TWITCH_STREAMS_URL')&&server.includes('syncTwitchLiveState')&&server.includes('user_id=${encodeURIComponent(row.twitch_user_id)}'));
ok('revocation handler exists',server.includes('handleTwitchEventSubRevocation'));
ok('authorization revoke disables and clears tokens',server.includes('connected=FALSE,access_token=NULL,refresh_token=NULL'));
ok('webhook replay window remains 10 minutes',server.includes('Math.abs(Date.now()-sentAt)>10*60*1000'));
ok('webhook signature remains timing-safe',server.includes('crypto.timingSafeEqual'));
ok('runtime self-heal worker',server.includes('startTwitchRuntimeWorker')&&server.includes('runTwitchRuntimeReconcile')&&server.includes('TWITCH_RUNTIME_RECONCILE_INTERVAL_MS = 15 * 60 * 1000'));
ok('runtime worker starts and stops with server',server.includes('startTwitchRuntimeWorker();')&&server.includes('await stopTwitchRuntimeWorker();'));
ok('runtime errors are creator scoped',server.includes("UPDATE twitch_connections SET runtime_error=$2,last_runtime_checked_at=$3")&&server.includes('WHERE creator_id=$1'));
ok('launcher library exposes scope readiness',server.includes('scope_ready:Boolean(twitch?.connected)&&twitchMissing.length===0')&&server.includes('missing_scopes:twitchMissing'));
ok('Twitch remains acceptance-open, not production overclaim',server.includes('Twitch: OAUTH + EVENTSUB + CHAT / ACCEPTANCE OFFEN'));
ok('v148 release scripts registered',pkg.scripts['creator-suite148:check']&&pkg.scripts['release:v148']);
console.log(`\nTwitch Runtime Hardening v148: ${pass}/${total} ${pass===total?'PASS':'FAIL'}`);
if(pass!==total)process.exit(1);

function versionAtLeast(actual,minimum){const a=String(actual||'').split('.').map(Number),m=String(minimum||'').split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(m[i]||0))return true;if((a[i]||0)<(m[i]||0))return false;}return true;}

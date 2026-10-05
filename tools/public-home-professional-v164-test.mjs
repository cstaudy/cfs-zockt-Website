import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const home=read('public/index.html');
const css=read('public/assets/css/cfs-gaming-home-v112.css');
const server=read('server.js');
const pkg=JSON.parse(read('package.json'));
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
const between=(text,start,end)=>{const a=text.indexOf(start); if(a<0)return ''; const b=text.indexOf(end,a+start.length); return b<0?'':text.slice(a,b+end.length);};
const pos=id=>home.indexOf(`id="${id}"`);
const strip=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z0-9#]+;/gi,' ').replace(/\s+/g,' ').trim();
const visibleWords=strip(home).split(' ').filter(Boolean).length;
const headerNav=between(home,'<nav class="nav gaming-nav"','</nav>');
const footer=between(home,'<footer class="gaming-footer">','</footer>');
const community=between(home,'<div class="gaming-community-grid">','</div>');

const semverParts=v=>String(v||'').split('.').map(Number);
const semverGte=(v,min)=>{const a=semverParts(v),b=semverParts(min);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true};
check('backend package >= 3.20.10',semverGte(pkg.version,'3.20.10'),pkg.version);
check('backend runtime matches package',server.includes(`const BACKEND_VERSION =\n    "${pkg.version}";`));
check('release:v164 chained',pkg.scripts?.['release:v164']==='npm run release:v163 && npm run homepage164:check');
check('v164 marker styles present',css.includes('v164 · Public homepage professional flow'));

check('header keeps five public destinations', ['#warum','#streams','#games','#community','/pages/login.html'].every(h=>headerNav.includes(`href="${h}"`))&&!headerNav.includes('/pages/creator-suite.html')&&!headerNav.includes('/pages/launcher-download.html'));
check('header removes redundant Home and Kontakt labels',!headerNav.includes('>Home<')&&!headerNav.includes('>Kontakt<'));
check('mobile auth is inside menu',headerNav.includes('gaming-nav-mobile-auth')&&headerNav.includes('data-login-link')&&headerNav.includes('data-auth-cta'));
check('desktop auth remains outside menu',home.includes('<div class="gaming-auth-actions" aria-label="Creator Suite Zugang">'));
check('legacy mobile plus shortcut removed',!css.includes('gaming-register-cta:before{content:"+"'));
check('mobile header hides separate auth cluster',/@media\(max-width:900px\)[\s\S]*?\.gaming-auth-actions\{display:none\}/.test(css));
check('mobile menu auth has two clear actions',css.includes('.gaming-nav-mobile-auth{\n    display:grid;grid-template-columns:1fr 1fr'));

check('LIVE follows hero directly',pos('streams')>pos('start') && !home.includes('id="angebot"'));
check('generic schedule card rail removed',!home.includes('gaming-schedule-list')&&!home.includes('gaming-schedule-card'));
check('core visitor flow order is live games community creator',pos('streams')<pos('games')&&pos('games')<pos('community')&&pos('community')<pos('creator-suite-access'));
check('LIVE card remains complete', ['liveStatusBadge','twitchLiveIndicator','tiktokLiveIndicator','twitchChannelButton','tiktokChannelButton'].every(id=>home.includes(`id="${id}"`)));
check('games remain visible',home.includes('id="recentGamesGrid"')&&home.includes('data-game-slot="0"'));
check('community exposes four actionable destinations',(community.match(/<article>/g)||[]).length===4);
check('community retains Twitch TikTok Discord and Creator login', ['TWITCH','TIKTOK','DISCORD','CREATOR BEREICH'].every(x=>community.includes(x))&&community.includes('/pages/login.html'));
check('main live community stats retained',home.includes('id="communityStatsTitle"')&&home.includes('id="statTikTok"')&&home.includes('id="statDiscord"'));
check('duplicate footer metric strip removed',!home.includes('gaming-footer-live'));

check('final CTA exposes protected creator entry only',home.includes('MEINE TOOLS FÜR REGISTRIERTE CREATOR.')&&home.includes('CREATOR REGISTRIERUNG')&&home.includes('CREATOR LOGIN')&&!home.includes('WINDOWS LAUNCHER'));
check('final CTA keeps creator login secondary',home.includes('CREATOR LOGIN')&&home.includes('/pages/login.html'));
check('footer reflects public brand navigation',footer.includes('>Warum?<')&&footer.includes('>Streams<')&&footer.includes('>Games<')&&footer.includes('>Community<')&&footer.includes('>Creator Bereich<')&&footer.includes('>Kontakt<')&&!footer.includes('>Launcher<'));
check('footer exposes Twitch TikTok Discord',footer.includes('aria-label="Twitch"')&&footer.includes('aria-label="TikTok"')&&footer.includes('aria-label="Discord"'));
check('footer keeps legal links', ['/pages/impressum.html','/pages/datenschutz.html','/pages/nutzungsbedingungen.html'].every(h=>footer.includes(h)));
check('current CFS mark remains header and footer',(home.match(/cfs-zockt-mark\.png/g)||[]).length>=2);
check('homepage stays concise',visibleWords<=560,`visible-ish words=${visibleWords}`);
check('homepage still has meaningful content',visibleWords>=180,`visible-ish words=${visibleWords}`);
check('responsive community collapse exists',/@media\(max-width:680px\)[\s\S]*?\.gaming-community-grid\{grid-template-columns:1fr\}/.test(css));
check('mobile nav keeps viewport bound',css.includes('max-height:calc(100dvh - 76px)'));
check('sections account for sticky header',css.includes('.gaming-section{scroll-margin-top:84px}'));

const failed=checks.filter(x=>!x.ok);
for(const item of checks) console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}${item.detail?` — ${item.detail}`:''}`);
console.log(`\n${checks.length-failed.length}/${checks.length} public homepage v164 checks passed.`);
if(failed.length) process.exit(1);

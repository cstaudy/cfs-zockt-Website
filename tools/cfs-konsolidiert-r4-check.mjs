import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=['public/index.html',...fs.readdirSync(path.join(root,'public/pages')).filter(f=>f.endsWith('.html')).map(f=>'public/pages/'+f)];
assert.equal(pages.length,45,'45 Website-Hauptseiten werden erwartet');
for(const p of pages){
  const html=get(p);
  assert.equal((html.match(/cfs-neon-redesign-v32071\.css/g)||[]).length,1,p+' hat nicht genau eine Design-Einbindung');
  assert.ok(/<html[\s>]/i.test(html) && /<\/html>/i.test(html),p+' besitzt keine HTML-Struktur');
}
for(const p of [
  'public/assets/img/brand/cfs-zockt-logo.png',
  'public/assets/css/cfs-neon-redesign-v32071.css',
  'public/assets/css/admin-cfs-ai-design-v32070.css',
  'public/assets/js/admin-cfs-ai-design-v32070.js',
  'public/assets/js/admin-shop-checkout-gate-v32072.js',
  'lib/cfs-ai-bridge-health.js',
  'tools/cfs-ai-verified-bridge-v32072-test.mjs'
])assert.ok(fs.statSync(path.join(root,p)).size>0,'Pflichtdatei fehlt: '+p);
const a=get('public/pages/admin-creators.html');
for(const key of ['id="aiBridgeProof"','id="aiBridgeVerify"','id="shopCheckoutGate"']) assert.ok(a.includes(key),'Adminbereich: '+key+' fehlt');
const s=get('server.js');
assert.match(s,/app\.post\("\/api\/creator\/cfs-ai\/bridge\/verify",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminElevation/,'Bridge-Berechtigung');
assert.match(s,/paid_checkout_enabled:false/,'Bezahlshop bleibt ohne Freigabe gesperrt');
const css=get('public/assets/css/cfs-neon-redesign-v32071.css');
assert.ok(css.includes('prefers-reduced-motion') && css.includes(':focus-visible'),'Bedienbarkeit');
console.log('PASS: 45/45 Website-Seiten, Branding, Admin-Bridge, Shop-Sperre, CSS und Abhängigkeiten');

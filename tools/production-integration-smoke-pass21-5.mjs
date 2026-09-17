import process from 'node:process';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const baseArg = args.find(arg => !arg.startsWith('--'));
const baseUrl = String(baseArg || process.env.APP_BASE_URL || 'https://cfs-zockt.de').replace(/\/$/, '');
const timeoutMs = Number(process.env.CFS_SMOKE_TIMEOUT_MS || 15000);
const results = [];
const add = (name, ok, detail='') => results.push({name, ok:Boolean(ok), detail:String(detail || '')});

async function request(pathname, options={}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    redirect: options.redirect || 'manual',
    headers: {
      accept: options.accept || '*/*',
      'user-agent': 'cfs-zockt-pass21-integration-smoke/1.0',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return {status:response.status, headers:response.headers, text, json, url:response.url};
}

const noStore = res => String(res.headers.get('cache-control') || '').toLowerCase().includes('no-store');
const noSecrets = value => {
  const text = JSON.stringify(value || {}).toLowerCase();
  return !['access_token','refresh_token','client_secret','device_secret','launcher_api_key'].some(key => text.includes(key));
};
const safe = async (name, fn) => {
  try { await fn(); } catch (error) { add(name, false, error?.message || String(error)); }
};

await safe('public TikTok status', async () => {
  const res = await request('/api/tiktok/status', {accept:'application/json', redirect:'follow'});
  add('public TikTok status HTTP 200', res.status === 200, `HTTP ${res.status}`);
  add('public TikTok status is not cacheable', noStore(res), res.headers.get('cache-control') || 'missing');
  add('public TikTok status exposes no token/secret fields', noSecrets(res.json), res.text.slice(0, 220));
});

for (const [pathname, label] of [
  ['/api/creator/tiktok/status','creator TikTok status'],
  ['/auth/creator/tiktok','creator TikTok OAuth entry'],
  ['/api/creator/widget-studio/widgets','creator Widget Studio'],
  ['/api/creator/launcher/devices','creator launcher devices']
]) {
  await safe(`${label} anonymous protection`, async () => {
    const res = await request(pathname, {accept: pathname.startsWith('/auth/') ? 'text/html,application/json' : 'application/json'});
    add(`${label} rejects anonymous access`, res.status === 401, `HTTP ${res.status}`);
    add(`${label} response is not cacheable`, noStore(res), res.headers.get('cache-control') || 'missing');
  });
}

await safe('launcher profile key protection', async () => {
  const res = await request('/api/launcher/tiktok/profile', {accept:'application/json'});
  add('launcher TikTok profile rejects missing launcher key', [401,403].includes(res.status), `HTTP ${res.status}`);
  add('launcher TikTok profile does not leak secrets', noSecrets(res.json), res.text.slice(0, 220));
});

for (const [pathname, token] of [
  ['/pages/tiktok.html','TIKTOK VERBINDEN'],
  ['/pages/widget-studio.html','WIDGET STUDIO'],
  ['/pages/launcher.html','LAUNCHER'],
  ['/pages/launcher-connect.html','LAUNCHER']
]) {
  await safe(`${pathname} delivery`, async () => {
    const res = await request(pathname, {accept:'text/html', redirect:'follow'});
    add(`${pathname} HTTP 200`, res.status === 200, `HTTP ${res.status}`);
    add(`${pathname} contains current integration UI`, res.text.toUpperCase().includes(token.toUpperCase()), `expected token=${token}`);
  });
}

const failed = results.filter(r => !r.ok);
if (jsonMode) {
  console.log(JSON.stringify({base_url:baseUrl, passed:results.length-failed.length, total:results.length, ok:failed.length===0, results}, null, 2));
} else {
  console.log('CFS_Zockt Production Integration Smoke · Pass 21.5');
  console.log(`Target: ${baseUrl}\n`);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.detail ? ` · ${r.detail}` : ''}`);
  console.log(`\nProduction Integration Smoke Pass 21.5: ${results.length - failed.length}/${results.length} PASS`);
}
if (failed.length) process.exitCode = 1;

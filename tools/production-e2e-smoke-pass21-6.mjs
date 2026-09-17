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
      'user-agent': 'cfs-zockt-pass21-e2e-smoke/1.0',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return {status:response.status, headers:response.headers, text, json};
}

const noStore = res => String(res.headers.get('cache-control') || '').toLowerCase().includes('no-store');
const safe = async (name, fn) => {
  try { await fn(); } catch (error) { add(name, false, error?.message || String(error)); }
};

await safe('health', async () => {
  const res = await request('/api/health', {accept:'application/json', redirect:'follow'});
  add('health HTTP 200', res.status === 200, `HTTP ${res.status}`);
  add('database connected', res.json?.database === 'connected', res.text.slice(0, 220));
});

for (const [pathname, token] of [
  ['/pages/widget-studio.html','WIDGET STUDIO'],
  ['/pages/scene-studio.html','SCENE STUDIO'],
  ['/pages/launcher.html','LAUNCHER'],
  ['/pages/launcher-connect.html','LAUNCHER']
]) {
  await safe(`${pathname} delivery`, async () => {
    const res = await request(pathname, {accept:'text/html', redirect:'follow'});
    add(`${pathname} HTTP 200`, res.status === 200, `HTTP ${res.status}`);
    add(`${pathname} contains current E2E UI`, res.text.toUpperCase().includes(token), `expected token=${token}`);
  });
}

for (const [pathname, label] of [
  ['/api/creator/widget-studio/widgets','creator widget list'],
  ['/api/creator/widget-studio/scenes','creator scene list'],
  ['/api/creator/widget-studio/bridge','creator bridge status'],
  ['/api/creator/launcher/devices','creator launcher devices']
]) {
  await safe(`${label} anonymous protection`, async () => {
    const res = await request(pathname, {accept:'application/json'});
    add(`${label} rejects anonymous access`, res.status === 401, `HTTP ${res.status}`);
    add(`${label} is not cacheable`, noStore(res), res.headers.get('cache-control') || 'missing');
  });
}

for (const [pathname, label] of [
  ['/api/bridge/widget-studio/library','bridge library'],
  ['/api/bridge/widget-studio/status','bridge status'],
  ['/api/bridge/widget-studio/scenes','bridge scenes'],
  ['/api/bridge/widget-studio/actions','bridge actions']
]) {
  await safe(`${label} bridge-key protection`, async () => {
    const res = await request(pathname, {accept:'application/json'});
    add(`${label} rejects missing bridge key`, [401,403].includes(res.status), `HTTP ${res.status}`);
    add(`${label} is not cacheable`, noStore(res), res.headers.get('cache-control') || 'missing');
  });
}

for (const [pathname, label] of [
  ['/api/widgets/studio/pass21-invalid-widget-token','public widget output'],
  ['/api/widgets/scene/pass21-invalid-scene-token','public scene output']
]) {
  await safe(`${label} invalid token`, async () => {
    const res = await request(pathname, {accept:'application/json'});
    add(`${label} returns 404 for unknown token`, res.status === 404, `HTTP ${res.status}`);
    add(`${label} is not cacheable`, noStore(res), res.headers.get('cache-control') || 'missing');
  });
}

const failed = results.filter(r => !r.ok);
if (jsonMode) {
  console.log(JSON.stringify({base_url:baseUrl, passed:results.length-failed.length, total:results.length, ok:failed.length===0, results}, null, 2));
} else {
  console.log('CFS_Zockt Production End-to-End Smoke · Pass 21.6');
  console.log(`Target: ${baseUrl}\n`);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.detail ? ` · ${r.detail}` : ''}`);
  console.log(`\nProduction End-to-End Smoke Pass 21.6: ${results.length - failed.length}/${results.length} PASS`);
}
if (failed.length) process.exitCode = 1;

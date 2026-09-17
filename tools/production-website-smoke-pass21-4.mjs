import process from 'node:process';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const baseArg = args.find(arg => !arg.startsWith('--'));
const baseUrl = String(baseArg || process.env.APP_BASE_URL || 'https://cfs-zockt.de').replace(/\/$/, '');
const timeoutMs = Number(process.env.CFS_SMOKE_TIMEOUT_MS || 15000);

const results = [];
const add = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail: String(detail || '') });

async function request(pathname, options = {}) {
  const url = `${baseUrl}${pathname}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    redirect: options.redirect || 'follow',
    headers: {
      'accept': options.accept || '*/*',
      'user-agent': 'cfs-zockt-pass21-production-smoke/1.0',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  return { url: response.url, status: response.status, headers: response.headers, text };
}

function hasToken(text, token) {
  return String(text || '').toLocaleLowerCase('de-DE').includes(String(token || '').toLocaleLowerCase('de-DE'));
}

function headerIncludes(response, header, token) {
  return String(response.headers.get(header) || '').toLowerCase().includes(String(token || '').toLowerCase());
}

async function safe(name, fn) {
  try {
    await fn();
  } catch (error) {
    add(name, false, error?.message || String(error));
  }
}

await safe('health endpoint responds', async () => {
  const res = await request('/api/health', { accept: 'application/json' });
  let body = null;
  try { body = JSON.parse(res.text); } catch {}
  add('health HTTP 200', res.status === 200, `HTTP ${res.status}`);
  add('health reports service online', body?.ok === true && body?.status === 'online', res.text.slice(0, 220));
  add('health reports PostgreSQL connected', body?.database === 'connected', res.text.slice(0, 220));
  add('health reports backend version 3.12.0', body?.version === '3.12.0', `version=${body?.version ?? 'missing'}`);
});

await safe('public status endpoint responds', async () => {
  const res = await request('/api/public/status', { accept: 'application/json' });
  let body = null;
  try { body = JSON.parse(res.text); } catch {}
  add('public status HTTP 200', res.status === 200, `HTTP ${res.status}`);
  add('public status reports online', body?.ok === true && body?.status === 'online', res.text.slice(0, 220));
});

const pages = [
  ['/', 'DEINE CREATOR-ZENTRALE'],
  ['/pages/login.html', 'VON DER WEBSITE'],
  ['/pages/creator-suite.html', 'Creator Suite'],
  ['/pages/plans.html', 'FREE'],
  ['/pages/roadmap.html', 'ROADMAP'],
  ['/pages/support.html', 'Support'],
  ['/pages/security.html', 'Sicherheit']
];

let rootResponse = null;
for (const [pathname, token] of pages) {
  await safe(`${pathname} responds`, async () => {
    const res = await request(pathname, { accept: 'text/html' });
    if (pathname === '/') rootResponse = res;
    add(`${pathname} HTTP 200`, res.status === 200, `HTTP ${res.status}`);
    add(`${pathname} contains current Pass-21 content`, hasToken(res.text, token), `expected token: ${token}`);
  });
}

if (rootResponse) {
  add('homepage disables shared caching', headerIncludes(rootResponse, 'cache-control', 'no-store') || headerIncludes(rootResponse, 'cache-control', 'no-cache'), rootResponse.headers.get('cache-control') || 'missing');
  add('homepage sends CSP', Boolean(rootResponse.headers.get('content-security-policy')), rootResponse.headers.get('content-security-policy') || 'missing');
  add('homepage sends HSTS', Boolean(rootResponse.headers.get('strict-transport-security')), rootResponse.headers.get('strict-transport-security') || 'missing');
  add('homepage sends nosniff', headerIncludes(rootResponse, 'x-content-type-options', 'nosniff'), rootResponse.headers.get('x-content-type-options') || 'missing');
  add('homepage sends referrer policy', Boolean(rootResponse.headers.get('referrer-policy')), rootResponse.headers.get('referrer-policy') || 'missing');
  add('homepage sends permissions policy', Boolean(rootResponse.headers.get('permissions-policy')), rootResponse.headers.get('permissions-policy') || 'missing');
  add('homepage sends COOP', headerIncludes(rootResponse, 'cross-origin-opener-policy', 'same-origin'), rootResponse.headers.get('cross-origin-opener-policy') || 'missing');
}

await safe('security.txt responds', async () => {
  const res = await request('/.well-known/security.txt', { accept: 'text/plain' });
  add('security.txt HTTP 200', res.status === 200, `HTTP ${res.status}`);
  add('security.txt exposes private reporting contact', hasToken(res.text, 'Contact: https://cfs-zockt.de/pages/support.html#support-report'), res.text.slice(0, 240));
  add('security.txt exposes security policy', hasToken(res.text, 'Policy: https://cfs-zockt.de/pages/security.html'), res.text.slice(0, 240));
});

await safe('sitemap responds', async () => {
  const res = await request('/sitemap.xml', { accept: 'application/xml,text/xml' });
  add('sitemap HTTP 200', res.status === 200, `HTTP ${res.status}`);
  for (const pathname of ['/pages/creator-suite.html','/pages/plans.html','/pages/roadmap.html','/pages/support.html','/pages/security.html']) {
    add(`sitemap contains ${pathname}`, hasToken(res.text, `${baseUrl}${pathname}`) || hasToken(res.text, `https://cfs-zockt.de${pathname}`));
  }
});

const protectedEndpoints = [
  ['/api/account/me', body => body?.authenticated === false && body?.account === null],
  ['/api/account/sessions', body => body?.authenticated === false],
  ['/api/creator/access', body => body?.authenticated === false]
];
for (const [pathname, validate] of protectedEndpoints) {
  await safe(`${pathname} anonymous protection`, async () => {
    const res = await request(pathname, { accept: 'application/json' });
    let body = null;
    try { body = JSON.parse(res.text); } catch {}
    add(`${pathname} rejects anonymous request`, res.status === 401 && validate(body), `HTTP ${res.status} · ${res.text.slice(0, 180)}`);
    add(`${pathname} is not cacheable`, headerIncludes(res, 'cache-control', 'no-store'), res.headers.get('cache-control') || 'missing');
  });
}

await safe('custom 404 responds', async () => {
  const res = await request(`/pass21-not-found-${Date.now()}.html`, { accept: 'text/html' });
  add('unknown public route returns HTTP 404', res.status === 404, `HTTP ${res.status}`);
  add('unknown public route uses custom error page', hasToken(res.text, '404') || hasToken(res.text, 'nicht gefunden'), res.text.slice(0, 180));
});

const failed = results.filter(item => !item.ok);
if (jsonMode) {
  console.log(JSON.stringify({ base_url: baseUrl, passed: results.length - failed.length, total: results.length, ok: failed.length === 0, results }, null, 2));
} else {
  console.log(`CFS_Zockt Production Website Smoke · Pass 21.4`);
  console.log(`Target: ${baseUrl}\n`);
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${!item.ok && item.detail ? ` · ${item.detail}` : ''}`);
  }
  console.log(`\nProduction Website Smoke Pass 21.4: ${results.length - failed.length}/${results.length} PASS`);
}

if (failed.length) process.exitCode = 1;

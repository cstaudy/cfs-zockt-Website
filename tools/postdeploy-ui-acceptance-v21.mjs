import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const localIndex = args.indexOf('--local-root');
const localRoot = localIndex >= 0 ? path.resolve(args[localIndex + 1] || '.') : null;
const baseArg = args.find((arg, i) =>
  !arg.startsWith('--') &&
  !(localIndex >= 0 && i === localIndex + 1)
);
const baseUrl = String(baseArg || process.env.APP_BASE_URL || 'https://cfs-zockt.de').replace(/\/$/, '');
const timeoutMs = Number(process.env.CFS_POSTDEPLOY_TIMEOUT_MS || 12000);

const results = [];
const add = (name, ok, detail = '') => results.push({
  name,
  ok: Boolean(ok),
  detail: String(detail || '')
});

const retired = [
  'cfs-guide-v5.css','cfs-help-v6.css','cfs-empty-v7.css','cfs-nav-v8.css',
  'cfs-dashboard-v9.css','cfs-forms-v10.css','cfs-mobile-v11.css','cfs-accessibility-v12.css',
  'cfs-home-v13.css','cfs-suite-v14.css','cfs-plans-v15.css','cfs-support-v16.css',
  'cfs-security-v17.css','cfs-guide-v5.js','cfs-help-v6.js','cfs-empty-v7.js','cfs-nav-v8.js',
  'cfs-dashboard-v9.js','cfs-forms-v10.js','cfs-mobile-v11.js','cfs-accessibility-v12.js',
  'cfs-home-v13.js','cfs-suite-v14.js','cfs-plans-v15.js','cfs-support-v16.js','cfs-security-v17.js'
];

const pages = [
  '/',
  '/pages/creator-suite.html',
  '/pages/plans.html',
  '/pages/support.html',
  '/pages/login.html',
  '/pages/account.html'
];

const assets = {
  shell: '/assets/js/cfs-shell-v3.js',
  uiJs: '/assets/js/cfs-ui-v18.js',
  uiCss: '/assets/css/cfs-ui-v18.css',
  theme: '/assets/css/cfs-theme-v3.css'
};

function has(text, token) {
  return String(text || '').includes(token);
}

function localFile(urlPath) {
  if (!localRoot) return null;
  const rel = urlPath === '/' ? 'public/index.html' : `public${urlPath}`;
  return path.join(localRoot, rel.replace(/\//g, path.sep));
}

async function read(pathname, accept = '*/*') {
  if (localRoot) {
    const filename = localFile(pathname);
    if (!filename || !fs.existsSync(filename)) {
      return { status: 404, text: '', headers: new Map(), url: pathname };
    }
    return {
      status: 200,
      text: fs.readFileSync(filename, 'utf8'),
      headers: new Map(),
      url: pathname
    };
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: 'follow',
    headers: {
      accept,
      'user-agent': 'cfs-zockt-postdeploy-ui-v21/1.0'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  return {
    status: response.status,
    text: await response.text(),
    headers: response.headers,
    url: response.url
  };
}

async function safe(name, fn) {
  try {
    await fn();
  } catch (error) {
    add(name, false, error?.message || String(error));
  }
}

for (const pathname of pages) {
  await safe(`${pathname} reachable`, async () => {
    const res = await read(pathname, 'text/html');
    add(`${pathname} HTTP/file 200`, res.status === 200, `status=${res.status}`);
    if (pathname === '/') {
      add('homepage loads global shell', has(res.text, '/assets/js/cfs-shell-v3.js'));
    }
  });
}

let shell = '';
let uiJs = '';
let uiCss = '';

await safe('shell asset', async () => {
  const res = await read(assets.shell, 'application/javascript');
  shell = res.text;
  add('global shell reachable', res.status === 200, `status=${res.status}`);
  add('shell loads consolidated CSS', has(shell, '/assets/css/cfs-ui-v18.css'));
  add('shell loads consolidated JS', has(shell, '/assets/js/cfs-ui-v18.js'));
  add('shell does not load retired split assets', !retired.some(name => has(shell, name)));
});

await safe('consolidated JS', async () => {
  const res = await read(assets.uiJs, 'application/javascript');
  uiJs = res.text;
  add('consolidated JS reachable', res.status === 200, `status=${res.status}`);
  add('JS identifies v18 consolidated bundle', has(uiJs, 'Consolidated UI Bundle v18'));

  const expectedMarkers = [
    'cfs-home-v13',
    'cfs-suite-v14',
    'cfs-plans-v15',
    'cfs-support-v16',
    'cfs-security-v17'
  ];
  for (const marker of expectedMarkers) {
    add(`JS bundle contains ${marker}`, has(uiJs, marker));
  }
});

await safe('consolidated CSS', async () => {
  const res = await read(assets.uiCss, 'text/css');
  uiCss = res.text;
  add('consolidated CSS reachable', res.status === 200, `status=${res.status}`);
  add('CSS identifies v18 consolidated bundle', has(uiCss, 'Consolidated UI Bundle v18'));

  const expectedMarkers = [
    '.cfs-home-v13-stage',
    '.cfs-suite-v14-navigator',
    '.cfs-plans-v15-live',
    '.cfs-support-v16-triage',
    '.cfs-security-v17-overview'
  ];
  for (const marker of expectedMarkers) {
    add(`CSS bundle contains ${marker}`, has(uiCss, marker));
  }
});

await safe('theme asset', async () => {
  const res = await read(assets.theme, 'text/css');
  add('global v3 theme reachable', res.status === 200, `status=${res.status}`);
});

if (!localRoot) {
  await safe('health endpoint', async () => {
    const res = await read('/api/health', 'application/json');
    let body = null;
    try { body = JSON.parse(res.text); } catch {}
    add('health HTTP 200', res.status === 200, `HTTP ${res.status}`);
    add('health reports online', body?.ok === true && body?.status === 'online', res.text.slice(0, 220));
  });

  await safe('public status endpoint', async () => {
    const res = await read('/api/public/status', 'application/json');
    let body = null;
    try { body = JSON.parse(res.text); } catch {}
    add('public status HTTP 200', res.status === 200, `HTTP ${res.status}`);
    add('public status reports online', body?.ok === true && body?.status === 'online', res.text.slice(0, 220));
  });
}

const failed = results.filter(item => !item.ok);
const output = {
  mode: localRoot ? 'local' : 'live',
  target: localRoot || baseUrl,
  passed: results.length - failed.length,
  total: results.length,
  ok: failed.length === 0,
  results
};

if (jsonMode) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log('cfs_zockt Post-Deploy UI Acceptance v21');
  console.log(`Mode: ${output.mode}`);
  console.log(`Target: ${output.target}\n`);

  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${!item.ok && item.detail ? ` · ${item.detail}` : ''}`);
  }

  console.log(`\nPost-Deploy UI Acceptance v21: ${output.passed}/${output.total} PASS`);
}

if (failed.length) process.exitCode = 1;

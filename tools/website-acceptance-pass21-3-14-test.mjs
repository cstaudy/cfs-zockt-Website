import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const publicDir = path.join(root, 'public');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function cleanUrl(raw) {
  return String(raw || '').trim().replace(/&amp;/g, '&');
}

function stripQueryHash(value) {
  const hashAt = value.indexOf('#');
  const beforeHash = hashAt >= 0 ? value.slice(0, hashAt) : value;
  const queryAt = beforeHash.indexOf('?');
  return queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
}

function fragmentOf(value) {
  const at = value.indexOf('#');
  return at >= 0 ? decodeURIComponent(value.slice(at + 1)) : '';
}

function idsOf(html) {
  const ids = [];
  const rx = /\bid\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = rx.exec(html))) ids.push(match[1]);
  return ids;
}

function refsOf(html) {
  const refs = [];
  const rx = /\s(?:href|src|action)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = rx.exec(html))) refs.push(cleanUrl(match[1]));
  return refs;
}

function isIgnoredReference(value) {
  return /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(value);
}

function isDynamicRoute(value) {
  const p = stripQueryHash(value);
  return p.startsWith('/api/') || p.startsWith('/auth/') || p.startsWith('/go/');
}

function resolveStaticTarget(sourceFile, value) {
  const cleanPath = stripQueryHash(value);
  if (!cleanPath) return sourceFile;
  let target;
  if (cleanPath.startsWith('/')) target = path.join(publicDir, cleanPath.slice(1));
  else target = path.resolve(path.dirname(sourceFile), cleanPath);

  const candidates = [target];
  if (!path.extname(target)) {
    candidates.push(`${target}.html`);
    candidates.push(path.join(target, 'index.html'));
  }
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

const htmlFiles = walk(publicDir).filter(file => file.endsWith('.html'));
const htmlMap = new Map(htmlFiles.map(file => [file, fs.readFileSync(file, 'utf8')]));

// 1) Every static href/src/action target and every fragment must resolve.
const broken = [];
for (const [file, html] of htmlMap) {
  const sourceIds = new Set(idsOf(html));
  for (const ref of refsOf(html)) {
    if (!ref || isIgnoredReference(ref) || isDynamicRoute(ref)) continue;
    if (ref.startsWith('#')) {
      const fragment = fragmentOf(ref);
      if (fragment && !sourceIds.has(fragment)) broken.push(`${path.relative(publicDir, file)} -> ${ref} (missing anchor)`);
      continue;
    }
    const target = resolveStaticTarget(file, ref);
    if (!target) {
      broken.push(`${path.relative(publicDir, file)} -> ${ref} (missing target)`);
      continue;
    }
    const fragment = fragmentOf(ref);
    if (fragment && target.endsWith('.html')) {
      const targetHtml = fs.readFileSync(target, 'utf8');
      if (!new Set(idsOf(targetHtml)).has(fragment)) broken.push(`${path.relative(publicDir, file)} -> ${ref} (missing target anchor)`);
    }
  }
}
check('all internal static links/assets/fragments resolve', broken.length === 0, broken.slice(0, 8).join('; '));

// 2) Duplicate IDs create ambiguous CTA/anchor targets.
const duplicates = [];
for (const [file, html] of htmlMap) {
  const seen = new Set();
  for (const id of idsOf(html)) {
    if (seen.has(id)) duplicates.push(`${path.relative(publicDir, file)}#${id}`);
    seen.add(id);
  }
}
check('HTML pages have no duplicate IDs', duplicates.length === 0, duplicates.slice(0, 8).join('; '));

// 3) Primary public pages are present.
const publicPages = [
  'public/index.html',
  'public/pages/creator-suite.html',
  'public/pages/plans.html',
  'public/pages/roadmap.html',
  'public/pages/security.html',
  'public/pages/support.html',
  'public/pages/impressum.html',
  'public/pages/datenschutz.html',
  'public/pages/nutzungsbedingungen.html'
];
check('all primary public pages exist', publicPages.every(exists));

// 4) Public navigation keeps the intended website journey.
const home = read('public/index.html');
for (const route of [
  '/pages/creator-suite.html', '/pages/creator-suite.html#widget-studio', '/pages/creator-suite.html#games',
  '/pages/creator-suite.html#launcher', '/pages/plans.html', '/pages/roadmap.html', '/pages/security.html',
  '/pages/support.html', '/pages/login.html', '/pages/login.html#regForm'
]) {
  check(`homepage exposes ${route}`, home.includes(`href="${route}"`));
}
check('homepage keeps clear primary free-start CTA', home.includes('KOSTENLOS STARTEN') && home.includes('data-auth-cta'));
check('homepage keeps TikTok source-aware CTA journey', home.includes('data-source-entry hidden') && home.includes('data-funnel-cta="tiktok-tools"') && home.includes('data-funnel-cta="tiktok-community"') && home.includes('data-funnel-cta="tiktok-register"'));
check('partner surface remains hidden by default', home.includes('data-partner-section hidden'));

// 5) Auth transition / recovery routes exist and registration anchor is real.
const login = read('public/pages/login.html');
check('registration anchor exists', /id=["']regForm["']/.test(login));
check('login links password recovery', login.includes('/pages/forgot-password.html'));
check('login links email verification', login.includes('/pages/verify-email.html'));
check('auth recovery pages exist', ['public/pages/forgot-password.html','public/pages/reset-password.html','public/pages/verify-email.html'].every(exists));

// 6) Creator workspace routes are complete and reachable through its shared shell.
const creatorRoutes = [
  '/pages/dashboard.html','/pages/widget-studio.html','/pages/scene-studio.html','/pages/editor.html','/pages/tiktok.html',
  '/pages/integrations.html','/pages/games.html','/pages/cut-studio.html','/pages/nexus.html','/pages/audio-studio.html',
  '/pages/launcher.html','/pages/account.html','/pages/setup.html','/pages/settings.html'
];
const dashboard = read('public/pages/dashboard.html');
check('all creator workspace pages exist', creatorRoutes.every(route => exists(`public${route}`)));
check('dashboard/shared creator shell reaches core tools', ['/pages/widget-studio.html','/pages/tiktok.html','/pages/launcher.html','/pages/account.html'].every(route => dashboard.includes(`href="${route}"`)));

// 7) Support and security escape routes remain explicit.
check('private support anchor exists', /id=["']support-report["']/.test(read('public/pages/support.html')));
check('homepage links private support route', home.includes('/pages/support.html#support-report'));
check('RFC 9116 security.txt exists', exists('public/.well-known/security.txt'));
check('homepage links verifiable security.txt', home.includes('/.well-known/security.txt'));
check('public status route is linked', home.includes('/api/public/status'));

// 8) Error paths and runtime callback files exist.
check('custom 404 and 500 pages exist', exists('public/pages/not-found.html') && exists('public/pages/error.html'));
check('TikTok callback page exists', exists('public/auth/tiktok/callback.html'));
check('widget/game runtime pages exist', ['public/widgets/output.html','public/widgets/scene.html','public/games/runtime.html'].every(exists));

// 9) Sitemap points only at resolvable public HTML pages.
const sitemap = read('public/sitemap.xml');
const sitemapLocs = [...sitemap.matchAll(/<loc>https:\/\/cfs-zockt\.de([^<]*)<\/loc>/g)].map(match => match[1] || '/');
const sitemapBroken = [];
for (const sitePath of sitemapLocs) {
  const local = sitePath === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, sitePath.replace(/^\//, ''));
  if (!fs.existsSync(local)) sitemapBroken.push(sitePath);
}
check('sitemap URLs resolve to public files', sitemapLocs.length >= 9 && sitemapBroken.length === 0, sitemapBroken.join(', '));
check('sitemap includes all primary indexable pages', ['/','/pages/creator-suite.html','/pages/plans.html','/pages/roadmap.html','/pages/support.html','/pages/security.html','/pages/impressum.html','/pages/datenschutz.html','/pages/nutzungsbedingungen.html'].every(route => sitemapLocs.includes(route)));

// 10) No stale deleted repository reference is reintroduced in the website/deploy entrypoint.
const deploySurface = [home, read('server.js'), read('public/pages/creator-suite.html')].join('\n');
check('no stale backend-neu reference in active website/deploy surface', !deploySurface.includes('backend-neu'));

// 11) Pass documentation exists.
check('Pass 21.3.14 documentation exists', exists('WEBSITE_ACCEPTANCE_PASS21_3_14.md'));

const failed = checks.filter(item => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail && !item.ok ? ` · ${item.detail}` : ''}`);
}
console.log(`\nWebsite Acceptance Pass 21.3.14: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);

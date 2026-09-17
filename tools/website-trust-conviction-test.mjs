import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const home = read('public/index.html');
const login = read('public/pages/login.html');
const security = read('public/pages/security.html');
const server = read('server.js');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

check('Homepage exposes a dedicated trust section', home.includes('id="vertrauen"') && home.includes('SICHERHEIT & TRANSPARENZ'));
check('Main navigation prioritizes security', home.includes('<a href="/pages/security.html">SICHERHEIT</a>'));
check('Homepage links to detailed security page', home.includes('href="/pages/security.html"'));
check('Homepage does not promise absolute security', home.includes('KEIN 100-%-VERSPRECHEN') && home.includes('Sicherheit ist ein laufender Prozess.'));
check('Homepage trust claims mention no fake metrics/prices', home.includes('KEINE FAKE-ZAHLEN') && home.includes('keine erfundenen Bewertungen, Nutzerzahlen, Preise oder Merch-Bestellungen'));

check('Login explains scrypt instead of vague future wording', login.includes('scrypt') && !login.includes('cfs_zockt sollte Passwörter niemals im Klartext speichern'));
check('Login exposes security/privacy links', login.includes('/pages/security.html') && login.includes('/pages/datenschutz.html'));
check('Login describes CSRF/origin protection', login.includes('CSRF') && login.includes('Origin'));

check('Security page marks password hashing active', security.includes('<h3>Passwort-Hashing</h3>') && security.includes('state active'));
check('Security page documents CSRF and Origin controls', security.includes('CSRF- & Origin-Schutz') && security.includes('Fetch Metadata'));
check('Security page documents rate limiting', security.includes('Login- & Registrierungs-Schutz') && security.includes('begrenzt'));
check('Security page keeps an explicit partial/open area', security.includes('state partial') && security.includes('MAIL-RELAY OFFEN') && security.includes('E-Mail-Verifizierung & Recovery'));
check('Security page avoids impossible 100 percent guarantee', security.includes('nicht versprechen') && security.includes('100 % unangreifbar'));

// Back the public claims with concrete implementation markers.
check('Server implements scrypt password hashing', server.includes('crypto.scrypt(') && server.includes('createPasswordHash'));
check('Server uses secure HttpOnly creator session cookies in production', server.includes('CREATOR_SESSION_COOKIE') && server.includes('httpOnly:') && server.includes('secure:'));
check('Server implements signed session-bound CSRF', server.includes('creatorCsrfSignature') && server.includes('createCreatorCsrfToken') && server.includes('X-CSRF-Token'));
check('Server checks Fetch Metadata for browser writes', server.includes('Sec-Fetch-Site') && server.includes('browserWriteSourceAllowed'));
check('Server has login and registration limits', server.includes('LOGIN_RATE_MAX') && server.includes('REGISTER_RATE_MAX'));
check('Server has a Content-Security-Policy', server.includes('Content-Security-Policy') && server.includes("script-src 'self'"));
check('Backend version stays 3.12.0', pkg.version === '3.12.0');

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} trust/security checks passed.`);
if (failed.length) process.exit(1);

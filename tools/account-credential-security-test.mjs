import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const root = path.resolve(process.argv[2] || '.');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const server = read('server.js');
const loginHtml = read('public/pages/login.html');
const loginJs = read('public/assets/js/page-login.js');
const accountHtml = read('public/pages/account.html');
const accountJs = read('public/assets/js/page-account.js');
const settings = read('public/pages/settings.html');
const security = read('public/pages/security.html');
const support = read('public/pages/support.html');

const checks = [];
const check = (name, condition) => checks.push({name, ok:Boolean(condition)});

check('password minimum is 15', /const PASSWORD_MIN_LENGTH\s*=\s*\n\s*15;/.test(server));
check('password maximum remains 128', /const PASSWORD_MAX_LENGTH\s*=\s*\n\s*128;/.test(server));
check('password KDF is versioned', /const PASSWORD_KDF_VERSION\s*=\s*\n\s*2;/.test(server));
check('scrypt v2 uses N=2^15', /N:\s*2 \*\* 15/.test(server));
check('scrypt v2 uses r=8', /r:\s*8/.test(server));
check('scrypt v2 uses p=3', /p:\s*3/.test(server));
check('scrypt v2 has explicit maxmem', /maxmem:\s*64 \* 1024 \* 1024/.test(server));
check('legacy KDF verification remains', /Legacy V1: Node-Defaults/.test(server));
check('creator accounts store KDF version', /password_kdf_version SMALLINT/.test(server));
check('existing databases get KDF column', /ADD COLUMN IF NOT EXISTS password_kdf_version/.test(server));
check('new registrations store KDF version', /passwordRecord\.kdfVersion/.test(server));
check('successful legacy login upgrades KDF', /Number\(account\.password_kdf_version \|\| 1\)[\s\S]*createPasswordHash\([\s\S]*UPDATE creator_accounts[\s\S]*password_kdf_version/.test(server));
check('server password blocklist exists', /COMMON_PASSWORD_BLOCKLIST/.test(server));
check('account context is checked by password policy', /context\.email[\s\S]*context\.displayName/.test(server));
check('password change has its own rate limiter', /accountPasswordChangeLimiter/.test(server));
check('password change endpoint exists', /"\/api\/account\/password"/.test(server));
check('password change requires auth', /"\/api\/account\/password",\s*\n\s*requireCreatorAccount/.test(server));
check('current password is reverified', /currentPassword[\s\S]*verifyPassword\(/.test(server));
check('same password is rejected', /Das neue Passwort muss sich vom aktuellen Passwort unterscheiden/.test(server));
check('password change revokes existing sessions', /DELETE FROM creator_sessions WHERE creator_id=\$1/.test(server));
check('password change creates a fresh session', /password_changed[\s\S]*createCreatorSession\(res,account\.id,\"password_change\"\)/.test(server));
check('password change security event exists', /"password_changed"/.test(server));
check('registration UI requires 15 chars', /regPassword[^>]*minlength="15"/.test(loginHtml));
check('registration UI no longer requires number rule', !/data-rule="number"/.test(loginHtml) && !/number:\/\\d/.test(loginJs));
check('registration UI no longer requires letter rule', !/data-rule="letter"/.test(loginHtml) && !/letter:/.test(loginJs));
check('registration client check uses 15 chars', /p\.length>=15/.test(loginJs));
check('account password change form exists', /id="passwordChangeForm"/.test(accountHtml));
check('account new password requires 15 chars', /id="newPassword"[^>]*minlength="15"/.test(accountHtml));
check('account UI posts to password endpoint', /\/api\/account\/password/.test(accountJs));
check('account UI confirms matching new passwords', /newPassword\.value !== newPasswordConfirm\.value/.test(accountJs));
check('security activity labels password change', /password_changed:\s*"Passwort geändert"/.test(accountJs));
check('settings distinguish change from recovery transport', /sichere Verifizierungs-\/Recovery-Unterbau ist vorhanden/.test(settings));
check('security page documents KDF migration', /automatisch migriert/.test(security));
check('support does not fake password reset', /Ob ein Link versendet werden kann/.test(support) && /produktiven Mail-Relay-Status/.test(support));
check('support says it will not ask for password', /Support fragt niemals nach deinem Passwort/.test(support));

// Runtime sanity: the chosen scrypt parameters must be accepted by this Node runtime.
const scrypt = promisify(crypto.scrypt);
try {
  const out = await scrypt('correct horse battery staple', '0123456789abcdef', 64, {N:2**15,r:8,p:3,maxmem:64*1024*1024});
  check('scrypt v2 parameters execute successfully', Buffer.isBuffer(out) && out.length === 64);
} catch {
  check('scrypt v2 parameters execute successfully', false);
}

const failed = checks.filter(x => !x.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nCredential Security: ${checks.length-failed.length}/${checks.length}`);
if (failed.length) process.exit(1);

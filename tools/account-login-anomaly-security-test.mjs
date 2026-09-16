import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('server.js');
const pkg = JSON.parse(read('package.json'));
const accountHtml = read('public/pages/account.html');
const accountJs = read('public/assets/js/page-account.js');
const loginHtml = read('public/pages/login.html');
const securityHtml = read('public/pages/security.html');
const readme = read('README.md');
const current = read('PROJECT_CURRENT_STATE.md');

let passed = 0;
const checks = [];
function check(name, condition) { checks.push({name, ok:Boolean(condition)}); if (condition) passed += 1; }
function has(text, value) { return text.includes(value); }
function re(text, regex) { return regex.test(text); }

check('anomaly:check script exists', pkg.scripts?.['anomaly:check'] === 'node tools/account-login-anomaly-security-test.mjs .');
check('Persistent account throttle table exists', has(source, 'CREATE TABLE IF NOT EXISTS creator_login_throttle'));
check('Persistent throttle is account keyed', has(source, 'creator_id TEXT PRIMARY KEY REFERENCES creator_accounts(id)'));
check('Throttle stores no IP field', !re(source, /CREATE TABLE IF NOT EXISTS creator_login_throttle\s*\([\s\S]*?\n\s*\)/i) || !re((source.match(/CREATE TABLE IF NOT EXISTS creator_login_throttle\s*\([\s\S]*?\n\s*\)/i)||[''])[0], /\b(ip|ip_address|client_ip)\b/i));
check('Throttle stores no user agent field', !re(source, /CREATE TABLE IF NOT EXISTS creator_login_throttle[\s\S]{0,650}user_agent/i));
check('Account failure observation window is configured', re(source, /ACCOUNT_LOGIN_FAILURE_WINDOW_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/));
check('Account failure threshold is configured', re(source, /ACCOUNT_LOGIN_FAILURE_MAX\s*=\s*20/));
check('Temporary account block is configured', re(source, /ACCOUNT_LOGIN_BLOCK_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/));
check('Known blocked account follows dummy scrypt path', re(source, /persistentThrottle\.blocked[\s\S]{0,400}scryptAsync\(password,"cfs_login_dummy_salt_v1"\)/));
check('Blocked response remains generic', re(source, /persistentThrottle\.blocked[\s\S]{0,500}E-Mail-Adresse oder Passwort ist nicht korrekt/));
check('Wrong password increments persistent account counter', has(source, 'recordAccountPasswordFailure(account.id)'));
check('Successful password clears account failure counter', has(source, 'clearAccountPasswordFailures(account.id)'));
check('Throttle warning security event exists', has(source, '"login_throttled"'));
check('Throttle warning can be mailed', has(source, 'passwordThrottleMailMessage'));

check('Security alert cooldown table exists', has(source, 'CREATE TABLE IF NOT EXISTS creator_security_alerts'));
check('Security alert cooldown is six hours', re(source, /SECURITY_ALERT_COOLDOWN_MS\s*=\s*6\s*\*\s*60\s*\*\s*60\s*\*\s*1000/));
check('Cooldown upsert only returns when eligible', has(source, 'WHERE creator_security_alerts.last_sent_at < $3'));
check('Successful-login warning helper exists', has(source, 'queueSuccessfulLoginAlert'));
check('Password login labels session method', re(source, /createCreatorSession\([\s\S]{0,120}account\.id,[\s\S]{0,80}"password"/));
check('TOTP/recovery login labels session method', has(source, 'const authMethod = recoveryUsed ? "recovery_code" : "totp"'));
check('Passkey login labels session method', has(source, 'createCreatorSession(res,mfaRow.creator_id,"passkey")'));

check('Session table stores auth method', has(source, "ADD COLUMN IF NOT EXISTS auth_method VARCHAR(32) NOT NULL DEFAULT 'unknown'"));
check('Session API returns auth method', has(source, 'auth_method:String(row.auth_method || "unknown")'));
check('Account UI displays session auth method', has(accountJs, 'Methode: ${authMethodLabel(item.auth_method)}'));
check('Account UI contains anomaly status panel', has(accountHtml, 'id="securitySignalText"') && has(accountHtml, 'id="securitySignalStatus"'));
check('Account UI explicitly avoids fingerprinting', has(accountHtml, 'keine Standortverläufe, Browser-Fingerprints oder dauerhaften Geräteprofile'));

check('Post-password MFA failure event exists', has(source, '"mfa_after_password_failed"'));
check('Invalid TOTP/recovery records suspicious failure', re(source, /if \(!verified\)[\s\S]{0,220}recordSuspiciousMfaFailure\(challenge\.creator_id/));
check('Invalid passkey records suspicious failure', has(source, 'recordSuspiciousMfaFailure(mfaRow.creator_id,"passkey")'));
check('Suspicious MFA warning mail exists', has(source, 'suspiciousMfaMailMessage'));
check('Security summary counts suspicious MFA failures', has(source, "event_type='mfa_after_password_failed'"));
check('Account UI labels suspicious MFA event', has(accountJs, 'Korrektes Passwort, zweiter Faktor fehlgeschlagen'));
check('Account UI labels throttle event', has(accountJs, 'Viele Passwortversuche vorübergehend gedrosselt'));

check('Login page explains persistent account throttle', has(loginHtml, 'persistenter kontoweiter Fehlversuchs-Throttle'));
check('Security page documents privacy-friendly anomaly protection', has(securityHtml, 'Login-Warnungen & Anomalie-Signale') && has(securityHtml, 'ohne Standorttracking oder Browser-Fingerprinting'));
check('README documents Pass 9', has(readme, 'Account Login / Anomaly Security (Pass 9)'));
check('Current state documents Pass 9', has(current, 'Account Login / Anomaly Security'));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nLogin / Anomaly Security: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);

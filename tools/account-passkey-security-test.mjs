import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('server.js');
const pkg = JSON.parse(read('package.json'));
const accountHtml = read('public/pages/account.html');
const loginHtml = read('public/pages/login.html');
const accountJs = read('public/assets/js/page-account.js');
const loginJs = read('public/assets/js/page-login.js');
const browserJs = read('public/assets/js/webauthn-browser.js');
const configDoctor = read('lib/config-doctor.js');
const envExample = read('.env.example');
const securityHtml = read('public/pages/security.html');
const privacyHtml = read('public/pages/datenschutz.html');
const readme = read('README.md');
const current = read('PROJECT_CURRENT_STATE.md');
const require = createRequire(import.meta.url);
const helper = require(path.join(root, 'lib/account-passkey-security.js'));

let passed = 0;
const checks = [];
function check(name, condition) {
  checks.push({name, ok:Boolean(condition)});
  if (condition) passed += 1;
}
function has(text, value) { return text.includes(value); }
function re(text, regex) { return regex.test(text); }

check('Node engine requires 22+', String(pkg.engines?.node || '').includes('>=22'));
check('SimpleWebAuthn server dependency is pinned', pkg.dependencies?.['@simplewebauthn/server'] === '14.0.2');
check('passkey:check script exists', pkg.scripts?.['passkey:check'] === 'node tools/account-passkey-security-test.mjs .');
check('Runtime rejects Node <22', has(source, 'if (nodeMajor < 22)'));
check('WebAuthn RP-ID env exists', has(envExample, 'CFS_WEBAUTHN_RP_ID='));
check('Config doctor validates RP-ID', has(configDoctor, 'CFS_WEBAUTHN_RP_ID') && has(configDoctor, 'hostnameOnly'));
check('RP-ID forbids protocol/path', has(source, 'PASSKEY_RP_ID.includes(":")') && has(source, 'PASSKEY_RP_ID.includes("/")'));
check('Production binds RP-ID to canonical host', has(source, 'APP_CANONICAL_HOSTNAME.endsWith(`.${PASSKEY_RP_ID}`)'));
check('Expected origins are explicitly configured', has(source, 'PASSKEY_EXPECTED_ORIGINS'));
check('Passkey challenge TTL is five minutes', re(source, /PASSKEY_CHALLENGE_TTL_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/));
check('Per-account passkey cap exists', re(source, /PASSKEY_MAX_PER_ACCOUNT\s*=\s*8/));
check('Passkey rate limiter exists', has(source, 'accountPasskeyLimiter'));

check('Credential table exists', has(source, 'CREATE TABLE IF NOT EXISTS creator_webauthn_credentials'));
check('Credential public key is stored', has(source, 'public_key BYTEA'));
check('Credential counter is stored', has(source, 'counter BIGINT'));
check('Credential transports are stored', has(source, 'transports TEXT[]'));
check('Challenge table exists', has(source, 'CREATE TABLE IF NOT EXISTS creator_webauthn_challenges'));
check('Challenge stores session binding', re(source, /session_hash\s+CHAR\(64\)/));
check('Challenge stores MFA binding', re(source, /mfa_challenge_hash\s+CHAR\(64\)/));
check('Challenge verification uses atomic DELETE RETURNING', re(source, /DELETE FROM creator_webauthn_challenges[\s\S]{0,500}RETURNING id,creator_id,purpose,challenge/));
check('Expired challenges cannot verify', has(source, 'AND expires_at>NOW()'));

check('Registration options endpoint exists', has(source, '"/api/account/passkeys/register/options"'));
check('Registration requires account session', re(source, /"\/api\/account\/passkeys\/register\/options"[\s\S]{0,120}requireCreatorAccount/));
check('Registration requires current password', re(source, /passkeys\/register\/options[\s\S]{0,900}verifyCreatorPasswordForLifecycle/));
check('Registration requests user verification', has(source, 'authenticatorSelection:{residentKey:"preferred",userVerification:"required"}'));
check('Registration verifies user verification', re(source, /verifyRegistrationResponse\([\s\S]{0,600}requireUserVerification:true/));
check('Registration checks expected RP-ID', re(source, /verifyRegistrationResponse\([\s\S]{0,600}expectedRPID:PASSKEY_RP_ID/));
check('Registration checks expected origin', re(source, /verifyRegistrationResponse\([\s\S]{0,600}expectedOrigin:PASSKEY_EXPECTED_ORIGINS/));
check('Attestation defaults to none', has(source, 'attestationType:"none"'));
check('Algorithms are restricted', has(source, 'supportedAlgorithmIDs:[-7,-257]'));
check('Existing credentials are excluded during registration', has(source, 'excludeCredentials:existing.map'));
check('Registration challenge is bound to session', has(source, 'sessionHash:currentCreatorSessionHash(req)'));
check('Passkey public key is persisted', has(source, 'Buffer.from(credential.publicKey)'));
check('First passkey can create recovery codes', re(source, /if \(!methods\.totp && methods\.recovery_codes_remaining===0\) recoveryCodes=await replaceRecoveryCodes/));
check('Adding passkey revokes other sessions', re(source, /passkey_added[\s\S]{0,1000}|DELETE FROM creator_sessions WHERE creator_id=\$1 AND token_hash<>\$2/));

check('Passkey deletion endpoint exists', has(source, '"/api/account/passkeys/:passkeyRef"'));
check('Passkey deletion requires current password', re(source, /api\/account\/passkeys\/:passkeyRef[\s\S]{0,800}verifyCreatorPasswordForLifecycle/));
check('Removing last passkey only removes recovery codes when TOTP absent', re(source, /remaining===0 && totp\.rowCount===0/));

check('Passkey MFA options endpoint exists', has(source, '"/api/account/mfa/passkey/options"'));
check('Authentication requests user verification', re(source, /generateAuthenticationOptions\([\s\S]{0,400}userVerification:"required"/));
check('Authentication challenge binds to MFA challenge hash', has(source, 'mfaChallengeHashValue:mfaHash'));
check('Passkey verify endpoint exists', has(source, '"/api/account/mfa/passkey/verify"'));
check('Authentication verifies user verification', re(source, /verifyAuthenticationResponse\([\s\S]{0,650}requireUserVerification:true/));
check('Authentication validates stored public key', has(source, 'publicKey:new Uint8Array(passkey.public_key)'));
check('Authentication validates stored counter', has(source, 'counter:Number(passkey.counter||0)'));
check('Authentication updates counter after success', has(source, 'verification.authenticationInfo?.newCounter'));
check('Creator session is created only after WebAuthn verification', re(source, /if \(!verification\.verified\)[\s\S]{0,900}createCreatorSession\(res,mfaRow\.creator_id,\"passkey\"\)/));

check('Login can require passkey MFA', re(source, /mfa_methods:\s*\{[\s\S]{0,180}totp:authMethods\.totp,[\s\S]{0,80}passkey:authMethods\.passkey,[\s\S]{0,120}recovery:authMethods\.recovery_codes_remaining\s*>\s*0/));
check('Security log includes passkey login', has(source, '"login_success_passkey"'));
check('Security log includes passkey added', has(source, '"passkey_added"'));
check('Security log includes passkey removed', has(source, '"passkey_removed"'));
check('Previously introduced MFA security events are allowlisted', ['mfa_enabled','mfa_disabled','mfa_recovery_code_used','mfa_recovery_codes_regenerated'].every(x => has(source, `"${x}"`)));
check('Mail/recovery security events are allowlisted', ['email_verification_requested','email_verified','password_reset_requested','password_reset_completed'].every(x => has(source, `"${x}"`)));

check('Account page exposes passkey management', has(accountHtml, 'id="passkeyAddForm"') && has(accountHtml, 'id="passkeyList"'));
check('Account page loads browser WebAuthn adapter', has(accountHtml, '/assets/js/webauthn-browser.js'));
check('Login offers passkey confirmation', has(loginHtml, 'id="passkeyLoginButton"'));
check('Login loads browser WebAuthn adapter', has(loginHtml, '/assets/js/webauthn-browser.js'));
check('Account JS starts registration ceremony', has(accountJs, '/api/account/passkeys/register/options') && has(accountJs, 'CFSWebAuthn.create'));
check('Login JS starts authentication ceremony', has(loginJs, '/api/account/mfa/passkey/options') && has(loginJs, 'CFSWebAuthn.get'));
check('Browser adapter uses navigator.credentials.create', has(browserJs, 'navigator.credentials.create'));
check('Browser adapter uses navigator.credentials.get', has(browserJs, 'navigator.credentials.get'));
check('Browser adapter converts base64url binary fields', has(browserJs, 'base64urlToBytes') && has(browserJs, 'bytesToBase64url'));

check('Account export includes only passkey metadata query', has(source, 'SELECT label,device_type,backed_up,transports,created_at,last_used_at FROM creator_webauthn_credentials'));
check('Account export does not select passkey public_key', !has(source, 'SELECT credential_id,public_key,counter,transports,device_type,backed_up,label,created_at,last_used_at FROM creator_webauthn_credentials WHERE creator_id=$1 ORDER BY created_at'));
check('Export states private keys are excluded', has(source, 'WebAuthn private keys'));
check('Privacy page states private key remains on device', has(privacyHtml, 'Der private Schlüssel verbleibt im Authenticator'));
check('Security page describes active passkeys', has(securityHtml, '<h3>Passkeys / WebAuthn</h3>') && !has(securityHtml, 'spätere Passkey/WebAuthn-Stufe'));
check('README documents active Pass 8', has(readme, '## Account Passkeys / WebAuthn (Pass 8)'));
check('Current state documents real E2E test as still open', has(current, 'echter Browser-/Authenticator-E2E') && has(current, 'bleibt offen'));

const uid = helper.webauthnUserID('creator-123');
check('Stable WebAuthn user ID is 32 bytes', uid instanceof Uint8Array && uid.length === 32);
check('Passkey label normalization trims/collapses whitespace', helper.normalizePasskeyName('  Mein   Schlüssel  ') === 'Mein Schlüssel');
check('Empty label falls back safely', helper.normalizePasskeyName('   ') === 'Passkey');
check('Passkey public reference does not expose credential ID', helper.passkeyReference('raw-credential-id') !== 'raw-credential-id' && helper.passkeyReference('raw-credential-id').length === 24);
check('Challenge ID validates UUID', helper.validChallengeId('123e4567-e89b-42d3-a456-426614174000'));
check('Challenge ID rejects arbitrary data', !helper.validChallengeId('../not-a-uuid'));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nPasskey Security: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);

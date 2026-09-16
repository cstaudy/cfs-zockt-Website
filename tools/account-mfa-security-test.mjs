import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(process.argv[2]||".");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const mfa=require(path.join(root,"lib/account-mfa-security.js"));
const server=read("server.js");
const account=read("public/pages/account.html");
const accountJs=read("public/assets/js/page-account.js");
const login=read("public/pages/login.html");
const loginJs=read("public/assets/js/page-login.js");
const security=read("public/pages/security.html");
const env=read(".env.example");
const doctor=read("lib/config-doctor.js");
let pass=0,total=0;
function check(name,ok){total++;if(!ok)throw new Error(`FAIL: ${name}`);pass++;}

check("20-byte TOTP secret",mfa.base32Decode(mfa.createTotpSecret(20)).length===20);
const rfcSecret=mfa.base32Encode(Buffer.from("12345678901234567890","ascii"));
check("RFC6238 SHA1 vector",mfa.hotp(rfcSecret,1,8)==="94287082");
check("TOTP current step accepted",mfa.verifyTotp(rfcSecret,"94287082",{now:59000,window:0,digits:8,lastUsedStep:-1}).ok===true);
check("TOTP replay blocked",mfa.verifyTotp(rfcSecret,"94287082",{now:59000,window:0,digits:8,lastUsedStep:1}).ok===false);
check("TOTP malformed blocked",mfa.verifyTotp(rfcSecret,"12345",{now:59000}).ok===false);
const codes=mfa.createRecoveryCodes(10);
check("10 recovery codes",codes.length===10);
check("recovery codes unique",new Set(codes).size===codes.length);
check("recovery display grouped",codes.every(c=>/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)));
check("recovery normalization",mfa.normalizeRecoveryCode("abcd-1234-efgh")==="ABCD1234EFGH");
check("recovery HMAC stable",mfa.recoveryCodeHash("S".repeat(40),"c1",codes[0])===mfa.recoveryCodeHash("S".repeat(40),"c1",codes[0]));
check("recovery HMAC creator-bound",mfa.recoveryCodeHash("S".repeat(40),"c1",codes[0])!==mfa.recoveryCodeHash("S".repeat(40),"c2",codes[0]));
check("otpauth URI",mfa.otpauthUri({secret:rfcSecret,email:"x@example.com"}).startsWith("otpauth://totp/"));

for(const token of [
  "CREATE TABLE IF NOT EXISTS creator_mfa_totp",
  "CREATE TABLE IF NOT EXISTS creator_mfa_recovery_codes",
  "CREATE TABLE IF NOT EXISTS creator_mfa_challenges",
  "secret_ciphertext TEXT NOT NULL",
  "last_used_step BIGINT NOT NULL DEFAULT -1",
  "MFA_CHALLENGE_TTL_MS",
  "__Host-cfs_mfa_challenge",
  "sameSite: \"strict\"",
  "CFS_MFA_RECOVERY_HASH_SALT",
  "recoveryCodeHash(MFA_RECOVERY_HASH_SALT",
  "encryptSecret(secret)",
  "decryptSecret(row.secret_ciphertext)",
  "consumeTotpForCreator",
  "consumeRecoveryCode",
  '"/api/account/mfa/login"',
  '"/api/account/mfa/setup"',
  '"/api/account/mfa/enable"',
  '"/api/account/mfa/recovery-codes"',
  '"/api/account/mfa/disable"',
  '"mfa_enabled"',
  '"mfa_disabled"',
  '"mfa_recovery_code_used"',
  '"login_success_mfa"'
])check(`server contains ${token}`,server.includes(token));
check("MFA login only after password",server.indexOf("await verifyPassword(")<server.indexOf("await creatorAuthMethods(account.id)"));
check("no session before MFA challenge",server.indexOf("await creatorAuthMethods(account.id)")<server.indexOf("await createCreatorSession(\n                res,\n                account.id"));
check("recovery code consumed atomically",server.includes("UPDATE creator_mfa_recovery_codes SET used_at=NOW()"));
check("TOTP step updated atomically",server.includes("UPDATE creator_mfa_totp SET last_used_step=$2"));
check("MFA enable revokes other sessions",server.includes("DELETE FROM creator_sessions WHERE creator_id=$1 AND token_hash<>$2"));
check("MFA mail alert",server.includes("mfaSecurityMailMessage"));
check("account export omits secret",server.includes("MFA/TOTP shared secrets")&&server.includes("recovery-code hashes"));
check("account page MFA controls",account.includes("Authenticator-App & Recovery-Codes")&&account.includes('id="mfaSetupForm"')&&account.includes('id="mfaDisableForm"'));
check("account JS handles recovery codes",accountJs.includes("showRecoveryCodes")&&accountJs.includes("/api/account/mfa/recovery-codes"));
check("login MFA step",login.includes('id="mfaLoginForm"')&&login.includes("RECOVERY-CODE"));
check("login JS calls MFA route",loginJs.includes("/api/account/mfa/login")&&loginJs.includes("mfa_required"));
check("security page transparent TOTP",security.includes("TOTP")||security.includes("Zwei-Faktor"));
check("env documents MFA salt",env.includes("CFS_MFA_RECOVERY_HASH_SALT="));
check("config doctor requires MFA salt",doctor.includes('{name:"CFS_MFA_RECOVERY_HASH_SALT",required:true,secret:true'));
console.log(JSON.stringify({ok:true,checks:`${pass}/${total}`}));

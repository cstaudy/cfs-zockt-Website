"use strict";

const SECRET_NAMES=new Set([
  "DATABASE_URL",
  "TIKTOK_CLIENT_SECRET",
  "CFS_TOKEN_ENCRYPTION_KEY",
  "CFS_CSRF_SIGNING_SECRET",
  "CFS_PUBLIC_REVIEW_HASH_SALT",
  "CFS_PUBLIC_SUPPORT_HASH_SALT",
  "CFS_MFA_RECOVERY_HASH_SALT",
  "CFS_ADMIN_ELEVATION_SECRET",
  "CFS_ADMIN_AUDIT_HMAC_SECRET",
  "CFS_ACCOUNT_MAIL_WEBHOOK_SECRET",
  "CFS_GITHUB_RELEASE_TOKEN",
  "CFS_STRIPE_SECRET_KEY",
  "CFS_STRIPE_WEBHOOK_SECRET",
  "CFS_TIKTOK_CONNECT_CODE",
  "RENDER_DEPLOY_HOOK_URL",
  "CSC_LINK",
  "CSC_KEY_PASSWORD"
]);

function clean(value){return String(value??"").trim()}
function semver(value){return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(clean(value))}
function httpsUrl(value){try{const u=new URL(clean(value));return u.protocol==="https:"&&Boolean(u.hostname)}catch{return false}}
function repoName(value){return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(clean(value))}
function postgresUrl(value){return /^(postgres|postgresql):\/\//i.test(clean(value))}
function prefix(value,p){return clean(value).startsWith(p)}
function boolish(value){return ["true","false"].includes(clean(value).toLowerCase())}
function hostnameOnly(value){return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/i.test(clean(value))}

const RUNTIME_SPECS=Object.freeze([
  {name:"NODE_ENV",required:true,secret:false,validate:v=>clean(v)==="production",hint:"production"},
  {name:"APP_BASE_URL",required:true,secret:false,validate:httpsUrl,hint:"HTTPS Production URL"},
  {name:"CFS_WEBAUTHN_RP_ID",required:false,secret:false,validate:hostnameOnly,hint:"optional; WebAuthn RP-ID ohne Protokoll, standardmäßig APP_BASE_URL Host"},
  {name:"DATABASE_URL",required:true,secret:true,validate:postgresUrl,hint:"PostgreSQL URL"},
  {name:"TIKTOK_CLIENT_KEY",required:true,secret:false,validate:v=>clean(v).length>=4,hint:"TikTok Client Key"},
  {name:"TIKTOK_CLIENT_SECRET",required:true,secret:true,validate:v=>clean(v).length>=8,hint:"TikTok Client Secret"},
  {name:"TIKTOK_REDIRECT_URI",required:true,secret:false,validate:httpsUrl,hint:"HTTPS OAuth Callback"},
  {name:"CFS_TOKEN_ENCRYPTION_KEY",required:true,secret:true,validate:v=>clean(v).length>=32,hint:"32-Byte AES-Key (Hex oder Base64)"},
  {name:"CFS_CSRF_SIGNING_SECRET",required:true,secret:true,validate:v=>clean(v).length>=32,hint:"separates CSRF Signing Secret"},
  {name:"CFS_PUBLIC_REVIEW_HASH_SALT",required:true,secret:true,validate:v=>clean(v).length>=32,hint:"separater HMAC-Schlüssel für Review-Missbrauchsschutz"},
  {name:"CFS_PUBLIC_SUPPORT_HASH_SALT",required:true,secret:true,validate:v=>clean(v).length>=32,hint:"separater HMAC-Schlüssel für Support-Missbrauchsschutz"},
  {name:"CFS_MFA_RECOVERY_HASH_SALT",required:true,secret:true,validate:v=>clean(v).length>=32,hint:"separater HMAC-Schlüssel für MFA-Recovery-Codes"},
  {name:"CFS_ADMIN_ELEVATION_SECRET",required:true,secret:true,validate:v=>clean(v).length>=32,hint:"separates Signing-Secret für Admin-Step-up"},
  {name:"CFS_ADMIN_AUDIT_HMAC_SECRET",required:true,secret:true,validate:v=>clean(v).length>=32,hint:"separater HMAC-Schlüssel für die Admin-Audit-Kette"},
  {name:"CFS_ACCOUNT_MAIL_MODE",required:false,secret:false,validate:v=>["disabled","webhook"].includes(clean(v).toLowerCase()),hint:"disabled oder webhook"},
  {name:"CFS_EMAIL_VERIFICATION_REQUIRED",required:false,secret:false,validate:boolish,hint:"true/false; true nur mit aktivem Mail-Webhook"},
  {name:"CFS_ADMIN_CREATOR_IDS",required:false,secret:false,validate:v=>clean(v).length>0,hint:"Admin Creator IDs"},
  {name:"CFS_ADMIN_EMAILS",required:false,secret:false,validate:v=>clean(v).includes("@"),hint:"Admin E-Mails"},
  {name:"CFS_LAUNCHER_BUILD_TARGET_VERSION",required:true,secret:false,validate:semver,hint:"z. B. 0.42.0"},
  {name:"CFS_RELEASE_EVIDENCE_VERSION",required:true,secret:false,validate:semver,hint:"z. B. 0.42.0"},
  {name:"CFS_LAUNCHER_RELEASE_REPO",required:true,secret:false,validate:repoName,hint:"owner/repository"},
  {name:"CFS_STRIPE_SECRET_KEY",required:true,secret:true,validate:v=>prefix(v,"sk_test_")||prefix(v,"sk_live_"),hint:"Stripe Secret Key"},
  {name:"CFS_STRIPE_WEBHOOK_SECRET",required:true,secret:true,validate:v=>prefix(v,"whsec_"),hint:"Stripe Webhook Secret"},
  {name:"CFS_STRIPE_PRICE_CREATOR_MONTHLY",required:true,secret:false,validate:v=>prefix(v,"price_"),hint:"Stripe CREATOR Price ID"},
  {name:"CFS_STRIPE_PRICE_PRO_MONTHLY",required:true,secret:false,validate:v=>prefix(v,"price_"),hint:"Stripe PRO Price ID"},
  {name:"CFS_BILLING_GRACE_DAYS",required:false,secret:false,validate:v=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=30,hint:"0–30"},
  {name:"CFS_ALLOW_LEGACY_VERIFICATION_FLAGS",required:true,secret:false,validate:v=>boolish(v)&&clean(v).toLowerCase()==="false",hint:"muss im normalen Betrieb false sein"}
]);

const GITHUB_PRODUCTION_SPECS=Object.freeze([
  {name:"RENDER_DEPLOY_HOOK_URL",required:true,secret:true,validate:httpsUrl,hint:"GitHub Environment Secret"},
  {name:"CFS_PRODUCTION_URL",required:true,secret:false,validate:httpsUrl,hint:"GitHub Environment Variable"}
]);

const GITHUB_WINDOWS_SPECS=Object.freeze([
  {name:"CSC_LINK",required:true,secret:true,validate:v=>clean(v).length>=8,hint:"Signing certificate / electron-builder input"},
  {name:"CSC_KEY_PASSWORD",required:true,secret:true,validate:v=>clean(v).length>=1,hint:"Signing certificate password"}
]);

function resultFor(spec,env){
  const value=clean(env?.[spec.name]);
  if(!value)return{name:spec.name,secret:Boolean(spec.secret||SECRET_NAMES.has(spec.name)),required:Boolean(spec.required),status:spec.required?"missing":"optional_missing",hint:spec.hint||""};
  let valid=true;
  try{valid=typeof spec.validate==="function"?Boolean(spec.validate(value)):true}catch{valid=false}
  return{name:spec.name,secret:Boolean(spec.secret||SECRET_NAMES.has(spec.name)),required:Boolean(spec.required),status:valid?"ok":"invalid",hint:spec.hint||""};
}
function evaluateSpecs(specs,env={}){
  const checks=specs.map(spec=>resultFor(spec,env));
  const blocking=checks.filter(c=>c.required&&c.status!=="ok");
  return{
    ready:blocking.length===0,
    passed:checks.filter(c=>c.status==="ok").length,
    total:checks.length,
    blocking:blocking.map(c=>c.name),
    checks
  };
}
function runtimeDoctor(env={}){
  const result=evaluateSpecs(RUNTIME_SPECS,env);
  const adminOk=clean(env.CFS_ADMIN_CREATOR_IDS).length>0||clean(env.CFS_ADMIN_EMAILS).length>0;
  const adminCheck={name:"CFS_ADMIN_ACCESS",secret:false,required:true,status:adminOk?"ok":"missing",hint:"mindestens CFS_ADMIN_CREATOR_IDS oder CFS_ADMIN_EMAILS"};
  const mailMode=clean(env.CFS_ACCOUNT_MAIL_MODE||"disabled").toLowerCase();
  const mailEnabled=mailMode==="webhook";
  const mailUrl={name:"CFS_ACCOUNT_MAIL_WEBHOOK_URL",secret:false,required:mailEnabled,status:mailEnabled?(httpsUrl(env.CFS_ACCOUNT_MAIL_WEBHOOK_URL)?"ok":"missing"):"optional_missing",hint:"HTTPS URL des signierten Account-Mail-Relays"};
  const mailSecretValue=clean(env.CFS_ACCOUNT_MAIL_WEBHOOK_SECRET);
  const mailSecret={name:"CFS_ACCOUNT_MAIL_WEBHOOK_SECRET",secret:true,required:mailEnabled,status:mailEnabled?(mailSecretValue.length>=32?"ok":"missing"):"optional_missing",hint:"mind. 32 Zeichen; eigener HMAC-Schlüssel für den Mail-Relay"};
  const verificationRequired=clean(env.CFS_EMAIL_VERIFICATION_REQUIRED).toLowerCase()==="true";
  const verificationCheck={name:"CFS_EMAIL_VERIFICATION_TRANSPORT",secret:false,required:verificationRequired,status:verificationRequired&&mailEnabled&&mailUrl.status==="ok"&&mailSecret.status==="ok"?"ok":verificationRequired?"missing":"optional_missing",hint:"bei Pflicht-Verifizierung muss der Mail-Webhook vollständig konfiguriert sein"};
  const checks=[...result.checks,adminCheck,mailUrl,mailSecret,verificationCheck];
  const blocking=checks.filter(c=>c.required&&c.status!=="ok");
  return{ready:blocking.length===0,passed:checks.filter(c=>c.status==="ok").length,total:checks.length,blocking:blocking.map(c=>c.name),checks};
}
function githubProductionDoctor(env={}){return evaluateSpecs(GITHUB_PRODUCTION_SPECS,env)}
function githubWindowsDoctor(env={}){return evaluateSpecs(GITHUB_WINDOWS_SPECS,env)}
function safeDoctorReport(report={}){
  return JSON.parse(JSON.stringify(report));
}

module.exports={
  SECRET_NAMES,RUNTIME_SPECS,GITHUB_PRODUCTION_SPECS,GITHUB_WINDOWS_SPECS,
  semver,httpsUrl,repoName,postgresUrl,hostnameOnly,runtimeDoctor,githubProductionDoctor,githubWindowsDoctor,safeDoctorReport
};

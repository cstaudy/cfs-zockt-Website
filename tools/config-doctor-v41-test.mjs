import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {runtimeDoctor,githubProductionDoctor,githubWindowsDoctor}=require("../lib/config-doctor.js");

const secret="SUPER_SECRET_DO_NOT_PRINT_123456789";
const runtimeEnv={
  NODE_ENV:"production",
  APP_BASE_URL:"https://cfs.example",
  DATABASE_URL:"postgresql://user:"+secret+"@db.example/cfs",
  TIKTOK_CLIENT_KEY:"client_key",
  TIKTOK_CLIENT_SECRET:secret,
  TIKTOK_REDIRECT_URI:"https://cfs.example/auth/tiktok/callback",
  CFS_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,7).toString("base64"),
  CFS_CSRF_SIGNING_SECRET:secret+"_csrf_signing_secret",
  CFS_PUBLIC_REVIEW_HASH_SALT:secret+"_review_hmac_key",
  CFS_PUBLIC_SUPPORT_HASH_SALT:secret+"_support_hmac_key",
  CFS_MFA_RECOVERY_HASH_SALT:secret+"_mfa_recovery_hmac_key",
  CFS_ADMIN_ELEVATION_SECRET:secret+"_admin_elevation_signing_key",
  CFS_ADMIN_AUDIT_HMAC_SECRET:secret+"_admin_audit_hmac_key",
  CFS_ADMIN_EMAILS:"admin@example.com",
  CFS_LAUNCHER_BUILD_TARGET_VERSION:"0.41.0",
  CFS_RELEASE_EVIDENCE_VERSION:"0.41.0",
  CFS_LAUNCHER_RELEASE_REPO:"cstaudy/CFS-TikTok-Backend",
  CFS_STRIPE_SECRET_KEY:"sk_test_"+secret,
  CFS_STRIPE_WEBHOOK_SECRET:"whsec_"+secret,
  CFS_STRIPE_PRICE_CREATOR_MONTHLY:"price_creator",
  CFS_STRIPE_PRICE_PRO_MONTHLY:"price_pro",
  CFS_BILLING_GRACE_DAYS:"3",
  CFS_ALLOW_LEGACY_VERIFICATION_FLAGS:"false"
};
const runtime=runtimeDoctor(runtimeEnv);
if(!runtime.ready)throw new Error(JSON.stringify(runtime));
const serialized=JSON.stringify(runtime);
if(serialized.includes(secret)||serialized.includes("postgresql://user"))throw new Error("secret leaked into doctor report");

const missing=runtimeDoctor({...runtimeEnv,CFS_STRIPE_WEBHOOK_SECRET:""});
if(missing.ready||!missing.blocking.includes("CFS_STRIPE_WEBHOOK_SECRET"))throw new Error("missing stripe webhook not blocked");

const badLegacy=runtimeDoctor({...runtimeEnv,CFS_ALLOW_LEGACY_VERIFICATION_FLAGS:"true"});
if(badLegacy.ready||!badLegacy.blocking.includes("CFS_ALLOW_LEGACY_VERIFICATION_FLAGS"))throw new Error("legacy true accepted");

const mailRequired=runtimeDoctor({...runtimeEnv,CFS_EMAIL_VERIFICATION_REQUIRED:"true"});
if(mailRequired.ready||!mailRequired.blocking.includes("CFS_EMAIL_VERIFICATION_TRANSPORT"))throw new Error("email verification allowed without mail transport");
const mailReady=runtimeDoctor({...runtimeEnv,CFS_ACCOUNT_MAIL_MODE:"webhook",CFS_ACCOUNT_MAIL_WEBHOOK_URL:"https://mail.example/relay",CFS_ACCOUNT_MAIL_WEBHOOK_SECRET:secret+"_mail_hmac_key",CFS_EMAIL_VERIFICATION_REQUIRED:"true"});
if(!mailReady.ready)throw new Error("valid account mail transport rejected: "+JSON.stringify(mailReady));

const ghProd=githubProductionDoctor({RENDER_DEPLOY_HOOK_URL:"https://api.render.com/deploy/srv-xxx?key="+secret,CFS_PRODUCTION_URL:"https://cfs.example"});
if(!ghProd.ready||JSON.stringify(ghProd).includes(secret))throw new Error("github production doctor");

const ghWin=githubWindowsDoctor({CSC_LINK:"base64:"+secret,CSC_KEY_PASSWORD:secret});
if(!ghWin.ready||JSON.stringify(ghWin).includes(secret))throw new Error("github windows doctor");

console.log(JSON.stringify({ok:true,runtime:true,github_production:true,github_windows:true,secrets_redacted:true,legacy_safe:true,account_mail_fail_closed:true}));

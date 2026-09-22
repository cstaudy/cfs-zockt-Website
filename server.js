/**
 * ============================================================
 * cfs_zockt Creator Suite
 * Website Backend
 * Version 3.12.0
 * ============================================================
 */

"use strict";

const express = require("express");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { LauncherReleaseCatalog, buildPolicy: buildLauncherReleasePolicy } = require("./lib/launcher-release-policy");
const { validSessionId, canResumeSessionRow, releasePolicyAllowsLive, buildResumedLiveState } = require("./lib/live-session-recovery");
const { ACTION_LEASE_SECONDS, ACTION_RETRY_DELAY_SECONDS, ACTION_MAX_ATTEMPTS, ACTION_TTL_MINUTES, normalizeActionIds } = require("./lib/live-action-delivery");
const { SCENE_PROFILES, sanitizeSceneConfig, validateSceneOwnership, scenePublicToken, publicSceneRow } = require("./lib/creator-widget-scenes");
const { basePlanEntitlements, resolveCreatorEntitlements, minimumPlanForTemplate, templateAllowed, publicPlanCatalog } = require("./lib/creator-plan-policy");
const { releaseCandidateReadiness } = require("./lib/release-candidate-readiness");
const { sanitizeGameProfile, sanitizeScoreAction, initialGameState, gamePublicToken, publicGameRuntime, gameSceneSource } = require("./lib/creator-games");
const { CUT_FORMATS, sanitizeCutProject, sanitizeCutClip, publicCutProject, publicCutClip } = require("./lib/creator-cut-studio");
const { sanitizeGameRule, gameRuleMatches, gameRulePoints, publicGameRule, publicGameRuleHit } = require("./lib/creator-game-rules");
const { buildCutJobManifest, sanitizeCutJobResult, publicCutJob, canTransitionCutJob } = require("./lib/creator-cut-jobs");
const { profileSyncStatus, bridgeConnectionStatus, creatorReadiness } = require("./lib/creator-admin-health");
const { billingAccessState, effectivePlan: effectiveBillingPlan, stripeSubscriptionSnapshot, publicBillingSubscription, billingConfigState, eventSummary: billingEventSummary, shouldApplyStripeEvent, stripeSubscriptionIdFromInvoice } = require("./lib/creator-billing");
const { productionReleaseReadiness } = require("./lib/production-release-readiness");
const { EVIDENCE_KINDS, MANUAL_EVIDENCE_KINDS, AUTOMATED_EVIDENCE_KIND_SET, sanitizeProductionEvidence, publicProductionEvidence, verificationFlagsFromEvidence } = require("./lib/production-evidence");
const { evaluateLaunchGate } = require("./lib/launch-production-gate");
const { stripeTestmodeE2E } = require("./lib/stripe-testmode-evidence");
const { PROTOCOLS: RELEASE_ACCEPTANCE_PROTOCOLS, PROTOCOL_KEYS: RELEASE_ACCEPTANCE_KEYS, sanitizeAcceptance, publicAcceptance, latestAcceptances } = require("./lib/release-acceptance");
const { STAGES: BETA_COHORT_STAGES, sanitizeCohort, sanitizeMember, evaluateCohort, releaseCohortReadiness } = require("./lib/beta-cohort-operations");
const { goNoGoAssessment, sanitizeDecision } = require("./lib/release-go-no-go");
const { runtimeDoctor } = require("./lib/config-doctor");
const { databaseRuntimeSecurity } = require("./lib/database-runtime-security");
const { withDatabaseBootstrapLock } = require("./lib/database-bootstrap-lock");
const { DATABASE_SCHEMA_VERSION, DATABASE_SCHEMA_SLOT } = require("./lib/database-schema-contract");
const { canonicalAppOrigin, parseAllowedHosts, tiktokRedirectUri } = require("./lib/runtime-origin-security");
const { assertOutboundHttpsUrl, readResponseTextBounded } = require("./lib/outbound-http-security");
const { MAX_ASSET_COUNT, MAX_TOTAL_BYTES, MAX_UPLOAD_BYTES, CATEGORY_LABELS: WIDGET_ASSET_CATEGORY_LABELS, safeName: safeWidgetAssetName, safeLabel: safeWidgetAssetLabel, detectWidgetAsset, publicWidgetAsset, normalizeAssetCategory } = require("./lib/creator-widget-assets");
const { accountMailConfig, validateAccountMailConfig, createAccountActionToken, accountActionTokenHash, validAccountActionToken, normalizeMailMessage, sendAccountMail } = require("./lib/account-mail-security");
const { createTotpSecret, verifyTotp, createRecoveryCodes, recoveryCodeHash, otpauthUri } = require("./lib/account-mfa-security");
const { simpleWebAuthn, webauthnUserID, normalizePasskeyName, passkeyReference, validChallengeId } = require("./lib/account-passkey-security");
const { DEVICE_LINK_DELIVERY_LEGACY, DEVICE_LINK_DELIVERY_POLL_V2, normalizeCredentialDelivery, validDeviceSecret, normalizeDeviceCode, deriveBridgeToken, shouldDeliverPollCredential } = require("./lib/launcher-device-link-security");
const { monitorAlertConfig, validateMonitorAlertConfig, sendProductionMonitorAlert, evaluateProductionMonitor } = require("./lib/production-monitor-security");

const app = express();


// ============================================================
// KONFIGURATION
// ============================================================

const PORT =
    Number(
        process.env.PORT ||
        3000
    );

const NODE_ENV =
    process.env.NODE_ENV ||
    "production";

const APP_NAME =
    "CFS_Zockt Creator Suite";

const BACKEND_VERSION =
    "3.12.0";


const HTTP_MAX_HEADER_SIZE = 16 * 1024;
const HTTP_HEADERS_TIMEOUT_MS = 20 * 1000;
const HTTP_REQUEST_TIMEOUT_MS = 120 * 1000;
const HTTP_KEEP_ALIVE_TIMEOUT_MS = 10 * 1000;
const HTTP_MAX_REQUESTS_PER_SOCKET = 500;
const MAX_REQUEST_TARGET_LENGTH = 8 * 1024;
const SHUTDOWN_GRACE_MS = 25 * 1000;

let isShuttingDown = false;
let httpServer = null;


const DATABASE_URL =
    process.env.DATABASE_URL ||
    "";

const DATABASE_RUNTIME_SECURITY = DATABASE_URL
    ? databaseRuntimeSecurity({databaseUrl:DATABASE_URL,nodeEnv:NODE_ENV})
    : null;

const CLIENT_KEY =
    process.env.TIKTOK_CLIENT_KEY ||
    "";

const CLIENT_SECRET =
    process.env.TIKTOK_CLIENT_SECRET ||
    "";

const LAUNCHER_API_KEY =
    process.env.CFS_LAUNCHER_API_KEY ||
    "";

// Salt für datensparsame Missbrauchserkennung bei öffentlichen Rezensionen.
// Es werden keine rohen IP-Adressen in der Datenbank gespeichert.
const PUBLIC_REVIEW_HASH_SALT =
    String(
        process.env.CFS_PUBLIC_REVIEW_HASH_SALT ||
        (NODE_ENV === "development" ? "cfs-review-dev-hmac-key-change-me" : "")
    );

// Separater HMAC-Schlüssel für öffentliche Support-/Security-Meldungen.
// Auch hier werden keine rohen IP-Adressen persistiert. In Produktion
// gibt es bewusst keinen Fallback auf andere Secrets, damit Schlüssel
// nicht zwischen unabhängigen Schutzfunktionen wiederverwendet werden.
const PUBLIC_SUPPORT_HASH_SALT =
    String(
        process.env.CFS_PUBLIC_SUPPORT_HASH_SALT ||
        (NODE_ENV === "development" ? "cfs-support-dev-hmac-key-change-me" : "")
    );

// Separater HMAC-Schlüssel für MFA-Recovery-Codes. Die Codes selbst
// werden niemals im Klartext gespeichert.
const MFA_RECOVERY_HASH_SALT =
    String(
        process.env.CFS_MFA_RECOVERY_HASH_SALT ||
        (NODE_ENV === "development" ? "cfs-mfa-recovery-dev-hmac-key-change-me" : "")
    );

// Separates Signing-Secret für kurzlebige Admin-Step-up-Tokens.
// Dadurch kann eine gestohlene normale Creator-Session keine privilegierten
// Admin-Schreibaktionen ohne erneute Passwortbestätigung ausführen.
const ADMIN_ELEVATION_SECRET =
    String(
        process.env.CFS_ADMIN_ELEVATION_SECRET ||
        (NODE_ENV === "development" ? "cfs-admin-elevation-dev-signing-secret-change-me" : "")
    );

// Separates Signing-Secret für kurzlebige Creator-Step-up-Freigaben bei
// hochkritischen Account-Aktionen wie Export, Credential-Änderung und Löschung.
const ACCOUNT_ELEVATION_SECRET =
    String(
        process.env.CFS_ACCOUNT_ELEVATION_SECRET ||
        (NODE_ENV === "development" ? "cfs-account-elevation-dev-signing-secret-change-me" : "")
    );

// Separater HMAC-Schlüssel für die manipulationssichtbare Admin-Audit-Kette.
// Neue Audit-Ereignisse werden verkettet signiert; das Secret liegt ausschließlich
// in der Runtime-Konfiguration und niemals in der Datenbank.
const ADMIN_AUDIT_HMAC_SECRET =
    String(
        process.env.CFS_ADMIN_AUDIT_HMAC_SECRET ||
        (NODE_ENV === "development" ? "cfs-admin-audit-dev-hmac-secret-change-me" : "")
    );

const RAW_APP_BASE_URL =
    process.env.APP_BASE_URL ||
    "https://cfs-zockt.de";

const APP_BASE_SECURITY = canonicalAppOrigin(RAW_APP_BASE_URL,NODE_ENV);
const APP_BASE = APP_BASE_SECURITY.url;
const APP_BASE_URL = APP_BASE_SECURITY.origin;
const APP_CANONICAL_ORIGIN = APP_BASE_SECURITY.origin;
const APP_CANONICAL_HOSTNAME = APP_BASE.hostname.toLowerCase();
const APP_CANONICAL_WWW_ALIAS = APP_CANONICAL_HOSTNAME.startsWith("www.")
    ? APP_CANONICAL_HOSTNAME.slice(4)
    : `www.${APP_CANONICAL_HOSTNAME}`;

const RENDER_EXTERNAL_HOSTNAME = String(process.env.RENDER_EXTERNAL_HOSTNAME || "")
    .trim()
    .toLowerCase();

const EXTRA_ALLOWED_HOSTS = parseAllowedHosts(process.env.CFS_ALLOWED_HOSTS || "");

const HSTS_INCLUDE_SUBDOMAINS =
    String(process.env.CFS_HSTS_INCLUDE_SUBDOMAINS || "false").trim().toLowerCase() === "true";

const HSTS_PRELOAD =
    String(process.env.CFS_HSTS_PRELOAD || "false").trim().toLowerCase() === "true";

const CSRF_SIGNING_SECRET = String(
    process.env.CFS_CSRF_SIGNING_SECRET ||
    (NODE_ENV === "development" ? "cfs-csrf-dev-signing-secret-change-me" : "")
);

const CREATOR_CSRF_COOKIE =
    NODE_ENV === "development"
        ? "cfs_csrf_dev"
        : "__Host-cfs_csrf";

const ACCOUNT_MAIL_CONFIG =
    accountMailConfig(
        process.env,
        NODE_ENV
    );

const ACCOUNT_MAIL_OUTBOX_MAX_ATTEMPTS = 6;
const ACCOUNT_MAIL_OUTBOX_POLL_MS = 5 * 1000;
const ACCOUNT_MAIL_OUTBOX_LOCK_MS = 2 * 60 * 1000;
const ACCOUNT_MAIL_OUTBOX_BATCH = 8;
const ACCOUNT_MAIL_OUTBOX_METADATA_RETENTION_DAYS = 30;

const PRODUCTION_MONITOR_CONFIG = monitorAlertConfig(process.env, NODE_ENV);
const PRODUCTION_MONITOR_RETENTION_DAYS = 90;
const PRODUCTION_MONITOR_MAX_ALERTS = 100;


// WebAuthn / Passkeys: in Produktion an die kanonische Domain gebunden.
// In Development werden localhost/127.0.0.1 als erwartete Origins zugelassen.
const PASSKEY_RP_ID = String(
    process.env.CFS_WEBAUTHN_RP_ID ||
    (NODE_ENV === "development" ? "localhost" : APP_CANONICAL_HOSTNAME)
).trim().toLowerCase();

const PASSKEY_EXPECTED_ORIGINS = Object.freeze(
    NODE_ENV === "development"
        ? Array.from(new Set([APP_CANONICAL_ORIGIN, `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]))
        : [APP_CANONICAL_ORIGIN]
);


// ============================================================
// BILLING V37 · STRIPE HOSTED CHECKOUT / CUSTOMER PORTAL
// Medien und Creator-Inhalte bleiben davon vollständig getrennt.
// ============================================================

const STRIPE_SECRET_KEY = String(process.env.CFS_STRIPE_SECRET_KEY || "").trim();
const STRIPE_WEBHOOK_SECRET = String(process.env.CFS_STRIPE_WEBHOOK_SECRET || "").trim();
function stripeSecretMode(value) {
    const key=String(value||"").trim();
    if (/^(?:sk|rk)_live_/i.test(key)) return "live";
    if (/^(?:sk|rk)_test_/i.test(key)) return "test";
    return key ? "unknown" : "disabled";
}
const STRIPE_SECRET_MODE = stripeSecretMode(STRIPE_SECRET_KEY);
const STRIPE_PRICE_CREATOR_MONTHLY = String(process.env.CFS_STRIPE_PRICE_CREATOR_MONTHLY || "").trim();
const STRIPE_PRICE_PRO_MONTHLY = String(process.env.CFS_STRIPE_PRICE_PRO_MONTHLY || "").trim();
const BILLING_LIVE_REQUIRED = String(process.env.CFS_BILLING_LIVE_REQUIRED || "false").trim().toLowerCase() === "true";
const BILLING_GRACE_DAYS = Math.max(0,Math.min(30,Math.round(Number(process.env.CFS_BILLING_GRACE_DAYS || 3))));
const BILLING_PRICE_PLAN = Object.freeze({
    ...(STRIPE_PRICE_CREATOR_MONTHLY ? {[STRIPE_PRICE_CREATOR_MONTHLY]:"creator"} : {}),
    ...(STRIPE_PRICE_PRO_MONTHLY ? {[STRIPE_PRICE_PRO_MONTHLY]:"pro"} : {})
});
const BILLING_PLAN_PRICE = Object.freeze({creator:STRIPE_PRICE_CREATOR_MONTHLY,pro:STRIPE_PRICE_PRO_MONTHLY});
const BILLING_CONFIG = billingConfigState({secretKey:STRIPE_SECRET_KEY,webhookSecret:STRIPE_WEBHOOK_SECRET,creatorPriceId:STRIPE_PRICE_CREATOR_MONTHLY,proPriceId:STRIPE_PRICE_PRO_MONTHLY,graceDays:BILLING_GRACE_DAYS,mode:STRIPE_SECRET_MODE,liveRequired:BILLING_LIVE_REQUIRED});
const ALLOW_LEGACY_PRODUCTION_FLAGS =
    String(process.env.CFS_ALLOW_LEGACY_VERIFICATION_FLAGS || "false").trim().toLowerCase() === "true";
const PRODUCTION_VERIFICATION_FLAGS = Object.freeze(ALLOW_LEGACY_PRODUCTION_FLAGS ? {
    windows_build_verified:process.env.CFS_WINDOWS_BUILD_VERIFIED,
    code_signing_verified:process.env.CFS_CODE_SIGNING_VERIFIED,
    clean_install_verified:process.env.CFS_WINDOWS_CLEAN_INSTALL_VERIFIED,
    updater_e2e_verified:process.env.CFS_UPDATER_E2E_VERIFIED,
    obs_field_verified:process.env.CFS_OBS_FIELD_VERIFIED,
    tiktok_live_field_verified:process.env.CFS_TIKTOK_LIVE_FIELD_VERIFIED,
    billing_live_verified:process.env.CFS_BILLING_LIVE_VERIFIED,
    two_creators_verified:process.env.CFS_TWO_CREATORS_VERIFIED,
    canary_verified:process.env.CFS_CANARY_VERIFIED,
    rollback_verified:process.env.CFS_ROLLBACK_VERIFIED
} : {});
const PRODUCTION_EVIDENCE_RELEASE_VERSION = String(process.env.CFS_RELEASE_EVIDENCE_VERSION || "0.42.0").trim();


let stripeClientCache=null;
function stripeClient(){
    if(!STRIPE_SECRET_KEY){const error=new Error("Stripe Billing ist auf diesem Server nicht konfiguriert.");error.code="billing_not_configured";throw error;}
    if(!stripeClientCache){const Stripe=require("stripe");stripeClientCache=new Stripe(STRIPE_SECRET_KEY);}
    return stripeClientCache;
}

const REDIRECT_URI = tiktokRedirectUri(
    process.env.TIKTOK_REDIRECT_URI || `${APP_BASE_URL}/auth/tiktok/callback`,
    APP_CANONICAL_ORIGIN,
    NODE_ENV
);

const DEFAULT_CREATOR_ID =
    "default";

const ALLOW_PUBLIC_TIKTOK_CONNECT =
    String(
        process.env.ALLOW_PUBLIC_TIKTOK_CONNECT ||
        "false"
    )
        .trim()
        .toLowerCase() === "true";

const TIKTOK_CONNECT_CODE =
    String(
        process.env.CFS_TIKTOK_CONNECT_CODE ||
        ""
    ).trim();

const LAUNCHER_RELEASE_REPO =
    String(
        process.env.CFS_LAUNCHER_RELEASE_REPO ||
        "cstaudy/CFS-TikTok-Backend"
    ).trim();

const LAUNCHER_RELEASE_GITHUB_TOKEN =
    String(
        process.env.CFS_GITHUB_RELEASE_TOKEN ||
        ""
    ).trim();

const LAUNCHER_MIN_STABLE_VERSION =
    String(
        process.env.CFS_LAUNCHER_MIN_STABLE_VERSION ||
        "0.15.0"
    ).trim();

const LAUNCHER_MIN_BETA_VERSION =
    String(
        process.env.CFS_LAUNCHER_MIN_BETA_VERSION ||
        LAUNCHER_MIN_STABLE_VERSION
    ).trim();

const LAUNCHER_BUILD_TARGET_VERSION =
    String(
        process.env.CFS_LAUNCHER_BUILD_TARGET_VERSION ||
        "0.42.0"
    ).trim();

const LAUNCHER_BLOCKED_VERSIONS =
    String(process.env.CFS_LAUNCHER_BLOCKED_VERSIONS || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);

const LAUNCHER_MAINTENANCE_MODE =
    String(process.env.CFS_LAUNCHER_MAINTENANCE_MODE || "false")
        .trim()
        .toLowerCase() === "true";

const LAUNCHER_MAINTENANCE_MESSAGE =
    String(process.env.CFS_LAUNCHER_MAINTENANCE_MESSAGE || "").trim();

const LAUNCHER_STABLE_ROLLOUT_PERCENT =
    Math.max(0, Math.min(100, Number(process.env.CFS_LAUNCHER_STABLE_ROLLOUT_PERCENT || 100)));

const LAUNCHER_BETA_ROLLOUT_PERCENT =
    Math.max(0, Math.min(100, Number(process.env.CFS_LAUNCHER_BETA_ROLLOUT_PERCENT || 100)));

const LAUNCHER_PIN_STABLE_VERSION =
    String(process.env.CFS_LAUNCHER_PIN_STABLE_VERSION || "").trim();

const LAUNCHER_PIN_BETA_VERSION =
    String(process.env.CFS_LAUNCHER_PIN_BETA_VERSION || "").trim();

const LAUNCHER_SAFETY_REVISION =
    String(process.env.CFS_LAUNCHER_SAFETY_REVISION || "v21-default").trim();

const CFS_ADMIN_CREATOR_IDS = new Set(
    String(process.env.CFS_ADMIN_CREATOR_IDS || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
);

const CFS_ADMIN_EMAILS = new Set(
    String(process.env.CFS_ADMIN_EMAILS || "")
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean)
);

const LAUNCHER_RELEASE_CACHE_TTL_MS =
    Math.max(
        60 * 1000,
        Number(
            process.env.CFS_LAUNCHER_RELEASE_CACHE_TTL_MS ||
            10 * 60 * 1000
        )
    );

const launcherReleaseCatalog =
    new LauncherReleaseCatalog({
        repo:
            LAUNCHER_RELEASE_REPO,

        token:
            LAUNCHER_RELEASE_GITHUB_TOKEN,

        cacheTtlMs:
            LAUNCHER_RELEASE_CACHE_TTL_MS,

        logger:
            console
    });


// ============================================================
// TIKTOK KONFIGURATION
// ============================================================

const TIKTOK_AUTHORIZE_URL =
    "https://www.tiktok.com/v2/auth/authorize/";

const TIKTOK_TOKEN_URL =
    "https://open.tiktokapis.com/v2/oauth/token/";

const TIKTOK_REVOKE_URL =
    "https://open.tiktokapis.com/v2/oauth/revoke/";

const TIKTOK_USER_INFO_URL =
    "https://open.tiktokapis.com/v2/user/info/";

const REQUESTED_SCOPES = [
    "user.info.basic",
    "user.info.stats"
];

const OAUTH_TTL_MS =
    10 * 60 * 1000;

const ACCESS_TOKEN_SAFETY_WINDOW_MS =
    5 * 60 * 1000;

const TIKTOK_TIMEOUT_MS =
    15000;


// ============================================================
// CREATOR ACCOUNT
// ============================================================

const LEGACY_CREATOR_SESSION_COOKIE =
    "cfs_creator_session";

const CREATOR_SESSION_COOKIE =
    NODE_ENV === "development"
        ? "cfs_creator_session_dev"
        : "__Host-cfs_creator_session";

const ADMIN_ELEVATION_COOKIE =
    NODE_ENV === "development"
        ? "cfs_admin_elevation_dev"
        : "__Host-cfs_admin_elevation";

const ACCOUNT_ELEVATION_COOKIE =
    NODE_ENV === "development"
        ? "cfs_account_elevation_dev"
        : "__Host-cfs_account_elevation";

const ACCOUNT_ELEVATION_PENDING_COOKIE =
    NODE_ENV === "development"
        ? "cfs_account_elevation_pending_dev"
        : "__Host-cfs_account_elevation_pending";

const TIKTOK_STATE_COOKIE =
    NODE_ENV === "development"
        ? "cfs_tiktok_state_dev"
        : "__Secure-cfs_tiktok_state";

const CREATOR_SESSION_TTL_MS =
    30 * 24 * 60 * 60 * 1000;

// Absolute Laufzeit bleibt 30 Tage, zusätzlich läuft eine Session nach
// längerer Inaktivität aus. last_seen_at wird nur periodisch aktualisiert,
// damit normale API-Nutzung nicht bei jedem Request einen DB-Write erzeugt.
const CREATOR_SESSION_IDLE_TTL_MS =
    14 * 24 * 60 * 60 * 1000;

const CREATOR_SESSION_TOUCH_INTERVAL_MS =
    5 * 60 * 1000;

const CREATOR_MAX_SESSIONS =
    8;

const PASSWORD_MIN_LENGTH =
    15;

const PASSWORD_MAX_LENGTH =
    128;

const LOGIN_RATE_WINDOW_MS =
    15 * 60 * 1000;

const LOGIN_RATE_MAX =
    10;

const LOGIN_IP_RATE_MAX =
    60;

const ACCOUNT_LOGIN_FAILURE_WINDOW_MS =
    15 * 60 * 1000;

const ACCOUNT_LOGIN_FAILURE_MAX =
    20;

const ACCOUNT_LOGIN_BLOCK_MS =
    15 * 60 * 1000;

const REGISTER_RATE_WINDOW_MS =
    60 * 60 * 1000;

const REGISTER_RATE_MAX =
    5;

const ACCOUNT_EXPORT_RATE_WINDOW_MS =
    60 * 60 * 1000;

const ACCOUNT_EXPORT_RATE_MAX =
    5;

// Authentifizierte Creator-Schreibzugriffe: Defense-in-depth gegen
// versehentliche Request-Loops und Missbrauch. Autosave bleibt mit
// großzügigem Burst-Limit problemlos möglich.
const CREATOR_WRITE_RATE_WINDOW_MS =
    60 * 1000;

const CREATOR_WRITE_RATE_MAX =
    300;

const CREATOR_ASSET_UPLOAD_RATE_WINDOW_MS =
    5 * 60 * 1000;

const CREATOR_ASSET_UPLOAD_RATE_MAX =
    30;

const PASSWORD_CHANGE_RATE_WINDOW_MS =
    60 * 60 * 1000;

const PASSWORD_CHANGE_RATE_MAX =
    5;

const ADMIN_ELEVATION_TTL_MS =
    10 * 60 * 1000;

const ADMIN_ELEVATION_RATE_WINDOW_MS =
    15 * 60 * 1000;

const ADMIN_ELEVATION_RATE_MAX =
    5;

const ADMIN_SENSITIVE_READ_RATE_WINDOW_MS =
    5 * 60 * 1000;

const ADMIN_SENSITIVE_READ_RATE_MAX =
    120;

const ACCOUNT_ELEVATION_TTL_MS =
    10 * 60 * 1000;

const ACCOUNT_ELEVATION_PENDING_TTL_MS =
    5 * 60 * 1000;

const ACCOUNT_ELEVATION_RATE_WINDOW_MS =
    15 * 60 * 1000;

const ACCOUNT_ELEVATION_RATE_MAX =
    8;

const ADMIN_AUDIT_RETENTION_DAYS =
    180;

const ADMIN_AUDIT_CHAIN_VERSION = 1;
const ADMIN_AUDIT_ROOT_HASH = "0".repeat(64);
const ADMIN_AUDIT_LOCK_ID = 72160017;

const ACCOUNT_EMAIL_ACTION_RATE_WINDOW_MS =
    60 * 60 * 1000;

const ACCOUNT_EMAIL_ACTION_RATE_MAX =
    5;

const PASSWORD_RESET_RATE_WINDOW_MS =
    60 * 60 * 1000;

const PASSWORD_RESET_RATE_MAX =
    5;

const EMAIL_VERIFICATION_TOKEN_TTL_MS =
    8 * 60 * 60 * 1000;

const PASSWORD_RESET_TOKEN_TTL_MS =
    30 * 60 * 1000;

const MFA_CHALLENGE_TTL_MS =
    5 * 60 * 1000;

const MFA_VERIFY_RATE_WINDOW_MS =
    15 * 60 * 1000;

const MFA_VERIFY_RATE_MAX =
    8;

const MFA_RECOVERY_CODE_COUNT =
    10;


const PASSKEY_CHALLENGE_TTL_MS =
    5 * 60 * 1000;

const PASSKEY_MAX_PER_ACCOUNT =
    8;

const PASSKEY_RATE_WINDOW_MS =
    15 * 60 * 1000;

const PASSKEY_RATE_MAX =
    12;

const MFA_CHALLENGE_COOKIE =
    NODE_ENV === "development"
        ? "cfs_mfa_challenge_dev"
        : "__Host-cfs_mfa_challenge";

const PASSWORD_KDF_VERSION =
    2;

const SCRYPT_V2_OPTIONS =
    Object.freeze({
        N: 2 ** 15,
        r: 8,
        p: 3,
        maxmem: 64 * 1024 * 1024
    });

// Öffentliche Website-Rezensionen (Merch-Planung)
const PUBLIC_REVIEW_RATE_WINDOW_MS =
    60 * 60 * 1000;

const PUBLIC_REVIEW_RATE_MAX =
    12;

const PUBLIC_REVIEW_READ_RATE_WINDOW_MS =
    60 * 1000;

const PUBLIC_REVIEW_READ_RATE_MAX =
    120;

// Öffentliche Support-/Security-Meldungen: bewusst deutlich enger als Reviews.
const PUBLIC_SUPPORT_RATE_WINDOW_MS =
    60 * 60 * 1000;

const PUBLIC_SUPPORT_RATE_MAX =
    5;

const TIKTOK_CONNECT_RATE_WINDOW_MS =
    15 * 60 * 1000;

const TIKTOK_CONNECT_RATE_MAX =
    10;

const ACCOUNT_DELETE_RATE_WINDOW_MS =
    15 * 60 * 1000;

const ACCOUNT_DELETE_RATE_MAX =
    5;

const SECURITY_EVENT_RETENTION_DAYS =
    180;

const SECURITY_ALERT_COOLDOWN_MS =
    6 * 60 * 60 * 1000;


const WIDGET_SOURCE_KEY_BYTES =
    24;

const WIDGET_TIKTOK_REFRESH_MS =
    60 * 1000;

const WIDGET_READ_RATE_WINDOW_MS =
    60 * 1000;

const WIDGET_READ_RATE_MAX =
    180;

const PUBLIC_RUNTIME_IP_RATE_WINDOW_MS =
    60 * 1000;

const PUBLIC_RUNTIME_IP_RATE_MAX =
    1200;

// Widget Studio V6 - Launcher Bridge transport
const WIDGET_BRIDGE_TOKEN_BYTES =
    32;

const WIDGET_BRIDGE_HEARTBEAT_STALE_MS =
    30 * 1000;

const WIDGET_BRIDGE_HEARTBEAT_RATE_WINDOW_MS =
    60 * 1000;

const WIDGET_BRIDGE_HEARTBEAT_RATE_MAX =
    120;

const WIDGET_BRIDGE_EVENT_RATE_WINDOW_MS =
    60 * 1000;

const WIDGET_BRIDGE_EVENT_RATE_MAX =
    360;

const WIDGET_BRIDGE_MAX_BATCH =
    50;

const FOLLOWER_WIDGET_MAX_GOAL =
    100000000;


// ============================================================
// EXPRESS
// ============================================================

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);

app.set(
    "query parser",
    "simple"
);

// Dynamische Antworten erhalten keine automatisch erzeugten Express-ETags.
// Statische Dateien setzen ihr eigenes ETag weiterhin explizit.
app.set("etag", false);

// ============================================================
// REQUEST CORRELATION · PUBLIC RESILIENCE PASS 15
//
// Jede Anfrage erhält eine serverseitig erzeugte Referenz. Eingehende
// Request-IDs werden absichtlich nicht übernommen, damit Logs und
// Fehlerreferenzen nicht von außen vorgegeben werden können.
// ============================================================

app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-ID", req.requestId);
    next();
});

// ============================================================
// TRANSPORT / HOST HARDENING · WEBSITE SECURITY PASS 1B
//
// Render terminiert TLS am Edge und reicht die Anfrage intern
// an Express weiter. Durch trust proxy=1 wertet req.secure den
// vertrauenswürdigen X-Forwarded-Proto-Wert des letzten Hops aus.
// Unbekannte Host-Header werden verworfen; www/non-www wird nur
// für sichere Methoden auf die konfigurierte APP_BASE_URL gelenkt.
// ============================================================

const ALLOWED_REQUEST_HOSTS = new Set(
    [
        APP_CANONICAL_HOSTNAME,
        APP_CANONICAL_WWW_ALIAS,
        RENDER_EXTERNAL_HOSTNAME,
        ...EXTRA_ALLOWED_HOSTS,
        ...(NODE_ENV === "development" ? ["localhost", "127.0.0.1"] : [])
    ].filter(Boolean)
);

function requestHostname(req) {
    const rawHost = String(req.get("Host") || "").trim();

    if (
        !rawHost ||
        rawHost.length > 255 ||
        !/^[A-Za-z0-9.\-:\[\]]+$/.test(rawHost)
    ) {
        return "";
    }

    try {
        return new URL(`http://${rawHost}`).hostname
            .toLowerCase()
            .replace(/\.$/, "");
    }
    catch {
        return "";
    }
}

function canonicalRequestUrl(req) {
    const pathAndQuery = String(req.originalUrl || req.url || "/");
    return `${APP_CANONICAL_ORIGIN}${pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`}`;
}

function isSafeHttpMethod(method) {
    return ["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
}

function transportSecurityError(req, res, status, message) {
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
        return res.status(status).json({ok:false,error:message});
    }

    return res.status(status).type("text/plain; charset=utf-8").send(message);
}

app.use((req,res,next)=>{
    if (String(req.originalUrl || req.url || "").length <= MAX_REQUEST_TARGET_LENGTH) return next();
    res.setHeader("Cache-Control","no-store");
    return transportSecurityError(req,res,414,"Anfrage-URL ist zu lang.");
});

app.use((req, res, next) => {
    if (NODE_ENV !== "production") {
        return next();
    }

    const hostname = requestHostname(req);

    if (!hostname || !ALLOWED_REQUEST_HOSTS.has(hostname)) {
        return transportSecurityError(
            req,
            res,
            421,
            "Ungültiger Host für diese Anwendung."
        );
    }

    if (!req.secure) {
        if (isSafeHttpMethod(req.method)) {
            return res.redirect(308, canonicalRequestUrl(req));
        }

        return transportSecurityError(
            req,
            res,
            400,
            "Diese Anfrage ist ausschließlich über HTTPS erlaubt."
        );
    }

    if (hostname === APP_CANONICAL_WWW_ALIAS && hostname !== APP_CANONICAL_HOSTNAME) {
        if (isSafeHttpMethod(req.method)) {
            return res.redirect(308, canonicalRequestUrl(req));
        }

        return transportSecurityError(
            req,
            res,
            421,
            "Schreibzugriffe sind nur über die kanonische Domain erlaubt."
        );
    }

    // Die Render-Servicedomain bleibt für Health/Operations erreichbar,
    // soll aber keine zweite indexierbare Website-Adresse werden.
    if (
        RENDER_EXTERNAL_HOSTNAME &&
        hostname === RENDER_EXTERNAL_HOSTNAME &&
        hostname !== APP_CANONICAL_HOSTNAME
    ) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

        // Browserseiten werden auf die Marken-Domain gelenkt. API-/Health-
        // Zugriffe bleiben auf der Render-Servicedomain für Operations möglich.
        if (
            isSafeHttpMethod(req.method) &&
            !req.path.startsWith("/api/") &&
            req.accepts("html")
        ) {
            return res.redirect(308, canonicalRequestUrl(req));
        }
    }

    return next();
});

// Stripe verlangt für die Signaturprüfung den unveränderten Raw Body.
// Diese Route muss deshalb vor express.json() registriert werden.
app.post(
    "/api/billing/stripe/webhook",
    express.raw({type:"application/json",limit:"512kb"}),
    stripeBillingWebhook
);

app.use(
    express.json({
        limit:
            "256kb"
    })
);

app.use(
    express.urlencoded({
        extended:
            false,

        limit:
            "256kb",

        parameterLimit:
            100
    })
);


// ============================================================
// SECURITY HEADERS · WEBSITE SECURITY PASS 1A
//
// Die Creator Suite bettet eigene Widget-URLs im Scene Studio ein.
// Deshalb erlauben frame-ancestors/X-Frame-Options ausschließlich
// Same-Origin-Framing statt global DENY zu setzen.
// ============================================================

const CONTENT_SECURITY_POLICY =
    [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "frame-src 'self'",
        "form-action 'self'",
        "script-src 'self' 'sha256-YC+uEv6thSIMs8ZynolGqktWIjDONXc43N4IcYq/mOQ='",
        "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "report-uri /api/public/security/csp-report",
        "report-to cfs-csp",
        ...(NODE_ENV !== "development" ? ["upgrade-insecure-requests"] : [])
    ]
        .join("; ");

app.use(
    (
        req,
        res,
        next
    ) => {

        res.setHeader(
            "Reporting-Endpoints",
            `cfs-csp="${APP_CANONICAL_ORIGIN}/api/public/security/csp-report"`
        );

        res.setHeader(
            "Content-Security-Policy",
            CONTENT_SECURITY_POLICY
        );

        res.setHeader(
            "X-Content-Type-Options",
            "nosniff"
        );

        res.setHeader(
            "X-XSS-Protection",
            "0"
        );

        res.setHeader(
            "X-Frame-Options",
            "SAMEORIGIN"
        );

        res.setHeader(
            "Referrer-Policy",
            "strict-origin-when-cross-origin"
        );

        res.setHeader(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        );

        res.setHeader(
            "Cross-Origin-Opener-Policy",
            "same-origin"
        );

        res.setHeader(
            "X-Permitted-Cross-Domain-Policies",
            "none"
        );

        res.setHeader(
            "Origin-Agent-Cluster",
            "?1"
        );

        if (
            req.path.startsWith("/api/") ||
            req.path.startsWith("/auth/") ||
            req.path.startsWith("/widgets/") ||
            req.path.startsWith("/games/")
        ) {
            res.setHeader(
                "X-Robots-Tag",
                "noindex, nofollow, noarchive"
            );
        }

        if (
            req.path.startsWith("/api/widgets/") ||
            req.path.startsWith("/api/games/") ||
            req.path.startsWith("/widget-assets/")
        ) {
            res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        }

        if (
            NODE_ENV ===
            "production"
        ) {

            const hsts = [
                "max-age=31536000",
                ...(HSTS_INCLUDE_SUBDOMAINS ? ["includeSubDomains"] : []),
                ...(HSTS_INCLUDE_SUBDOMAINS && HSTS_PRELOAD ? ["preload"] : [])
            ].join("; ");

            res.setHeader(
                "Strict-Transport-Security",
                hsts
            );

        }

        next();

    }
);


// ============================================================
// SENSITIVE RESPONSE CACHE POLICY · SECURITY PASS 10
//
// Account-, Admin-, Auth-, Billing-, Launcher- und Bridge-Antworten
// dürfen weder Browser- noch Shared-Caches wiederverwenden. Das schützt
// Session-/Security-Metadaten auch dann, wenn ein Reverse Proxy oder CDN
// später vor die Anwendung geschaltet wird.
// ============================================================

const SENSITIVE_RESPONSE_PREFIXES = [
    "/api/account/",
    "/api/creator/",
    "/api/admin/",
    "/api/billing/",
    "/api/launcher/",
    "/api/bridge/",
    "/auth/"
];

app.use((req, res, next) => {
    const sensitive = SENSITIVE_RESPONSE_PREFIXES.some(prefix =>
        String(req.path || "").startsWith(prefix)
    );

    if (sensitive) {
        res.setHeader("Cache-Control", "no-store, private, max-age=0");
        res.setHeader("CDN-Cache-Control", "no-store");
        res.setHeader("Surrogate-Control", "no-store");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.vary("Cookie");
        res.vary("Authorization");
    }

    next();
});

// ============================================================
// WEBSITE INCIDENT / WRITE FREEZE · PASS 20
//
// Der Notfallmodus hält die öffentliche Website und Support erreichbar,
// kann aber risikoreiche Browser-Schreibwege zentral einfrieren. Admin,
// Health, Security-Reporting und Stripe-Webhooks bleiben bewusst erreichbar.
// ============================================================

const INCIDENT_MODES = new Set(["normal","degraded","maintenance","security_lockdown"]);
const INCIDENT_FREEZE_MODES = new Set(["maintenance","security_lockdown"]);
const INCIDENT_PUBLIC_MESSAGE_MAX = 240;

function incidentPublicMessage(value) {
    return String(value || "").replace(/[\r\n\t]+/g," ").replace(/\s{2,}/g," ").trim().slice(0,INCIDENT_PUBLIC_MESSAGE_MAX);
}

async function getWebsiteIncidentState() {
    const result=await pool.query(`SELECT mode,public_message,started_at,updated_at,updated_by FROM creator_incident_state WHERE slot='website' LIMIT 1`);
    const row=result.rows[0]||{};
    const mode=INCIDENT_MODES.has(String(row.mode||""))?String(row.mode):"normal";
    return {
        mode,
        public_message:incidentPublicMessage(row.public_message),
        started_at:row.started_at||null,
        updated_at:row.updated_at||null,
        updated_by:String(row.updated_by||"")
    };
}

function incidentWriteExempt(req) {
    const path=String(req.path||"");
    if(path.startsWith("/api/admin/"))return true;
    if(path==="/api/health"||path==="/api/public/status")return true;
    if(path==="/api/public/security/csp-report"||path==="/api/public/support/report")return true;
    if(path==="/api/billing/stripe/webhook")return true;
    if(path==="/api/account/login"||path==="/api/account/logout")return true;
    return false;
}

function incidentProtectedWrite(req) {
    const path=String(req.path||"");
    if(path.startsWith("/auth/tiktok"))return true;
    if(isSafeHttpMethod(req.method))return false;
    return path.startsWith("/api/account/") ||
        path.startsWith("/api/creator/") ||
        path.startsWith("/api/billing/") ||
        path.startsWith("/api/public/reviews/");
}

app.use(async(req,res,next)=>{
    try{
        if(incidentWriteExempt(req)||!incidentProtectedWrite(req))return next();
        const incident=await getWebsiteIncidentState();
        if(!INCIDENT_FREEZE_MODES.has(incident.mode))return next();
        res.setHeader("Retry-After","300");
        const message=incident.public_message || (incident.mode==="security_lockdown"
            ? "Schreibzugriffe sind vorübergehend aus Sicherheitsgründen pausiert."
            : "Schreibzugriffe sind während der Wartung vorübergehend pausiert.");
        if(req.path.startsWith("/api/")||req.path.startsWith("/auth/")){
            return res.status(503).json({ok:false,code:"incident_write_freeze",status:incident.mode,error:message,reference:req.requestId||null});
        }
        return res.status(503).type("text/plain; charset=utf-8").send(message);
    }catch(error){
        safeLogError("Incident Write Freeze Fehler:",error);
        return res.status(503).json({ok:false,code:"incident_state_unavailable",error:"Schreibzugriffe sind vorübergehend nicht verfügbar.",reference:req.requestId||null});
    }
});

// ============================================================
// RATE LIMITING
//
// Bewusst ohne zusätzliche npm-Abhängigkeit.
// Bei späterem Multi-Instance-Betrieb auf Redis/DB-basierten
// Rate Limiter umstellen.
// ============================================================

const RATE_LIMITER_MAX_KEYS = 50000;

function requestIp(
    req
) {

    return String(
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown"
    );

}


function createRateLimiter({
    windowMs,
    max,
    keyGenerator,
    message
}) {

    const store =
        new Map();

    const cleanupTimer =
        setInterval(
            () => {

                const now =
                    Date.now();

                for (
                    const [
                        key,
                        value
                    ]
                    of store
                ) {

                    if (
                        value.resetAt <=
                        now
                    ) {

                        store.delete(
                            key
                        );

                    }

                }

            },
            Math.max(
                windowMs,
                60 * 1000
            )
        );

    cleanupTimer.unref?.();

    return (
        req,
        res,
        next
    ) => {

        const now =
            Date.now();

        const key =
            String(
                keyGenerator?.(
                    req
                ) ||
                requestIp(
                    req
                )
            ).slice(0, 512);

        let entry =
            store.get(
                key
            );

        if (
            !entry &&
            store.size >= RATE_LIMITER_MAX_KEYS
        ) {
            let evictionKey = null;
            let earliestReset = Infinity;

            for (const [candidateKey, candidate] of store) {
                if (candidate.resetAt <= now) {
                    evictionKey = candidateKey;
                    break;
                }
                if (candidate.resetAt < earliestReset) {
                    earliestReset = candidate.resetAt;
                    evictionKey = candidateKey;
                }
            }

            if (evictionKey !== null) {
                store.delete(evictionKey);
            }
        }

        if (
            !entry ||
            entry.resetAt <=
                now
        ) {

            entry = {
                count:
                    0,
                resetAt:
                    now +
                    windowMs
            };

        }

        entry.count +=
            1;

        store.set(
            key,
            entry
        );

        const remaining =
            Math.max(
                0,
                max -
                entry.count
            );

        res.setHeader(
            "X-RateLimit-Limit",
            String(
                max
            )
        );

        res.setHeader(
            "X-RateLimit-Remaining",
            String(
                remaining
            )
        );

        res.setHeader(
            "X-RateLimit-Reset",
            String(
                Math.ceil(
                    entry.resetAt /
                    1000
                )
            )
        );

        if (
            entry.count >
            max
        ) {

            const retryAfter =
                Math.max(
                    1,
                    Math.ceil(
                        (
                            entry.resetAt -
                            now
                        ) /
                        1000
                    )
                );

            res.setHeader(
                "Retry-After",
                String(
                    retryAfter
                )
            );

            return res
                .status(429)
                .json({

                    ok:
                        false,

                    error:
                        message ||
                        "Zu viele Anfragen. Bitte versuche es später erneut."

                });

        }

        next();

    };

}


const accountLoginIpLimiter =
    createRateLimiter({

        windowMs:
            LOGIN_RATE_WINDOW_MS,

        max:
            LOGIN_IP_RATE_MAX,

        keyGenerator:
            req =>
                requestIp(
                    req
                ),

        message:
            "Zu viele Anmeldeversuche von dieser Verbindung. Bitte warte einige Minuten."

    });


const accountLoginLimiter =
    createRateLimiter({

        windowMs:
            LOGIN_RATE_WINDOW_MS,

        max:
            LOGIN_RATE_MAX,

        keyGenerator:
            req =>
                (
                    requestIp(
                        req
                    ) +
                    "|" +
                    String(
                        req.body?.email ||
                        ""
                    )
                        .trim()
                        .toLowerCase()
                        .slice(
                            0,
                            254
                        )
                ),

        message:
            "Zu viele Anmeldeversuche. Bitte warte einige Minuten und versuche es erneut."

    });


const accountMfaVerifyLimiter =
    createRateLimiter({
        windowMs: MFA_VERIFY_RATE_WINDOW_MS,
        max: MFA_VERIFY_RATE_MAX,
        keyGenerator: req => requestIp(req),
        message: "Zu viele MFA-Versuche. Bitte warte einige Minuten und versuche es erneut."
    });


const accountPasskeyLimiter =
    createRateLimiter({
        windowMs: PASSKEY_RATE_WINDOW_MS,
        max: PASSKEY_RATE_MAX,
        keyGenerator: req => `${String(req.creatorAccount?.id || "login")}|${requestIp(req)}`,
        message: "Zu viele Passkey-Anfragen. Bitte warte einige Minuten und versuche es erneut."
    });


const accountRegisterLimiter =
    createRateLimiter({

        windowMs:
            REGISTER_RATE_WINDOW_MS,

        max:
            REGISTER_RATE_MAX,

        keyGenerator:
            req =>
                requestIp(
                    req
                ),

        message:
            "Zu viele Registrierungsversuche. Bitte versuche es später erneut."

    });


const accountEmailActionLimiter =
    createRateLimiter({
        windowMs: ACCOUNT_EMAIL_ACTION_RATE_WINDOW_MS,
        max: ACCOUNT_EMAIL_ACTION_RATE_MAX,
        keyGenerator: req =>
            requestIp(req) + "|" + normalizeEmail(req.body?.email || ""),
        message: "Zu viele E-Mail-Anfragen. Bitte versuche es später erneut."
    });

const accountPasswordResetLimiter =
    createRateLimiter({
        windowMs: PASSWORD_RESET_RATE_WINDOW_MS,
        max: PASSWORD_RESET_RATE_MAX,
        keyGenerator: req =>
            requestIp(req) + "|" + normalizeEmail(req.body?.email || "") + "|" + String(req.body?.token || "").slice(0, 12),
        message: "Zu viele Recovery-Anfragen. Bitte versuche es später erneut."
    });


const publicReviewSubmitLimiter =
    createRateLimiter({

        windowMs:
            PUBLIC_REVIEW_RATE_WINDOW_MS,

        max:
            PUBLIC_REVIEW_RATE_MAX,

        keyGenerator:
            req =>
                requestIp(
                    req
                ),

        message:
            "Zu viele Rezensionen in kurzer Zeit. Bitte versuche es später erneut."

    });


const publicReviewReadLimiter =
    createRateLimiter({

        windowMs:
            PUBLIC_REVIEW_READ_RATE_WINDOW_MS,

        max:
            PUBLIC_REVIEW_READ_RATE_MAX,

        keyGenerator:
            req =>
                requestIp(
                    req
                ),

        message:
            "Zu viele Rezensionsabfragen. Bitte warte kurz."

    });


const publicSupportReportLimiter =
    createRateLimiter({

        windowMs:
            PUBLIC_SUPPORT_RATE_WINDOW_MS,

        max:
            PUBLIC_SUPPORT_RATE_MAX,

        keyGenerator:
            req =>
                requestIp(
                    req
                ),

        message:
            "Zu viele Support-Meldungen in kurzer Zeit. Bitte versuche es später erneut."

    });


const tiktokConnectLimiter =
    createRateLimiter({

        windowMs:
            TIKTOK_CONNECT_RATE_WINDOW_MS,

        max:
            TIKTOK_CONNECT_RATE_MAX,

        keyGenerator:
            req =>
                requestIp(
                    req
                ),

        message:
            "Zu viele TikTok-Verbindungsversuche. Bitte warte einige Minuten."

    });


const accountDeleteLimiter =
    createRateLimiter({

        windowMs:
            ACCOUNT_DELETE_RATE_WINDOW_MS,

        max:
            ACCOUNT_DELETE_RATE_MAX,

        keyGenerator:
            req =>
                (
                    String(
                        req.creatorAccount?.id ||
                        "unknown"
                    ) +
                    "|" +
                    requestIp(
                        req
                    )
                ),

        message:
            "Zu viele Löschversuche. Bitte warte einige Minuten und versuche es erneut."

    });


const accountExportLimiter =
    createRateLimiter({

        windowMs:
            ACCOUNT_EXPORT_RATE_WINDOW_MS,

        max:
            ACCOUNT_EXPORT_RATE_MAX,

        keyGenerator:
            req =>
                (
                    String(
                        req.creatorAccount?.id ||
                        "unknown"
                    ) +
                    "|" +
                    requestIp(
                        req
                    )
                ),

        message:
            "Zu viele Datenexporte angefordert. Bitte warte und versuche es später erneut."

    });


const accountPasswordChangeLimiter =
    createRateLimiter({

        windowMs:
            PASSWORD_CHANGE_RATE_WINDOW_MS,

        max:
            PASSWORD_CHANGE_RATE_MAX,

        keyGenerator:
            req =>
                (
                    String(
                        req.creatorAccount?.id ||
                        "unknown"
                    ) +
                    "|" +
                    requestIp(
                        req
                    )
                ),

        message:
            "Zu viele Passwortänderungen versucht. Bitte warte und versuche es später erneut."

    });


const creatorWriteLimiter =
    createRateLimiter({
        windowMs: CREATOR_WRITE_RATE_WINDOW_MS,
        max: CREATOR_WRITE_RATE_MAX,
        keyGenerator: req => `${String(req.creatorAccount?.id || "unknown")}|${requestIp(req)}`,
        message: "Zu viele Änderungen in kurzer Zeit. Bitte warte kurz und versuche es erneut."
    });

const creatorAssetUploadLimiter =
    createRateLimiter({
        windowMs: CREATOR_ASSET_UPLOAD_RATE_WINDOW_MS,
        max: CREATOR_ASSET_UPLOAD_RATE_MAX,
        keyGenerator: req => `${String(req.creatorAccount?.id || "unknown")}|${requestIp(req)}`,
        message: "Zu viele Medien-Uploads in kurzer Zeit. Bitte warte einige Minuten."
    });


const adminElevationLimiter =
    createRateLimiter({
        windowMs: ADMIN_ELEVATION_RATE_WINDOW_MS,
        max: ADMIN_ELEVATION_RATE_MAX,
        keyGenerator: req => `${String(req.creatorAccount?.id || "unknown")}|${requestIp(req)}`,
        message: "Zu viele Admin-Bestätigungen. Bitte warte einige Minuten und versuche es erneut."
    });

const adminSensitiveReadLimiter =
    createRateLimiter({
        windowMs: ADMIN_SENSITIVE_READ_RATE_WINDOW_MS,
        max: ADMIN_SENSITIVE_READ_RATE_MAX,
        keyGenerator: req => `${String(req.creatorAccount?.id || "unknown")}|${requestIp(req)}`,
        message: "Zu viele sensible Admin-Abfragen in kurzer Zeit. Bitte warte kurz und versuche es erneut."
    });


const accountElevationLimiter =
    createRateLimiter({
        windowMs: ACCOUNT_ELEVATION_RATE_WINDOW_MS,
        max: ACCOUNT_ELEVATION_RATE_MAX,
        keyGenerator: req => `${String(req.creatorAccount?.id || "unknown")}|${requestIp(req)}`,
        message: "Zu viele Sicherheitsbestätigungen. Bitte warte einige Minuten und versuche es erneut."
    });


const publicRuntimeIpLimiter =
    createRateLimiter({
        windowMs: PUBLIC_RUNTIME_IP_RATE_WINDOW_MS,
        max: PUBLIC_RUNTIME_IP_RATE_MAX,
        keyGenerator: req => requestIp(req),
        message: "Zu viele öffentliche Runtime-Anfragen von dieser Verbindung. Bitte warte kurz."
    });

const widgetReadLimiter =
    createRateLimiter({

        windowMs:
            WIDGET_READ_RATE_WINDOW_MS,

        max:
            WIDGET_READ_RATE_MAX,

        keyGenerator:
            req =>
                (
                    requestIp(
                        req
                    ) +
                    "|" +
                    String(
                        req.params?.publicToken ||
                        req.params?.token ||
                        req.params?.sourceKey ||
                        "widget"
                    )
                ),

        message:
            "Zu viele Widget-Aktualisierungen. Bitte warte kurz."

    });


const studioPublicReadLimiter =
    createRateLimiter({

        windowMs:
            WIDGET_READ_RATE_WINDOW_MS,

        max:
            WIDGET_READ_RATE_MAX,

        keyGenerator:
            req =>
                (
                    requestIp(
                        req
                    ) +
                    "|" +
                    String(
                        req.params?.token ||
                        req.params?.publicToken ||
                        req.params?.sourceKey ||
                        "studio"
                    )
                ),

        message:
            "Zu viele öffentliche Studio-Aktualisierungen. Bitte warte kurz."

    });


const widgetBridgeHeartbeatLimiter =
    createRateLimiter({
        windowMs: WIDGET_BRIDGE_HEARTBEAT_RATE_WINDOW_MS,
        max: WIDGET_BRIDGE_HEARTBEAT_RATE_MAX,
        keyGenerator: req => requestIp(req),
        message: "Zu viele Bridge-Heartbeats. Bitte warte kurz."
    });

const widgetBridgeEventLimiter =
    createRateLimiter({
        windowMs: WIDGET_BRIDGE_EVENT_RATE_WINDOW_MS,
        max: WIDGET_BRIDGE_EVENT_RATE_MAX,
        keyGenerator: req => requestIp(req),
        message: "Zu viele Bridge-Events. Bitte sende Events gebündelt."
    });

const launcherDeviceStartLimiter =
    createRateLimiter({
        windowMs: 10 * 60 * 1000,
        max: 12,
        keyGenerator: req => requestIp(req),
        message: "Zu viele Launcher-Verknüpfungen gestartet. Bitte warte einige Minuten."
    });

const launcherDevicePollLimiter =
    createRateLimiter({
        windowMs: 10 * 60 * 1000,
        max: 240,
        keyGenerator: req => requestIp(req) + "|" + String(req.body?.device_link_id || ""),
        message: "Zu viele Statusabfragen für diese Launcher-Verknüpfung."
    });

const launcherDeviceCodeInspectLimiter =
    createRateLimiter({
        windowMs: 10 * 60 * 1000,
        max: 60,
        keyGenerator: req => `${req.creatorAccount?.id || "anonymous"}|${requestIp(req)}`,
        message: "Zu viele Geräte-Codes geprüft. Bitte warte einige Minuten."
    });

const launcherDeviceConfirmLimiter =
    createRateLimiter({
        windowMs: 10 * 60 * 1000,
        max: 20,
        keyGenerator: req => `${req.creatorAccount?.id || "anonymous"}|${requestIp(req)}`,
        message: "Zu viele Geräte-Bestätigungen. Bitte warte einige Minuten."
    });




// ============================================================
// ORIGIN / FETCH METADATA / CSRF · WEBSITE SECURITY PASS 1C
//
// Cookie-authentifizierte Schreibzugriffe werden in drei Schichten
// geschützt:
// 1) exakte Origin/Referer-Allowlist,
// 2) Fetch-Metadata gegen cross-site/same-site Schreibzugriffe,
// 3) sessiongebundener, signierter Double-Submit-CSRF-Token.
// Launcher-/Bridge-/Webhook-Endpunkte verwenden eigene Authentisierung
// und werden von diesem Browser-Schutz nicht global erfasst.
// ============================================================

function safeOrigin(
    value
) {

    try {

        return new URL(
            String(
                value ||
                ""
            )
        ).origin;

    }
    catch {

        return "";

    }

}


const TRUSTED_BROWSER_ORIGINS =
    new Set(
        [
            APP_CANONICAL_ORIGIN,
            NODE_ENV ===
            "development"
                ? `http://localhost:${PORT}`
                : "",
            NODE_ENV ===
            "development"
                ? `http://127.0.0.1:${PORT}`
                : ""
        ]
            .filter(
                Boolean
            )
    );


function creatorCsrfCookieOptions() {
    return {
        httpOnly:false,
        secure:NODE_ENV !== "development",
        sameSite:"strict",
        priority:"high",
        path:"/"
    };
}


function creatorCsrfSignature(sessionToken, nonce) {
    return crypto
        .createHmac("sha256", CSRF_SIGNING_SECRET)
        .update(`v1|${String(sessionToken || "")}|${String(nonce || "")}`)
        .digest("base64url");
}


function createCreatorCsrfToken(sessionToken) {
    const nonce = crypto.randomBytes(32).toString("base64url");
    return `v1.${nonce}.${creatorCsrfSignature(sessionToken, nonce)}`;
}


function validCreatorCsrfToken(value, sessionToken) {
    const token = String(value || "").trim();
    const parts = token.split(".");

    if (
        parts.length !== 3 ||
        parts[0] !== "v1" ||
        !/^[A-Za-z0-9_-]{32,80}$/.test(parts[1]) ||
        !/^[A-Za-z0-9_-]{32,80}$/.test(parts[2])
    ) {
        return false;
    }

    return safeEqualText(
        parts[2],
        creatorCsrfSignature(sessionToken, parts[1])
    );
}


function setCreatorCsrfCookie(res, sessionToken) {
    const token = createCreatorCsrfToken(sessionToken);
    res.cookie(CREATOR_CSRF_COOKIE, token, creatorCsrfCookieOptions());
    return token;
}


function clearCreatorCsrfCookie(res) {
    res.clearCookie(CREATOR_CSRF_COOKIE, creatorCsrfCookieOptions());
}


function ensureCreatorCsrfCookie(req, res) {
    const cookies = parseCookies(req);
    const sessionToken = String(cookies[CREATOR_SESSION_COOKIE] || "");

    if (!sessionToken) {
        return "";
    }

    const existing = String(cookies[CREATOR_CSRF_COOKIE] || "");

    if (validCreatorCsrfToken(existing, sessionToken)) {
        return existing;
    }

    return setCreatorCsrfCookie(res, sessionToken);
}


function rejectBrowserWrite(req, res, message = "Die Anfrage wurde aus Sicherheitsgründen abgewiesen.") {
    return transportSecurityError(req, res, 403, message);
}


function browserWriteSourceAllowed(req, res) {
    res.vary("Origin");
    res.vary("Sec-Fetch-Site");

    const fetchSite = String(req.get("Sec-Fetch-Site") || "").trim().toLowerCase();

    // Für zustandsändernde Browser-Requests akzeptieren wir nur exakt
    // dieselbe Origin. "same-site" reicht absichtlich nicht aus, weil
    // ein kompromittierter Subdomain-Host sonst Cookie-Requests anstoßen
    // könnte. Fehlen Origin/Referer komplett, ist mindestens ein positives
    // Sec-Fetch-Site=same-origin Signal erforderlich. Browser-Schreibwege
    // arbeiten damit fail-closed statt Header-losen Requests zu vertrauen.
    if (fetchSite && fetchSite !== "same-origin") {
        return false;
    }

    const origin = safeOrigin(req.get("Origin"));
    const refererOrigin = safeOrigin(req.get("Referer"));
    const suppliedOrigin = origin || refererOrigin;

    if (suppliedOrigin) {
        return TRUSTED_BROWSER_ORIGINS.has(suppliedOrigin);
    }

    return fetchSite === "same-origin";
}


function requireCreatorCsrf(req, res, next) {
    if (isSafeHttpMethod(req.method)) {
        return next();
    }

    // Login und Registrierung bauen die Session erst auf. Sie bleiben durch
    // Origin/Referer + Fetch Metadata geschützt, dürfen aber nicht an einem
    // alten/abgelaufenen Session-Cookie ohne CSRF-Cookie hängen bleiben.
    if (
        req.path === "/api/account/login" ||
        req.path === "/api/account/register" ||
        req.path === "/api/account/email/verification/request" ||
        req.path === "/api/account/email/verify" ||
        req.path === "/api/account/password/forgot" ||
        req.path === "/api/account/password/reset" ||
        req.path === "/api/account/mfa/login"
    ) {
        return next();
    }

    const cookies = parseCookies(req);
    const sessionToken = String(cookies[CREATOR_SESSION_COOKIE] || "");

    // Login/Registrierung vor dem Aufbau einer Session bleiben möglich.
    if (!sessionToken) {
        return next();
    }

    const cookieToken = String(cookies[CREATOR_CSRF_COOKIE] || "");
    const headerToken = String(req.get("X-CSRF-Token") || "").trim();

    if (
        !validCreatorCsrfToken(cookieToken, sessionToken) ||
        !headerToken ||
        !safeEqualText(cookieToken, headerToken)
    ) {
        return rejectBrowserWrite(
            req,
            res,
            "Sicherheits-Token fehlt oder ist abgelaufen. Bitte lade die Seite neu."
        );
    }

    return next();
}


app.use(
    (
        req,
        res,
        next
    ) => {

        if (isSafeHttpMethod(req.method)) {
            return next();
        }

        const protectedBrowserApi =
            req.path.startsWith("/api/account/") ||
            req.path.startsWith("/api/creator/") ||
            req.path.startsWith("/api/admin/");

        if (!protectedBrowserApi) {
            return next();
        }

        if (!browserWriteSourceAllowed(req, res)) {
            return rejectBrowserWrite(req, res);
        }

        return requireCreatorCsrf(req, res, next);

    }
);


function requireTrustedPublicWrite(req,res,next) {
    if (isSafeHttpMethod(req.method)) {
        return next();
    }

    if (!browserWriteSourceAllowed(req, res)) {
        return rejectBrowserWrite(req, res);
    }

    return next();
}


// ============================================================
// ENV PRÜFEN
// ============================================================

function requireEnv(
    name,
    value
) {

    if (!value) {

        throw new Error(
            `${name} fehlt.`
        );

    }

}


function validateConfiguration() {

    const nodeMajor = Number(String(process.versions.node || "0").split(".")[0] || 0);
    if (nodeMajor < 22) {
        throw new Error("Node.js 22 oder neuer ist für den sicheren Runtime-Stand und WebAuthn erforderlich.");
    }

    requireEnv(
        "DATABASE_URL",
        DATABASE_URL
    );

    databaseRuntimeSecurity({databaseUrl:DATABASE_URL,nodeEnv:NODE_ENV});

    requireEnv(
        "TIKTOK_CLIENT_KEY",
        CLIENT_KEY
    );

    requireEnv(
        "TIKTOK_CLIENT_SECRET",
        CLIENT_SECRET
    );

    requireEnv(
        "CFS_LAUNCHER_API_KEY",
        LAUNCHER_API_KEY
    );
    if (NODE_ENV === "production" && String(LAUNCHER_API_KEY).length < 32) {
        throw new Error("CFS_LAUNCHER_API_KEY muss in Produktion mindestens 32 Zeichen lang sein.");
    }

    if (
        HSTS_PRELOAD &&
        !HSTS_INCLUDE_SUBDOMAINS
    ) {
        throw new Error(
            "CFS_HSTS_PRELOAD=true setzt CFS_HSTS_INCLUDE_SUBDOMAINS=true voraus."
        );
    }

    validateAccountMailConfig(
        ACCOUNT_MAIL_CONFIG
    );

    validateMonitorAlertConfig(
        PRODUCTION_MONITOR_CONFIG
    );

    const stripeConfigured = Boolean(
        STRIPE_SECRET_KEY || STRIPE_WEBHOOK_SECRET || STRIPE_PRICE_CREATOR_MONTHLY || STRIPE_PRICE_PRO_MONTHLY
    );
    if (stripeConfigured) {
        if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
            throw new Error("Stripe Billing benötigt Secret-Key und Webhook-Secret gemeinsam.");
        }
        if (STRIPE_SECRET_MODE === "unknown") {
            throw new Error("CFS_STRIPE_SECRET_KEY hat kein erwartetes Stripe Secret-/Restricted-Key-Format.");
        }
        if (!/^whsec_[A-Za-z0-9_-]+$/.test(STRIPE_WEBHOOK_SECRET)) {
            throw new Error("CFS_STRIPE_WEBHOOK_SECRET hat kein erwartetes Stripe Webhook-Secret-Format.");
        }
        for (const [name,value] of [["CFS_STRIPE_PRICE_CREATOR_MONTHLY",STRIPE_PRICE_CREATOR_MONTHLY],["CFS_STRIPE_PRICE_PRO_MONTHLY",STRIPE_PRICE_PRO_MONTHLY]]) {
            if (value && !/^price_[A-Za-z0-9]+$/.test(value)) {
                throw new Error(`${name} hat kein erwartetes Stripe Price-ID-Format.`);
            }
        }
        if (BILLING_LIVE_REQUIRED && STRIPE_SECRET_MODE !== "live") {
            throw new Error("CFS_BILLING_LIVE_REQUIRED=true verlangt einen Stripe LIVE Secret-/Restricted-Key.");
        }
    } else if (BILLING_LIVE_REQUIRED) {
        throw new Error("CFS_BILLING_LIVE_REQUIRED=true verlangt eine vollständige Stripe Billing-Konfiguration.");
    }


    if (!PASSKEY_RP_ID || PASSKEY_RP_ID.includes(":") || PASSKEY_RP_ID.includes("/")) {
        throw new Error("CFS_WEBAUTHN_RP_ID muss ein Hostname ohne Protokoll oder Pfad sein.");
    }

    if (
        NODE_ENV === "production" &&
        APP_CANONICAL_HOSTNAME !== PASSKEY_RP_ID &&
        !APP_CANONICAL_HOSTNAME.endsWith(`.${PASSKEY_RP_ID}`)
    ) {
        throw new Error("CFS_WEBAUTHN_RP_ID muss die kanonische Domain oder deren übergeordnete Domain sein.");
    }

    if (NODE_ENV === "production") {
        requireEnv(
            "CFS_TOKEN_ENCRYPTION_KEY",
            process.env.CFS_TOKEN_ENCRYPTION_KEY
        );
        requireEnv(
            "CFS_CSRF_SIGNING_SECRET",
            CSRF_SIGNING_SECRET
        );
        requireEnv(
            "CFS_PUBLIC_REVIEW_HASH_SALT",
            PUBLIC_REVIEW_HASH_SALT
        );
        requireEnv(
            "CFS_PUBLIC_SUPPORT_HASH_SALT",
            PUBLIC_SUPPORT_HASH_SALT
        );
        requireEnv(
            "CFS_MFA_RECOVERY_HASH_SALT",
            MFA_RECOVERY_HASH_SALT
        );
        requireEnv(
            "CFS_ADMIN_ELEVATION_SECRET",
            ADMIN_ELEVATION_SECRET
        );
        if (ADMIN_ELEVATION_SECRET.length < 32) {
            throw new Error("CFS_ADMIN_ELEVATION_SECRET muss mindestens 32 Zeichen lang sein.");
        }
        requireEnv(
            "CFS_ACCOUNT_ELEVATION_SECRET",
            ACCOUNT_ELEVATION_SECRET
        );
        if (ACCOUNT_ELEVATION_SECRET.length < 32) {
            throw new Error("CFS_ACCOUNT_ELEVATION_SECRET muss mindestens 32 Zeichen lang sein.");
        }
        requireEnv(
            "CFS_ADMIN_AUDIT_HMAC_SECRET",
            ADMIN_AUDIT_HMAC_SECRET
        );
        if (ADMIN_AUDIT_HMAC_SECRET.length < 32) {
            throw new Error("CFS_ADMIN_AUDIT_HMAC_SECRET muss mindestens 32 Zeichen lang sein.");
        }
    }


}


// ============================================================
// POSTGRESQL
// ============================================================

const pool =
    new Pool({

        connectionString:
            DATABASE_URL,

        ...(DATABASE_RUNTIME_SECURITY?.poolOptions || {})

    });


pool.on(
    "error",
    error => {

        safeLogError(
            "postgresql:pool",
            error
        );

    }
);


// ============================================================
// TOKEN-VERSCHLÜSSELUNG
// ============================================================

function getEncryptionKey() {

    const raw =
        String(
            process.env.CFS_TOKEN_ENCRYPTION_KEY ||
            ""
        ).trim();

    if (!raw) {
        return null;
    }

    if (
        /^[0-9a-fA-F]{64}$/.test(
            raw
        )
    ) {

        return Buffer.from(
            raw,
            "hex"
        );

    }

    try {

        const decoded =
            Buffer.from(
                raw,
                "base64"
            );

        if (
            decoded.length ===
            32
        ) {

            return decoded;

        }

    }
    catch {
        // unten Fehler
    }

    throw new Error(
        "CFS_TOKEN_ENCRYPTION_KEY muss 32 Byte lang sein."
    );

}


const TOKEN_ENCRYPTION_KEY =
    getEncryptionKey();


function encryptSecret(
    value
) {

    if (!value) {
        return null;
    }

    if (
        !TOKEN_ENCRYPTION_KEY
    ) {

        return (
            "plain:" +
            String(value)
        );

    }

    const iv =
        crypto.randomBytes(
            12
        );

    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            TOKEN_ENCRYPTION_KEY,
            iv
        );

    const encrypted =
        Buffer.concat([
            cipher.update(
                String(value),
                "utf8"
            ),
            cipher.final()
        ]);

    const authTag =
        cipher.getAuthTag();

    return [
        "gcm",
        iv.toString(
            "base64"
        ),
        authTag.toString(
            "base64"
        ),
        encrypted.toString(
            "base64"
        )
    ].join(":");

}


function decryptSecret(
    value
) {

    if (!value) {
        return null;
    }

    const text =
        String(value);

    if (
        text.startsWith(
            "plain:"
        )
    ) {

        return text.slice(
            6
        );

    }

    if (
        !text.startsWith(
            "gcm:"
        )
    ) {

        return text;

    }

    if (
        !TOKEN_ENCRYPTION_KEY
    ) {

        throw new Error(
            "Token ist verschlüsselt, aber CFS_TOKEN_ENCRYPTION_KEY fehlt."
        );

    }

    const parts =
        text.split(":");

    if (
        parts.length !==
        4
    ) {

        throw new Error(
            "Ungültiges Token-Format."
        );

    }

    const iv =
        Buffer.from(
            parts[1],
            "base64"
        );

    const authTag =
        Buffer.from(
            parts[2],
            "base64"
        );

    const encrypted =
        Buffer.from(
            parts[3],
            "base64"
        );

    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            TOKEN_ENCRYPTION_KEY,
            iv
        );

    decipher.setAuthTag(
        authTag
    );

    return Buffer
        .concat([
            decipher.update(
                encrypted
            ),
            decipher.final()
        ])
        .toString(
            "utf8"
        );

}


// ============================================================
// DATENBANK INITIALISIEREN
// ============================================================

async function initDatabase() {

    // --------------------------------------------------------
    // TIKTOK
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tiktok_connections (

            creator_id TEXT PRIMARY KEY,

            connected BOOLEAN
                NOT NULL
                DEFAULT FALSE,

            open_id TEXT,

            access_token TEXT,

            refresh_token TEXT,

            access_expires_at BIGINT,

            refresh_expires_at BIGINT,

            scope TEXT,

            display_name TEXT,

            avatar_url TEXT,

            follower_count BIGINT
                NOT NULL
                DEFAULT 0,

            following_count BIGINT
                NOT NULL
                DEFAULT 0,

            likes_count BIGINT
                NOT NULL
                DEFAULT 0,

            video_count BIGINT
                NOT NULL
                DEFAULT 0,

            updated_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW()

        )
    `);


    await pool.query(`
        CREATE TABLE IF NOT EXISTS tiktok_oauth_states (

            state_hash TEXT PRIMARY KEY,

            creator_id TEXT
                NOT NULL,

            expires_at TIMESTAMPTZ
                NOT NULL,

            created_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW()

        )
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
            idx_tiktok_oauth_states_expires

        ON tiktok_oauth_states (
            expires_at
        )
    `);


    // --------------------------------------------------------
    // CREATOR ACCOUNTS
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_accounts (

            id TEXT PRIMARY KEY,

            email TEXT
                NOT NULL
                UNIQUE,

            password_hash TEXT
                NOT NULL,

            password_salt TEXT
                NOT NULL,

            password_kdf_version SMALLINT
                NOT NULL
                DEFAULT 1,

            display_name TEXT
                NOT NULL
                DEFAULT '',

            plan TEXT
                NOT NULL
                DEFAULT 'free',

            status TEXT
                NOT NULL
                DEFAULT 'active',

            created_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            email_verified_at TIMESTAMPTZ,

            updated_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW()

        )
    `);

    await pool.query(`
        ALTER TABLE creator_accounts
        ADD COLUMN IF NOT EXISTS password_kdf_version SMALLINT NOT NULL DEFAULT 1
    `);

    await pool.query(`
        ALTER TABLE creator_accounts
        ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ
    `);


    // --------------------------------------------------------
    // LEGACY TIKTOK OWNER BRIDGE
    //
    // Die bestehende interne TikTok-Verbindung "default" wird
    // einmalig dem ältesten bestehenden Creator-Account zugeordnet.
    // Die Zuordnung bleibt absichtlich auch dann bestehen, wenn
    // dieser Account später gelöscht wird. So kann die globale
    // Owner-Verbindung niemals automatisch auf einen anderen
    // Creator übergehen.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_tiktok_legacy_owner (

            slot TEXT PRIMARY KEY,

            creator_id TEXT
                NOT NULL,

            created_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW()

        )
    `);


    await pool.query(`
        INSERT INTO creator_tiktok_legacy_owner (
            slot,
            creator_id,
            created_at
        )

        SELECT
            'default',
            id,
            NOW()

        FROM creator_accounts

        WHERE status = 'active'

        ORDER BY
            created_at ASC,
            id ASC

        LIMIT 1

        ON CONFLICT (slot)
            DO NOTHING
    `);


    // --------------------------------------------------------
    // CREATOR SESSIONS
    //
    // WICHTIG:
    // token_hash bleibt erhalten, damit bestehende Logins
    // und die aktuelle Datenbank kompatibel bleiben.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_sessions (

            token_hash TEXT PRIMARY KEY,

            creator_id TEXT
                NOT NULL,

            expires_at TIMESTAMPTZ
                NOT NULL,

            created_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            CONSTRAINT
                fk_creator_sessions_creator

            FOREIGN KEY (
                creator_id
            )

            REFERENCES creator_accounts (
                id
            )

            ON DELETE CASCADE

        )
    `);


    await pool.query(`
        ALTER TABLE creator_sessions
        ADD COLUMN IF NOT EXISTS auth_method VARCHAR(32) NOT NULL DEFAULT 'unknown'
    `);

    await pool.query(`
        ALTER TABLE creator_sessions
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
            idx_creator_sessions_creator

        ON creator_sessions (
            creator_id
        )
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
            idx_creator_sessions_expires

        ON creator_sessions (
            expires_at
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
            idx_creator_sessions_last_seen

        ON creator_sessions (
            last_seen_at
        )
    `);


    // --------------------------------------------------------
    // CREATOR SECURITY EVENTS
    //
    // Datenschutzfreundlich: Es werden bewusst weder Klartext-IP
    // noch User-Agent oder Browser-Fingerprints gespeichert.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_security_events (

            id BIGSERIAL PRIMARY KEY,

            creator_id TEXT
                NOT NULL,

            event_type TEXT
                NOT NULL,

            created_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            CONSTRAINT
                fk_creator_security_events_creator

            FOREIGN KEY (
                creator_id
            )

            REFERENCES creator_accounts (
                id
            )

            ON DELETE CASCADE

        )
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
            idx_creator_security_events_creator_created

        ON creator_security_events (
            creator_id,
            created_at DESC
        )
    `);


    // --------------------------------------------------------
    // ADMIN AUDIT EVENTS
    //
    // Privilegierte Schreibaktionen werden ohne Request-Body, IP,
    // User-Agent oder sonstige Fingerprints protokolliert.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_admin_audit_events (
            id BIGSERIAL PRIMARY KEY,
            admin_creator_id TEXT NOT NULL,
            method VARCHAR(12) NOT NULL,
            route TEXT NOT NULL,
            outcome VARCHAR(16) NOT NULL,
            status_code INTEGER NOT NULL,
            request_id VARCHAR(80) NOT NULL DEFAULT '',
            chain_version SMALLINT NOT NULL DEFAULT 0,
            prev_hash VARCHAR(64) NOT NULL DEFAULT '',
            event_hash VARCHAR(64) NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // Migration für Installationen, die das Audit bereits vor Pass 17 hatten.
    // Bestehende Zeilen bleiben bewusst chain_version=0 (Legacy) und werden
    // nicht nachträglich kryptografisch "beglaubigt".
    await pool.query(`ALTER TABLE creator_admin_audit_events ADD COLUMN IF NOT EXISTS chain_version SMALLINT NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_admin_audit_events ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE creator_admin_audit_events ADD COLUMN IF NOT EXISTS event_hash VARCHAR(64) NOT NULL DEFAULT ''`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_admin_audit_checkpoint (
            id SMALLINT PRIMARY KEY CHECK (id = 1),
            anchor_event_id BIGINT NOT NULL DEFAULT 0,
            anchor_event_hash VARCHAR(64) NOT NULL DEFAULT '',
            anchored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_admin_audit_created
        ON creator_admin_audit_events (created_at DESC)
    `);


    // --------------------------------------------------------
    // WEBSITE INCIDENT / NOTFALLSTATUS · PASS 20
    //
    // Eine einzige globale Statuszeile steuert den öffentlichen
    // Betriebszustand. Keine Secret-Werte, IPs oder Fingerprints.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_incident_state (
            slot VARCHAR(32) PRIMARY KEY,
            mode VARCHAR(32) NOT NULL DEFAULT 'normal',
            public_message TEXT NOT NULL DEFAULT '',
            started_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by TEXT NOT NULL DEFAULT ''
        )
    `);

    await pool.query(`
        INSERT INTO creator_incident_state(slot,mode,public_message,started_at,updated_at,updated_by)
        VALUES('website','normal','',NULL,NOW(),'system')
        ON CONFLICT (slot) DO NOTHING
    `);


    // --------------------------------------------------------
    // PERSISTENTER ACCOUNT-LOGIN-THROTTLE
    //
    // Absichtlich ohne IP, User-Agent oder Geräte-Fingerprint.
    // Ergänzt die In-Memory/IP-Limits um einen kontoweiten Zähler.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_login_throttle (
            creator_id TEXT PRIMARY KEY REFERENCES creator_accounts(id) ON DELETE CASCADE,
            failed_count INTEGER NOT NULL DEFAULT 0,
            window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            blocked_until TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);


    // --------------------------------------------------------
    // SECURITY ALERT COOLDOWNS
    //
    // Keine IP-/Browser-Fingerprints. Diese Tabelle verhindert nur,
    // dass dieselbe Sicherheitswarnung in kurzer Zeit gespammt wird.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_security_alerts (
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            alert_key VARCHAR(64) NOT NULL,
            last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            occurrences INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (creator_id, alert_key)
        )
    `);


    // --------------------------------------------------------
    // ACCOUNT ACTION TOKENS
    // Roh-Tokens werden niemals gespeichert; nur SHA-256 Hashes.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_account_action_tokens (
            id UUID PRIMARY KEY,
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('verify_email','password_reset')),
            token_hash CHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_account_action_tokens_lookup
        ON creator_account_action_tokens (creator_id, purpose, expires_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_account_action_tokens_expiry
        ON creator_account_action_tokens (expires_at)
    `);


    // --------------------------------------------------------
    // ACCOUNT MAIL OUTBOX
    // Recovery-/Security-Mails werden verschlüsselt persistiert und
    // erst nach erfolgreicher Relay-Zustellung aus dem Payload entfernt.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_mail_outbox (
            id UUID PRIMARY KEY,
            creator_id TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            kind VARCHAR(64) NOT NULL,
            payload_ciphertext TEXT,
            status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','dead')),
            attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
            max_attempts INTEGER NOT NULL DEFAULT 6 CHECK (max_attempts BETWEEN 1 AND 12),
            available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            locked_at TIMESTAMPTZ,
            locked_by VARCHAR(80),
            sent_at TIMESTAMPTZ,
            last_error_code VARCHAR(80),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_mail_outbox_delivery
        ON creator_mail_outbox (status, available_at, created_at)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_mail_outbox_creator
        ON creator_mail_outbox (creator_id, created_at DESC)
    `);


    // --------------------------------------------------------
    // PRODUCTION MONITORING / ALERTING · R65
    // Nur aggregierte Betriebsmetriken und Alarmzustände. Keine Mail-Adressen,
    // IPs, Request-Bodies, Tokens oder sonstige Creator-Inhalte.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_operational_evidence (
            id BIGSERIAL PRIMARY KEY,
            kind VARCHAR(64) NOT NULL,
            status VARCHAR(24) NOT NULL CHECK (status IN ('success','failed','dry_run_ready')),
            observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            details JSONB NOT NULL DEFAULT '{}'::jsonb
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_operational_evidence_kind_observed
        ON creator_operational_evidence (kind, observed_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_production_monitor_alerts (
            alert_key VARCHAR(100) PRIMARY KEY,
            state VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (state IN ('open','resolved')),
            severity VARCHAR(16) NOT NULL CHECK (severity IN ('info','warning','critical')),
            title VARCHAR(180) NOT NULL,
            summary TEXT NOT NULL DEFAULT '',
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            resolved_at TIMESTAMPTZ,
            occurrences INTEGER NOT NULL DEFAULT 1 CHECK (occurrences >= 1),
            last_notified_at TIMESTAMPTZ,
            notification_failures INTEGER NOT NULL DEFAULT 0 CHECK (notification_failures >= 0),
            last_delivery_error VARCHAR(80)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_production_monitor_alerts_state
        ON creator_production_monitor_alerts (state, severity, last_seen_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_production_monitor_state (
            slot VARCHAR(32) PRIMARY KEY,
            status VARCHAR(24) NOT NULL DEFAULT 'unknown',
            last_run_at TIMESTAMPTZ,
            last_success_at TIMESTAMPTZ,
            snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        INSERT INTO creator_production_monitor_state(slot,status,snapshot,updated_at)
        VALUES('production','unknown','{}'::jsonb,NOW())
        ON CONFLICT(slot) DO NOTHING
    `);


    // --------------------------------------------------------
    // ACCOUNT MFA / TOTP
    // Shared Secrets werden mit dem bestehenden AES-256-GCM Key
    // verschlüsselt. Recovery-Codes werden nur als HMAC-Hash gespeichert.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_mfa_totp (
            creator_id TEXT PRIMARY KEY REFERENCES creator_accounts(id) ON DELETE CASCADE,
            secret_ciphertext TEXT NOT NULL,
            enabled_at TIMESTAMPTZ,
            last_used_step BIGINT NOT NULL DEFAULT -1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_mfa_recovery_codes (
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            code_hash CHAR(64) NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (creator_id, code_hash)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_mfa_recovery_unused
        ON creator_mfa_recovery_codes (creator_id, used_at)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_mfa_challenges (
            token_hash CHAR(64) PRIMARY KEY,
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL,
            attempts SMALLINT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_mfa_challenges_expiry
        ON creator_mfa_challenges (expires_at)
    `);


    // --------------------------------------------------------
    // WEBAUTHN / PASSKEYS
    // Private Keys bleiben ausschließlich im Authenticator.
    // Serverseitig werden nur Public Key, Counter und Metadaten gespeichert.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_webauthn_credentials (
            credential_id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            public_key BYTEA NOT NULL,
            counter BIGINT NOT NULL DEFAULT 0,
            transports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            device_type VARCHAR(32),
            backed_up BOOLEAN NOT NULL DEFAULT FALSE,
            label VARCHAR(80) NOT NULL DEFAULT 'Passkey',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_used_at TIMESTAMPTZ
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_webauthn_credentials_creator
        ON creator_webauthn_credentials (creator_id, created_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_webauthn_challenges (
            id UUID PRIMARY KEY,
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            purpose VARCHAR(24) NOT NULL CHECK (purpose IN ('register','authenticate','account_elevation','admin_elevation')),
            challenge TEXT NOT NULL,
            session_hash CHAR(64),
            mfa_challenge_hash CHAR(64),
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // R55: Bestehende Installationen aus der ursprünglichen Passkey-Version
    // erlaubten in der DB nur register/authenticate. Step-up-Challenges müssen
    // ebenfalls explizit von der Constraint erlaubt werden. Die Migration läuft
    // nur, wenn die vorhandene Constraint noch nicht die neuen Zwecke enthält.
    await pool.query(`
        DO $$
        DECLARE purpose_def TEXT;
        BEGIN
            SELECT pg_get_constraintdef(oid) INTO purpose_def
            FROM pg_constraint
            WHERE conrelid='creator_webauthn_challenges'::regclass
              AND conname='creator_webauthn_challenges_purpose_check';
            IF purpose_def IS NULL
               OR POSITION('account_elevation' IN purpose_def)=0
               OR POSITION('admin_elevation' IN purpose_def)=0 THEN
                ALTER TABLE creator_webauthn_challenges
                    DROP CONSTRAINT IF EXISTS creator_webauthn_challenges_purpose_check;
                ALTER TABLE creator_webauthn_challenges
                    ADD CONSTRAINT creator_webauthn_challenges_purpose_check
                    CHECK (purpose IN ('register','authenticate','account_elevation','admin_elevation'));
            END IF;
        END $$
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_webauthn_challenges_expiry
        ON creator_webauthn_challenges (expires_at)
    `);


    // --------------------------------------------------------
    // CREATOR WIDGET SOURCES
    //
    // Öffentliche OBS-Quellen werden über einen zufälligen,
    // nicht erratbaren Source-Key aufgelöst. Account-Löschung
    // entfernt diese Einträge automatisch per CASCADE.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_widget_sources (

            creator_id TEXT
                NOT NULL,

            widget_key TEXT
                NOT NULL,

            source_key TEXT
                NOT NULL
                UNIQUE,

            config JSONB
                NOT NULL
                DEFAULT '{}'::jsonb,

            created_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            updated_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            PRIMARY KEY (
                creator_id,
                widget_key
            ),

            CONSTRAINT
                fk_creator_widget_sources_creator

            FOREIGN KEY (
                creator_id
            )

            REFERENCES creator_accounts (
                id
            )

            ON DELETE CASCADE

        )
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
            idx_creator_widget_sources_source_key

        ON creator_widget_sources (
            source_key
        )
    `);


    // --------------------------------------------------------
    // WIDGET STUDIO V1
    //
    // Neue Studio-Widgets leben getrennt von den bisherigen
    // Legacy-Widget-Quellen. Dadurch kann ein Creator mehrere
    // Widgets besitzen und Entwurf/Live sauber trennen.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_widgets (

            id TEXT PRIMARY KEY,

            creator_id TEXT
                NOT NULL,

            widget_type TEXT
                NOT NULL,

            name TEXT
                NOT NULL,

            template_key TEXT
                NOT NULL
                DEFAULT 'cfs-standard',

            status TEXT
                NOT NULL
                DEFAULT 'draft',

            draft_config JSONB
                NOT NULL
                DEFAULT '{}'::jsonb,

            published_config JSONB,

            public_token TEXT
                NOT NULL
                UNIQUE,

            version INTEGER
                NOT NULL
                DEFAULT 1,

            created_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            updated_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            published_at TIMESTAMPTZ,

            CONSTRAINT fk_creator_widgets_creator
                FOREIGN KEY (creator_id)
                REFERENCES creator_accounts (id)
                ON DELETE CASCADE
        )
    `);

    // --------------------------------------------------------
    // WIDGET STUDIO · CREATOR DATEIBIBLIOTHEK
    //
    // Nur serverseitig erkannte Medienformate werden gespeichert.
    // HTML/JavaScript/SVG werden bewusst nicht als Widget-Asset
    // akzeptiert. Dateien bleiben pro Creator isoliert.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_widget_assets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            original_name VARCHAR(160) NOT NULL,
            label VARCHAR(120) NOT NULL,
            media_type VARCHAR(24) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            file_ext VARCHAR(16) NOT NULL,
            byte_size BIGINT NOT NULL,
            sha256 VARCHAR(64) NOT NULL,
            auto_category VARCHAR(40) NOT NULL DEFAULT 'other',
            category VARCHAR(40) NOT NULL DEFAULT 'other',
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            public_token VARCHAR(80) NOT NULL UNIQUE,
            content BYTEA NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_widget_assets_creator ON creator_widget_assets(creator_id,updated_at DESC)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_widget_assets_dedupe ON creator_widget_assets(creator_id,sha256)`);

    // --------------------------------------------------------
    // V28 CREATOR TOOLS — GAME RUNTIME + CUT STUDIO PROJECTS
    // --------------------------------------------------------
    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_game_runtime (
            creator_id TEXT PRIMARY KEY REFERENCES creator_accounts(id) ON DELETE CASCADE,
            public_token TEXT NOT NULL UNIQUE,
            status VARCHAR(24) NOT NULL DEFAULT 'idle',
            game_type VARCHAR(40) NOT NULL DEFAULT 'chat_battle',
            title VARCHAR(120) NOT NULL DEFAULT 'Community Battle',
            config JSONB NOT NULL DEFAULT '{}'::jsonb,
            state JSONB NOT NULL DEFAULT '{}'::jsonb,
            started_at TIMESTAMPTZ,
            round_ends_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ,
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_cut_projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            title VARCHAR(120) NOT NULL,
            status VARCHAR(24) NOT NULL DEFAULT 'draft',
            format VARCHAR(24) NOT NULL DEFAULT 'vertical',
            notes TEXT NOT NULL DEFAULT '',
            source_name VARCHAR(240) NOT NULL DEFAULT '',
            export_preset JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_cut_projects_creator ON creator_cut_projects (creator_id, updated_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_cut_clips (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES creator_cut_projects(id) ON DELETE CASCADE,
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            label VARCHAR(120) NOT NULL DEFAULT 'Clip',
            in_ms INTEGER NOT NULL DEFAULT 0,
            out_ms INTEGER NOT NULL DEFAULT 15000,
            caption TEXT NOT NULL DEFAULT '',
            selected BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_cut_clips_project ON creator_cut_clips (project_id, created_at ASC)`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS caption_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS caption_position VARCHAR(16) NOT NULL DEFAULT 'bottom'`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS caption_size INTEGER NOT NULL DEFAULT 52`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS caption_style VARCHAR(16) NOT NULL DEFAULT 'box'`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS audio_gain_db NUMERIC(5,1) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS audio_fade_in_ms INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS audio_fade_out_ms INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_zoom_start NUMERIC(5,3) NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_zoom_end NUMERIC(5,3) NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_pan_x_start NUMERIC(5,3) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_pan_x_end NUMERIC(5,3) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_pan_y_start NUMERIC(5,3) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_pan_y_end NUMERIC(5,3) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS keyframe_easing VARCHAR(20) NOT NULL DEFAULT 'linear'`);
    await pool.query(`ALTER TABLE creator_cut_clips ADD COLUMN IF NOT EXISTS visual_keyframes JSONB NOT NULL DEFAULT '[]'::jsonb`);


    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_cut_clips_timeline ON creator_cut_clips (project_id, sort_order ASC, created_at ASC)`);



    // --------------------------------------------------------
    // V29 GAME LIVE RULES
    // Reagieren ausschließlich auf bereits angenommene echte
    // creator_live_events. Kein künstliches Event-Injection.
    // --------------------------------------------------------
    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_game_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            label VARCHAR(120) NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            event_type VARCHAR(24) NOT NULL,
            team VARCHAR(4) NOT NULL DEFAULT 'a',
            points INTEGER NOT NULL DEFAULT 1,
            amount_mode VARCHAR(16) NOT NULL DEFAULT 'fixed',
            min_amount INTEGER NOT NULL DEFAULT 1,
            gift_name VARCHAR(120) NOT NULL DEFAULT '',
            gift_id VARCHAR(120) NOT NULL DEFAULT '',
            last_triggered_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_game_rules_creator ON creator_game_rules (creator_id, event_type, updated_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_game_rule_hits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            rule_id UUID NOT NULL REFERENCES creator_game_rules(id) ON DELETE CASCADE,
            event_id TEXT NOT NULL,
            session_id TEXT,
            event_type VARCHAR(24) NOT NULL,
            team VARCHAR(4) NOT NULL,
            points INTEGER NOT NULL,
            actor_name VARCHAR(100) NOT NULL DEFAULT '',
            gift_name VARCHAR(120) NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(rule_id,event_id)
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_game_rule_hits_creator ON creator_game_rule_hits (creator_id, created_at DESC)`);

    // --------------------------------------------------------
    // V29 CUT EXPORT JOB QUEUE
    // Nur Manifest/Metadaten in der Cloud. Keine Videodateien.
    // --------------------------------------------------------
    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_cut_export_jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES creator_cut_projects(id) ON DELETE CASCADE,
            status VARCHAR(24) NOT NULL DEFAULT 'queued',
            manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
            bridge_id TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            result JSONB NOT NULL DEFAULT '{}'::jsonb,
            error_message TEXT NOT NULL DEFAULT '',
            requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            claimed_at TIMESTAMPTZ,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_cut_export_jobs_creator ON creator_cut_export_jobs (creator_id, requested_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_cut_export_jobs_status ON creator_cut_export_jobs (creator_id, status, requested_at ASC)`);


    // --------------------------------------------------------
    // PASS 21.10.31 CUT AUDITION RUNTIME CLOCK
    // Only sanitized transport timing/state is persisted. No
    // recording path, cache path or audio payload is stored.
    // --------------------------------------------------------
    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_cut_audition_runtime (
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES creator_cut_projects(id) ON DELETE CASCADE,
            bridge_id TEXT,
            session_id VARCHAR(96) NOT NULL DEFAULT '',
            state VARCHAR(16) NOT NULL DEFAULT 'idle',
            transport VARCHAR(24) NOT NULL DEFAULT 'webaudio',
            position_ms INTEGER NOT NULL DEFAULT 0,
            start_ms INTEGER NOT NULL DEFAULT 0,
            end_ms INTEGER NOT NULL DEFAULT 0,
            loop_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            loop_start_ms INTEGER NOT NULL DEFAULT 0,
            loop_end_ms INTEGER NOT NULL DEFAULT 0,
            revision BIGINT NOT NULL DEFAULT 0,
            sampled_at_ms BIGINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (creator_id, project_id)
        )
    `);
    await pool.query(`ALTER TABLE creator_cut_audition_runtime ADD COLUMN IF NOT EXISTS loop_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE creator_cut_audition_runtime ADD COLUMN IF NOT EXISTS loop_start_ms INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_cut_audition_runtime ADD COLUMN IF NOT EXISTS loop_end_ms INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_cut_audition_runtime_updated ON creator_cut_audition_runtime (creator_id, updated_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_widget_scenes (
            id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            name VARCHAR(120) NOT NULL DEFAULT 'Neue Scene',
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            draft_config JSONB NOT NULL DEFAULT '{}'::jsonb,
            published_config JSONB,
            public_token VARCHAR(120) NOT NULL UNIQUE,
            version INTEGER NOT NULL DEFAULT 1,
            published_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_widget_scenes_creator
        ON creator_widget_scenes (creator_id, updated_at DESC)
    `);


    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_beta_testers (
            creator_id TEXT PRIMARY KEY REFERENCES creator_accounts(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'active',
            notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_beta_testers_status
        ON creator_beta_testers (status, updated_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_beta_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            bridge_id TEXT,
            label VARCHAR(120) NOT NULL DEFAULT 'Beta Test',
            launcher_version VARCHAR(80) NOT NULL DEFAULT '',
            platform VARCHAR(80) NOT NULL DEFAULT '',
            provider VARCHAR(80) NOT NULL DEFAULT '',
            status VARCHAR(24) NOT NULL DEFAULT 'active',
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            duration_seconds INTEGER,
            output_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
            diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
            result_summary TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_beta_sessions_creator ON creator_beta_sessions (creator_id, started_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_beta_sessions_status ON creator_beta_sessions (status, started_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_beta_feedback (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            bridge_id TEXT,
            session_id UUID REFERENCES creator_beta_sessions(id) ON DELETE SET NULL,
            kind VARCHAR(24) NOT NULL DEFAULT 'bug',
            severity VARCHAR(24) NOT NULL DEFAULT 'medium',
            category VARCHAR(40) NOT NULL DEFAULT 'launcher',
            title VARCHAR(160) NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            repro_steps TEXT NOT NULL DEFAULT '',
            expected TEXT NOT NULL DEFAULT '',
            actual TEXT NOT NULL DEFAULT '',
            launcher_version VARCHAR(80) NOT NULL DEFAULT '',
            platform VARCHAR(80) NOT NULL DEFAULT '',
            provider VARCHAR(80) NOT NULL DEFAULT '',
            diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(24) NOT NULL DEFAULT 'new',
            admin_notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_beta_feedback_status ON creator_beta_feedback (status, severity, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_beta_feedback_creator ON creator_beta_feedback (creator_id, created_at DESC)`);


    // --------------------------------------------------------
    // ÖFFENTLICHE REZENSIONEN · WEBSITE / MERCH-PLANUNG
    // Strukturierte Bewertungen zählen sofort; Freitext wird
    // erst nach Moderation öffentlich angezeigt.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS public_reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign VARCHAR(80) NOT NULL DEFAULT 'merch',
            client_token_hash CHAR(64) NOT NULL,
            submitter_hash CHAR(64) NOT NULL,
            display_name VARCHAR(60) NOT NULL DEFAULT 'Gast',
            rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
            appeal VARCHAR(16) NOT NULL CHECK (appeal IN ('yes','maybe','no')),
            variant VARCHAR(24) NOT NULL CHECK (variant IN ('schwarz','blau','beide','ueberarbeiten')),
            comment TEXT NOT NULL DEFAULT '',
            status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
            admin_note TEXT NOT NULL DEFAULT '',
            moderated_at TIMESTAMPTZ,
            moderated_by TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (campaign, client_token_hash)
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_public_reviews_campaign_status ON public_reviews (campaign, status, updated_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_public_reviews_submitter ON public_reviews (campaign, submitter_hash, updated_at DESC)`);


    // --------------------------------------------------------
    // PRIVATE SUPPORT- / SECURITY-MELDUNGEN · WEBSITE
    // Keine öffentliche Ausgabe. Kontakt-E-Mail ist optional;
    // Missbrauchserkennung persistiert nur einen HMAC-Hash.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS public_support_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            submission_hash CHAR(64) NOT NULL UNIQUE,
            submitter_hash CHAR(64) NOT NULL,
            category VARCHAR(24) NOT NULL CHECK (category IN ('security','account','privacy','technical','other')),
            priority VARCHAR(16) NOT NULL CHECK (priority IN ('normal','high','critical')),
            contact_email VARCHAR(254) NOT NULL DEFAULT '',
            subject VARCHAR(140) NOT NULL,
            message TEXT NOT NULL,
            source_path VARCHAR(320) NOT NULL DEFAULT '',
            status VARCHAR(16) NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','resolved','rejected')),
            admin_note TEXT NOT NULL DEFAULT '',
            handled_at TIMESTAMPTZ,
            handled_by TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_public_support_reports_status ON public_support_reports (status, priority, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_public_support_reports_submitter ON public_support_reports (submitter_hash, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_public_support_reports_retention ON public_support_reports (status, handled_at)`);


    // --------------------------------------------------------
    // CSP-VERSTOSS-TELEMETRIE · PUBLIC RESILIENCE PASS 15
    // Nur datensparsame, aggregierte Felder. Keine rohe IP, kein
    // User-Agent, keine Query-Strings und keine vollständigen Tokens.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS public_csp_reports (
            fingerprint CHAR(64) PRIMARY KEY,
            effective_directive VARCHAR(80) NOT NULL DEFAULT '',
            blocked_kind VARCHAR(24) NOT NULL DEFAULT 'unknown',
            blocked_host VARCHAR(255) NOT NULL DEFAULT '',
            document_route VARCHAR(240) NOT NULL DEFAULT '',
            source_route VARCHAR(240) NOT NULL DEFAULT '',
            status_code INTEGER NOT NULL DEFAULT 0,
            occurrences BIGINT NOT NULL DEFAULT 1,
            first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_public_csp_reports_last_seen ON public_csp_reports (last_seen DESC)`);


    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_billing_subscriptions (
            creator_id TEXT PRIMARY KEY REFERENCES creator_accounts(id) ON DELETE CASCADE,
            provider TEXT NOT NULL DEFAULT '',
            provider_customer_id TEXT NOT NULL DEFAULT '',
            provider_subscription_id TEXT NOT NULL DEFAULT '',
            plan TEXT NOT NULL DEFAULT 'free',
            status TEXT NOT NULL DEFAULT 'none',
            current_period_end TIMESTAMPTZ,
            cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_billing_subscriptions_status
        ON creator_billing_subscriptions (status, updated_at DESC)
    `);

    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS provider_price_id TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS grace_ends_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS currency VARCHAR(12) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS amount_minor BIGINT`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(24) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS last_invoice_status VARCHAR(40) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS last_event_id TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE creator_billing_subscriptions ADD COLUMN IF NOT EXISTS last_event_created BIGINT NOT NULL DEFAULT 0`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_billing_customer ON creator_billing_subscriptions(provider,provider_customer_id) WHERE provider_customer_id <> ''`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_billing_subscription ON creator_billing_subscriptions(provider,provider_subscription_id) WHERE provider_subscription_id <> ''`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_billing_events (
            event_id TEXT PRIMARY KEY,
            provider VARCHAR(40) NOT NULL,
            event_type VARCHAR(140) NOT NULL,
            creator_id TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            provider_customer_id TEXT NOT NULL DEFAULT '',
            provider_subscription_id TEXT NOT NULL DEFAULT '',
            event_created BIGINT NOT NULL DEFAULT 0,
            livemode BOOLEAN NOT NULL DEFAULT FALSE,
            outcome VARCHAR(40) NOT NULL DEFAULT 'received',
            summary JSONB NOT NULL DEFAULT '{}'::jsonb,
            processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_billing_events_created ON creator_billing_events(event_created DESC,processed_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_billing_events_creator ON creator_billing_events(creator_id,processed_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_production_evidence (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            kind VARCHAR(60) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'verified',
            source VARCHAR(80) NOT NULL DEFAULT 'manual',
            release_version VARCHAR(80) NOT NULL DEFAULT '',
            environment VARCHAR(80) NOT NULL DEFAULT 'production',
            target TEXT NOT NULL DEFAULT '',
            reference TEXT NOT NULL DEFAULT '',
            artifact_sha256 VARCHAR(80) NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ,
            created_by TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_production_evidence_kind ON creator_production_evidence(kind,observed_at DESC,created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_production_evidence_release ON creator_production_evidence(release_version,observed_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_release_acceptances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            protocol VARCHAR(80) NOT NULL,
            release_version VARCHAR(80) NOT NULL DEFAULT '',
            environment VARCHAR(80) NOT NULL DEFAULT 'production',
            target TEXT NOT NULL DEFAULT '',
            reference TEXT NOT NULL DEFAULT '',
            status VARCHAR(30) NOT NULL DEFAULT 'draft',
            step_results JSONB NOT NULL DEFAULT '[]'::jsonb,
            notes TEXT NOT NULL DEFAULT '',
            created_by TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_release_acceptance_release ON creator_release_acceptances(release_version,protocol,updated_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_release_cohorts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            release_version VARCHAR(80) NOT NULL DEFAULT '',
            name VARCHAR(160) NOT NULL,
            stage VARCHAR(30) NOT NULL DEFAULT 'pilot',
            target_testers INTEGER NOT NULL DEFAULT 5,
            status VARCHAR(30) NOT NULL DEFAULT 'planning',
            notes TEXT NOT NULL DEFAULT '',
            created_by TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_release_cohorts_release ON creator_release_cohorts(release_version,stage,updated_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_release_cohort_members (
            cohort_id UUID NOT NULL REFERENCES creator_release_cohorts(id) ON DELETE CASCADE,
            creator_id TEXT NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
            status VARCHAR(30) NOT NULL DEFAULT 'invited',
            sessions_required INTEGER NOT NULL DEFAULT 1,
            notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY(cohort_id,creator_id)
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_release_cohort_members_creator ON creator_release_cohort_members(creator_id,updated_at DESC)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_release_decisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            release_version VARCHAR(80) NOT NULL DEFAULT '',
            recommendation VARCHAR(30) NOT NULL DEFAULT 'hold',
            decision VARCHAR(30) NOT NULL DEFAULT 'hold',
            rationale TEXT NOT NULL,
            snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by TEXT REFERENCES creator_accounts(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_release_decisions_release ON creator_release_decisions(release_version,created_at DESC)`);





    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_widgets_creator_updated
        ON creator_widgets (
            creator_id,
            updated_at DESC
        )
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_widgets_public_token
        ON creator_widgets (
            public_token
        )
    `);


    // --------------------------------------------------------
    // WIDGET STUDIO V4 - LIVE DATA CORE / EVENT BUS
    //
    // Widgets lesen normalisierte Creator-Suite-Daten. Der
    // Provider kann spaeter Launcher/TikTok LIVE sein; aktuell
    // ist ausserdem ein klar gekennzeichneter Simulator moeglich.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_live_state (
            creator_id TEXT PRIMARY KEY,
            session_id TEXT,
            provider TEXT NOT NULL DEFAULT 'none',
            connected BOOLEAN NOT NULL DEFAULT FALSE,
            likes BIGINT NOT NULL DEFAULT 0,
            viewers BIGINT NOT NULL DEFAULT 0,
            shares BIGINT NOT NULL DEFAULT 0,
            gifts_count BIGINT NOT NULL DEFAULT 0,
            gifts_value NUMERIC(14,2) NOT NULL DEFAULT 0,
            followers_gained BIGINT NOT NULL DEFAULT 0,
            started_at TIMESTAMPTZ,
            last_event_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_creator_live_state_creator
                FOREIGN KEY (creator_id)
                REFERENCES creator_accounts (id)
                ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_live_events (
            id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL,
            session_id TEXT,
            provider TEXT NOT NULL DEFAULT 'simulator',
            event_key TEXT,
            event_type TEXT NOT NULL,
            actor_name TEXT,
            actor_avatar TEXT,
            amount BIGINT NOT NULL DEFAULT 1,
            event_value NUMERIC(14,2) NOT NULL DEFAULT 0,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_creator_live_events_creator
                FOREIGN KEY (creator_id)
                REFERENCES creator_accounts (id)
                ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_live_events_creator_created
        ON creator_live_events (creator_id, created_at DESC)
    `);

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_live_events_event_key
        ON creator_live_events (creator_id, provider, event_key)
        WHERE event_key IS NOT NULL
    `);

    // --------------------------------------------------------
    // WIDGET STUDIO V6 - LAUNCHER BRIDGE
    // Token werden nur gehasht gespeichert. Der Klartext wird
    // beim Erstellen genau einmal an den Creator ausgegeben.
    // --------------------------------------------------------

    await pool.query(`
        ALTER TABLE creator_live_state
        ADD COLUMN IF NOT EXISTS bridge_heartbeat_at TIMESTAMPTZ
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_live_bridges (
            id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL,
            label TEXT NOT NULL DEFAULT 'Creator Suite Launcher',
            token_hash TEXT NOT NULL UNIQUE,
            token_prefix TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            client_version TEXT,
            machine_name TEXT,
            capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
            last_seen_at TIMESTAMPTZ,
            last_connected_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            revoked_at TIMESTAMPTZ,
            CONSTRAINT fk_creator_live_bridges_creator
                FOREIGN KEY (creator_id)
                REFERENCES creator_accounts (id)
                ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_live_bridges_creator
        ON creator_live_bridges (creator_id, created_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_live_bridges_token_hash
        ON creator_live_bridges (token_hash)
        WHERE status = 'active'
    `);

    await pool.query(`
        ALTER TABLE creator_live_bridges
        ADD COLUMN IF NOT EXISTS stream_health JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    await pool.query(`
        ALTER TABLE creator_live_bridges
        ADD COLUMN IF NOT EXISTS stream_health_at TIMESTAMPTZ
    `);

    // --------------------------------------------------------
    // CREATOR SUITE V23 - LAUNCHER DEVICE LINK
    //
    // Klartext-Device-Secret und Bridge-Key werden niemals in
    // PostgreSQL gespeichert. Der Launcher erhält sie beim Start
    // der Kopplung und schützt sie lokal via safeStorage.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_launcher_device_links (
            id TEXT PRIMARY KEY,
            user_code TEXT NOT NULL UNIQUE,
            device_secret_hash TEXT NOT NULL UNIQUE,
            bridge_token_hash TEXT NOT NULL UNIQUE,
            bridge_token_prefix TEXT NOT NULL,
            creator_id TEXT,
            bridge_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            machine_name TEXT,
            client_version TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            approved_at TIMESTAMPTZ,
            consumed_at TIMESTAMPTZ,
            revoked_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_creator_launcher_device_links_creator
                FOREIGN KEY (creator_id)
                REFERENCES creator_accounts (id)
                ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_launcher_device_links_creator
        ON creator_launcher_device_links (creator_id, created_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_launcher_device_links_expires
        ON creator_launcher_device_links (expires_at)
    `);

    await pool.query(`
        ALTER TABLE creator_live_bridges
        ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'legacy_key'
    `);

    await pool.query(`
        ALTER TABLE creator_live_bridges
        ADD COLUMN IF NOT EXISTS device_link_id TEXT
    `);

    await pool.query(`
        ALTER TABLE creator_launcher_device_links
        ADD COLUMN IF NOT EXISTS credential_delivery TEXT NOT NULL DEFAULT 'start_legacy'
    `);


    // --------------------------------------------------------
    // WIDGET STUDIO V8 - SESSION HISTORY + INTERACTIONS
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_live_sessions (
            id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL,
            provider TEXT NOT NULL DEFAULT 'none',
            status TEXT NOT NULL DEFAULT 'live',
            likes BIGINT NOT NULL DEFAULT 0,
            viewers_peak BIGINT NOT NULL DEFAULT 0,
            shares BIGINT NOT NULL DEFAULT 0,
            gifts_count BIGINT NOT NULL DEFAULT 0,
            gifts_value NUMERIC(14,2) NOT NULL DEFAULT 0,
            followers_gained BIGINT NOT NULL DEFAULT 0,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_creator_live_sessions_creator
                FOREIGN KEY (creator_id) REFERENCES creator_accounts (id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_live_sessions_creator_started
        ON creator_live_sessions (creator_id, started_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_interaction_rules (
            id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT FALSE,
            cooldown_seconds INTEGER NOT NULL DEFAULT 20,
            min_amount BIGINT NOT NULL DEFAULT 1,
            template_text TEXT NOT NULL,
            output_kind TEXT NOT NULL DEFAULT 'launcher_tts',
            last_triggered_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (creator_id, event_type),
            CONSTRAINT fk_creator_interaction_rules_creator
                FOREIGN KEY (creator_id) REFERENCES creator_accounts (id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_stream_bot_cooldowns (
            creator_id TEXT NOT NULL,
            command TEXT NOT NULL,
            last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (creator_id, command),
            CONSTRAINT fk_creator_stream_bot_cooldowns_creator
                FOREIGN KEY (creator_id) REFERENCES creator_accounts (id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_live_actions (
            id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL,
            session_id TEXT,
            event_id TEXT,
            action_type TEXT NOT NULL DEFAULT 'launcher_tts',
            action_text TEXT NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            delivered_at TIMESTAMPTZ,
            acked_at TIMESTAMPTZ,
            CONSTRAINT fk_creator_live_actions_creator
                FOREIGN KEY (creator_id) REFERENCES creator_accounts (id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_live_actions_creator_created
        ON creator_live_actions (creator_id, created_at DESC)
    `);

    await pool.query(`ALTER TABLE creator_live_actions ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE creator_live_actions ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE creator_live_actions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE creator_live_actions ADD COLUMN IF NOT EXISTS last_error TEXT`);
    await pool.query(
        `UPDATE creator_live_actions
         SET expires_at = COALESCE(expires_at, created_at + ($1::int * INTERVAL '1 minute'))
         WHERE status IN ('pending','delivered')`,
        [ACTION_TTL_MINUTES]
    );
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_creator_live_actions_delivery
        ON creator_live_actions (creator_id, status, lease_until, created_at)
    `);

    // --------------------------------------------------------
    // CREATOR SETTINGS
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_settings (

            creator_id TEXT PRIMARY KEY,

            settings JSONB
                NOT NULL
                DEFAULT '{}'::jsonb,

            updated_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            CONSTRAINT
                fk_creator_settings_creator

            FOREIGN KEY (
                creator_id
            )

            REFERENCES creator_accounts (
                id
            )

            ON DELETE CASCADE

        )
    `);


    // --------------------------------------------------------
    // CREATOR MODULE STATE
    //
    // Hier können später getrennt gespeichert werden:
    //
    // editor
    // launcher
    // cut_studio
    // games
    // nexus
    // audio_studio
    // twitch
    // obs
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_module_state (

            creator_id TEXT
                NOT NULL,

            module_key TEXT
                NOT NULL,

            state JSONB
                NOT NULL
                DEFAULT '{}'::jsonb,

            updated_at TIMESTAMPTZ
                NOT NULL
                DEFAULT NOW(),

            PRIMARY KEY (
                creator_id,
                module_key
            ),

            CONSTRAINT
                fk_creator_module_state_creator

            FOREIGN KEY (
                creator_id
            )

            REFERENCES creator_accounts (
                id
            )

            ON DELETE CASCADE

        )
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
            idx_creator_module_state_creator

        ON creator_module_state (
            creator_id
        )
    `);


    // --------------------------------------------------------
    // SCHEMA BOOTSTRAP STATE
    //
    // Render-Rolling-Deploys koennen alte und neue Instanzen kurz
    // ueberlappen. Die aktuelle Schema-Generation wird deshalb erst
    // nach allen idempotenten DDL-Schritten persistiert. /api/health
    // kann so eine Instanz mit nicht passendem DB-Stand fail-closed
    // aus dem Traffic nehmen.
    // --------------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS creator_database_schema_state (
            slot TEXT PRIMARY KEY,
            schema_version INTEGER NOT NULL,
            backend_version TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT creator_database_schema_state_slot_check
                CHECK (slot = 'production')
        )
    `);

    await pool.query(
        `INSERT INTO creator_database_schema_state (slot, schema_version, backend_version, applied_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (slot) DO UPDATE SET
            schema_version = EXCLUDED.schema_version,
            backend_version = EXCLUDED.backend_version,
            applied_at = NOW()`,
        [DATABASE_SCHEMA_SLOT, DATABASE_SCHEMA_VERSION, BACKEND_VERSION]
    );


    await cleanupExpiredOAuthStates();

    await cleanupExpiredCreatorSessions();

    await cleanupOldSecurityEvents();

    await cleanupOldAdminAuditEvents();

    await cleanupOldSupportReports();

    console.log(
        "PostgreSQL bereit."
    );

}


// ============================================================
// CLEANUP
// ============================================================

async function cleanupExpiredOAuthStates() {

    await pool.query(`
        DELETE FROM tiktok_oauth_states
        WHERE expires_at < NOW()
    `);

}


async function cleanupExpiredCreatorSessions() {

    await pool.query(`
        DELETE FROM creator_sessions
        WHERE expires_at < NOW()
           OR last_seen_at < NOW() - ($1::bigint * INTERVAL '1 millisecond')
    `,[CREATOR_SESSION_IDLE_TTL_MS]);

}


async function cleanupOldSecurityEvents() {

    await pool.query(
        `
        DELETE FROM creator_security_events
        WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
        `,
        [
            SECURITY_EVENT_RETENTION_DAYS
        ]
    );

}

async function cleanupOldAdminAuditEvents() {
    const client=await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)",[ADMIN_AUDIT_LOCK_ID]);
        const cutoff=(await client.query(
            `SELECT id,event_hash FROM creator_admin_audit_events
             WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
               AND chain_version=$2 AND event_hash<>''
             ORDER BY id DESC LIMIT 1`,
            [ADMIN_AUDIT_RETENTION_DAYS,ADMIN_AUDIT_CHAIN_VERSION]
        )).rows[0];
        if(cutoff){
            await client.query(
                `INSERT INTO creator_admin_audit_checkpoint(id,anchor_event_id,anchor_event_hash,anchored_at)
                 VALUES(1,$1,$2,NOW())
                 ON CONFLICT(id) DO UPDATE SET anchor_event_id=EXCLUDED.anchor_event_id,anchor_event_hash=EXCLUDED.anchor_event_hash,anchored_at=EXCLUDED.anchored_at`,
                [cutoff.id,cutoff.event_hash]
            );
        }
        await client.query(
            `DELETE FROM creator_admin_audit_events WHERE created_at < NOW() - ($1 * INTERVAL '1 day')`,
            [ADMIN_AUDIT_RETENTION_DAYS]
        );
        await client.query("COMMIT");
    } catch(error) {
        await client.query("ROLLBACK").catch(()=>{});
        throw error;
    } finally {
        client.release();
    }
}

async function cleanupOldSupportReports() {
    // Privacy-by-default: Kontakt-E-Mails werden nach Abschluss früh entfernt;
    // abgeschlossene Meldungen bleiben nur begrenzt für Nachvollziehbarkeit bestehen.
    const contactResult=await pool.query(
        `UPDATE public_support_reports
         SET contact_email='',updated_at=NOW()
         WHERE contact_email<>''
           AND status IN ('resolved','rejected')
           AND handled_at IS NOT NULL
           AND handled_at < NOW() - ($1::int * INTERVAL '1 day')`,
        [PUBLIC_SUPPORT_CONTACT_RETENTION_DAYS]
    );
    const deleteResult=await pool.query(
        `DELETE FROM public_support_reports
         WHERE status IN ('resolved','rejected')
           AND handled_at IS NOT NULL
           AND handled_at < NOW() - ($1::int * INTERVAL '1 day')`,
        [PUBLIC_SUPPORT_RESOLVED_RETENTION_DAYS]
    );
    return {
        contact_emails_removed:Number(contactResult.rowCount||0),
        reports_deleted:Number(deleteResult.rowCount||0)
    };
}


// ============================================================
// CREATOR ID
// ============================================================

function normalizeCreatorId(
    value
) {

    const id =
        String(
            value ||
            DEFAULT_CREATOR_ID
        ).trim();

    if (
        !/^[A-Za-z0-9_-]{1,80}$/.test(
            id
        )
    ) {

        throw new Error(
            "Ungültige Creator-ID."
        );

    }

    return id;

}


function creatorIdFromRequest(
    req
) {

    return normalizeCreatorId(

        req.get(
            "X-CFS-Creator-ID"
        ) ||

        req.query.creator_id ||

        DEFAULT_CREATOR_ID

    );

}


// ============================================================
// SECURITY
// ============================================================

function hashValue(
    value
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            String(value)
        )
        .digest(
            "hex"
        );

}


function safeEqualText(
    a,
    b
) {

    const left =
        Buffer.from(
            String(
                a ||
                ""
            )
        );

    const right =
        Buffer.from(
            String(
                b ||
                ""
            )
        );

    if (
        left.length !==
        right.length
    ) {

        return false;

    }

    return crypto
        .timingSafeEqual(
            left,
            right
        );

}


// ============================================================
// CREATOR ACCOUNT HELFER
// ============================================================

function normalizeEmail(
    value
) {

    return String(
        value ||
        ""
    )
        .trim()
        .toLowerCase();

}


function validEmail(
    value
) {

    const email =
        normalizeEmail(
            value
        );

    return (
        email.length <=
            254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    );

}


function normalizeDisplayName(
    value
) {

    return String(
        value ||
        ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .slice(
            0,
            80
        );

}


function createCreatorAccountId() {

    return (
        "creator_" +
        crypto
            .randomBytes(
                16
            )
            .toString(
                "hex"
            )
    );

}


function createSessionToken() {

    return crypto
        .randomBytes(
            32
        )
        .toString(
            "hex"
        );

}


function hashSessionToken(
    token
) {

    return hashValue(
        token
    );

}


function scryptAsync(
    password,
    salt,
    kdfVersion = 1
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const done = (
                error,
                derivedKey
            ) => {

                if (
                    error
                ) {

                    reject(
                        error
                    );

                    return;

                }

                resolve(
                    derivedKey
                );

            };

            if (
                Number(kdfVersion) >=
                PASSWORD_KDF_VERSION
            ) {

                crypto.scrypt(
                    password,
                    salt,
                    64,
                    SCRYPT_V2_OPTIONS,
                    done
                );

                return;

            }

            // Legacy V1: Node-Defaults beibehalten, damit bestehende
            // Accounts weiter verifiziert und beim nächsten Login
            // transparent auf die stärkere V2-Konfiguration migriert werden.
            crypto.scrypt(
                password,
                salt,
                64,
                done
            );

        }
    );

}


const COMMON_PASSWORD_BLOCKLIST =
    new Set([
        "passwordpassword",
        "password123456",
        "password123456789",
        "123456789012345",
        "qwertyqwertyqwerty",
        "letmeinletmeinletmein",
        "iloveyouiloveyou",
        "adminadminadminadmin",
        "changemechangeme",
        "cfs_zocktcfs_zockt",
        "cfszocktcfszockt"
    ]);


function normalizedPasswordPolicyValue(
    value
) {

    return String(value || "")
        .normalize("NFKC")
        .trim()
        .toLowerCase();

}


function passwordPolicyError(
    password,
    context = {}
) {

    const value = String(password || "");

    if (
        value.length <
        PASSWORD_MIN_LENGTH
    ) {

        return `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`;

    }

    if (
        value.length >
        PASSWORD_MAX_LENGTH
    ) {

        return `Das Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen lang sein.`;

    }

    const normalized =
        normalizedPasswordPolicyValue(
            value
        );

    const email =
        normalizedPasswordPolicyValue(
            context.email
        );

    const emailLocal =
        email.includes("@")
            ? email.split("@")[0]
            : "";

    const displayName =
        normalizedPasswordPolicyValue(
            context.displayName
        );

    if (
        COMMON_PASSWORD_BLOCKLIST.has(
            normalized
        ) ||
        (email && normalized === email) ||
        (emailLocal && normalized === emailLocal) ||
        (displayName && normalized === displayName)
    ) {

        return "Dieses Passwort ist zu leicht vorhersehbar. Bitte verwende eine längere, eigenständige Passphrase.";

    }

    return "";

}


async function createPasswordHash(
    password
) {

    const salt =
        crypto
            .randomBytes(
                16
            )
            .toString(
                "hex"
            );

    const derivedKey =
        await scryptAsync(
            String(
                password
            ),
            salt,
            PASSWORD_KDF_VERSION
        );

    return {

        salt,

        hash:
            derivedKey
                .toString(
                    "hex"
                ),

        kdfVersion:
            PASSWORD_KDF_VERSION

    };

}


async function verifyPassword(
    password,
    salt,
    storedHash,
    kdfVersion = 1
) {

    try {

        const derivedKey =
            await scryptAsync(
                String(
                    password
                ),
                String(
                    salt
                ),
                Number(kdfVersion || 1)
            );

        const stored =
            Buffer.from(
                String(
                    storedHash
                ),
                "hex"
            );

        if (
            derivedKey.length !==
            stored.length
        ) {

            return false;

        }

        return crypto
            .timingSafeEqual(
                derivedKey,
                stored
            );

    }
    catch {

        return false;

    }

}


// ============================================================
// ACCOUNT E-MAIL / VERIFICATION / RECOVERY
// ============================================================

async function genericAccountMailResponse(res, payload, startedAt) {
    const elapsed = Date.now() - Number(startedAt || Date.now());
    const waitMs = Math.max(0, 350 - elapsed);
    if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    return res.json(payload);
}

function publicAccountMailStatus() {
    return {
        enabled: ACCOUNT_MAIL_CONFIG.enabled,
        mode: ACCOUNT_MAIL_CONFIG.enabled ? "webhook" : "disabled",
        email_verification_available: ACCOUNT_MAIL_CONFIG.enabled,
        email_verification_required: ACCOUNT_MAIL_CONFIG.verificationRequired,
        password_recovery_available: ACCOUNT_MAIL_CONFIG.enabled,
        durable_delivery: ACCOUNT_MAIL_CONFIG.enabled,
        delivery_max_attempts: ACCOUNT_MAIL_CONFIG.enabled ? ACCOUNT_MAIL_OUTBOX_MAX_ATTEMPTS : 0
    };
}

function accountActionLink(purpose, token) {
    const safeToken = encodeURIComponent(String(token || ""));
    if (purpose === "verify_email") {
        return `${APP_BASE_URL}/pages/verify-email.html#token=${safeToken}`;
    }
    return `${APP_BASE_URL}/pages/reset-password.html#token=${safeToken}`;
}

async function cleanupAccountActionTokens() {
    await pool.query(`
        DELETE FROM creator_account_action_tokens
        WHERE expires_at <= NOW() OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours')
    `);
}

async function issueAccountActionToken(creatorId, purpose, ttlMs) {
    await cleanupAccountActionTokens();
    const token = createAccountActionToken();
    const tokenHash = accountActionTokenHash(purpose, token);
    const expiresAt = new Date(Date.now() + ttlMs);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`SELECT id FROM creator_accounts WHERE id=$1 FOR UPDATE`,[creatorId]);
        await client.query(
            `DELETE FROM creator_account_action_tokens WHERE creator_id=$1 AND purpose=$2 AND used_at IS NULL`,
            [creatorId, purpose]
        );
        await client.query(
            `INSERT INTO creator_account_action_tokens(id,creator_id,purpose,token_hash,expires_at,created_at) VALUES($1,$2,$3,$4,$5,NOW())`,
            [crypto.randomUUID(), creatorId, purpose, tokenHash, expiresAt]
        );
        await client.query("COMMIT");
        return { token, expiresAt };
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        throw error;
    } finally {
        client.release();
    }
}

async function findUsableAccountActionToken(purpose, token, client = pool) {
    if (!validAccountActionToken(token)) return null;
    const tokenHash = accountActionTokenHash(purpose, token);
    const result = await client.query(
        `SELECT t.id,t.creator_id,t.purpose,t.expires_at,a.email,a.display_name,a.status,a.email_verified_at
         FROM creator_account_action_tokens t
         INNER JOIN creator_accounts a ON a.id=t.creator_id
         WHERE t.token_hash=$1 AND t.purpose=$2 AND t.used_at IS NULL AND t.expires_at>NOW()
         LIMIT 1
         FOR UPDATE OF t`,
        [tokenHash, purpose]
    );
    return result.rows[0] || null;
}

async function markAccountActionTokenUsed(tokenId, client = pool) {
    await client.query(
        `UPDATE creator_account_action_tokens SET used_at=NOW() WHERE id=$1 AND used_at IS NULL`,
        [tokenId]
    );
}

async function revokeCreatorPendingAuthArtifacts(client, creatorId, {keepPasswordResetTokenId=""} = {}) {
    await client.query(`DELETE FROM creator_mfa_challenges WHERE creator_id=$1`,[creatorId]);
    await client.query(`DELETE FROM creator_webauthn_challenges WHERE creator_id=$1`,[creatorId]);
    await client.query(`DELETE FROM tiktok_oauth_states WHERE creator_id=$1`,[creatorId]);
    if (keepPasswordResetTokenId) {
        await client.query(
            `DELETE FROM creator_account_action_tokens WHERE creator_id=$1 AND purpose='password_reset' AND id<>$2`,
            [creatorId,keepPasswordResetTokenId]
        );
    } else {
        await client.query(
            `DELETE FROM creator_account_action_tokens WHERE creator_id=$1 AND purpose='password_reset'`,
            [creatorId]
        );
    }
}

const ACCOUNT_MAIL_OUTBOX_WORKER_ID = crypto.randomUUID();
let accountMailOutboxTimer = null;
let accountMailOutboxRunPromise = null;
let accountMailOutboxStopping = false;

function accountMailOutboxExpiry(kind) {
    const key = String(kind || "").toLowerCase();
    if (key === "password_reset") return new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    if (key === "email_verification") return new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
}
function accountMailRetryDelayMs(attempt) {
    const n = Math.max(1, Math.min(ACCOUNT_MAIL_OUTBOX_MAX_ATTEMPTS, Number(attempt || 1)));
    return Math.min(30 * 60 * 1000, 5 * 1000 * (5 ** (n - 1)));
}
function accountMailErrorCode(error) {
    const status = Number(error?.status || 0);
    if (status >= 100 && status <= 599) return `relay_http_${status}`;
    const code = String(error?.code || "delivery_failed").toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 64);
    return code || "delivery_failed";
}
function accountMailRetryable(error) {
    const status = Number(error?.status || 0);
    if (!status) return true;
    if ([408, 425, 429].includes(status)) return true;
    if (status >= 500) return true;
    return false;
}
async function enqueueAccountMail(message, {creatorId = null, expiresAt = null} = {}) {
    if (!ACCOUNT_MAIL_CONFIG.enabled) {
        const error = new Error("Account-Mailversand ist nicht konfiguriert.");
        error.code = "account_mail_unavailable";
        throw error;
    }
    if (NODE_ENV === "production" && !TOKEN_ENCRYPTION_KEY) throw new Error("Account-Mail-Outbox benötigt in Produktion CFS_TOKEN_ENCRYPTION_KEY.");
    const normalized = normalizeMailMessage(message);
    const id = crypto.randomUUID();
    const payloadCiphertext = encryptSecret(JSON.stringify(normalized));
    const expiry = expiresAt instanceof Date && Number.isFinite(expiresAt.getTime()) ? expiresAt : accountMailOutboxExpiry(normalized.kind);
    if (expiry.getTime() <= Date.now()) throw new Error("Account-Mail ist bereits abgelaufen.");
    await pool.query(
        `INSERT INTO creator_mail_outbox(
            id,creator_id,kind,payload_ciphertext,status,attempts,max_attempts,available_at,expires_at,created_at,updated_at
         ) VALUES($1,$2,$3,$4,'pending',0,$5,NOW(),$6,NOW(),NOW())`,
        [id, creatorId || null, normalized.kind, payloadCiphertext, ACCOUNT_MAIL_OUTBOX_MAX_ATTEMPTS, expiry]
    );
    kickAccountMailOutboxWorker();
    return {queued:true,delivery_id:id,expires_at:expiry};
}
async function queueAccountMail(message, options = {}) {
    try { return await enqueueAccountMail(message, options); }
    catch (error) { safeLogError("account-mail-outbox-enqueue", error); return {queued:false,delivery_id:null,expires_at:null}; }
}
async function cleanupAccountMailOutbox() {
    await pool.query(
        `UPDATE creator_mail_outbox
         SET status='dead',payload_ciphertext=NULL,locked_at=NULL,locked_by=NULL,last_error_code='expired',updated_at=NOW()
         WHERE status IN ('pending','sending') AND expires_at<=NOW()`
    );
    await pool.query(
        `DELETE FROM creator_mail_outbox
         WHERE payload_ciphertext IS NULL AND status IN ('sent','dead')
           AND updated_at < NOW() - ($1::int * INTERVAL '1 day')`,
        [ACCOUNT_MAIL_OUTBOX_METADATA_RETENTION_DAYS]
    );
}
async function claimNextAccountMail() {
    const result = await pool.query(
        `WITH candidate AS (
            SELECT id FROM creator_mail_outbox
            WHERE payload_ciphertext IS NOT NULL AND expires_at>NOW() AND attempts<max_attempts AND available_at<=NOW()
              AND (status='pending' OR (status='sending' AND (locked_at IS NULL OR locked_at < NOW() - ($2::bigint * INTERVAL '1 millisecond'))))
            ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE creator_mail_outbox o
         SET status='sending',attempts=o.attempts+1,locked_at=NOW(),locked_by=$1,updated_at=NOW()
         FROM candidate WHERE o.id=candidate.id RETURNING o.*`,
        [ACCOUNT_MAIL_OUTBOX_WORKER_ID, ACCOUNT_MAIL_OUTBOX_LOCK_MS]
    );
    return result.rows[0] || null;
}
async function finishAccountMailDelivery(row) {
    await pool.query(
        `UPDATE creator_mail_outbox
         SET status='sent',payload_ciphertext=NULL,sent_at=NOW(),locked_at=NULL,locked_by=NULL,last_error_code=NULL,updated_at=NOW()
         WHERE id=$1 AND locked_by=$2`,
        [row.id, ACCOUNT_MAIL_OUTBOX_WORKER_ID]
    );
}
async function failAccountMailDelivery(row, error) {
    const retryable = accountMailRetryable(error);
    const terminal = !retryable || Number(row.attempts || 0) >= Number(row.max_attempts || ACCOUNT_MAIL_OUTBOX_MAX_ATTEMPTS) || new Date(row.expires_at).getTime() <= Date.now();
    const errorCode = accountMailErrorCode(error);
    if (terminal) {
        await pool.query(
            `UPDATE creator_mail_outbox
             SET status='dead',payload_ciphertext=NULL,locked_at=NULL,locked_by=NULL,last_error_code=$3,updated_at=NOW()
             WHERE id=$1 AND locked_by=$2`,
            [row.id, ACCOUNT_MAIL_OUTBOX_WORKER_ID, errorCode]
        );
        safeLogError(`account-mail-outbox:${errorCode}`, error);
        return;
    }
    const delayMs = accountMailRetryDelayMs(row.attempts);
    await pool.query(
        `UPDATE creator_mail_outbox
         SET status='pending',available_at=NOW() + ($3::bigint * INTERVAL '1 millisecond'),locked_at=NULL,locked_by=NULL,last_error_code=$4,updated_at=NOW()
         WHERE id=$1 AND locked_by=$2`,
        [row.id, ACCOUNT_MAIL_OUTBOX_WORKER_ID, delayMs, errorCode]
    );
}
async function deliverClaimedAccountMail(row) {
    let message;
    try { message = normalizeMailMessage(JSON.parse(decryptSecret(row.payload_ciphertext))); }
    catch (error) {
        await pool.query(
            `UPDATE creator_mail_outbox
             SET status='dead',payload_ciphertext=NULL,locked_at=NULL,locked_by=NULL,last_error_code='payload_invalid',updated_at=NOW()
             WHERE id=$1 AND locked_by=$2`,
            [row.id, ACCOUNT_MAIL_OUTBOX_WORKER_ID]
        );
        safeLogError("account-mail-outbox:payload_invalid", error);
        return;
    }
    try {
        await sendAccountMail(ACCOUNT_MAIL_CONFIG, message, globalThis.fetch, {deliveryId:row.id});
        await finishAccountMailDelivery(row);
    } catch (error) { await failAccountMailDelivery(row, error); }
}
async function drainAccountMailOutbox() {
    await cleanupAccountMailOutbox();
    for (let index = 0; index < ACCOUNT_MAIL_OUTBOX_BATCH && !accountMailOutboxStopping; index += 1) {
        const row = await claimNextAccountMail();
        if (!row) break;
        await deliverClaimedAccountMail(row);
    }
}
async function accountMailOutboxStats() {
    if (!ACCOUNT_MAIL_CONFIG.enabled) return {enabled:false,pending:0,sending:0,dead:0,oldest_pending_seconds:null};
    const result = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE status='pending')::int AS pending,
            COUNT(*) FILTER (WHERE status='sending')::int AS sending,
            COUNT(*) FILTER (WHERE status='dead' AND updated_at > NOW() - INTERVAL '24 hours')::int AS dead,
            EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status='pending')))::int AS oldest_pending_seconds
        FROM creator_mail_outbox
    `);
    const row = result.rows[0] || {};
    return {enabled:true,pending:Number(row.pending||0),sending:Number(row.sending||0),dead:Number(row.dead||0),oldest_pending_seconds:row.oldest_pending_seconds==null?null:Number(row.oldest_pending_seconds),max_attempts:ACCOUNT_MAIL_OUTBOX_MAX_ATTEMPTS};
}
function kickAccountMailOutboxWorker() {
    if (!ACCOUNT_MAIL_CONFIG.enabled || accountMailOutboxStopping || accountMailOutboxRunPromise) return;
    accountMailOutboxRunPromise = Promise.resolve().then(() => drainAccountMailOutbox()).catch(error => safeLogError("account-mail-outbox-worker", error)).finally(() => { accountMailOutboxRunPromise = null; });
}
function startAccountMailOutboxWorker() {
    if (!ACCOUNT_MAIL_CONFIG.enabled || accountMailOutboxTimer) return;
    accountMailOutboxStopping = false;
    accountMailOutboxTimer = setInterval(kickAccountMailOutboxWorker, ACCOUNT_MAIL_OUTBOX_POLL_MS);
    accountMailOutboxTimer.unref?.();
    kickAccountMailOutboxWorker();
}
async function stopAccountMailOutboxWorker() {
    accountMailOutboxStopping = true;
    if (accountMailOutboxTimer) clearInterval(accountMailOutboxTimer);
    accountMailOutboxTimer = null;
    if (accountMailOutboxRunPromise) await Promise.race([accountMailOutboxRunPromise,new Promise(resolve => setTimeout(resolve, 12_000))]);
}

// ============================================================
// PRODUCTION MONITORING / ALERTING · R65
//
// Der Monitor speichert ausschließlich aggregierte Betriebsmetriken.
// Keine IPs, E-Mail-Adressen, Tokens, Request-Bodies oder Creator-Inhalte.
// Ein PostgreSQL Advisory Lock verhindert doppelte Alarmierung bei mehreren
// App-Instanzen. DB-Ausfälle werden direkt über den externen Webhook gemeldet,
// weil in diesem Fall bewusst keine DB-Outbox vorausgesetzt werden kann.
// ============================================================

const PRODUCTION_MONITOR_ADVISORY_LOCK = 65065001;
let productionMonitorTimer = null;
let productionMonitorRunPromise = null;
let productionMonitorStopping = false;
let productionMonitorRuntimeUnavailable = false;
let productionMonitorLastDirectAlertAt = 0;

function monitorDeliveryErrorCode(error) {
    const status=Number(error?.status||0);
    if(status>=100&&status<=599)return `webhook_http_${status}`;
    return String(error?.code||"delivery_failed").toLowerCase().replace(/[^a-z0-9_-]/g,"_").slice(0,80)||"delivery_failed";
}
function productionMonitorWebhookHost() {
    try { return PRODUCTION_MONITOR_CONFIG.webhookUrl ? new URL(PRODUCTION_MONITOR_CONFIG.webhookUrl).hostname : ""; } catch { return ""; }
}
async function collectProductionMonitorMetrics() {
    const started=Date.now();
    await pool.query("SELECT 1");
    const dbLatencyMs=Date.now()-started;
    const [mail,billing,auth,incident,operations]=await Promise.all([
        accountMailOutboxStats(),
        BILLING_CONFIG.enabled
            ? pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE outcome='failed' AND processed_at>=NOW()-INTERVAL '15 minutes')::int AS failed_15m,
                    COUNT(*) FILTER (WHERE outcome='processing' AND processed_at<NOW()-INTERVAL '10 minutes')::int AS stuck_processing
                FROM creator_billing_events
            `).then(r=>({enabled:true,failed_15m:Number(r.rows[0]?.failed_15m||0),stuck_processing:Number(r.rows[0]?.stuck_processing||0)}))
            : Promise.resolve({enabled:false,failed_15m:0,stuck_processing:0}),
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE event_type='login_throttled' AND created_at>=NOW()-INTERVAL '15 minutes')::int AS login_throttled_15m,
                COUNT(*) FILTER (WHERE event_type='mfa_after_password_failed' AND created_at>=NOW()-INTERVAL '15 minutes')::int AS mfa_failed_15m,
                COUNT(*) FILTER (WHERE event_type IN ('account_elevation_failed','admin_elevation_failed') AND created_at>=NOW()-INTERVAL '15 minutes')::int AS stepup_failed_15m,
                COUNT(*) FILTER (WHERE event_type='password_reset_requested' AND created_at>=NOW()-INTERVAL '15 minutes')::int AS password_reset_requested_15m
            FROM creator_security_events
        `).then(r=>{const row=r.rows[0]||{};return{login_throttled_15m:Number(row.login_throttled_15m||0),mfa_failed_15m:Number(row.mfa_failed_15m||0),stepup_failed_15m:Number(row.stepup_failed_15m||0),password_reset_requested_15m:Number(row.password_reset_requested_15m||0)}}),
        getWebsiteIncidentState(),
        pool.query(`
            SELECT kind,
                   MAX(observed_at) FILTER (WHERE status='success') AS last_success_at,
                   MAX(observed_at) FILTER (WHERE status='failed') AS last_failure_at
            FROM creator_operational_evidence
            WHERE kind IN ('logical_backup','recovery_drill')
            GROUP BY kind
        `).then(r=>{
            const result={backup_last_success_at:null,backup_last_failure_at:null,recovery_last_success_at:null,recovery_last_failure_at:null};
            for(const row of r.rows){
                if(row.kind==='logical_backup'){result.backup_last_success_at=row.last_success_at||null;result.backup_last_failure_at=row.last_failure_at||null;}
                if(row.kind==='recovery_drill'){result.recovery_last_success_at=row.last_success_at||null;result.recovery_last_failure_at=row.last_failure_at||null;}
            }
            return result;
        })
    ]);
    return{
        database:{connected:true},
        db_latency_ms:dbLatencyMs,
        mail,
        billing,
        auth,
        incident:{mode:String(incident?.mode||"normal")},
        operations,
        process:{uptime_seconds:Math.round(process.uptime())}
    };
}
function publicProductionMonitorAlert(row={}) {
    return{
        alert_key:String(row.alert_key||""),state:String(row.state||""),severity:String(row.severity||""),
        title:String(row.title||""),summary:String(row.summary||""),details:row.details&&typeof row.details==='object'?row.details:{},
        first_seen_at:row.first_seen_at||null,last_seen_at:row.last_seen_at||null,resolved_at:row.resolved_at||null,
        occurrences:Number(row.occurrences||0),last_notified_at:row.last_notified_at||null,
        notification_failures:Number(row.notification_failures||0),last_delivery_error:String(row.last_delivery_error||"")
    };
}
async function deliverProductionMonitorAlert(row,{status="open",summary=""}={}) {
    if(!PRODUCTION_MONITOR_CONFIG.enabled)return{delivered:false,reason:"disabled"};
    try{
        await sendProductionMonitorAlert(PRODUCTION_MONITOR_CONFIG,{
            alert_id:crypto.randomUUID(),alert_key:row.alert_key,status,severity:row.severity,title:row.title,
            summary:summary||row.summary,observed_at:new Date().toISOString(),service:APP_NAME,version:BACKEND_VERSION,environment:NODE_ENV,details:row.details||{}
        });
        await pool.query(`UPDATE creator_production_monitor_alerts SET last_notified_at=NOW(),last_delivery_error=NULL WHERE alert_key=$1`,[row.alert_key]);
        return{delivered:true};
    }catch(error){
        const code=monitorDeliveryErrorCode(error);
        await pool.query(`UPDATE creator_production_monitor_alerts SET notification_failures=notification_failures+1,last_delivery_error=$2 WHERE alert_key=$1`,[row.alert_key,code]).catch(()=>{});
        safeLogError(`production-monitor-delivery:${code}`,error);
        return{delivered:false,reason:code};
    }
}
async function reconcileProductionMonitorAlerts(evaluation) {
    const existingRows=(await pool.query(`SELECT * FROM creator_production_monitor_alerts`)).rows;
    const existing=new Map(existingRows.map(row=>[String(row.alert_key),row]));
    const activeKeys=new Set();
    const repeatMs=PRODUCTION_MONITOR_CONFIG.repeatMinutes*60*1000;

    for(const alert of evaluation.alerts||[]){
        activeKeys.add(alert.alert_key);
        const previous=existing.get(alert.alert_key);
        const reopen=!previous||previous.state!=="open";
        const severityChanged=Boolean(previous&&previous.severity!==alert.severity);
        const row=(await pool.query(`
            INSERT INTO creator_production_monitor_alerts(alert_key,state,severity,title,summary,details,first_seen_at,last_seen_at,resolved_at,occurrences)
            VALUES($1,'open',$2,$3,$4,$5::jsonb,NOW(),NOW(),NULL,1)
            ON CONFLICT(alert_key) DO UPDATE SET
                state='open',severity=EXCLUDED.severity,title=EXCLUDED.title,summary=EXCLUDED.summary,details=EXCLUDED.details,
                first_seen_at=CASE WHEN creator_production_monitor_alerts.state='resolved' THEN NOW() ELSE creator_production_monitor_alerts.first_seen_at END,
                last_seen_at=NOW(),resolved_at=NULL,occurrences=creator_production_monitor_alerts.occurrences+1
            RETURNING *
        `,[alert.alert_key,alert.severity,alert.title,alert.summary,JSON.stringify(alert.details||{})])).rows[0];
        const lastNotified=row.last_notified_at?new Date(row.last_notified_at).getTime():0;
        if(PRODUCTION_MONITOR_CONFIG.enabled&&(reopen||severityChanged||!lastNotified||Date.now()-lastNotified>=repeatMs)){
            await deliverProductionMonitorAlert(row,{status:"open"});
        }
    }

    for(const row of existingRows){
        if(row.state!=="open"||activeKeys.has(String(row.alert_key)))continue;
        const resolved=(await pool.query(`
            UPDATE creator_production_monitor_alerts
            SET state='resolved',resolved_at=NOW(),last_seen_at=NOW()
            WHERE alert_key=$1 AND state='open' RETURNING *
        `,[row.alert_key])).rows[0];
        if(resolved&&PRODUCTION_MONITOR_CONFIG.enabled){
            await deliverProductionMonitorAlert(resolved,{status:"resolved",summary:`Behoben: ${resolved.summary}`});
        }
    }

    await pool.query(`DELETE FROM creator_production_monitor_alerts WHERE state='resolved' AND resolved_at < NOW() - ($1::int * INTERVAL '1 day')`,[PRODUCTION_MONITOR_RETENTION_DAYS]);
}
async function sendDirectProductionMonitorAlert({status="open",alertKey="monitor.runtime",severity="critical",title="Production Monitor nicht verfügbar",summary="Der interne Production-Monitor konnte keinen vollständigen Lauf ausführen."}={}) {
    if(!PRODUCTION_MONITOR_CONFIG.enabled)return false;
    try{
        await sendProductionMonitorAlert(PRODUCTION_MONITOR_CONFIG,{alert_id:crypto.randomUUID(),alert_key:alertKey,status,severity,title,summary,observed_at:new Date().toISOString(),service:APP_NAME,version:BACKEND_VERSION,environment:NODE_ENV,details:{}});
        return true;
    }catch(error){safeLogError("production-monitor-direct-delivery",error);return false;}
}
async function runProductionMonitor() {
    let lockClient=null,locked=false;
    try{
        lockClient=await pool.connect();
        const lockResult=await lockClient.query(`SELECT pg_try_advisory_lock($1::bigint) AS locked`,[PRODUCTION_MONITOR_ADVISORY_LOCK]);
        locked=Boolean(lockResult.rows[0]?.locked);
        if(!locked)return;

        const metrics=await collectProductionMonitorMetrics();
        const evaluation=evaluateProductionMonitor(metrics,PRODUCTION_MONITOR_CONFIG);
        await reconcileProductionMonitorAlerts(evaluation);
        const snapshot={schema:1,generated_at:new Date().toISOString(),status:evaluation.status,severities:evaluation.severities,metrics};
        await pool.query(`
            INSERT INTO creator_production_monitor_state(slot,status,last_run_at,last_success_at,snapshot,updated_at)
            VALUES('production',$1,NOW(),NOW(),$2::jsonb,NOW())
            ON CONFLICT(slot) DO UPDATE SET status=EXCLUDED.status,last_run_at=NOW(),last_success_at=NOW(),snapshot=EXCLUDED.snapshot,updated_at=NOW()
        `,[evaluation.status,JSON.stringify(snapshot)]);

        if(productionMonitorRuntimeUnavailable){
            productionMonitorRuntimeUnavailable=false;
            productionMonitorLastDirectAlertAt=0;
            await sendDirectProductionMonitorAlert({status:"resolved",alertKey:"monitor.runtime",severity:"critical",title:"Production Monitor wieder verfügbar",summary:"Datenbank und Monitoring-Lauf sind wieder erreichbar."});
        }
    }catch(error){
        safeLogError("production-monitor-run",error);
        productionMonitorRuntimeUnavailable=true;
        const cooldownMs=Math.max(15*60*1000,PRODUCTION_MONITOR_CONFIG.repeatMinutes*60*1000);
        if(PRODUCTION_MONITOR_CONFIG.enabled&&(Date.now()-productionMonitorLastDirectAlertAt>=cooldownMs)){
            productionMonitorLastDirectAlertAt=Date.now();
            await sendDirectProductionMonitorAlert({status:"open",alertKey:"monitor.runtime",severity:"critical",title:"Production Monitor / Datenbank nicht erreichbar",summary:"Der Production-Monitor konnte keinen vollständigen Datenbank-/Health-Lauf ausführen."});
        }
    }finally{
        if(lockClient){
            if(locked)await lockClient.query(`SELECT pg_advisory_unlock($1::bigint)`,[PRODUCTION_MONITOR_ADVISORY_LOCK]).catch(()=>{});
            lockClient.release();
        }
    }
}
function kickProductionMonitorWorker() {
    if(productionMonitorStopping||productionMonitorRunPromise)return;
    productionMonitorRunPromise=Promise.resolve().then(()=>runProductionMonitor()).finally(()=>{productionMonitorRunPromise=null;});
}
function startProductionMonitorWorker() {
    if(productionMonitorTimer)return;
    productionMonitorStopping=false;
    productionMonitorTimer=setInterval(kickProductionMonitorWorker,PRODUCTION_MONITOR_CONFIG.intervalSeconds*1000);
    productionMonitorTimer.unref?.();
    setTimeout(kickProductionMonitorWorker,3000).unref?.();
}
async function stopProductionMonitorWorker() {
    productionMonitorStopping=true;
    if(productionMonitorTimer)clearInterval(productionMonitorTimer);
    productionMonitorTimer=null;
    if(productionMonitorRunPromise)await Promise.race([productionMonitorRunPromise,new Promise(resolve=>setTimeout(resolve,10_000))]);
}
async function productionMonitorStatus() {
    const [stateResult,alertsResult]=await Promise.all([
        pool.query(`SELECT status,last_run_at,last_success_at,snapshot,updated_at FROM creator_production_monitor_state WHERE slot='production' LIMIT 1`),
        pool.query(`SELECT * FROM creator_production_monitor_alerts ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,state ASC,last_seen_at DESC LIMIT $1`,[PRODUCTION_MONITOR_MAX_ALERTS])
    ]);
    const state=stateResult.rows[0]||{};
    const alerts=alertsResult.rows.map(publicProductionMonitorAlert);
    const active=alerts.filter(item=>item.state==='open');
    const lastSuccessMs=state.last_success_at?new Date(state.last_success_at).getTime():0;
    const workerFresh=Boolean(lastSuccessMs&&Date.now()-lastSuccessMs<=PRODUCTION_MONITOR_CONFIG.intervalSeconds*1000*3);
    return{
        configured:PRODUCTION_MONITOR_CONFIG.enabled,required:PRODUCTION_MONITOR_CONFIG.required,mode:PRODUCTION_MONITOR_CONFIG.mode,
        webhook_host:productionMonitorWebhookHost(),interval_seconds:PRODUCTION_MONITOR_CONFIG.intervalSeconds,repeat_minutes:PRODUCTION_MONITOR_CONFIG.repeatMinutes,
        backup_max_age_hours:PRODUCTION_MONITOR_CONFIG.backupMaxAgeHours,recovery_max_age_days:PRODUCTION_MONITOR_CONFIG.recoveryMaxAgeDays,
        worker_fresh:workerFresh,status:String(state.status||'unknown'),last_run_at:state.last_run_at||null,last_success_at:state.last_success_at||null,
        snapshot:state.snapshot&&typeof state.snapshot==='object'?state.snapshot:{},
        active_alerts:active,alert_history:alerts,active_counts:{critical:active.filter(a=>a.severity==='critical').length,warning:active.filter(a=>a.severity==='warning').length,info:active.filter(a=>a.severity==='info').length}
    };
}

function verificationMailMessage(account, token) {
    const link = accountActionLink("verify_email", token);
    return {
        kind: "email_verification",
        to: account.email,
        subject: "cfs_zockt – E-Mail-Adresse bestätigen",
        text: `Hallo ${account.display_name || "Creator"},\n\nbestätige deine E-Mail-Adresse für cfs_zockt über diesen einmal verwendbaren Link. Der Link läuft nach 8 Stunden ab:\n\n${link}\n\nFalls du diese Anfrage nicht gestellt hast, kannst du diese Nachricht ignorieren. Gib den Link oder Token niemals an andere Personen weiter.`
    };
}

function passwordResetMailMessage(account, token) {
    const link = accountActionLink("password_reset", token);
    return {
        kind: "password_reset",
        to: account.email,
        subject: "cfs_zockt – Passwort zurücksetzen",
        text: `Hallo ${account.display_name || "Creator"},\n\nfür dein cfs_zockt Konto wurde ein Passwort-Reset angefordert. Der einmal verwendbare Link läuft nach 30 Minuten ab:\n\n${link}\n\nFalls du das nicht warst, ignoriere diese Nachricht. Dein bestehendes Passwort bleibt unverändert.`
    };
}

function passwordResetCompletedMailMessage(account) {
    return {
        kind: "password_reset_completed",
        to: account.email,
        subject: "cfs_zockt – Passwort wurde geändert",
        text: `Hallo ${account.display_name || "Creator"},\n\ndas Passwort deines cfs_zockt Kontos wurde über den Recovery-Pfad geändert. Alle bestehenden Login-Sitzungen wurden beendet.\n\nFalls du das nicht warst, melde den Vorfall bitte sofort über ${APP_BASE_URL}/pages/support.html.`
    };
}

function passwordChangedMailMessage(account) {
    return {
        kind: "password_changed",
        to: account.email,
        subject: "cfs_zockt – Passwort wurde geändert",
        text: `Hallo ${account.display_name || "Creator"},\n\ndas Passwort deines cfs_zockt Kontos wurde in einer angemeldeten Sitzung geändert. Andere Login-Sitzungen sowie offene Login-/Recovery-Challenges wurden beendet.\n\nFalls du das nicht warst, nutze bitte sofort den Passwort-Recovery-Weg und melde den Vorfall über ${APP_BASE_URL}/pages/support.html.`
    };
}

function mfaSecurityMailMessage(account, action) {
    const label = action === "enabled" ? "aktiviert" : action === "disabled" ? "deaktiviert" : "geändert";
    return {
        kind: `mfa_${action}`,
        to: account.email,
        subject: `cfs_zockt – Zwei-Faktor-Schutz ${label}`,
        text: `Hallo ${account.display_name || "Creator"},\n\nder Zwei-Faktor-Schutz deines cfs_zockt Kontos wurde ${label}.\n\nFalls du das nicht warst, ändere dein Passwort und melde den Vorfall bitte sofort über ${APP_BASE_URL}/pages/support.html.`
    };
}

function mfaRecoveryUsedMailMessage(account) {
    return {
        kind: "mfa_recovery_code_used",
        to: account.email,
        subject: "cfs_zockt – Recovery-Code zur Anmeldung verwendet",
        text: `Hallo ${account.display_name || "Creator"},\n\nfür dein cfs_zockt Konto wurde ein MFA-Recovery-Code zur Anmeldung verwendet. Der verwendete Code ist jetzt ungültig.\n\nFalls du das nicht warst, ändere dein Passwort, erneuere deine Recovery-Codes und melde den Vorfall bitte sofort über ${APP_BASE_URL}/pages/support.html.`
    };
}

function passkeySecurityMailMessage(account, action, label = "Passkey") {
    const removed = action === "removed";
    return {
        kind: `passkey_${action}`,
        to: account.email,
        subject: `cfs_zockt – Passkey ${removed ? "entfernt" : "hinzugefügt"}`,
        text: `Hallo ${account.display_name || "Creator"},\n\nder Passkey „${String(label || "Passkey").slice(0,80)}“ wurde für dein cfs_zockt Konto ${removed ? "entfernt" : "hinzugefügt"}.\n\nFalls du das nicht warst, ändere dein Passwort, prüfe deine aktiven Sitzungen und melde den Vorfall bitte sofort über ${APP_BASE_URL}/pages/support.html.`
    };
}

function authMethodLabel(method) {
    const key = String(method || "").toLowerCase();
    if (key === "passkey") return "Passkey";
    if (key === "totp") return "Passwort + Authenticator-Code";
    if (key === "recovery_code") return "Passwort + Recovery-Code";
    if (key === "registration") return "Registrierung";
    if (key === "password_change") return "Passwortänderung";
    return "Passwort";
}

function successfulLoginMailMessage(account, method) {
    return {
        kind: "successful_login",
        to: account.email,
        subject: "cfs_zockt – Erfolgreiche Anmeldung",
        text: `Hallo ${account.display_name || "Creator"},\n\nes gab eine erfolgreiche Anmeldung bei deinem cfs_zockt Konto.\n\nMethode: ${authMethodLabel(method)}\nZeitpunkt: ${new Date().toISOString()}\n\nWir speichern für diese Warnung bewusst keine Standort- oder Browser-Fingerprints. Falls du die Anmeldung nicht erkennst, beende deine aktiven Sitzungen, ändere dein Passwort und prüfe deine MFA-/Passkey-Einstellungen.`
    };
}

function suspiciousMfaMailMessage(account, method) {
    return {
        kind: "mfa_after_password_failed",
        to: account.email,
        subject: "cfs_zockt – Sicherheitswarnung nach korrektem Passwort",
        text: `Hallo ${account.display_name || "Creator"},\n\nfür dein Konto wurde das korrekte Passwort verwendet, der anschließende zweite Faktor (${authMethodLabel(method)}) konnte aber nicht bestätigt werden.\n\nFalls du das nicht warst, ändere dein Passwort und prüfe deine aktiven Sitzungen und Authenticatoren. Weitere gleichartige Warnungen werden für einige Stunden gebündelt, damit dein Postfach nicht überflutet wird.`
    };
}

function passwordThrottleMailMessage(account) {
    return {
        kind: "password_login_throttled",
        to: account.email,
        subject: "cfs_zockt – Viele fehlgeschlagene Anmeldeversuche blockiert",
        text: `Hallo ${account.display_name || "Creator"},\n\nfür dein cfs_zockt Konto wurden innerhalb kurzer Zeit viele falsche Passwortversuche erkannt. Weitere Passwort-Anmeldeversuche werden vorübergehend kontoübergreifend gedrosselt.\n\nWir speichern dafür bewusst keine Standort- oder Browser-Fingerprints. Falls du selbst mehrfach ein falsches Passwort eingegeben hast, warte kurz oder nutze den Recovery-Pfad. Falls nicht, prüfe deine Kontosicherheit.`
    };
}

async function securityAlertAllowed(creatorId, alertKey) {
    const key = String(alertKey || "").slice(0,64);
    if (!creatorId || !key) return false;
    const cutoff = new Date(Date.now() - SECURITY_ALERT_COOLDOWN_MS);
    const result = await pool.query(
        `INSERT INTO creator_security_alerts(creator_id,alert_key,last_sent_at,occurrences)
         VALUES($1,$2,NOW(),1)
         ON CONFLICT(creator_id,alert_key) DO UPDATE SET
            last_sent_at=NOW(),
            occurrences=creator_security_alerts.occurrences+1
         WHERE creator_security_alerts.last_sent_at < $3
         RETURNING 1 AS allowed`,
        [creatorId,key,cutoff]
    );
    return result.rowCount === 1;
}

async function accountLoginThrottleState(creatorId) {
    const result = await pool.query(
        `SELECT failed_count,window_started_at,blocked_until FROM creator_login_throttle WHERE creator_id=$1 LIMIT 1`,
        [creatorId]
    );
    const row = result.rows[0];
    if (!row) return {blocked:false,failedCount:0,blockedUntil:null};
    const blockedUntil = row.blocked_until ? new Date(row.blocked_until) : null;
    return {
        blocked:Boolean(blockedUntil && blockedUntil.getTime() > Date.now()),
        failedCount:Number(row.failed_count || 0),
        blockedUntil
    };
}

async function recordAccountPasswordFailure(creatorId) {
    const result = await pool.query(
        `INSERT INTO creator_login_throttle(creator_id,failed_count,window_started_at,blocked_until,updated_at)
         VALUES($1,1,NOW(),NULL,NOW())
         ON CONFLICT(creator_id) DO UPDATE SET
           failed_count=CASE
             WHEN creator_login_throttle.window_started_at < NOW() - ($2 * INTERVAL '1 millisecond') THEN 1
             ELSE creator_login_throttle.failed_count + 1
           END,
           window_started_at=CASE
             WHEN creator_login_throttle.window_started_at < NOW() - ($2 * INTERVAL '1 millisecond') THEN NOW()
             ELSE creator_login_throttle.window_started_at
           END,
           blocked_until=CASE
             WHEN (CASE WHEN creator_login_throttle.window_started_at < NOW() - ($2 * INTERVAL '1 millisecond') THEN 1 ELSE creator_login_throttle.failed_count + 1 END) >= $3
               THEN NOW() + ($4 * INTERVAL '1 millisecond')
             ELSE creator_login_throttle.blocked_until
           END,
           updated_at=NOW()
         RETURNING failed_count,blocked_until`,
        [creatorId,ACCOUNT_LOGIN_FAILURE_WINDOW_MS,ACCOUNT_LOGIN_FAILURE_MAX,ACCOUNT_LOGIN_BLOCK_MS]
    );
    const row=result.rows[0];
    const blockedUntil=row?.blocked_until ? new Date(row.blocked_until) : null;
    return {
        failedCount:Number(row?.failed_count || 0),
        blocked:Boolean(blockedUntil && blockedUntil.getTime() > Date.now()),
        blockedUntil
    };
}

async function clearAccountPasswordFailures(creatorId) {
    await pool.query(`DELETE FROM creator_login_throttle WHERE creator_id=$1`,[creatorId]);
}

async function notifyAccountLoginThrottle(creatorId) {
    await recordSecurityEvent(creatorId,"login_throttled");
    if (!ACCOUNT_MAIL_CONFIG.enabled) return;
    try {
        if (!(await securityAlertAllowed(creatorId,"password_login_throttled"))) return;
        const account=await findCreatorById(creatorId);
        if (account) await queueAccountMail(passwordThrottleMailMessage(account),{creatorId});
    } catch (error) {
        safeLogError("Login Throttle Warnung Fehler:",error);
    }
}

async function queueSuccessfulLoginAlert(creatorId, method) {
    if (!ACCOUNT_MAIL_CONFIG.enabled) return;
    try {
        if (!(await securityAlertAllowed(creatorId,"successful_login"))) return;
        const account = await findCreatorById(creatorId);
        if (account) await queueAccountMail(successfulLoginMailMessage(account,method),{creatorId});
    } catch (error) {
        safeLogError("Login Sicherheitswarnung Fehler:",error);
    }
}

async function recordSuspiciousMfaFailure(creatorId, method) {
    if (!creatorId) return;
    await recordSecurityEvent(creatorId,"mfa_after_password_failed");
    if (!ACCOUNT_MAIL_CONFIG.enabled) return;
    try {
        if (!(await securityAlertAllowed(creatorId,"mfa_after_password_failed"))) return;
        const account = await findCreatorById(creatorId);
        if (account) await queueAccountMail(suspiciousMfaMailMessage(account,method),{creatorId});
    } catch (error) {
        safeLogError("MFA Sicherheitswarnung Fehler:",error);
    }
}


// ============================================================
// PLAN SYSTEM
// ============================================================

function normalizePlan(
    value
) {

    const plan =
        String(
            value ||
            "free"
        )
            .trim()
            .toLowerCase();

    if (
        [
            "free",
            "creator",
            "pro"
        ].includes(
            plan
        )
    ) {

        return plan;

    }

    return "free";

}


function planRank(
    value
) {

    return ({
        free:
            0,

        creator:
            1,

        pro:
            2
    })[
        normalizePlan(
            value
        )
    ] ?? 0;

}


function hasMinimumPlan(
    currentPlan,
    requiredPlan
) {

    return (
        planRank(
            currentPlan
        ) >=
        planRank(
            requiredPlan
        )
    );

}


// ============================================================
// PLAN RECHTE
// ============================================================

function getPlanEntitlements(
    value
) {
    return basePlanEntitlements(value);
}

function adminCreatorEntitlements({plan="free",betaActive=false}={}) {
    const entitlements=basePlanEntitlements("pro");

    // Root/Admin darf alle heute nutzbaren Creator-Suite-Bereiche testen und
    // verwalten. Roadmap-Funktionen werden dadurch nicht künstlich freigeschaltet.
    Object.assign(entitlements,{
        dashboard:true,account:true,editor:true,widget_studio:true,tiktok:true,
        launcher:true,device_link:true,scene_studio:true,live_bridge:true,
        live_widgets:true,alerts:true,auto_thanks:true,local_output:true,
        stream_deck:true,cut_studio:true,games:true,nexus:true,audio_studio:true,
        obs:true,advanced_output:true,custom_branding:true,
        twitch:false,
        max_widgets:1000,max_scenes:250,max_stream_deck_buttons:12,
        max_active_devices:25,max_cut_projects:250,max_cut_clips_per_project:500,
        max_game_rules:250,max_pending_cut_jobs:250,
        themes:["cfs","neon","ice","void"],
        widget_templates:["cfs-standard","minimal","neon","glass","compact","wide","blank"],
        output_profiles:["obs","tiktok_vertical","landscape"],
        plan:normalizePlan(plan),
        beta_active:Boolean(betaActive),
        admin_access:true,
        access_source:"root_admin"
    });

    return entitlements;
}



async function getCreatorSubscriptionState(creatorId) {
    const result=await pool.query(`
        SELECT provider,provider_customer_id,provider_subscription_id,provider_price_id,plan,status,
               current_period_start,current_period_end,grace_ends_at,cancel_at_period_end,cancel_at,ended_at,
               currency,amount_minor,billing_interval,last_invoice_status,last_event_id,last_event_created,created_at,updated_at
        FROM creator_billing_subscriptions WHERE creator_id=$1 LIMIT 1
    `,[creatorId]);
    const row=result.rows[0];
    return row ? publicBillingSubscription(row) : publicBillingSubscription({plan:"free",status:"none"});
}

async function getCreatorBetaState(creatorId) {
    const result=await pool.query(`SELECT status,notes,created_at,updated_at FROM creator_beta_testers WHERE creator_id=$1 LIMIT 1`,[creatorId]);
    const row=result.rows[0];
    return {status:row?.status||"none",active:row?.status==="active",notes:studioText(row?.notes,1200,""),created_at:row?.created_at||null,updated_at:row?.updated_at||null};
}

async function creatorAccessProfile(accountOrId) {
    let account=typeof accountOrId==="object"&&accountOrId?accountOrId:null;
    if(!account){const result=await pool.query(`SELECT id,plan,status,display_name,email,created_at FROM creator_accounts WHERE id=$1 LIMIT 1`,[String(accountOrId||"")]);account=result.rows[0]||null;}
    if(!account)return null;
    const [beta,subscription,admin]=await Promise.all([
        getCreatorBetaState(account.id),
        getCreatorSubscriptionState(account.id),
        isCreatorSuiteAdmin(account)
    ]);
    const plan=normalizePlan(account.plan),effectivePlan=effectiveBillingPlan(plan,subscription);
    const entitlements=admin
        ? adminCreatorEntitlements({plan,betaActive:beta.active})
        : resolveCreatorEntitlements(effectivePlan,{betaActive:beta.active});
    const billingRaised=planRank(effectivePlan)>planRank(plan);
    const accessSource=admin
        ? "root_admin"
        : beta.active?(billingRaised?"billing_plus_beta":"plan_plus_beta"):(billingRaised?"billing":"plan");
    entitlements.access_source=accessSource;
    return {
        plan,effective_plan:effectivePlan,
        base_entitlements:basePlanEntitlements(effectivePlan),entitlements,
        beta,subscription,admin:Boolean(admin),
        access_source:accessSource
    };
}

function accessDeniedPayload(access,feature,requiredPlan="creator") {
    return {ok:false,allowed:false,feature:String(feature||""),required_plan:normalizePlan(requiredPlan),current_plan:access?.effective_plan||access?.plan||"free",base_plan:access?.plan||"free",beta_active:Boolean(access?.beta?.active),billing_active:Boolean(access?.subscription?.access_active),error:`Diese Funktion benötigt mindestens den ${normalizePlan(requiredPlan).toUpperCase()} Plan.`};
}

async function requireCreatorFeatureAccess(accountOrId,feature,requiredPlan="creator") {
    const access=await creatorAccessProfile(accountOrId);
    if(!access?.entitlements?.[feature]){const error=new Error(accessDeniedPayload(access,feature,requiredPlan).error);error.code="creator_feature_locked";error.access=access;error.feature=feature;error.requiredPlan=requiredPlan;throw error;}
    return access;
}

function stripeId(value){return typeof value==="string"?value:String(value?.id||"");}
function stripeCreatorIdFromObject(object={}){return studioText(object?.metadata?.creator_id||object?.client_reference_id,120,"");}
function stripePlanFromObject(object={}){
    const direct=normalizePlan(object?.metadata?.cfs_plan||"");
    if(["creator","pro"].includes(direct))return direct;
    const item=object?.items?.data?.[0],priceId=stripeId(item?.price)||stripeId(item?.plan);
    return normalizePlan(BILLING_PRICE_PLAN[priceId]||"free");
}
async function creatorIdForStripeObject(object={}){
    const direct=stripeCreatorIdFromObject(object);
    const subscriptionId=object?.object==="subscription"?stripeId(object.id):stripeSubscriptionIdFromInvoice(object);
    const customerId=stripeId(object.customer);
    const result=await pool.query(`SELECT creator_id FROM creator_billing_subscriptions WHERE (provider='stripe' AND provider_subscription_id=$1 AND $1<>'') OR (provider='stripe' AND provider_customer_id=$2 AND $2<>'') LIMIT 1`,[subscriptionId,customerId]);
    const mapped=String(result.rows[0]?.creator_id||"");
    if(direct&&mapped&&direct!==mapped){
        const error=new Error("Stripe Creator-/Customer-Zuordnung ist widersprüchlich.");
        error.code="billing_creator_mismatch";
        throw error;
    }
    return direct||mapped;
}
async function recordBillingEvent(event,creatorId,outcome,extra={}){
    const summary={...billingEventSummary(event),...extra};
    await pool.query(`INSERT INTO creator_billing_events(event_id,provider,event_type,creator_id,provider_customer_id,provider_subscription_id,event_created,livemode,outcome,summary,processed_at) VALUES($1,'stripe',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW()) ON CONFLICT(event_id) DO UPDATE SET outcome=EXCLUDED.outcome,summary=EXCLUDED.summary,processed_at=NOW()`,[
        summary.id||String(event?.id||""),summary.type||String(event?.type||""),creatorId||null,summary.customer_id||"",summary.subscription_id||"",Number(summary.created||0),Boolean(summary.livemode),String(outcome||"processed"),JSON.stringify(summary)
    ]);
}
async function claimBillingEvent(event){
    const summary=billingEventSummary(event),eventId=String(summary.id||event?.id||"");
    if(!eventId)return false;
    const result=await pool.query(`
      INSERT INTO creator_billing_events(event_id,provider,event_type,creator_id,provider_customer_id,provider_subscription_id,event_created,livemode,outcome,summary,processed_at)
      VALUES($1,'stripe',$2,NULL,$3,$4,$5,$6,'processing',$7::jsonb,NOW())
      ON CONFLICT(event_id) DO UPDATE SET
        outcome='processing',summary=EXCLUDED.summary,processed_at=NOW()
      WHERE creator_billing_events.outcome='failed'
         OR (creator_billing_events.outcome='processing' AND creator_billing_events.processed_at < NOW()-INTERVAL '10 minutes')
      RETURNING event_id
    `,[eventId,summary.type||String(event?.type||""),summary.customer_id||"",summary.subscription_id||"",Number(summary.created||0),Boolean(summary.livemode),JSON.stringify(summary)]);
    return Boolean(result.rows[0]);
}
async function upsertStripeSubscription(creatorId,subscription,event,{graceEndsAt=null,lastInvoiceStatus=""}={}){
    const snapshot=stripeSubscriptionSnapshot(subscription,BILLING_PRICE_PLAN,event),existing=await pool.query(`SELECT last_event_id,last_event_created,grace_ends_at,last_invoice_status FROM creator_billing_subscriptions WHERE creator_id=$1 LIMIT 1`,[creatorId]),row=existing.rows[0]||{};
    if(!shouldApplyStripeEvent(row,event))return{applied:false,reason:"stale",snapshot};
    const preserveGrace=graceEndsAt===undefined?row.grace_ends_at:graceEndsAt;
    await pool.query(`
      INSERT INTO creator_billing_subscriptions(
        creator_id,provider,provider_customer_id,provider_subscription_id,provider_price_id,plan,status,current_period_start,current_period_end,
        grace_ends_at,cancel_at_period_end,cancel_at,ended_at,currency,amount_minor,billing_interval,last_invoice_status,last_event_id,last_event_created,created_at,updated_at
      ) VALUES($1,'stripe',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW())
      ON CONFLICT(creator_id) DO UPDATE SET provider='stripe',provider_customer_id=EXCLUDED.provider_customer_id,provider_subscription_id=EXCLUDED.provider_subscription_id,
        provider_price_id=EXCLUDED.provider_price_id,plan=EXCLUDED.plan,status=EXCLUDED.status,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,
        grace_ends_at=EXCLUDED.grace_ends_at,cancel_at_period_end=EXCLUDED.cancel_at_period_end,cancel_at=EXCLUDED.cancel_at,ended_at=EXCLUDED.ended_at,
        currency=EXCLUDED.currency,amount_minor=EXCLUDED.amount_minor,billing_interval=EXCLUDED.billing_interval,last_invoice_status=EXCLUDED.last_invoice_status,
        last_event_id=EXCLUDED.last_event_id,last_event_created=EXCLUDED.last_event_created,updated_at=NOW()
    `,[creatorId,snapshot.provider_customer_id,snapshot.provider_subscription_id,snapshot.provider_price_id,snapshot.plan,snapshot.status,snapshot.current_period_start,snapshot.current_period_end,preserveGrace,snapshot.cancel_at_period_end,snapshot.cancel_at,snapshot.ended_at,snapshot.currency,snapshot.amount_minor,snapshot.interval,lastInvoiceStatus||row.last_invoice_status||"",snapshot.last_event_id,snapshot.last_event_created]);
    return{applied:true,snapshot};
}
async function handleStripeEvent(event){
    if(!(await claimBillingEvent(event)))return{duplicate:true};
    const object=event?.data?.object||{},type=String(event?.type||""),client=stripeClient();
    let creatorId="";
    try{
        creatorId=await creatorIdForStripeObject(object);
        if(type==="checkout.session.completed"&&object?.mode==="subscription"){
            creatorId=creatorId||stripeCreatorIdFromObject(object);
            const subscriptionId=stripeId(object.subscription);
            if(!creatorId||!subscriptionId){await recordBillingEvent(event,creatorId,"ignored_unmapped",{reason:"checkout_missing_creator_or_subscription"});return{ignored:true};}
            const subscription=await client.subscriptions.retrieve(subscriptionId);
            const synced=await upsertStripeSubscription(creatorId,subscription,event,{graceEndsAt:null,lastInvoiceStatus:"checkout_completed"});
            await recordBillingEvent(event,creatorId,synced.applied?"processed":"ignored_stale",{subscription_id:subscriptionId,plan:synced.snapshot.plan,subscription_status:synced.snapshot.status,cancel_at_period_end:synced.snapshot.cancel_at_period_end,checkout_plan:stripePlanFromObject(object)});return synced;
        }
        if(type.startsWith("customer.subscription.")){
            creatorId=creatorId||stripeCreatorIdFromObject(object);
            if(!creatorId){await recordBillingEvent(event,null,"ignored_unmapped",{reason:"subscription_creator_missing"});return{ignored:true};}
            const synced=await upsertStripeSubscription(creatorId,object,event,{graceEndsAt:object.status==="active"||object.status==="trialing"?null:undefined});
            await recordBillingEvent(event,creatorId,synced.applied?"processed":"ignored_stale",{plan:synced.snapshot.plan,subscription_status:synced.snapshot.status,cancel_at_period_end:synced.snapshot.cancel_at_period_end,current_period_end:synced.snapshot.current_period_end});return synced;
        }
        if(type==="invoice.payment_failed"||type==="invoice.payment_action_required"||type==="invoice.paid"){
            const subscriptionId=stripeSubscriptionIdFromInvoice(object);
            if(!creatorId&&subscriptionId){const r=await pool.query(`SELECT creator_id FROM creator_billing_subscriptions WHERE provider='stripe' AND provider_subscription_id=$1 LIMIT 1`,[subscriptionId]);creatorId=r.rows[0]?.creator_id||"";}
            if(!creatorId||!subscriptionId){await recordBillingEvent(event,creatorId,"ignored_unmapped",{reason:"invoice_subscription_unmapped"});return{ignored:true};}
            const subscription=await client.subscriptions.retrieve(subscriptionId);
            const paymentProblem=type!=="invoice.paid";
            const graceEndsAt=paymentProblem?new Date(Date.now()+BILLING_GRACE_DAYS*86400000):null;
            const invoiceState=type==="invoice.paid"?"paid":type==="invoice.payment_action_required"?"payment_action_required":"payment_failed";
            const synced=await upsertStripeSubscription(creatorId,subscription,event,{graceEndsAt,lastInvoiceStatus:invoiceState});
            await recordBillingEvent(event,creatorId,synced.applied?"processed":"ignored_stale",{grace_ends_at:graceEndsAt,plan:synced.snapshot.plan,subscription_status:synced.snapshot.status,cancel_at_period_end:synced.snapshot.cancel_at_period_end,last_invoice_status:invoiceState});return synced;
        }
        await recordBillingEvent(event,creatorId||null,"ignored_unmapped",{reason:"event_not_required"});return{ignored:true};
    }catch(error){await recordBillingEvent(event,creatorId||null,"failed",{error:studioText(error?.message,300,"billing event failed")});throw error;}
}
async function stripeBillingWebhook(req,res){
    if(!BILLING_CONFIG.webhook_ready)return res.status(503).json({ok:false,error:"Billing Webhook ist auf diesem Server nicht vollständig konfiguriert."});
    const signature=String(req.headers["stripe-signature"]||"");
    if(!signature)return res.status(400).json({ok:false,error:"Stripe-Signatur fehlt."});
    let event;
    try{event=stripeClient().webhooks.constructEvent(req.body,signature,STRIPE_WEBHOOK_SECRET);}catch(error){return res.status(400).json({ok:false,error:"Ungültige Stripe-Webhook-Signatur."});}
    const expectedLive=STRIPE_SECRET_MODE==="live";
    if((STRIPE_SECRET_MODE==="live"||STRIPE_SECRET_MODE==="test")&&Boolean(event?.livemode)!==expectedLive){
        await recordBillingEvent(event,null,"rejected_mode",{reason:"stripe_mode_mismatch",expected_mode:STRIPE_SECRET_MODE});
        return res.status(400).json({ok:false,error:"Stripe Event passt nicht zum konfigurierten Billing-Modus."});
    }
    try{const result=await handleStripeEvent(event);return res.json({received:true,duplicate:Boolean(result?.duplicate)});}catch(error){safeLogError("billing:webhook",error);return res.status(500).json({ok:false,error:"Billing Event konnte nicht verarbeitet werden."});}
}

// ============================================================
// MODUL REGISTRY
// ============================================================

const CREATOR_MODULES =
    Object.freeze({

        dashboard: {
            key:
                "dashboard",
            title:
                "Dashboard",
            minimum_plan:
                "free",
            stateful:
                false,
            status:
                "active"
        },

        editor: {
            key:
                "editor",
            title:
                "Creator Editor",
            minimum_plan:
                "free",
            stateful:
                true,
            status:
                "active"
        },

        widget_studio: {
            key:
                "widget_studio",
            title:
                "Widget Studio",
            minimum_plan:
                "free",
            stateful:
                true,
            status:
                "active"
        },

        tiktok: {
            key:
                "tiktok",
            title:
                "TikTok Hub",
            minimum_plan:
                "free",
            stateful:
                false,
            status:
                "active"
        },

        launcher: {
            key:
                "launcher",
            title:
                "CFS Launcher",
            minimum_plan:
                "free",
            stateful:
                true,
            status:
                "active"
        },

        cut_studio: {
            key:
                "cut_studio",
            title:
                "Cut Studio",
            minimum_plan:
                "creator",
            stateful:
                true,
            status:
                "beta"
        },

        games: {
            key:
                "games",
            title:
                "Interaktive Spiele",
            minimum_plan:
                "creator",
            stateful:
                true,
            status:
                "active"
        },

        nexus: {
            key:
                "nexus",
            title:
                "NEXUS",
            minimum_plan:
                "pro",
            stateful:
                true,
            status:
                "preview"
        },

        audio_studio: {
            key:
                "audio_studio",
            title:
                "Audio Studio",
            minimum_plan:
                "pro",
            stateful:
                true,
            status:
                "roadmap"
        },

        twitch: {
            key:
                "twitch",
            title:
                "Twitch",
            minimum_plan:
                "pro",
            stateful:
                true,
            status:
                "roadmap"
        },

        obs: {
            key:
                "obs",
            title:
                "OBS",
            minimum_plan:
                "pro",
            stateful:
                true,
            status:
                "roadmap"
        }

    });


function canUseModule(
    plan,
    moduleKey
) {

    const module =
        CREATOR_MODULES[
            moduleKey
        ];

    if (!module) {
        return false;
    }

    return hasMinimumPlan(
        plan,
        module.minimum_plan
    );

}


function normalizeModuleKey(
    value
) {

    const key =
        String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        !Object
            .prototype
            .hasOwnProperty
            .call(
                CREATOR_MODULES,
                key
            )
    ) {

        throw new Error(
            "Unbekanntes Creator-Modul."
        );

    }

    return key;

}


function publicModuleRegistry(
    account,
    entitlements = null
) {

    return Object
        .values(
            CREATOR_MODULES
        )
        .map(
            module => ({

                ...module,

                allowed:
                    entitlements && Object.prototype.hasOwnProperty.call(entitlements,module.key)
                        ? Boolean(entitlements[module.key])
                        : canUseModule(account?.plan,module.key)

            })
        );

}
// ============================================================
// CREATOR ACCOUNT ÖFFENTLICHE DATEN
// ============================================================

function publicCreatorAccount(
    account
) {

    if (!account) {
        return null;
    }

    return {

        id:
            account.id,

        email:
            account.email,

        display_name:
            account.display_name,

        plan:
            normalizePlan(
                account.plan
            ),

        status:
            account.status ||
            "active",

        email_verified:
            Boolean(account.email_verified_at),

        email_verified_at:
            account.email_verified_at ||
            null,

        created_at:
            account.created_at ||
            null,

        updated_at:
            account.updated_at ||
            null

    };

}


// ============================================================
// CREATOR ACCOUNT SUCHEN
// ============================================================

async function findCreatorByEmail(
    email
) {

    const result =
        await pool.query(
            `
            SELECT
                id,
                email,
                password_hash,
                password_salt,
                password_kdf_version,
                display_name,
                plan,
                status,
                email_verified_at,
                created_at,
                updated_at

            FROM creator_accounts

            WHERE email = $1

            LIMIT 1
            `,
            [
                normalizeEmail(
                    email
                )
            ]
        );

    return (
        result.rows[0] ||
        null
    );

}


async function findCreatorById(
    creatorId
) {

    const result =
        await pool.query(
            `
            SELECT
                id,
                email,
                display_name,
                plan,
                status,
                email_verified_at,
                created_at,
                updated_at

            FROM creator_accounts

            WHERE id = $1

            LIMIT 1
            `,
            [
                String(
                    creatorId
                )
            ]
        );

    return (
        result.rows[0] ||
        null
    );

}


// ============================================================
// ACCOUNT MFA HELPERS
// ============================================================

function mfaChallengeHash(token) {
    return crypto.createHash("sha256").update(`cfs-mfa-challenge-v1|${String(token || "")}`).digest("hex");
}

function mfaChallengeCookieOptions({includeMaxAge=true} = {}) {
    return {
        httpOnly: true,
        secure: NODE_ENV !== "development",
        sameSite: "strict",
        priority: "high",
        ...(includeMaxAge ? {maxAge: MFA_CHALLENGE_TTL_MS} : {}),
        path: "/"
    };
}

function clearMfaChallengeCookie(res) {
    res.clearCookie(MFA_CHALLENGE_COOKIE, mfaChallengeCookieOptions({includeMaxAge:false}));
}

async function issueMfaChallenge(res, creatorId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = mfaChallengeHash(token);
    const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_MS);
    await pool.query(`DELETE FROM creator_mfa_challenges WHERE expires_at<=NOW() OR creator_id=$1`, [creatorId]);
    await pool.query(
        `INSERT INTO creator_mfa_challenges(token_hash,creator_id,expires_at,attempts,created_at) VALUES($1,$2,$3,0,NOW())`,
        [tokenHash, creatorId, expiresAt]
    );
    res.cookie(MFA_CHALLENGE_COOKIE, token, mfaChallengeCookieOptions());
    return expiresAt;
}

async function mfaStatusForCreator(creatorId) {
    const result = await pool.query(
        `SELECT enabled_at FROM creator_mfa_totp WHERE creator_id=$1 AND enabled_at IS NOT NULL LIMIT 1`,
        [creatorId]
    );
    if (!result.rows[0]) return { enabled:false, enabled_at:null, recovery_codes_remaining:0 };
    const codes = await pool.query(
        `SELECT COUNT(*)::int AS remaining FROM creator_mfa_recovery_codes WHERE creator_id=$1 AND used_at IS NULL`,
        [creatorId]
    );
    return {
        enabled:true,
        enabled_at:result.rows[0].enabled_at,
        recovery_codes_remaining:Number(codes.rows[0]?.remaining || 0)
    };
}

async function replaceRecoveryCodes(client, creatorId) {
    const codes = createRecoveryCodes(MFA_RECOVERY_CODE_COUNT);
    await client.query(`DELETE FROM creator_mfa_recovery_codes WHERE creator_id=$1`, [creatorId]);
    for (const code of codes) {
        await client.query(
            `INSERT INTO creator_mfa_recovery_codes(creator_id,code_hash,created_at) VALUES($1,$2,NOW())`,
            [creatorId, recoveryCodeHash(MFA_RECOVERY_HASH_SALT, creatorId, code)]
        );
    }
    return codes;
}

async function consumeTotpForCreator(client, creatorId, code) {
    const result = await client.query(
        `SELECT secret_ciphertext,last_used_step,enabled_at FROM creator_mfa_totp WHERE creator_id=$1 FOR UPDATE`,
        [creatorId]
    );
    const row = result.rows[0];
    if (!row?.enabled_at) return false;
    const secret = decryptSecret(row.secret_ciphertext);
    const verified = verifyTotp(secret, code, { window:1, lastUsedStep:Number(row.last_used_step ?? -1) });
    if (!verified.ok) return false;
    await client.query(
        `UPDATE creator_mfa_totp SET last_used_step=$2,updated_at=NOW() WHERE creator_id=$1`,
        [creatorId, verified.step]
    );
    return true;
}

async function consumeRecoveryCode(client, creatorId, code) {
    const hash = recoveryCodeHash(MFA_RECOVERY_HASH_SALT, creatorId, code);
    const result = await client.query(
        `UPDATE creator_mfa_recovery_codes SET used_at=NOW() WHERE creator_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING code_hash`,
        [creatorId, hash]
    );
    return result.rowCount === 1;
}

async function creatorMfaEnabled(creatorId) {
    const result = await pool.query(`SELECT 1 FROM creator_mfa_totp WHERE creator_id=$1 AND enabled_at IS NOT NULL LIMIT 1`, [creatorId]);
    return result.rowCount === 1;
}


async function creatorPasskeys(creatorId) {
    const result = await pool.query(
        `SELECT credential_id,public_key,counter,transports,device_type,backed_up,label,created_at,last_used_at
         FROM creator_webauthn_credentials WHERE creator_id=$1 ORDER BY created_at ASC`,
        [creatorId]
    );
    return result.rows;
}

async function creatorAuthMethods(creatorId) {
    const [totp, passkeys, recovery] = await Promise.all([
        pool.query(`SELECT 1 FROM creator_mfa_totp WHERE creator_id=$1 AND enabled_at IS NOT NULL LIMIT 1`, [creatorId]),
        pool.query(`SELECT COUNT(*)::int AS count FROM creator_webauthn_credentials WHERE creator_id=$1`, [creatorId]),
        pool.query(`SELECT COUNT(*)::int AS count FROM creator_mfa_recovery_codes WHERE creator_id=$1 AND used_at IS NULL`, [creatorId])
    ]);
    return {
        totp: totp.rowCount === 1,
        passkey: Number(passkeys.rows[0]?.count || 0) > 0,
        passkeys_count: Number(passkeys.rows[0]?.count || 0),
        recovery_codes_remaining: Number(recovery.rows[0]?.count || 0)
    };
}

async function cleanupPasskeyChallenges(client = pool) {
    await client.query(`DELETE FROM creator_webauthn_challenges WHERE expires_at<=NOW()`);
}

async function createPasskeyChallenge({creatorId,purpose,challenge,sessionHash=null,mfaChallengeHashValue=null}) {
    await cleanupPasskeyChallenges();
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS);
    await pool.query(
        `INSERT INTO creator_webauthn_challenges(id,creator_id,purpose,challenge,session_hash,mfa_challenge_hash,expires_at,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [id,creatorId,purpose,challenge,sessionHash,mfaChallengeHashValue,expiresAt]
    );
    return {id,expiresAt};
}

async function takePasskeyChallenge(client, {challengeId,creatorId,purpose,sessionHash=null,mfaChallengeHashValue=null}) {
    if (!validChallengeId(challengeId)) return null;
    const params = [challengeId, creatorId, purpose];
    let extra = "";
    if (sessionHash) {
        params.push(sessionHash);
        extra += ` AND session_hash=$${params.length}`;
    }
    if (mfaChallengeHashValue) {
        params.push(mfaChallengeHashValue);
        extra += ` AND mfa_challenge_hash=$${params.length}`;
    }
    const result = await client.query(
        `DELETE FROM creator_webauthn_challenges
         WHERE id=$1 AND creator_id=$2 AND purpose=$3 AND expires_at>NOW()${extra}
         RETURNING id,creator_id,purpose,challenge,session_hash,mfa_challenge_hash,expires_at`,
        params
    );
    // DELETE ... RETURNING macht jeden Verify-Versuch unabhängig vom Ergebnis einmalig.
    return result.rows[0] || null;
}

function publicPasskeyRow(row) {
    return {
        id: passkeyReference(row.credential_id),
        label: row.label || "Passkey",
        device_type: row.device_type || null,
        backed_up: Boolean(row.backed_up),
        transports: Array.isArray(row.transports) ? row.transports : [],
        created_at: row.created_at || null,
        last_used_at: row.last_used_at || null
    };
}

// ============================================================
// ACCOUNT LIFECYCLE HELPERS
// ============================================================

function creatorSessionReference(tokenHash) {
    return crypto
        .createHash("sha256")
        .update(`cfs-session-ref-v1|${String(tokenHash || "")}`)
        .digest("base64url")
        .slice(0, 24);
}

function currentCreatorSessionHash(req) {
    const cookies = parseCookies(req);
    const token = String(cookies[CREATOR_SESSION_COOKIE] || "");
    return token ? hashSessionToken(token) : "";
}

const EXPORT_SENSITIVE_KEY = /(?:password|secret|token|hash|authorization|api[_-]?key|source[_-]?key|device[_-]?secret|bridge[_-]?token)/i;
const EXPORT_SENSITIVE_URL = /\/(?:api\/)?(?:widgets?\/source|assets?\/public|bridge\/token)\/[A-Za-z0-9._~-]{12,}/i;

function redactSensitiveText(value) {
    return String(value ?? "")
        .replace(/(authorization\s*:\s*bearer\s+)[A-Za-z0-9._~+\/=-]{12,}/gi,"$1[redacted]")
        .replace(/\b(?:cfsb|cfsd)_[A-Za-z0-9_-]{16,}\b/gi,"[redacted-cfs-token]")
        .replace(/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/gi,"[redacted-provider-key]")
        .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,"[redacted-github-token]")
        .replace(/((?:access[_ -]?token|refresh[_ -]?token|api[_ -]?key|client[_ -]?secret|device[_ -]?secret|bridge[_ -]?token|stream[_ -]?key|password|passwort|secret)\s*[:=]\s*["']?)[A-Za-z0-9._~+\/=-]{8,}/gi,"$1[redacted]")
        .replace(/https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/gi,"[redacted-webhook]");
}

function safeLogError(label,error) {
    const raw=error?.stack||error?.message||String(error||"unknown error");
    const safe=redactSensitiveText(raw).replace(/[\r\n]{3,}/g,"\n\n").slice(0,8000);
    console.error(`[${String(label||"server").slice(0,80)}]`,safe);
}

function clientSafeErrorPayload(req,error,status,fallback,{includeCode=false,extra={}}={}) {
    const safeStatus=Math.max(400,Math.min(599,Number(status)||500));
    const safeFallback=String(fallback||"Die Anfrage konnte nicht verarbeitet werden.")
        .replace(/[\u0000-\u001f\u007f]/g," ")
        .replace(/\s+/g," ")
        .trim()
        .slice(0,300)||"Die Anfrage konnte nicht verarbeitet werden.";
    const payload={ok:false,...(extra&&typeof extra==="object"?extra:{}),error:safeFallback};

    if(safeStatus>=500){
        safeLogError(`api-${safeStatus}:${req?.method||"REQUEST"}:${req?.path||"unknown"}:${req?.requestId||"no-request-id"}`,error);
        payload.reference=req?.requestId||null;
        return payload;
    }

    const detail=redactSensitiveText(error?.message||"")
        .replace(/[\u0000-\u001f\u007f]/g," ")
        .replace(/\s+/g," ")
        .trim()
        .slice(0,300);
    if(detail)payload.error=detail;
    if(includeCode&&/^[a-z0-9_]{2,80}$/i.test(String(error?.code||"")))payload.code=String(error.code);
    return payload;
}

function clearSensitiveBrowserState(res) {
    res.setHeader("Clear-Site-Data", '"cache", "cookies", "storage"');
}

function sanitizeAccountExportValue(value, depth = 0) {
    if (depth > 18) return "[depth-limit]";

    if (Array.isArray(value)) {
        return value.map(item => sanitizeAccountExportValue(item, depth + 1));
    }

    if (value && typeof value === "object") {
        const clean = {};
        for (const [key, item] of Object.entries(value)) {
            if (EXPORT_SENSITIVE_KEY.test(String(key))) {
                clean[key] = "[redacted]";
                continue;
            }
            clean[key] = sanitizeAccountExportValue(item, depth + 1);
        }
        return clean;
    }

    if (typeof value === "string") {
        if (EXPORT_SENSITIVE_URL.test(value)) return "[redacted-url]";
        const redacted=redactSensitiveText(value);
        return redacted.length > 250000 ? `${redacted.slice(0, 250000)}…[truncated]` : redacted;
    }

    return value;
}

async function verifyCreatorPasswordForLifecycle(creatorId, password) {
    const result = await pool.query(
        `SELECT password_hash, password_salt, password_kdf_version FROM creator_accounts WHERE id = $1 LIMIT 1`,
        [creatorId]
    );
    const account = result.rows[0];
    if (!account) return false;
    return verifyPassword(password, account.password_salt, account.password_hash, account.password_kdf_version);
}

async function buildCreatorAccountExport(creatorId) {
    const query = async (sql, params = [creatorId]) => (await pool.query(sql, params)).rows;
    const one = async sql => (await query(sql))[0] || null;

    const [
        account,
        settings,
        moduleState,
        widgets,
        scenes,
        assets,
        cutProjects,
        cutClips,
        cutJobs,
        gameRules,
        betaSessions,
        betaFeedback,
        billing,
        liveSessions,
        interactionRules,
        launcherLinks,
        liveBridges,
        securityEvents,
        tiktok,
        mfa,
        passkeys
    ] = await Promise.all([
        one(`SELECT id,email,display_name,plan,status,email_verified_at,created_at,updated_at FROM creator_accounts WHERE id=$1`),
        one(`SELECT settings,updated_at FROM creator_settings WHERE creator_id=$1`),
        query(`SELECT module_key,state,updated_at FROM creator_module_state WHERE creator_id=$1 ORDER BY module_key`),
        query(`SELECT id,widget_type,name,template_key,status,draft_config,published_config,version,created_at,updated_at,published_at FROM creator_widgets WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,name,status,draft_config,published_config,version,published_at,created_at,updated_at FROM creator_widget_scenes WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,original_name,label,media_type,mime_type,file_ext,byte_size,auto_category,category,metadata,created_at,updated_at FROM creator_widget_assets WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,title,status,format,notes,source_name,export_preset,created_at,updated_at FROM creator_cut_projects WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,project_id,label,in_ms,out_ms,caption,selected,created_at,updated_at FROM creator_cut_clips WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,project_id,status,manifest,attempts,result,error_message,requested_at,started_at,completed_at,updated_at FROM creator_cut_export_jobs WHERE creator_id=$1 ORDER BY requested_at`),
        query(`SELECT id,label,enabled,event_type,team,points,amount_mode,min_amount,gift_name,gift_id,last_triggered_at,created_at,updated_at FROM creator_game_rules WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,label,launcher_version,platform,provider,status,started_at,ended_at,duration_seconds,output_gate,diagnostics,result_summary,created_at,updated_at FROM creator_beta_sessions WHERE creator_id=$1 ORDER BY started_at`),
        query(`SELECT id,session_id,kind,severity,category,title,description,repro_steps,expected,actual,launcher_version,platform,provider,diagnostics,status,created_at,updated_at FROM creator_beta_feedback WHERE creator_id=$1 ORDER BY created_at`),
        one(`SELECT provider,plan,status,current_period_end,cancel_at_period_end,created_at,updated_at FROM creator_billing_subscriptions WHERE creator_id=$1`),
        query(`SELECT id,provider,status,likes,viewers_peak,shares,gifts_count,gifts_value,followers_gained,metadata,started_at,ended_at,updated_at FROM creator_live_sessions WHERE creator_id=$1 ORDER BY started_at DESC LIMIT 1000`),
        query(`SELECT id,event_type,enabled,cooldown_seconds,min_amount,template_text,output_kind,last_triggered_at,created_at,updated_at FROM creator_interaction_rules WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,status,machine_name,client_version,created_at,expires_at,approved_at,consumed_at,revoked_at,updated_at FROM creator_launcher_device_links WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT id,label,status,client_version,machine_name,capabilities,last_seen_at,last_connected_at,created_at,updated_at,revoked_at FROM creator_live_bridges WHERE creator_id=$1 ORDER BY created_at`),
        query(`SELECT event_type,created_at FROM creator_security_events WHERE creator_id=$1 ORDER BY created_at DESC LIMIT 1000`),
        one(`SELECT connected,scope,display_name,avatar_url,follower_count,following_count,likes_count,video_count,updated_at FROM tiktok_connections WHERE creator_id=$1`),
        one(`SELECT enabled_at FROM creator_mfa_totp WHERE creator_id=$1 AND enabled_at IS NOT NULL`),
        query(`SELECT label,device_type,backed_up,transports,created_at,last_used_at FROM creator_webauthn_credentials WHERE creator_id=$1 ORDER BY created_at`)
    ]);

    return sanitizeAccountExportValue({
        format: "cfs_zockt-account-export",
        format_version: 1,
        generated_at: new Date().toISOString(),
        account,
        settings: settings || null,
        module_state: moduleState,
        widgets,
        scenes,
        media_metadata: assets,
        cut_studio: { projects: cutProjects, clips: cutClips, export_jobs: cutJobs },
        game_rules: gameRules,
        beta: { sessions: betaSessions, feedback: betaFeedback },
        billing: billing || null,
        live_sessions_aggregate: liveSessions,
        interaction_rules: interactionRules,
        launcher_devices: launcherLinks,
        live_bridges: liveBridges,
        security_events: securityEvents,
        multi_factor_authentication: {
            totp: mfa ? { enabled:true, enabled_at:mfa.enabled_at } : { enabled:false, enabled_at:null },
            passkeys
        },
        tiktok_connection: tiktok || null,
        excluded_by_design: [
            "MFA/TOTP shared secrets, WebAuthn private keys and recovery-code hashes",
            "password hashes and salts",
            "OAuth access/refresh tokens and OAuth states",
            "widget/source/public tokens and bridge/device secrets",
            "raw media binary content",
            "detailed LIVE/chat/event actor data belonging to third parties",
            "internal administration notes and payment-provider identifiers"
        ]
    });
}


// ============================================================
// CREATOR SESSION
// ============================================================

function creatorSessionCookieOptions({includeMaxAge=true} = {}) {
    return {
        httpOnly:true,
        secure:NODE_ENV !== "development",
        sameSite:"lax",
        priority:"high",
        ...(includeMaxAge ? {maxAge:CREATOR_SESSION_TTL_MS} : {}),
        path:"/"
    };
}

function clearCreatorSessionCookie(res) {
    res.clearCookie(CREATOR_SESSION_COOKIE,creatorSessionCookieOptions({includeMaxAge:false}));
    if (CREATOR_SESSION_COOKIE !== LEGACY_CREATOR_SESSION_COOKIE) {
        res.clearCookie(LEGACY_CREATOR_SESSION_COOKIE,{path:"/"});
    }
}

function clearCreatorAuthCookies(res) {
    clearCreatorSessionCookie(res);
    clearCreatorCsrfCookie(res);
    clearMfaChallengeCookie(res);
    clearAdminElevationCookie(res);
    clearAccountElevationCookies(res);
}

async function createCreatorSession(
    res,
    creatorId,
    authMethod = "password"
) {

    await cleanupExpiredCreatorSessions();

    const token =
        createSessionToken();

    const tokenHash =
        hashSessionToken(
            token
        );

    const expiresAt =
        new Date(
            Date.now() +
            CREATOR_SESSION_TTL_MS
        );

    await pool.query(
        `
        INSERT INTO creator_sessions (
            token_hash,
            creator_id,
            expires_at,
            auth_method,
            last_seen_at
        )

        VALUES (
            $1,
            $2,
            $3,
            $4,
            NOW()
        )
        `,
        [
            tokenHash,
            creatorId,
            expiresAt,
            String(authMethod || "password").slice(0,32)
        ]
    );

    // Pro Creator nur eine begrenzte Zahl aktiver Sessions behalten.
    await pool.query(
        `
        DELETE FROM creator_sessions

        WHERE creator_id = $1

        AND token_hash NOT IN (
            SELECT token_hash
            FROM creator_sessions
            WHERE creator_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        )
        `,
        [
            creatorId,
            CREATOR_MAX_SESSIONS
        ]
    );

    if (CREATOR_SESSION_COOKIE !== LEGACY_CREATOR_SESSION_COOKIE) {
        res.clearCookie(LEGACY_CREATOR_SESSION_COOKIE, {path:"/"});
    }

    clearAdminElevationCookie(res);

    res.cookie(
        CREATOR_SESSION_COOKIE,
        token,
        creatorSessionCookieOptions()
    );

    setCreatorCsrfCookie(
        res,
        token
    );

}


async function destroyCreatorSession(
    req,
    res
) {

    const cookies =
        parseCookies(
            req
        );

    const token =
        cookies[
            CREATOR_SESSION_COOKIE
        ];

    if (token) {

        await pool.query(
            `
            DELETE FROM creator_sessions
            WHERE token_hash = $1
            `,
            [
                hashSessionToken(
                    token
                )
            ]
        );

    }

    clearCreatorAuthCookies(res);

}


async function getCreatorFromRequest(
    req
) {

    const cookies =
        parseCookies(
            req
        );

    const token =
        cookies[
            CREATOR_SESSION_COOKIE
        ];

    if (!token) {
        return null;
    }

    const tokenHash =
        hashSessionToken(
            token
        );

    const result =
        await pool.query(
            `
            SELECT
                a.id,
                a.email,
                a.display_name,
                a.plan,
                a.status,
                a.email_verified_at,
                a.created_at,
                a.updated_at,
                s.last_seen_at AS _session_last_seen_at

            FROM creator_sessions s

            INNER JOIN creator_accounts a
                ON a.id = s.creator_id

            WHERE
                s.token_hash = $1

            AND
                s.expires_at > NOW()

            AND
                s.last_seen_at > NOW() - ($2::bigint * INTERVAL '1 millisecond')

            AND
                a.status = 'active'

            LIMIT 1
            `,
            [
                tokenHash,
                CREATOR_SESSION_IDLE_TTL_MS
            ]
        );

    const account=result.rows[0]||null;
    if (!account) return null;

    const lastSeenAt=account._session_last_seen_at;
    delete account._session_last_seen_at;
    const lastSeenMs=lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
    if (!Number.isFinite(lastSeenMs) || Date.now()-lastSeenMs >= CREATOR_SESSION_TOUCH_INTERVAL_MS) {
        await pool.query(
            `UPDATE creator_sessions SET last_seen_at=NOW() WHERE token_hash=$1 AND expires_at>NOW()`,
            [tokenHash]
        );
    }

    return account;

}


async function launcherReleasePolicy(
    currentVersion = "",
    channel = "stable",
    force = false,
    cohortKey = ""
) {
    const catalog =
        await launcherReleaseCatalog.fetch({
            force:
                force === true
        });

    return {
        catalog: {
            ok:
                catalog.ok,

            repo:
                catalog.repo,

            fetched_at:
                catalog.fetched_at,

            stale:
                catalog.stale,

            cache:
                catalog.cache,

            error:
                catalog.error
        },

        policy:
            buildLauncherReleasePolicy({
                releases:
                    catalog.releases,

                currentVersion:
                    currentVersion,

                channel:
                    channel,

                minStable:
                    LAUNCHER_MIN_STABLE_VERSION,

                minBeta:
                    LAUNCHER_MIN_BETA_VERSION,

                buildTarget:
                    LAUNCHER_BUILD_TARGET_VERSION,

                blockedVersions:
                    LAUNCHER_BLOCKED_VERSIONS,

                maintenanceMode:
                    LAUNCHER_MAINTENANCE_MODE,

                maintenanceMessage:
                    LAUNCHER_MAINTENANCE_MESSAGE,

                rolloutStable:
                    LAUNCHER_STABLE_ROLLOUT_PERCENT,

                rolloutBeta:
                    LAUNCHER_BETA_ROLLOUT_PERCENT,

                pinnedStable:
                    LAUNCHER_PIN_STABLE_VERSION,

                pinnedBeta:
                    LAUNCHER_PIN_BETA_VERSION,

                cohortKey:
                    cohortKey,

                safetyRevision:
                    LAUNCHER_SAFETY_REVISION
            })
    };
}



async function getCreatorGameProfile(creatorId) {
    const data=await getModuleState(creatorId,"games");
    return sanitizeGameProfile(data.state||{});
}

async function getCreatorGameRuntimeRow(creatorId,{ensure=false}={}) {
    await pool.query(`
        UPDATE creator_game_runtime
        SET status='idle',ended_at=COALESCE(ended_at,NOW()),updated_at=NOW(),version=version+1
        WHERE creator_id=$1 AND status='running' AND round_ends_at IS NOT NULL AND round_ends_at<=NOW()
    `,[creatorId]);

    let result=await pool.query(`SELECT * FROM creator_game_runtime WHERE creator_id=$1 LIMIT 1`,[creatorId]);
    if(result.rows[0]||!ensure)return result.rows[0]||null;

    const profile=await getCreatorGameProfile(creatorId);
    result=await pool.query(
        `INSERT INTO creator_game_runtime(creator_id,public_token,status,game_type,title,config,state,created_at,updated_at)
         VALUES($1,$2,'idle',$3,$4,$5::jsonb,$6::jsonb,NOW(),NOW())
         ON CONFLICT(creator_id) DO NOTHING
         RETURNING *`,
        [creatorId,gamePublicToken(),profile.game_type,profile.title,JSON.stringify(profile),JSON.stringify(initialGameState(profile))]
    );
    if(result.rows[0])return result.rows[0];
    const existing=await pool.query(`SELECT * FROM creator_game_runtime WHERE creator_id=$1 LIMIT 1`,[creatorId]);
    return existing.rows[0]||null;
}

async function getCreatorGameRuntimePublic(creatorId,{ensure=false}={}) {
    const row=await getCreatorGameRuntimeRow(creatorId,{ensure});
    return row?publicGameRuntime(row,APP_BASE_URL):null;
}

async function startCreatorGameRuntime(creatorId) {
    const profile=await getCreatorGameProfile(creatorId);
    if(profile.enabled===false)throw new Error("Das Spielprofil ist deaktiviert.");
    await getCreatorGameRuntimeRow(creatorId,{ensure:true});
    const state=initialGameState(profile);
    const result=await pool.query(
        `UPDATE creator_game_runtime
         SET status='running',game_type=$2,title=$3,config=$4::jsonb,state=$5::jsonb,
             started_at=NOW(),round_ends_at=NOW()+($6::int*INTERVAL '1 second'),
             ended_at=NULL,version=version+1,updated_at=NOW()
         WHERE creator_id=$1 RETURNING *`,
        [creatorId,profile.game_type,profile.title,JSON.stringify(profile),JSON.stringify(state),profile.round_seconds]
    );
    return publicGameRuntime(result.rows[0],APP_BASE_URL);
}

async function stopCreatorGameRuntime(creatorId) {
    await getCreatorGameRuntimeRow(creatorId,{ensure:true});
    const result=await pool.query(
        `UPDATE creator_game_runtime SET status='idle',ended_at=NOW(),round_ends_at=NULL,version=version+1,updated_at=NOW() WHERE creator_id=$1 RETURNING *`,
        [creatorId]
    );
    return publicGameRuntime(result.rows[0],APP_BASE_URL);
}

async function resetCreatorGameRuntime(creatorId) {
    const client=await pool.connect();
    try{
        await client.query("BEGIN");
        let current=(await client.query(`SELECT * FROM creator_game_runtime WHERE creator_id=$1 FOR UPDATE`,[creatorId])).rows[0];
        if(!current){
            await client.query("ROLLBACK");
            await getCreatorGameRuntimeRow(creatorId,{ensure:true});
            return resetCreatorGameRuntime(creatorId);
        }
        const profile=sanitizeGameProfile(current.config||{});
        const oldState=current.state||{};
        const next={...initialGameState(profile),round:Number(oldState.round||1)+1,last_action:"reset"};
        const result=await client.query(
            `UPDATE creator_game_runtime
             SET state=$2::jsonb,
                 round_ends_at=CASE WHEN status='running' THEN NOW()+($3::int*INTERVAL '1 second') ELSE NULL END,
                 version=version+1,updated_at=NOW()
             WHERE creator_id=$1 RETURNING *`,
            [creatorId,JSON.stringify(next),profile.round_seconds]
        );
        await client.query("COMMIT");
        return publicGameRuntime(result.rows[0],APP_BASE_URL);
    }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

async function scoreCreatorGameRuntime(creatorId,input={}) {
    const action=sanitizeScoreAction(input);
    const client=await pool.connect();
    try{
        await client.query("BEGIN");
        const current=(await client.query(`SELECT * FROM creator_game_runtime WHERE creator_id=$1 FOR UPDATE`,[creatorId])).rows[0];
        if(!current||current.status!=="running"){
            const error=new Error("Das Game läuft aktuell nicht.");error.code="game_not_running";throw error;
        }
        const profile=sanitizeGameProfile(current.config||{});
        const state={...initialGameState(profile),...(current.state||{})};
        const key=action.team==="b"?"score_b":"score_a";
        state[key]=Math.max(0,Number(state[key]||0)+action.delta);
        state.last_action=`score_${action.team}_${action.delta}`;
        state.target_score=profile.target_score;
        let winner="";
        if(state.score_a>=profile.target_score)winner="a";
        if(state.score_b>=profile.target_score)winner=winner||"b";
        state.winner=winner;
        const result=await client.query(
            `UPDATE creator_game_runtime
             SET state=$2::jsonb,
                 status=CASE WHEN $3<>'' THEN 'idle' ELSE status END,
                 ended_at=CASE WHEN $3<>'' THEN NOW() ELSE ended_at END,
                 round_ends_at=CASE WHEN $3<>'' THEN NULL ELSE round_ends_at END,
                 version=version+1,updated_at=NOW()
             WHERE creator_id=$1 RETURNING *`,
            [creatorId,JSON.stringify(state),winner]
        );
        await client.query("COMMIT");
        return publicGameRuntime(result.rows[0],APP_BASE_URL);
    }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

async function getPublicGameRuntimeByToken(token) {
    if(!validGamePublicToken(token))return null;
    const result=await pool.query(
        `SELECT r.*,c.display_name AS creator_display_name
         FROM creator_game_runtime r JOIN creator_accounts c ON c.id=r.creator_id
         WHERE r.public_token=$1 AND c.status='active' LIMIT 1`,
        [String(token)]
    );
    if(!result.rows[0])return null;
    return{runtime:publicGameRuntime(result.rows[0],APP_BASE_URL),creator:{display_name:result.rows[0].creator_display_name||"Creator"}};
}

async function getCreatorGameSceneSource(creatorId,{ensure=false}={}) {
    const runtime=await getCreatorGameRuntimePublic(creatorId,{ensure});
    return runtime?gameSceneSource(runtime):null;
}

async function getCreatorSceneSources(creatorId,{includeGame=false}={}) {
    const widgets=await getCreatorSceneWidgets(creatorId);
    if(includeGame){
        const game=await getCreatorGameSceneSource(creatorId,{ensure:true});
        if(game)widgets.push(game);
    }
    return widgets;
}

async function listCreatorGameRules(creatorId) {
    const result=await pool.query(
        `SELECT * FROM creator_game_rules WHERE creator_id=$1 ORDER BY created_at ASC`,
        [creatorId]
    );
    return result.rows.map(publicGameRule);
}

async function recentCreatorGameRuleHits(creatorId,limit=20) {
    const safe=Math.max(1,Math.min(100,Number(limit)||20));
    const result=await pool.query(
        `SELECT * FROM creator_game_rule_hits WHERE creator_id=$1 ORDER BY created_at DESC LIMIT ${safe}`,
        [creatorId]
    );
    return result.rows.map(publicGameRuleHit);
}

async function processCreatorGameLiveEvent(creatorId,event) {
    if(!event||!["follow","like","gift","share"].includes(String(event.event_type||"")))return null;

    const access=await creatorAccessProfile(creatorId);
    if(!access?.entitlements?.games)return null;

    const client=await pool.connect();
    try{
        await client.query("BEGIN");
        const runtime=(await client.query(
            `SELECT * FROM creator_game_runtime WHERE creator_id=$1 FOR UPDATE`,
            [creatorId]
        )).rows[0];
        if(!runtime||runtime.status!=="running"){
            await client.query("COMMIT");
            return{applied:0,runtime:null};
        }

        const rules=(await client.query(
            `SELECT * FROM creator_game_rules WHERE creator_id=$1 AND event_type=$2 AND enabled=TRUE ORDER BY created_at ASC`,
            [creatorId,String(event.event_type)]
        )).rows;

        const profile=sanitizeGameProfile(runtime.config||{});
        const state={...initialGameState(profile),...(runtime.state||{})};
        let addA=0,addB=0,applied=0;

        for(const rawRule of rules){
            const rule=sanitizeGameRule(rawRule);
            if(!gameRuleMatches(rule,event))continue;
            const points=gameRulePoints(rule,event);
            if(points<=0)continue;

            const payload=event.payload&&typeof event.payload==="object"?event.payload:{};
            const hit=await client.query(
                `
                INSERT INTO creator_game_rule_hits(
                    creator_id,rule_id,event_id,session_id,event_type,team,points,
                    actor_name,gift_name,created_at
                )
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
                ON CONFLICT(rule_id,event_id) DO NOTHING
                RETURNING id
                `,
                [
                    creatorId,rawRule.id,String(event.id||""),event.session_id||null,
                    String(event.event_type||""),rule.team,points,
                    studioText(event.actor_name,100,""),
                    studioText(payload.gift_name||payload.giftName,120,"")
                ]
            );
            if(!hit.rowCount)continue;

            if(rule.team==="b")addB+=points;else addA+=points;
            applied++;
            await client.query(
                `UPDATE creator_game_rules SET last_triggered_at=NOW(),updated_at=NOW() WHERE creator_id=$1 AND id=$2`,
                [creatorId,rawRule.id]
            );
        }

        if(!applied){
            await client.query("COMMIT");
            return{applied:0,runtime:publicGameRuntime(runtime,APP_BASE_URL)};
        }

        state.score_a=Math.max(0,Number(state.score_a||0)+addA);
        state.score_b=Math.max(0,Number(state.score_b||0)+addB);
        state.last_action=`live_event_${String(event.event_type||"")}`;
        state.target_score=profile.target_score;

        const aWins=state.score_a>=profile.target_score;
        const bWins=state.score_b>=profile.target_score;
        if(aWins&&!bWins)state.winner="a";
        else if(bWins&&!aWins)state.winner="b";
        else if(aWins&&bWins){
            if(state.score_a>state.score_b)state.winner="a";
            else if(state.score_b>state.score_a)state.winner="b";
            else state.winner="";
        } else state.winner="";

        const updated=(await client.query(
            `
            UPDATE creator_game_runtime
            SET state=$2::jsonb,
                status=CASE WHEN $3<>'' THEN 'idle' ELSE status END,
                ended_at=CASE WHEN $3<>'' THEN NOW() ELSE ended_at END,
                round_ends_at=CASE WHEN $3<>'' THEN NULL ELSE round_ends_at END,
                version=version+1,
                updated_at=NOW()
            WHERE creator_id=$1
            RETURNING *
            `,
            [creatorId,JSON.stringify(state),state.winner]
        )).rows[0];

        await client.query("COMMIT");
        return{
            applied,
            points_a:addA,
            points_b:addB,
            runtime:publicGameRuntime(updated,APP_BASE_URL)
        };
    }catch(error){
        await client.query("ROLLBACK");
        throw error;
    }finally{
        client.release();
    }
}

function sanitizeCutAuditionRuntime(input={}) {
    const states=new Set(["playing","paused","stopped","ended","idle"]);
    const state=states.has(String(input?.state||""))?String(input.state):"idle";
    const sessionId=studioText(input?.session_id||input?.sessionId,96,"").replace(/[^a-zA-Z0-9_-]/g,"");
    const startMs=Math.max(0,Math.min(24*60*60*1000,Math.round(Number(input?.start_ms??input?.startMs??0)||0)));
    const endMs=Math.max(startMs,Math.min(24*60*60*1000,Math.round(Number(input?.end_ms??input?.endMs??startMs)||startMs)));
    const positionMs=Math.max(startMs,Math.min(endMs||startMs,Math.round(Number(input?.position_ms??input?.positionMs??startMs)||startMs)));
    const loopEnabled=input?.loop_enabled===true||input?.loopEnabled===true,loopStartMs=Math.max(startMs,Math.min(endMs,Math.round(Number(input?.loop_start_ms??input?.loopStartMs??startMs)||startMs))),loopEndMs=Math.max(loopStartMs,Math.min(endMs,Math.round(Number(input?.loop_end_ms??input?.loopEndMs??endMs)||endMs)));
    const validLoop=loopEnabled&&loopEndMs-loopStartMs>=500,revision=Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.round(Number(input?.revision||0)||0)));
    const now=Date.now(),sampledRaw=Math.round(Number(input?.sampled_at_ms??input?.sampledAtMs??now)||now),sampledAtMs=Math.max(now-300000,Math.min(now+300000,sampledRaw));
    return{session_id:sessionId,state,transport:String(input?.transport||"")==="webaudio"?"webaudio":"local",position_ms:positionMs,start_ms:startMs,end_ms:endMs,loop_enabled:validLoop,loop_start_ms:validLoop?loopStartMs:0,loop_end_ms:validLoop?loopEndMs:0,revision,sampled_at_ms:sampledAtMs};
}
function publicCutAuditionRuntime(row){
    if(!row)return{active:false,state:"idle",session_id:"",position_ms:0,start_ms:0,end_ms:0,loop_enabled:false,loop_start_ms:0,loop_end_ms:0,transport:"",revision:0,sampled_at_ms:0,updated_at:null,fresh:false};
    const updated=row.updated_at?new Date(row.updated_at).getTime():0,fresh=Date.now()-updated<12000,state=String(row.state||"idle");
    return{active:fresh&&["playing","paused"].includes(state),state:fresh?state:(["playing","paused"].includes(state)?"stale":state),session_id:String(row.session_id||""),position_ms:Number(row.position_ms||0),start_ms:Number(row.start_ms||0),end_ms:Number(row.end_ms||0),loop_enabled:row.loop_enabled===true,loop_start_ms:Number(row.loop_start_ms||0),loop_end_ms:Number(row.loop_end_ms||0),transport:String(row.transport||""),revision:Number(row.revision||0),sampled_at_ms:Number(row.sampled_at_ms||0),updated_at:row.updated_at||null,fresh};
}
async function getCutAuditionRuntime(creatorId,projectId){
    const result=await pool.query(`SELECT * FROM creator_cut_audition_runtime WHERE creator_id=$1 AND project_id=$2 LIMIT 1`,[creatorId,projectId]);return publicCutAuditionRuntime(result.rows[0]);
}
async function updateCutAuditionRuntime(creatorId,bridgeId,input={}){
    const projectId=studioText(input?.project_id||input?.projectId,120,"");if(!projectId)throw Object.assign(new Error("Cut-Projekt fehlt für Audition Clock."),{code:"cut_project_missing"});
    const owned=(await pool.query(`SELECT id FROM creator_cut_projects WHERE creator_id=$1 AND id=$2 LIMIT 1`,[creatorId,projectId])).rows[0];if(!owned)throw Object.assign(new Error("Cut-Projekt nicht gefunden."),{code:"cut_project_missing"});
    const clean=sanitizeCutAuditionRuntime(input);
    const result=await pool.query(`
        INSERT INTO creator_cut_audition_runtime(creator_id,project_id,bridge_id,session_id,state,transport,position_ms,start_ms,end_ms,loop_enabled,loop_start_ms,loop_end_ms,revision,sampled_at_ms,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT(creator_id,project_id) DO UPDATE SET
            bridge_id=EXCLUDED.bridge_id,session_id=EXCLUDED.session_id,state=EXCLUDED.state,transport=EXCLUDED.transport,
            position_ms=EXCLUDED.position_ms,start_ms=EXCLUDED.start_ms,end_ms=EXCLUDED.end_ms,loop_enabled=EXCLUDED.loop_enabled,loop_start_ms=EXCLUDED.loop_start_ms,loop_end_ms=EXCLUDED.loop_end_ms,revision=EXCLUDED.revision,
            sampled_at_ms=EXCLUDED.sampled_at_ms,updated_at=NOW()
        WHERE EXCLUDED.sampled_at_ms >= creator_cut_audition_runtime.sampled_at_ms
        RETURNING *`,[creatorId,projectId,bridgeId||null,clean.session_id,clean.state,clean.transport,clean.position_ms,clean.start_ms,clean.end_ms,clean.loop_enabled,clean.loop_start_ms,clean.loop_end_ms,clean.revision,clean.sampled_at_ms]);
    if(result.rows[0])return publicCutAuditionRuntime(result.rows[0]);return getCutAuditionRuntime(creatorId,projectId);
}

async function listCutExportJobs(creatorId,limit=50,{includeAudition=false}={}) {
    const safe=Math.max(1,Math.min(100,Number(limit)||50));
    const result=await pool.query(
        `SELECT * FROM creator_cut_export_jobs WHERE creator_id=$1 ${includeAudition?"":"AND COALESCE(manifest->>'kind','cut_export')<>'cut_audition'"} ORDER BY requested_at DESC LIMIT ${safe}`,
        [creatorId]
    );
    return result.rows.map(publicCutJob);
}

async function createCutExportJob(creatorId,projectId,access) {
    const projectData=await getCutProject(creatorId,projectId);
    if(!projectData)throw Object.assign(new Error("Cut-Projekt nicht gefunden."),{code:"cut_project_missing"});
    const manifest=buildCutJobManifest(projectData.project,projectData.clips);
    if(!manifest.clips.length)throw Object.assign(new Error("Für einen Export-Job muss mindestens ein gültiger Clip ausgewählt sein."),{code:"cut_job_empty"});

    const max=Math.max(0,Number(access?.entitlements?.max_pending_cut_jobs||0));
    const result=await withCreatorResourceLock(creatorId,async client=>{
        const active=await client.query(
            `SELECT COUNT(*)::int AS count FROM creator_cut_export_jobs WHERE creator_id=$1 AND status IN ('queued','claimed','processing') AND COALESCE(manifest->>'kind','cut_export')<>'cut_audition'`,
            [creatorId]
        );
        if(Number(active.rows[0]?.count||0)>=max){
            throw creatorResourceLimitError(`Dein Zugriff erlaubt maximal ${max} gleichzeitig ausstehende Cut-Jobs.`,"cut_job_limit");
        }
        return client.query(
            `INSERT INTO creator_cut_export_jobs(creator_id,project_id,status,manifest,result,requested_at,updated_at)
             VALUES($1,$2,'queued',$3::jsonb,'{}'::jsonb,NOW(),NOW())
             RETURNING *`,
            [creatorId,projectId,JSON.stringify(manifest)]
        );
    });
    return publicCutJob(result.rows[0]);
}

async function createCutAuditionJob(creatorId,projectId,input={}) {
    const projectData=await getCutProject(creatorId,projectId);
    if(!projectData)throw Object.assign(new Error("Cut-Projekt nicht gefunden."),{code:"cut_project_missing"});
    const base=buildCutJobManifest(projectData.project,projectData.clips);
    const mode=String(input?.mode||"mix")==="track"?"track":"mix";
    const action=["preview","pause","resume","stop","session_start","session_seek","loop_start","loop_seek","inspect_zero_cross"].includes(String(input?.action||""))?String(input.action):"preview";
    const startMs=Math.max(0,Math.min(24*60*60*1000,Math.round(Number(input?.start_ms||0))));
    const durationMs=Math.max(1000,Math.min(30000,Math.round(Number(input?.duration_ms||4000))));
    const loopStartMs=Math.max(0,Math.min(24*60*60*1000,Math.round(Number(input?.loop_start_ms||0)))),loopEndMs=Math.max(loopStartMs,Math.min(24*60*60*1000,Math.round(Number(input?.loop_end_ms||0)))),loopCrossfadeMs=Math.max(0,Math.min(50,Math.round(Number(input?.loop_crossfade_ms??12)||0))),zeroCrossRadiusMs=Math.max(5,Math.min(50,Math.round(Number(input?.search_radius_ms??20)||20)));
    const trackKey=studioText(input?.track_key,64,"").replace(/[^a-zA-Z0-9_-]/g,"");
    if(action==="preview"&&mode==="track"&&!trackKey)throw Object.assign(new Error("Für die Spur-Vorschau fehlt der Track."),{code:"cut_audition_track"});
    if(["loop_start","loop_seek"].includes(action)&&loopEndMs-loopStartMs<500)throw Object.assign(new Error("A/B Loop benötigt mindestens 0,5 Sekunden Auswahl."),{code:"cut_audition_loop"});
    if(!String(base.export_preset?.source_handoff_id||""))throw Object.assign(new Error("Timeline-Audition ist nur für einen lokalen Recording-Handoff verfügbar."),{code:"cut_audition_handoff"});
    if(action==="preview"&&mode==="track"&&!base.export_preset?.source_tracks?.some(track=>String(track.key)===trackKey))throw Object.assign(new Error("Recording-Spur ist in diesem Projekt nicht vorhanden."),{code:"cut_audition_track"});

    const manifest={
        ...base,
        schema:13,
        kind:"cut_audition",
        audition:{
            action,
            mode,
            start_ms:startMs,
            duration_ms:durationMs,
            track_key:trackKey,
            loop_start_ms:["loop_start","loop_seek"].includes(action)?loopStartMs:0,
            loop_end_ms:["loop_start","loop_seek"].includes(action)?loopEndMs:0,
            loop_crossfade_ms:["loop_start","loop_seek"].includes(action)?Math.min(loopCrossfadeMs,Math.floor((loopEndMs-loopStartMs)/4)):0,
            search_radius_ms:action==="inspect_zero_cross"?zeroCrossRadiusMs:0,
            requested_at:new Date().toISOString()
        }
    };
    const result=await withCreatorResourceLock(creatorId,async client=>{
        await client.query(
            `UPDATE creator_cut_export_jobs SET status='canceled',updated_at=NOW(),completed_at=NOW(),error_message='superseded_by_new_audition' WHERE creator_id=$1 AND project_id=$2 AND status='queued' AND manifest->>'kind'='cut_audition'`,
            [creatorId,projectId]
        );
        await client.query(
            `DELETE FROM creator_cut_export_jobs WHERE creator_id=$1 AND manifest->>'kind'='cut_audition' AND status IN ('completed','failed','canceled') AND requested_at < NOW()-INTERVAL '1 hour'`,
            [creatorId]
        );
        const active=await client.query(
            `SELECT COUNT(*)::int AS count FROM creator_cut_export_jobs WHERE creator_id=$1 AND status IN ('claimed','processing') AND manifest->>'kind'='cut_audition'`,
            [creatorId]
        );
        if(Number(active.rows[0]?.count||0)>=2){
            throw creatorResourceLimitError("Es laufen bereits zwei lokale Timeline-Vorschauen.","cut_audition_busy");
        }
        return client.query(
            `INSERT INTO creator_cut_export_jobs(creator_id,project_id,status,manifest,result,requested_at,updated_at) VALUES($1,$2,'queued',$3::jsonb,'{}'::jsonb,NOW(),NOW()) RETURNING *`,
            [creatorId,projectId,JSON.stringify(manifest)]
        );
    });
    return publicCutJob(result.rows[0]);
}

async function transitionCutExportJob(creatorId,jobId,to,{bridgeId=null,result=null,errorMessage=""}={}) {
    const client=await pool.connect();
    try{
        await client.query("BEGIN");
        const current=(await client.query(
            `SELECT * FROM creator_cut_export_jobs WHERE creator_id=$1 AND id=$2 FOR UPDATE`,
            [creatorId,jobId]
        )).rows[0];
        if(!current){
            const error=new Error("Cut-Export-Job nicht gefunden.");error.code="cut_job_missing";throw error;
        }
        if(!canTransitionCutJob(current.status,to)){
            const error=new Error(`Cut-Job kann nicht von ${current.status} nach ${to} wechseln.`);error.code="cut_job_transition";throw error;
        }
        if(current.bridge_id&&bridgeId&&String(current.bridge_id)!==String(bridgeId)){
            const error=new Error("Dieser Cut-Job ist bereits einem anderen Launcher zugeordnet.");error.code="cut_job_bridge";throw error;
        }

        const cleanResult=result?sanitizeCutJobResult(result):current.result||{};
        const nextBridge=bridgeId||current.bridge_id||null;
        const updated=(await client.query(
            `
            UPDATE creator_cut_export_jobs
            SET status=$3,
                bridge_id=$4,
                attempts=CASE WHEN $3='claimed' THEN attempts+1 ELSE attempts END,
                claimed_at=CASE WHEN $3='claimed' THEN NOW() ELSE claimed_at END,
                started_at=CASE WHEN $3='processing' THEN NOW() ELSE started_at END,
                completed_at=CASE WHEN $3='completed' THEN NOW() ELSE completed_at END,
                result=$5::jsonb,
                error_message=$6,
                updated_at=NOW()
            WHERE creator_id=$1 AND id=$2
            RETURNING *
            `,
            [creatorId,jobId,to,nextBridge,JSON.stringify(cleanResult),studioText(errorMessage,2000,"")]
        )).rows[0];
        await client.query("COMMIT");
        return publicCutJob(updated);
    }catch(error){
        await client.query("ROLLBACK");
        throw error;
    }finally{client.release()}
}

async function listCutProjects(creatorId) {
    const result=await pool.query(
        `SELECT p.*,COUNT(c.id)::int AS clip_count
         FROM creator_cut_projects p LEFT JOIN creator_cut_clips c ON c.project_id=p.id
         WHERE p.creator_id=$1 GROUP BY p.id ORDER BY p.updated_at DESC`,
        [creatorId]
    );
    return result.rows.map(row=>publicCutProject(row,row.clip_count));
}

async function getCutProject(creatorId,projectId) {
    const projectResult=await pool.query(
        `SELECT p.*,(SELECT COUNT(*)::int FROM creator_cut_clips c WHERE c.project_id=p.id) AS clip_count
         FROM creator_cut_projects p WHERE p.creator_id=$1 AND p.id=$2 LIMIT 1`,
        [creatorId,projectId]
    );
    const row=projectResult.rows[0];
    if(!row)return null;
    const clips=await pool.query(`SELECT * FROM creator_cut_clips WHERE creator_id=$1 AND project_id=$2 ORDER BY sort_order ASC, created_at ASC`,[creatorId,projectId]);
    return{project:publicCutProject(row,row.clip_count),clips:clips.rows.map(publicCutClip)};
}

async function createCutProjectWithLimit(creatorId,clean,maxProjects){
    return withCreatorResourceLock(creatorId,async client=>{
        const count=await client.query(`SELECT COUNT(*)::int AS count FROM creator_cut_projects WHERE creator_id=$1`,[creatorId]);
        if(Number(count.rows[0]?.count||0)>=Number(maxProjects||0)){
            throw creatorResourceLimitError(`Dein Zugriff erlaubt maximal ${Number(maxProjects||0)} Cut-Studio Projekte.`,"cut_project_limit");
        }
        return client.query(
            `INSERT INTO creator_cut_projects(creator_id,title,status,format,notes,source_name,export_preset,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,NOW(),NOW()) RETURNING *`,
            [creatorId,clean.title,clean.status,clean.format,clean.notes,clean.source_name,JSON.stringify(clean.export_preset)]
        );
    });
}

async function createCutClipWithLimit(creatorId,projectId,requested,maxClips){
    return withCreatorResourceLock(creatorId,async client=>{
        const project=(await client.query(
            `SELECT id FROM creator_cut_projects WHERE creator_id=$1 AND id=$2 FOR UPDATE`,
            [creatorId,projectId]
        )).rows[0];
        if(!project){
            const error=new Error("Cut-Projekt nicht gefunden.");
            error.code="cut_project_missing";
            error.statusCode=404;
            throw error;
        }
        const count=await client.query(
            `SELECT COUNT(*)::int AS count,COALESCE(MAX(sort_order),-1)+1 AS next_order FROM creator_cut_clips WHERE creator_id=$1 AND project_id=$2`,
            [creatorId,projectId]
        );
        if(Number(count.rows[0]?.count||0)>=Number(maxClips||0)){
            throw creatorResourceLimitError(`Dieses Projekt erlaubt maximal ${Number(maxClips||0)} Clips.`,"cut_clip_limit");
        }
        const clean={...requested,sort_order:Number(count.rows[0]?.next_order||0)};
        const result=await client.query(
            `INSERT INTO creator_cut_clips(project_id,creator_id,label,in_ms,out_ms,caption,selected,sort_order,caption_enabled,caption_position,caption_size,caption_style,audio_gain_db,audio_fade_in_ms,audio_fade_out_ms,keyframe_enabled,keyframe_zoom_start,keyframe_zoom_end,keyframe_pan_x_start,keyframe_pan_x_end,keyframe_pan_y_start,keyframe_pan_y_end,keyframe_easing,visual_keyframes,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb,NOW(),NOW()) RETURNING *`,
            [projectId,creatorId,clean.label,clean.in_ms,clean.out_ms,clean.caption,clean.selected,clean.sort_order,clean.caption_enabled,clean.caption_position,clean.caption_size,clean.caption_style,clean.audio_gain_db,clean.audio_fade_in_ms,clean.audio_fade_out_ms,clean.keyframe_enabled,clean.keyframe_zoom_start,clean.keyframe_zoom_end,clean.keyframe_pan_x_start,clean.keyframe_pan_x_end,clean.keyframe_pan_y_start,clean.keyframe_pan_y_end,clean.keyframe_easing,JSON.stringify(clean.visual_keyframes||[])]
        );
        await client.query(`UPDATE creator_cut_projects SET updated_at=NOW() WHERE creator_id=$1 AND id=$2`,[creatorId,projectId]);
        return result;
    });
}

async function getCreatorSceneWidgets(creatorId) {
    const result=await pool.query(
        `SELECT * FROM creator_widgets WHERE creator_id=$1 ORDER BY updated_at DESC`,
        [creatorId]
    );
    return result.rows.map(publicStudioWidgetRow);
}
async function getCreatorSceneRow(creatorId,sceneId) {
    const result=await pool.query(
        `SELECT * FROM creator_widget_scenes WHERE creator_id=$1 AND id=$2 LIMIT 1`,
        [creatorId,sceneId]
    );
    return result.rows[0]||null;
}
async function getPublicSceneRow(token) {
    if(!validScenePublicToken(token))return null;
    const result=await pool.query(
        `
        SELECT s.*,c.display_name AS creator_display_name
        FROM creator_widget_scenes s
        JOIN creator_accounts c ON c.id=s.creator_id
        WHERE s.public_token=$1
          AND s.status='live'
          AND s.published_config IS NOT NULL
          AND c.status='active'
        LIMIT 1
        `,
        [String(token)]
    );
    return result.rows[0]||null;
}
async function hydratePublicScene(sceneRow) {
    const config=sanitizeSceneConfig(sceneRow.published_config||{});
    const layouts=config.layouts&&typeof config.layouts==="object"?config.layouts:{[config.profile]:{canvas:config.canvas,items:config.items}};
    const ids=[...new Set(Object.values(layouts).flatMap(layout=>(layout?.items||[]).map(item=>String(item.widget_id))).filter(Boolean))];
    const basePayload={scene:publicSceneRow(sceneRow,APP_BASE_URL),creator:{display_name:sceneRow.creator_display_name||"Creator"}};
    if(!ids.length)return{...basePayload,items:[],layouts:Object.fromEntries(Object.entries(layouts).map(([key,layout])=>[key,{canvas:layout.canvas,items:[]}]))};

    const normalIds=ids.filter(id=>id!=="game_runtime");
    const widgetMap=new Map();
    if(normalIds.length){
        const widgets=await pool.query(
            `SELECT * FROM creator_widgets
             WHERE creator_id=$1 AND id=ANY($2::text[]) AND status='live' AND published_config IS NOT NULL`,
            [sceneRow.creator_id,normalIds]
        );
        for(const row of widgets.rows){
            const widget=publicStudioWidgetRow(row);
            widgetMap.set(String(widget.id),widget);
        }
    }
    if(ids.includes("game_runtime")){
        const game=await getCreatorGameSceneSource(sceneRow.creator_id,{ensure:false});
        if(game)widgetMap.set("game_runtime",game);
    }
    const hydrateItems=items=>(items||[]).map(item=>{
        const widget=widgetMap.get(String(item.widget_id));if(!widget)return null;
        const published=widget.published_config||{};
        return{...item,widget:{id:widget.id,name:widget.name,widget_type:widget.widget_type,public_token:widget.public_token,source_url:widget.source_url,canvas:published.canvas||{width:600,height:120}}};
    }).filter(Boolean);
    const hydratedLayouts=Object.fromEntries(Object.entries(layouts).map(([key,layout])=>[key,{canvas:layout.canvas,items:hydrateItems(layout.items)}]));
    return{...basePayload,items:hydrateItems(config.items),layouts:hydratedLayouts};
}

// ============================================================
// CFS STREAM STUDIO - CONTROL PLANE
// Website speichert nur Konfiguration. Rohes Capture/Audio bleibt lokal.
// ============================================================

const STREAM_STUDIO_TRANSITIONS = new Set(["cut","fade","dissolve","slide_left","slide_right","slide_up","zoom"]);
const STREAM_STUDIO_OUTPUT_PROFILES = new Set(["1080p60","1080p30","720p60","vertical1080p60"]);
const STREAM_STUDIO_DESTINATIONS = new Set(["recording_only","tiktok","twitch","youtube","kick","facebook","custom_rtmp"]);
const STREAM_STUDIO_MULTISTREAM_PROVIDERS = new Set(["youtube","twitch","tiktok","kick","facebook","custom_rtmp"]);
const STREAM_STUDIO_ENCODERS = new Set(["auto","nvenc","amd","qsv","software"]);
const STREAM_STUDIO_AUDIO_BITRATES = new Set([128,160,192,256,320]);
const STREAM_STUDIO_TARGET_ID_RX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function streamStudioMultistreamLimit(access){
    if(access?.admin)return 8;
    const plan=normalizePlan(access?.effective_plan||access?.plan||"free");
    return plan==="pro"?4:(plan==="creator"?2:1);
}

function streamStudioDefaultTargets(){
    return [
        {id:"youtube",label:"YouTube",provider:"youtube",enabled:false,profile:"1080p60",bitrate_kbps:6000,audio_bitrate_kbps:160},
        {id:"twitch",label:"Twitch",provider:"twitch",enabled:false,profile:"1080p60",bitrate_kbps:6000,audio_bitrate_kbps:160},
        {id:"tiktok",label:"TikTok",provider:"tiktok",enabled:false,profile:"vertical1080p60",bitrate_kbps:4500,audio_bitrate_kbps:160},
        {id:"kick",label:"Kick",provider:"kick",enabled:false,profile:"1080p60",bitrate_kbps:6000,audio_bitrate_kbps:160}
    ];
}

const STREAM_STUDIO_DOCK_ZONES=["left","center","right","bottom","wide"];
const STREAM_STUDIO_DOCK_ITEMS=["scenes","monitors","scene_composer","transition","overlay_rack","sources","capture","audio","output","preflight","session","health","activity","multistream"];

function streamStudioWorkspaceDefaults(){
    return {
        version:2,
        zones:{
            left:["scenes"],
            center:["monitors","scene_composer","transition","overlay_rack"],
            right:["sources"],
            bottom:["capture","audio","output"],
            wide:["preflight","session","health","activity","multistream"]
        },
        sizes:{},
        columns:{left_px:250,right_px:310}
    };
}

function sanitizeStreamStudioWorkspace(input={}){
    const defaults=streamStudioWorkspaceDefaults();
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const zones=source.zones&&typeof source.zones==="object"&&!Array.isArray(source.zones)?source.zones:{};
    const allowed=new Set(STREAM_STUDIO_DOCK_ITEMS);
    const seen=new Set();
    const clean={version:2,zones:{},sizes:{},columns:{left_px:250,right_px:310}};
    for(const zone of STREAM_STUDIO_DOCK_ZONES){
        clean.zones[zone]=[];
        const requested=Array.isArray(zones[zone])?zones[zone]:[];
        for(const raw of requested){
            const id=String(raw||"").trim();
            if(!allowed.has(id)||seen.has(id))continue;
            seen.add(id);
            clean.zones[zone].push(id);
        }
    }
    for(const zone of STREAM_STUDIO_DOCK_ZONES){
        for(const id of defaults.zones[zone]){
            if(seen.has(id))continue;
            seen.add(id);
            clean.zones[zone].push(id);
        }
    }
    const sizes=source.sizes&&typeof source.sizes==="object"&&!Array.isArray(source.sizes)?source.sizes:{};
    for(const id of STREAM_STUDIO_DOCK_ITEMS){
        const value=sizes[id];
        if(!value||typeof value!=="object"||Array.isArray(value))continue;
        const size={};
        if(Number.isFinite(Number(value.width_px)))size.width_px=Math.round(clampNumber(value.width_px,220,1600,220));
        if(Number.isFinite(Number(value.height_px)))size.height_px=Math.round(clampNumber(value.height_px,80,1400,80));
        if(Object.keys(size).length)clean.sizes[id]=size;
    }
    const columns=source.columns&&typeof source.columns==="object"&&!Array.isArray(source.columns)?source.columns:{};
    clean.columns.left_px=Math.round(clampNumber(columns.left_px,190,520,250));
    clean.columns.right_px=Math.round(clampNumber(columns.right_px,220,620,310));
    return clean;
}

function sanitizeStreamStudioWorkspacePresets(input=[]){
    const source=Array.isArray(input)?input:[],seen=new Set(),out=[];
    for(let index=0;index<source.length&&out.length<6;index++){
        const raw=source[index]&&typeof source[index]==="object"&&!Array.isArray(source[index])?source[index]:{};
        let id=studioText(raw.id,64,`workspace_${index+1}`).toLowerCase().replace(/[^a-z0-9_-]/g,"_");
        if(!id)id=`workspace_${index+1}`;
        if(seen.has(id))continue;
        seen.add(id);
        out.push({id,name:studioText(raw.name,40,`Workspace ${out.length+1}`),layout:sanitizeStreamStudioWorkspace(raw.layout)});
    }
    return out;
}

function streamStudioDefaults(){
    return {
        version:4,
        program_scene_id:"",
        preview_scene_id:"",
        scene_order:[],
        overlay_widget_ids:[],
        overlay_layout:{},
        transition:{type:"fade",duration_ms:350},
        workspace_layout:streamStudioWorkspaceDefaults(),
        workspace_presets:[],
        capture_sources:{display:false,window:false,game:false,camera:false},
        audio:{
            microphone:{level:85,muted:false},
            game:{level:80,muted:false},
            discord:{level:80,muted:false},
            music:{level:65,muted:false},
            alerts:{level:90,muted:false}
        },
        output:{
            profile:"1080p60",
            destination:"recording_only",
            encoder:"auto",
            bitrate_kbps:6000,
            audio_bitrate_kbps:160,
            recording_format:"mkv",
            recording_tracks:{mix:true,mic:true,game:true,discord:true,music:true,alerts:true}
        },
        multistream:{
            mode:"launcher_local",
            destinations:streamStudioDefaultTargets(),
            failure_policy:"isolate_destination",
            cloud_relay:false,
            credentials:"launcher_local_only"
        }
    };
}

function sanitizeStreamStudioTarget(input,index=0){
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const provider=STREAM_STUDIO_MULTISTREAM_PROVIDERS.has(String(source.provider||""))?String(source.provider):"custom_rtmp";
    let id=studioText(source.id,64,"").toLowerCase().replace(/[^a-z0-9_-]/g,"_");
    if(!STREAM_STUDIO_TARGET_ID_RX.test(id))id=`target_${index+1}`;
    const label=studioText(source.label,48,provider==="custom_rtmp"?"Eigenes RTMP-Ziel":provider);
    const profile=STREAM_STUDIO_OUTPUT_PROFILES.has(String(source.profile||""))?String(source.profile):(provider==="tiktok"?"vertical1080p60":"1080p60");
    const audioBitrate=Number(source.audio_bitrate_kbps);
    return {
        id,label,provider,enabled:source.enabled===true,profile,
        bitrate_kbps:Math.round(clampNumber(source.bitrate_kbps,1000,30000,provider==="tiktok"?4500:6000)),
        audio_bitrate_kbps:STREAM_STUDIO_AUDIO_BITRATES.has(audioBitrate)?audioBitrate:160,
        credential_mode:"launcher_local"
    };
}

function sanitizeStreamStudioConfig(input={},allowedSceneIds=null,allowedWidgetIds=null,multistreamLimit=8,ownedSceneIds=null){
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const clean=streamStudioDefaults();
    const safeScene=value=>{
        const id=studioText(value,100,"");
        return id&&(!allowedSceneIds||allowedSceneIds.has(id))?id:"";
    };
    clean.program_scene_id=safeScene(source.program_scene_id);
    clean.preview_scene_id=safeScene(source.preview_scene_id);
    const requestedSceneOrder=[...new Set(Array.isArray(source.scene_order)?source.scene_order.map(value=>studioText(value,100,"")).filter(Boolean):[])];
    clean.scene_order=ownedSceneIds?requestedSceneOrder.filter(id=>ownedSceneIds.has(id)):requestedSceneOrder.slice(0,100);
    if(ownedSceneIds){for(const id of ownedSceneIds){if(!clean.scene_order.includes(id))clean.scene_order.push(id)}}
    clean.scene_order=clean.scene_order.slice(0,100);
    const widgetIds=[...new Set(Array.isArray(source.overlay_widget_ids)?source.overlay_widget_ids.map(value=>studioText(value,100,"")).filter(Boolean):[])].slice(0,24);
    clean.overlay_widget_ids=allowedWidgetIds?widgetIds.filter(id=>allowedWidgetIds.has(id)):widgetIds;
    const layout=source.overlay_layout&&typeof source.overlay_layout==="object"&&!Array.isArray(source.overlay_layout)?source.overlay_layout:{};
    for(const id of clean.overlay_widget_ids){
        const value=layout[id]&&typeof layout[id]==="object"?layout[id]:{};
        clean.overlay_layout[id]={
            x:clampNumber(value.x,3,97,20),
            y:clampNumber(value.y,3,97,20),
            scale:clampNumber(value.scale,.4,2,1)
        };
    }
    const transition=source.transition&&typeof source.transition==="object"?source.transition:{};
    clean.transition.type=STREAM_STUDIO_TRANSITIONS.has(String(transition.type||""))?String(transition.type):"fade";
    clean.transition.duration_ms=clean.transition.type==="cut"?0:Math.round(clampNumber(transition.duration_ms,120,2500,350));
    clean.workspace_layout=sanitizeStreamStudioWorkspace(source.workspace_layout);
    clean.workspace_presets=sanitizeStreamStudioWorkspacePresets(source.workspace_presets);
    for(const key of Object.keys(clean.capture_sources))clean.capture_sources[key]=source.capture_sources?.[key]===true;
    for(const key of Object.keys(clean.audio)){
        const legacy=key==="game"&&source.audio?.desktop&&typeof source.audio.desktop==="object"?source.audio.desktop:null;
        const row=source.audio?.[key]&&typeof source.audio[key]==="object"?source.audio[key]:legacy;
        clean.audio[key].level=Math.round(clampNumber(row?.level,0,100,clean.audio[key].level));
        clean.audio[key].muted=row?.muted===true;
    }
    const output=source.output&&typeof source.output==="object"?source.output:{};
    clean.output.profile=STREAM_STUDIO_OUTPUT_PROFILES.has(String(output.profile||""))?String(output.profile):"1080p60";
    clean.output.destination=STREAM_STUDIO_DESTINATIONS.has(String(output.destination||""))?String(output.destination):"recording_only";
    clean.output.encoder=STREAM_STUDIO_ENCODERS.has(String(output.encoder||""))?String(output.encoder):"auto";
    clean.output.bitrate_kbps=Math.round(clampNumber(output.bitrate_kbps,1000,30000,6000));
    const audioBitrate=Number(output.audio_bitrate_kbps);
    clean.output.audio_bitrate_kbps=STREAM_STUDIO_AUDIO_BITRATES.has(audioBitrate)?audioBitrate:160;
    clean.output.recording_format=["mkv","mp4"].includes(String(output.recording_format||""))?String(output.recording_format):"mkv";
    const tracks=output.recording_tracks&&typeof output.recording_tracks==="object"&&!Array.isArray(output.recording_tracks)?output.recording_tracks:{};
    clean.output.recording_tracks={
        mix:tracks.mix!==false,
        mic:tracks.mic!==false&&tracks.audio1!==false,
        game:tracks.game!==false&&tracks.audio2!==false,
        discord:tracks.discord!==false,
        music:tracks.music!==false,
        alerts:tracks.alerts!==false
    };
    if(!Object.values(clean.output.recording_tracks).some(Boolean))clean.output.recording_tracks.mix=true;

    const multi=source.multistream&&typeof source.multistream==="object"&&!Array.isArray(source.multistream)?source.multistream:{};
    const requested=Array.isArray(multi.destinations)?multi.destinations:[];
    const rawTargets=requested.length?requested:streamStudioDefaultTargets();
    const seen=new Set();
    clean.multistream.destinations=[];
    for(let index=0;index<rawTargets.length&&clean.multistream.destinations.length<8;index++){
        const target=sanitizeStreamStudioTarget(rawTargets[index],index);
        if(seen.has(target.id))continue;
        seen.add(target.id);
        clean.multistream.destinations.push(target);
    }
    for(const preset of streamStudioDefaultTargets()){
        if(!seen.has(preset.id)){seen.add(preset.id);clean.multistream.destinations.push(sanitizeStreamStudioTarget(preset,clean.multistream.destinations.length));}
    }
    clean.multistream.destinations=clean.multistream.destinations.slice(0,8);
    const limit=Math.max(1,Math.min(8,Math.round(Number(multistreamLimit)||1)));
    let enabled=0;
    for(const target of clean.multistream.destinations){
        if(target.enabled){
            enabled+=1;
            if(enabled>limit)target.enabled=false;
        }
    }
    // Migration aus dem bisherigen Einzelziel, ohne Zugangsdaten in die Cloud zu übernehmen.
    if(!requested.length&&clean.output.destination!=="recording_only"){
        const legacy=clean.multistream.destinations.find(target=>target.provider===clean.output.destination);
        if(legacy)legacy.enabled=true;
    }
    clean.multistream.mode="launcher_local";
    clean.multistream.failure_policy="isolate_destination";
    clean.multistream.cloud_relay=false;
    clean.multistream.credentials="launcher_local_only";
    return clean;
}

function requestedStreamStudioDestinationCount(input={}){
    const destinations=Array.isArray(input?.multistream?.destinations)?input.multistream.destinations:[];
    return destinations.reduce((count,target)=>count+(target&&typeof target==="object"&&target.enabled===true?1:0),0);
}

async function streamStudioSourceContext(creatorId,accountOrId=creatorId){
    const access=await creatorAccessProfile(accountOrId);
    const sceneRows=(await pool.query(`SELECT * FROM creator_widget_scenes WHERE creator_id=$1 ORDER BY updated_at DESC`,[creatorId])).rows;
    const liveSceneIds=new Set(sceneRows.filter(row=>row.status==="live"&&row.published_config).map(row=>String(row.id)));
    const ownedSceneIds=new Set(sceneRows.map(row=>String(row.id)));
    const sceneSources=await getCreatorSceneSources(creatorId,{includeGame:Boolean(access.entitlements.games)});
    const liveSourceIds=new Set(sceneSources.filter(source=>source.status==="live").map(source=>String(source.id)));
    return {access,sceneRows,sceneSources,liveSceneIds,ownedSceneIds,liveSourceIds};
}

function publicStreamStudioSource(source){
    return {
        id:String(source.id),
        name:source.name||"Widget",
        widget_type:source.widget_type||"widget",
        status:source.status||"draft",
        source_url:source.source_url||"",
        source_urls:source.source_urls||{},
        canvas:source.published_config?.canvas||source.canvas||{width:600,height:120}
    };
}

// ============================================================
// CREATOR RESOURCE TRANSACTIONS · SECURITY HARDENING R44
//
// Quoten werden nicht nur im UI geprüft. Alle count->insert-Pfade, die
// ein Creator-Limit schützen, können diese Transaktion nutzen. Das
// SELECT ... FOR UPDATE auf dem Creator-Datensatz serialisiert konkurrierende
// Requests auch über mehrere Node/Render-Instanzen hinweg.
// ============================================================

function creatorResourceLimitError(message, code = "creator_resource_limit") {
    const error = new Error(String(message || "Creator-Limit erreicht."));
    error.code = code;
    error.statusCode = 403;
    return error;
}

async function withCreatorResourceLock(creatorId, task) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const owner = await client.query(
            `SELECT id FROM creator_accounts WHERE id=$1 FOR UPDATE`,
            [creatorId]
        );
        if (!owner.rows[0]) {
            const error = new Error("Creator-Account nicht gefunden.");
            error.code = "creator_missing";
            error.statusCode = 404;
            throw error;
        }
        const value = await task(client);
        await client.query("COMMIT");
        return value;
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        throw error;
    } finally {
        client.release();
    }
}

// ============================================================
// CREATOR AUTH MIDDLEWARE
// ============================================================

async function requireCreatorAccount(
    req,
    res,
    next
) {

    try {

        const account =
            await getCreatorFromRequest(
                req
            );

        if (!account) {

            return res
                .status(401)
                .json({

                    ok:
                        false,

                    authenticated:
                        false,

                    error:
                        "Du bist nicht angemeldet."

                });

        }

        req.creatorAccount =
            account;

        ensureCreatorCsrfCookie(
            req,
            res
        );

        if (!isSafeHttpMethod(req.method)) {
            return creatorWriteLimiter(req, res, next);
        }

        next();

    }
    catch (error) {

        safeLogError("Creator Auth Fehler:",error);

        return res
            .status(500)
            .json({

                ok:
                    false,

                error:
                    "Creator-Session konnte nicht geprüft werden."

            });

    }

}


// ============================================================
// SECURITY EVENT LOG
//
// Nur minimale Account-Sicherheitsereignisse.
// Keine Klartext-IP, kein User-Agent, kein Fingerprinting.
// Ein Log-Fehler darf Login oder andere Kernfunktionen nicht blockieren.
// ============================================================

const ALLOWED_SECURITY_EVENT_TYPES =
    new Set([
        "account_registered",
        "login_success",
        "login_success_mfa",
        "login_success_passkey",
        "mfa_after_password_failed",
        "login_throttled",
        "logout_all",
        "logout_others",
        "profile_updated",
        "session_revoked",
        "data_export_requested",
        "tiktok_disconnected",
        "public_output_token_rotated",
        "asset_public_token_rotated",
        "password_changed",
        "email_verification_requested",
        "email_verified",
        "password_reset_requested",
        "password_reset_completed",
        "mfa_enabled",
        "mfa_disabled",
        "mfa_recovery_code_used",
        "mfa_recovery_codes_regenerated",
        "passkey_added",
        "passkey_removed",
        "admin_elevation_granted",
        "admin_elevation_failed",
        "account_elevation_granted",
        "account_elevation_totp_granted",
        "account_elevation_recovery_granted",
        "account_elevation_passkey_granted",
        "account_elevation_failed",
        "admin_audit_exported",
        "incident_mode_changed",
        "incident_sessions_revoked",
        "incident_launchers_revoked"
    ]);


async function recordSecurityEvent(
    creatorId,
    eventType
) {

    if (
        !creatorId ||
        !ALLOWED_SECURITY_EVENT_TYPES.has(
            eventType
        )
    ) {

        return;

    }


    try {

        await pool.query(
            `
            INSERT INTO creator_security_events (
                creator_id,
                event_type,
                created_at
            )

            VALUES (
                $1,
                $2,
                NOW()
            )
            `,
            [
                creatorId,
                eventType
            ]
        );

    }
    catch (error) {

        safeLogError("Security Event Log Fehler:",error);

    }

}


async function isCreatorSuiteAdmin(account) {
    if (!account?.id) return false;

    if (CFS_ADMIN_CREATOR_IDS.has(String(account.id))) return true;
    if (CFS_ADMIN_EMAILS.has(String(account.email || "").trim().toLowerCase())) return true;

    const legacyOwner = await pool.query(
        `SELECT 1 FROM creator_tiktok_legacy_owner WHERE slot='default' AND creator_id=$1 LIMIT 1`,
        [account.id]
    );
    return legacyOwner.rowCount > 0;
}

async function requireCreatorAdmin(req,res,next) {
    try {
        if (!req.creatorAccount) {
            return requireCreatorAccount(req,res,async()=>requireCreatorAdmin(req,res,next));
        }
        if (!(await isCreatorSuiteAdmin(req.creatorAccount))) {
            return res.status(403).json({ok:false,error:"Dieser Bereich ist nur für CFS Root/Admin freigeschaltet."});
        }
        next();
    } catch (error) {
        safeLogError("Creator Admin Auth Fehler:",error);
        return res.status(500).json({ok:false,error:"Admin-Berechtigung konnte nicht geprüft werden."});
    }
}


function accountElevationCookieOptions({includeMaxAge=true,pending=false} = {}) {
    return {
        httpOnly:true,
        secure:NODE_ENV!=="development",
        sameSite:"strict",
        priority:"high",
        ...(includeMaxAge ? {maxAge:pending?ACCOUNT_ELEVATION_PENDING_TTL_MS:ACCOUNT_ELEVATION_TTL_MS} : {}),
        path:"/"
    };
}

function clearAccountElevationCookies(res) {
    res.clearCookie(ACCOUNT_ELEVATION_COOKIE,accountElevationCookieOptions({includeMaxAge:false}));
    res.clearCookie(ACCOUNT_ELEVATION_PENDING_COOKIE,accountElevationCookieOptions({includeMaxAge:false,pending:true}));
}

function createAccountElevationToken(req,{pending=false,factor="password"}={}) {
    const sessionHash=currentCreatorSessionHash(req);
    if(!sessionHash || !req.creatorAccount?.id || !ACCOUNT_ELEVATION_SECRET) return "";
    const ttl=pending?ACCOUNT_ELEVATION_PENDING_TTL_MS:ACCOUNT_ELEVATION_TTL_MS;
    const payload=Buffer.from(JSON.stringify({
        v:1,
        cid:String(req.creatorAccount.id),
        exp:Date.now()+ttl,
        pending:Boolean(pending),
        factor:String(factor||"password").slice(0,32),
        nonce:crypto.randomBytes(12).toString("base64url")
    }),"utf8").toString("base64url");
    const scope=pending?"pending":"active";
    const signature=crypto.createHmac("sha256",ACCOUNT_ELEVATION_SECRET)
        .update(`cfs-account-elevation-v1|${scope}|${payload}|${sessionHash}`)
        .digest("base64url");
    return `${payload}.${signature}`;
}

function accountElevationTokenState(req,{pending=false}={}) {
    const cookies=parseCookies(req);
    const cookieName=pending?ACCOUNT_ELEVATION_PENDING_COOKIE:ACCOUNT_ELEVATION_COOKIE;
    const raw=String(cookies[cookieName]||"");
    const sessionHash=currentCreatorSessionHash(req);
    if(!raw || !sessionHash || !ACCOUNT_ELEVATION_SECRET || !req.creatorAccount?.id) return {active:false,expires_at:null,factor:null};
    const [payloadPart,signature]=raw.split(".");
    if(!payloadPart || !signature) return {active:false,expires_at:null,factor:null};
    const scope=pending?"pending":"active";
    const expected=crypto.createHmac("sha256",ACCOUNT_ELEVATION_SECRET)
        .update(`cfs-account-elevation-v1|${scope}|${payloadPart}|${sessionHash}`)
        .digest("base64url");
    if(!safeEqualText(signature,expected)) return {active:false,expires_at:null,factor:null};
    try {
        const payload=JSON.parse(Buffer.from(payloadPart,"base64url").toString("utf8"));
        if(payload?.v!==1 || String(payload?.cid||"")!==String(req.creatorAccount.id) || Boolean(payload?.pending)!==Boolean(pending)) return {active:false,expires_at:null,factor:null};
        const expiresAt=Number(payload?.exp||0),ttl=pending?ACCOUNT_ELEVATION_PENDING_TTL_MS:ACCOUNT_ELEVATION_TTL_MS;
        if(!Number.isFinite(expiresAt) || expiresAt<=Date.now() || expiresAt>Date.now()+ttl+30000) return {active:false,expires_at:null,factor:null};
        return {active:true,expires_at:new Date(expiresAt).toISOString(),factor:String(payload?.factor||"password")};
    } catch {
        return {active:false,expires_at:null,factor:null};
    }
}

function grantAccountElevation(req,res,factor="password") {
    const token=createAccountElevationToken(req,{factor});
    if(!token) return null;
    const expiresAt=new Date(Date.now()+ACCOUNT_ELEVATION_TTL_MS).toISOString();
    res.cookie(ACCOUNT_ELEVATION_COOKIE,token,accountElevationCookieOptions());
    res.clearCookie(ACCOUNT_ELEVATION_PENDING_COOKIE,accountElevationCookieOptions({includeMaxAge:false,pending:true}));
    return {active:true,expires_at:expiresAt,factor};
}

function requireCreatorAccountElevation(req,res,next) {
    const state=accountElevationTokenState(req);
    if(state.active){req.accountElevation=state;return next();}
    res.clearCookie(ACCOUNT_ELEVATION_COOKIE,accountElevationCookieOptions({includeMaxAge:false}));
    return res.status(428).json({
        ok:false,
        code:"account_reauth_required",
        error:"Diese sensible Aktion benötigt eine frische Sicherheitsbestätigung.",
        elevation_required:true
    });
}

app.get("/api/account/elevation",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    const [state,methods]=await Promise.all([
        Promise.resolve(accountElevationTokenState(req)),
        creatorAuthMethods(req.creatorAccount.id)
    ]);
    return res.json({ok:true,active:state.active,expires_at:state.expires_at,factor:state.factor,ttl_seconds:Math.floor(ACCOUNT_ELEVATION_TTL_MS/1000),methods:{totp:methods.totp,passkey:methods.passkey,recovery:methods.recovery_codes_remaining>0}});
});

app.post("/api/account/elevation",requireCreatorAccount,accountElevationLimiter,async(req,res)=>{
    res.set("Cache-Control","no-store");
    const password=String(req.body?.password||"");
    const code=String(req.body?.code||"").trim();
    const recoveryCode=String(req.body?.recovery_code||"").trim();
    const method=String(req.body?.method||"").trim().toLowerCase();
    if(!password || password.length>PASSWORD_MAX_LENGTH) return res.status(400).json({ok:false,error:"Bitte bestätige dein aktuelles Passwort."});
    if(!(await verifyCreatorPasswordForLifecycle(req.creatorAccount.id,password))){
        clearAccountElevationCookies(res);
        await recordSecurityEvent(req.creatorAccount.id,"account_elevation_failed");
        return res.status(401).json({ok:false,error:"Das aktuelle Passwort ist nicht korrekt."});
    }
    const methods=await creatorAuthMethods(req.creatorAccount.id);
    const requiresSecondFactor=Boolean(methods.totp||methods.passkey);
    if(!requiresSecondFactor){
        const state=grantAccountElevation(req,res,"password");
        if(!state)return res.status(500).json({ok:false,error:"Sicherheitsfreigabe konnte nicht erstellt werden."});
        await recordSecurityEvent(req.creatorAccount.id,"account_elevation_granted");
        return res.json({ok:true,...state,methods:{totp:false,passkey:false,recovery:false}});
    }
    if(method==="passkey"){
        if(!methods.passkey)return res.status(409).json({ok:false,error:"Für dieses Konto ist kein Passkey registriert."});
        const token=createAccountElevationToken(req,{pending:true,factor:"password+passkey"});
        if(!token)return res.status(500).json({ok:false,error:"Passkey-Bestätigung konnte nicht vorbereitet werden."});
        res.cookie(ACCOUNT_ELEVATION_PENDING_COOKIE,token,accountElevationCookieOptions({pending:true}));
        return res.json({ok:true,active:false,passkey_required:true,methods:{totp:methods.totp,passkey:methods.passkey,recovery:methods.recovery_codes_remaining>0}});
    }
    if(code||recoveryCode){
        const client=await pool.connect();
        try{
            await client.query("BEGIN");
            let verified=false,factor="totp";
            if(code&&methods.totp)verified=await consumeTotpForCreator(client,req.creatorAccount.id,code);
            if(!verified&&recoveryCode&&methods.recovery_codes_remaining>0){verified=await consumeRecoveryCode(client,req.creatorAccount.id,recoveryCode);factor="recovery_code";}
            if(!verified){await client.query("ROLLBACK");await recordSecurityEvent(req.creatorAccount.id,"account_elevation_failed");return res.status(401).json({ok:false,error:"Der zweite Faktor ist nicht korrekt oder wurde bereits verwendet."});}
            await client.query("COMMIT");
            const state=grantAccountElevation(req,res,factor);
            if(factor==="recovery_code") {
                await recordSecurityEvent(req.creatorAccount.id,"mfa_recovery_code_used");
                await recordSecurityEvent(req.creatorAccount.id,"account_elevation_recovery_granted");
            } else {
                await recordSecurityEvent(req.creatorAccount.id,"account_elevation_totp_granted");
            }
            await recordSecurityEvent(req.creatorAccount.id,"account_elevation_granted");
            return res.json({ok:true,...state,methods:{totp:methods.totp,passkey:methods.passkey,recovery:methods.recovery_codes_remaining>0}});
        }catch(error){try{await client.query("ROLLBACK");}catch{}safeLogError("Account Step-up Fehler:",error);return res.status(500).json({ok:false,error:"Sicherheitsbestätigung konnte nicht abgeschlossen werden."});}
        finally{client.release();}
    }
    return res.status(428).json({ok:false,code:"account_second_factor_required",error:"Bestätige zusätzlich deinen zweiten Faktor.",methods:{totp:methods.totp,passkey:methods.passkey,recovery:methods.recovery_codes_remaining>0}});
});

app.post("/api/account/elevation/passkey/options",requireCreatorAccount,accountElevationLimiter,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const pending=accountElevationTokenState(req,{pending:true});
        if(!pending.active)return res.status(401).json({ok:false,error:"Die Passwortbestätigung ist abgelaufen. Bitte starte die Sicherheitsfreigabe erneut."});
        const passkeys=await creatorPasskeys(req.creatorAccount.id);
        if(!passkeys.length)return res.status(409).json({ok:false,error:"Für dieses Konto ist kein Passkey registriert."});
        const {generateAuthenticationOptions}=await simpleWebAuthn();
        const options=await generateAuthenticationOptions({rpID:PASSKEY_RP_ID,timeout:60000,userVerification:"required",allowCredentials:passkeys.map(row=>({id:row.credential_id,transports:row.transports||[]}))});
        const challenge=await createPasskeyChallenge({creatorId:req.creatorAccount.id,purpose:"account_elevation",challenge:options.challenge,sessionHash:currentCreatorSessionHash(req)});
        return res.json({ok:true,challenge_id:challenge.id,expires_at:challenge.expiresAt,options});
    }catch(error){safeLogError("Account Step-up Passkey Options Fehler:",error);return res.status(500).json({ok:false,error:"Passkey-Bestätigung konnte nicht gestartet werden."});}
});

app.post("/api/account/elevation/passkey/verify",requireCreatorAccount,accountElevationLimiter,async(req,res)=>{
    res.set("Cache-Control","no-store");
    const response=req.body?.response,challengeId=String(req.body?.challenge_id||"");
    if(!response||typeof response!=="object")return res.status(400).json({ok:false,error:"Passkey-Antwort fehlt."});
    try{
        const pending=accountElevationTokenState(req,{pending:true});
        if(!pending.active)return res.status(401).json({ok:false,error:"Die Passwortbestätigung ist abgelaufen. Bitte starte die Sicherheitsfreigabe erneut."});
        const challenge=await takePasskeyChallenge(pool,{challengeId,creatorId:req.creatorAccount.id,purpose:"account_elevation",sessionHash:currentCreatorSessionHash(req)});
        if(!challenge)return res.status(401).json({ok:false,error:"Die Passkey-Challenge ist abgelaufen oder wurde bereits verwendet."});
        const credentialId=String(response.id||"");
        const passkey=(await pool.query(`SELECT credential_id,public_key,counter,transports,label FROM creator_webauthn_credentials WHERE creator_id=$1 AND credential_id=$2 LIMIT 1`,[req.creatorAccount.id,credentialId])).rows[0];
        if(!passkey){await recordSecurityEvent(req.creatorAccount.id,"account_elevation_failed");return res.status(401).json({ok:false,error:"Passkey konnte nicht bestätigt werden."});}
        const {verifyAuthenticationResponse}=await simpleWebAuthn();
        const verification=await verifyAuthenticationResponse({response,expectedChallenge:challenge.challenge,expectedOrigin:PASSKEY_EXPECTED_ORIGINS,expectedRPID:PASSKEY_RP_ID,requireUserVerification:true,credential:{id:passkey.credential_id,publicKey:new Uint8Array(passkey.public_key),counter:Number(passkey.counter||0),transports:passkey.transports||[]}});
        if(!verification.verified){await recordSecurityEvent(req.creatorAccount.id,"account_elevation_failed");return res.status(401).json({ok:false,error:"Passkey konnte nicht bestätigt werden."});}
        await pool.query(`UPDATE creator_webauthn_credentials SET counter=$3,last_used_at=NOW() WHERE creator_id=$1 AND credential_id=$2`,[req.creatorAccount.id,credentialId,Number(verification.authenticationInfo?.newCounter||0)]);
        const state=grantAccountElevation(req,res,"passkey");
        await recordSecurityEvent(req.creatorAccount.id,"account_elevation_passkey_granted");
        await recordSecurityEvent(req.creatorAccount.id,"account_elevation_granted");
        return res.json({ok:true,...state});
    }catch(error){safeLogError("Account Step-up Passkey Verify Fehler:",error);await recordSecurityEvent(req.creatorAccount.id,"account_elevation_failed");return res.status(401).json({ok:false,error:"Passkey konnte nicht bestätigt werden."});}
});

app.delete("/api/account/elevation",requireCreatorAccount,(req,res)=>{
    res.set("Cache-Control","no-store");
    clearAccountElevationCookies(res);
    return res.json({ok:true,active:false});
});

function adminElevationCookieOptions({includeMaxAge=true} = {}) {
    return {
        httpOnly:true,
        secure:NODE_ENV!=="development",
        sameSite:"strict",
        priority:"high",
        ...(includeMaxAge ? {maxAge:ADMIN_ELEVATION_TTL_MS} : {}),
        path:"/"
    };
}

function clearAdminElevationCookie(res) {
    res.clearCookie(ADMIN_ELEVATION_COOKIE,adminElevationCookieOptions({includeMaxAge:false}));
}

function createAdminElevationToken(req,{factor="password"}={}) {
    const sessionHash=currentCreatorSessionHash(req);
    if(!sessionHash || !req.creatorAccount?.id || !ADMIN_ELEVATION_SECRET) return "";
    const payload=Buffer.from(JSON.stringify({
        v:2,
        cid:String(req.creatorAccount.id),
        exp:Date.now()+ADMIN_ELEVATION_TTL_MS,
        factor:String(factor||"password").slice(0,32),
        nonce:crypto.randomBytes(12).toString("base64url")
    }),"utf8").toString("base64url");
    const signature=crypto.createHmac("sha256",ADMIN_ELEVATION_SECRET)
        .update(`cfs-admin-elevation-v2|${payload}|${sessionHash}`)
        .digest("base64url");
    return `${payload}.${signature}`;
}

function adminElevationState(req) {
    const cookies=parseCookies(req);
    const raw=String(cookies[ADMIN_ELEVATION_COOKIE]||"");
    const sessionHash=currentCreatorSessionHash(req);
    if(!raw || !sessionHash || !ADMIN_ELEVATION_SECRET || !req.creatorAccount?.id) return {active:false,expires_at:null,factor:null};
    const [payloadPart,signature]=raw.split(".");
    if(!payloadPart || !signature) return {active:false,expires_at:null,factor:null};
    const expected=crypto.createHmac("sha256",ADMIN_ELEVATION_SECRET)
        .update(`cfs-admin-elevation-v2|${payloadPart}|${sessionHash}`)
        .digest("base64url");
    if(!safeEqualText(signature,expected)) return {active:false,expires_at:null,factor:null};
    try {
        const payload=JSON.parse(Buffer.from(payloadPart,"base64url").toString("utf8"));
        if(payload?.v!==2 || String(payload?.cid||"")!==String(req.creatorAccount.id)) return {active:false,expires_at:null,factor:null};
        const expiresAt=Number(payload?.exp||0);
        if(!Number.isFinite(expiresAt) || expiresAt<=Date.now() || expiresAt>Date.now()+ADMIN_ELEVATION_TTL_MS+30000) return {active:false,expires_at:null,factor:null};
        return {active:true,expires_at:new Date(expiresAt).toISOString(),factor:String(payload?.factor||"password")};
    } catch {
        return {active:false,expires_at:null,factor:null};
    }
}

function canonicalAdminAuditPayload(event) {
    return [
        "cfs-admin-audit-v1",
        String(event.prev_hash||""),
        String(event.admin_creator_id||""),
        String(event.method||""),
        String(event.route||""),
        String(event.outcome||""),
        String(Number(event.status_code)||0),
        String(event.request_id||""),
        new Date(event.created_at).toISOString()
    ].join("|");
}

function signAdminAuditEvent(event) {
    if(!ADMIN_AUDIT_HMAC_SECRET)return "";
    return crypto.createHmac("sha256",ADMIN_AUDIT_HMAC_SECRET)
        .update(canonicalAdminAuditPayload(event))
        .digest("hex");
}

async function recordAdminAuditEvent(req,statusCode) {
    const client=await pool.connect();
    try {
        const method=String(req.method||"").toUpperCase().slice(0,12);
        const route=String(req.route?.path||req.path||"").slice(0,240);
        const outcome=Number(statusCode)>=200&&Number(statusCode)<400?"success":"failed";
        const adminCreatorId=String(req.creatorAccount?.id||"unknown");
        const requestId=String(req.requestId||"").slice(0,80);
        const createdAt=new Date();
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)",[ADMIN_AUDIT_LOCK_ID]);
        const previous=(await client.query(
            `SELECT event_hash FROM creator_admin_audit_events WHERE chain_version=$1 AND event_hash<>'' ORDER BY id DESC LIMIT 1`,
            [ADMIN_AUDIT_CHAIN_VERSION]
        )).rows[0];
        let prevHash=String(previous?.event_hash||"");
        if(!prevHash){
            const checkpoint=(await client.query(`SELECT anchor_event_hash FROM creator_admin_audit_checkpoint WHERE id=1`)).rows[0];
            prevHash=String(checkpoint?.anchor_event_hash||ADMIN_AUDIT_ROOT_HASH);
        }
        const event={
            prev_hash:prevHash,
            admin_creator_id:adminCreatorId,
            method,route,outcome,
            status_code:Number(statusCode)||0,
            request_id:requestId,
            created_at:createdAt
        };
        const eventHash=signAdminAuditEvent(event);
        await client.query(
            `INSERT INTO creator_admin_audit_events(admin_creator_id,method,route,outcome,status_code,request_id,chain_version,prev_hash,event_hash,created_at)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [adminCreatorId,method,route,outcome,event.status_code,requestId,ADMIN_AUDIT_CHAIN_VERSION,prevHash,eventHash,createdAt]
        );
        await client.query("COMMIT");
    } catch(error) {
        await client.query("ROLLBACK").catch(()=>{});
        safeLogError("Admin Audit Log Fehler:",error);
    } finally {
        client.release();
    }
}

async function verifyAdminAuditIntegrity() {
    const client=await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)",[ADMIN_AUDIT_LOCK_ID]);
        const checkpoint=(await client.query(`SELECT anchor_event_id,anchor_event_hash,anchored_at FROM creator_admin_audit_checkpoint WHERE id=1`)).rows[0]||null;
        const legacyCount=Number((await client.query(`SELECT COUNT(*)::int AS count FROM creator_admin_audit_events WHERE chain_version<>$1`,[ADMIN_AUDIT_CHAIN_VERSION])).rows[0]?.count||0);
        const rows=(await client.query(
            `SELECT id,admin_creator_id,method,route,outcome,status_code,request_id,chain_version,prev_hash,event_hash,created_at
             FROM creator_admin_audit_events WHERE chain_version=$1 ORDER BY id ASC`,
            [ADMIN_AUDIT_CHAIN_VERSION]
        )).rows;
        let expectedPrev=checkpoint?.anchor_event_hash?String(checkpoint.anchor_event_hash):ADMIN_AUDIT_ROOT_HASH;
        let verified=true,firstBadEventId=null;
        for(const row of rows){
            if(String(row.prev_hash||"")!==expectedPrev){verified=false;firstBadEventId=row.id;break;}
            const expectedHash=signAdminAuditEvent(row);
            if(!expectedHash || !safeEqualText(String(row.event_hash||""),expectedHash)){verified=false;firstBadEventId=row.id;break;}
            expectedPrev=String(row.event_hash||"");
        }
        await client.query("COMMIT");
        return {
            verified,
            chained_events:rows.length,
            legacy_events:legacyCount,
            first_bad_event_id:firstBadEventId,
            checkpoint:checkpoint?{anchor_event_id:checkpoint.anchor_event_id,anchor_event_hash:String(checkpoint.anchor_event_hash||""),anchored_at:checkpoint.anchored_at}:null,
            last_event_hash:rows.length?String(rows.at(-1).event_hash||""):(checkpoint?String(checkpoint.anchor_event_hash||""):ADMIN_AUDIT_ROOT_HASH),
            checked_at:new Date().toISOString()
        };
    } catch(error) {
        await client.query("ROLLBACK").catch(()=>{});
        throw error;
    } finally {
        client.release();
    }
}

function requireCreatorAdminElevation(req,res,next) {
    const adminState=adminElevationState(req);
    const accountState=accountElevationTokenState(req);
    if(adminState.active && accountState.active){
        req.adminElevation=adminState;
        req.accountElevation=accountState;
        return next();
    }
    clearAdminElevationCookie(res);
    return res.status(428).json({
        ok:false,
        code:accountState.active?"admin_reauth_required":"admin_strong_reauth_required",
        error:accountState.active
            ? "Admin-Schutz gesperrt. Bitte entsperre sensible Admin-Daten und privilegierte Aktionen erneut."
            : "Admin-Schutz benötigt eine frische starke Sicherheitsbestätigung.",
        elevation_required:true,
        strong_elevation_required:!accountState.active
    });
}

function requireCreatorAdminSensitiveRead(req,res,next) {
    return adminSensitiveReadLimiter(req,res,()=>requireCreatorAdminElevation(req,res,()=>{
        res.set("Cache-Control","no-store");
        res.set("Pragma","no-cache");
        res.on("finish",()=>{ void recordAdminAuditEvent(req,res.statusCode); });
        next();
    }));
}

function creatorAdminSensitiveDetailsUnlocked(req) {
    return Boolean(adminElevationState(req).active && accountElevationTokenState(req).active);
}

app.get("/api/admin/creator-suite/elevation",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    const [state,accountState,methods]=await Promise.all([
        Promise.resolve(adminElevationState(req)),
        Promise.resolve(accountElevationTokenState(req)),
        creatorAuthMethods(req.creatorAccount.id)
    ]);
    const active=Boolean(state.active&&accountState.active);
    if(state.active&&!accountState.active)clearAdminElevationCookie(res);
    return res.json({
        ok:true,active,expires_at:active?state.expires_at:null,factor:active?state.factor:null,
        ttl_seconds:Math.floor(ADMIN_ELEVATION_TTL_MS/1000),
        account_elevation:{active:accountState.active,expires_at:accountState.expires_at,factor:accountState.factor},
        methods:{totp:methods.totp,passkey:methods.passkey,recovery:methods.recovery_codes_remaining>0}
    });
});

app.post("/api/admin/creator-suite/elevation",requireCreatorAccount,requireCreatorAdmin,adminElevationLimiter,async(req,res)=>{
    res.set("Cache-Control","no-store");
    const accountState=accountElevationTokenState(req);
    if(!accountState.active){
        clearAdminElevationCookie(res);
        await recordSecurityEvent(req.creatorAccount.id,"admin_elevation_failed");
        return res.status(428).json({
            ok:false,code:"admin_strong_reauth_required",
            error:"Bestätige zuerst Passwort und vorhandenen zweiten Faktor.",
            strong_elevation_required:true
        });
    }
    const methods=await creatorAuthMethods(req.creatorAccount.id);
    const secondFactorConfigured=Boolean(methods.totp||methods.passkey);
    const strongFactors=new Set(["totp","recovery_code","passkey"]);
    if(secondFactorConfigured&&!strongFactors.has(String(accountState.factor||""))){
        clearAdminElevationCookie(res);
        await recordSecurityEvent(req.creatorAccount.id,"admin_elevation_failed");
        return res.status(428).json({ok:false,code:"admin_second_factor_required",error:"Für Admin-Schreibzugriffe ist dein zweiter Faktor erforderlich.",strong_elevation_required:true});
    }
    const token=createAdminElevationToken(req,{factor:accountState.factor});
    if(!token)return res.status(500).json({ok:false,error:"Admin-Schutz konnte nicht freigeschaltet werden."});
    const expiresAt=new Date(Date.now()+ADMIN_ELEVATION_TTL_MS).toISOString();
    res.cookie(ADMIN_ELEVATION_COOKIE,token,adminElevationCookieOptions());
    await recordSecurityEvent(req.creatorAccount.id,"admin_elevation_granted");
    return res.json({ok:true,active:true,expires_at:expiresAt,factor:accountState.factor,ttl_seconds:Math.floor(ADMIN_ELEVATION_TTL_MS/1000)});
});

app.delete("/api/admin/creator-suite/elevation",requireCreatorAccount,requireCreatorAdmin,(req,res)=>{
    clearAdminElevationCookie(res);
    return res.json({ok:true,active:false});
});

// Alle privilegierten Admin-Schreibaktionen benötigen zusätzlich zur normalen
// Admin-Session eine frische, an genau diese Session gebundene Re-Authentifizierung.
app.use("/api/admin/",(req,res,next)=>{
    if(isSafeHttpMethod(req.method)) return next();
    const cleanPath=String(req.originalUrl||"").split("?")[0];
    if(cleanPath==="/api/admin/creator-suite/elevation") return next();
    return requireCreatorAccount(req,res,()=>requireCreatorAdmin(req,res,()=>requireCreatorAdminElevation(req,res,()=>{
        res.on("finish",()=>{ void recordAdminAuditEvent(req,res.statusCode); });
        next();
    })));
});

app.get("/api/admin/creator-suite/audit-events",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminSensitiveRead,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const [rows,integrity]=await Promise.all([
            pool.query(`SELECT id,admin_creator_id,method,route,outcome,status_code,request_id,chain_version,prev_hash,event_hash,created_at FROM creator_admin_audit_events ORDER BY created_at DESC LIMIT 250`),
            verifyAdminAuditIntegrity()
        ]);
        return res.json({ok:true,retention_days:ADMIN_AUDIT_RETENTION_DAYS,integrity,events:rows.rows});
    }catch(error){
        safeLogError("Admin Audit Events Fehler:",error);
        return res.status(500).json({ok:false,error:"Admin-Audit konnte nicht geladen werden."});
    }
});

app.post("/api/admin/creator-suite/audit-export",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminSensitiveRead,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const [rows,integrity]=await Promise.all([
            pool.query(`SELECT id,admin_creator_id,method,route,outcome,status_code,request_id,chain_version,prev_hash,event_hash,created_at FROM creator_admin_audit_events ORDER BY id ASC`),
            verifyAdminAuditIntegrity()
        ]);
        await recordSecurityEvent(req.creatorAccount.id,"admin_audit_exported");
        return res.json({
            ok:true,
            export:{
                format:"cfs-admin-audit-v1",
                generated_at:new Date().toISOString(),
                retention_days:ADMIN_AUDIT_RETENTION_DAYS,
                integrity,
                events:rows.rows
            }
        });
    }catch(error){
        safeLogError("Admin Audit Export Fehler:",error);
        return res.status(500).json({ok:false,error:"Admin-Audit-Export konnte nicht erstellt werden."});
    }
});

// ============================================================
// ADMIN INCIDENT RESPONSE · PASS 20
// ============================================================

app.get("/api/admin/creator-suite/incident-state",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const incident=await getWebsiteIncidentState();
        return res.json({ok:true,incident,allowed_modes:[...INCIDENT_MODES]});
    }catch(error){
        safeLogError("Incident State Laden Fehler:",error);
        return res.status(500).json({ok:false,error:"Incident-Status konnte nicht geladen werden."});
    }
});

app.put("/api/admin/creator-suite/incident-state",async(req,res)=>{
    res.set("Cache-Control","no-store");
    const client=await pool.connect();
    try{
        const mode=String(req.body?.mode||"").trim().toLowerCase();
        if(!INCIDENT_MODES.has(mode))return res.status(400).json({ok:false,error:"Ungültiger Incident-Modus."});
        const publicMessage=incidentPublicMessage(req.body?.public_message);
        const revokeSessions=Boolean(req.body?.revoke_other_sessions);
        const revokeLauncherAccess=Boolean(req.body?.revoke_launcher_access);
        if(mode==="security_lockdown"&&!publicMessage){
            return res.status(400).json({ok:false,error:"Für den Security Lockdown ist eine kurze öffentliche Meldung erforderlich."});
        }

        let currentHash="";
        if(revokeSessions && mode==="security_lockdown"){
            currentHash=currentCreatorSessionHash(req);
            if(!currentHash)return res.status(400).json({ok:false,error:"Aktuelle Admin-Session konnte nicht sicher bestimmt werden."});
        }

        await client.query("BEGIN");
        const previousResult=await client.query(`SELECT mode,public_message,started_at,updated_at,updated_by FROM creator_incident_state WHERE slot='website' FOR UPDATE`);
        const previousRow=previousResult.rows[0]||{};
        const previousMode=INCIDENT_MODES.has(String(previousRow.mode||""))?String(previousRow.mode):"normal";
        const startedAt=mode==="normal"?null:(previousMode==="normal"||!previousRow.started_at?new Date():previousRow.started_at);
        await client.query(`
            UPDATE creator_incident_state
            SET mode=$1,public_message=$2,started_at=$3,updated_at=NOW(),updated_by=$4
            WHERE slot='website'
        `,[mode,publicMessage,startedAt,req.creatorAccount.id]);

        let revokedSessions=0;
        let revokedBridges=0;
        let revokedDeviceLinks=0;
        if(revokeSessions && mode==="security_lockdown"){
            const result=await client.query(`DELETE FROM creator_sessions WHERE token_hash<>$1`,[currentHash]);
            revokedSessions=Number(result.rowCount||0);
        }
        if(revokeLauncherAccess && mode==="security_lockdown"){
            const bridgeResult=await client.query(`
                UPDATE creator_live_bridges
                SET status='revoked',revoked_at=NOW(),updated_at=NOW()
                WHERE status='active'
            `);
            revokedBridges=Number(bridgeResult.rowCount||0);
            const linkResult=await client.query(`
                UPDATE creator_launcher_device_links
                SET status='revoked',revoked_at=NOW(),updated_at=NOW()
                WHERE status IN ('pending','approved')
            `);
            revokedDeviceLinks=Number(linkResult.rowCount||0);
            await client.query(`UPDATE creator_live_state SET bridge_heartbeat_at=NULL WHERE bridge_heartbeat_at IS NOT NULL`);
        }
        await client.query("COMMIT");

        if(revokedSessions>0)await recordSecurityEvent(req.creatorAccount.id,"incident_sessions_revoked");
        if(revokedBridges>0||revokedDeviceLinks>0)await recordSecurityEvent(req.creatorAccount.id,"incident_launchers_revoked");
        await recordSecurityEvent(req.creatorAccount.id,"incident_mode_changed");
        const incident=await getWebsiteIncidentState();
        return res.json({
            ok:true,incident,
            revoked_sessions:revokedSessions,
            revoked_bridges:revokedBridges,
            revoked_device_links:revokedDeviceLinks
        });
    }catch(error){
        await client.query("ROLLBACK").catch(()=>{});
        safeLogError("Incident State Update Fehler:",error);
        return res.status(500).json({ok:false,error:"Incident-Status konnte nicht aktualisiert werden."});
    }finally{
        client.release();
    }
});

// ============================================================
// CREATOR SETTINGS
// ============================================================

function defaultCreatorSettings() {

    return {

        profile: {

            bio:
                "",

            accent:
                "#148cff",

            theme:
                "cfs"

        },

        dashboard: {

            start_module:
                "dashboard"

        },

        widgets: {

            enabled: [
                "follower_goal"
            ]

        },

        stream_bot: {
            enabled: false,
            prefix: "!",
            commands: [
                { command: "discord", enabled: true, response: "Discord findest du über meine cfs_zockt-Seite.", response_mode: "overlay", cooldown_seconds: 15 },
                { command: "social", enabled: true, response: "Meine aktuellen Links findest du auf meiner cfs_zockt-Seite.", response_mode: "overlay", cooldown_seconds: 15 }
            ]
        }

    };

}


function sanitizeCreatorSettings(
    input
) {

    if (
        !input ||
        typeof input !==
            "object" ||
        Array.isArray(
            input
        )
    ) {

        return defaultCreatorSettings();

    }

    const json =
        JSON.stringify(
            input
        );

    if (
        Buffer.byteLength(
            json,
            "utf8"
        ) >
        64 * 1024
    ) {

        throw new Error(
            "Creator-Einstellungen sind zu groß."
        );

    }

    return JSON.parse(
        json
    );

}


async function getCreatorSettings(
    creatorId
) {

    const result =
        await pool.query(
            `
            SELECT
                settings,
                updated_at

            FROM creator_settings

            WHERE creator_id = $1

            LIMIT 1
            `,
            [
                creatorId
            ]
        );

    if (
        !result.rows[0]
    ) {

        const defaults =
            defaultCreatorSettings();

        await pool.query(
            `
            INSERT INTO creator_settings (
                creator_id,
                settings,
                updated_at
            )

            VALUES (
                $1,
                $2::jsonb,
                NOW()
            )

            ON CONFLICT (
                creator_id
            )

            DO NOTHING
            `,
            [
                creatorId,
                JSON.stringify(
                    defaults
                )
            ]
        );

        return {

            settings:
                defaults,

            updated_at:
                null

        };

    }

    return {

        settings:
            result
                .rows[0]
                .settings ||
            defaultCreatorSettings(),

        updated_at:
            result
                .rows[0]
                .updated_at ||
            null

    };

}


async function saveCreatorSettings(
    creatorId,
    settings
) {

    const clean =
        sanitizeCreatorSettings(
            settings
        );

    const result =
        await pool.query(
            `
            INSERT INTO creator_settings (
                creator_id,
                settings,
                updated_at
            )

            VALUES (
                $1,
                $2::jsonb,
                NOW()
            )

            ON CONFLICT (
                creator_id
            )

            DO UPDATE SET
                settings =
                    EXCLUDED.settings,

                updated_at =
                    NOW()

            RETURNING
                settings,
                updated_at
            `,
            [
                creatorId,
                JSON.stringify(
                    clean
                )
            ]
        );

    return result.rows[0];

}


// ============================================================
// MODUL STATE
// ============================================================

function sanitizeModuleState(
    input
) {

    if (
        !input ||
        typeof input !==
            "object" ||
        Array.isArray(
            input
        )
    ) {

        return {};

    }

    const json =
        JSON.stringify(
            input
        );

    if (
        Buffer.byteLength(
            json,
            "utf8"
        ) >
        128 * 1024
    ) {

        throw new Error(
            "Modul-Daten sind zu groß."
        );

    }

    return JSON.parse(
        json
    );

}


async function getModuleState(
    creatorId,
    moduleKey
) {

    const key =
        normalizeModuleKey(
            moduleKey
        );

    const result =
        await pool.query(
            `
            SELECT
                state,
                updated_at

            FROM creator_module_state

            WHERE
                creator_id = $1

            AND
                module_key = $2

            LIMIT 1
            `,
            [
                creatorId,
                key
            ]
        );

    if (
        !result.rows[0]
    ) {

        return {

            module_key:
                key,

            state:
                {},

            updated_at:
                null

        };

    }

    return {

        module_key:
            key,

        state:
            result
                .rows[0]
                .state ||
            {},

        updated_at:
            result
                .rows[0]
                .updated_at ||
            null

    };

}


async function saveModuleState(
    creatorId,
    moduleKey,
    state
) {

    const key =
        normalizeModuleKey(
            moduleKey
        );

    const cleanState =
        sanitizeModuleState(
            state
        );

    const result =
        await pool.query(
            `
            INSERT INTO creator_module_state (
                creator_id,
                module_key,
                state,
                updated_at
            )

            VALUES (
                $1,
                $2,
                $3::jsonb,
                NOW()
            )

            ON CONFLICT (
                creator_id,
                module_key
            )

            DO UPDATE SET
                state =
                    EXCLUDED.state,

                updated_at =
                    NOW()

            RETURNING
                module_key,
                state,
                updated_at
            `,
            [
                creatorId,
                key,
                JSON.stringify(
                    cleanState
                )
            ]
        );

    return result.rows[0];

}


// ============================================================
// WIDGET STUDIO - FOLLOWER GOAL
// ============================================================

function clampNumber(
    value,
    minimum,
    maximum,
    fallback
) {

    const number =
        Number(
            value
        );

    if (
        !Number.isFinite(
            number
        )
    ) {

        return fallback;

    }

    return Math.min(
        maximum,
        Math.max(
            minimum,
            number
        )
    );

}


function normalizeWidgetColor(
    value,
    fallback
) {

    const color =
        String(
            value ||
            ""
        ).trim();

    if (
        /^#[0-9a-fA-F]{6}$/.test(
            color
        )
    ) {

        return color.toLowerCase();

    }

    return fallback;

}


function defaultFollowerGoalWidgetConfig() {

    return {

        enabled:
            true,

        preset:
            "bar",

        label:
            "Follower-Ziel",

        goal:
            200,

        accent:
            "#0a8cff",

        background:
            "#071321",

        text_color:
            "#f4f8ff",

        background_opacity:
            0.9,

        font_size:
            24,

        border_width:
            1,

        border_radius:
            18,

        show_logo:
            true,

        show_progress:
            true,

        show_numbers:
            true

    };

}


function sanitizeFollowerGoalWidgetConfig(
    input
) {

    const defaults =
        defaultFollowerGoalWidgetConfig();

    const source =
        input &&
        typeof input ===
            "object" &&
        !Array.isArray(
            input
        )
            ? input
            : {};

    const preset =
        [
            "bar",
            "compact",
            "card"
        ].includes(
            String(
                source.preset ||
                ""
            )
                .trim()
                .toLowerCase()
        )
            ? String(
                source.preset
            )
                .trim()
                .toLowerCase()
            : defaults.preset;

    const label =
        String(
            source.label ??
            defaults.label
        )
            .trim()
            .replace(
                /\s+/g,
                " "
            )
            .slice(
                0,
                60
            );

    return {

        enabled:
            source.enabled !==
            false,

        preset,

        label:
            label ||
            defaults.label,

        goal:
            Math.round(
                clampNumber(
                    source.goal,
                    1,
                    FOLLOWER_WIDGET_MAX_GOAL,
                    defaults.goal
                )
            ),

        accent:
            normalizeWidgetColor(
                source.accent,
                defaults.accent
            ),

        background:
            normalizeWidgetColor(
                source.background,
                defaults.background
            ),

        text_color:
            normalizeWidgetColor(
                source.text_color,
                defaults.text_color
            ),

        background_opacity:
            Math.round(
                clampNumber(
                    source.background_opacity,
                    0,
                    1,
                    defaults.background_opacity
                ) *
                100
            ) /
            100,

        font_size:
            Math.round(
                clampNumber(
                    source.font_size,
                    14,
                    72,
                    defaults.font_size
                )
            ),

        border_width:
            Math.round(
                clampNumber(
                    source.border_width,
                    0,
                    4,
                    defaults.border_width
                )
            ),

        border_radius:
            Math.round(
                clampNumber(
                    source.border_radius,
                    0,
                    40,
                    defaults.border_radius
                )
            ),

        show_logo:
            source.show_logo !==
            false,

        show_progress:
            source.show_progress !==
            false,

        show_numbers:
            source.show_numbers !==
            false

    };

}


function createWidgetSourceKey() {

    return crypto
        .randomBytes(
            WIDGET_SOURCE_KEY_BYTES
        )
        .toString(
            "hex"
        );

}


function validWidgetSourceKey(
    value
) {

    return new RegExp(
        `^[a-f0-9]{${WIDGET_SOURCE_KEY_BYTES * 2}}$`,
        "i"
    ).test(
        String(
            value ||
            ""
        )
    );

}


async function getFollowerWidgetSourceByCreator(
    creatorId,
    createIfMissing =
        true
) {

    const existing =
        await pool.query(
            `
            SELECT
                creator_id,
                widget_key,
                source_key,
                config,
                created_at,
                updated_at

            FROM creator_widget_sources

            WHERE
                creator_id = $1

            AND
                widget_key = 'follower_goal'

            LIMIT 1
            `,
            [
                creatorId
            ]
        );

    if (
        existing.rows[0] ||
        !createIfMissing
    ) {

        return existing.rows[0] ||
            null;

    }

    for (
        let attempt = 0;
        attempt < 3;
        attempt += 1
    ) {

        const sourceKey =
            createWidgetSourceKey();

        const result =
            await pool.query(
                `
                INSERT INTO creator_widget_sources (
                    creator_id,
                    widget_key,
                    source_key,
                    config,
                    created_at,
                    updated_at
                )

                VALUES (
                    $1,
                    'follower_goal',
                    $2,
                    $3::jsonb,
                    NOW(),
                    NOW()
                )

                ON CONFLICT
                    DO NOTHING

                RETURNING
                    creator_id,
                    widget_key,
                    source_key,
                    config,
                    created_at,
                    updated_at
                `,
                [
                    creatorId,
                    sourceKey,
                    JSON.stringify(
                        defaultFollowerGoalWidgetConfig()
                    )
                ]
            );

        if (
            result.rows[0]
        ) {

            return result.rows[0];

        }

        const afterConflict =
            await getFollowerWidgetSourceByCreator(
                creatorId,
                false
            );

        if (
            afterConflict
        ) {

            return afterConflict;

        }

    }

    throw new Error(
        "Widget-Quelle konnte nicht erstellt werden."
    );

}


async function saveFollowerWidgetSource(
    creatorId,
    config
) {

    const current =
        await getFollowerWidgetSourceByCreator(
            creatorId,
            true
        );

    const clean =
        sanitizeFollowerGoalWidgetConfig(
            config
        );

    const result =
        await pool.query(
            `
            UPDATE creator_widget_sources

            SET
                config = $3::jsonb,
                updated_at = NOW()

            WHERE
                creator_id = $1

            AND
                widget_key = $2

            RETURNING
                creator_id,
                widget_key,
                source_key,
                config,
                created_at,
                updated_at
            `,
            [
                creatorId,
                "follower_goal",
                JSON.stringify(
                    clean
                )
            ]
        );

    return result.rows[0] ||
        current;

}


async function rotateFollowerWidgetSourceKey(
    creatorId
) {

    await getFollowerWidgetSourceByCreator(
        creatorId,
        true
    );

    for (
        let attempt = 0;
        attempt < 3;
        attempt += 1
    ) {

        const sourceKey =
            createWidgetSourceKey();

        try {

            const result =
                await pool.query(
                    `
                    UPDATE creator_widget_sources

                    SET
                        source_key = $2,
                        updated_at = NOW()

                    WHERE
                        creator_id = $1

                    AND
                        widget_key = 'follower_goal'

                    RETURNING
                        creator_id,
                        widget_key,
                        source_key,
                        config,
                        created_at,
                        updated_at
                    `,
                    [
                        creatorId,
                        sourceKey
                    ]
                );

            if (
                result.rows[0]
            ) {

                return result.rows[0];

            }

        }
        catch (error) {

            if (
                error?.code !==
                "23505"
            ) {

                throw error;

            }

        }

    }

    throw new Error(
        "Neuer OBS-Schlüssel konnte nicht erstellt werden."
    );

}


async function getFollowerWidgetSourceByKey(
    sourceKey
) {

    if (
        !validWidgetSourceKey(
            sourceKey
        )
    ) {

        return null;

    }

    const result =
        await pool.query(
            `
            SELECT
                w.creator_id,
                w.widget_key,
                w.source_key,
                w.config,
                w.updated_at,
                a.display_name,
                a.status

            FROM creator_widget_sources w

            INNER JOIN creator_accounts a
                ON a.id = w.creator_id

            WHERE
                w.source_key = $1

            AND
                w.widget_key = 'follower_goal'

            AND
                a.status = 'active'

            LIMIT 1
            `,
            [
                String(
                    sourceKey
                )
            ]
        );

    return result.rows[0] ||
        null;

}


async function canUseLegacyDefaultTikTok(
    creatorId
) {

    const result =
        await pool.query(
            `
            SELECT creator_id
            FROM creator_tiktok_legacy_owner
            WHERE slot = 'default'
            LIMIT 1
            `
        );

    return Boolean(
        result.rows[0]?.creator_id &&
        String(
            result.rows[0].creator_id
        ) ===
        String(
            creatorId
        )
    );

}


async function resolveWidgetTikTokConnection(
    creatorId
) {

    const personal =
        await getConnection(
            creatorId
        );

    if (
        personal?.connected
    ) {

        return {

            creator_id:
                creatorId,

            connection:
                personal,

            source:
                "account"

        };

    }

    if (
        await canUseLegacyDefaultTikTok(
            creatorId
        )
    ) {

        const legacy =
            await getConnection(
                DEFAULT_CREATOR_ID
            );

        if (
            legacy?.connected
        ) {

            return {

                creator_id:
                    DEFAULT_CREATOR_ID,

                connection:
                    legacy,

                source:
                    "legacy_default"

            };

        }

    }

    return {

        creator_id:
            creatorId,

        connection:
            personal,

        source:
            "none"

    };

}


function widgetConnectionNeedsRefresh(
    connection
) {

    const updatedAt =
        connection?.updated_at
            ? new Date(
                connection.updated_at
            ).getTime()
            : 0;

    return Boolean(
        connection?.connected &&
        (
            !updatedAt ||
            Date.now() -
                updatedAt >=
                WIDGET_TIKTOK_REFRESH_MS
        )
    );

}


async function getFollowerWidgetTikTokData(
    creatorId
) {

    const resolved =
        await resolveWidgetTikTokConnection(
            creatorId
        );

    let connection =
        resolved.connection;

    if (
        widgetConnectionNeedsRefresh(
            connection
        )
    ) {

        try {

            await fetchTikTokProfile(
                resolved.creator_id
            );

            connection =
                await getConnection(
                    resolved.creator_id
                );

        }
        catch (error) {

            console.warn(
                "Widget TikTok Refresh Hinweis:",
                error?.message ||
                error
            );

        }

    }

    return {

        connected:
            Boolean(
                connection?.connected
            ),

        source:
            resolved.source,

        display_name:
            connection?.display_name ||
            "",

        avatar_url:
            connection?.avatar_url ||
            "",

        follower_count:
            Number(
                connection?.follower_count ||
                0
            ),

        likes_count:
            Number(
                connection?.likes_count ||
                0
            ),

        following_count:
            Number(
                connection?.following_count ||
                0
            ),

        video_count:
            Number(
                connection?.video_count ||
                0
            ),

        updated_at:
            connection?.updated_at ||
            null

    };

}


function followerWidgetSourceUrl(
    sourceKey
) {

    return (
        APP_BASE_URL +
        "/widgets/follower-goal.html#key=" +
        encodeURIComponent(
            sourceKey
        )
    );

}



// ============================================================
// WIDGET STUDIO V1 - CORE / DATENMODELL
// ============================================================

const WIDGET_STUDIO_ALLOWED_TYPES =
    new Set([
        "text",
        "counter",
        "progress",
        "shape",
        "image",
        "video",
        "chat"
    ]);


const WIDGET_STUDIO_TEMPLATE_KEYS =
    new Set([
        "cfs-standard",
        "minimal",
        "neon",
        "glass",
        "compact",
        "wide",
        "blank"
    ]);


const WIDGET_STUDIO_PROVIDERS = Object.freeze({
    profile_api: {
        key: "profile_api",
        label: "TikTok Profil API",
        status: "ready",
        supplies: ["profile.followers", "profile.likes_total"]
    },
    simulator: {
        key: "simulator",
        label: "Creator Suite Simulator",
        status: "ready",
        supplies: ["live.likes", "live.viewers", "live.shares", "live.gifts_count", "live.followers_gained", "events"]
    },
    launcher_bridge: {
        key: "launcher_bridge",
        label: "Creator Suite Launcher Bridge",
        status: "ready",
        supplies: ["live.likes", "live.viewers", "live.shares", "live.gifts_count", "live.followers_gained", "events", "actions"]
    }
});

function studioProviderRegistryPublic() {
    return Object.values(WIDGET_STUDIO_PROVIDERS).map(item => ({...item, supplies:[...item.supplies]}));
}

const WIDGET_STUDIO_WIDGET_TYPES = Object.freeze({
    obs_overlay: {
        key: "obs_overlay", label: "Freies Overlay", short_label: "FREIES OVERLAY",
        category: "overlay", library_group: "general", static_kind: "free", mode: "static", metric: "",
        source: "Freies Design", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Ein frei gestaltbares Overlay ohne Plattformdaten. Ideal für Text, Rahmen, Bilder, Socials und Branding."
    },
    camera_frame: {
        key: "camera_frame", label: "Kamera-Rahmen 16:9", short_label: "CAMERA 16:9",
        category: "overlay", library_group: "camera", static_kind: "camera", static_format: "16:9", mode: "static", metric: "",
        source: "Transparentes Kamera-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Transparenter 16:9-Kamera-Rahmen für OBS und Stream-Szenen. Browser Source über die normale Kamera legen und frei gestalten."
    },
    camera_frame_portrait: {
        key: "camera_frame_portrait", label: "Kamera-Rahmen 9:16", short_label: "CAMERA 9:16",
        category: "overlay", library_group: "camera", static_kind: "camera", static_format: "9:16", mode: "static", metric: "",
        source: "Transparentes Hochformat-Kamera-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Schmaler transparenter Kamera-Rahmen im 9:16-Format – besonders für vertikale TikTok-Szenen und Portrait-Cams."
    },
    camera_frame_square: {
        key: "camera_frame_square", label: "Kamera-Rahmen 1:1", short_label: "CAMERA 1:1",
        category: "overlay", library_group: "camera", static_kind: "camera", static_format: "1:1", mode: "static", metric: "",
        source: "Transparentes quadratisches Kamera-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Quadratischer transparenter Kamera-Rahmen für kompakte Facecam-Platzierungen, Talk-Szenen und Social-Layouts."
    },
    stream_frame: {
        key: "stream_frame", label: "Stream-Rahmen 16:9", short_label: "STREAM FRAME 16:9",
        category: "overlay", library_group: "scene", static_kind: "scene_frame", static_format: "16:9", mode: "static", metric: "",
        source: "Transparentes Szenen-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Ein transparenter Außenrahmen für eine komplette 16:9-Streamszene – ideal für Gameplay, Talk und Event-Looks."
    },
    stream_frame_vertical: {
        key: "stream_frame_vertical", label: "Stream-Rahmen 9:16", short_label: "STREAM FRAME 9:16",
        category: "overlay", library_group: "scene", static_kind: "scene_frame", static_format: "9:16", mode: "static", metric: "",
        source: "Transparentes Hochformat-Szenen-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Ein transparenter Außenrahmen für vertikale 9:16-Streams und TikTok-orientierte Szenen."
    },
    lower_third: {
        key: "lower_third", label: "Nameplate / Lower Third", short_label: "NAMEPLATE",
        category: "overlay", library_group: "branding", static_kind: "lower_third", mode: "static", metric: "",
        source: "Freies Branding-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Fertige Namensleiste für Creator-Name, Game, Rolle oder Hinweistext. Text, Farben und Rahmen bleiben frei editierbar."
    },
    social_bar: {
        key: "social_bar", label: "Social Bar", short_label: "SOCIAL BAR",
        category: "overlay", library_group: "branding", static_kind: "social_bar", mode: "static", metric: "",
        source: "Freies Branding-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Horizontale Social-Leiste für Creator-Namen, Plattform-Hinweise oder Community-Callouts – ohne externe Plattformdaten."
    },
    stream_header: {
        key: "stream_header", label: "Stream Header", short_label: "HEADER",
        category: "overlay", library_group: "branding", static_kind: "header", mode: "static", metric: "",
        source: "Freies Szenen-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Schmale Kopfleiste für Titel, Session-Info, Challenge oder Branding am oberen Szenenrand."
    },
    stream_sidebar: {
        key: "stream_sidebar", label: "Stream Sidebar", short_label: "SIDEBAR",
        category: "overlay", library_group: "branding", static_kind: "sidebar", mode: "static", metric: "",
        source: "Freies Szenen-Overlay", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Vertikale Seitenleiste für Socials, Ziele, Regeln oder statische Stream-Infos."
    },
    starting_screen: {
        key: "starting_screen", label: "Starting Soon Screen", short_label: "STARTING SOON",
        category: "overlay", library_group: "scene", static_kind: "screen", static_screen: "starting", mode: "static", metric: "",
        source: "Freie Stream-Szene", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Fertige Startszene mit Titel und Untertitel. Als Browser Source nutzbar und vollständig im Widget Studio anpassbar."
    },
    brb_screen: {
        key: "brb_screen", label: "Bin gleich zurück Screen", short_label: "BRB",
        category: "overlay", library_group: "scene", static_kind: "screen", static_screen: "brb", mode: "static", metric: "",
        source: "Freie Stream-Szene", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Pausenszene für kurze Unterbrechungen – mit eigenem Text, Farben, Bildern, Rahmen und Animationen."
    },
    ending_screen: {
        key: "ending_screen", label: "Stream Ending Screen", short_label: "STREAM ENDE",
        category: "overlay", library_group: "scene", static_kind: "screen", static_screen: "ending", mode: "static", metric: "",
        source: "Freie Stream-Szene", source_kind: "static", platform: "obs", studio_areas: ["tiktok", "obs"],
        description: "Abschlussszene für Danke, Community-Hinweise und den nächsten Stream – vollständig frei gestaltbar."
    },
    chat_overlay: {
        key: "chat_overlay", minimum_plan: "creator", label: "Chat Fenster", short_label: "LIVE CHAT",
        category: "chat", mode: "chat", event_type: "chat",
        source: "TikTok LIVE Chat", source_kind: "live_bridge", platform: "tiktok", studio_areas: ["tiktok", "obs"],
        description: "Zeigt echte TikTok-LIVE-Kommentare als frei gestaltbares Chat-Overlay. Im OBS-Bereich bleibt TikTok die Datenquelle."
    },

    follower_goal: {
        key: "follower_goal", label: "Follower Goal", short_label: "FOLLOWER GOAL",
        category: "goals", mode: "goal", metric: "profile.followers",
        source: "TikTok Profil", source_kind: "profile",
        description: "Zeigt deinen aktuellen Follower-Stand und ein frei definierbares Ziel.", default_goal: 2000
    },
    follower_counter: {
        key: "follower_counter", label: "Follower Counter", short_label: "FOLLOWER COUNTER",
        category: "counter", mode: "counter", metric: "profile.followers",
        source: "TikTok Profil", source_kind: "profile",
        description: "Ein sauberer Zähler für deinen aktuellen Profil-Followerstand."
    },
    profile_likes_counter: {
        key: "profile_likes_counter", label: "Profil Likes Counter", short_label: "PROFIL LIKES",
        category: "counter", mode: "counter", metric: "profile.likes_total",
        source: "TikTok Profil", source_kind: "profile",
        description: "Zeigt die Gesamtzahl der Likes deines TikTok-Profils – nicht die Likes eines LIVE."
    },
    manual_counter: {
        key: "manual_counter", label: "Freier Counter", short_label: "FREIER COUNTER",
        category: "counter", mode: "manual_counter", metric: "",
        source: "Manuell steuerbar", source_kind: "manual", platform: "tiktok", studio_areas: ["tiktok", "obs"],
        description: "Ein frei steuerbarer Stream-Counter für eigene Runden, Punkte oder Challenges. Funktioniert in TikTok LIVE und OBS.", default_value: 0
    },
    wins_counter: {
        key: "wins_counter", label: "Siege Counter", short_label: "SIEGE",
        category: "counter", mode: "manual_counter", metric: "",
        source: "Manuell steuerbar", source_kind: "manual", platform: "tiktok", studio_areas: ["tiktok", "obs"],
        description: "Zählt deine Siege im Stream. Manuell steuerbar und für TikTok LIVE sowie OBS geeignet.", default_value: 0
    },
    deaths_counter: {
        key: "deaths_counter", label: "Tode Counter", short_label: "TODE",
        category: "counter", mode: "manual_counter", metric: "",
        source: "Manuell steuerbar", source_kind: "manual", platform: "tiktok", studio_areas: ["tiktok", "obs"],
        description: "Zählt Tode oder Fehlversuche im Stream. Manuell steuerbar und für TikTok LIVE sowie OBS geeignet.", default_value: 0
    },
    stream_timer: {
        key: "stream_timer", label: "Stream Timer", short_label: "STREAM TIMER",
        category: "counter", mode: "manual_timer", metric: "",
        source: "Manuell steuerbar", source_kind: "manual", platform: "tiktok", studio_areas: ["tiktok", "obs"],
        description: "Ein frei steuerbarer Stream-Timer für TikTok LIVE und OBS. Starten, pausieren, Zeit anpassen oder zurücksetzen – direkt im Widget Studio.",
        default_seconds: 0
    },
    manual_goal: {
        key: "manual_goal", label: "Manuelles Goal", short_label: "MANUELLES GOAL",
        category: "goals", mode: "goal", metric: "",
        source: "Manuell steuerbar", source_kind: "manual", platform: "tiktok", studio_areas: ["tiktok", "obs"],
        description: "Ein frei steuerbares Ziel ohne Plattform-Anbindung. Ideal für Challenges, Punkte, Runden oder Community-Ziele in TikTok LIVE und OBS.",
        default_goal: 100, default_value: 0
    },
    live_like_goal: {
        key: "live_like_goal", minimum_plan: "creator", label: "LIVE Like Goal", short_label: "LIVE LIKE GOAL",
        category: "goals", mode: "goal", metric: "live.likes",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Like-Ziel für eine laufende TikTok-LIVE-Session. Bis zur Bridge im Simulator testbar.", default_goal: 10000
    },
    live_like_counter: {
        key: "live_like_counter", minimum_plan: "creator", label: "LIVE Like Counter", short_label: "LIVE LIKES",
        category: "counter", mode: "counter", metric: "live.likes",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Zählt Likes innerhalb der aktuellen LIVE-Session."
    },
    live_timer: {
        key: "live_timer", minimum_plan: "creator", label: "LIVE Timer", short_label: "LIVE TIMER",
        category: "counter", mode: "timer", metric: "",
        source: "TikTok LIVE Bridge", source_kind: "live_bridge", platform: "tiktok",
        description: "Zeigt automatisch, wie lange die aktuelle TikTok-LIVE-Session läuft."
    },
    viewer_counter: {
        key: "viewer_counter", minimum_plan: "creator", label: "Viewer Counter", short_label: "VIEWER",
        category: "counter", mode: "counter", metric: "live.viewers",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Zeigt die aktuelle Zuschauerzahl deiner LIVE-Session."
    },
    gift_goal: {
        key: "gift_goal", minimum_plan: "creator", label: "Gift Goal", short_label: "GIFT GOAL",
        category: "goals", mode: "goal", metric: "live.gifts_count",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Setze ein Ziel für die Anzahl empfangener Gifts in der LIVE-Session.", default_goal: 50
    },
    gift_counter: {
        key: "gift_counter", minimum_plan: "creator", label: "Gift Counter", short_label: "GIFTS",
        category: "counter", mode: "counter", metric: "live.gifts_count",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Zählt empfangene Gifts in der laufenden LIVE-Session."
    },
    share_goal: {
        key: "share_goal", minimum_plan: "creator", label: "Share Goal", short_label: "SHARE GOAL",
        category: "goals", mode: "goal", metric: "live.shares",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Setze ein Ziel für Shares innerhalb deiner LIVE-Session.", default_goal: 100
    },
    share_counter: {
        key: "share_counter", minimum_plan: "creator", label: "Share Counter", short_label: "SHARES",
        category: "counter", mode: "counter", metric: "live.shares",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Zählt Shares deiner laufenden LIVE-Session."
    },
    follower_gain_counter: {
        key: "follower_gain_counter", minimum_plan: "creator", label: "Follower Gain", short_label: "NEUE FOLLOWER",
        category: "counter", mode: "counter", metric: "live.followers_gained",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Zeigt, wie viele neue Follower während der LIVE-Session hinzugekommen sind."
    },
    follower_gain_goal: {
        key: "follower_gain_goal", minimum_plan: "creator", label: "Follower Gain Goal", short_label: "FOLLOWER GAIN GOAL",
        category: "goals", mode: "goal", metric: "live.followers_gained",
        source: "LIVE Bridge", source_kind: "live_bridge",
        description: "Ziel für neue Follower innerhalb der aktuellen LIVE-Session.", default_goal: 100
    },

    follow_alert: {
        key: "follow_alert", minimum_plan: "creator", label: "Follow Alert", short_label: "FOLLOW ALERT",
        category: "alerts", mode: "alert", event_type: "follow",
        source: "LIVE Event Queue", source_kind: "live_bridge",
        description: "Zeigt einen animierten Alert, wenn dir während des LIVE jemand folgt.", default_duration_ms: 4500
    },
    gift_alert: {
        key: "gift_alert", minimum_plan: "creator", label: "Gift Alert", short_label: "GIFT ALERT",
        category: "alerts", mode: "alert", event_type: "gift",
        source: "LIVE Event Queue", source_kind: "live_bridge",
        description: "Zeigt Sender, Gift und Anzahl als animierten LIVE-Alert.", default_duration_ms: 5200
    },
    share_alert: {
        key: "share_alert", minimum_plan: "creator", label: "Share Alert", short_label: "SHARE ALERT",
        category: "alerts", mode: "alert", event_type: "share",
        source: "LIVE Event Queue", source_kind: "live_bridge",
        description: "Bedankt sich sichtbar, wenn ein Zuschauer deinen LIVE teilt.", default_duration_ms: 4200
    },
    goal_reached_alert: {
        key: "goal_reached_alert", minimum_plan: "creator", label: "Goal Reached Alert", short_label: "GOAL REACHED",
        category: "alerts", mode: "goal_alert", metric: "live.likes",
        metric_options: ["profile.followers", "live.likes", "live.gifts_count", "live.shares", "live.followers_gained"],
        source: "Creator Suite Daten", source_kind: "hybrid",
        description: "Wird ausgelöst, sobald ein ausgewählter Zähler seinen Zielwert erreicht.",
        default_goal: 10000, default_duration_ms: 6000
    },
    latest_follower: {
        key: "latest_follower", minimum_plan: "creator", label: "Latest Follower", short_label: "LATEST FOLLOWER",
        category: "latest", mode: "latest", event_type: "follow",
        source: "LIVE Event Queue", source_kind: "live_bridge",
        description: "Zeigt dauerhaft den zuletzt erfassten neuen Follower der aktuellen LIVE-Session."
    },
    latest_gift: {
        key: "latest_gift", minimum_plan: "creator", label: "Latest Gift", short_label: "LATEST GIFT",
        category: "latest", mode: "latest", event_type: "gift",
        source: "LIVE Event Queue", source_kind: "live_bridge",
        description: "Zeigt den letzten Gift-Sender inklusive Gift-Name und Anzahl."
    },
    latest_share: {
        key: "latest_share", minimum_plan: "creator", label: "Latest Share", short_label: "LATEST SHARE",
        category: "latest", mode: "latest", event_type: "share",
        source: "LIVE Event Queue", source_kind: "live_bridge",
        description: "Zeigt den letzten Zuschauer, der deinen LIVE geteilt hat."
    }
});

const WIDGET_STUDIO_WIDGET_TYPE_KEYS =
    new Set(Object.keys(WIDGET_STUDIO_WIDGET_TYPES));

function studioWidgetDefinition(value) {
    const key = String(value || "follower_goal");
    return WIDGET_STUDIO_WIDGET_TYPES[key] || WIDGET_STUDIO_WIDGET_TYPES.follower_goal;
}

function studioWidgetRegistryPublic(plan = "free", entitlements = null) {
    const effective=entitlements||getPlanEntitlements(plan);
    return Object.values(WIDGET_STUDIO_WIDGET_TYPES).map((item) => {
        const minimumPlan=item.minimum_plan||"free";
        const platform=item.platform || (item.source_kind === "static" ? "obs" : "tiktok");
        const studioAreas=Array.isArray(item.studio_areas)&&item.studio_areas.length
            ? [...new Set(item.studio_areas.filter(area => ["tiktok","obs"].includes(area)))]
            : [platform];
        const available=item.mode === "static"
            ? Boolean(effective.widget_studio)
            : minimumPlan==="free"
                ? true
                : (["alert","latest","goal_alert"].includes(item.mode)?Boolean(effective.alerts):Boolean(effective.live_widgets));
        return {...item,platform,studio_areas:studioAreas,minimum_plan:minimumPlan,available,metric_options:Array.isArray(item.metric_options)?[...item.metric_options]:undefined};
    });
}

function studioClamp(
    value,
    min,
    max,
    fallback
) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? Math.min(max, Math.max(min, number))
        : fallback;

}


function studioText(
    value,
    max,
    fallback = ""
) {

    const clean =
        String(value ?? "")
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .trim()
            .slice(0, max);

    return clean || fallback;

}


function studioColor(
    value,
    fallback
) {

    const color =
        String(value || "")
            .trim();

    if (
        /^#[0-9a-fA-F]{6}$/.test(color) ||
        /^rgba?\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+(?:\s*,\s*[0-9.]+)?\s*\)$/.test(color) ||
        color === "transparent"
    ) {
        return color;
    }

    return fallback;

}



const WIDGET_STUDIO_FONT_FAMILIES =
    new Set([
        "Inter",
        "system-ui",
        "Arial",
        "Verdana",
        "Trebuchet MS",
        "Georgia",
        "Courier New",
        "Impact"
    ]);

function studioFontFamily(value) {
    const family = String(value || "Inter").trim();
    return WIDGET_STUDIO_FONT_FAMILIES.has(family) ? family : "Inter";
}

function studioGradientStyle(source = {}) {
    return {
        gradientEnabled: source.gradientEnabled === true,
        gradientFrom: studioColor(source.gradientFrom, "#148cff"),
        gradientTo: studioColor(source.gradientTo, "#20d4e6"),
        gradientAngle: Math.round(studioClamp(source.gradientAngle, 0, 360, 90))
    };
}

function studioAssetSource(value) {
    const source = String(value || "").trim();
    if (/^\/widget-assets\/[a-f0-9]{48}$/i.test(source)) return source;
    return "";
}

function studioImageSource(value) {
    const source = String(value || "").trim();
    const assetSource = studioAssetSource(source);
    if (assetSource) return assetSource;
    if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(source) && source.length <= 145000) {
        return source;
    }
    if (/^https:\/\/[^\s"'<>]{1,1980}$/i.test(source)) {
        return source.slice(0, 2000);
    }
    return "";
}

function studioAudioSource(value) {
    return studioAssetSource(value);
}

function studioVideoSource(value) {
    return studioAssetSource(value);
}


function studioEffectStyle(
    source = {}
) {

    return {
        shadowColor:
            studioColor(
                source.shadowColor,
                "rgba(0,0,0,0.35)"
            ),
        shadowBlur:
            studioClamp(
                source.shadowBlur,
                0,
                80,
                0
            ),
        shadowX:
            studioClamp(
                source.shadowX,
                -80,
                80,
                0
            ),
        shadowY:
            studioClamp(
                source.shadowY,
                -80,
                80,
                0
            ),
        glowColor:
            studioColor(
                source.glowColor,
                "#148cff"
            ),
        glowBlur:
            studioClamp(
                source.glowBlur,
                0,
                80,
                0
            )
    };

}


function studioTextFrameStyle(source = {}) {

    return {
        backgroundColor:
            studioColor(
                source.backgroundColor,
                "transparent"
            ),
        borderRadius:
            studioClamp(
                source.borderRadius,
                0,
                500,
                0
            ),
        borderWidth:
            studioClamp(
                source.borderWidth,
                0,
                20,
                0
            ),
        borderColor:
            studioColor(
                source.borderColor,
                "transparent"
            ),
        borderStyle:
            ["solid", "dashed", "dotted", "double"].includes(source.borderStyle)
                ? source.borderStyle
                : "solid",
        padding:
            studioClamp(
                source.padding,
                0,
                100,
                0
            )
    };

}


function studioAnimation(
    source = {},
    fallbackEnter = "none",
    fallbackChange = "none"
) {

    const enter =
        ["none", "fade", "pop", "slide-up"].includes(
            source.enter
        )
            ? source.enter
            : fallbackEnter;

    const change =
        ["none", "pulse", "glow"].includes(
            source.change
        )
            ? source.change
            : fallbackChange;

    return {
        enabled:
            source.enabled !== false,
        enter,
        change,
        durationMs:
            Math.round(
                studioClamp(
                    source.durationMs,
                    100,
                    3000,
                    500
                )
            )
    };

}


function studioElementBase(
    source,
    index,
    type
) {

    return {
        id:
            studioText(
                source.id,
                80,
                `${type}_${index + 1}`
            ),

        type,

        name:
            studioText(
                source.name,
                80,
                type === "progress"
                    ? "Fortschritt"
                    : type === "counter"
                        ? "Zähler"
                        : type === "shape"
                            ? "Form"
                            : type === "image"
                                ? "Bild"
                                : "Text"
            ),

        visible:
            source.visible !== false,

        locked:
            source.locked === true,

        position: {
            x:
                Math.round(
                    studioClamp(
                        source.position?.x,
                        -2000,
                        4000,
                        0
                    )
                ),
            y:
                Math.round(
                    studioClamp(
                        source.position?.y,
                        -2000,
                        4000,
                        0
                    )
                )
        },

        size: {
            width:
                Math.round(
                    studioClamp(
                        source.size?.width,
                        1,
                        4000,
                        200
                    )
                ),
            height:
                Math.round(
                    studioClamp(
                        source.size?.height,
                        1,
                        4000,
                        40
                    )
                )
        },

        rotation:
            studioClamp(
                source.rotation,
                -360,
                360,
                0
            ),

        opacity:
            studioClamp(
                source.opacity,
                0,
                1,
                1
            ),

        animation:
            studioAnimation(
                source.animation
            ),

        zIndex:
            Math.round(
                studioClamp(
                    source.zIndex,
                    -1000,
                    1000,
                    index
                )
            )
    };

}


function sanitizeStudioElement(
    input,
    index
) {

    const source =
        input &&
        typeof input === "object" &&
        !Array.isArray(input)
            ? input
            : {};

    const type =
        WIDGET_STUDIO_ALLOWED_TYPES.has(
            String(source.type || "")
        )
            ? String(source.type)
            : "text";

    const base =
        studioElementBase(
            source,
            index,
            type
        );

    if (
        type === "text"
    ) {

        return {
            ...base,
            data: {
                text:
                    studioText(
                        source.data?.text,
                        240,
                        "Text"
                    )
            },
            style: {
                fontFamily:
                    studioFontFamily(
                        source.style?.fontFamily
                    ),
                fontSize:
                    Math.round(
                        studioClamp(
                            source.style?.fontSize,
                            8,
                            200,
                            24
                        )
                    ),
                fontWeight:
                    Math.round(
                        studioClamp(
                            source.style?.fontWeight,
                            100,
                            1000,
                            700
                        )
                    ),
                color:
                    studioColor(
                        source.style?.color,
                        "#f4f8ff"
                    ),
                textAlign:
                    ["left", "center", "right"].includes(
                        source.style?.textAlign
                    )
                        ? source.style.textAlign
                        : "left",
                letterSpacing:
                    studioClamp(source.style?.letterSpacing, -8, 30, 0),
                textTransform:
                    ["none", "uppercase", "lowercase"].includes(source.style?.textTransform)
                        ? source.style.textTransform
                        : "none",
                ...studioTextFrameStyle(
                    source.style
                ),
                ...studioEffectStyle(
                    source.style
                )
            }
        };

    }

    if (
        type === "counter"
    ) {

        return {
            ...base,
            data: {
                format:
                    studioText(
                        source.data?.format,
                        80,
                        "{{current}} / {{target}}"
                    )
            },
            style: {
                fontFamily:
                    studioFontFamily(
                        source.style?.fontFamily
                    ),
                fontSize:
                    Math.round(
                        studioClamp(
                            source.style?.fontSize,
                            8,
                            200,
                            20
                        )
                    ),
                fontWeight:
                    Math.round(
                        studioClamp(
                            source.style?.fontWeight,
                            100,
                            1000,
                            800
                        )
                    ),
                color:
                    studioColor(
                        source.style?.color,
                        "#f4f8ff"
                    ),
                textAlign:
                    ["left", "center", "right"].includes(
                        source.style?.textAlign
                    )
                        ? source.style.textAlign
                        : "right",
                letterSpacing:
                    studioClamp(source.style?.letterSpacing, -8, 30, 0),
                textTransform:
                    ["none", "uppercase", "lowercase"].includes(source.style?.textTransform)
                        ? source.style.textTransform
                        : "none",
                ...studioTextFrameStyle(
                    source.style
                ),
                ...studioEffectStyle(
                    source.style
                )
            }
        };

    }

    if (
        type === "progress"
    ) {

        return {
            ...base,
            data: {},
            style: {
                backgroundColor:
                    studioColor(
                        source.style?.backgroundColor,
                        "rgba(255,255,255,0.12)"
                    ),
                fillColor:
                    studioColor(
                        source.style?.fillColor,
                        "#148cff"
                    ),
                borderRadius:
                    studioClamp(
                        source.style?.borderRadius,
                        0,
                        200,
                        10
                    ),
                borderWidth:
                    studioClamp(
                        source.style?.borderWidth,
                        0,
                        20,
                        0
                    ),
                borderColor:
                    studioColor(
                        source.style?.borderColor,
                        "transparent"
                    ),
                borderStyle:
                    ["solid","dashed","dotted","double"].includes(source.style?.borderStyle)
                        ? source.style.borderStyle
                        : "solid",
                ...studioEffectStyle(
                    source.style
                ),
                ...studioGradientStyle(
                    source.style
                )
            },
            animation:
                studioAnimation(
                    source.animation,
                    "fade",
                    "glow"
                )
        };

    }

    if (
        type === "shape"
    ) {

        return {
            ...base,
            data: {
                shape:
                    ["rectangle", "ellipse", "line"].includes(
                        source.data?.shape
                    )
                        ? source.data.shape
                        : "rectangle"
            },
            style: {
                backgroundColor:
                    studioColor(
                        source.style?.backgroundColor,
                        "#071321"
                    ),
                borderRadius:
                    studioClamp(
                        source.style?.borderRadius,
                        0,
                        500,
                        18
                    ),
                borderWidth:
                    studioClamp(
                        source.style?.borderWidth,
                        0,
                        20,
                        1
                    ),
                borderColor:
                    studioColor(
                        source.style?.borderColor,
                        "#173756"
                    ),
                borderStyle:
                    ["solid","dashed","dotted","double"].includes(source.style?.borderStyle)
                        ? source.style.borderStyle
                        : "solid",
                ...studioEffectStyle(
                    source.style
                ),
                ...studioGradientStyle(
                    source.style
                )
            }
        };

    }

    if (type === "video") {
        return {
            ...base,
            data: {
                src: studioVideoSource(source.data?.src),
                muted: source.data?.muted !== false,
                loop: source.data?.loop !== false,
                autoplay: source.data?.autoplay !== false
            },
            style: {
                objectFit: ["contain","cover","fill"].includes(source.style?.objectFit) ? source.style.objectFit : "cover",
                borderRadius: studioClamp(source.style?.borderRadius,0,500,0),
                borderWidth: studioClamp(source.style?.borderWidth,0,20,0),
                borderColor: studioColor(source.style?.borderColor,"transparent"),
                borderStyle: ["solid","dashed","dotted","double"].includes(source.style?.borderStyle) ? source.style.borderStyle : "solid",
                ...studioEffectStyle(source.style)
            }
        };
    }

    if (type === "chat") {
        return {
            ...base,
            data: {
                maxMessages: Math.round(studioClamp(source.data?.maxMessages, 1, 12, 6)),
                showAvatar: source.data?.showAvatar !== false,
                showTimestamp: source.data?.showTimestamp === true,
                newestAtBottom: source.data?.newestAtBottom !== false
            },
            style: {
                fontFamily: studioFontFamily(source.style?.fontFamily),
                fontSize: Math.round(studioClamp(source.style?.fontSize, 9, 64, 18)),
                fontWeight: Math.round(studioClamp(source.style?.fontWeight, 100, 1000, 700)),
                usernameColor: studioColor(source.style?.usernameColor, "#27d0ff"),
                messageColor: studioColor(source.style?.messageColor, "#f4f8ff"),
                botColor: studioColor(source.style?.botColor, "#73e6ff"),
                backgroundColor: studioColor(source.style?.backgroundColor, "rgba(5,15,27,0.82)"),
                messageBackground: studioColor(source.style?.messageBackground, "rgba(15,36,56,0.76)"),
                borderRadius: studioClamp(source.style?.borderRadius, 0, 500, 22),
                borderWidth: studioClamp(source.style?.borderWidth, 0, 20, 1),
                borderColor: studioColor(source.style?.borderColor, "rgba(39,208,255,0.38)"),
                borderStyle: ["solid","dashed","dotted","double"].includes(source.style?.borderStyle) ? source.style.borderStyle : "solid",
                padding: studioClamp(source.style?.padding, 0, 80, 16),
                gap: studioClamp(source.style?.gap, 0, 40, 10),
                avatarSize: studioClamp(source.style?.avatarSize, 18, 96, 38),
                ...studioEffectStyle(source.style)
            }
        };
    }

    return {
        ...base,
        data: {
            src:
                studioImageSource(
                    source.data?.src
                ),
            binding:
                ["tiktok.avatar", "event.actor_avatar"].includes(
                    source.data?.binding
                )
                    ? source.data.binding
                    : "",
            alt:
                studioText(
                    source.data?.alt,
                    120,
                    "Widget Bild"
                ),
            assetId:
                studioText(
                    source.data?.assetId,
                    120,
                    ""
                ),
            sourceWidth:
                Math.round(studioClamp(source.data?.sourceWidth,0,20000,0)),
            sourceHeight:
                Math.round(studioClamp(source.data?.sourceHeight,0,20000,0))
        },
        style: {
            objectFit:
                ["contain", "cover", "fill"].includes(
                    source.style?.objectFit
                )
                    ? source.style.objectFit
                    : "cover",
            objectPositionX:
                studioClamp(source.style?.objectPositionX,0,100,50),
            objectPositionY:
                studioClamp(source.style?.objectPositionY,0,100,50),
            imageScale:
                studioClamp(source.style?.imageScale,1,3,1),
            brightness:
                studioClamp(source.style?.brightness,0,300,100),
            contrast:
                studioClamp(source.style?.contrast,0,300,100),
            saturation:
                studioClamp(source.style?.saturation,0,300,100),
            grayscale:
                studioClamp(source.style?.grayscale,0,100,0),
            blur:
                studioClamp(source.style?.blur,0,40,0),
            imageMask:
                ["none","rounded","circle","hex","diamond"].includes(source.style?.imageMask)
                    ? source.style.imageMask
                    : "none",
            borderRadius:
                studioClamp(
                    source.style?.borderRadius,
                    0,
                    500,
                    0
                ),
            borderWidth:
                studioClamp(
                    source.style?.borderWidth,
                    0,
                    20,
                    0
                ),
            borderColor:
                studioColor(
                    source.style?.borderColor,
                    "transparent"
                ),
            borderStyle:
                ["solid","dashed","dotted","double"].includes(source.style?.borderStyle)
                    ? source.style.borderStyle
                    : "solid",
            ...studioEffectStyle(
                source.style
            )
        }
    };

}


function studioWidgetTemplateConfig(widgetType = "follower_goal", templateKey = "cfs-standard") {
    const def = studioWidgetDefinition(widgetType);
    const template = WIDGET_STUDIO_TEMPLATE_KEYS.has(String(templateKey)) ? String(templateKey) : "cfs-standard";
    const isGoal = def.mode === "goal" || def.mode === "goal_alert";
    const isEventWidget = def.mode === "alert" || def.mode === "latest";
    const goal = Number(def.default_goal || 1000);
    const label = def.label;
    const short = def.short_label;
    const sourceText = def.source_kind === "static" ? "FREIES OVERLAY" : def.source_kind === "profile" ? "TIKTOK PROFIL" : def.source_kind === "manual" ? "MANUELL" : def.source_kind === "hybrid" ? "CREATOR SUITE" : "TIKTOK LIVE";

    const base = (id,type,name,x,y,w,h,z=10) => ({id,type,name,visible:true,locked:false,position:{x,y},size:{width:w,height:h},rotation:0,opacity:1,zIndex:z,animation:{enabled:true,enter:"fade",change:type==="counter"?"pulse":type==="progress"?"glow":"none",durationMs:500}});
    const text=(id,name,value,x,y,w,h,size,color,align="left",weight=800,z=10,fx={})=>({...base(id,"text",name,x,y,w,h,z),data:{text:value},style:{fontFamily:"Inter",fontSize:size,fontWeight:weight,color,textAlign:align,letterSpacing:0,textTransform:"none",shadowColor:"rgba(0,0,0,.36)",shadowBlur:0,shadowX:0,shadowY:0,glowColor:"#148cff",glowBlur:0,...fx}});
    const counter=(id,name,format,x,y,w,h,size,color,align="right",weight=850,z=12,fx={})=>({...base(id,"counter",name,x,y,w,h,z),data:{format},style:{fontFamily:"Inter",fontSize:size,fontWeight:weight,color,textAlign:align,letterSpacing:0,textTransform:"none",shadowColor:"rgba(0,0,0,.36)",shadowBlur:0,shadowX:0,shadowY:0,glowColor:"#148cff",glowBlur:0,...fx}});
    const shape=(id,name,x,y,w,h,bg,radius,border="transparent",bw=0,z=0,fx={})=>({...base(id,"shape",name,x,y,w,h,z),data:{shape:"rectangle"},style:{backgroundColor:bg,gradientEnabled:false,gradientFrom:"#148cff",gradientTo:"#20d4e6",gradientAngle:90,borderRadius:radius,borderWidth:bw,borderColor:border,shadowColor:"rgba(0,0,0,.45)",shadowBlur:22,shadowX:0,shadowY:10,glowColor:"#148cff",glowBlur:0,...fx}});
    const progress=(id,x,y,w,h,fill,bg,radius,z=12,fx={})=>({...base(id,"progress","Fortschrittsbalken",x,y,w,h,z),data:{},style:{backgroundColor:bg,fillColor:fill,gradientEnabled:false,gradientFrom:fill,gradientTo:"#20d4e6",gradientAngle:90,borderRadius:radius,borderWidth:0,borderColor:"transparent",shadowColor:"rgba(0,0,0,.25)",shadowBlur:0,shadowX:0,shadowY:0,glowColor:fill,glowBlur:0,...fx},animation:{enabled:true,enter:"fade",change:"glow",durationMs:650}});
    const avatar=(id,name,binding,x,y,size,radius,z=12,fx={})=>({...base(id,"image",name,x,y,size,size,z),data:{binding,src:"",alt:name},style:{objectFit:"cover",borderRadius:radius,shadowColor:"rgba(0,0,0,.4)",shadowBlur:14,shadowX:0,shadowY:6,glowColor:"#148cff",glowBlur:0,...fx},animation:{enabled:true,enter:"pop",change:"none",durationMs:500}});
    const chat=(id,name,x,y,w,h,accent,bg,z=12)=>({...base(id,"chat",name,x,y,w,h,z),data:{maxMessages:6,showAvatar:true,showTimestamp:false,newestAtBottom:true},style:{fontFamily:"Inter",fontSize:18,fontWeight:700,usernameColor:accent,messageColor:"#f4f8ff",botColor:"#73e6ff",backgroundColor:bg,messageBackground:"rgba(12,31,48,.82)",borderRadius:22,borderWidth:1,borderColor:accent,borderStyle:"solid",padding:16,gap:10,avatarSize:38,shadowColor:"rgba(0,0,0,.45)",shadowBlur:24,shadowX:0,shadowY:10,glowColor:accent,glowBlur:7}});

    const common={
        version:7,
        widgetType:def.key,
        platform:def.platform || (def.source_kind === "static" ? "obs" : "tiktok"),
        data:{metric:def.metric||"",eventType:def.event_type||""},
        settings:{
            goal,
            manualValue:Math.max(0,Math.round(Number(def.default_value||0))),
            manualTimerSeconds:Math.max(0,Math.round(Number(def.default_seconds||0))),
            manualTimerRunning:false,
            manualTimerUpdatedAt:null,
            alertDurationMs:Number(def.default_duration_ms||4500),
            alertSound:(def.mode === "alert" || def.mode === "goal_alert") ? (def.event_type === "gift" ? "chime" : def.event_type === "share" ? "pulse" : def.mode === "goal_alert" ? "success" : "cfs_pop") : "off",
            alertVolume:0.7,
            latestTimeoutMs:0,
            chatMaxMessages:6,
            chatMessageTimeoutMs:0,
            chatShowAvatar:true,
            chatShowTimestamp:false,
            chatNewestAtBottom:true,
            offlineBehavior:def.mode === "timer" ? "hide" : "hold"
        }
    };
    if (def.mode === "chat") {
        const accent = template === "minimal" ? "#f4f8ff" : template === "wide" ? "#20d4e6" : "#27d0ff";
        const bg = template === "glass" ? "rgba(8,31,48,.62)" : template === "minimal" ? "rgba(2,8,14,.52)" : "rgba(5,15,27,.84)";
        const width = template === "wide" ? 760 : template === "compact" ? 430 : 560;
        const height = template === "compact" ? 240 : 340;
        return {...common,canvas:{width,height,background:"transparent"},elements:[
            chat("chat","TikTok LIVE Chat",4,4,width-8,height-8,accent,bg,10)
        ]};
    }

    if (def.mode === "static") {
        const staticKind = String(def.static_kind || "free");
        const staticFormat = String(def.static_format || "");
        const accent = template === "neon" ? "#27d0ff" : template === "glass" ? "#8be9ff" : template === "wide" ? "#20d4e6" : "#148cff";
        const second = template === "minimal" ? "rgba(244,248,255,.62)" : template === "compact" ? "#5aaeff" : template === "glass" ? "#b9f3ff" : "#20d4e6";
        const bg = template === "neon" ? "rgba(4,18,31,.95)" : template === "glass" ? "rgba(13,34,52,.72)" : "rgba(6,17,31,.94)";
        const border = template === "minimal" ? 2 : template === "neon" ? 5 : template === "compact" ? 3 : 4;
        const radius = template === "minimal" ? 8 : template === "compact" ? 18 : 24;
        const glow = template === "neon" ? 32 : template === "glass" ? 18 : 8;

        if (staticKind === "camera") {
            let width = 640, height = 360;
            if (staticFormat === "9:16") { width = 360; height = 640; }
            if (staticFormat === "1:1") { width = 500; height = 500; }
            if (template === "compact") { width = staticFormat === "9:16" ? 300 : staticFormat === "1:1" ? 420 : 480; height = staticFormat === "9:16" ? 533 : staticFormat === "1:1" ? 420 : 270; }
            if (template === "wide" && staticFormat === "16:9") { width = 800; height = 450; }
            if (template === "blank") return {...common,canvas:{width,height,background:"transparent"},elements:[]};
            const longAccent = Math.max(42,Math.round((staticFormat === "9:16" ? height : width)*.14));
            return {...common,canvas:{width,height,background:"transparent"},elements:[
                shape("camera_frame","Kamera Rahmen",border,border,width-border*2,height-border*2,"transparent",radius,accent,border,10,{glowColor:accent,glowBlur:glow,shadowBlur:template === "minimal" ? 0 : 18,shadowY:6}),
                shape("corner_tl","Akzent oben links",border+10,border+10,Math.min(longAccent,Math.round(width*.42)),Math.max(4,border),accent,999,"transparent",0,12,{glowColor:accent,glowBlur:glow}),
                shape("corner_br","Akzent unten rechts",Math.max(border+10,width-Math.min(longAccent,Math.round(width*.42))-border-10),height-Math.max(4,border)-border-10,Math.min(longAccent,Math.round(width*.42)),Math.max(4,border),second,999,"transparent",0,12,{glowColor:second,glowBlur:Math.max(4,Math.round(glow*.65))})
            ]};
        }

        if (staticKind === "scene_frame") {
            const portrait = staticFormat === "9:16";
            const width = portrait ? 720 : 1280, height = portrait ? 1280 : 720;
            if (template === "blank") return {...common,canvas:{width,height,background:"transparent"},elements:[]};
            const outer = template === "minimal" ? 4 : template === "neon" ? 10 : 7;
            const accentLen = portrait ? 130 : 220;
            return {...common,canvas:{width,height,background:"transparent"},elements:[
                shape("scene_frame","Szenen Rahmen",outer,outer,width-outer*2,height-outer*2,"transparent",template === "minimal" ? 8 : 24,accent,outer,4,{glowColor:accent,glowBlur:glow,shadowBlur:0,shadowY:0}),
                shape("scene_top","Akzent oben",outer+22,outer+18,accentLen,Math.max(5,Math.round(outer*.7)),accent,999,"transparent",0,10,{glowColor:accent,glowBlur:glow}),
                shape("scene_bottom","Akzent unten",width-accentLen-outer-22,height-outer-24,accentLen,Math.max(5,Math.round(outer*.7)),second,999,"transparent",0,10,{glowColor:second,glowBlur:Math.max(5,Math.round(glow*.7))}),
                text("brand","Branding","cfs_zockt",portrait?38:52,portrait?44:36,portrait?260:310,34,portrait?18:20,"#f4f8ff","left",900,12,{glowColor:accent,glowBlur:template === "neon" ? 8 : 0})
            ]};
        }

        if (staticKind === "lower_third") {
            const width = template === "compact" ? 520 : template === "wide" ? 900 : 720, height = template === "compact" ? 110 : 138;
            if (template === "blank") return {...common,canvas:{width,height,background:"transparent"},elements:[]};
            return {...common,canvas:{width,height,background:"transparent"},elements:[
                shape("plate","Nameplate Hintergrund",4,8,width-8,height-16,bg,template === "minimal" ? 8 : 22,accent,template === "minimal" ? 1 : 2,2,{glowColor:accent,glowBlur:glow,shadowBlur:22,shadowY:8}),
                shape("accent","Nameplate Akzent",16,20,7,height-40,accent,999,"transparent",0,6,{glowColor:accent,glowBlur:Math.max(5,Math.round(glow*.6))}),
                text("name","Creator Name","CHRISTOPHER",38,27,width-72,35,template === "compact" ? 20 : 24,"#f4f8ff","left",900,10),
                text("info","Info","cfs_zockt · CREATOR",38,68,width-72,24,11,accent,"left",800,10)
            ]};
        }

        if (staticKind === "social_bar") {
            const width = template === "compact" ? 620 : template === "wide" ? 1080 : 840, height = 86;
            if (template === "blank") return {...common,canvas:{width,height,background:"transparent"},elements:[]};
            return {...common,canvas:{width,height,background:"transparent"},elements:[
                shape("bar","Social Bar",4,8,width-8,height-16,bg,999,accent,template === "minimal" ? 1 : 2,2,{glowColor:accent,glowBlur:glow,shadowBlur:18,shadowY:6}),
                text("brand","Creator","@cfs_zockt",28,28,Math.round(width*.28),28,16,"#f4f8ff","left",900,10),
                text("social_one","Social 1","TIKTOK",Math.round(width*.35),30,Math.round(width*.18),24,10,accent,"center",900,10),
                text("social_two","Social 2","DISCORD",Math.round(width*.57),30,Math.round(width*.18),24,10,second,"center",900,10),
                text("cta","Hinweis","JOIN THE COMMUNITY",Math.round(width*.77),30,Math.round(width*.2)-22,24,9,"rgba(244,248,255,.70)","right",800,10)
            ]};
        }

        if (staticKind === "header") {
            const width = template === "compact" ? 720 : template === "wide" ? 1280 : 960, height = 92;
            if (template === "blank") return {...common,canvas:{width,height,background:"transparent"},elements:[]};
            return {...common,canvas:{width,height,background:"transparent"},elements:[
                shape("header_bg","Header Hintergrund",4,7,width-8,height-14,bg,template === "minimal" ? 6 : 18,accent,template === "minimal" ? 1 : 2,2,{glowColor:accent,glowBlur:glow,shadowBlur:16,shadowY:5}),
                text("header_title","Titel","HEUTIGER STREAM",24,25,Math.round(width*.45),28,17,"#f4f8ff","left",900,10),
                text("header_info","Info","CHALLENGE · COMMUNITY · GAMING",Math.round(width*.48),29,Math.round(width*.48),22,10,accent,"right",800,10)
            ]};
        }

        if (staticKind === "sidebar") {
            const width = template === "compact" ? 260 : 320, height = template === "compact" ? 620 : 820;
            if (template === "blank") return {...common,canvas:{width,height,background:"transparent"},elements:[]};
            return {...common,canvas:{width,height,background:"transparent"},elements:[
                shape("sidebar_bg","Sidebar Hintergrund",8,8,width-16,height-16,bg,template === "minimal" ? 8 : 24,accent,template === "minimal" ? 1 : 2,2,{glowColor:accent,glowBlur:glow,shadowBlur:22,shadowY:8}),
                text("sidebar_brand","Branding","cfs_zockt",28,32,width-56,34,20,"#f4f8ff","left",900,10),
                shape("sidebar_line","Akzent",28,82,width-56,4,accent,999,"transparent",0,8,{glowColor:accent,glowBlur:Math.max(5,Math.round(glow*.6))}),
                text("sidebar_title","Titel","STREAM INFO",28,112,width-56,24,11,accent,"left",900,10),
                text("sidebar_body","Info","GAME\nCOMMUNITY\nCHALLENGE\nSOCIALS",28,154,width-56,180,16,"rgba(244,248,255,.82)","left",800,10)
            ]};
        }

        if (staticKind === "screen") {
            const width = 1280, height = 720;
            if (template === "blank") return {...common,canvas:{width,height,background:"transparent"},elements:[]};
            const screen = String(def.static_screen || "starting");
            const title = screen === "brb" ? "BIN GLEICH ZURÜCK" : screen === "ending" ? "DANKE FÜRS ZUSCHAUEN" : "STREAM STARTET GLEICH";
            const sub = screen === "brb" ? "KURZE PAUSE · GLEICH GEHT'S WEITER" : screen === "ending" ? "BIS ZUM NÄCHSTEN STREAM" : "MACH ES DIR BEQUEM · WIR LEGEN GLEICH LOS";
            return {...common,canvas:{width,height,background:"transparent"},elements:[
                shape("screen_bg","Szenen Hintergrund",0,0,width,height,template === "minimal" ? "rgba(3,8,14,.78)" : bg,0,"transparent",0,0,{glowBlur:0,shadowBlur:0}),
                shape("screen_frame","Szenen Rahmen",34,34,width-68,height-68,"transparent",template === "minimal" ? 8 : 30,accent,template === "minimal" ? 2 : 4,4,{glowColor:accent,glowBlur:glow,shadowBlur:0}),
                text("screen_brand","Branding","cfs_zockt",70,82,width-140,34,18,accent,"center",900,10,{glowColor:accent,glowBlur:template === "neon" ? 12 : 0}),
                text("screen_title","Haupttitel",title,86,280,width-172,70,42,"#f4f8ff","center",900,12,{glowColor:accent,glowBlur:template === "neon" ? 10 : 0}),
                shape("screen_line","Akzent Linie",Math.round(width*.34),375,Math.round(width*.32),5,second,999,"transparent",0,10,{glowColor:second,glowBlur:Math.max(5,Math.round(glow*.7))}),
                text("screen_sub","Untertitel",sub,90,410,width-180,36,14,"rgba(244,248,255,.72)","center",750,12)
            ]};
        }

        if (template === "blank") return {...common,canvas:{width:720,height:180,background:"transparent"},elements:[]};
        const width = template === "wide" ? 900 : template === "compact" ? 480 : 720;
        const height = template === "compact" ? 110 : 180;
        if (template === "minimal") return {...common,canvas:{width:720,height:120,background:"transparent"},elements:[
            text("title","Titel","MEIN STREAM",18,18,684,40,26,"#f4f8ff","center",900),
            text("sub","Untertitel","FREIES OVERLAY",18,68,684,20,10,"rgba(244,248,255,.55)","center",700)
        ]};
        return {...common,canvas:{width,height,background:"transparent"},elements:[
            shape("bg","Overlay Rahmen",4,4,width-8,height-8,bg,template==="compact"?18:24,accent,2,0,{glowColor:accent,glowBlur:template==="neon"?22:7}),
            text("title","Titel","MEIN STREAM",28,template==="compact"?25:44,width-56,36,template==="compact"?20:29,"#f4f8ff","center",900,12),
            text("sub","Untertitel","FREIES OVERLAY",28,template==="compact"?64:94,width-56,24,10,accent,"center",800,12)
        ]};
    }
    if(template==="blank") return {...common,canvas:{width:600,height:140,background:"transparent"},elements:[]};

    if (isEventWidget) {
        const eventType = def.event_type || "event";
        const title = eventType === "follow" ? (def.mode === "latest" ? "LETZTER FOLLOWER" : "NEUER FOLLOWER")
            : eventType === "gift" ? (def.mode === "latest" ? "LETZTES GIFT" : "NEUES GIFT")
            : eventType === "share" ? (def.mode === "latest" ? "LETZTER SHARE" : "LIVE GETEILT")
            : short;
        const message = eventType === "follow" ? (def.mode === "latest" ? "{{actor}}" : "{{actor}} folgt dir jetzt!")
            : eventType === "gift" ? "{{actor}} · {{amount}}× {{gift}}"
            : eventType === "share" ? (def.mode === "latest" ? "{{actor}}" : "{{actor}} hat deinen LIVE geteilt!")
            : "{{actor}}";
        const sub = eventType === "gift" ? "Danke für deinen Support!" : eventType === "follow" ? "Willkommen in der Community" : "Danke fürs Teilen";
        const h = def.mode === "alert" ? 158 : 112;
        const accent = template === "neon" ? "#27d0ff" : template === "wide" ? "#20d4e6" : template === "glass" ? "#27d0ff" : "#148cff";
        const bg = template === "neon" ? "rgba(4,18,31,.96)" : template === "glass" ? "rgba(13,34,52,.72)" : "rgba(6,17,31,.97)";
        const width = template === "compact" ? 440 : template === "wide" ? 760 : 620;
        const height = template === "compact" ? 96 : template === "wide" ? 112 : h;
        if (template === "minimal") return {...common,canvas:{width:600,height:def.mode==="alert"?118:82,background:"transparent"},elements:[
            text("event_title","Event Titel",title,8,8,220,18,9,accent,"left",900),
            text("event_actor","Event Text",message,8,30,584,30,def.mode==="alert"?21:18,"#f4f8ff","left",850),
            text("event_sub","Event Subtext",sub,8,66,584,18,8,"rgba(244,248,255,.54)","left",650)
        ]};
        return {...common,canvas:{width,height,background:"transparent"},elements:[
            shape("bg","Alert Hintergrund",3,3,width-6,height-6,bg,template==="compact"?18:22,accent,1,0,{glowColor:accent,glowBlur:template==="neon"?22:7,shadowBlur:28,shadowY:12}),
            avatar("event_avatar","Event Avatar","event.actor_avatar",template==="compact"?14:18,template==="compact"?15:24,template==="compact"?64:def.mode==="alert"?88:68,template==="compact"?16:22,12,{glowColor:accent,glowBlur:6}),
            text("event_source","Event Quelle","TIKTOK LIVE · "+title,template==="compact"?94:126,template==="compact"?13:20,width-(template==="compact"?112:150),16,8,accent,"left",900),
            text("event_actor","Event Text",message,template==="compact"?94:126,template==="compact"?31:44,width-(template==="compact"?112:150),def.mode==="alert"?34:28,template==="compact"?15:def.mode==="alert"?21:17,"#f4f8ff","left",850,13,{glowColor:template==="neon"?accent:"#148cff",glowBlur:template==="neon"?8:0}),
            text("event_sub","Event Subtext",sub,template==="compact"?94:126,template==="compact"?62:def.mode==="alert"?91:77,width-(template==="compact"?112:150),18,8,"rgba(176,207,232,.68)","left",650)
        ]};
    }

    if (def.mode === "goal_alert") {
        const accent = template === "neon" ? "#27d0ff" : template === "wide" ? "#20d4e6" : "#148cff";
        return {...common,canvas:{width:640,height:166,background:"transparent"},elements:[
            shape("bg","Goal Alert Hintergrund",4,4,632,158,template==="neon"?"rgba(4,18,31,.96)":"rgba(6,17,31,.97)",24,accent,1,0,{glowColor:accent,glowBlur:template==="neon"?24:9}),
            text("badge","Goal Badge","ZIEL ERREICHT",28,24,584,20,10,accent,"center",900,12,{glowColor:accent,glowBlur:8}),
            text("headline","Headline","GESCHAFFT!",28,51,584,42,30,"#f4f8ff","center",900,13),
            counter("counter","Zielstand","{{current}} / {{target}}",28,97,584,28,18,"#dceeff","center",800,13),
            text("message","Nachricht","Danke an die ganze Community!",28,128,584,18,9,"rgba(176,207,232,.68)","center",650,13)
        ]};
    }

    const currentFormat=isGoal?"{{current}} / {{target}}":(def.mode === "timer" || def.mode === "manual_timer")?"{{timer}}":"{{current}}";
    const subText=isGoal
        ?"{{percent}}% erreicht · noch {{remaining}}"
        :def.mode === "timer"
            ?"LIVE SESSION · {{status}}"
            :def.mode === "manual_timer"
                ?"MANUELLER STREAM TIMER"
                :def.mode === "manual_counter"
                    ?"MANUELL STEUERBAR"
                    :"{{status}} · "+sourceText;

    if(template==="minimal") return {...common,canvas:{width:600,height:isGoal?96:82,background:"transparent"},elements:[
        text("title","Titel",label,8,10,300,23,15,"#f4f8ff","left",700),
        counter("counter","Wert",currentFormat,315,8,277,29,19,"#f4f8ff","right",700),
        ...(isGoal?[progress("progress",8,58,584,4,"#f4f8ff","rgba(255,255,255,.15)",999),text("sub","Status",subText,8,68,584,16,8,"rgba(244,248,255,.55)","right",600)]:[text("sub","Status",subText,8,52,584,16,8,"rgba(244,248,255,.55)","right",600)])
    ]};

    if(template==="neon") return {...common,canvas:{width:620,height:isGoal?132:112,background:"transparent"},elements:[
        shape("bg","Neon Hintergrund",4,4,612,isGoal?124:104,"rgba(4,18,31,.96)",22,"#27d0ff",1,0,{glowColor:"#27d0ff",glowBlur:22}),
        text("source","Datenquelle",sourceText,26,17,260,18,8,"#8edcff","left",900,10,{glowColor:"#27d0ff",glowBlur:8}),
        text("title","Titel",short,26,38,280,24,16,"#ffffff","left",900),
        counter("counter","Wert",currentFormat,300,30,290,34,25,"#ffffff","right",900,12,{glowColor:"#27d0ff",glowBlur:10}),
        ...(isGoal?[progress("progress",26,88,564,11,"#27d0ff","rgba(255,255,255,.1)",999,12,{glowColor:"#27d0ff",glowBlur:14}),text("sub","Status",subText,26,104,564,15,8,"rgba(255,255,255,.58)","right",650)]:[text("sub","Status",subText,26,76,564,16,8,"rgba(255,255,255,.58)","right",650)])
    ]};

    if(template==="glass") return {...common,canvas:{width:610,height:isGoal?132:112,background:"transparent"},elements:[
        shape("bg","Glass Hintergrund",4,4,602,isGoal?124:104,"rgba(13,34,52,.68)",24,"rgba(96,197,255,.3)",1,0,{glowColor:"#27d0ff",glowBlur:7}),
        avatar("avatar","TikTok Profilbild","tiktok.avatar",20,18,isGoal?88:72,20,12,{glowColor:"#27d0ff",glowBlur:7}),
        text("title","Titel",label,126,22,230,28,18,"#f6fbff","left",800),
        counter("counter","Wert",currentFormat,344,20,240,30,19,"#f6fbff","right",850),
        ...(isGoal?[progress("progress",126,82,458,12,"#27d0ff","rgba(255,255,255,.12)",999),text("sub","Status",subText,126,100,458,15,8,"rgba(205,235,252,.68)","right",650)]:[text("sub","Status",subText,126,62,458,18,8,"rgba(205,235,252,.68)","left",650)])
    ]};

    if(template==="compact") return {...common,canvas:{width:430,height:92,background:"transparent"},elements:[
        shape("bg","Hintergrund",2,2,426,88,"rgba(6,17,31,.96)",18,"rgba(90,174,255,.24)",1),
        avatar("avatar","TikTok Profilbild","tiktok.avatar",13,13,66,16),
        text("title","Titel",short,94,12,220,16,8,"#78baff","left",900),
        counter("counter","Wert",currentFormat,94,29,310,25,16,"#f4f8ff","left",850),
        ...(isGoal?[progress("progress",94,64,310,8,"#5aaeff","rgba(255,255,255,.11)",999)]:[text("sub","Status",subText,94,61,310,15,7,"rgba(244,248,255,.5)","left",650)])
    ]};

    if(template==="wide") return {...common,canvas:{width:800,height:112,background:"transparent"},elements:[
        shape("bg","Hintergrund",2,2,796,108,"rgba(6,17,31,.96)",18,"rgba(32,212,230,.22)",1),
        text("title","Titel",short,24,17,210,18,9,"#20d4e6","left",900),
        counter("counter","Wert",currentFormat,224,14,210,38,30,"#f4f8ff","left",900),
        text("source","Datenquelle",isGoal?"von {{target}} · "+sourceText:sourceText,442,26,210,18,9,"rgba(244,248,255,.52)","left",650),
        ...(isGoal?[counter("percent","Prozent","{{percent}}%",650,17,120,28,18,"#20d4e6","right",850),progress("progress",24,72,746,9,"#20d4e6","rgba(255,255,255,.1)",999),text("sub","Status","Noch {{remaining}} bis zum Ziel",24,87,746,14,8,"rgba(244,248,255,.46)","right",650)]:[text("sub","Status",subText,650,72,120,16,8,"rgba(244,248,255,.46)","right",650)])
    ]};

    if(def.source_kind === "manual") return {...common,canvas:{width:620,height:isGoal?132:112,background:"transparent"},elements:[
        shape("bg","CFS Hintergrund",3,3,614,isGoal?126:106,"rgba(6,17,31,.97)",22,"rgba(20,140,255,.32)",1,0,{glowColor:"#148cff",glowBlur:6}),
        text("source","CFS Label","cfs_zockt · MANUELL",24,17,300,16,8,"#4eb7ff","left",900),
        text("title","Titel",label,24,35,280,28,19,"#f4f8ff","left",850),
        counter("counter","Wert",currentFormat,326,35,268,29,19,"#f4f8ff","right",850),
        ...(isGoal?[progress("progress",24,78,570,12,"#148cff","rgba(255,255,255,.11)",999),text("sub","Status",subText,24,98,570,16,9,"rgba(176,207,232,.68)","right",650)]:[text("sub","Status",subText,24,76,570,17,8,"rgba(176,207,232,.62)","right",650)])
    ]};

    return {...common,canvas:{width:620,height:isGoal?132:112,background:"transparent"},elements:[
        shape("bg","CFS Hintergrund",3,3,614,isGoal?126:106,"rgba(6,17,31,.97)",22,"rgba(20,140,255,.32)",1,0,{glowColor:"#148cff",glowBlur:6}),
        avatar("avatar","TikTok Profilbild","tiktok.avatar",18,18,isGoal?90:72,22,12,{glowColor:"#148cff",glowBlur:6}),
        text("source","CFS Label","cfs_zockt · "+sourceText,126,17,300,16,8,"#4eb7ff","left",900),
        text("title","Titel",label,126,35,240,28,19,"#f4f8ff","left",850),
        counter("counter","Wert",currentFormat,350,35,244,29,19,"#f4f8ff","right",850),
        ...(isGoal?[progress("progress",126,78,468,12,"#148cff","rgba(255,255,255,.11)",999),text("sub","Status",subText,126,98,468,16,9,"rgba(176,207,232,.68)","right",650)]:[text("sub","Status",subText,126,76,468,17,8,"rgba(176,207,232,.62)","right",650)])
    ]};
}

function followerGoalTemplateConfig(templateKey = "cfs-standard") {
    return studioWidgetTemplateConfig("follower_goal", templateKey);
}


const WIDGET_STUDIO_OUTPUT_PROFILES = Object.freeze({
    obs: {
        key: "obs",
        label: "OBS Widget",
        width: null,
        height: null,
        anchor: "top-left",
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        safeArea: false
    },
    tiktok_vertical: {
        key: "tiktok_vertical",
        label: "TikTok Vertical",
        width: 1080,
        height: 1920,
        anchor: "top-center",
        offsetX: 0,
        offsetY: 180,
        scale: 1,
        safeArea: true
    },
    landscape: {
        key: "landscape",
        label: "Landscape 16:9",
        width: 1920,
        height: 1080,
        anchor: "bottom-center",
        offsetX: 0,
        offsetY: -90,
        scale: 1,
        safeArea: true
    }
});

const WIDGET_STUDIO_OUTPUT_ANCHORS = new Set([
    "top-left","top-center","top-right",
    "center-left","center","center-right",
    "bottom-left","bottom-center","bottom-right"
]);

function studioWidgetOutputDefaults(profileKey) {
    const profile = WIDGET_STUDIO_OUTPUT_PROFILES[profileKey] || WIDGET_STUDIO_OUTPUT_PROFILES.obs;
    return {
        enabled: true,
        anchor: profile.anchor,
        offsetX: profile.offsetX,
        offsetY: profile.offsetY,
        scale: profile.scale,
        safeArea: profile.safeArea
    };
}

function sanitizeStudioWidgetOutput(input, profileKey) {
    const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const defaults = studioWidgetOutputDefaults(profileKey);
    return {
        enabled: source.enabled !== false,
        anchor: WIDGET_STUDIO_OUTPUT_ANCHORS.has(String(source.anchor || ""))
            ? String(source.anchor)
            : defaults.anchor,
        offsetX: Math.round(studioClamp(source.offsetX,-4000,4000,defaults.offsetX)),
        offsetY: Math.round(studioClamp(source.offsetY,-4000,4000,defaults.offsetY)),
        scale: Math.round(studioClamp(source.scale,0.25,3,defaults.scale)*100)/100,
        safeArea: profileKey === "obs" ? false : source.safeArea !== false
    };
}

function studioWidgetOutputUrls(publicToken) {
    const token = encodeURIComponent(publicToken);
    return {
        obs: APP_BASE_URL + "/widgets/studio.html#token=" + token,
        tiktok_vertical: APP_BASE_URL + "/widgets/output.html#token=" + token + "&profile=tiktok_vertical",
        landscape: APP_BASE_URL + "/widgets/output.html#token=" + token + "&profile=landscape"
    };
}

async function studioCreatorIdentity(creatorId) {
    const result = await pool.query(
        `
        SELECT
            c.display_name,
            c.plan,
            c.status,
            c.created_at,
            t.connected AS tiktok_connected,
            t.display_name AS tiktok_display_name,
            t.avatar_url,
            t.follower_count,
            t.likes_count,
            t.updated_at AS tiktok_updated_at,
            beta.status AS beta_status
        FROM creator_accounts c
        LEFT JOIN tiktok_connections t
          ON t.creator_id = c.id
        LEFT JOIN creator_beta_testers beta
          ON beta.creator_id = c.id
        WHERE c.id = $1
        LIMIT 1
        `,
        [creatorId]
    );

    const row = result.rows[0];
    if (!row) return null;
    const access=await creatorAccessProfile({id:creatorId,plan:row.plan,status:row.status,display_name:row.display_name});
    const baseEntitlements=access.base_entitlements;
    const entitlements=access.entitlements;

    return {
        display_name: studioText(row.display_name,120,"Creator"),
        plan: normalizePlan(row.plan),
        effective_plan: access.effective_plan,
        status: row.status || "active",
        created_at: row.created_at || null,
        beta: {
            status: row.beta_status || "none",
            active: row.beta_status === "active"
        },
        profile: {
            connected: Boolean(row.tiktok_connected),
            display_name: studioText(row.tiktok_display_name,120,""),
            avatar_url: studioText(row.avatar_url,2000,""),
            followers: Number(row.follower_count || 0),
            likes_total: Number(row.likes_count || 0),
            updated_at: row.tiktok_updated_at || null
        },
        features: {
            widget_studio:Boolean(entitlements.widget_studio),launcher:Boolean(entitlements.launcher),scene_studio:Boolean(entitlements.scene_studio),live_bridge:Boolean(entitlements.live_bridge),live_widgets:Boolean(entitlements.live_widgets),alerts:Boolean(entitlements.alerts),auto_thanks:Boolean(entitlements.auto_thanks),local_output:Boolean(entitlements.local_output),stream_deck:Boolean(entitlements.stream_deck),games:Boolean(entitlements.games),cut_studio:Boolean(entitlements.cut_studio),audio_studio:Boolean(entitlements.audio_studio),obs:Boolean(entitlements.obs),custom_branding:Boolean(entitlements.custom_branding),max_widgets:Number(entitlements.max_widgets||0),max_scenes:Number(entitlements.max_scenes||0),max_stream_deck_buttons:Number(entitlements.max_stream_deck_buttons||0),max_active_devices:Number(entitlements.max_active_devices||0),max_cut_projects:Number(entitlements.max_cut_projects||0),max_cut_clips_per_project:Number(entitlements.max_cut_clips_per_project||0),max_game_rules:Number(entitlements.max_game_rules||0),max_pending_cut_jobs:Number(entitlements.max_pending_cut_jobs||0)
        },
        entitlements,base_entitlements:baseEntitlements,access_source:access.access_source||"plan",subscription:access.subscription
    };
}


function sanitizeStudioWidgetConfig(input, widgetTypeHint = null) {
    const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const candidate = String(widgetTypeHint || source.widgetType || "follower_goal");
    const def = studioWidgetDefinition(candidate);
    const elements = Array.isArray(source.elements) ? source.elements.slice(0, 80) : [];
    const metricOptions = Array.isArray(def.metric_options) ? def.metric_options : [];
    const requestedMetric = String(source.data?.metric || def.metric || "");
    const metric = metricOptions.length && metricOptions.includes(requestedMetric)
        ? requestedMetric
        : String(def.metric || requestedMetric || "");
    return {
        version: 7,
        widgetType: def.key,
        platform: def.platform || (def.source_kind === "static" ? "obs" : "tiktok"),
        data: {
            metric,
            eventType: String(def.event_type || "")
        },
        canvas: {
            width: Math.round(studioClamp(source.canvas?.width,120,1920,600)),
            height: Math.round(studioClamp(source.canvas?.height,60,1080,120)),
            background: studioColor(source.canvas?.background,"transparent")
        },
        settings: {
            goal: Math.round(studioClamp(source.settings?.goal,1,1000000000,Number(def.default_goal || 1000))),
            alertDurationMs: Math.round(studioClamp(source.settings?.alertDurationMs,1000,20000,Number(def.default_duration_ms || 4500))),
            alertSound: ["off","cfs_pop","chime","pulse","success","soft_bell","custom"].includes(String(source.settings?.alertSound || "")) ? String(source.settings.alertSound) : "off",
            alertSoundUrl: studioAudioSource(source.settings?.alertSoundUrl),
            alertVolume: Math.round(studioClamp(source.settings?.alertVolume,0,1,0.7)*100)/100,
            latestTimeoutMs: Math.round(studioClamp(source.settings?.latestTimeoutMs,0,3600000,0)),
            chatMaxMessages: Math.round(studioClamp(source.settings?.chatMaxMessages,1,12,6)),
            chatMessageTimeoutMs: Math.round(studioClamp(source.settings?.chatMessageTimeoutMs,0,3600000,0)),
            chatShowAvatar: source.settings?.chatShowAvatar !== false,
            chatShowTimestamp: source.settings?.chatShowTimestamp === true,
            chatNewestAtBottom: source.settings?.chatNewestAtBottom !== false,
            manualValue: Math.round(studioClamp(source.settings?.manualValue,0,1000000000,Number(def.default_value || 0))),
            manualTimerSeconds: Math.round(studioClamp(source.settings?.manualTimerSeconds,0,359999,Number(def.default_seconds || 0))),
            manualTimerRunning: def.mode === "manual_timer" ? Boolean(source.settings?.manualTimerRunning) : false,
            manualTimerUpdatedAt: def.mode === "manual_timer" && source.settings?.manualTimerUpdatedAt && Number.isFinite(Date.parse(String(source.settings.manualTimerUpdatedAt)))
                ? new Date(String(source.settings.manualTimerUpdatedAt)).toISOString()
                : null,
            offlineBehavior: ["hold","zero","hide"].includes(String(source.settings?.offlineBehavior || ""))
                ? String(source.settings.offlineBehavior)
                : (def.mode === "timer" ? "hide" : "hold")
        },
        outputs: {
            obs: sanitizeStudioWidgetOutput(source.outputs?.obs, "obs"),
            tiktok_vertical: sanitizeStudioWidgetOutput(source.outputs?.tiktok_vertical, "tiktok_vertical"),
            landscape: sanitizeStudioWidgetOutput(source.outputs?.landscape, "landscape")
        },
        elements: elements.map((element,index)=>sanitizeStudioElement(element,index))
    };
}


function studioWidgetName(
    value,
    fallback = "Mein Follower Goal"
) {

    return studioText(
        value,
        80,
        fallback
    );

}


function createStudioWidgetToken() {

    return crypto
        .randomBytes(24)
        .toString("hex");

}


function validStudioWidgetToken(
    value
) {

    return /^[a-f0-9]{48}$/i.test(
        String(value || "")
    );

}

function validScenePublicToken(value) {
    return /^cfss_[A-Za-z0-9_-]{32}$/.test(String(value || ""));
}

function validGamePublicToken(value) {
    return /^cfsg_[A-Za-z0-9_-]{32}$/.test(String(value || ""));
}


function validStudioWidgetId(
    value
) {

    return /^[0-9a-f-]{36}$/i.test(
        String(value || "")
    );

}


function studioWidgetSourceUrl(
    publicToken
) {

    return (
        APP_BASE_URL +
        "/widgets/studio.html#token=" +
        encodeURIComponent(publicToken)
    );

}


function studioBridgeToken() {
    return "cfsb_" + crypto.randomBytes(WIDGET_BRIDGE_TOKEN_BYTES).toString("base64url");
}

function studioBridgeTokenFromRequest(req) {
    const auth = String(req.get("Authorization") || "").trim();
    if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
    return String(req.get("X-CFS-Bridge-Key") || "").trim();
}

function publicStudioBridgeRow(row) {
    if (!row) return null;
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
    const online = row.status === "active" && Boolean(lastSeen) && Date.now() - lastSeen <= WIDGET_BRIDGE_HEARTBEAT_STALE_MS;
    const capabilities = row.capabilities && typeof row.capabilities === "object" && !Array.isArray(row.capabilities) ? row.capabilities : {};
    return {
        id: String(row.id || ""),
        label: studioText(row.label, 80, "Creator Suite Launcher"),
        token_prefix: studioText(row.token_prefix, 24, ""),
        status: row.status || "active",
        auth_method: studioText(row.auth_method, 40, "legacy_key"),
        device_link_id: studioText(row.device_link_id, 80, ""),
        online,
        client_version: studioText(row.client_version, 80, ""),
        machine_name: studioText(row.machine_name, 120, ""),
        capabilities,
        last_seen_at: row.last_seen_at || null,
        last_connected_at: row.last_connected_at || null,
        created_at: row.created_at || null,
        revoked_at: row.revoked_at || null
    };
}

async function listStudioBridges(creatorId, includeRevoked = false) {
    const result = await pool.query(
        `SELECT * FROM creator_live_bridges
         WHERE creator_id = $1 ${includeRevoked ? "" : "AND status = 'active'"}
         ORDER BY created_at DESC
         LIMIT 10`,
        [creatorId]
    );
    return result.rows.map(publicStudioBridgeRow).filter(Boolean);
}

async function getStudioBridgeStatus(creatorId) {
    const result = await pool.query(
        `SELECT * FROM creator_live_bridges
         WHERE creator_id = $1 AND status = 'active'
         ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [creatorId]
    );
    const bridge = publicStudioBridgeRow(result.rows[0]);
    if (!bridge) {
        return {
            configured: false,
            online: false,
            id: null,
            label: "Creator Suite Launcher",
            token_prefix: "",
            client_version: "",
            machine_name: "",
            capabilities: {},
            last_seen_at: null,
            last_connected_at: null
        };
    }
    return { configured: true, ...bridge };
}

async function createStudioBridgeKey(creatorId, label = "Creator Suite Launcher", { revokeExisting = true, authMethod = "legacy_key", deviceLinkId = null, tokenHash = "", tokenPrefix = "" } = {}) {
    const rawToken = tokenHash ? "" : studioBridgeToken();
    const resolvedTokenHash = tokenHash || hashValue(rawToken);
    const resolvedTokenPrefix = tokenPrefix || rawToken.slice(0, 13);
    const id = crypto.randomUUID();
    const safeLabel = studioText(label, 80, "Creator Suite Launcher");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        if (revokeExisting) {
            await client.query(
                `UPDATE creator_live_bridges
                 SET status='revoked', revoked_at=NOW(), updated_at=NOW()
                 WHERE creator_id=$1 AND status='active'`,
                [creatorId]
            );
        }
        const result = await client.query(
            `INSERT INTO creator_live_bridges (
                id, creator_id, label, token_hash, token_prefix, status,
                auth_method, device_link_id, created_at, updated_at
             ) VALUES ($1,$2,$3,$4,$5,'active',$6,$7,NOW(),NOW())
             RETURNING *`,
            [id, creatorId, safeLabel, resolvedTokenHash, resolvedTokenPrefix, authMethod, deviceLinkId]
        );
        await client.query("COMMIT");
        return { bridge: publicStudioBridgeRow(result.rows[0]), token: rawToken };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function revokeStudioBridgeKey(creatorId, bridgeId) {
    const result = await pool.query(
        `UPDATE creator_live_bridges
         SET status='revoked', revoked_at=NOW(), updated_at=NOW()
         WHERE creator_id=$1 AND id=$2 AND status='active'
         RETURNING id`,
        [creatorId, bridgeId]
    );
    return Boolean(result.rows[0]);
}

async function getStudioBridgeByToken(rawToken) {
    if (!rawToken || !String(rawToken).startsWith("cfsb_") || String(rawToken).length < 30) return null;
    const result = await pool.query(
        `SELECT * FROM creator_live_bridges
         WHERE token_hash=$1 AND status='active'
         LIMIT 1`,
        [hashValue(rawToken)]
    );
    return result.rows[0] || null;
}


const LAUNCHER_DEVICE_LINK_TTL_MS = 10 * 60 * 1000;
const LAUNCHER_DEVICE_POLL_AFTER_MS = 2500;
const DEVICE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function launcherDeviceSecret() {
    return "cfsd_" + crypto.randomBytes(24).toString("base64url");
}

function launcherUserCode() {
    const bytes = crypto.randomBytes(8);
    let out = "";
    for (let i = 0; i < 8; i += 1) {
        out += DEVICE_CODE_ALPHABET[bytes[i] % DEVICE_CODE_ALPHABET.length];
    }
    return "CFS-" + out.slice(0,4) + "-" + out.slice(4);
}

async function cleanupLauncherDeviceLinks() {
    await pool.query(
        `
        UPDATE creator_launcher_device_links
        SET status='expired', updated_at=NOW()
        WHERE status='pending'
          AND expires_at <= NOW()
        `
    );
    await pool.query(
        `
        DELETE FROM creator_launcher_device_links
        WHERE created_at < NOW() - INTERVAL '7 days'
          AND status IN ('expired','consumed','revoked')
        `
    );
}

async function createLauncherDeviceLink(input = {}) {
    await cleanupLauncherDeviceLinks();

    const id = crypto.randomUUID();
    const deviceSecret = launcherDeviceSecret();
    const credentialDelivery = normalizeCredentialDelivery(input.credential_delivery);
    const bridgeToken = credentialDelivery === DEVICE_LINK_DELIVERY_POLL_V2
        ? deriveBridgeToken(id, deviceSecret)
        : studioBridgeToken();
    if (!bridgeToken) throw new Error("Sichere Launcher-Zugangsdaten konnten nicht erzeugt werden.");
    const machineName = studioText(input.machine_name, 120, "Creator PC");
    const clientVersion = studioText(input.client_version, 80, "");
    const expiresAt = new Date(Date.now() + LAUNCHER_DEVICE_LINK_TTL_MS);

    let userCode = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
        userCode = launcherUserCode();
        const exists = await pool.query(
            `SELECT 1 FROM creator_launcher_device_links WHERE user_code=$1 LIMIT 1`,
            [userCode]
        );
        if (!exists.rows[0]) break;
        userCode = "";
    }
    if (!userCode) throw new Error("Device-Code konnte nicht erzeugt werden.");

    await pool.query(
        `
        INSERT INTO creator_launcher_device_links (
            id,user_code,device_secret_hash,bridge_token_hash,bridge_token_prefix,
            status,machine_name,client_version,credential_delivery,expires_at,created_at,updated_at
        )
        VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,NOW(),NOW())
        `,
        [
            id,
            userCode,
            hashValue(deviceSecret),
            hashValue(bridgeToken),
            bridgeToken.slice(0,13),
            machineName,
            clientVersion,
            credentialDelivery,
            expiresAt
        ]
    );

    return {
        device_link_id:id,
        device_secret:deviceSecret,
        ...(credentialDelivery === DEVICE_LINK_DELIVERY_LEGACY ? {bridge_token:bridgeToken} : {}),
        credential_delivery:credentialDelivery,
        user_code:userCode,
        verification_url:
            APP_BASE_URL + "/pages/launcher-connect.html?code=" + encodeURIComponent(userCode),
        expires_at:expiresAt.toISOString(),
        poll_after_ms:LAUNCHER_DEVICE_POLL_AFTER_MS,
        machine_name:machineName,
        client_version:clientVersion
    };
}

async function getLauncherDeviceLinkBySecret(id, secret) {
    if (!id || !validDeviceSecret(secret)) return null;
    const result = await pool.query(
        `
        SELECT *
        FROM creator_launcher_device_links
        WHERE id=$1
          AND device_secret_hash=$2
        LIMIT 1
        `,
        [String(id),hashValue(secret)]
    );
    return result.rows[0] || null;
}

function launcherDeviceCodeFromRequest(req) {
    const direct = studioText(
        req.body?.user_code ||
        req.query?.code ||
        req.get?.("x-cfs-device-code"),
        40,
        ""
    ).toUpperCase();
    if (direct) return normalizeDeviceCode(direct);

    try {
        const referer = studioText(req.get?.("referer"), 1000, "");
        if (!referer) return "";
        const url = new URL(referer);
        const base = new URL(APP_BASE_URL);
        if (url.origin !== base.origin) return "";
        return normalizeDeviceCode(studioText(url.searchParams.get("code"), 40, "").toUpperCase());
    } catch {
        return "";
    }
}

async function approveLauncherDeviceLink(creatorId, userCode) {
    await cleanupLauncherDeviceLinks();
    const access=await creatorAccessProfile(creatorId);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const owner=await client.query(`SELECT id FROM creator_accounts WHERE id=$1 FOR UPDATE`,[creatorId]);
        if(!owner.rows[0]){const error=new Error("Creator-Account nicht gefunden.");error.code="creator_missing";throw error;}
        const activeResult=await client.query(`SELECT COUNT(*)::int AS count FROM creator_live_bridges WHERE creator_id=$1 AND status='active'`,[creatorId]);
        if(Number(activeResult.rows[0]?.count||0)>=Number(access.entitlements.max_active_devices||1)){
            throw creatorResourceLimitError(`Dein Zugriff erlaubt maximal ${Number(access.entitlements.max_active_devices||1)} aktive Launcher-Geräte.`,"device_limit_reached");
        }
        const linkResult = await client.query(
            `
            SELECT *
            FROM creator_launcher_device_links
            WHERE user_code=$1
            FOR UPDATE
            `,
            [normalizeDeviceCode(userCode)]
        );
        const link = linkResult.rows[0];
        if (!link) {
            const error = new Error("Dieser Geräte-Code ist nicht gültig.");
            error.code = "device_code_invalid";
            throw error;
        }
        if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
            await client.query(
                `UPDATE creator_launcher_device_links SET status='expired',updated_at=NOW() WHERE id=$1`,
                [link.id]
            );
            const error = new Error("Dieser Geräte-Code ist abgelaufen.");
            error.code = "device_code_expired";
            throw error;
        }
        if (link.status !== "pending") {
            const error = new Error(
                link.status === "approved" || link.status === "consumed"
                    ? "Dieser Geräte-Code wurde bereits bestätigt."
                    : "Dieser Geräte-Code kann nicht mehr verwendet werden."
            );
            error.code = "device_code_used";
            throw error;
        }

        const bridgeId = crypto.randomUUID();
        const label = studioText(link.machine_name, 80, "Creator Suite Launcher");

        await client.query(
            `
            INSERT INTO creator_live_bridges (
                id,creator_id,label,token_hash,token_prefix,status,
                client_version,machine_name,capabilities,
                auth_method,device_link_id,created_at,updated_at
            )
            VALUES ($1,$2,$3,$4,$5,'active',$6,$7,'{}'::jsonb,'device_link',$8,NOW(),NOW())
            `,
            [
                bridgeId,
                creatorId,
                label,
                link.bridge_token_hash,
                link.bridge_token_prefix,
                studioText(link.client_version,80,""),
                studioText(link.machine_name,120,""),
                link.id
            ]
        );

        await client.query(
            `
            UPDATE creator_launcher_device_links
            SET creator_id=$2,
                bridge_id=$3,
                status='approved',
                approved_at=NOW(),
                updated_at=NOW()
            WHERE id=$1
            `,
            [link.id,creatorId,bridgeId]
        );

        await client.query("COMMIT");
        return {
            ok:true,
            device_link_id:String(link.id),
            bridge_id:bridgeId,
            machine_name:studioText(link.machine_name,120,"Creator PC"),
            client_version:studioText(link.client_version,80,""),
            user_code:studioText(link.user_code,40,"")
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function inspectLauncherDeviceLink(userCode) {
    await cleanupLauncherDeviceLinks();
    const result = await pool.query(
        `
        SELECT id,user_code,status,machine_name,client_version,created_at,expires_at
        FROM creator_launcher_device_links
        WHERE user_code=$1
        LIMIT 1
        `,
        [normalizeDeviceCode(userCode)]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
        device_link_id:String(row.id),
        user_code:studioText(row.user_code,40,""),
        status:row.status || "pending",
        machine_name:studioText(row.machine_name,120,"Creator PC"),
        client_version:studioText(row.client_version,80,""),
        created_at:row.created_at || null,
        expires_at:row.expires_at || null
    };
}

async function listCreatorLauncherDevices(creatorId) {
    const result = await pool.query(
        `
        SELECT *
        FROM creator_live_bridges
        WHERE creator_id=$1
        ORDER BY
            CASE WHEN status='active' THEN 0 ELSE 1 END,
            last_seen_at DESC NULLS LAST,
            created_at DESC
        LIMIT 30
        `,
        [creatorId]
    );
    return result.rows.map(publicStudioBridgeRow).filter(Boolean);
}

async function revokeCurrentStudioBridge(bridgeId, creatorId) {
    const result = await pool.query(
        `
        UPDATE creator_live_bridges
        SET status='revoked',revoked_at=NOW(),updated_at=NOW()
        WHERE id=$1 AND creator_id=$2 AND status='active'
        RETURNING id
        `,
        [bridgeId,creatorId]
    );
    if (result.rows[0]) {
        await pool.query(
            `
            UPDATE creator_launcher_device_links
            SET status='revoked',revoked_at=NOW(),updated_at=NOW()
            WHERE bridge_id=$1
            `,
            [bridgeId]
        );
    }
    return Boolean(result.rows[0]);
}



const BETA_FEEDBACK_KINDS=new Set(["bug","idea","ux","other"]);
const BETA_FEEDBACK_SEVERITIES=new Set(["low","medium","high","critical"]);
const BETA_FEEDBACK_CATEGORIES=new Set(["launcher","live","widgets","scenes","obs","tiktok","games","cut_studio","account","other"]);
const BETA_FEEDBACK_STATUSES=new Set(["new","reviewing","fixed","closed"]);

function betaText(value,max=200,fallback=""){
    const text=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim();
    return (text||fallback).slice(0,max);
}
function sanitizeBetaDiagnostics(input={}){
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const outputGate=source.output_gate&&typeof source.output_gate==="object"?source.output_gate:{};
    const preflight=source.preflight&&typeof source.preflight==="object"?source.preflight:{};
    return {
        launcher_version:betaText(source.launcher_version,80,""),
        platform:betaText(source.platform,80,""),
        provider:betaText(source.provider,80,""),
        bridge_connected:Boolean(source.bridge_connected),
        live_active:Boolean(source.live_active),
        local_output_running:Boolean(source.local_output_running),
        local_output_ready:Boolean(source.local_output_ready),
        scene_id:betaText(source.scene_id,120,""),
        scene_name:betaText(source.scene_name,120,""),
        spool_pending:Math.max(0,Number(source.spool_pending||0)),
        preflight:{
            ok:Boolean(preflight.ok),
            blockers:Array.isArray(preflight.blockers)?preflight.blockers.slice(0,20).map(item=>({
                key:betaText(item?.key,80,""),label:betaText(item?.label,120,""),detail:betaText(item?.detail,300,"")
            })):[]
        },
        output_gate:{
            pass:Math.max(0,Number(outputGate.pass||0)),
            fail:Math.max(0,Number(outputGate.fail||0)),
            untested:Math.max(0,Number(outputGate.untested||0)),
            total:Math.max(0,Number(outputGate.total||0)),
            complete:Boolean(outputGate.complete)
        }
    };
}
async function requireActiveBetaBridge(bridge){
    const beta=await getCreatorBetaState(bridge.creator_id);
    if(!beta.active){const error=new Error("Beta-Testfunktionen sind für diesen Creator nicht aktiv.");error.code="beta_not_active";throw error}
    return beta;
}
async function activeBetaSessionForBridge(creatorId,bridgeId){
    const result=await pool.query(`SELECT * FROM creator_beta_sessions WHERE creator_id=$1 AND bridge_id=$2 AND status='active' ORDER BY started_at DESC LIMIT 1`,[creatorId,bridgeId]);
    return result.rows[0]||null;
}
function publicBetaSession(row){
    if(!row)return null;
    return {id:String(row.id),creator_id:String(row.creator_id),bridge_id:row.bridge_id?String(row.bridge_id):null,label:row.label||"Beta Test",launcher_version:row.launcher_version||"",platform:row.platform||"",provider:row.provider||"",status:row.status||"active",started_at:row.started_at||null,ended_at:row.ended_at||null,duration_seconds:Number(row.duration_seconds||0),output_gate:row.output_gate||{},diagnostics:row.diagnostics||{},result_summary:row.result_summary||""};
}
function publicBetaFeedback(row){
    if(!row)return null;
    return {id:String(row.id),creator_id:String(row.creator_id),bridge_id:row.bridge_id?String(row.bridge_id):null,session_id:row.session_id?String(row.session_id):null,kind:row.kind||"bug",severity:row.severity||"medium",category:row.category||"launcher",title:row.title||"",description:row.description||"",repro_steps:row.repro_steps||"",expected:row.expected||"",actual:row.actual||"",launcher_version:row.launcher_version||"",platform:row.platform||"",provider:row.provider||"",diagnostics:row.diagnostics||{},status:row.status||"new",admin_notes:row.admin_notes||"",created_at:row.created_at||null,updated_at:row.updated_at||null};
}

async function requireStudioBridge(req, res, next) {
    try {
        const rawToken = studioBridgeTokenFromRequest(req);
        const bridge = await getStudioBridgeByToken(rawToken);
        if (!bridge) {
            return res.status(401).json({ ok:false, error:"Bridge-Schlüssel ungültig oder widerrufen." });
        }
        req.studioBridge = bridge;
        next();
    } catch (error) {
        safeLogError("Widget Studio Bridge Auth Fehler:",error);
        return res.status(500).json({ ok:false, error:"Bridge konnte nicht authentifiziert werden." });
    }
}

const STREAM_HEALTH_STATUSES=new Set(["idle","starting","running","reconnecting","stopping","error","unavailable"]);
const STREAM_TARGET_STATUSES=new Set(["idle","starting","live","reconnecting","stopping","stopped","error"]);
const STREAM_HEALTH_PROVIDERS=new Set(["youtube","twitch","tiktok","kick","facebook","custom_rtmp","recording",""]);
function streamHealthNumber(value,min,max,fallback=0){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function streamHealthTime(value){const text=studioText(value,64,"");if(!text)return null;const time=new Date(text);return Number.isNaN(time.getTime())?null:time.toISOString();}
function sanitizeLauncherStreamHealth(input={}){
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    if(!Object.keys(source).length)return {};
    const clean={schema:1,status:STREAM_HEALTH_STATUSES.has(String(source.status||""))?String(source.status):"idle",available:source.available===true,desired_running:source.desiredRunning===true||source.desired_running===true,checked_at:streamHealthTime(source.checkedAt||source.checked_at),started_at:streamHealthTime(source.startedAt||source.started_at),stopped_at:streamHealthTime(source.stoppedAt||source.stopped_at),metrics:{},destinations:[],recording:null};
    const metrics=source.metrics&&typeof source.metrics==="object"?source.metrics:{};
    clean.metrics={active:Math.round(streamHealthNumber(metrics.active,0,16)),errors:Math.round(streamHealthNumber(metrics.errors,0,100000)),reconnects:Math.round(streamHealthNumber(metrics.reconnects,0,100000)),watchdog_restarts:Math.round(streamHealthNumber(metrics.watchdogRestarts??metrics.watchdog_restarts,0,100000)),dropped_frames:Math.round(streamHealthNumber(metrics.droppedFrames??metrics.dropped_frames,0,100000000)),upload_kbps:Math.round(streamHealthNumber(metrics.uploadKbps??metrics.upload_kbps,0,500000)),live_targets:Math.round(streamHealthNumber(metrics.liveTargets??metrics.live_targets,0,8)),encoder_speed:streamHealthNumber(metrics.encoderSpeed??metrics.encoder_speed,0,10),average_fps:streamHealthNumber(metrics.averageFps??metrics.average_fps,0,240)};
    const rows=source.destinations&&typeof source.destinations==="object"&&!Array.isArray(source.destinations)?Object.values(source.destinations):(Array.isArray(source.destinations)?source.destinations:[]);
    clean.destinations=rows.slice(0,8).map((row,index)=>{const item=row&&typeof row==="object"?row:{};const provider=STREAM_HEALTH_PROVIDERS.has(String(item.provider||""))?String(item.provider):"";const status=STREAM_TARGET_STATUSES.has(String(item.status||""))?String(item.status):"idle";const m=item.metrics&&typeof item.metrics==="object"?item.metrics:{};return{id:studioText(item.id,64,`target_${index+1}`).replace(/[^a-zA-Z0-9_-]/g,"_"),label:studioText(item.label,80,provider||`Ziel ${index+1}`),provider,status,started_at:streamHealthTime(item.startedAt||item.started_at),stopped_at:streamHealthTime(item.stoppedAt||item.stopped_at),reconnect_attempt:Math.round(streamHealthNumber(item.reconnectAttempt??item.reconnect_attempt,0,99)),reconnect_at:streamHealthTime(item.reconnectAt||item.reconnect_at),profile:studioText(item.profile,40,""),encoder:studioText(item.encoder,40,""),configured_bitrate_kbps:Math.round(streamHealthNumber(item.configuredBitrateKbps??item.configured_bitrate_kbps,0,30000)),metrics:{fps:streamHealthNumber(m.fps,0,240),bitrate_kbps:streamHealthNumber(m.bitrateKbps??m.bitrate_kbps,0,50000),speed:streamHealthNumber(m.speed,0,10),dropped_frames:Math.round(streamHealthNumber(m.droppedFrames??m.dropped_frames,0,100000000)),duplicated_frames:Math.round(streamHealthNumber(m.duplicatedFrames??m.duplicated_frames,0,100000000))}};});
    const rec=source.recording&&typeof source.recording==="object"?source.recording:null;
    if(rec){const m=rec.metrics&&typeof rec.metrics==="object"?rec.metrics:{};clean.recording={status:STREAM_TARGET_STATUSES.has(String(rec.status||""))?String(rec.status):"idle",started_at:streamHealthTime(rec.startedAt||rec.started_at),stopped_at:streamHealthTime(rec.stoppedAt||rec.stopped_at),profile:studioText(rec.profile,40,""),encoder:studioText(rec.encoder,40,""),metrics:{fps:streamHealthNumber(m.fps,0,240),bitrate_kbps:streamHealthNumber(m.bitrateKbps??m.bitrate_kbps,0,50000),speed:streamHealthNumber(m.speed,0,10),dropped_frames:Math.round(streamHealthNumber(m.droppedFrames??m.dropped_frames,0,100000000)),duplicated_frames:Math.round(streamHealthNumber(m.duplicatedFrames??m.duplicated_frames,0,100000000))}};}
    return clean;
}
async function getCreatorStreamStudioRuntime(creatorId){
    const result=await pool.query(`SELECT id,machine_name,client_version,last_seen_at,stream_health_at,stream_health FROM creator_live_bridges WHERE creator_id=$1 AND status='active' ORDER BY COALESCE(stream_health_at,last_seen_at,updated_at) DESC LIMIT 1`,[creatorId]);
    const row=result.rows[0];
    if(!row)return{connected:false,fresh:false,launcher:null,health:{},server_time:new Date().toISOString()};
    const now=Date.now(),lastSeen=row.last_seen_at?new Date(row.last_seen_at).getTime():0,healthAt=row.stream_health_at?new Date(row.stream_health_at).getTime():0;
    const connected=lastSeen>0&&now-lastSeen<=30000,fresh=healthAt>0&&now-healthAt<=25000;
    return{connected,fresh,launcher:{id:String(row.id),machine_name:row.machine_name||"Creator PC",client_version:row.client_version||"",last_seen_at:row.last_seen_at||null},health:fresh&&row.stream_health&&typeof row.stream_health==="object"?sanitizeLauncherStreamHealth(row.stream_health):{},health_at:row.stream_health_at||null,server_time:new Date().toISOString()};
}

async function touchStudioBridge(bridgeId, creatorId, input = {}) {
    const machineName = studioText(input.machine_name, 120, "");
    const clientVersion = studioText(input.client_version, 80, "");
    const capabilities = input.capabilities && typeof input.capabilities === "object" && !Array.isArray(input.capabilities) ? input.capabilities : {};
    const hasStreamHealth = input.stream_health && typeof input.stream_health === "object" && !Array.isArray(input.stream_health);
    const streamHealth = hasStreamHealth ? sanitizeLauncherStreamHealth(input.stream_health) : {};
    const hasLiveFlag = typeof input.live_session_active === "boolean";
    const liveActive = input.live_session_active === true;
    await pool.query(
        `UPDATE creator_live_bridges SET
            machine_name = CASE WHEN $3 <> '' THEN $3 ELSE machine_name END,
            client_version = CASE WHEN $4 <> '' THEN $4 ELSE client_version END,
            capabilities = CASE WHEN $5::jsonb <> '{}'::jsonb THEN $5::jsonb ELSE capabilities END,
            stream_health = CASE WHEN $6 THEN $7::jsonb ELSE stream_health END,
            stream_health_at = CASE WHEN $6 THEN NOW() ELSE stream_health_at END,
            last_seen_at=NOW(),
            last_connected_at=COALESCE(last_connected_at,NOW()),
            updated_at=NOW()
         WHERE id=$1 AND creator_id=$2 AND status='active'`,
        [bridgeId, creatorId, machineName, clientVersion, JSON.stringify(capabilities), hasStreamHealth, JSON.stringify(streamHealth)]
    );
    await pool.query(
        `INSERT INTO creator_live_state (creator_id, provider, connected, bridge_heartbeat_at, updated_at)
         VALUES ($1,'launcher_bridge',$3,NOW(),NOW())
         ON CONFLICT (creator_id) DO UPDATE SET
            bridge_heartbeat_at=NOW(),
            connected=CASE WHEN $2 THEN $3 ELSE creator_live_state.connected END,
            provider=CASE WHEN $2 AND $3 THEN 'launcher_bridge' ELSE creator_live_state.provider END`,
        [creatorId, hasLiveFlag, liveActive]
    );
}

function emptyStudioLiveState() {
    return {
        connected: false,
        provider: "none",
        session_id: null,
        likes: 0,
        viewers: 0,
        shares: 0,
        gifts_count: 0,
        gifts_value: 0,
        followers_gained: 0,
        started_at: null,
        last_event_at: null,
        bridge_heartbeat_at: null,
        updated_at: null,
        stale: true
    };
}

async function getStudioLiveState(creatorId) {
    const result = await pool.query(
        `SELECT * FROM creator_live_state WHERE creator_id = $1 LIMIT 1`,
        [creatorId]
    );
    const row = result.rows[0];
    if (!row) return emptyStudioLiveState();
    const provider = row.provider || "none";
    const updated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const heartbeat = row.bridge_heartbeat_at ? new Date(row.bridge_heartbeat_at).getTime() : 0;
    const freshness = provider === "launcher_bridge" ? heartbeat : updated;
    const stale = !freshness || Date.now() - freshness > WIDGET_BRIDGE_HEARTBEAT_STALE_MS;
    return {
        connected: Boolean(row.connected) && !stale,
        provider,
        session_id: row.session_id || null,
        likes: Number(row.likes || 0),
        viewers: Number(row.viewers || 0),
        shares: Number(row.shares || 0),
        gifts_count: Number(row.gifts_count || 0),
        gifts_value: Number(row.gifts_value || 0),
        followers_gained: Number(row.followers_gained || 0),
        started_at: row.started_at || null,
        last_event_at: row.last_event_at || null,
        bridge_heartbeat_at: row.bridge_heartbeat_at || null,
        updated_at: row.updated_at || null,
        stale
    };
}

async function studioDataSnapshot(creatorId) {
    const [profile, live, bridge] = await Promise.all([
        getFollowerWidgetTikTokData(creatorId),
        getStudioLiveState(creatorId),
        getStudioBridgeStatus(creatorId)
    ]);
    return {
        profile: {
            connected: Boolean(profile.connected),
            display_name: profile.display_name || "",
            avatar_url: profile.avatar_url || "",
            followers: Number(profile.follower_count || 0),
            likes_total: Number(profile.likes_count || 0),
            updated_at: profile.updated_at || null
        },
        live,
        bridge
    };
}

function publicStudioLiveEventRow(row) {
    if (!row) return null;
    const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload : {};
    return {
        id: String(row.id || ""),
        session_id: row.session_id || null,
        provider: row.provider || "none",
        event_type: String(row.event_type || ""),
        actor_name: studioText(row.actor_name, 100, ""),
        actor_avatar: studioText(row.actor_avatar, 2000, ""),
        amount: Number(row.amount || 0),
        value: Number(row.event_value || 0),
        payload: {
            gift_name: studioText(payload.gift_name || payload.giftName, 120, ""),
            gift_id: studioText(payload.gift_id || payload.giftId, 120, ""),
            message: studioText(payload.message, 280, ""),
            source_provider: STREAM_STUDIO_EVENT_SOURCE_PROVIDERS.has(String(payload.source_provider || payload.sourceProvider || "").toLowerCase()) ? String(payload.source_provider || payload.sourceProvider).toLowerCase() : "launcher_bridge",
            source_channel: studioText(payload.source_channel || payload.sourceChannel, 120, ""),
            source_event_id: studioText(payload.source_event_id || payload.sourceEventId, 160, ""),
            is_bot: payload.is_bot === true,
            bot_command: studioText(payload.bot_command, 24, ""),
            repeat_count: Math.max(0, Math.round(Number(payload.repeat_count || payload.repeatCount || 0) || 0))
        },
        created_at: row.created_at || null
    };
}

async function getRecentStudioLiveEvents(creatorId, eventType = null, limit = 20, sessionId = null) {
    const safeLimit = Math.max(1, Math.min(50, Math.round(Number(limit) || 20)));
    const resolvedSessionId = sessionId || (await getStudioLiveState(creatorId)).session_id;
    if (!resolvedSessionId) return [];
    const params = [creatorId, resolvedSessionId];
    let where = `creator_id = $1 AND session_id = $2`;
    if (eventType) {
        params.push(String(eventType));
        where += ` AND event_type = $3`;
    }
    params.push(safeLimit);
    const limitParam = `$${params.length}`;
    const result = await pool.query(
        `SELECT * FROM creator_live_events WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ${limitParam}`,
        params
    );
    return result.rows.map(publicStudioLiveEventRow).filter(Boolean);
}

const WIDGET_STUDIO_INTERACTION_EVENT_TYPES = new Set(["follow","gift","share"]);
const WIDGET_STUDIO_EVENT_RETENTION_DAYS = 7;
const WIDGET_STUDIO_SESSION_RETENTION_DAYS = 90;

function studioInteractionDefaults(eventType) {
    if (eventType === "gift") return {enabled:false,cooldown_seconds:8,min_amount:1,template_text:"Danke {{actor}} für {{amount}}x {{gift}}!",output_kind:"launcher_tts"};
    if (eventType === "share") return {enabled:false,cooldown_seconds:20,min_amount:1,template_text:"Danke fürs Teilen, {{actor}}!",output_kind:"launcher_tts"};
    return {enabled:false,cooldown_seconds:20,min_amount:1,template_text:"Danke für deinen Follow, {{actor}}!",output_kind:"launcher_tts"};
}

function studioInteractionText(template, event) {
    const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
    return String(template || "")
        .replaceAll("{{actor}}", studioText(event?.actor_name,100,"Creator"))
        .replaceAll("{{gift}}", studioText(payload.gift_name,100,"Gift"))
        .replaceAll("{{amount}}", String(Math.max(0,Number(event?.amount||1))))
        .replaceAll("{{event}}", studioText(event?.event_type,40,"LIVE"))
        .slice(0,280);
}

async function listStudioInteractionRules(creatorId) {
    const result = await pool.query(`SELECT * FROM creator_interaction_rules WHERE creator_id=$1`, [creatorId]);
    const rows = new Map(result.rows.map(row => [row.event_type,row]));
    return ["follow","gift","share"].map(eventType => {
        const row = rows.get(eventType), defaults = studioInteractionDefaults(eventType);
        return {
            event_type:eventType,
            enabled:row ? Boolean(row.enabled) : defaults.enabled,
            cooldown_seconds:Number(row?.cooldown_seconds ?? defaults.cooldown_seconds),
            min_amount:Number(row?.min_amount ?? defaults.min_amount),
            template_text:row?.template_text || defaults.template_text,
            output_kind:row?.output_kind || defaults.output_kind,
            last_triggered_at:row?.last_triggered_at || null
        };
    });
}

async function saveStudioInteractionRule(creatorId, eventType, input={}) {
    if (!WIDGET_STUDIO_INTERACTION_EVENT_TYPES.has(eventType)) throw new Error("Unbekannter Interaction-Typ.");
    const defaults = studioInteractionDefaults(eventType);
    const enabled = input.enabled === true;
    const cooldown = Math.round(studioClamp(input.cooldown_seconds,0,3600,defaults.cooldown_seconds));
    const minAmount = Math.round(studioClamp(input.min_amount,1,1000000,defaults.min_amount));
    const template = studioText(input.template_text,280,defaults.template_text);
    const outputKind = "launcher_tts";
    const result = await pool.query(`
        INSERT INTO creator_interaction_rules (id,creator_id,event_type,enabled,cooldown_seconds,min_amount,template_text,output_kind,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
        ON CONFLICT (creator_id,event_type) DO UPDATE SET
            enabled=EXCLUDED.enabled,cooldown_seconds=EXCLUDED.cooldown_seconds,min_amount=EXCLUDED.min_amount,
            template_text=EXCLUDED.template_text,output_kind=EXCLUDED.output_kind,updated_at=NOW()
        RETURNING *`,
        [crypto.randomUUID(),creatorId,eventType,enabled,cooldown,minAmount,template,outputKind]
    );
    return result.rows[0];
}

async function processStudioInteractionEvent(creatorId, event) {
    if (!event || !WIDGET_STUDIO_INTERACTION_EVENT_TYPES.has(event.event_type)) return null;
    const ruleResult = await pool.query(`SELECT * FROM creator_interaction_rules WHERE creator_id=$1 AND event_type=$2 LIMIT 1`, [creatorId,event.event_type]);
    const rule = ruleResult.rows[0];
    if (!rule || !rule.enabled) return null;
    if (Number(event.amount||0) < Number(rule.min_amount||1)) return null;
    const last = rule.last_triggered_at ? new Date(rule.last_triggered_at).getTime() : 0;
    if (last && Date.now()-last < Number(rule.cooldown_seconds||0)*1000) return null;
    const text = studioInteractionText(rule.template_text,event);
    if (!text) return null;
    const id = crypto.randomUUID();
    await pool.query(
        `INSERT INTO creator_live_actions
            (id,creator_id,session_id,event_id,action_type,action_text,payload,status,attempts,expires_at,created_at)
         VALUES
            ($1,$2,$3,$4,$5,$6,$7::jsonb,'pending',0,NOW()+($8::int*INTERVAL '1 minute'),NOW())`,
        [id,creatorId,event.session_id||null,event.id||null,rule.output_kind||"launcher_tts",text,JSON.stringify({event_type:event.event_type,actor_name:event.actor_name||"",gift_name:event.payload?.gift_name||"",amount:Number(event.amount||1)}),ACTION_TTL_MINUTES]
    );
    await pool.query(`UPDATE creator_interaction_rules SET last_triggered_at=NOW(),updated_at=NOW() WHERE creator_id=$1 AND event_type=$2`,[creatorId,event.event_type]);
    return {id,action_type:rule.output_kind||"launcher_tts",text};
}

function defaultStreamBotConfig() {
    return {
        enabled:false,
        prefix:"!",
        commands:[
            {command:"discord",enabled:true,response:"Discord findest du über meine cfs_zockt-Seite.",response_mode:"overlay",cooldown_seconds:15},
            {command:"social",enabled:true,response:"Meine aktuellen Links findest du auf meiner cfs_zockt-Seite.",response_mode:"overlay",cooldown_seconds:15}
        ]
    };
}

function sanitizeStreamBotConfig(input={}) {
    const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    const prefix=studioText(source.prefix,3,"!").replace(/\s/g,"").slice(0,3)||"!";
    const rows=Array.isArray(source.commands)?source.commands:defaultStreamBotConfig().commands;
    const seen=new Set();
    const commands=[];
    for(const item of rows.slice(0,30)){
        if(!item||typeof item!=="object")continue;
        const command=String(item.command||"").trim().toLowerCase().replace(/^[!/#]+/,"").replace(/[^a-z0-9_-]/g,"").slice(0,24);
        if(!command||seen.has(command))continue;
        seen.add(command);
        const response=studioText(item.response,220,"");
        if(!response)continue;
        commands.push({
            command,
            enabled:item.enabled!==false,
            response,
            response_mode:["overlay","tts","both"].includes(String(item.response_mode||""))?String(item.response_mode):"overlay",
            cooldown_seconds:Math.round(studioClamp(item.cooldown_seconds,0,600,15))
        });
    }
    return {enabled:source.enabled===true,prefix,commands};
}

async function getStreamBotConfig(creatorId){
    const row=await getCreatorSettings(creatorId);
    return sanitizeStreamBotConfig(row.settings?.stream_bot||defaultStreamBotConfig());
}

async function saveStreamBotConfig(creatorId,input){
    const clean=sanitizeStreamBotConfig(input);
    await pool.query(
        `INSERT INTO creator_settings(creator_id,settings,updated_at)
         VALUES($1,jsonb_build_object('stream_bot',$2::jsonb),NOW())
         ON CONFLICT(creator_id) DO UPDATE SET
            settings=jsonb_set(COALESCE(creator_settings.settings,'{}'::jsonb),'{stream_bot}',$2::jsonb,true),
            updated_at=NOW()`,
        [creatorId,JSON.stringify(clean)]
    );
    return clean;
}

function streamBotResponseText(template,event,config){
    const actor=studioText(event?.actor_name,100,"Viewer");
    return studioText(String(template||"").replaceAll("{{actor}}",actor).replaceAll("{{prefix}}",config.prefix||"!"),220,"");
}

async function processStreamBotChatEvent(creatorId,event){
    if(!event||event.event_type!=="chat"||event.payload?.is_bot===true)return null;
    const message=studioText(event.payload?.message,280,"");
    const config=await getStreamBotConfig(creatorId);
    if(!config.enabled||!message.startsWith(config.prefix))return null;
    const raw=message.slice(config.prefix.length).trim().split(/\s+/)[0]||"";
    const command=raw.toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,24);
    const rule=config.commands.find(item=>item.enabled&&item.command===command);
    if(!rule)return null;
    const cooldown=Number(rule.cooldown_seconds||0);
    const cooldownClaim=await pool.query(
        `INSERT INTO creator_stream_bot_cooldowns(creator_id,command,last_triggered_at,updated_at)
         VALUES($1,$2,NOW(),NOW())
         ON CONFLICT(creator_id,command) DO UPDATE SET
            last_triggered_at=NOW(),
            updated_at=NOW()
         WHERE creator_stream_bot_cooldowns.last_triggered_at <= NOW() - ($3::int * INTERVAL '1 second')
         RETURNING last_triggered_at`,
        [creatorId,command,Math.max(0,Math.round(cooldown))]
    );
    if(!cooldownClaim.rows.length)return {matched:true,cooldown:true,command};
    const response=streamBotResponseText(rule.response,event,config);
    if(!response)return null;
    const mode=rule.response_mode||"overlay";
    if(mode==="overlay"||mode==="both"){
        await applyStudioLiveEvent(creatorId,{
            event_type:"chat",
            event_key:`bot-${event.id||crypto.randomUUID()}-${command}`,
            actor_name:"cfs_zockt Bot",
            actor_avatar:"",
            amount:1,
            payload:{message:response,is_bot:true,bot_command:command}
        },"stream_bot");
    }
    if(mode==="tts"||mode==="both"){
        await pool.query(`INSERT INTO creator_live_actions(id,creator_id,session_id,event_id,action_type,action_text,payload,status,attempts,expires_at,created_at) VALUES($1,$2,$3,$4,'launcher_tts',$5,$6::jsonb,'pending',0,NOW()+($7::int*INTERVAL '1 minute'),NOW())`,[crypto.randomUUID(),creatorId,event.session_id||null,event.id||null,response,JSON.stringify({event_type:"chat",actor_name:event.actor_name||"",bot_command:command}),ACTION_TTL_MINUTES]);
    }
    return {matched:true,cooldown:false,command,response,response_mode:mode};
}

async function getStudioLiveSessions(creatorId, limit=8) {
    const safeLimit = Math.max(1,Math.min(30,Number(limit)||8));
    const result = await pool.query(`SELECT * FROM creator_live_sessions WHERE creator_id=$1 ORDER BY started_at DESC LIMIT ${safeLimit}`,[creatorId]);
    return result.rows.map(row=>({id:row.id,provider:row.provider,status:row.status,likes:Number(row.likes||0),viewers_peak:Number(row.viewers_peak||0),shares:Number(row.shares||0),gifts_count:Number(row.gifts_count||0),gifts_value:Number(row.gifts_value||0),followers_gained:Number(row.followers_gained||0),started_at:row.started_at,ended_at:row.ended_at,updated_at:row.updated_at}));
}

async function cleanupStudioLiveHistory(creatorId) {
    await Promise.all([
        pool.query(`DELETE FROM creator_live_events WHERE creator_id=$1 AND created_at < NOW() - INTERVAL '${WIDGET_STUDIO_EVENT_RETENTION_DAYS} days'`,[creatorId]),
        pool.query(`DELETE FROM creator_live_actions WHERE creator_id=$1 AND created_at < NOW() - INTERVAL '${WIDGET_STUDIO_EVENT_RETENTION_DAYS} days'`,[creatorId]),
        pool.query(`DELETE FROM creator_live_sessions WHERE creator_id=$1 AND started_at < NOW() - INTERVAL '${WIDGET_STUDIO_SESSION_RETENTION_DAYS} days'`,[creatorId]),
        pool.query(`DELETE FROM creator_stream_bot_cooldowns WHERE creator_id=$1 AND updated_at < NOW() - INTERVAL '30 days'`,[creatorId])
    ]);
    await pool.query(`DELETE FROM creator_live_events WHERE creator_id=$1 AND id IN (SELECT id FROM creator_live_events WHERE creator_id=$1 ORDER BY created_at DESC OFFSET 5000)`,[creatorId]);
}

function publicStudioAction(row) {
    return {
        id:row.id,
        session_id:row.session_id||null,
        event_id:row.event_id||null,
        action_type:row.action_type,
        action_text:row.action_text,
        payload:row.payload||{},
        status:row.status,
        attempts:Number(row.attempts||0),
        lease_until:row.lease_until||null,
        expires_at:row.expires_at||null,
        last_error:row.last_error||null,
        created_at:row.created_at,
        delivered_at:row.delivered_at||null,
        acked_at:row.acked_at||null
    };
}


const STREAM_STUDIO_EVENT_SOURCE_PROVIDERS = new Set(["tiktok","twitch","youtube","kick","facebook","custom_rtmp","simulator","launcher_bridge"]);

function sanitizeStudioBridgeEventPayload(source = {}) {
    const input = source && typeof source === "object" && !Array.isArray(source) ? source : {};
    const providerRaw = String(input.source_provider || input.sourceProvider || "launcher_bridge").toLowerCase();
    const sourceProvider = STREAM_STUDIO_EVENT_SOURCE_PROVIDERS.has(providerRaw) ? providerRaw : "launcher_bridge";
    const out = { source_provider: sourceProvider };
    const sourceChannel = studioText(input.source_channel || input.sourceChannel || input.channel,120,"");
    const sourceEventId = studioText(input.source_event_id || input.sourceEventId || input.message_id || input.messageId,160,"");
    const message = studioText(input.message,280,"");
    const giftName = studioText(input.gift_name || input.giftName,120,"");
    const giftId = studioText(input.gift_id || input.giftId,120,"");
    const botCommand = studioText(input.bot_command || input.botCommand,24,"");
    if(sourceChannel) out.source_channel=sourceChannel;
    if(sourceEventId) out.source_event_id=sourceEventId;
    if(message) out.message=message;
    if(giftName) out.gift_name=giftName;
    if(giftId) out.gift_id=giftId;
    if(botCommand) out.bot_command=botCommand;
    if(input.is_bot===true) out.is_bot=true;
    if(input.repeat_end===true) out.repeat_end=true;
    const repeatCount=Math.max(0,Math.min(1000000,Math.round(Number(input.repeat_count || input.repeatCount || 0)||0)));
    const totalLikes=Math.max(0,Math.min(1000000000,Math.round(Number(input.total_likes || input.totalLikes || 0)||0)));
    if(repeatCount>0) out.repeat_count=repeatCount;
    if(totalLikes>0) out.total_likes=totalLikes;
    const valueUnit=studioText(input.provider_value_unit,24,"").toLowerCase();
    if(["diamonds","bits","stars","currency","points"].includes(valueUnit)) out.provider_value_unit=valueUnit;
    return out;
}

const WIDGET_STUDIO_LIVE_EVENT_TYPES = new Set([
    "live_start", "live_end", "follow", "like", "gift", "share", "viewer_update", "chat", "reset"
]);

async function applyStudioLiveEvent(creatorId, input = {}, provider = "simulator") {
    const type = String(input.event_type || "");
    if (!WIDGET_STUDIO_LIVE_EVENT_TYPES.has(type)) throw new Error("Unbekannter Live-Event-Typ.");
    const amount = Math.max(0, Math.round(Number(input.amount ?? 1) || 0));
    const value = Math.max(0, Number(input.value ?? 0) || 0);
    const actorName = studioText(input.actor_name, 100, "");
    const actorAvatar = studioImageSource(input.actor_avatar) || studioText(input.actor_avatar, 2000, "");
    const eventKey = studioText(input.event_key, 160, "") || null;
    const payload = sanitizeStudioBridgeEventPayload(input.payload);
    const client = await pool.connect();
    let insertedEvent = null;
    let sessionId = null;
    try {
        await client.query("BEGIN");
        const stateResult = await client.query(`SELECT * FROM creator_live_state WHERE creator_id=$1 FOR UPDATE`,[creatorId]);
        const previousState = stateResult.rows[0] || null;
        sessionId = previousState?.session_id || crypto.randomUUID();
        if (type === "live_start" || type === "reset") sessionId = crypto.randomUUID();

        const eventId = crypto.randomUUID();
        const eventInsert = await client.query(`INSERT INTO creator_live_events (id,creator_id,session_id,provider,event_key,event_type,actor_name,actor_avatar,amount,event_value,payload,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW()) ON CONFLICT (creator_id,provider,event_key) WHERE event_key IS NOT NULL DO NOTHING RETURNING *`,
            [eventId,creatorId,sessionId,provider,eventKey,type,actorName||null,actorAvatar||null,amount,value,JSON.stringify(payload)]
        );
        if (eventKey && eventInsert.rowCount === 0) {
            await client.query("COMMIT");
            return getStudioLiveState(creatorId);
        }
        insertedEvent = eventInsert.rows[0] ? publicStudioLiveEventRow(eventInsert.rows[0]) : null;

        if (type === "live_start" || type === "reset") {
            if (previousState?.session_id && previousState.session_id !== sessionId) {
                await client.query(`UPDATE creator_live_sessions SET status='ended',ended_at=COALESCE(ended_at,NOW()),likes=$3,viewers_peak=GREATEST(viewers_peak,$4),shares=$5,gifts_count=$6,gifts_value=$7,followers_gained=$8,updated_at=NOW() WHERE creator_id=$1 AND id=$2 AND status='live'`,
                    [creatorId,previousState.session_id,Number(previousState.likes||0),Number(previousState.viewers||0),Number(previousState.shares||0),Number(previousState.gifts_count||0),Number(previousState.gifts_value||0),Number(previousState.followers_gained||0)]
                );
            }
            await client.query(`INSERT INTO creator_live_sessions (id,creator_id,provider,status,metadata,started_at,updated_at) VALUES ($1,$2,$3,'live',$4::jsonb,NOW(),NOW()) ON CONFLICT (id) DO UPDATE SET provider=EXCLUDED.provider,status='live',ended_at=NULL,metadata=EXCLUDED.metadata,updated_at=NOW()`,[sessionId,creatorId,provider,JSON.stringify(payload)]);
            await client.query(`INSERT INTO creator_live_state (creator_id,session_id,provider,connected,likes,viewers,shares,gifts_count,gifts_value,followers_gained,started_at,last_event_at,updated_at) VALUES ($1,$2,$3,TRUE,0,0,0,0,0,0,NOW(),NOW(),NOW()) ON CONFLICT (creator_id) DO UPDATE SET session_id=EXCLUDED.session_id,provider=EXCLUDED.provider,connected=TRUE,likes=0,viewers=0,shares=0,gifts_count=0,gifts_value=0,followers_gained=0,started_at=NOW(),last_event_at=NOW(),updated_at=NOW()`,[creatorId,sessionId,provider]);
        } else if (type === "live_end") {
            const current = previousState || {};
            await client.query(`INSERT INTO creator_live_state (creator_id,session_id,provider,connected,updated_at,last_event_at) VALUES ($1,$2,$3,FALSE,NOW(),NOW()) ON CONFLICT (creator_id) DO UPDATE SET connected=FALSE,provider=$3,last_event_at=NOW(),updated_at=NOW()`,[creatorId,sessionId,provider]);
            await client.query(`INSERT INTO creator_live_sessions (id,creator_id,provider,status,likes,viewers_peak,shares,gifts_count,gifts_value,followers_gained,started_at,ended_at,updated_at) VALUES ($1,$2,$3,'ended',$4,$5,$6,$7,$8,$9,COALESCE($10,NOW()),NOW(),NOW()) ON CONFLICT (id) DO UPDATE SET status='ended',likes=EXCLUDED.likes,viewers_peak=GREATEST(creator_live_sessions.viewers_peak,EXCLUDED.viewers_peak),shares=EXCLUDED.shares,gifts_count=EXCLUDED.gifts_count,gifts_value=EXCLUDED.gifts_value,followers_gained=EXCLUDED.followers_gained,ended_at=NOW(),updated_at=NOW()`,[sessionId,creatorId,provider,Number(current.likes||0),Number(current.viewers||0),Number(current.shares||0),Number(current.gifts_count||0),Number(current.gifts_value||0),Number(current.followers_gained||0),current.started_at||null]);
        } else {
            await client.query(`INSERT INTO creator_live_state (creator_id,session_id,provider,connected,started_at,updated_at) VALUES ($1,$2,$3,TRUE,NOW(),NOW()) ON CONFLICT (creator_id) DO NOTHING`,[creatorId,sessionId,provider]);
            await client.query(`INSERT INTO creator_live_sessions (id,creator_id,provider,status,started_at,updated_at) VALUES ($1,$2,$3,'live',NOW(),NOW()) ON CONFLICT (id) DO NOTHING`,[sessionId,creatorId,provider]);
            if (type === "like") await client.query(`UPDATE creator_live_state SET likes=likes+$2,connected=TRUE,provider=$3,bridge_heartbeat_at=CASE WHEN $3='launcher_bridge' THEN NOW() ELSE bridge_heartbeat_at END,last_event_at=NOW(),updated_at=NOW() WHERE creator_id=$1`,[creatorId,amount,provider]);
            if (type === "share") await client.query(`UPDATE creator_live_state SET shares=shares+$2,connected=TRUE,provider=$3,bridge_heartbeat_at=CASE WHEN $3='launcher_bridge' THEN NOW() ELSE bridge_heartbeat_at END,last_event_at=NOW(),updated_at=NOW() WHERE creator_id=$1`,[creatorId,amount,provider]);
            if (type === "gift") await client.query(`UPDATE creator_live_state SET gifts_count=gifts_count+$2,gifts_value=gifts_value+$3,connected=TRUE,provider=$4,bridge_heartbeat_at=CASE WHEN $4='launcher_bridge' THEN NOW() ELSE bridge_heartbeat_at END,last_event_at=NOW(),updated_at=NOW() WHERE creator_id=$1`,[creatorId,amount,value,provider]);
            if (type === "follow") await client.query(`UPDATE creator_live_state SET followers_gained=followers_gained+$2,connected=TRUE,provider=$3,bridge_heartbeat_at=CASE WHEN $3='launcher_bridge' THEN NOW() ELSE bridge_heartbeat_at END,last_event_at=NOW(),updated_at=NOW() WHERE creator_id=$1`,[creatorId,amount,provider]);
            if (type === "viewer_update") await client.query(`UPDATE creator_live_state SET viewers=$2,connected=TRUE,provider=$3,bridge_heartbeat_at=CASE WHEN $3='launcher_bridge' THEN NOW() ELSE bridge_heartbeat_at END,last_event_at=NOW(),updated_at=NOW() WHERE creator_id=$1`,[creatorId,amount,provider]);
            const after = await client.query(`SELECT * FROM creator_live_state WHERE creator_id=$1`,[creatorId]);
            const s = after.rows[0] || {};
            await client.query(`UPDATE creator_live_sessions SET provider=$3,likes=$4,viewers_peak=GREATEST(viewers_peak,$5),shares=$6,gifts_count=$7,gifts_value=$8,followers_gained=$9,updated_at=NOW() WHERE creator_id=$1 AND id=$2`,[creatorId,sessionId,provider,Number(s.likes||0),Number(s.viewers||0),Number(s.shares||0),Number(s.gifts_count||0),Number(s.gifts_value||0),Number(s.followers_gained||0)]);
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally { client.release(); }

    if (insertedEvent && WIDGET_STUDIO_INTERACTION_EVENT_TYPES.has(insertedEvent.event_type)) {
        processStudioInteractionEvent(creatorId, insertedEvent).catch(error=>safeLogError("Widget Studio Interaction Fehler:",error));
    }
    if (insertedEvent && insertedEvent.event_type === "chat") {
        processStreamBotChatEvent(creatorId, insertedEvent).catch(error=>safeLogError("Stream Bot Chat Fehler:",error));
    }
    if (insertedEvent && ["follow","like","gift","share"].includes(insertedEvent.event_type)) {
        await processCreatorGameLiveEvent(creatorId, insertedEvent)
            .catch(error=>safeLogError("Creator Game LIVE Rule Fehler:",error));
    }
    if (type === "live_end") cleanupStudioLiveHistory(creatorId).catch(error=>safeLogError("Widget Studio Cleanup Fehler:",error));
    return getStudioLiveState(creatorId);
}

function studioWidgetHasUnpublishedChanges(row) {
    if (!row?.published_config) return false;
    const draft = sanitizeStudioWidgetConfig(row.draft_config, row.widget_type);
    const published = sanitizeStudioWidgetConfig(row.published_config, row.widget_type);
    return JSON.stringify(draft) !== JSON.stringify(published);
}

function publicStudioWidgetRow(
    row
) {

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        widget_type: row.widget_type,
        name: row.name,
        template_key: row.template_key,
        status: row.status,
        draft_config: sanitizeStudioWidgetConfig(row.draft_config, row.widget_type),
        published_config: row.published_config
            ? sanitizeStudioWidgetConfig(row.published_config, row.widget_type)
            : null,
        public_token: row.public_token,
        source_url: studioWidgetSourceUrl(row.public_token),
        source_urls: studioWidgetOutputUrls(row.public_token),
        output_profiles: Object.values(WIDGET_STUDIO_OUTPUT_PROFILES).map(profile => ({
            key: profile.key,
            label: profile.label,
            width: profile.width,
            height: profile.height
        })),
        version: Number(row.version || 1),
        created_at: row.created_at,
        updated_at: row.updated_at,
        published_at: row.published_at || null,
        has_unpublished_changes: studioWidgetHasUnpublishedChanges(row)
    };

}


async function getStudioWidgetById(
    creatorId,
    widgetId
) {

    if (!validStudioWidgetId(widgetId)) {
        return null;
    }

    const result =
        await pool.query(
            `
            SELECT *
            FROM creator_widgets
            WHERE creator_id = $1
              AND id = $2
            LIMIT 1
            `,
            [creatorId, widgetId]
        );

    return result.rows[0] || null;

}


async function listStudioWidgets(
    creatorId
) {

    const result =
        await pool.query(
            `
            SELECT *
            FROM creator_widgets
            WHERE creator_id = $1
            ORDER BY updated_at DESC, created_at DESC
            `,
            [creatorId]
        );

    return result.rows;

}


async function listStudioAssets(creatorId) {
    const result = await pool.query(`
        SELECT id,creator_id,original_name,label,media_type,mime_type,file_ext,byte_size,sha256,auto_category,category,metadata,public_token,created_at,updated_at
        FROM creator_widget_assets
        WHERE creator_id=$1
        ORDER BY updated_at DESC,created_at DESC
    `,[creatorId]);
    return result.rows;
}

async function getStudioAsset(creatorId,assetId) {
    if (!/^[0-9a-f-]{36}$/i.test(String(assetId||""))) return null;
    const result=await pool.query(`SELECT * FROM creator_widget_assets WHERE creator_id=$1 AND id=$2 LIMIT 1`,[creatorId,assetId]);
    return result.rows[0]||null;
}

async function studioAssetUsageCount(creatorId,publicToken) {
    const marker=`/widget-assets/${String(publicToken||"")}`;
    const result=await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM creator_widgets
        WHERE creator_id=$1
          AND (draft_config::text LIKE $2 OR COALESCE(published_config::text,'') LIKE $2)
    `,[creatorId,`%${marker}%`]);
    return Number(result.rows[0]?.count||0);
}

function replaceStudioAssetUrl(value, oldUrl, newUrl) {
    if (typeof value === "string") return value.includes(oldUrl) ? value.split(oldUrl).join(newUrl) : value;
    if (Array.isArray(value)) return value.map(item=>replaceStudioAssetUrl(item,oldUrl,newUrl));
    if (value && typeof value === "object") {
        const next={};
        for (const [key,item] of Object.entries(value)) next[key]=replaceStudioAssetUrl(item,oldUrl,newUrl);
        return next;
    }
    return value;
}

function studioConfigContainsAssetUrl(value, assetUrl) {
    if (!value || !assetUrl) return false;
    try { return JSON.stringify(value).includes(assetUrl); } catch { return false; }
}

async function getPublicStudioWidget(
    publicToken
) {

    if (!validStudioWidgetToken(publicToken)) {
        return null;
    }

    const result =
        await pool.query(
            `
            SELECT
                w.*,
                a.display_name AS creator_display_name,
                a.status AS creator_status
            FROM creator_widgets w
            INNER JOIN creator_accounts a
                ON a.id = w.creator_id
            WHERE w.public_token = $1
              AND w.status = 'live'
              AND w.published_config IS NOT NULL
              AND a.status = 'active'
            LIMIT 1
            `,
            [publicToken]
        );

    return result.rows[0] || null;

}


// ============================================================
// ACCOUNT MAIL STATUS / E-MAIL VERIFIZIERUNG / RECOVERY
// ============================================================

app.get("/api/account/mail/status", (_req, res) => {
    res.set("Cache-Control", "no-store");
    return res.json({ok:true,...publicAccountMailStatus()});
});

app.post(
    "/api/account/email/verification/request",
    accountEmailActionLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        if (!ACCOUNT_MAIL_CONFIG.enabled) {
            return res.status(503).json({ok:false,code:"account_mail_unavailable",error:"E-Mail-Versand ist auf diesem Server noch nicht aktiviert."});
        }

        const startedAt = Date.now();
        const email = normalizeEmail(req.body?.email);
        const generic = {ok:true,message:"Wenn für diese Adresse eine Bestätigung möglich ist, wurde ein neuer Link angefordert."};
        if (!validEmail(email)) return genericAccountMailResponse(res,generic,startedAt);

        try {
            const account = await findCreatorByEmail(email);
            if (account && !account.email_verified_at && ["active","pending_email"].includes(account.status)) {
                const verification = await issueAccountActionToken(account.id,"verify_email",EMAIL_VERIFICATION_TOKEN_TTL_MS);
                await queueAccountMail(verificationMailMessage(account, verification.token),{creatorId:account.id});
                await recordSecurityEvent(account.id,"email_verification_requested");
            }
            return genericAccountMailResponse(res,generic,startedAt);
        } catch (error) {
            safeLogError("E-Mail-Verifizierung anfordern Fehler:",error);
            return genericAccountMailResponse(res,generic,startedAt);
        }
    }
);

app.post(
    "/api/account/email/verify",
    accountEmailActionLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const token = String(req.body?.token || "").trim();
        if (!validAccountActionToken(token)) {
            return res.status(400).json({ok:false,error:"Der Bestätigungslink ist ungültig oder abgelaufen."});
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const row = await findUsableAccountActionToken("verify_email",token,client);
            if (!row) {
                await client.query("ROLLBACK");
                return res.status(400).json({ok:false,error:"Der Bestätigungslink ist ungültig oder abgelaufen."});
            }
            await markAccountActionTokenUsed(row.id,client);
            await client.query(
                `UPDATE creator_accounts SET email_verified_at=COALESCE(email_verified_at,NOW()),status=CASE WHEN status='pending_email' THEN 'active' ELSE status END,updated_at=NOW() WHERE id=$1`,
                [row.creator_id]
            );
            await client.query(`DELETE FROM creator_account_action_tokens WHERE creator_id=$1 AND purpose='verify_email' AND id<>$2`,[row.creator_id,row.id]);
            await client.query("COMMIT");
            await recordSecurityEvent(row.creator_id,"email_verified");
            return res.json({ok:true,verified:true,message:"E-Mail-Adresse bestätigt. Du kannst dich jetzt anmelden."});
        } catch (error) {
            try { await client.query("ROLLBACK"); } catch {}
            safeLogError("E-Mail-Verifizierung Fehler:",error);
            return res.status(500).json({ok:false,error:"Die E-Mail-Adresse konnte nicht bestätigt werden."});
        } finally {
            client.release();
        }
    }
);

app.post(
    "/api/account/password/forgot",
    accountPasswordResetLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        if (!ACCOUNT_MAIL_CONFIG.enabled) {
            return res.status(503).json({ok:false,code:"account_mail_unavailable",error:"Passwort-Recovery per E-Mail ist auf diesem Server noch nicht aktiviert."});
        }

        const startedAt = Date.now();
        const email = normalizeEmail(req.body?.email);
        const generic = {ok:true,message:"Wenn ein passendes Konto existiert, wurde ein zeitlich begrenzter Recovery-Link angefordert."};
        if (!validEmail(email)) return genericAccountMailResponse(res,generic,startedAt);

        try {
            const account = await findCreatorByEmail(email);
            if (account && ["active","pending_email"].includes(account.status)) {
                const reset = await issueAccountActionToken(account.id,"password_reset",PASSWORD_RESET_TOKEN_TTL_MS);
                await queueAccountMail(passwordResetMailMessage(account, reset.token),{creatorId:account.id});
                await recordSecurityEvent(account.id,"password_reset_requested");
            }
            return genericAccountMailResponse(res,generic,startedAt);
        } catch (error) {
            safeLogError("Passwort-Recovery Anfrage Fehler:",error);
            return genericAccountMailResponse(res,generic,startedAt);
        }
    }
);

app.post(
    "/api/account/password/reset",
    accountPasswordResetLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const token = String(req.body?.token || "").trim();
        const newPassword = String(req.body?.new_password || "");
        if (!validAccountActionToken(token)) {
            return res.status(400).json({ok:false,error:"Der Recovery-Link ist ungültig oder abgelaufen."});
        }
        if (!newPassword || newPassword.length > PASSWORD_MAX_LENGTH) {
            return res.status(400).json({ok:false,error:`Das neue Passwort muss zwischen ${PASSWORD_MIN_LENGTH} und ${PASSWORD_MAX_LENGTH} Zeichen lang sein.`});
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const tokenRow = await findUsableAccountActionToken("password_reset",token,client);
            if (!tokenRow || !["active","pending_email"].includes(String(tokenRow.status || ""))) {
                await client.query("ROLLBACK");
                return res.status(400).json({ok:false,error:"Der Recovery-Link ist ungültig oder abgelaufen."});
            }
            const accountResult = await client.query(
                `SELECT id,email,display_name,password_hash,password_salt,password_kdf_version FROM creator_accounts WHERE id=$1 LIMIT 1 FOR UPDATE`,
                [tokenRow.creator_id]
            );
            const account = accountResult.rows[0];
            if (!account) {
                await client.query("ROLLBACK");
                return res.status(400).json({ok:false,error:"Der Recovery-Link ist ungültig oder abgelaufen."});
            }
            const policyProblem = passwordPolicyError(newPassword,{email:account.email,displayName:account.display_name});
            if (policyProblem) {
                await client.query("ROLLBACK");
                return res.status(400).json({ok:false,error:policyProblem});
            }
            const sameAsCurrent = await verifyPassword(newPassword,account.password_salt,account.password_hash,account.password_kdf_version);
            if (sameAsCurrent) {
                await client.query("ROLLBACK");
                return res.status(400).json({ok:false,error:"Das neue Passwort muss sich vom bisherigen Passwort unterscheiden."});
            }
            const nextPassword = await createPasswordHash(newPassword);
            await client.query(
                `UPDATE creator_accounts SET password_hash=$2,password_salt=$3,password_kdf_version=$4,updated_at=NOW() WHERE id=$1`,
                [account.id,nextPassword.hash,nextPassword.salt,nextPassword.kdfVersion]
            );
            await markAccountActionTokenUsed(tokenRow.id,client);
            await revokeCreatorPendingAuthArtifacts(client,account.id,{keepPasswordResetTokenId:tokenRow.id});
            await client.query(`DELETE FROM creator_account_action_tokens WHERE creator_id=$1 AND purpose='password_reset'`,[account.id]);
            await client.query(`DELETE FROM creator_sessions WHERE creator_id=$1`,[account.id]);
            await client.query("COMMIT");
            clearCreatorAuthCookies(res);
            clearSensitiveBrowserState(res);
            await recordSecurityEvent(account.id,"password_reset_completed");
            if (ACCOUNT_MAIL_CONFIG.enabled) await queueAccountMail(passwordResetCompletedMailMessage(account),{creatorId:account.id});
            return res.json({ok:true,password_reset:true,sessions_revoked:true,pending_auth_revoked:true,message:"Passwort geändert. Alle bisherigen Login-Sitzungen und offenen Login-Challenges wurden beendet."});
        } catch (error) {
            try { await client.query("ROLLBACK"); } catch {}
            safeLogError("Passwort-Recovery Abschluss Fehler:",error);
            return res.status(500).json({ok:false,error:"Das Passwort konnte nicht zurückgesetzt werden."});
        } finally {
            client.release();
        }
    }
);


// ============================================================
// ACCOUNT REGISTRIEREN
// ============================================================

app.get("/api/plans/catalog",async(_req,res)=>{
    res.set("Cache-Control","public, max-age=120");
    const plans=publicPlanCatalog().map(plan=>({...plan,price_status:plan.key==="free"?"active":BILLING_CONFIG.plans?.[plan.key]?.checkout_available?"active":"configuration_required",checkout_available:Boolean(BILLING_CONFIG.plans?.[plan.key]?.checkout_available)}));
    return res.json({ok:true,billing_enabled:BILLING_CONFIG.enabled,checkout_available:BILLING_CONFIG.checkout_available,provider:BILLING_CONFIG.provider,webhook_ready:BILLING_CONFIG.webhook_ready,grace_days:BILLING_CONFIG.grace_days,plans});
});

app.get("/api/creator/access",requireCreatorAccount,async(req,res)=>{res.set("Cache-Control","no-store");try{return res.json({ok:true,...(await creatorAccessProfile(req.creatorAccount))});}catch(error){return res.status(500).json({ok:false,error:"Creator-Zugriff konnte nicht geladen werden."});}});

app.get("/api/creator/billing/status",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{const access=await creatorAccessProfile(req.creatorAccount);return res.json({ok:true,provider:BILLING_CONFIG.provider,billing_enabled:BILLING_CONFIG.enabled,webhook_ready:BILLING_CONFIG.webhook_ready,checkout_available:BILLING_CONFIG.checkout_available,portal_available:BILLING_CONFIG.portal_available,grace_days:BILLING_CONFIG.grace_days,plan:access.plan,effective_plan:access.effective_plan,access_source:access.access_source,beta:access.beta,subscription:access.subscription});}
    catch(error){return res.status(500).json({ok:false,error:"Billing-Status konnte nicht geladen werden."});}
});

app.post("/api/creator/billing/checkout",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    const plan=normalizePlan(req.body?.plan);
    if(!["creator","pro"].includes(plan))return res.status(400).json({ok:false,error:"Für diesen Plan ist kein Checkout erforderlich."});
    const priceId=BILLING_PLAN_PRICE[plan];if(!BILLING_CONFIG.enabled||!priceId)return res.status(503).json({ok:false,error:`${plan.toUpperCase()} Checkout ist noch nicht auf diesem Server konfiguriert.`});
    try{
        const access=await creatorAccessProfile(req.creatorAccount);
        if(access.subscription?.access_active&&access.subscription?.provider==="stripe"&&access.subscription?.configured)return res.status(409).json({ok:false,code:"subscription_exists",error:"Du hast bereits eine verwaltete Subscription. Nutze BILLING VERWALTEN für Upgrade, Downgrade oder Kündigung."});
        let customerId="";const existing=await pool.query(`SELECT provider_customer_id FROM creator_billing_subscriptions WHERE creator_id=$1 LIMIT 1`,[req.creatorAccount.id]);customerId=String(existing.rows[0]?.provider_customer_id||"");
        const client=stripeClient();
        if(!customerId){const customer=await client.customers.create({email:req.creatorAccount.email||undefined,name:req.creatorAccount.display_name||undefined,metadata:{creator_id:req.creatorAccount.id,cfs_source:"creator_suite"}},{idempotencyKey:`cfs-customer-v1-${req.creatorAccount.id}`});customerId=customer.id;await pool.query(`INSERT INTO creator_billing_subscriptions(creator_id,provider,provider_customer_id,plan,status,created_at,updated_at) VALUES($1,'stripe',$2,'free','none',NOW(),NOW()) ON CONFLICT(creator_id) DO UPDATE SET provider='stripe',provider_customer_id=EXCLUDED.provider_customer_id,updated_at=NOW()`,[req.creatorAccount.id,customerId]);}
        const checkoutWindow=Math.floor(Date.now()/(10*60*1000));
        const session=await client.checkout.sessions.create({mode:"subscription",customer:customerId,line_items:[{price:priceId,quantity:1}],success_url:`${APP_BASE_URL}/pages/plans.html?billing=success&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${APP_BASE_URL}/pages/plans.html?billing=cancel`,client_reference_id:req.creatorAccount.id,allow_promotion_codes:true,metadata:{creator_id:req.creatorAccount.id,cfs_plan:plan},subscription_data:{metadata:{creator_id:req.creatorAccount.id,cfs_plan:plan}}},{idempotencyKey:`cfs-checkout-v1-${req.creatorAccount.id}-${plan}-${checkoutWindow}`});
        return res.json({ok:true,provider:"stripe",plan,url:session.url||"",session_id:session.id});
    }catch(error){safeLogError("billing:checkout",error);return res.status(502).json({ok:false,error:"Checkout konnte nicht erstellt werden."});}
});

app.post("/api/creator/billing/portal",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    if(!BILLING_CONFIG.portal_available)return res.status(503).json({ok:false,error:"Billing Portal ist noch nicht konfiguriert."});
    try{
        const row=(await pool.query(`SELECT provider_customer_id FROM creator_billing_subscriptions WHERE creator_id=$1 LIMIT 1`,[req.creatorAccount.id])).rows[0];
        const customerId=String(row?.provider_customer_id||"");if(!customerId)return res.status(409).json({ok:false,error:"Für diesen Account existiert noch kein Billing-Customer."});
        const session=await stripeClient().billingPortal.sessions.create({customer:customerId,return_url:`${APP_BASE_URL}/pages/plans.html?billing=return`});
        return res.json({ok:true,provider:"stripe",url:session.url||""});
    }catch(error){safeLogError("billing:portal",error);return res.status(502).json({ok:false,error:"Billing Portal konnte nicht geöffnet werden."});}
});


app.post(
    "/api/account/register",

    accountRegisterLimiter,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const email =
                normalizeEmail(
                    req.body?.email
                );

            const password =
                String(
                    req.body?.password ||
                    ""
                );

            const displayName =
                normalizeDisplayName(
                    req.body?.display_name
                );


            if (
                !validEmail(
                    email
                )
            ) {

                return res
                    .status(400)
                    .json({

                        ok:
                            false,

                        error:
                            "Bitte gib eine gültige E-Mail-Adresse ein."

                    });

            }


            if (
                password.length <
                PASSWORD_MIN_LENGTH
            ) {

                return res
                    .status(400)
                    .json({

                        ok:
                            false,

                        error:
                            `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`

                    });

            }


            if (
                password.length >
                PASSWORD_MAX_LENGTH
            ) {

                return res
                    .status(400)
                    .json({

                        ok:
                            false,

                        error:
                            `Das Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen lang sein.`

                    });

            }


            if (
                !displayName
            ) {

                return res
                    .status(400)
                    .json({

                        ok:
                            false,

                        error:
                            "Bitte gib einen Creator-Namen ein."

                    });

            }


            const passwordPolicyProblem =
                passwordPolicyError(
                    password,
                    {
                        email,
                        displayName
                    }
                );

            if (
                passwordPolicyProblem
            ) {

                return res
                    .status(400)
                    .json({
                        ok: false,
                        error: passwordPolicyProblem
                    });

            }


            const existing =
                await findCreatorByEmail(
                    email
                );

            if (
                existing
            ) {

                return res
                    .status(409)
                    .json({

                        ok:
                            false,

                        error:
                            "Die Registrierung konnte nicht abgeschlossen werden. Falls bereits ein Konto existiert, melde dich bitte an."

                    });

            }


            const passwordRecord =
                await createPasswordHash(
                    password
                );

            const creatorId =
                createCreatorAccountId();


            const result =
                await pool.query(
                    `
                    INSERT INTO creator_accounts (

                        id,
                        email,
                        password_hash,
                        password_salt,
                        password_kdf_version,
                        display_name,
                        plan,
                        status,
                        email_verified_at,
                        created_at,
                        updated_at

                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        'free',
                        $7,
                        NULL,
                        NOW(),
                        NOW()
                    )

                    RETURNING
                        id,
                        email,
                        display_name,
                        plan,
                        status,
                        email_verified_at,
                        created_at,
                        updated_at
                    `,
                    [
                        creatorId,
                        email,
                        passwordRecord.hash,
                        passwordRecord.salt,
                        passwordRecord.kdfVersion,
                        displayName,
                        ACCOUNT_MAIL_CONFIG.verificationRequired ? "pending_email" : "active"
                    ]
                );


            const account =
                result.rows[0];


            await saveCreatorSettings(
                creatorId,
                defaultCreatorSettings()
            );


            await recordSecurityEvent(
                creatorId,
                "account_registered"
            );

            if (ACCOUNT_MAIL_CONFIG.verificationRequired) {
                const verification = await issueAccountActionToken(creatorId,"verify_email",EMAIL_VERIFICATION_TOKEN_TTL_MS);
                await queueAccountMail(verificationMailMessage(account, verification.token),{creatorId});
                await recordSecurityEvent(creatorId,"email_verification_requested");
            } else {
                await createCreatorSession(
                    res,
                    creatorId,
                    "registration"
                );
            }


            return res
                .status(201)
                .json({

                    ok:
                        true,

                    authenticated:
                        !ACCOUNT_MAIL_CONFIG.verificationRequired,

                    verification_required:
                        ACCOUNT_MAIL_CONFIG.verificationRequired,

                    account:
                        publicCreatorAccount(
                            account
                        ),

                    entitlements:
                        getPlanEntitlements(
                            account.plan
                        ),

                    modules:
                        publicModuleRegistry(
                            account
                        )

                });

        }
        catch (error) {

            safeLogError("Creator Registrierung Fehler:",error);

            if (
                error?.code ===
                "23505"
            ) {

                return res
                    .status(409)
                    .json({

                        ok:
                            false,

                        error:
                            "Die Registrierung konnte nicht abgeschlossen werden. Falls bereits ein Konto existiert, melde dich bitte an."

                    });

            }

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Das Creator-Konto konnte nicht erstellt werden."

                });

        }

    }
);


// ============================================================
// ACCOUNT LOGIN
// ============================================================

app.post(
    "/api/account/login",

    accountLoginIpLimiter,
    accountLoginLimiter,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const email =
                normalizeEmail(
                    req.body?.email
                );

            const password =
                String(
                    req.body?.password ||
                    ""
                );


            if (
                !email ||
                !password ||
                !validEmail(
                    email
                ) ||
                password.length >
                    PASSWORD_MAX_LENGTH
            ) {

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        authenticated:
                            false,

                        error:
                            "E-Mail-Adresse oder Passwort ist nicht korrekt."

                    });

            }


            const account =
                await findCreatorByEmail(
                    email
                );


            if (
                !account
            ) {

                // Dummy-scrypt reduziert Timing-Unterschiede zwischen
                // existierenden und unbekannten E-Mail-Adressen.
                await scryptAsync(
                    password,
                    "cfs_login_dummy_salt_v1"
                );

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        authenticated:
                            false,

                        error:
                            "E-Mail-Adresse oder Passwort ist nicht korrekt."

                    });

            }


            const persistentThrottle = await accountLoginThrottleState(account.id);
            if (persistentThrottle.blocked) {
                // Gleicher teurer Dummy-Pfad wie bei unbekannten Accounts;
                // Antwort bleibt absichtlich generisch und verrät keinen Account-Status.
                await scryptAsync(password,"cfs_login_dummy_salt_v1");
                return res.status(401).json({
                    ok:false,
                    authenticated:false,
                    error:"E-Mail-Adresse oder Passwort ist nicht korrekt."
                });
            }

            const passwordOk =
                await verifyPassword(
                    password,
                    account.password_salt,
                    account.password_hash,
                    account.password_kdf_version
                );


            if (
                !passwordOk
            ) {

                const failureState = await recordAccountPasswordFailure(account.id);
                if (failureState.blocked) await notifyAccountLoginThrottle(account.id);

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        authenticated:
                            false,

                        error:
                            "E-Mail-Adresse oder Passwort ist nicht korrekt."

                    });

            }

            await clearAccountPasswordFailures(account.id);

            if (account.status === "pending_email") {
                return res.status(403).json({
                    ok:false,
                    authenticated:false,
                    code:"email_verification_required",
                    verification_required:true,
                    error:"Bitte bestätige zuerst deine E-Mail-Adresse."
                });
            }

            if (account.status !== "active") {
                return res.status(403).json({
                    ok:false,
                    authenticated:false,
                    error:"Dieses Creator-Konto ist derzeit nicht aktiv."
                });
            }


            if (
                Number(account.password_kdf_version || 1) <
                PASSWORD_KDF_VERSION
            ) {

                const upgraded =
                    await createPasswordHash(
                        password
                    );

                await pool.query(
                    `
                    UPDATE creator_accounts
                    SET password_hash=$2,password_salt=$3,password_kdf_version=$4,updated_at=NOW()
                    WHERE id=$1
                    `,
                    [
                        account.id,
                        upgraded.hash,
                        upgraded.salt,
                        upgraded.kdfVersion
                    ]
                );

            }


            const authMethods = await creatorAuthMethods(account.id);
            if (authMethods.totp || authMethods.passkey) {
                const challengeExpiresAt = await issueMfaChallenge(res, account.id);
                return res.status(202).json({
                    ok:true,
                    authenticated:false,
                    mfa_required:true,
                    mfa_methods:{
                        totp:authMethods.totp,
                        passkey:authMethods.passkey,
                        recovery:authMethods.recovery_codes_remaining > 0
                    },
                    challenge_expires_at:challengeExpiresAt
                });
            }

            await createCreatorSession(
                res,
                account.id,
                "password"
            );

            await queueSuccessfulLoginAlert(account.id,"password");


            await recordSecurityEvent(
                account.id,
                "login_success"
            );


            const access=await creatorAccessProfile(account);

            return res.json({

                ok:
                    true,

                authenticated:
                    true,

                account:
                    publicCreatorAccount(
                        account
                    ),

                entitlements:
                    access.entitlements,

                access:
                    access,

                modules:
                    publicModuleRegistry(account,access.entitlements),

                admin:
                    await isCreatorSuiteAdmin(account)

            });

        }
        catch (error) {

            safeLogError("Creator Login Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Die Anmeldung konnte nicht durchgeführt werden."

                });

        }

    }
);


// ============================================================
// ACCOUNT MFA LOGIN
// ============================================================

app.post(
    "/api/account/mfa/login",
    accountMfaVerifyLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const cookies = parseCookies(req);
        const challengeToken = String(cookies[MFA_CHALLENGE_COOKIE] || "");
        const code = String(req.body?.code || "").trim();
        const recoveryCode = String(req.body?.recovery_code || "").trim();
        if (!challengeToken || (!code && !recoveryCode)) {
            clearMfaChallengeCookie(res);
            return res.status(401).json({ok:false,authenticated:false,error:"Die MFA-Anmeldung ist abgelaufen. Bitte melde dich erneut mit E-Mail und Passwort an."});
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const challenge = (await client.query(
                `SELECT token_hash,creator_id,expires_at,attempts FROM creator_mfa_challenges WHERE token_hash=$1 FOR UPDATE`,
                [mfaChallengeHash(challengeToken)]
            )).rows[0];
            if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) {
                if (challenge) await client.query(`DELETE FROM creator_mfa_challenges WHERE token_hash=$1`, [challenge.token_hash]);
                await client.query("COMMIT");
                clearMfaChallengeCookie(res);
                return res.status(401).json({ok:false,authenticated:false,error:"Die MFA-Anmeldung ist abgelaufen. Bitte melde dich erneut an."});
            }
            if (Number(challenge.attempts || 0) >= MFA_VERIFY_RATE_MAX) {
                await client.query(`DELETE FROM creator_mfa_challenges WHERE token_hash=$1`, [challenge.token_hash]);
                await client.query("COMMIT");
                clearMfaChallengeCookie(res);
                return res.status(429).json({ok:false,authenticated:false,error:"Zu viele MFA-Versuche. Bitte starte die Anmeldung neu."});
            }

            await client.query(`UPDATE creator_mfa_challenges SET attempts=attempts+1 WHERE token_hash=$1`, [challenge.token_hash]);
            let verified = false;
            let recoveryUsed = false;
            if (code) verified = await consumeTotpForCreator(client, challenge.creator_id, code);
            if (!verified && recoveryCode) {
                recoveryUsed = await consumeRecoveryCode(client, challenge.creator_id, recoveryCode);
                verified = recoveryUsed;
            }
            if (!verified) {
                await client.query("COMMIT");
                await recordSuspiciousMfaFailure(challenge.creator_id,recoveryCode ? "recovery_code" : "totp");
                return res.status(401).json({ok:false,authenticated:false,error:"Der Bestätigungscode ist nicht korrekt oder wurde bereits verwendet."});
            }

            await client.query(`DELETE FROM creator_mfa_challenges WHERE creator_id=$1`, [challenge.creator_id]);
            await client.query("COMMIT");
            clearMfaChallengeCookie(res);
            const authMethod = recoveryUsed ? "recovery_code" : "totp";
            await createCreatorSession(res, challenge.creator_id, authMethod);
            await recordSecurityEvent(challenge.creator_id, recoveryUsed ? "mfa_recovery_code_used" : "login_success_mfa");
            await queueSuccessfulLoginAlert(challenge.creator_id,authMethod);
            const account = await findCreatorById(challenge.creator_id);
            if (recoveryUsed && ACCOUNT_MAIL_CONFIG.enabled && account) await queueAccountMail(mfaRecoveryUsedMailMessage(account),{creatorId:account.id});
            const access = await creatorAccessProfile(account);
            return res.json({
                ok:true,
                authenticated:true,
                recovery_code_used:recoveryUsed,
                account:publicCreatorAccount(account),
                entitlements:access.entitlements,
                access,
                modules:publicModuleRegistry(account, access.entitlements),
                admin:await isCreatorSuiteAdmin(account)
            });
        } catch (error) {
            try { await client.query("ROLLBACK"); } catch {}
            safeLogError("MFA Login Fehler:",error);
            return res.status(500).json({ok:false,authenticated:false,error:"Die Zwei-Faktor-Anmeldung konnte nicht abgeschlossen werden."});
        } finally {
            client.release();
        }
    }
);



// ============================================================
// PASSKEY / WEBAUTHN
// ============================================================

app.get(
    "/api/account/passkeys",
    requireCreatorAccount,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const rows = await creatorPasskeys(req.creatorAccount.id);
            const methods = await creatorAuthMethods(req.creatorAccount.id);
            return res.json({
                ok:true,
                available:true,
                rp_id:PASSKEY_RP_ID,
                recovery_codes_remaining:methods.recovery_codes_remaining,
                totp_enabled:methods.totp,
                passkeys:rows.map(publicPasskeyRow)
            });
        } catch (error) {
            safeLogError("Passkey Status Fehler:",error);
            return res.status(500).json({ok:false,error:"Passkeys konnten nicht geladen werden."});
        }
    }
);

app.post(
    "/api/account/passkeys/register/options",
    requireCreatorAccount,
    accountPasskeyLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const password=String(req.body?.password||"");
            if (!(await verifyCreatorPasswordForLifecycle(req.creatorAccount.id,password))) {
                return res.status(401).json({ok:false,error:"Das aktuelle Passwort ist nicht korrekt."});
            }
            const existing=await creatorPasskeys(req.creatorAccount.id);
            if (existing.length >= PASSKEY_MAX_PER_ACCOUNT) {
                return res.status(409).json({ok:false,error:`Maximal ${PASSKEY_MAX_PER_ACCOUNT} Passkeys pro Konto.`});
            }
            const {generateRegistrationOptions}=await simpleWebAuthn();
            const options=await generateRegistrationOptions({
                rpName:"cfs_zockt",
                rpID:PASSKEY_RP_ID,
                userID:webauthnUserID(req.creatorAccount.id),
                userName:req.creatorAccount.email,
                userDisplayName:req.creatorAccount.display_name || req.creatorAccount.email,
                attestationType:"none",
                timeout:60000,
                excludeCredentials:existing.map(row=>({id:row.credential_id,transports:row.transports||[]})),
                authenticatorSelection:{residentKey:"preferred",userVerification:"required"},
                supportedAlgorithmIDs:[-7,-257]
            });
            const challenge=await createPasskeyChallenge({
                creatorId:req.creatorAccount.id,
                purpose:"register",
                challenge:options.challenge,
                sessionHash:currentCreatorSessionHash(req)
            });
            return res.json({ok:true,challenge_id:challenge.id,expires_at:challenge.expiresAt,options});
        } catch (error) {
            safeLogError("Passkey Registrierung Start Fehler:",error);
            return res.status(500).json({ok:false,error:"Passkey-Einrichtung konnte nicht gestartet werden."});
        }
    }
);

app.post(
    "/api/account/passkeys/register/verify",
    requireCreatorAccount,
    accountPasskeyLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        const challengeId=String(req.body?.challenge_id||"");
        const response=req.body?.response;
        const label=normalizePasskeyName(req.body?.label);
        if (!response || typeof response !== "object") return res.status(400).json({ok:false,error:"Passkey-Antwort fehlt."});
        try {
            const challenge=await takePasskeyChallenge(pool,{
                challengeId,
                creatorId:req.creatorAccount.id,
                purpose:"register",
                sessionHash:currentCreatorSessionHash(req)
            });
            if (!challenge) return res.status(401).json({ok:false,error:"Die Passkey-Challenge ist abgelaufen oder wurde bereits verwendet."});

            const {verifyRegistrationResponse}=await simpleWebAuthn();
            const verification=await verifyRegistrationResponse({
                response,
                expectedChallenge:challenge.challenge,
                expectedOrigin:PASSKEY_EXPECTED_ORIGINS,
                expectedRPID:PASSKEY_RP_ID,
                requireUserVerification:true,
                supportedAlgorithmIDs:[-7,-257]
            });
            if (!verification.verified || !verification.registrationInfo) {
                return res.status(401).json({ok:false,error:"Der Passkey konnte nicht bestätigt werden."});
            }
            const {credential,credentialDeviceType,credentialBackedUp}=verification.registrationInfo;
            const client=await pool.connect();
            let recoveryCodes=[];
            try {
                await client.query("BEGIN");
                const count=Number((await client.query(`SELECT COUNT(*)::int AS count FROM creator_webauthn_credentials WHERE creator_id=$1`,[req.creatorAccount.id])).rows[0]?.count||0);
                if (count >= PASSKEY_MAX_PER_ACCOUNT) {
                    await client.query("ROLLBACK");
                    return res.status(409).json({ok:false,error:`Maximal ${PASSKEY_MAX_PER_ACCOUNT} Passkeys pro Konto.`});
                }
                await client.query(
                    `INSERT INTO creator_webauthn_credentials(credential_id,creator_id,public_key,counter,transports,device_type,backed_up,label,created_at)
                     VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
                    [credential.id,req.creatorAccount.id,Buffer.from(credential.publicKey),Number(credential.counter||0),credential.transports||[],credentialDeviceType||null,Boolean(credentialBackedUp),label]
                );
                const methods=await creatorAuthMethods(req.creatorAccount.id);
                if (!methods.totp && methods.recovery_codes_remaining===0) recoveryCodes=await replaceRecoveryCodes(client,req.creatorAccount.id);
                await client.query(`DELETE FROM creator_sessions WHERE creator_id=$1 AND token_hash<>$2`,[req.creatorAccount.id,currentCreatorSessionHash(req)]);
                await client.query("COMMIT");
            } catch (error) {
                try{await client.query("ROLLBACK");}catch{}
                if (String(error?.code)==="23505") return res.status(409).json({ok:false,error:"Dieser Passkey ist bereits registriert."});
                throw error;
            } finally { client.release(); }
            await recordSecurityEvent(req.creatorAccount.id,"passkey_added");
            clearAccountElevationCookies(res);
            if (ACCOUNT_MAIL_CONFIG.enabled) await queueAccountMail(passkeySecurityMailMessage(req.creatorAccount,"added",label),{creatorId:req.creatorAccount.id});
            return res.json({ok:true,verified:true,recovery_codes:recoveryCodes,message:"Passkey hinzugefügt. Andere aktive Sitzungen wurden beendet."});
        } catch (error) {
            safeLogError("Passkey Registrierung Verify Fehler:",error);
            return res.status(400).json({ok:false,error:"Der Passkey konnte nicht verifiziert werden."});
        }
    }
);

app.delete(
    "/api/account/passkeys/:passkeyRef",
    requireCreatorAccount,
    requireCreatorAccountElevation,
    accountPasskeyLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        const password=String(req.body?.password||"");
        if (!(await verifyCreatorPasswordForLifecycle(req.creatorAccount.id,password))) {
            return res.status(401).json({ok:false,error:"Das aktuelle Passwort ist nicht korrekt."});
        }
        try {
            const rows=await creatorPasskeys(req.creatorAccount.id);
            const target=rows.find(row=>passkeyReference(row.credential_id)===String(req.params?.passkeyRef||""));
            if (!target) return res.status(404).json({ok:false,error:"Passkey nicht gefunden."});
            const client=await pool.connect();
            try {
                await client.query("BEGIN");
                await client.query(`DELETE FROM creator_webauthn_credentials WHERE creator_id=$1 AND credential_id=$2`,[req.creatorAccount.id,target.credential_id]);
                const remaining=Number((await client.query(`SELECT COUNT(*)::int AS count FROM creator_webauthn_credentials WHERE creator_id=$1`,[req.creatorAccount.id])).rows[0]?.count||0);
                const totp=await client.query(`SELECT 1 FROM creator_mfa_totp WHERE creator_id=$1 AND enabled_at IS NOT NULL LIMIT 1`,[req.creatorAccount.id]);
                if (remaining===0 && totp.rowCount===0) await client.query(`DELETE FROM creator_mfa_recovery_codes WHERE creator_id=$1`,[req.creatorAccount.id]);
                await client.query(`DELETE FROM creator_sessions WHERE creator_id=$1 AND token_hash<>$2`,[req.creatorAccount.id,currentCreatorSessionHash(req)]);
                await client.query("COMMIT");
            } catch (error) { try{await client.query("ROLLBACK");}catch{} throw error; }
            finally { client.release(); }
            await recordSecurityEvent(req.creatorAccount.id,"passkey_removed");
            clearAccountElevationCookies(res);
            if (ACCOUNT_MAIL_CONFIG.enabled) await queueAccountMail(passkeySecurityMailMessage(req.creatorAccount,"removed",target.label),{creatorId:req.creatorAccount.id});
            return res.json({ok:true,message:"Passkey entfernt. Andere aktive Sitzungen wurden beendet."});
        } catch (error) {
            safeLogError("Passkey Entfernen Fehler:",error);
            return res.status(500).json({ok:false,error:"Passkey konnte nicht entfernt werden."});
        }
    }
);

app.post(
    "/api/account/mfa/passkey/options",
    accountMfaVerifyLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const cookies=parseCookies(req);
            const challengeToken=String(cookies[MFA_CHALLENGE_COOKIE]||"");
            if (!challengeToken) return res.status(401).json({ok:false,error:"Die Anmeldung ist abgelaufen. Bitte starte sie neu."});
            const mfaHash=mfaChallengeHash(challengeToken);
            const challengeRow=(await pool.query(
                `SELECT creator_id,expires_at FROM creator_mfa_challenges WHERE token_hash=$1 AND expires_at>NOW() LIMIT 1`,[mfaHash]
            )).rows[0];
            if (!challengeRow) { clearMfaChallengeCookie(res); return res.status(401).json({ok:false,error:"Die Anmeldung ist abgelaufen. Bitte starte sie neu."}); }
            const passkeys=await creatorPasskeys(challengeRow.creator_id);
            if (!passkeys.length) return res.status(409).json({ok:false,error:"Für dieses Konto ist kein Passkey registriert."});
            const {generateAuthenticationOptions}=await simpleWebAuthn();
            const options=await generateAuthenticationOptions({
                rpID:PASSKEY_RP_ID,
                timeout:60000,
                userVerification:"required",
                allowCredentials:passkeys.map(row=>({id:row.credential_id,transports:row.transports||[]}))
            });
            const challenge=await createPasskeyChallenge({creatorId:challengeRow.creator_id,purpose:"authenticate",challenge:options.challenge,mfaChallengeHashValue:mfaHash});
            return res.json({ok:true,challenge_id:challenge.id,expires_at:challenge.expiresAt,options});
        } catch (error) {
            safeLogError("Passkey Login Options Fehler:",error);
            return res.status(500).json({ok:false,error:"Passkey-Anmeldung konnte nicht gestartet werden."});
        }
    }
);

app.post(
    "/api/account/mfa/passkey/verify",
    accountMfaVerifyLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        const cookies=parseCookies(req);
        const challengeToken=String(cookies[MFA_CHALLENGE_COOKIE]||"");
        const response=req.body?.response;
        const challengeId=String(req.body?.challenge_id||"");
        if (!challengeToken || !response || typeof response!=="object") {
            clearMfaChallengeCookie(res);
            return res.status(401).json({ok:false,authenticated:false,error:"Die Passkey-Anmeldung ist abgelaufen."});
        }
        let alertCreatorId = null;
        try {
            const mfaHash=mfaChallengeHash(challengeToken);
            const mfaRow=(await pool.query(`SELECT creator_id,expires_at FROM creator_mfa_challenges WHERE token_hash=$1 AND expires_at>NOW() LIMIT 1`,[mfaHash])).rows[0];
            alertCreatorId = mfaRow?.creator_id || null;
            if (!mfaRow) { clearMfaChallengeCookie(res); return res.status(401).json({ok:false,authenticated:false,error:"Die Anmeldung ist abgelaufen."}); }
            const challenge=await takePasskeyChallenge(pool,{challengeId,creatorId:mfaRow.creator_id,purpose:"authenticate",mfaChallengeHashValue:mfaHash});
            if (!challenge) return res.status(401).json({ok:false,authenticated:false,error:"Die Passkey-Challenge ist abgelaufen oder wurde bereits verwendet."});
            const credentialId=String(response.id||"");
            const passkey=(await pool.query(
                `SELECT credential_id,public_key,counter,transports,label FROM creator_webauthn_credentials WHERE creator_id=$1 AND credential_id=$2 LIMIT 1`,
                [mfaRow.creator_id,credentialId]
            )).rows[0];
            if (!passkey) {
                await recordSuspiciousMfaFailure(mfaRow.creator_id,"passkey");
                return res.status(401).json({ok:false,authenticated:false,error:"Passkey konnte nicht bestätigt werden."});
            }
            const {verifyAuthenticationResponse}=await simpleWebAuthn();
            const verification=await verifyAuthenticationResponse({
                response,
                expectedChallenge:challenge.challenge,
                expectedOrigin:PASSKEY_EXPECTED_ORIGINS,
                expectedRPID:PASSKEY_RP_ID,
                requireUserVerification:true,
                credential:{id:passkey.credential_id,publicKey:new Uint8Array(passkey.public_key),counter:Number(passkey.counter||0),transports:passkey.transports||[]}
            });
            if (!verification.verified) {
                await recordSuspiciousMfaFailure(mfaRow.creator_id,"passkey");
                return res.status(401).json({ok:false,authenticated:false,error:"Passkey konnte nicht bestätigt werden."});
            }
            await pool.query(`UPDATE creator_webauthn_credentials SET counter=$3,last_used_at=NOW() WHERE creator_id=$1 AND credential_id=$2`,[mfaRow.creator_id,credentialId,Number(verification.authenticationInfo?.newCounter||0)]);
            await pool.query(`DELETE FROM creator_mfa_challenges WHERE creator_id=$1`,[mfaRow.creator_id]);
            clearMfaChallengeCookie(res);
            await createCreatorSession(res,mfaRow.creator_id,"passkey");
            await recordSecurityEvent(mfaRow.creator_id,"login_success_passkey");
            await queueSuccessfulLoginAlert(mfaRow.creator_id,"passkey");
            const account=await findCreatorById(mfaRow.creator_id);
            const access=await creatorAccessProfile(account);
            return res.json({ok:true,authenticated:true,account:publicCreatorAccount(account),entitlements:access.entitlements,access,modules:publicModuleRegistry(account,access.entitlements),admin:await isCreatorSuiteAdmin(account)});
        } catch (error) {
            safeLogError("Passkey Login Verify Fehler:",error);
            if (alertCreatorId) await recordSuspiciousMfaFailure(alertCreatorId,"passkey");
            return res.status(401).json({ok:false,authenticated:false,error:"Passkey konnte nicht bestätigt werden."});
        }
    }
);

// ============================================================
// ACCOUNT MFA VERWALTUNG
// ============================================================

app.get(
    "/api/account/mfa",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try { return res.json({ok:true, ...(await mfaStatusForCreator(req.creatorAccount.id))}); }
        catch (error) { safeLogError("MFA Status Fehler:",error); return res.status(500).json({ok:false,error:"MFA-Status konnte nicht geladen werden."}); }
    }
);

app.post(
    "/api/account/mfa/setup",
    requireCreatorAccount,
    accountMfaVerifyLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const password = String(req.body?.password || "");
        if (!password || password.length > PASSWORD_MAX_LENGTH) return res.status(400).json({ok:false,error:"Bitte bestätige die Einrichtung mit deinem aktuellen Passwort."});
        try {
            if (!(await verifyCreatorPasswordForLifecycle(req.creatorAccount.id, password))) return res.status(401).json({ok:false,error:"Das aktuelle Passwort ist nicht korrekt."});
            if (await creatorMfaEnabled(req.creatorAccount.id)) return res.status(409).json({ok:false,error:"Zwei-Faktor-Schutz ist bereits aktiv."});
            const secret = createTotpSecret(20);
            await pool.query(
                `INSERT INTO creator_mfa_totp(creator_id,secret_ciphertext,enabled_at,last_used_step,created_at,updated_at) VALUES($1,$2,NULL,-1,NOW(),NOW())\n                 ON CONFLICT(creator_id) DO UPDATE SET secret_ciphertext=EXCLUDED.secret_ciphertext,enabled_at=NULL,last_used_step=-1,updated_at=NOW()`,
                [req.creatorAccount.id, encryptSecret(secret)]
            );
            return res.json({ok:true,secret,otpauth_uri:otpauthUri({secret,email:req.creatorAccount.email,issuer:"cfs_zockt"}),message:"Secret nur jetzt in deiner Authenticator-App hinterlegen und anschließend mit einem Code bestätigen."});
        } catch (error) { safeLogError("MFA Setup Fehler:",error); return res.status(500).json({ok:false,error:"MFA-Einrichtung konnte nicht gestartet werden."}); }
    }
);

app.post(
    "/api/account/mfa/enable",
    requireCreatorAccount,
    accountMfaVerifyLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const code = String(req.body?.code || "").trim();
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const row = (await client.query(`SELECT secret_ciphertext,enabled_at FROM creator_mfa_totp WHERE creator_id=$1 FOR UPDATE`, [req.creatorAccount.id])).rows[0];
            if (!row || row.enabled_at) { await client.query("ROLLBACK"); return res.status(409).json({ok:false,error:row?.enabled_at?"Zwei-Faktor-Schutz ist bereits aktiv.":"Starte zuerst die MFA-Einrichtung."}); }
            const secret = decryptSecret(row.secret_ciphertext);
            const verified = verifyTotp(secret, code, {window:1,lastUsedStep:-1});
            if (!verified.ok) { await client.query("ROLLBACK"); return res.status(401).json({ok:false,error:"Der Authenticator-Code ist nicht korrekt."}); }
            await client.query(`UPDATE creator_mfa_totp SET enabled_at=NOW(),last_used_step=$2,updated_at=NOW() WHERE creator_id=$1`, [req.creatorAccount.id, verified.step]);
            const recoveryCodes = await replaceRecoveryCodes(client, req.creatorAccount.id);
            await client.query(`DELETE FROM creator_sessions WHERE creator_id=$1 AND token_hash<>$2`, [req.creatorAccount.id,currentCreatorSessionHash(req)]);
            await client.query("COMMIT");
            await recordSecurityEvent(req.creatorAccount.id,"mfa_enabled");
            clearAccountElevationCookies(res);
            if (ACCOUNT_MAIL_CONFIG.enabled) await queueAccountMail(mfaSecurityMailMessage(req.creatorAccount,"enabled"),{creatorId:req.creatorAccount.id});
            return res.json({ok:true,enabled:true,recovery_codes:recoveryCodes,message:"Zwei-Faktor-Schutz ist aktiv. Speichere die Recovery-Codes jetzt an einem sicheren Ort."});
        } catch (error) { try{await client.query("ROLLBACK");}catch{} safeLogError("MFA Aktivierung Fehler:",error); return res.status(500).json({ok:false,error:"MFA konnte nicht aktiviert werden."}); }
        finally { client.release(); }
    }
);

app.post(
    "/api/account/mfa/recovery-codes",
    requireCreatorAccount,
    accountMfaVerifyLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const password=String(req.body?.password||""); const code=String(req.body?.code||"").trim();
        if (!(await verifyCreatorPasswordForLifecycle(req.creatorAccount.id,password))) return res.status(401).json({ok:false,error:"Das aktuelle Passwort ist nicht korrekt."});
        const client=await pool.connect();
        try {
            await client.query("BEGIN");
            if (!(await consumeTotpForCreator(client,req.creatorAccount.id,code))) { await client.query("ROLLBACK"); return res.status(401).json({ok:false,error:"Der Authenticator-Code ist nicht korrekt oder wurde bereits verwendet."}); }
            const recoveryCodes=await replaceRecoveryCodes(client,req.creatorAccount.id);
            await client.query("COMMIT");
            await recordSecurityEvent(req.creatorAccount.id,"mfa_recovery_codes_regenerated");
            clearAccountElevationCookies(res);
            return res.json({ok:true,recovery_codes:recoveryCodes,message:"Neue Recovery-Codes wurden erstellt. Alle bisherigen Codes sind ungültig."});
        } catch(error){try{await client.query("ROLLBACK");}catch{} safeLogError("MFA Recovery Codes Fehler:",error);return res.status(500).json({ok:false,error:"Recovery-Codes konnten nicht erneuert werden."});} finally{client.release();}
    }
);

app.post(
    "/api/account/mfa/disable",
    requireCreatorAccount,
    accountMfaVerifyLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const password=String(req.body?.password||""); const code=String(req.body?.code||"").trim(); const recoveryCode=String(req.body?.recovery_code||"").trim();
        if (!(await verifyCreatorPasswordForLifecycle(req.creatorAccount.id,password))) return res.status(401).json({ok:false,error:"Das aktuelle Passwort ist nicht korrekt."});
        const client=await pool.connect();
        try{
            await client.query("BEGIN");
            let verified=false;
            if(code) verified=await consumeTotpForCreator(client,req.creatorAccount.id,code);
            if(!verified&&recoveryCode) verified=await consumeRecoveryCode(client,req.creatorAccount.id,recoveryCode);
            if(!verified){await client.query("ROLLBACK");return res.status(401).json({ok:false,error:"Zur Deaktivierung ist ein gültiger Authenticator- oder Recovery-Code erforderlich."});}
            await client.query(`DELETE FROM creator_mfa_totp WHERE creator_id=$1`,[req.creatorAccount.id]);
            const passkeyCount=Number((await client.query(`SELECT COUNT(*)::int AS count FROM creator_webauthn_credentials WHERE creator_id=$1`,[req.creatorAccount.id])).rows[0]?.count||0);
            if(passkeyCount===0) await client.query(`DELETE FROM creator_mfa_recovery_codes WHERE creator_id=$1`,[req.creatorAccount.id]);
            await client.query(`DELETE FROM creator_sessions WHERE creator_id=$1 AND token_hash<>$2`,[req.creatorAccount.id,currentCreatorSessionHash(req)]);
            await client.query("COMMIT");
            await recordSecurityEvent(req.creatorAccount.id,"mfa_disabled");
            clearAccountElevationCookies(res);
            if(ACCOUNT_MAIL_CONFIG.enabled) await queueAccountMail(mfaSecurityMailMessage(req.creatorAccount,"disabled"),{creatorId:req.creatorAccount.id});
            return res.json({ok:true,enabled:false,passkeys_remaining:passkeyCount,message:passkeyCount>0?"Authenticator-App deaktiviert. Passkey-Schutz bleibt aktiv; andere aktive Sitzungen wurden beendet.":"Zwei-Faktor-Schutz wurde deaktiviert. Andere aktive Sitzungen wurden beendet."});
        }catch(error){try{await client.query("ROLLBACK");}catch{}safeLogError("MFA Deaktivierung Fehler:",error);return res.status(500).json({ok:false,error:"MFA konnte nicht deaktiviert werden."});}finally{client.release();}
    }
);


// ============================================================
// ACCOUNT LOGOUT
// ============================================================

app.post(
    "/api/account/logout",
    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            await destroyCreatorSession(
                req,
                res
            );
            clearSensitiveBrowserState(res);


            return res.json({

                ok:
                    true,

                authenticated:
                    false

            });

        }
        catch (error) {

            safeLogError("Creator Logout Fehler:",error);

            clearCreatorAuthCookies(res);
            clearSensitiveBrowserState(res);


            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Die Abmeldung konnte nicht vollständig durchgeführt werden."

                });

        }

    }
);


// ============================================================
// ACCOUNT AUF ANDEREN GERÄTEN ABMELDEN
//
// Die aktuelle Session bleibt bestehen. Das ist für den Nutzer
// sicherer und praktischer als ein Logout-All, wenn nur unbekannte
// weitere Sitzungen entfernt werden sollen.
// ============================================================

app.post(
    "/api/account/logout-others",

    requireCreatorAccount,
    requireCreatorAccountElevation,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {
            const currentHash = currentCreatorSessionHash(req);
            if (!currentHash) {
                return res.status(401).json({
                    ok:false,
                    authenticated:false,
                    error:"Die aktuelle Sitzung konnte nicht bestätigt werden."
                });
            }

            const result = await pool.query(
                `
                DELETE FROM creator_sessions
                WHERE creator_id = $1
                AND token_hash <> $2
                `,
                [
                    req.creatorAccount.id,
                    currentHash
                ]
            );

            await recordSecurityEvent(
                req.creatorAccount.id,
                "logout_others"
            );

            return res.json({
                ok:true,
                authenticated:true,
                revoked_sessions:Number(result.rowCount || 0),
                message:"Andere aktive Sitzungen wurden beendet."
            });
        }
        catch (error) {
            safeLogError("Creator Logout-Others Fehler:",error);

            return res.status(500).json({
                ok:false,
                error:"Andere Sitzungen konnten nicht vollständig beendet werden."
            });
        }
    }
);


// ============================================================
// ACCOUNT AUF ALLEN GERÄTEN ABMELDEN
// ============================================================

app.post(
    "/api/account/logout-all",

    requireCreatorAccount,
    requireCreatorAccountElevation,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            await recordSecurityEvent(
                req.creatorAccount.id,
                "logout_all"
            );


            await pool.query(
                `
                DELETE FROM creator_sessions
                WHERE creator_id = $1
                `,
                [
                    req.creatorAccount.id
                ]
            );

            clearCreatorAuthCookies(res);
            clearSensitiveBrowserState(res);

            return res.json({

                ok:
                    true,

                authenticated:
                    false,

                message:
                    "Du wurdest auf allen Geräten abgemeldet."

            });

        }
        catch (error) {

            safeLogError("Creator Logout-All Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Die Sitzungen konnten nicht vollständig beendet werden."

                });

        }

    }
);


// ============================================================
// ACCOUNT ME
// ============================================================

app.get(
    "/api/account/me",
    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const account =
                await getCreatorFromRequest(
                    req
                );


            if (
                !account
            ) {

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        authenticated:
                            false,

                        account:
                            null

                    });

            }


            ensureCreatorCsrfCookie(
                req,
                res
            );

            const access=await creatorAccessProfile(account);

            return res.json({

                ok:
                    true,

                authenticated:
                    true,

                account:
                    publicCreatorAccount(
                        account
                    ),

                entitlements:
                    access.entitlements,

                access:
                    access,

                modules:
                    publicModuleRegistry(account,access.entitlements),

                admin:
                    await isCreatorSuiteAdmin(account)

            });

        }
        catch (error) {

            safeLogError("Creator Account Me Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    authenticated:
                        false,

                    error:
                        "Das Creator-Konto konnte nicht geladen werden."

                });

        }

    }
);


// ============================================================
// ACCOUNT SICHERHEITSAKTIVITÄT
// ============================================================

app.get(
    "/api/account/security-events",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        event_type,
                        created_at

                    FROM creator_security_events

                    WHERE creator_id = $1

                    ORDER BY created_at DESC

                    LIMIT 20
                    `,
                    [
                        req.creatorAccount.id
                    ]
                );


            const summaryResult = await pool.query(
                `SELECT
                    MAX(created_at) FILTER (WHERE event_type IN ('login_success','login_success_mfa','login_success_passkey')) AS last_login_at,
                    COUNT(*) FILTER (WHERE event_type='mfa_after_password_failed' AND created_at>=NOW()-INTERVAL '30 days')::int AS suspicious_mfa_failures_30d
                 FROM creator_security_events WHERE creator_id=$1`,
                [req.creatorAccount.id]
            );

            return res.json({

                ok:
                    true,

                retention_days:
                    SECURITY_EVENT_RETENTION_DAYS,

                summary:{
                    last_login_at:summaryResult.rows[0]?.last_login_at || null,
                    suspicious_mfa_failures_30d:Number(summaryResult.rows[0]?.suspicious_mfa_failures_30d || 0)
                },

                events:
                    result.rows

            });

        }
        catch (error) {

            safeLogError("Security Events Laden Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Die Sicherheitsaktivität konnte nicht geladen werden."

                });

        }

    }
);


// ============================================================
// ACCOUNT SESSIONS
// ============================================================

app.get(
    "/api/account/sessions",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const currentHash = currentCreatorSessionHash(req);
            const result = await pool.query(
                `SELECT token_hash,created_at,expires_at,auth_method,last_seen_at,
                        last_seen_at + ($2::bigint * INTERVAL '1 millisecond') AS idle_expires_at
                 FROM creator_sessions
                 WHERE creator_id=$1 AND expires_at>NOW()
                   AND last_seen_at > NOW() - ($2::bigint * INTERVAL '1 millisecond')
                 ORDER BY created_at DESC`,
                [req.creatorAccount.id,CREATOR_SESSION_IDLE_TTL_MS]
            );
            return res.json({
                ok:true,
                sessions:result.rows.map(row => ({
                    id:creatorSessionReference(row.token_hash),
                    current:row.token_hash === currentHash,
                    created_at:row.created_at,
                    expires_at:row.expires_at,
                    last_seen_at:row.last_seen_at,
                    idle_expires_at:row.idle_expires_at,
                    auth_method:String(row.auth_method || "unknown")
                }))
            });
        } catch (error) {
            safeLogError("Creator Sessions Laden Fehler:",error);
            return res.status(500).json({ok:false,error:"Aktive Sitzungen konnten nicht geladen werden."});
        }
    }
);

app.delete(
    "/api/account/sessions/:sessionRef",
    requireCreatorAccount,
    requireCreatorAccountElevation,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const requested = String(req.params?.sessionRef || "").trim();
            if (!/^[A-Za-z0-9_-]{24}$/.test(requested)) {
                return res.status(400).json({ok:false,error:"Ungültige Sitzungsreferenz."});
            }

            const currentHash = currentCreatorSessionHash(req);
            const result = await pool.query(
                `SELECT token_hash FROM creator_sessions
                 WHERE creator_id=$1 AND expires_at>NOW()
                   AND last_seen_at > NOW() - ($2::bigint * INTERVAL '1 millisecond')`,
                [req.creatorAccount.id,CREATOR_SESSION_IDLE_TTL_MS]
            );
            const target = result.rows.find(row => creatorSessionReference(row.token_hash) === requested);
            if (!target) {
                return res.status(404).json({ok:false,error:"Diese Sitzung ist nicht mehr aktiv."});
            }

            await pool.query(`DELETE FROM creator_sessions WHERE creator_id=$1 AND token_hash=$2`, [req.creatorAccount.id,target.token_hash]);
            await recordSecurityEvent(req.creatorAccount.id,"session_revoked");

            const current = target.token_hash === currentHash;
            if (current) {
                clearCreatorSessionCookie(res);
                clearCreatorCsrfCookie(res);
            }

            return res.json({ok:true,revoked:true,current,authenticated:!current});
        } catch (error) {
            safeLogError("Creator Session Revoke Fehler:",error);
            return res.status(500).json({ok:false,error:"Die Sitzung konnte nicht beendet werden."});
        }
    }
);


// ============================================================
// ACCOUNT PASSWORT ÄNDERN
//
// - aktive Session erforderlich
// - aktuelles Passwort wird erneut geprüft
// - neue Passphrase folgt derselben Server-Policy wie Registrierung
// - alle bestehenden Sessions werden widerrufen
// - danach wird genau eine neue Session für diesen Browser erstellt
// ============================================================

app.post(
    "/api/account/password",
    requireCreatorAccount,
    requireCreatorAccountElevation,
    accountPasswordChangeLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");

        const currentPassword = String(req.body?.current_password || "");
        const newPassword = String(req.body?.new_password || "");

        if (!currentPassword || currentPassword.length > PASSWORD_MAX_LENGTH) {
            return res.status(400).json({ok:false,error:"Bitte bestätige die Änderung mit deinem aktuellen Passwort."});
        }
        if (!newPassword || newPassword.length > PASSWORD_MAX_LENGTH) {
            return res.status(400).json({ok:false,error:`Das neue Passwort muss zwischen ${PASSWORD_MIN_LENGTH} und ${PASSWORD_MAX_LENGTH} Zeichen lang sein.`});
        }

        let client = null;
        try {
            client = await pool.connect();
            await client.query("BEGIN");

            const result = await client.query(
                `SELECT id,email,display_name,password_hash,password_salt,password_kdf_version FROM creator_accounts WHERE id=$1 AND status='active' LIMIT 1 FOR UPDATE`,
                [req.creatorAccount.id]
            );
            const account = result.rows[0];
            if (!account) {
                await client.query("ROLLBACK");
                return res.status(401).json({ok:false,authenticated:false,error:"Das Creator-Konto ist nicht mehr verfügbar."});
            }

            const currentOk = await verifyPassword(
                currentPassword,
                account.password_salt,
                account.password_hash,
                account.password_kdf_version
            );
            if (!currentOk) {
                await client.query("ROLLBACK");
                return res.status(401).json({ok:false,error:"Das aktuelle Passwort ist nicht korrekt."});
            }

            const policyProblem = passwordPolicyError(newPassword, {
                email: account.email,
                displayName: account.display_name
            });
            if (policyProblem) {
                await client.query("ROLLBACK");
                return res.status(400).json({ok:false,error:policyProblem});
            }

            const sameAsCurrent = await verifyPassword(
                newPassword,
                account.password_salt,
                account.password_hash,
                account.password_kdf_version
            );
            if (sameAsCurrent) {
                await client.query("ROLLBACK");
                return res.status(400).json({ok:false,error:"Das neue Passwort muss sich vom aktuellen Passwort unterscheiden."});
            }

            const nextPassword = await createPasswordHash(newPassword);
            await client.query(
                `UPDATE creator_accounts SET password_hash=$2,password_salt=$3,password_kdf_version=$4,updated_at=NOW() WHERE id=$1`,
                [account.id,nextPassword.hash,nextPassword.salt,nextPassword.kdfVersion]
            );
            await revokeCreatorPendingAuthArtifacts(client,account.id);
            await client.query(`DELETE FROM creator_sessions WHERE creator_id=$1`, [account.id]);
            await client.query("COMMIT");

            clearMfaChallengeCookie(res);
            await recordSecurityEvent(account.id,"password_changed");
            await createCreatorSession(res,account.id,"password_change");
            if (ACCOUNT_MAIL_CONFIG.enabled) await queueAccountMail(passwordChangedMailMessage(account),{creatorId:account.id});

            return res.json({
                ok:true,
                authenticated:true,
                sessions_revoked:true,
                pending_auth_revoked:true,
                message:"Passwort geändert. Andere Login-Sitzungen und offene Login-Challenges wurden beendet."
            });
        } catch (error) {
            if (client) {
                try { await client.query("ROLLBACK"); } catch {}
            }
            safeLogError("Creator Passwort ändern Fehler:",error);
            return res.status(500).json({ok:false,error:"Das Passwort konnte nicht geändert werden."});
        } finally {
            client?.release?.();
        }
    }
);


// ============================================================
// ACCOUNT DATENEXPORT
// ============================================================

app.post(
    "/api/account/export",
    requireCreatorAccount,
    requireCreatorAccountElevation,
    accountExportLimiter,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const password = String(req.body?.password || "");
            if (!password || password.length > PASSWORD_MAX_LENGTH) {
                return res.status(400).json({ok:false,error:"Bitte bestätige den Datenexport mit deinem aktuellen Passwort."});
            }

            const passwordOk = await verifyCreatorPasswordForLifecycle(req.creatorAccount.id,password);
            if (!passwordOk) {
                return res.status(401).json({ok:false,error:"Das Passwort ist nicht korrekt."});
            }

            const accountExport = await buildCreatorAccountExport(req.creatorAccount.id);
            await recordSecurityEvent(req.creatorAccount.id,"data_export_requested");
            return res.json({ok:true,export:accountExport});
        } catch (error) {
            safeLogError("Creator Datenexport Fehler:",error);
            return res.status(500).json({ok:false,error:"Der Datenexport konnte nicht erstellt werden."});
        }
    }
);


// ============================================================
// ACCOUNT PROFIL AKTUALISIEREN
// ============================================================

app.patch(
    "/api/account/profile",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const displayName =
                normalizeDisplayName(
                    req.body?.display_name
                );


            if (
                !displayName
            ) {

                return res
                    .status(400)
                    .json({

                        ok:
                            false,

                        error:
                            "Bitte gib einen Creator-Namen ein."

                    });

            }


            const result =
                await pool.query(
                    `
                    UPDATE creator_accounts

                    SET
                        display_name = $2,
                        updated_at = NOW()

                    WHERE id = $1

                    RETURNING
                        id,
                        email,
                        display_name,
                        plan,
                        status,
                        created_at,
                        updated_at
                    `,
                    [
                        req.creatorAccount.id,
                        displayName
                    ]
                );


            await recordSecurityEvent(
                req.creatorAccount.id,
                "profile_updated"
            );


            return res.json({

                ok:
                    true,

                account:
                    publicCreatorAccount(
                        result.rows[0]
                    )

            });

        }
        catch (error) {

            safeLogError("Creator Profil Update Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Das Creator-Profil konnte nicht gespeichert werden."

                });

        }

    }
);


// ============================================================
// ACCOUNT LÖSCHEN
//
// Sicherheitsprinzip:
// - aktive Creator-Session erforderlich
// - Passwort muss erneut bestätigt werden
// - feste Bestätigungsphrase erforderlich
// - Rate Limit gegen wiederholte Passwortversuche
// - accountbezogene Daten werden in einer DB-Transaktion entfernt
//
// WICHTIG:
// Die aktuelle TikTok-Owner-Verbindung läuft historisch unter
// DEFAULT_CREATOR_ID ("default") und ist noch nicht eindeutig einem
// Creator-Account zugeordnet. Deshalb wird "default" hier NICHT gelöscht.
// Account-spezifische TikTok-Zeilen mit creator_id = Account-ID werden
// dagegen entfernt. So bleibt die bestehende Launcher/TikTok-Verbindung
// beim Löschen eines Website-Accounts geschützt.
// ============================================================

app.delete(
    "/api/account",

    requireCreatorAccount,
    requireCreatorAccountElevation,

    accountDeleteLimiter,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        const password =
            String(
                req.body?.password ||
                ""
            );

        const confirmation =
            String(
                req.body?.confirmation ||
                ""
            )
                .trim()
                .toUpperCase();


        if (
            !password ||
            password.length >
                PASSWORD_MAX_LENGTH
        ) {

            return res
                .status(400)
                .json({

                    ok:
                        false,

                    error:
                        "Bitte bestätige die Löschung mit deinem Passwort."

                });

        }


        if (
            confirmation !==
                "LÖSCHEN"
        ) {

            return res
                .status(400)
                .json({

                    ok:
                        false,

                    error:
                        "Bitte gib zur Bestätigung exakt LÖSCHEN ein."

                });

        }


        let client =
            null;

        let accountTikTokAccessToken =
            "";


        try {

            client =
                await pool.connect();


            await client.query(
                "BEGIN"
            );


            const accountResult =
                await client.query(
                    `
                    SELECT
                        id,
                        password_hash,
                        password_salt,
                        password_kdf_version

                    FROM creator_accounts

                    WHERE id = $1

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        req.creatorAccount.id
                    ]
                );


            const account =
                accountResult.rows[0];


            if (
                !account
            ) {

                await client.query(
                    "ROLLBACK"
                );

                clearCreatorSessionCookie(res);

                clearCreatorCsrfCookie(
                    res
                );

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        authenticated:
                            false,

                        error:
                            "Das Creator-Konto ist nicht mehr verfügbar."

                    });

            }


            const passwordOk =
                await verifyPassword(
                    password,
                    account.password_salt,
                    account.password_hash,
                    account.password_kdf_version
                );


            if (
                !passwordOk
            ) {

                await client.query(
                    "ROLLBACK"
                );

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        error:
                            "Das Passwort ist nicht korrekt."

                    });

            }


            // Erst nach erfolgreicher Passwortbestätigung wird der optionale
            // accountgebundene TikTok-Token serverseitig für den späteren
            // Provider-Widerruf gelesen. Er wird niemals an den Browser gegeben.
            try {
                const lifecycleConnection = await getConnection(account.id);
                accountTikTokAccessToken = String(lifecycleConnection?.access_token || "");
            } catch (connectionError) {
                console.warn("Creator Account Delete TikTok Lookup Warnung:", getSafeDiagnostic(connectionError,"account_delete_tiktok_lookup"));
            }


            // Explizit löschen, auch wenn die vorhandenen FK-Constraints
            // bereits ON DELETE CASCADE verwenden. Das hält die Löschung
            // nachvollziehbar und kompatibel mit älteren Datenbankständen.

            await client.query(
                `
                DELETE FROM creator_module_state
                WHERE creator_id = $1
                `,
                [
                    account.id
                ]
            );


            await client.query(
                `
                DELETE FROM creator_settings
                WHERE creator_id = $1
                `,
                [
                    account.id
                ]
            );


            await client.query(
                `
                DELETE FROM creator_sessions
                WHERE creator_id = $1
                `,
                [
                    account.id
                ]
            );


            await client.query(
                `
                DELETE FROM tiktok_oauth_states
                WHERE creator_id = $1
                `,
                [
                    account.id
                ]
            );


            // Nur account-spezifische TikTok-Verbindungen entfernen.
            // Die globale Owner-Verbindung "default" bleibt unangetastet.
            await client.query(
                `
                DELETE FROM tiktok_connections
                WHERE creator_id = $1
                AND creator_id <> $2
                `,
                [
                    account.id,
                    DEFAULT_CREATOR_ID
                ]
            );


            const deleteResult =
                await client.query(
                    `
                    DELETE FROM creator_accounts
                    WHERE id = $1
                    RETURNING id
                    `,
                    [
                        account.id
                    ]
                );


            if (
                deleteResult.rowCount !==
                    1
            ) {

                throw new Error(
                    "Creator-Account konnte nicht eindeutig gelöscht werden."
                );

            }


            await client.query(
                "COMMIT"
            );


            // Nach erfolgreicher lokaler Löschung die accountbezogene TikTok-
            // Autorisierung best-effort beim Provider widerrufen. Ein externer
            // Fehler darf die bereits abgeschlossene lokale Datenlöschung nicht
            // rückgängig machen.
            if (accountTikTokAccessToken && CLIENT_KEY && CLIENT_SECRET) {
                try {
                    const revokeBody = new URLSearchParams({
                        client_key:CLIENT_KEY,
                        client_secret:CLIENT_SECRET,
                        token:accountTikTokAccessToken
                    });
                    await fetchTikTok(TIKTOK_REVOKE_URL,{
                        method:"POST",
                        headers:{"Content-Type":"application/x-www-form-urlencoded"},
                        body:revokeBody
                    });
                } catch (revokeError) {
                    console.warn("Creator Account Delete TikTok Revoke Warnung:", getSafeDiagnostic(revokeError,"account_delete_tiktok_revoke"));
                }
            }


            clearCreatorAuthCookies(res);
            clearSensitiveBrowserState(res);


            console.log(
                "[CFS Account] Creator-Account wurde gelöscht."
            );


            return res.json({

                ok:
                    true,

                authenticated:
                    false,

                deleted:
                    true,

                message:
                    "Dein Creator-Konto wurde gelöscht."

            });

        }
        catch (error) {

            if (
                client
            ) {

                try {

                    await client.query(
                        "ROLLBACK"
                    );

                }
                catch (
                    rollbackError
                ) {

                    console.error(
                        "Creator Account Delete Rollback Fehler:",
                        rollbackError
                    );

                }

            }


            safeLogError("Creator Account Delete Fehler:",error);


            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Das Creator-Konto konnte nicht gelöscht werden."

                });

        }
        finally {

            client?.release();

        }

    }
);


// ============================================================
// CREATOR SETTINGS LADEN
// ============================================================

app.get(
    "/api/creator/settings",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const data =
                await getCreatorSettings(
                    req.creatorAccount.id
                );


            return res.json({

                ok:
                    true,

                settings:
                    data.settings,

                updated_at:
                    data.updated_at,

                entitlements:
                    getPlanEntitlements(
                        req.creatorAccount.plan
                    )

            });

        }
        catch (error) {

            safeLogError("Creator Settings Laden Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Creator-Einstellungen konnten nicht geladen werden."

                });

        }

    }
);


// ============================================================
// CREATOR SETTINGS SPEICHERN
// ============================================================

app.put(
    "/api/creator/settings",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const settings =
                sanitizeCreatorSettings(
                    req.body?.settings
                );


            const plan =
                normalizePlan(
                    req.creatorAccount.plan
                );


            const entitlements =
                getPlanEntitlements(
                    plan
                );


            // ------------------------------------------------
            // Theme serverseitig prüfen
            // ------------------------------------------------

            if (
                settings?.profile?.theme &&
                !entitlements
                    .themes
                    .includes(
                        settings.profile.theme
                    )
            ) {

                return res
                    .status(403)
                    .json({

                        ok:
                            false,

                        error:
                            "Dieses Theme ist für deinen aktuellen Plan nicht freigeschaltet."

                    });

            }


            const result =
                await saveCreatorSettings(
                    req.creatorAccount.id,
                    settings
                );


            return res.json({

                ok:
                    true,

                settings:
                    result.settings,

                updated_at:
                    result.updated_at

            });

        }
        catch (error) {

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    ...clientSafeErrorPayload(req,error,500,"Creator-Einstellungen konnten nicht gespeichert werden.")

                });

        }

    }
);


// ============================================================
// CREATOR MODULE REGISTRY
// ============================================================

app.get(
    "/api/creator/modules",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        const moduleAccess=await creatorAccessProfile(req.creatorAccount);

        return res.json({

            ok:
                true,

            plan:
                normalizePlan(
                    req.creatorAccount.plan
                ),

            entitlements:
                moduleAccess.entitlements,

            access:
                moduleAccess,

            modules:
                publicModuleRegistry(req.creatorAccount,moduleAccess.entitlements)

        });

    }
);


// ============================================================
// MODUL STATE LADEN
// ============================================================

app.get(
    "/api/creator/modules/:moduleKey/state",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const moduleKey =
                normalizeModuleKey(
                    req.params.moduleKey
                );


            const module =
                CREATOR_MODULES[
                    moduleKey
                ];


            const moduleAccess=await creatorAccessProfile(req.creatorAccount);

            if (!Boolean(moduleAccess?.entitlements?.[moduleKey])) {

                return res
                    .status(403)
                    .json({

                        ok:
                            false,

                        allowed:
                            false,

                        module:
                            module,

                        error:
                            `Dieses Modul benötigt mindestens den Plan ${module.minimum_plan.toUpperCase()}.`

                    });

            }


            const data =
                await getModuleState(
                    req.creatorAccount.id,
                    moduleKey
                );


            return res.json({

                ok:
                    true,

                allowed:
                    true,

                module:
                    module,

                state:
                    data.state,

                updated_at:
                    data.updated_at

            });

        }
        catch (error) {

            if (
                error.message ===
                "Unbekanntes Creator-Modul."
            ) {

                return res
                    .status(404)
                    .json({

                        ok:
                            false,

                        error:
                            error.message

                    });

            }


            safeLogError("Modul State Laden Fehler:",error);


            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Modul-Daten konnten nicht geladen werden."

                });

        }

    }
);


// ============================================================
// MODUL STATE SPEICHERN
// ============================================================

app.put(
    "/api/creator/modules/:moduleKey/state",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const moduleKey =
                normalizeModuleKey(
                    req.params.moduleKey
                );


            const module =
                CREATOR_MODULES[
                    moduleKey
                ];


            if (
                !module.stateful
            ) {

                return res
                    .status(400)
                    .json({

                        ok:
                            false,

                        error:
                            "Dieses Modul besitzt keinen speicherbaren Status."

                    });

            }


            const moduleAccess=await creatorAccessProfile(req.creatorAccount);

            if (!Boolean(moduleAccess?.entitlements?.[moduleKey])) {

                return res
                    .status(403)
                    .json({

                        ok:
                            false,

                        allowed:
                            false,

                        module:
                            module,

                        error:
                            `Dieses Modul benötigt mindestens den Plan ${module.minimum_plan.toUpperCase()}.`

                    });

            }


            const state =
                moduleKey==="games"
                    ? sanitizeGameProfile(req.body?.state)
                    : sanitizeModuleState(
                        req.body?.state
                    );


            const result =
                await saveModuleState(
                    req.creatorAccount.id,
                    moduleKey,
                    state
                );


            return res.json({

                ok:
                    true,

                allowed:
                    true,

                module:
                    module,

                state:
                    result.state,

                updated_at:
                    result.updated_at

            });

        }
        catch (error) {

            if (
                error.message ===
                "Unbekanntes Creator-Modul."
            ) {

                return res
                    .status(404)
                    .json({

                        ok:
                            false,

                        error:
                            error.message

                    });

            }


            return res
                .status(500)
                .json({

                    ok:
                        false,

                    ...clientSafeErrorPayload(req,error,500,"Modul-Daten konnten nicht gespeichert werden.")

                });

        }

    }
);

// ============================================================
// WIDGET STUDIO V1 - CREATOR API
// ============================================================

app.get(
    "/api/creator/widget-studio/widgets",
    requireCreatorAccount,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            const rows =
                await listStudioWidgets(
                    req.creatorAccount.id
                );

            const tiktok =
                await getFollowerWidgetTikTokData(
                    req.creatorAccount.id
                );

            const access=await creatorAccessProfile(req.creatorAccount);
            const entitlements=access.entitlements;

            const live =
                await getStudioLiveState(
                    req.creatorAccount.id
                );

            return res.json({
                ok: true,
                widgets:
                    rows.map(publicStudioWidgetRow),
                tiktok,
                live,
                bridge: await getStudioBridgeStatus(req.creatorAccount.id),
                registry: studioWidgetRegistryPublic(req.creatorAccount.plan,entitlements),
                access,
                providers: studioProviderRegistryPublic(),
                sessions: await getStudioLiveSessions(req.creatorAccount.id, 5),
                interactions: await listStudioInteractionRules(req.creatorAccount.id),
                plan: normalizePlan(req.creatorAccount.plan),
                limits:{max_widgets:entitlements.max_widgets,max_scenes:entitlements.max_scenes},
                entitlements
            });

        }
        catch (error) {

            safeLogError("Widget Studio Liste Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Widgets konnten nicht geladen werden."
            });

        }

    }
);


// ============================================================
// WIDGET STUDIO · CREATOR DATEIBIBLIOTHEK
// ============================================================

app.get("/api/creator/widget-studio/assets",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const rows=await listStudioAssets(req.creatorAccount.id);
        const used=rows.reduce((sum,row)=>sum+Number(row.byte_size||0),0);
        return res.json({
            ok:true,
            assets:rows.map(row=>publicWidgetAsset(row)),
            categories:WIDGET_ASSET_CATEGORY_LABELS,
            limits:{max_assets:MAX_ASSET_COUNT,max_total_bytes:MAX_TOTAL_BYTES,max_upload_bytes:MAX_UPLOAD_BYTES},
            usage:{count:rows.length,bytes:used}
        });
    }catch(error){
        safeLogError("Widget Asset Liste Fehler:",error);
        return res.status(500).json({ok:false,error:"Creator-Dateien konnten nicht geladen werden."});
    }
});

app.post(
    "/api/creator/widget-studio/assets",
    requireCreatorAccount,
    creatorAssetUploadLimiter,
    express.raw({type:()=>true,limit:MAX_UPLOAD_BYTES}),
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const content=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
            let rawName=String(req.get("X-CFS-File-Name")||"");
            try{rawName=decodeURIComponent(rawName);}catch{}
            const detected=detectWidgetAsset(content,{filename:rawName,mimeHint:req.get("Content-Type")||""});
            const sha256=crypto.createHash("sha256").update(content).digest("hex");
            const token=crypto.randomBytes(24).toString("hex");
            const label=safeWidgetAssetLabel(detected.originalName.replace(/\.[^.]+$/,""),"Creator Datei");
            const metadata={width:detected.width||0,height:detected.height||0,hasAlpha:Boolean(detected.hasAlpha),animated:Boolean(detected.animated)};

            const stored=await withCreatorResourceLock(req.creatorAccount.id,async client=>{
                // Deduplizierung liegt absichtlich vor der Quotenprüfung: eine bereits
                // vorhandene Datei verbraucht weder einen neuen Slot noch Speicher.
                const duplicate=(await client.query(
                    `SELECT * FROM creator_widget_assets WHERE creator_id=$1 AND sha256=$2 LIMIT 1`,
                    [req.creatorAccount.id,sha256]
                )).rows[0];
                if(duplicate)return{duplicate:true,row:duplicate};

                const usage=(await client.query(
                    `SELECT COUNT(*)::int AS count,COALESCE(SUM(byte_size),0)::bigint AS bytes FROM creator_widget_assets WHERE creator_id=$1`,
                    [req.creatorAccount.id]
                )).rows[0]||{};
                if(Number(usage.count||0)>=MAX_ASSET_COUNT){
                    throw creatorResourceLimitError(`Deine Dateibibliothek ist voll (${MAX_ASSET_COUNT} Dateien).`,"asset_count_limit");
                }
                if(Number(usage.bytes||0)+content.length>MAX_TOTAL_BYTES){
                    throw creatorResourceLimitError("Deine Dateibibliothek hat ihr Speicherlimit erreicht.","asset_storage_limit");
                }

                const result=await client.query(`
                    INSERT INTO creator_widget_assets(creator_id,original_name,label,media_type,mime_type,file_ext,byte_size,sha256,auto_category,category,metadata,public_token,content,created_at,updated_at)
                    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10::jsonb,$11,$12,NOW(),NOW()) RETURNING *
                `,[req.creatorAccount.id,safeWidgetAssetName(detected.originalName),label,detected.kind,detected.mime,detected.ext,content.length,sha256,detected.autoCategory,JSON.stringify(metadata),token,content]);
                return{duplicate:false,row:result.rows[0]};
            });

            if(stored.duplicate){
                return res.json({ok:true,duplicate:true,asset:publicWidgetAsset(stored.row),message:"Diese Datei ist bereits in deiner Bibliothek."});
            }
            return res.status(201).json({ok:true,duplicate:false,asset:publicWidgetAsset(stored.row)});
        }catch(error){
            const code=String(error?.code||"");
            if(["asset_empty","asset_too_large","asset_unsupported"].includes(code))return res.status(400).json({ok:false,code,error:error.message});
            if(["asset_count_limit","asset_storage_limit"].includes(code))return res.status(403).json({ok:false,code,error:error.message});
            if(error?.type==="entity.too.large")return res.status(413).json({ok:false,error:"Die Datei ist größer als 20 MB."});
            safeLogError("Widget Asset Upload Fehler:",error);
            return res.status(500).json({ok:false,error:"Creator-Datei konnte nicht gespeichert werden."});
        }
    }
);

app.patch("/api/creator/widget-studio/assets/:id",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const current=await getStudioAsset(req.creatorAccount.id,req.params.id);
        if(!current)return res.status(404).json({ok:false,error:"Datei nicht gefunden."});
        const category=normalizeAssetCategory(req.body?.category,current.category||current.auto_category||"other");
        const label=safeWidgetAssetLabel(req.body?.name,current.label||current.original_name);
        const result=await pool.query(`UPDATE creator_widget_assets SET label=$3,category=$4,updated_at=NOW() WHERE creator_id=$1 AND id=$2 RETURNING *`,[req.creatorAccount.id,current.id,label,category]);
        return res.json({ok:true,asset:publicWidgetAsset(result.rows[0])});
    }catch(error){
        safeLogError("Widget Asset Update Fehler:",error);
        return res.status(500).json({ok:false,error:"Datei konnte nicht aktualisiert werden."});
    }
});

app.post("/api/creator/widget-studio/assets/:id/rotate-token",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    const assetId=String(req.params.id||"");
    if(!/^[0-9a-f-]{36}$/i.test(assetId))return res.status(404).json({ok:false,error:"Datei nicht gefunden."});
    try{
        const rotated=await withCreatorResourceLock(req.creatorAccount.id,async client=>{
            const assetResult=await client.query(
                `SELECT * FROM creator_widget_assets WHERE creator_id=$1 AND id=$2 LIMIT 1 FOR UPDATE`,
                [req.creatorAccount.id,assetId]
            );
            const current=assetResult.rows[0];
            if(!current){
                const error=new Error("Datei nicht gefunden.");error.code="asset_missing";error.statusCode=404;throw error;
            }
            const oldUrl=`/widget-assets/${String(current.public_token||"")}`;
            const nextToken=crypto.randomBytes(24).toString("hex");
            const newUrl=`/widget-assets/${nextToken}`;
            const widgetResult=await client.query(
                `SELECT id,draft_config,published_config,status,version
                 FROM creator_widgets
                 WHERE creator_id=$1
                   AND (draft_config::text LIKE $2 OR COALESCE(published_config::text,'') LIKE $2)
                 FOR UPDATE`,
                [req.creatorAccount.id,`%${oldUrl}%`]
            );
            let migratedWidgets=0,publishedWidgets=0;
            for(const row of widgetResult.rows){
                const draftChanged=studioConfigContainsAssetUrl(row.draft_config,oldUrl);
                const publishedChanged=studioConfigContainsAssetUrl(row.published_config,oldUrl);
                if(!draftChanged&&!publishedChanged)continue;
                const draft= draftChanged ? replaceStudioAssetUrl(row.draft_config,oldUrl,newUrl) : row.draft_config;
                const published= publishedChanged ? replaceStudioAssetUrl(row.published_config,oldUrl,newUrl) : row.published_config;
                await client.query(
                    `UPDATE creator_widgets
                     SET draft_config=$3::jsonb,
                         published_config=$4::jsonb,
                         version=version+$5,
                         updated_at=NOW()
                     WHERE creator_id=$1 AND id=$2`,
                    [req.creatorAccount.id,row.id,JSON.stringify(draft||{}),published==null?null:JSON.stringify(published),publishedChanged?1:0]
                );
                migratedWidgets+=1;
                if(publishedChanged)publishedWidgets+=1;
            }
            const updated=await client.query(
                `UPDATE creator_widget_assets SET public_token=$3,updated_at=NOW() WHERE creator_id=$1 AND id=$2 RETURNING *`,
                [req.creatorAccount.id,current.id,nextToken]
            );
            return{row:updated.rows[0],migratedWidgets,publishedWidgets};
        });
        await recordSecurityEvent(req.creatorAccount.id,"asset_public_token_rotated");
        return res.json({
            ok:true,
            rotated:true,
            asset:publicWidgetAsset(rotated.row),
            migrated_widgets:rotated.migratedWidgets,
            published_widgets:rotated.publishedWidgets,
            message:rotated.migratedWidgets
                ? `Öffentlicher Datei-Link erneuert. ${rotated.migratedWidgets} Widget${rotated.migratedWidgets===1?"":"s"} wurde${rotated.migratedWidgets===1?"":"n"} automatisch aktualisiert.`
                : "Öffentlicher Datei-Link erneuert. Der alte Link ist nicht mehr gültig."
        });
    }catch(error){
        if(error?.code==="asset_missing")return res.status(404).json({ok:false,error:"Datei nicht gefunden."});
        safeLogError("Widget Asset Token Rotation Fehler:",error);
        return res.status(500).json({ok:false,error:"Der öffentliche Datei-Link konnte nicht erneuert werden."});
    }
});

app.delete("/api/creator/widget-studio/assets/:id",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const current=await getStudioAsset(req.creatorAccount.id,req.params.id);
        if(!current)return res.status(404).json({ok:false,error:"Datei nicht gefunden."});
        const references=await studioAssetUsageCount(req.creatorAccount.id,current.public_token);
        if(references>0)return res.status(409).json({ok:false,code:"asset_in_use",references,error:`Die Datei wird noch in ${references} Widget${references===1?"":"s"} verwendet.`});
        await pool.query(`DELETE FROM creator_widget_assets WHERE creator_id=$1 AND id=$2`,[req.creatorAccount.id,current.id]);
        return res.json({ok:true,deleted:true});
    }catch(error){
        safeLogError("Widget Asset Löschen Fehler:",error);
        return res.status(500).json({ok:false,error:"Datei konnte nicht gelöscht werden."});
    }
});

app.post(
    "/api/creator/widget-studio/widgets",
    requireCreatorAccount,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            const access=await creatorAccessProfile(req.creatorAccount);
            const entitlements=access.entitlements;

            const widgetType =
                String(req.body?.widget_type || "follower_goal");

            if (
                !WIDGET_STUDIO_WIDGET_TYPE_KEYS.has(widgetType)
            ) {
                return res.status(400).json({
                    ok: false,
                    error: "Unbekannter Widget-Typ."
                });
            }

            const definition =
                studioWidgetDefinition(widgetType);

            const minimumPlan=definition.minimum_plan||"free";
            const typeAllowed=minimumPlan==="free"||(["alert","latest","goal_alert"].includes(definition.mode)?Boolean(entitlements.alerts):Boolean(entitlements.live_widgets));
            if(!typeAllowed)return res.status(403).json({...accessDeniedPayload(access,["alert","latest","goal_alert"].includes(definition.mode)?"alerts":"live_widgets",minimumPlan),error:`${definition.label} benötigt mindestens den ${minimumPlan.toUpperCase()} Plan.`});

            const templateKey =
                WIDGET_STUDIO_TEMPLATE_KEYS.has(
                    String(req.body?.template_key || "")
                )
                    ? String(req.body.template_key)
                    : "cfs-standard";

            if(!templateAllowed(templateKey,entitlements)){const requiredPlan=minimumPlanForTemplate(templateKey);return res.status(403).json({...accessDeniedPayload(access,"widget_templates",requiredPlan),template_key:templateKey,error:`Das Template ${templateKey.toUpperCase()} benötigt mindestens den ${requiredPlan.toUpperCase()} Plan.`});}

            const draftConfig =
                sanitizeStudioWidgetConfig(
                    studioWidgetTemplateConfig(
                        widgetType,
                        templateKey
                    ),
                    widgetType
                );

            const id =
                crypto.randomUUID();

            const publicToken =
                createStudioWidgetToken();

            const name =
                studioWidgetName(
                    req.body?.name,
                    templateKey === "cfs-standard"
                        ? `Mein ${definition.label}`
                        : `${templateKey.replaceAll("-", " ")} ${definition.label}`
                );

            const result =
                await withCreatorResourceLock(req.creatorAccount.id,async client=>{
                    const countResult=await client.query(
                        `SELECT COUNT(*)::int AS count FROM creator_widgets WHERE creator_id=$1`,
                        [req.creatorAccount.id]
                    );
                    if(Number(countResult.rows[0]?.count||0)>=Number(entitlements.max_widgets||0)){
                        throw creatorResourceLimitError(`Dein Plan erlaubt maximal ${entitlements.max_widgets} Widgets.`,"widget_limit");
                    }
                    return client.query(
                        `
                        INSERT INTO creator_widgets (
                            id,creator_id,widget_type,name,template_key,status,draft_config,public_token,version,created_at,updated_at
                        )
                        VALUES ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7,1,NOW(),NOW())
                        RETURNING *
                        `,
                        [id,req.creatorAccount.id,widgetType,name,templateKey,JSON.stringify(draftConfig),publicToken]
                    );
                });

            const tiktok =
                await getFollowerWidgetTikTokData(
                    req.creatorAccount.id
                );

            return res.status(201).json({
                ok: true,
                widget: publicStudioWidgetRow(result.rows[0]),
                tiktok,
                live: await getStudioLiveState(req.creatorAccount.id),
                registry: studioWidgetRegistryPublic(req.creatorAccount.plan),
                providers: studioProviderRegistryPublic()
            });

        }
        catch (error) {

            if(error?.code==="widget_limit")return res.status(403).json({ok:false,code:error.code,error:error.message});

            safeLogError("Widget Studio Erstellen Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Widget konnte nicht erstellt werden."
            });

        }

    }
);


app.get(
    "/api/creator/widget-studio/widgets/:id",
    requireCreatorAccount,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            const row =
                await getStudioWidgetById(
                    req.creatorAccount.id,
                    req.params.id
                );

            if (!row) {
                return res.status(404).json({
                    ok: false,
                    error: "Widget nicht gefunden."
                });
            }

            const tiktok =
                await getFollowerWidgetTikTokData(
                    req.creatorAccount.id
                );

            return res.json({
                ok: true,
                widget: publicStudioWidgetRow(row),
                tiktok,
                live: await getStudioLiveState(req.creatorAccount.id),
                bridge: await getStudioBridgeStatus(req.creatorAccount.id),
                registry: studioWidgetRegistryPublic(req.creatorAccount.plan),
                providers: studioProviderRegistryPublic()
            });

        }
        catch (error) {

            safeLogError("Widget Studio Laden Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Widget konnte nicht geladen werden."
            });

        }

    }
);


app.put(
    "/api/creator/widget-studio/widgets/:id/draft",
    requireCreatorAccount,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            const current =
                await getStudioWidgetById(
                    req.creatorAccount.id,
                    req.params.id
                );

            if (!current) {
                return res.status(404).json({
                    ok: false,
                    error: "Widget nicht gefunden."
                });
            }

            const widgetAccess=await creatorAccessProfile(req.creatorAccount);
            const widgetEntitlements=widgetAccess.entitlements;
            const widgetDefinition=studioWidgetDefinition(current.widget_type);
            const widgetMinimum=widgetDefinition.minimum_plan||"free";
            const widgetAllowed=widgetMinimum==="free"||(["alert","latest","goal_alert"].includes(widgetDefinition.mode)?Boolean(widgetEntitlements.alerts):Boolean(widgetEntitlements.live_widgets));
            if(!widgetAllowed)return res.status(403).json(accessDeniedPayload(widgetAccess,["alert","latest","goal_alert"].includes(widgetDefinition.mode)?"alerts":"live_widgets",widgetMinimum));

            const config =
                sanitizeStudioWidgetConfig(
                    req.body?.config ?? current.draft_config,
                    current.widget_type
                );

            const name =
                studioWidgetName(
                    req.body?.name,
                    current.name
                );

            const result =
                await pool.query(
                    `
                    UPDATE creator_widgets
                    SET
                        name = $3,
                        draft_config = $4::jsonb,
                        version = version + 1,
                        updated_at = NOW()
                    WHERE creator_id = $1
                      AND id = $2
                    RETURNING *
                    `,
                    [
                        req.creatorAccount.id,
                        current.id,
                        name,
                        JSON.stringify(config)
                    ]
                );

            return res.json({
                ok: true,
                widget: publicStudioWidgetRow(result.rows[0])
            });

        }
        catch (error) {

            safeLogError("Widget Studio Draft Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Entwurf konnte nicht gespeichert werden."
            });

        }

    }
);


app.post(
    "/api/creator/widget-studio/widgets/:id/control",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const current = await getStudioWidgetById(req.creatorAccount.id, req.params.id);
            if (!current) return res.status(404).json({ok:false,error:"Widget nicht gefunden."});
            const definition = studioWidgetDefinition(current.widget_type);
            const manualValueControl = definition.mode === "manual_counter" || (definition.source_kind === "manual" && definition.mode === "goal");
            const manualTimerControl = definition.mode === "manual_timer";
            if (!manualValueControl && !manualTimerControl) {
                return res.status(400).json({ok:false,error:"Dieses Widget besitzt keine manuelle Live-Steuerung."});
            }

            const draft = sanitizeStudioWidgetConfig(current.draft_config, current.widget_type);
            const action = String(req.body?.action || "increment");
            const amount = Math.round(studioClamp(req.body?.amount, -1000000, 1000000, 1));

            let next = 0;
            let running = false;
            let updatedAt = null;

            if (manualValueControl) {
                const before = Math.max(0, Math.round(Number(draft.settings?.manualValue || 0)));
                next = before;
                if (action === "reset") next = 0;
                else if (action === "set") next = Math.round(studioClamp(req.body?.value, 0, 1000000000, before));
                else if (action === "increment") next = Math.round(studioClamp(before + amount, 0, 1000000000, before));
                else return res.status(400).json({ok:false,error:"Unbekannte Counter-Aktion."});
                draft.settings.manualValue = next;
            } else {
                const now = Date.now();
                const base = Math.max(0, Math.round(Number(draft.settings?.manualTimerSeconds || 0)));
                const wasRunning = Boolean(draft.settings?.manualTimerRunning);
                const previousUpdatedAt = draft.settings?.manualTimerUpdatedAt ? Date.parse(String(draft.settings.manualTimerUpdatedAt)) : NaN;
                const elapsed = wasRunning && Number.isFinite(previousUpdatedAt)
                    ? Math.max(0, Math.floor((now - previousUpdatedAt) / 1000))
                    : 0;
                const before = Math.min(359999, base + elapsed);
                next = before;
                running = wasRunning;

                if (action === "reset") {
                    next = 0;
                    running = false;
                } else if (action === "start") {
                    running = true;
                } else if (action === "pause") {
                    running = false;
                } else if (action === "toggle") {
                    running = !wasRunning;
                } else if (action === "set") {
                    next = Math.round(studioClamp(req.body?.value, 0, 359999, before));
                } else if (action === "increment") {
                    next = Math.round(studioClamp(before + amount, 0, 359999, before));
                } else {
                    return res.status(400).json({ok:false,error:"Unbekannte Timer-Aktion."});
                }

                updatedAt = new Date(now).toISOString();
                draft.settings.manualTimerSeconds = next;
                draft.settings.manualTimerRunning = running;
                draft.settings.manualTimerUpdatedAt = updatedAt;
            }

            let published = null;
            if (current.status === "live" && current.published_config) {
                published = sanitizeStudioWidgetConfig(current.published_config, current.widget_type);
                if (manualValueControl) {
                    published.settings.manualValue = next;
                } else {
                    published.settings.manualTimerSeconds = next;
                    published.settings.manualTimerRunning = running;
                    published.settings.manualTimerUpdatedAt = updatedAt;
                }
            }

            const result = await pool.query(
                `UPDATE creator_widgets
                 SET draft_config = $3::jsonb,
                     published_config = CASE WHEN $4::text IS NULL THEN published_config ELSE $4::jsonb END,
                     version = version + 1,
                     updated_at = NOW()
                 WHERE creator_id = $1 AND id = $2
                 RETURNING *`,
                [req.creatorAccount.id, current.id, JSON.stringify(draft), published ? JSON.stringify(published) : null]
            );
            return res.json({ok:true,value:next,running,widget:publicStudioWidgetRow(result.rows[0])});
        } catch (error) {
            safeLogError("Widget Studio Counter Steuerung Fehler:",error);
            return res.status(500).json({ok:false,error:"Counter konnte nicht aktualisiert werden."});
        }
    }
);


app.post(
    "/api/creator/widget-studio/widgets/:id/publish",
    requireCreatorAccount,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            const current =
                await getStudioWidgetById(
                    req.creatorAccount.id,
                    req.params.id
                );

            if (!current) {
                return res.status(404).json({
                    ok: false,
                    error: "Widget nicht gefunden."
                });
            }

            const widgetAccess=await creatorAccessProfile(req.creatorAccount);
            const widgetEntitlements=widgetAccess.entitlements;
            const widgetDefinition=studioWidgetDefinition(current.widget_type);
            const widgetMinimum=widgetDefinition.minimum_plan||"free";
            const widgetAllowed=widgetMinimum==="free"||(["alert","latest","goal_alert"].includes(widgetDefinition.mode)?Boolean(widgetEntitlements.alerts):Boolean(widgetEntitlements.live_widgets));
            if(!widgetAllowed)return res.status(403).json(accessDeniedPayload(widgetAccess,["alert","latest","goal_alert"].includes(widgetDefinition.mode)?"alerts":"live_widgets",widgetMinimum));

            const clean =
                sanitizeStudioWidgetConfig(
                    current.draft_config,
                    current.widget_type
                );

            const result =
                await pool.query(
                    `
                    UPDATE creator_widgets
                    SET
                        published_config = $3::jsonb,
                        status = 'live',
                        version = version + 1,
                        updated_at = NOW(),
                        published_at = NOW()
                    WHERE creator_id = $1
                      AND id = $2
                    RETURNING *
                    `,
                    [
                        req.creatorAccount.id,
                        current.id,
                        JSON.stringify(clean)
                    ]
                );

            return res.json({
                ok: true,
                widget: publicStudioWidgetRow(result.rows[0])
            });

        }
        catch (error) {

            safeLogError("Widget Studio Publish Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Widget konnte nicht veröffentlicht werden."
            });

        }

    }
);


app.post(
    "/api/creator/widget-studio/widgets/:id/rotate-public-token",
    requireCreatorAccount,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const current=await getStudioWidgetById(req.creatorAccount.id,req.params.id);
            if(!current)return res.status(404).json({ok:false,error:"Widget nicht gefunden."});
            const result=await pool.query(
                `UPDATE creator_widgets
                 SET public_token=$3,version=version+1,updated_at=NOW()
                 WHERE creator_id=$1 AND id=$2
                 RETURNING *`,
                [req.creatorAccount.id,current.id,createStudioWidgetToken()]
            );
            await recordSecurityEvent(req.creatorAccount.id,"public_output_token_rotated");
            return res.json({ok:true,rotated:true,widget:publicStudioWidgetRow(result.rows[0])});
        } catch(error) {
            safeLogError("Widget Output Token Rotation Fehler:",error);
            return res.status(500).json({ok:false,error:"Widget Output URL konnte nicht erneuert werden."});
        }
    }
);


app.post(
    "/api/creator/widget-studio/widgets/:id/duplicate",
    requireCreatorAccount,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            const current =
                await getStudioWidgetById(
                    req.creatorAccount.id,
                    req.params.id
                );

            if (!current) {
                return res.status(404).json({
                    ok: false,
                    error: "Widget nicht gefunden."
                });
            }

            const duplicateAccess=await creatorAccessProfile(req.creatorAccount);
            const duplicateEntitlements=duplicateAccess.entitlements;
            const duplicateDefinition=studioWidgetDefinition(current.widget_type);
            const duplicateMinimum=duplicateDefinition.minimum_plan||"free";
            const duplicateAllowed=duplicateMinimum==="free"||(["alert","latest","goal_alert"].includes(duplicateDefinition.mode)?Boolean(duplicateEntitlements.alerts):Boolean(duplicateEntitlements.live_widgets));
            if(!duplicateAllowed)return res.status(403).json(accessDeniedPayload(duplicateAccess,["alert","latest","goal_alert"].includes(duplicateDefinition.mode)?"alerts":"live_widgets",duplicateMinimum));
            if(!templateAllowed(current.template_key,duplicateEntitlements))return res.status(403).json(accessDeniedPayload(duplicateAccess,"widget_templates",minimumPlanForTemplate(current.template_key)));

            const access=await creatorAccessProfile(req.creatorAccount);
            const entitlements=access.entitlements;

            const id = crypto.randomUUID();
            const publicToken = createStudioWidgetToken();
            const config = sanitizeStudioWidgetConfig(current.draft_config, current.widget_type);

            const result =
                await withCreatorResourceLock(req.creatorAccount.id,async client=>{
                    const countResult=await client.query(
                        `SELECT COUNT(*)::int AS count FROM creator_widgets WHERE creator_id=$1`,
                        [req.creatorAccount.id]
                    );
                    if(Number(countResult.rows[0]?.count||0)>=Number(entitlements.max_widgets||0)){
                        throw creatorResourceLimitError(`Dein Plan erlaubt maximal ${entitlements.max_widgets} Widgets.`,"widget_limit");
                    }
                    return client.query(
                        `
                        INSERT INTO creator_widgets (id,creator_id,widget_type,name,template_key,status,draft_config,public_token,version,created_at,updated_at)
                        VALUES ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7,1,NOW(),NOW())
                        RETURNING *
                        `,
                        [id,req.creatorAccount.id,current.widget_type,studioWidgetName(`${current.name} Kopie`),current.template_key,JSON.stringify(config),publicToken]
                    );
                });

            return res.status(201).json({
                ok: true,
                widget: publicStudioWidgetRow(result.rows[0])
            });

        }
        catch (error) {

            if(error?.code==="widget_limit")return res.status(403).json({ok:false,code:error.code,error:error.message});

            safeLogError("Widget Studio Duplizieren Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Widget konnte nicht dupliziert werden."
            });

        }

    }
);


app.delete(
    "/api/creator/widget-studio/widgets/:id",
    requireCreatorAccount,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            if (!validStudioWidgetId(req.params.id)) {
                return res.status(404).json({
                    ok: false,
                    error: "Widget nicht gefunden."
                });
            }

            const result =
                await pool.query(
                    `
                    DELETE FROM creator_widgets
                    WHERE creator_id = $1
                      AND id = $2
                    RETURNING id
                    `,
                    [req.creatorAccount.id, req.params.id]
                );

            if (!result.rows[0]) {
                return res.status(404).json({
                    ok: false,
                    error: "Widget nicht gefunden."
                });
            }

            return res.json({
                ok: true,
                deleted: true,
                id: result.rows[0].id
            });

        }
        catch (error) {

            safeLogError("Widget Studio Löschen Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Widget konnte nicht gelöscht werden."
            });

        }

    }
);


// ============================================================
// WIDGET STUDIO V4 - LIVE DATA CORE / SIMULATOR API
// ============================================================

app.get(
    "/api/creator/widget-studio/live",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            return res.json({
                ok: true,
                data: await studioDataSnapshot(req.creatorAccount.id),
                bridge: await getStudioBridgeStatus(req.creatorAccount.id),
                events: await getRecentStudioLiveEvents(req.creatorAccount.id, null, 20),
                registry: studioWidgetRegistryPublic()
            });
        } catch (error) {
            safeLogError("Widget Studio Live State Fehler:",error);
            return res.status(500).json({ ok: false, error: "Live-Daten konnten nicht geladen werden." });
        }
    }
);

app.post(
    "/api/creator/widget-studio/live/simulate",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const live = await applyStudioLiveEvent(
                req.creatorAccount.id,
                req.body || {},
                "simulator"
            );
            return res.json({
                ok: true,
                live,
                data: await studioDataSnapshot(req.creatorAccount.id),
                events: await getRecentStudioLiveEvents(req.creatorAccount.id, null, 20)
            });
        } catch (error) {
            safeLogError("Widget Studio Simulator Fehler:",error);
            return res.status(400).json({ ok: false, error: error.message || "Simulator-Event fehlgeschlagen." });
        }
    }
);

app.get(
    "/api/creator/widget-studio/live/events",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const eventType = studioText(req.query?.type, 40, "") || null;
            return res.json({
                ok: true,
                events: await getRecentStudioLiveEvents(req.creatorAccount.id, eventType, req.query?.limit || 20)
            });
        } catch (error) {
            safeLogError("Widget Studio Event Queue Fehler:",error);
            return res.status(500).json({ ok: false, error: "Live-Events konnten nicht geladen werden." });
        }
    }
);

// ============================================================
// WIDGET STUDIO V8 - SESSIONS / INTERACTIONS
// ============================================================

app.get("/api/creator/widget-studio/live/sessions", requireCreatorAccount, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try { return res.json({ok:true,sessions:await getStudioLiveSessions(req.creatorAccount.id,req.query?.limit||10)}); }
    catch(error){ safeLogError("Widget Studio Sessions Fehler:",error); return res.status(500).json({ok:false,error:"LIVE-Historie konnte nicht geladen werden."}); }
});

app.get("/api/creator/widget-studio/interactions", requireCreatorAccount, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try { const access=await creatorAccessProfile(req.creatorAccount); return res.json({ok:true,allowed:Boolean(access.entitlements.auto_thanks),required_plan:"creator",rules:await listStudioInteractionRules(req.creatorAccount.id),output:{kind:"launcher_tts",ready:Boolean(access.entitlements.auto_thanks),label:"Launcher TTS / AutoThanks"}}); }
    catch(error){ safeLogError("Widget Studio Interaction Regeln Fehler:",error); return res.status(500).json({ok:false,error:"Interaction-Regeln konnten nicht geladen werden."}); }
});

app.put("/api/creator/widget-studio/interactions/:eventType", requireCreatorAccount, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try { const access=await requireCreatorFeatureAccess(req.creatorAccount,"auto_thanks","creator"); const rule=await saveStudioInteractionRule(req.creatorAccount.id,String(req.params.eventType||""),req.body||{}); return res.json({ok:true,rule,access_source:access.access_source}); }
    catch(error){ safeLogError("Widget Studio Interaction Speichern Fehler:",error); return res.status(400).json(clientSafeErrorPayload(req,error,400,"Interaction-Regel konnte nicht gespeichert werden.")); }
});

// ============================================================
// WIDGET STUDIO V6 - LAUNCHER BRIDGE API
// ============================================================

app.get(
    "/api/creator/launcher/releases",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");

        try {
            const bridge =
                await getStudioBridgeStatus(
                    req.creatorAccount.id
                );

            const currentVersion =
                studioText(
                    req.query?.current,
                    80,
                    bridge.client_version || ""
                );

            const channel =
                req.query?.channel === "beta"
                    ? "beta"
                    : "stable";

            const data =
                await launcherReleasePolicy(
                    currentVersion,
                    channel,
                    req.query?.refresh === "1",
                    `${req.creatorAccount.id}:${bridge.id || "creator-web"}`
                );

            return res.json({
                ok: true,
                bridge,
                ...data,
                server_time: new Date().toISOString()
            });
        }
        catch (error) {
            safeLogError("Launcher Release Center Fehler:",error);

            return res
                .status(500)
                .json({
                    ok: false,
                    error: "Launcher-Releases konnten nicht geladen werden."
                });
        }
    }
);


app.get("/api/admin/creator-suite/beta-center",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminSensitiveRead,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const [feedbackResult,sessionResult,metricResult]=await Promise.all([
            pool.query(`SELECT f.*,c.display_name AS creator_display_name,c.email AS creator_email FROM creator_beta_feedback f JOIN creator_accounts c ON c.id=f.creator_id ORDER BY CASE f.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,f.created_at DESC LIMIT 250`),
            pool.query(`SELECT s.*,c.display_name AS creator_display_name,c.email AS creator_email FROM creator_beta_sessions s JOIN creator_accounts c ON c.id=s.creator_id ORDER BY s.started_at DESC LIMIT 150`),
            pool.query(`SELECT (SELECT COUNT(*)::int FROM creator_beta_testers WHERE status='active') AS active_beta_testers,(SELECT COUNT(*)::int FROM creator_beta_sessions WHERE status='completed') AS completed_sessions,(SELECT COUNT(DISTINCT creator_id)::int FROM creator_beta_sessions WHERE status='completed') AS tested_creators,(SELECT COUNT(*)::int FROM creator_beta_feedback WHERE status IN ('new','reviewing')) AS open_feedback,(SELECT COUNT(*)::int FROM creator_beta_feedback WHERE status IN ('new','reviewing') AND severity='critical') AS open_critical,(SELECT COUNT(*)::int FROM creator_beta_feedback WHERE status IN ('new','reviewing') AND severity='high') AS open_high`)
        ]);
        const metrics=metricResult.rows[0]||{};
        return res.json({ok:true,generated_at:new Date().toISOString(),summary:{active_beta_testers:Number(metrics.active_beta_testers||0),completed_sessions:Number(metrics.completed_sessions||0),tested_creators:Number(metrics.tested_creators||0),open_feedback:Number(metrics.open_feedback||0),open_critical:Number(metrics.open_critical||0),open_high:Number(metrics.open_high||0)},release_candidate:releaseCandidateReadiness(metrics),feedback:feedbackResult.rows.map(row=>({...publicBetaFeedback(row),creator:{display_name:row.creator_display_name||"Creator",email:row.creator_email||""}})),sessions:sessionResult.rows.map(row=>({...publicBetaSession(row),creator:{display_name:row.creator_display_name||"Creator",email:row.creator_email||""}}))});
    }catch(error){safeLogError("Beta Center Fehler:",error);return res.status(500).json({ok:false,error:"Beta Center konnte nicht geladen werden."})}
});
async function loadProductionEvidence(){
    const rows=(await pool.query(`SELECT * FROM creator_production_evidence ORDER BY observed_at DESC,created_at DESC LIMIT 500`)).rows;
    return{rows,...verificationFlagsFromEvidence(rows,{releaseVersion:PRODUCTION_EVIDENCE_RELEASE_VERSION})};
}
async function loadStripeTestmodeEvidence(){
    const rows=(await pool.query(`SELECT event_id,event_type,creator_id,event_created,livemode,outcome,processed_at FROM creator_billing_events WHERE livemode=FALSE AND processed_at >= NOW()-INTERVAL '30 days' ORDER BY processed_at DESC LIMIT 500`)).rows;
    return stripeTestmodeE2E(rows,{lookbackDays:14});
}
function mergeProductionVerificationFlags(evidenceFlags={}){
    const merged={...PRODUCTION_VERIFICATION_FLAGS};
    for(const [key,value] of Object.entries(evidenceFlags||{})){if(value===true)merged[key]=true}
    return merged;
}


async function loadProductionReadinessBundle(){
    const metricResult=await pool.query(`SELECT (SELECT COUNT(*)::int FROM creator_beta_testers WHERE status='active') AS active_beta_testers,(SELECT COUNT(*)::int FROM creator_beta_sessions WHERE status='completed') AS completed_sessions,(SELECT COUNT(DISTINCT creator_id)::int FROM creator_beta_sessions WHERE status='completed') AS tested_creators,(SELECT COUNT(*)::int FROM creator_beta_feedback WHERE status IN ('new','reviewing')) AS open_feedback,(SELECT COUNT(*)::int FROM creator_beta_feedback WHERE status IN ('new','reviewing') AND severity='critical') AS open_critical,(SELECT COUNT(*)::int FROM creator_beta_feedback WHERE status IN ('new','reviewing') AND severity='high') AS open_high`);
    const metrics=metricResult.rows[0]||{},rc=releaseCandidateReadiness(metrics);
    const [evidence,stripeTestmode,billingMetrics,recentEvents]=await Promise.all([
        loadProductionEvidence(),
        loadStripeTestmodeEvidence(),
        pool.query(`SELECT status,COUNT(*)::int AS count FROM creator_billing_subscriptions GROUP BY status ORDER BY status`).then(r=>r.rows),
        pool.query(`SELECT event_id,event_type,creator_id,event_created,livemode,outcome,summary,processed_at FROM creator_billing_events ORDER BY processed_at DESC LIMIT 50`).then(r=>r.rows)
    ]);
    const flags=mergeProductionVerificationFlags(evidence.flags);
    const readiness=productionReleaseReadiness({billing:BILLING_CONFIG,appBaseUrl:APP_BASE_URL,releaseCandidate:rc,flags,stripeTestmode});
    return{metrics,rc,evidence,stripeTestmode,billingMetrics,recentEvents,flags,readiness};
}

async function loadReleaseOperationsState(){
    const production=await loadProductionReadinessBundle();
    const [acceptanceRows,cohortRows,memberRows,sessionRows,decisionRows]=await Promise.all([
        pool.query(`SELECT * FROM creator_release_acceptances WHERE release_version=$1 ORDER BY updated_at DESC,created_at DESC LIMIT 250`,[PRODUCTION_EVIDENCE_RELEASE_VERSION]).then(r=>r.rows),
        pool.query(`SELECT * FROM creator_release_cohorts WHERE release_version=$1 ORDER BY updated_at DESC,created_at DESC LIMIT 50`,[PRODUCTION_EVIDENCE_RELEASE_VERSION]).then(r=>r.rows),
        pool.query(`SELECT m.*,c.display_name,c.email FROM creator_release_cohort_members m JOIN creator_release_cohorts r ON r.id=m.cohort_id JOIN creator_accounts c ON c.id=m.creator_id WHERE r.release_version=$1 ORDER BY m.updated_at DESC`,[PRODUCTION_EVIDENCE_RELEASE_VERSION]).then(r=>r.rows),
        pool.query(`SELECT creator_id,launcher_version,status,started_at,ended_at FROM creator_beta_sessions WHERE status='completed' AND (launcher_version=$1 OR launcher_version='') ORDER BY started_at DESC`,[PRODUCTION_EVIDENCE_RELEASE_VERSION]).then(r=>r.rows),
        pool.query(`SELECT * FROM creator_release_decisions WHERE release_version=$1 ORDER BY created_at DESC LIMIT 50`,[PRODUCTION_EVIDENCE_RELEASE_VERSION]).then(r=>r.rows)
    ]);
    const membersByCohort={};
    for(const row of memberRows){
        const key=String(row.cohort_id);
        if(!membersByCohort[key])membersByCohort[key]=[];
        membersByCohort[key].push({...row,creator:{display_name:row.display_name||"Creator",email:row.email||""}});
    }
    const cohorts=cohortRows.map(row=>({...row,members:membersByCohort[String(row.id)]||[],evaluation:evaluateCohort(row,membersByCohort[String(row.id)]||[],sessionRows)}));
    const cohortReadiness=releaseCohortReadiness(cohortRows,membersByCohort,sessionRows);
    const latest=latestAcceptances(acceptanceRows,PRODUCTION_EVIDENCE_RELEASE_VERSION);
    const assessment=goNoGoAssessment({
        production:production.readiness,
        acceptances:latest,
        cohorts:cohortReadiness,
        feedback:production.metrics,
        releaseVersion:PRODUCTION_EVIDENCE_RELEASE_VERSION
    });
    return{
        production,acceptanceRows,latestAcceptances:latest,
        cohorts,cohortReadiness,sessionRows,decisions:decisionRows,assessment
    };
}

app.get("/api/admin/creator-suite/config-doctor",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminSensitiveRead,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const report=runtimeDoctor(process.env);
        return res.json({
            ok:true,
            generated_at:new Date().toISOString(),
            backend_version:BACKEND_VERSION,
            launcher_target:LAUNCHER_BUILD_TARGET_VERSION,
            release_evidence_version:PRODUCTION_EVIDENCE_RELEASE_VERSION,
            runtime:report
        });
    }catch(error){
        safeLogError("Config Doctor Fehler:",error);
        return res.status(500).json({ok:false,error:"Config Doctor konnte nicht ausgeführt werden."});
    }
});

app.get("/api/admin/creator-suite/production-readiness",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminSensitiveRead,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const [state,mailDelivery,monitoring,incident]=await Promise.all([loadProductionReadinessBundle(),accountMailOutboxStats(),productionMonitorStatus(),getWebsiteIncidentState()]);
        const activeCounts=monitoring?.active_counts||{};
        const monitorHealthy=Boolean(monitoring?.configured&&monitoring?.worker_fresh&&Number(activeCounts.critical||0)===0&&Number(activeCounts.warning||0)===0);
        const launchGate=evaluateLaunchGate(state.evidence.rows,{releaseVersion:PRODUCTION_EVIDENCE_RELEASE_VERSION,billingRequired:BILLING_LIVE_REQUIRED,monitorHealthy,incidentNormal:incident.mode==="normal"});
        return res.json({
            ok:true,generated_at:new Date().toISOString(),release_version:PRODUCTION_EVIDENCE_RELEASE_VERSION,
            readiness:state.readiness,
            launch_gate:launchGate,
            evidence:{kinds:EVIDENCE_KINDS,manual_kinds:MANUAL_EVIDENCE_KINDS,latest:state.evidence.latest,history:state.evidence.rows.slice(0,100).map(publicProductionEvidence)},
            stripe_testmode:state.stripeTestmode,
            billing:{config:BILLING_CONFIG,subscriptions_by_status:state.billingMetrics,recent_events:state.recentEvents},
            mail_delivery:mailDelivery,
            monitoring,
            incident_mode:incident.mode,
            release_candidate:state.rc
        });
    }catch(error){safeLogError("Production Readiness Fehler:",error);return res.status(500).json({ok:false,error:"Production Readiness konnte nicht geladen werden."});}
});

app.post("/api/admin/creator-suite/production-evidence",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const item=sanitizeProductionEvidence(req.body||{},{releaseVersion:PRODUCTION_EVIDENCE_RELEASE_VERSION});
        if(AUTOMATED_EVIDENCE_KIND_SET.has(item.kind))return res.status(400).json({ok:false,error:"Diese Evidence wird ausschließlich durch den verifizierten Production-Drill importiert."});
        if(item.status==="verified"&&!item.reference&&!item.artifact_sha256&&item.notes.length<12){
            return res.status(400).json({ok:false,error:"Verifizierte Evidence braucht Referenz, SHA256 oder eine nachvollziehbare Notiz."});
        }
        const result=await pool.query(`
            INSERT INTO creator_production_evidence(kind,status,source,release_version,environment,target,reference,artifact_sha256,notes,details,observed_at,expires_at,created_by,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,NOW(),NOW())
            RETURNING *
        `,[
            item.kind,item.status,item.source,item.release_version,item.environment,item.target,item.reference,item.artifact_sha256,item.notes,
            JSON.stringify(item.details||{}),item.observed_at,item.expires_at,req.creatorAccount.id
        ]);
        return res.status(201).json({ok:true,evidence:publicProductionEvidence(result.rows[0])});
    }catch(error){
        const msg=String(error?.message||"");
        if(msg.includes("Evidence")||msg.includes("SHA256"))return res.status(400).json({ok:false,error:msg});
        safeLogError("Production Evidence Fehler:",error);
        return res.status(500).json({ok:false,error:"Production Evidence konnte nicht gespeichert werden."});
    }
});


app.get("/api/admin/creator-suite/release-operations",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminSensitiveRead,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const state=await loadReleaseOperationsState();
        const protocols=Object.fromEntries(Object.entries(RELEASE_ACCEPTANCE_PROTOCOLS).map(([key,value])=>[key,{key,label:value.label,steps:value.steps.map(([id,label,required])=>({id,label,required:required!==false}))}]));
        return res.json({
            ok:true,generated_at:new Date().toISOString(),release_version:PRODUCTION_EVIDENCE_RELEASE_VERSION,
            protocols,
            acceptances:{latest:state.latestAcceptances,history:state.acceptanceRows.slice(0,100).map(publicAcceptance)},
            cohorts:{stages:BETA_COHORT_STAGES,readiness:state.cohortReadiness,items:state.cohorts},
            go_no_go:state.assessment,
            decisions:state.decisions
        });
    }catch(error){safeLogError("Release Operations Fehler:",error);return res.status(500).json({ok:false,error:"Release Operations konnten nicht geladen werden."});}
});

app.post("/api/admin/creator-suite/release-acceptance",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const item=sanitizeAcceptance(req.body||{},{releaseVersion:PRODUCTION_EVIDENCE_RELEASE_VERSION});
        const result=await pool.query(`
            INSERT INTO creator_release_acceptances(protocol,release_version,environment,target,reference,status,step_results,notes,created_by,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,NOW(),NOW())
            RETURNING *
        `,[item.protocol,item.release_version,item.environment,item.target,item.reference,item.status,JSON.stringify(item.step_results),item.notes,req.creatorAccount.id]);
        return res.status(201).json({ok:true,acceptance:publicAcceptance(result.rows[0])});
    }catch(error){
        const msg=String(error?.message||"");
        if(msg.includes("Acceptance")||msg.includes("Protokoll"))return res.status(400).json({ok:false,error:msg});
        safeLogError("Release Acceptance Fehler:",error);return res.status(500).json({ok:false,error:"Release Acceptance konnte nicht gespeichert werden."});
    }
});

app.post("/api/admin/creator-suite/release-cohorts",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const item=sanitizeCohort(req.body||{},{releaseVersion:PRODUCTION_EVIDENCE_RELEASE_VERSION});
        const result=await pool.query(`
            INSERT INTO creator_release_cohorts(release_version,name,stage,target_testers,status,notes,created_by,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING *
        `,[item.release_version,item.name,item.stage,item.target_testers,item.status,item.notes,req.creatorAccount.id]);
        return res.status(201).json({ok:true,cohort:result.rows[0]});
    }catch(error){safeLogError("Release Cohort Fehler:",error);return res.status(500).json({ok:false,error:"Release Cohort konnte nicht erstellt werden."});}
});

app.put("/api/admin/creator-suite/release-cohorts/:id",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const existing=(await pool.query(`SELECT * FROM creator_release_cohorts WHERE id=$1 AND release_version=$2`,[req.params.id,PRODUCTION_EVIDENCE_RELEASE_VERSION])).rows[0];
        if(!existing)return res.status(404).json({ok:false,error:"Release Cohort nicht gefunden."});
        const item=sanitizeCohort({...existing,...req.body,release_version:PRODUCTION_EVIDENCE_RELEASE_VERSION},{releaseVersion:PRODUCTION_EVIDENCE_RELEASE_VERSION});
        const result=await pool.query(`UPDATE creator_release_cohorts SET name=$2,stage=$3,target_testers=$4,status=$5,notes=$6,updated_at=NOW() WHERE id=$1 RETURNING *`,[existing.id,item.name,item.stage,item.target_testers,item.status,item.notes]);
        return res.json({ok:true,cohort:result.rows[0]});
    }catch(error){return res.status(500).json({ok:false,error:"Release Cohort konnte nicht aktualisiert werden."});}
});

app.put("/api/admin/creator-suite/release-cohorts/:id/members/:creatorId",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const cohort=(await pool.query(`SELECT id FROM creator_release_cohorts WHERE id=$1 AND release_version=$2`,[req.params.id,PRODUCTION_EVIDENCE_RELEASE_VERSION])).rows[0];
        if(!cohort)return res.status(404).json({ok:false,error:"Release Cohort nicht gefunden."});
        const item=sanitizeMember({...req.body,creator_id:req.params.creatorId});
        const creator=(await pool.query(`SELECT id FROM creator_accounts WHERE id=$1`,[item.creator_id])).rows[0];
        if(!creator)return res.status(404).json({ok:false,error:"Creator nicht gefunden."});
        const result=await pool.query(`
            INSERT INTO creator_release_cohort_members(cohort_id,creator_id,status,sessions_required,notes,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,NOW(),NOW())
            ON CONFLICT(cohort_id,creator_id) DO UPDATE SET status=EXCLUDED.status,sessions_required=EXCLUDED.sessions_required,notes=EXCLUDED.notes,updated_at=NOW()
            RETURNING *
        `,[cohort.id,item.creator_id,item.status,item.sessions_required,item.notes]);
        return res.json({ok:true,member:result.rows[0]});
    }catch(error){
        const msg=String(error?.message||"");
        if(msg.includes("Creator-ID"))return res.status(400).json({ok:false,error:msg});
        return res.status(500).json({ok:false,error:"Cohort-Mitglied konnte nicht aktualisiert werden."});
    }
});

app.post("/api/admin/creator-suite/release-decisions",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const state=await loadReleaseOperationsState();
        const item=sanitizeDecision(req.body||{},state.assessment);
        const snapshot={
            go_no_go:state.assessment,
            production:{score:state.production.readiness.score,blocking:state.production.readiness.blocking},
            cohorts:state.cohortReadiness,
            acceptances:Object.fromEntries(Object.entries(state.latestAcceptances).map(([key,value])=>[key,value?{id:value.id,status:value.status,evaluation:value.evaluation}:null]))
        };
        const result=await pool.query(`
            INSERT INTO creator_release_decisions(release_version,recommendation,decision,rationale,snapshot,created_by,created_at)
            VALUES($1,$2,$3,$4,$5::jsonb,$6,NOW()) RETURNING *
        `,[PRODUCTION_EVIDENCE_RELEASE_VERSION,state.assessment.recommendation,item.decision,item.rationale,JSON.stringify(snapshot),req.creatorAccount.id]);
        return res.status(201).json({ok:true,decision:result.rows[0]});
    }catch(error){
        const msg=String(error?.message||"");
        if(msg.includes("Entscheidung")||msg.includes("GO ist blockiert"))return res.status(400).json({ok:false,error:msg});
        safeLogError("Go/No-Go Decision Fehler:",error);return res.status(500).json({ok:false,error:"Go/No-Go Entscheidung konnte nicht gespeichert werden."});
    }
});

app.get("/api/admin/creator-suite/billing-center",requireCreatorAccount,requireCreatorAdmin,requireCreatorAdminSensitiveRead,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const subscriptions=(await pool.query(`SELECT b.creator_id,b.provider,b.plan,b.status,b.current_period_end,b.grace_ends_at,b.cancel_at_period_end,b.last_invoice_status,b.updated_at,c.display_name,c.email FROM creator_billing_subscriptions b JOIN creator_accounts c ON c.id=b.creator_id ORDER BY b.updated_at DESC LIMIT 250`)).rows.map(row=>({...publicBillingSubscription(row),creator_id:row.creator_id,creator:{display_name:row.display_name||"Creator",email:row.email||""},updated_at:row.updated_at||null}));
        const events=(await pool.query(`SELECT event_id,event_type,creator_id,event_created,livemode,outcome,summary,processed_at FROM creator_billing_events ORDER BY processed_at DESC LIMIT 100`)).rows;
        return res.json({ok:true,generated_at:new Date().toISOString(),config:BILLING_CONFIG,subscriptions,events});
    }catch(error){return res.status(500).json({ok:false,error:"Billing Center konnte nicht geladen werden."});}
});

app.put("/api/admin/creator-suite/beta-feedback/:id",requireCreatorAccount,requireCreatorAdmin,async(req,res)=>{
    try{
        const status=BETA_FEEDBACK_STATUSES.has(String(req.body?.status||""))?String(req.body.status):"new";
        const result=await pool.query(`UPDATE creator_beta_feedback SET status=$2,admin_notes=$3,updated_at=NOW() WHERE id=$1 RETURNING *`,[betaText(req.params.id,120,""),status,betaText(req.body?.admin_notes,5000,"")]);
        if(!result.rows[0])return res.status(404).json({ok:false,error:"Feedback nicht gefunden."});
        return res.json({ok:true,feedback:publicBetaFeedback(result.rows[0])});
    }catch(error){return res.status(500).json({ok:false,error:"Feedback konnte nicht aktualisiert werden."})}
});

app.get(
    "/api/admin/creator-suite/overview",
    requireCreatorAccount,
    requireCreatorAdmin,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try {
            const sensitiveDetailsUnlocked=creatorAdminSensitiveDetailsUnlocked(req);
            const result=await pool.query(`
                WITH widget_counts AS (
                    SELECT creator_id,
                           COUNT(*)::int AS widgets_total,
                           COUNT(*) FILTER (WHERE status='live')::int AS widgets_live
                    FROM creator_widgets GROUP BY creator_id
                ),
                scene_counts AS (
                    SELECT creator_id,
                           COUNT(*)::int AS scenes_total,
                           COUNT(*) FILTER (WHERE status='live')::int AS scenes_live
                    FROM creator_widget_scenes GROUP BY creator_id
                ),
                bridge_latest AS (
                    SELECT DISTINCT ON (creator_id)
                           creator_id,status AS bridge_status,client_version,
                           machine_name,last_seen_at,last_connected_at
                    FROM creator_live_bridges
                    ORDER BY creator_id,last_seen_at DESC NULLS LAST,created_at DESC
                )
                SELECT
                    c.id,c.email,c.display_name,c.plan,c.status,c.created_at,c.updated_at,
                    t.connected AS tiktok_connected,t.display_name AS tiktok_display_name,
                    t.avatar_url,t.follower_count,t.likes_count,t.video_count,
                    t.updated_at AS tiktok_updated_at,
                    COALESCE(w.widgets_total,0) AS widgets_total,
                    COALESCE(w.widgets_live,0) AS widgets_live,
                    COALESCE(s.scenes_total,0) AS scenes_total,
                    COALESCE(s.scenes_live,0) AS scenes_live,
                    b.bridge_status,b.client_version,b.machine_name,
                    b.last_seen_at AS bridge_last_seen_at,
                    b.last_connected_at AS bridge_last_connected_at,
                    live.connected AS live_connected,live.provider AS live_provider,
                    live.last_event_at,live.updated_at AS live_updated_at,
                    beta.status AS beta_status,beta.notes AS beta_notes,
                    beta.created_at AS beta_created_at,beta.updated_at AS beta_updated_at
                FROM creator_accounts c
                LEFT JOIN tiktok_connections t ON t.creator_id=c.id
                LEFT JOIN widget_counts w ON w.creator_id=c.id
                LEFT JOIN scene_counts s ON s.creator_id=c.id
                LEFT JOIN bridge_latest b ON b.creator_id=c.id
                LEFT JOIN creator_live_state live ON live.creator_id=c.id
                LEFT JOIN creator_beta_testers beta ON beta.creator_id=c.id
                ORDER BY c.created_at DESC
                LIMIT 500
            `);

            const now=Date.now();
            const creators=result.rows.map(row=>{
                const readiness=creatorReadiness(row,now);
                return{
                    id:row.id,email:sensitiveDetailsUnlocked?row.email:"",display_name:row.display_name,
                    plan:normalizePlan(row.plan),status:row.status,created_at:row.created_at,updated_at:row.updated_at,
                    tiktok:{
                        connected:Boolean(row.tiktok_connected),display_name:row.tiktok_display_name||"",avatar_url:row.avatar_url||"",
                        followers:Number(row.follower_count||0),likes:Number(row.likes_count||0),videos:Number(row.video_count||0),updated_at:row.tiktok_updated_at||null,
                        sync:readiness.sync
                    },
                    launcher:{
                        status:row.bridge_status||"",client_version:row.client_version||"",machine_name:sensitiveDetailsUnlocked?(row.machine_name||""):"",
                        last_seen_at:row.bridge_last_seen_at||null,last_connected_at:row.bridge_last_connected_at||null,
                        connection:readiness.bridge
                    },
                    widgets:{total:Number(row.widgets_total||0),live:Number(row.widgets_live||0)},
                    scenes:{total:Number(row.scenes_total||0),live:Number(row.scenes_live||0)},
                    live:{connected:Boolean(row.live_connected),provider:row.live_provider||"none",last_event_at:row.last_event_at||null,updated_at:row.live_updated_at||null},
                    beta:{status:row.beta_status||"none",notes:sensitiveDetailsUnlocked?(row.beta_notes||""):"",created_at:row.beta_created_at||null,updated_at:row.beta_updated_at||null},
                    readiness:{score:readiness.score,checks:readiness.checks}
                };
            });

            return res.json({
                ok:true,
                generated_at:new Date().toISOString(),
                privacy:{sensitive_details_unlocked:sensitiveDetailsUnlocked,redacted_fields:sensitiveDetailsUnlocked?[]:["creator.email","launcher.machine_name","beta.notes"]},
                summary:{
                    creators:creators.length,
                    tiktok_connected:creators.filter(c=>c.tiktok.connected).length,
                    sync_fresh:creators.filter(c=>c.tiktok.sync.key==="fresh").length,
                    launcher_online:creators.filter(c=>c.launcher.connection.key==="online").length,
                    beta_active:creators.filter(c=>c.beta.status==="active").length,
                    live_now:creators.filter(c=>c.live.connected).length
                },
                creators
            });
        }catch(error){
            safeLogError("Creator Admin Overview Fehler:",error);
            return res.status(500).json({ok:false,error:"Creator Übersicht konnte nicht geladen werden."});
        }
    }
);

app.put(
    "/api/admin/creator-suite/creators/:id/beta",
    requireCreatorAccount,
    requireCreatorAdmin,
    async(req,res)=>{
        try {
            const creatorId=studioText(req.params.id,120,"");
            const status=["none","active","paused"].includes(String(req.body?.status||""))?String(req.body.status):"none";
            const notes=studioText(req.body?.notes,1200,"");
            const exists=await pool.query(`SELECT id FROM creator_accounts WHERE id=$1 LIMIT 1`,[creatorId]);
            if(!exists.rowCount)return res.status(404).json({ok:false,error:"Creator nicht gefunden."});
            if(status==="none"){
                await pool.query(`DELETE FROM creator_beta_testers WHERE creator_id=$1`,[creatorId]);
                return res.json({ok:true,beta:{status:"none",notes:""}});
            }
            const result=await pool.query(`
                INSERT INTO creator_beta_testers(creator_id,status,notes,created_at,updated_at)
                VALUES($1,$2,$3,NOW(),NOW())
                ON CONFLICT(creator_id) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes,updated_at=NOW()
                RETURNING status,notes,created_at,updated_at
            `,[creatorId,status,notes]);
            return res.json({ok:true,beta:result.rows[0]});
        }catch(error){
            safeLogError("Beta Status Fehler:",error);
            return res.status(500).json({ok:false,error:"Beta-Status konnte nicht gespeichert werden."});
        }
    }
);

app.post(
    "/api/admin/creator-suite/creators/:id/sync-tiktok",
    requireCreatorAccount,
    requireCreatorAdmin,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try {
            const creatorId=studioText(req.params.id,120,"");
            const connection=await getConnection(creatorId);
            if(!connection?.connected)return res.status(409).json({ok:false,error:"Dieser Creator hat TikTok noch nicht verbunden."});
            const profile=await fetchTikTokProfile(creatorId);
            return res.json({ok:true,profile});
        }catch(error){
            const diagnostic=getSafeDiagnostic(error,"admin_creator_sync");
            return res.status(502).json({ok:false,error:diagnosticMessage(diagnostic),diagnostic});
        }
    }
);

// ============================================================
// V28 — CREATOR GAMES RUNTIME
// ============================================================
app.get("/api/creator/games/rules",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const access=await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");
        return res.json({ok:true,rules:await listCreatorGameRules(req.creatorAccount.id),recent_hits:await recentCreatorGameRuleHits(req.creatorAccount.id,25),limits:{max_rules:Number(access.entitlements.max_game_rules||0)}});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Game-Regeln konnten nicht geladen werden."))}
});
app.post("/api/creator/games/rules",requireCreatorAccount,async(req,res)=>{
    try{
        const access=await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");
        const max=Number(access.entitlements.max_game_rules||0);
        const clean=sanitizeGameRule(req.body||{});
        const result=await withCreatorResourceLock(req.creatorAccount.id,async client=>{
            const count=await client.query(`SELECT COUNT(*)::int AS count FROM creator_game_rules WHERE creator_id=$1`,[req.creatorAccount.id]);
            if(Number(count.rows[0]?.count||0)>=max)throw creatorResourceLimitError(`Dein Zugriff erlaubt maximal ${max} Game-Regeln.`,"game_rule_limit");
            return client.query(`INSERT INTO creator_game_rules(creator_id,label,enabled,event_type,team,points,amount_mode,min_amount,gift_name,gift_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *`,[req.creatorAccount.id,clean.label,clean.enabled,clean.event_type,clean.team,clean.points,clean.amount_mode,clean.min_amount,clean.gift_name,clean.gift_id]);
        });
        return res.status(201).json({ok:true,rule:publicGameRule(result.rows[0])});
    }catch(error){const status=error?.code==="creator_feature_locked"||error?.code==="game_rule_limit"?403:500;return res.status(status).json(clientSafeErrorPayload(req,error,status,"Game-Regel konnte nicht erstellt werden.",{includeCode:true}))}
});
app.put("/api/creator/games/rules/:id",requireCreatorAccount,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");
        const clean=sanitizeGameRule(req.body||{});
        const result=await pool.query(`UPDATE creator_game_rules SET label=$3,enabled=$4,event_type=$5,team=$6,points=$7,amount_mode=$8,min_amount=$9,gift_name=$10,gift_id=$11,updated_at=NOW() WHERE creator_id=$1 AND id=$2 RETURNING *`,[req.creatorAccount.id,req.params.id,clean.label,clean.enabled,clean.event_type,clean.team,clean.points,clean.amount_mode,clean.min_amount,clean.gift_name,clean.gift_id]);
        if(!result.rows[0])return res.status(404).json({ok:false,error:"Game-Regel nicht gefunden."});
        return res.json({ok:true,rule:publicGameRule(result.rows[0])});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Game-Regel konnte nicht gespeichert werden."))}
});
app.delete("/api/creator/games/rules/:id",requireCreatorAccount,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");
        const result=await pool.query(`DELETE FROM creator_game_rules WHERE creator_id=$1 AND id=$2 RETURNING id`,[req.creatorAccount.id,req.params.id]);
        if(!result.rows[0])return res.status(404).json({ok:false,error:"Game-Regel nicht gefunden."});
        return res.json({ok:true});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Game-Regel konnte nicht gelöscht werden."))}
});

app.get("/api/creator/games/runtime",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{const access=await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");return res.json({ok:true,profile:await getCreatorGameProfile(req.creatorAccount.id),runtime:await getCreatorGameRuntimePublic(req.creatorAccount.id,{ensure:true}),access_source:access.access_source})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Game Runtime konnte nicht geladen werden."))}
});
app.post("/api/creator/games/runtime/start",requireCreatorAccount,async(req,res)=>{try{await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");return res.json({ok:true,runtime:await startCreatorGameRuntime(req.creatorAccount.id)})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:400,"Game konnte nicht gestartet werden."))}});
app.post("/api/creator/games/runtime/stop",requireCreatorAccount,async(req,res)=>{try{await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");return res.json({ok:true,runtime:await stopCreatorGameRuntime(req.creatorAccount.id)})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:400,"Game konnte nicht gestoppt werden."))}});
app.post("/api/creator/games/runtime/reset",requireCreatorAccount,async(req,res)=>{try{await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");return res.json({ok:true,runtime:await resetCreatorGameRuntime(req.creatorAccount.id)})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:400,"Game konnte nicht zurückgesetzt werden."))}});
app.post("/api/creator/games/runtime/score",requireCreatorAccount,async(req,res)=>{try{await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");return res.json({ok:true,runtime:await scoreCreatorGameRuntime(req.creatorAccount.id,req.body||{})})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:error?.code==="game_not_running"?409:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:error?.code==="game_not_running"?409:400,"Game Score konnte nicht geändert werden."))}});
app.post("/api/creator/games/runtime/rotate-public-token",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"games","creator");
        const current=await getCreatorGameRuntimeRow(req.creatorAccount.id,{ensure:true});
        if(!current)return res.status(404).json({ok:false,error:"Game Runtime nicht gefunden."});
        const result=await pool.query(
            `UPDATE creator_game_runtime
             SET public_token=$2,version=version+1,updated_at=NOW()
             WHERE creator_id=$1
             RETURNING *`,
            [req.creatorAccount.id,gamePublicToken()]
        );
        await recordSecurityEvent(req.creatorAccount.id,"public_output_token_rotated");
        return res.json({ok:true,rotated:true,runtime:publicGameRuntime(result.rows[0],APP_BASE_URL)});
    }catch(error){
        return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Game Output URL konnte nicht erneuert werden."));
    }
});

app.get("/api/games/runtime/:token",publicRuntimeIpLimiter,studioPublicReadLimiter,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{const payload=await getPublicGameRuntimeByToken(req.params.token);if(!payload)return res.status(404).json({ok:false,error:"Game Runtime nicht gefunden."});return res.json({ok:true,...payload,server_time:new Date().toISOString()})}
    catch(error){return res.status(500).json({ok:false,error:"Game Runtime konnte nicht geladen werden."})}
});

// ============================================================
// V28 — CUT STUDIO PROJECTS / CLIP QUEUE
// ============================================================
app.get("/api/creator/cut-studio/projects",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{const access=await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");return res.json({ok:true,projects:await listCutProjects(req.creatorAccount.id),formats:Object.values(CUT_FORMATS),limits:{max_projects:Number(access.entitlements.max_cut_projects||0),max_clips_per_project:Number(access.entitlements.max_cut_clips_per_project||0)}})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut Studio Projekte konnten nicht geladen werden."))}
});
app.post("/api/creator/cut-studio/projects",requireCreatorAccount,async(req,res)=>{
    try{
        const access=await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        const clean=sanitizeCutProject(req.body||{});
        const result=await createCutProjectWithLimit(req.creatorAccount.id,clean,Number(access.entitlements.max_cut_projects||0));
        return res.status(201).json({ok:true,project:publicCutProject(result.rows[0],0)});
    }catch(error){
        const status=error?.code==="creator_feature_locked"||error?.code==="cut_project_limit"?403:500;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Cut-Projekt konnte nicht erstellt werden.",{includeCode:true}));
    }
});
app.get("/api/creator/cut-studio/projects/:id/audition-runtime",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");const owned=await getCutProject(req.creatorAccount.id,req.params.id);if(!owned)return res.status(404).json({ok:false,error:"Cut-Projekt nicht gefunden."});return res.json({ok:true,runtime:await getCutAuditionRuntime(req.creatorAccount.id,req.params.id),server_time:new Date().toISOString()})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Audition Clock konnte nicht geladen werden."))}
});
app.get("/api/creator/cut-studio/projects/:id",requireCreatorAccount,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");const data=await getCutProject(req.creatorAccount.id,req.params.id);if(!data)return res.status(404).json({ok:false,error:"Cut-Projekt nicht gefunden."});return res.json({ok:true,...data})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut-Projekt konnte nicht geladen werden."))}
});
app.put("/api/creator/cut-studio/projects/:id",requireCreatorAccount,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");const clean=sanitizeCutProject(req.body||{});
        const result=await pool.query(`UPDATE creator_cut_projects SET title=$3,status=$4,format=$5,notes=$6,source_name=$7,export_preset=$8::jsonb,updated_at=NOW() WHERE creator_id=$1 AND id=$2 RETURNING *`,[req.creatorAccount.id,req.params.id,clean.title,clean.status,clean.format,clean.notes,clean.source_name,JSON.stringify(clean.export_preset)]);
        if(!result.rows[0])return res.status(404).json({ok:false,error:"Cut-Projekt nicht gefunden."});
        const count=await pool.query(`SELECT COUNT(*)::int AS count FROM creator_cut_clips WHERE project_id=$1`,[req.params.id]);
        return res.json({ok:true,project:publicCutProject(result.rows[0],count.rows[0]?.count||0)});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut-Projekt konnte nicht gespeichert werden."))}
});
app.delete("/api/creator/cut-studio/projects/:id",requireCreatorAccount,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");const result=await pool.query(`DELETE FROM creator_cut_projects WHERE creator_id=$1 AND id=$2 RETURNING id`,[req.creatorAccount.id,req.params.id]);if(!result.rows[0])return res.status(404).json({ok:false,error:"Cut-Projekt nicht gefunden."});return res.json({ok:true})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut-Projekt konnte nicht gelöscht werden."))}
});
app.post("/api/creator/cut-studio/projects/:id/clips",requireCreatorAccount,async(req,res)=>{
    try{
        const access=await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        const requested=sanitizeCutClip(req.body||{});
        const result=await createCutClipWithLimit(req.creatorAccount.id,req.params.id,requested,Number(access.entitlements.max_cut_clips_per_project||0));
        return res.status(201).json({ok:true,clip:publicCutClip(result.rows[0])});
    }catch(error){
        const status=error?.code==="creator_feature_locked"||error?.code==="cut_clip_limit"?403:error?.code==="cut_project_missing"?404:500;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Clip konnte nicht hinzugefügt werden.",{includeCode:true}));
    }
});
app.put("/api/creator/cut-studio/projects/:projectId/clips/order",requireCreatorAccount,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        const ids=Array.isArray(req.body?.clip_ids)?req.body.clip_ids.map(id=>studioText(id,120,"")).filter(Boolean):[];
        if(!ids.length)return res.status(400).json({ok:false,error:"Timeline-Reihenfolge fehlt."});
        if(new Set(ids).size!==ids.length)return res.status(400).json({ok:false,error:"Timeline enthält doppelte Clip-IDs."});
        const owned=await pool.query(`SELECT id FROM creator_cut_clips WHERE creator_id=$1 AND project_id=$2`,[req.creatorAccount.id,req.params.projectId]);
        const ownedSet=new Set(owned.rows.map(row=>String(row.id)));
        if(ids.length!==ownedSet.size||ids.some(id=>!ownedSet.has(String(id))))return res.status(400).json({ok:false,error:"Timeline muss alle Clips dieses Projekts genau einmal enthalten."});
        const client=await pool.connect();
        try{
            await client.query("BEGIN");
            for(let i=0;i<ids.length;i++){
                await client.query(`UPDATE creator_cut_clips SET sort_order=$4,updated_at=NOW() WHERE creator_id=$1 AND project_id=$2 AND id=$3`,[req.creatorAccount.id,req.params.projectId,ids[i],i]);
            }
            await client.query(`UPDATE creator_cut_projects SET updated_at=NOW() WHERE creator_id=$1 AND id=$2`,[req.creatorAccount.id,req.params.projectId]);
            await client.query("COMMIT");
        }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
        const data=await getCutProject(req.creatorAccount.id,req.params.projectId);
        return res.json({ok:true,clips:data?.clips||[]});
    }catch(error){
        return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Timeline konnte nicht gespeichert werden."));
    }
});

app.put("/api/creator/cut-studio/projects/:projectId/clips/:clipId",requireCreatorAccount,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");const clean=sanitizeCutClip(req.body||{});
        const result=await pool.query(`UPDATE creator_cut_clips SET label=$4,in_ms=$5,out_ms=$6,caption=$7,selected=$8,caption_enabled=$9,caption_position=$10,caption_size=$11,caption_style=$12,audio_gain_db=$13,audio_fade_in_ms=$14,audio_fade_out_ms=$15,keyframe_enabled=$16,keyframe_zoom_start=$17,keyframe_zoom_end=$18,keyframe_pan_x_start=$19,keyframe_pan_x_end=$20,keyframe_pan_y_start=$21,keyframe_pan_y_end=$22,keyframe_easing=$23,visual_keyframes=$24::jsonb,updated_at=NOW() WHERE creator_id=$1 AND project_id=$2 AND id=$3 RETURNING *`,[req.creatorAccount.id,req.params.projectId,req.params.clipId,clean.label,clean.in_ms,clean.out_ms,clean.caption,clean.selected,clean.caption_enabled,clean.caption_position,clean.caption_size,clean.caption_style,clean.audio_gain_db,clean.audio_fade_in_ms,clean.audio_fade_out_ms,clean.keyframe_enabled,clean.keyframe_zoom_start,clean.keyframe_zoom_end,clean.keyframe_pan_x_start,clean.keyframe_pan_x_end,clean.keyframe_pan_y_start,clean.keyframe_pan_y_end,clean.keyframe_easing,JSON.stringify(clean.visual_keyframes||[])]);
        if(!result.rows[0])return res.status(404).json({ok:false,error:"Clip nicht gefunden."});
        await pool.query(`UPDATE creator_cut_projects SET updated_at=NOW() WHERE creator_id=$1 AND id=$2`,[req.creatorAccount.id,req.params.projectId]);
        return res.json({ok:true,clip:publicCutClip(result.rows[0])});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Clip konnte nicht gespeichert werden."))}
});
app.delete("/api/creator/cut-studio/projects/:projectId/clips/:clipId",requireCreatorAccount,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");const result=await pool.query(`DELETE FROM creator_cut_clips WHERE creator_id=$1 AND project_id=$2 AND id=$3 RETURNING id`,[req.creatorAccount.id,req.params.projectId,req.params.clipId]);if(!result.rows[0])return res.status(404).json({ok:false,error:"Clip nicht gefunden."});await pool.query(`UPDATE creator_cut_projects SET updated_at=NOW() WHERE creator_id=$1 AND id=$2`,[req.creatorAccount.id,req.params.projectId]);return res.json({ok:true})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Clip konnte nicht gelöscht werden."))}
});


// ============================================================
// CFS STREAM STUDIO - CREATOR CONTROL API
// ============================================================

app.get("/api/creator/stream-studio",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const creatorId=req.creatorAccount.id;
        const context=await streamStudioSourceContext(creatorId,req.creatorAccount);
        const settingsData=await getCreatorSettings(creatorId);
        const multistreamLimit=streamStudioMultistreamLimit(context.access);
        const config=sanitizeStreamStudioConfig(settingsData.settings?.stream_studio||{},context.liveSceneIds,context.liveSourceIds,multistreamLimit,context.ownedSceneIds);
        const allWidgets=(await listStudioWidgets(creatorId)).map(publicStudioWidgetRow);
        const byId=new Map(allWidgets.map(widget=>[String(widget.id),publicStreamStudioSource(widget)]));
        for(const source of context.sceneSources){if(!byId.has(String(source.id)))byId.set(String(source.id),publicStreamStudioSource(source));}
        return res.json({
            ok:true,
            config,
            settings:settingsData.settings||{},
            access:context.access,
            scenes:context.sceneRows.map(row=>publicSceneRow(row,APP_BASE_URL)),
            widgets:[...byId.values()],
            registry:studioWidgetRegistryPublic(req.creatorAccount.plan,context.access.entitlements),
            launcher_devices:await listCreatorLauncherDevices(creatorId),
            runtime:await getCreatorStreamStudioRuntime(creatorId),
            multistream:{max_destinations:multistreamLimit,mode:"launcher_local",cloud_relay:false,credentials:"launcher_local_only"},
            engine:{capture:"launcher_local",cloud_media:false,stream_keys:"launcher_only",multistream:"launcher_local",protocol:2}
        });
    }catch(error){safeLogError("Stream Studio Laden Fehler:",error);return res.status(500).json({ok:false,error:"Stream Studio konnte nicht geladen werden."});}
});

app.get("/api/creator/stream-studio/runtime",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{return res.json({ok:true,runtime:await getCreatorStreamStudioRuntime(req.creatorAccount.id)});}
    catch(error){safeLogError("Stream Studio Runtime Fehler:",error);return res.status(500).json({ok:false,error:"Stream Runtime konnte nicht geladen werden."});}
});

app.put("/api/creator/stream-studio",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const creatorId=req.creatorAccount.id;
        const context=await streamStudioSourceContext(creatorId,req.creatorAccount);
        const multistreamLimit=streamStudioMultistreamLimit(context.access);
        const requestedDestinations=requestedStreamStudioDestinationCount(req.body?.config||{});
        if(requestedDestinations>multistreamLimit){
            const requiredPlan=requestedDestinations>2?"pro":"creator";
            return res.status(403).json({
                ...accessDeniedPayload(context.access,"multistream",requiredPlan),
                max_destinations:multistreamLimit,
                requested_destinations:requestedDestinations,
                error:`Dein aktueller Zugriff erlaubt maximal ${multistreamLimit} gleichzeitige Streaming-Ziele.`
            });
        }
        const config=sanitizeStreamStudioConfig(req.body?.config||{},context.liveSceneIds,context.liveSourceIds,multistreamLimit,context.ownedSceneIds);
        const current=await getCreatorSettings(creatorId);
        const nextSettings={...(current.settings||{}),stream_studio:config};
        const saved=await saveCreatorSettings(creatorId,nextSettings);
        return res.json({ok:true,config,settings:saved.settings,multistream:{max_destinations:multistreamLimit,mode:"launcher_local",credentials:"launcher_local_only"},updated_at:saved.updated_at});
    }catch(error){safeLogError("Stream Studio Speichern Fehler:",error);return res.status(500).json({ok:false,error:"Stream Studio Einstellungen konnten nicht gespeichert werden."});}
});

app.get(
    "/api/creator/widget-studio/scenes",
    requireCreatorAccount,
    async(req,res)=>{
        try{
            const access=await creatorAccessProfile(req.creatorAccount);
            const result=await pool.query(`SELECT * FROM creator_widget_scenes WHERE creator_id=$1 ORDER BY updated_at DESC`,[req.creatorAccount.id]);
            return res.json({
                ok:true,access,entitlements:access.entitlements,limits:{max_scenes:access.entitlements.max_scenes},
                profiles:Object.values(SCENE_PROFILES),
                scenes:result.rows.map(row=>publicSceneRow(row,APP_BASE_URL)),
                widgets:(await getCreatorSceneSources(req.creatorAccount.id,{includeGame:Boolean(access.entitlements.games)}))
                    .filter(widget=>widget.status==="live")
                    .map(widget=>({
                        id:widget.id,
                        name:widget.name,
                        widget_type:widget.widget_type,
                        source_url:widget.source_url,
                        source_urls:widget.source_urls||{},
                        canvas:widget.published_config?.canvas||{width:600,height:120}
                    }))
            });
        }catch(error){safeLogError("Scene Liste Fehler:",error);return res.status(500).json({ok:false,error:"Scenes konnten nicht geladen werden."})}
    }
);

app.post(
    "/api/creator/widget-studio/scenes",
    requireCreatorAccount,
    async(req,res)=>{
        try{
            const access=await creatorAccessProfile(req.creatorAccount);
            const maxScenes=Number(access.entitlements.max_scenes||0);
            const name=studioText(req.body?.name,120,"Neue Scene");
            const config=sanitizeSceneConfig(req.body?.config||{profile:req.body?.profile||"tiktok_vertical",canvas:{background:"transparent",safe_area:true},items:[]});
            const result=await withCreatorResourceLock(req.creatorAccount.id,async client=>{
                const countResult=await client.query(`SELECT COUNT(*)::int AS count FROM creator_widget_scenes WHERE creator_id=$1`,[req.creatorAccount.id]);
                if(Number(countResult.rows[0]?.count||0)>=maxScenes){
                    throw creatorResourceLimitError(`Dein Zugriff erlaubt maximal ${maxScenes} Scenes.`,"scene_limit");
                }
                return client.query(
                    `INSERT INTO creator_widget_scenes (id,creator_id,name,status,draft_config,public_token) VALUES($1,$2,$3,'draft',$4::jsonb,$5) RETURNING *`,
                    [crypto.randomUUID(),req.creatorAccount.id,name,JSON.stringify(config),scenePublicToken()]
                );
            });
            return res.status(201).json({ok:true,scene:publicSceneRow(result.rows[0],APP_BASE_URL)});
        }catch(error){
            if(error?.code==="scene_limit")return res.status(403).json({...accessDeniedPayload(await creatorAccessProfile(req.creatorAccount),"max_scenes",req.creatorAccount.plan==="free"?"creator":"pro"),code:error.code,error:error.message});
            safeLogError("Scene Create Fehler:",error);return res.status(500).json({ok:false,error:"Scene konnte nicht erstellt werden."});
        }
    }
);

app.put(
    "/api/creator/widget-studio/scenes/:id",
    requireCreatorAccount,
    async(req,res)=>{
        try{
            const existing=await getCreatorSceneRow(req.creatorAccount.id,req.params.id);
            if(!existing)return res.status(404).json({ok:false,error:"Scene nicht gefunden."});
            const access=await creatorAccessProfile(req.creatorAccount);
            const config=sanitizeSceneConfig(req.body?.config||existing.draft_config||{});
            const ownership=validateSceneOwnership(config,await getCreatorSceneSources(req.creatorAccount.id,{includeGame:Boolean(access.entitlements.games)}));
            if(!ownership.ok)return res.status(400).json({ok:false,error:"Scene enthält ungültige oder nicht veröffentlichte Widgets.",scene_errors:ownership.errors});
            const name=studioText(req.body?.name,120,existing.name||"Scene");
            const result=await pool.query(
                `UPDATE creator_widget_scenes SET name=$3,draft_config=$4::jsonb,updated_at=NOW() WHERE creator_id=$1 AND id=$2 RETURNING *`,
                [req.creatorAccount.id,req.params.id,name,JSON.stringify(config)]
            );
            return res.json({ok:true,scene:publicSceneRow(result.rows[0],APP_BASE_URL)});
        }catch(error){safeLogError("Scene Save Fehler:",error);return res.status(500).json({ok:false,error:"Scene konnte nicht gespeichert werden."})}
    }
);

app.post(
    "/api/creator/widget-studio/scenes/:id/publish",
    requireCreatorAccount,
    async(req,res)=>{
        try{
            const existing=await getCreatorSceneRow(req.creatorAccount.id,req.params.id);
            if(!existing)return res.status(404).json({ok:false,error:"Scene nicht gefunden."});
            const access=await creatorAccessProfile(req.creatorAccount);
            const config=sanitizeSceneConfig(existing.draft_config||{});
            if(!Object.values(config.layouts||{default:{items:config.items}}).some(layout=>(layout?.items||[]).length))return res.status(400).json({ok:false,error:"Eine Scene benötigt mindestens eine Widget- oder Launcher-Quelle."});
            const ownership=validateSceneOwnership(config,await getCreatorSceneSources(req.creatorAccount.id,{includeGame:Boolean(access.entitlements.games)}));
            if(!ownership.ok)return res.status(400).json({ok:false,error:"Vor Publish müssen alle Scene-Widgets veröffentlicht sein.",scene_errors:ownership.errors});
            const result=await pool.query(
                `UPDATE creator_widget_scenes SET status='live',published_config=draft_config,version=version+1,published_at=NOW(),updated_at=NOW() WHERE creator_id=$1 AND id=$2 RETURNING *`,
                [req.creatorAccount.id,req.params.id]
            );
            return res.json({ok:true,scene:publicSceneRow(result.rows[0],APP_BASE_URL)});
        }catch(error){safeLogError("Scene Publish Fehler:",error);return res.status(500).json({ok:false,error:"Scene konnte nicht veröffentlicht werden."})}
    }
);

app.post(
    "/api/creator/widget-studio/scenes/:id/rotate-public-token",
    requireCreatorAccount,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const existing=await getCreatorSceneRow(req.creatorAccount.id,req.params.id);
            if(!existing)return res.status(404).json({ok:false,error:"Scene nicht gefunden."});
            const result=await pool.query(
                `UPDATE creator_widget_scenes
                 SET public_token=$3,version=version+1,updated_at=NOW()
                 WHERE creator_id=$1 AND id=$2
                 RETURNING *`,
                [req.creatorAccount.id,existing.id,scenePublicToken()]
            );
            await recordSecurityEvent(req.creatorAccount.id,"public_output_token_rotated");
            return res.json({ok:true,rotated:true,scene:publicSceneRow(result.rows[0],APP_BASE_URL)});
        }catch(error){
            safeLogError("Scene Output Token Rotation Fehler:",error);
            return res.status(500).json({ok:false,error:"Scene Output URL konnte nicht erneuert werden."});
        }
    }
);


app.delete(
    "/api/creator/widget-studio/scenes/:id",
    requireCreatorAccount,
    async(req,res)=>{
        try{
            const result=await pool.query(`DELETE FROM creator_widget_scenes WHERE creator_id=$1 AND id=$2 RETURNING id`,[req.creatorAccount.id,req.params.id]);
            if(!result.rows[0])return res.status(404).json({ok:false,error:"Scene nicht gefunden."});
            return res.json({ok:true});
        }catch(error){safeLogError("Scene Delete Fehler:",error);return res.status(500).json({ok:false,error:"Scene konnte nicht gelöscht werden."})}
    }
);

app.get(
    "/api/widgets/scene/:token",
    publicRuntimeIpLimiter,
    studioPublicReadLimiter,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const token=studioText(req.params.token,160,""),row=await getPublicSceneRow(token);
            if(!row)return res.status(404).json({ok:false,error:"Scene nicht gefunden."});
            return res.json({ok:true,...(await hydratePublicScene(row)),server_time:new Date().toISOString()});
        }catch(error){safeLogError("Public Scene Fehler:",error);return res.status(500).json({ok:false,error:"Scene konnte nicht geladen werden."})}
    }
);


app.post(
    "/api/launcher/device-link/start",
    launcherDeviceStartLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const link=await createLauncherDeviceLink({
                machine_name:req.body?.machine_name,
                client_version:req.body?.client_version,
                credential_delivery:req.body?.credential_delivery
            });
            return res.status(201).json({ok:true,...link});
        } catch (error) {
            safeLogError("Launcher Device Link Start Fehler:",error);
            return res.status(500).json({ok:false,error:"Launcher-Verknüpfung konnte nicht gestartet werden."});
        }
    }
);

app.post(
    "/api/launcher/device-link/poll",
    launcherDevicePollLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            await cleanupLauncherDeviceLinks();
            const link=await getLauncherDeviceLinkBySecret(
                req.body?.device_link_id,
                req.body?.device_secret
            );
            if(!link)return res.status(401).json({ok:false,error:"Geräte-Verknüpfung ist ungültig."});

            if(link.expires_at && new Date(link.expires_at).getTime() <= Date.now()){
                return res.json({
                    ok:true,
                    status:"expired",
                    approved:false,
                    expires_at:link.expires_at,
                    poll_after_ms:LAUNCHER_DEVICE_POLL_AFTER_MS
                });
            }

            if(link.status==="approved"||link.status==="consumed"){
                let consumedAt=link.consumed_at || null;
                if(link.status==="approved"){
                    const consumed=await pool.query(
                        `UPDATE creator_launcher_device_links SET status='consumed',consumed_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='approved' RETURNING consumed_at`,
                        [link.id]
                    );
                    consumedAt=consumed.rows[0]?.consumed_at || consumedAt;
                }
                let bridgeToken="";
                if(shouldDeliverPollCredential({
                    credentialDelivery:link.credential_delivery,
                    status:"consumed",
                    expiresAt:link.expires_at
                })){
                    bridgeToken=deriveBridgeToken(link.id,req.body?.device_secret);
                    if(!bridgeToken||!safeEqualText(hashValue(bridgeToken),String(link.bridge_token_hash||""))){
                        safeLogError("Launcher Device Link Credential Fehler:",new Error("derived_bridge_token_mismatch"));
                        return res.status(401).json({ok:false,error:"Geräte-Zugangsdaten konnten nicht bestätigt werden."});
                    }
                }
                const creator=link.creator_id?await studioCreatorIdentity(link.creator_id):null;
                return res.json({
                    ok:true,
                    status:"approved",
                    approved:true,
                    bridge_id:link.bridge_id || null,
                    ...(bridgeToken?{bridge_token:bridgeToken}:{}),
                    credential_delivery:normalizeCredentialDelivery(link.credential_delivery),
                    consumed_at:consumedAt,
                    creator,
                    poll_after_ms:LAUNCHER_DEVICE_POLL_AFTER_MS
                });
            }

            return res.json({
                ok:true,
                status:link.status || "pending",
                approved:false,
                expires_at:link.expires_at,
                poll_after_ms:LAUNCHER_DEVICE_POLL_AFTER_MS
            });
        } catch (error) {
            safeLogError("Launcher Device Link Poll Fehler:",error);
            return res.status(500).json({ok:false,error:"Verknüpfungsstatus konnte nicht geprüft werden."});
        }
    }
);

app.get(
    "/api/creator/launcher/device-link/:code",
    requireCreatorAccount,
    launcherDeviceCodeInspectLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const code=normalizeDeviceCode(req.params.code);
            if(!code)return res.status(404).json({ok:false,error:"Geräte-Code nicht gefunden."});
            const link=await inspectLauncherDeviceLink(code);
            if(!link)return res.status(404).json({ok:false,error:"Geräte-Code nicht gefunden."});
            return res.json({ok:true,device_link:link});
        } catch (error) {
            return res.status(500).json({ok:false,error:"Geräte-Code konnte nicht geprüft werden."});
        }
    }
);

app.post(
    "/api/creator/launcher/device-link/confirm",
    requireCreatorAccount,
    launcherDeviceConfirmLimiter,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const userCode=launcherDeviceCodeFromRequest(req);
            if(!userCode)return res.status(400).json({ok:false,error:"Bitte einen gültigen Geräte-Code eingeben."});
            const confirmed=await approveLauncherDeviceLink(
                req.creatorAccount.id,
                userCode
            );
            return res.json({
                ok:true,
                confirmed:true,
                device:confirmed,
                account:publicCreatorAccount(req.creatorAccount),
                entitlements:getPlanEntitlements(req.creatorAccount.plan)
            });
        } catch (error) {
            const status = ["device_code_invalid","device_code_expired","device_code_used","device_limit_reached"].includes(error?.code) ? 400 : 500;
            if(status>=500)safeLogError("Launcher Device Link Confirm Fehler:",error);
            return res.status(status).json(clientSafeErrorPayload(req,error,status,"Launcher konnte nicht bestätigt werden."));
        }
    }
);

app.get(
    "/api/creator/launcher/devices",
    requireCreatorAccount,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            return res.json({
                ok:true,
                devices:await listCreatorLauncherDevices(req.creatorAccount.id)
            });
        } catch (error) {
            return res.status(500).json({ok:false,error:"Geräte konnten nicht geladen werden."});
        }
    }
);

app.delete(
    "/api/creator/launcher/devices/:id",
    requireCreatorAccount,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const revoked=await revokeStudioBridgeKey(req.creatorAccount.id,req.params.id);
            if(!revoked)return res.status(404).json({ok:false,error:"Aktives Gerät nicht gefunden."});
            await pool.query(
                `UPDATE creator_launcher_device_links SET status='revoked',revoked_at=NOW(),updated_at=NOW() WHERE bridge_id=$1`,
                [req.params.id]
            );
            return res.json({ok:true,revoked:true});
        } catch (error) {
            return res.status(500).json({ok:false,error:"Gerät konnte nicht widerrufen werden."});
        }
    }
);

// ============================================================
// V29 — CUT EXPORT JOBS
// Nur Manifest/Status in der Cloud. Keine Videodatei.
// ============================================================
app.get("/api/creator/cut-studio/jobs",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const access=await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        return res.json({ok:true,jobs:await listCutExportJobs(req.creatorAccount.id,75),limits:{max_pending_jobs:Number(access.entitlements.max_pending_cut_jobs||0)}});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut-Export-Jobs konnten nicht geladen werden."))}
});
app.post("/api/creator/cut-studio/projects/:id/export-jobs",requireCreatorAccount,async(req,res)=>{
    try{
        const access=await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        return res.status(201).json({ok:true,job:await createCutExportJob(req.creatorAccount.id,req.params.id,access)});
    }catch(error){
        const status=error?.code==="creator_feature_locked"||error?.code==="cut_job_limit"?403:["cut_project_missing","cut_job_empty"].includes(error?.code)?400:500;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Cut-Export-Job konnte nicht erstellt werden."));
    }
});
app.post("/api/creator/cut-studio/projects/:id/audition-jobs",requireCreatorAccount,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        return res.status(201).json({ok:true,job:await createCutAuditionJob(req.creatorAccount.id,req.params.id,req.body||{})});
    }catch(error){
        const status=error?.code==="creator_feature_locked"?403:error?.code==="cut_project_missing"?404:["cut_audition_track","cut_audition_handoff","cut_audition_loop"].includes(error?.code)?400:error?.code==="cut_audition_busy"?409:500;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Timeline-Vorschau konnte nicht angefordert werden."));
    }
});
app.get("/api/creator/cut-studio/projects/:id/audition-inspector/:jobId",requireCreatorAccount,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        const result=await pool.query(`SELECT * FROM creator_cut_export_jobs WHERE creator_id=$1 AND project_id=$2 AND id=$3 AND manifest->>'kind'='cut_audition' AND manifest->'audition'->>'action'='inspect_zero_cross' LIMIT 1`,[req.creatorAccount.id,req.params.id,req.params.jobId]);
        const row=result.rows[0];if(!row)return res.status(404).json({ok:false,error:"Zero-Cross-Analyse nicht gefunden."});
        const clean=row.result&&typeof row.result==="object"?sanitizeCutJobResult(row.result):{};
        return res.json({ok:true,inspector:{job_id:String(row.id),status:String(row.status||"queued"),inspection:clean.zero_cross||null,error:String(row.error_message||""),requested_at:row.requested_at||null,completed_at:row.completed_at||null}});
    }catch(error){const status=error?.code==="creator_feature_locked"?403:500;return res.status(status).json(clientSafeErrorPayload(req,error,status,"Zero-Cross-Analyse konnte nicht geladen werden."))}
});
app.post("/api/creator/cut-studio/jobs/:id/cancel",requireCreatorAccount,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.creatorAccount,"cut_studio","creator");
        return res.json({ok:true,job:await transitionCutExportJob(req.creatorAccount.id,req.params.id,"canceled")});
    }catch(error){
        const status=error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Cut-Export-Job konnte nicht abgebrochen werden."));
    }
});

app.get("/api/bridge/beta/status",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const beta=await getCreatorBetaState(req.studioBridge.creator_id);
        const session=beta.active?await activeBetaSessionForBridge(req.studioBridge.creator_id,req.studioBridge.id):null;
        const recent=beta.active?await pool.query(`SELECT * FROM creator_beta_feedback WHERE creator_id=$1 ORDER BY created_at DESC LIMIT 10`,[req.studioBridge.creator_id]):{rows:[]};
        return res.json({ok:true,beta,active_session:publicBetaSession(session),recent_feedback:recent.rows.map(publicBetaFeedback)});
    }catch(error){return res.status(500).json({ok:false,error:"Beta-Status konnte nicht geladen werden."})}
});
app.post("/api/bridge/beta/session/start",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        await requireActiveBetaBridge(req.studioBridge);
        const creatorId=req.studioBridge.creator_id,bridgeId=req.studioBridge.id;
        await pool.query(`UPDATE creator_beta_sessions SET status='abandoned',ended_at=NOW(),duration_seconds=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-started_at))::int),updated_at=NOW() WHERE creator_id=$1 AND bridge_id=$2 AND status='active'`,[creatorId,bridgeId]);
        const diagnostics=sanitizeBetaDiagnostics(req.body?.diagnostics||{});
        const result=await pool.query(`INSERT INTO creator_beta_sessions(creator_id,bridge_id,label,launcher_version,platform,provider,status,started_at,output_gate,diagnostics,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'active',NOW(),$7::jsonb,$8::jsonb,NOW(),NOW()) RETURNING *`,[creatorId,bridgeId,betaText(req.body?.label,120,"Beta Test"),betaText(req.body?.launcher_version,80,""),betaText(req.body?.platform,80,""),betaText(req.body?.provider,80,""),JSON.stringify(req.body?.output_gate&&typeof req.body.output_gate==="object"?req.body.output_gate:{}),JSON.stringify(diagnostics)]);
        return res.status(201).json({ok:true,session:publicBetaSession(result.rows[0])});
    }catch(error){return res.status(error?.code==="beta_not_active"?403:500).json({ok:false,error:error?.message||"Beta-Session konnte nicht gestartet werden."})}
});
app.post("/api/bridge/beta/session/end",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        await requireActiveBetaBridge(req.studioBridge);
        const sessionId=betaText(req.body?.session_id,120,"");
        const result=await pool.query(`UPDATE creator_beta_sessions SET status='completed',ended_at=NOW(),duration_seconds=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-started_at))::int),output_gate=$4::jsonb,diagnostics=$5::jsonb,result_summary=$6,updated_at=NOW() WHERE id=$1 AND creator_id=$2 AND bridge_id=$3 AND status='active' RETURNING *`,[sessionId,req.studioBridge.creator_id,req.studioBridge.id,JSON.stringify(req.body?.output_gate&&typeof req.body.output_gate==="object"?req.body.output_gate:{}),JSON.stringify(sanitizeBetaDiagnostics(req.body?.diagnostics||{})),betaText(req.body?.result_summary,2000,"")]);
        if(!result.rows[0])return res.status(404).json({ok:false,error:"Aktive Beta-Session nicht gefunden."});
        return res.json({ok:true,session:publicBetaSession(result.rows[0])});
    }catch(error){return res.status(error?.code==="beta_not_active"?403:500).json({ok:false,error:error?.message||"Beta-Session konnte nicht beendet werden."})}
});
app.post("/api/bridge/beta/feedback",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        await requireActiveBetaBridge(req.studioBridge);
        const title=betaText(req.body?.title,160,"");if(title.length<4)return res.status(400).json({ok:false,error:"Feedback-Titel ist zu kurz."});
        const kind=BETA_FEEDBACK_KINDS.has(String(req.body?.kind||""))?String(req.body.kind):"bug",severity=BETA_FEEDBACK_SEVERITIES.has(String(req.body?.severity||""))?String(req.body.severity):"medium",category=BETA_FEEDBACK_CATEGORIES.has(String(req.body?.category||""))?String(req.body.category):"launcher",sessionId=betaText(req.body?.session_id,120,"")||null;
        if(sessionId){const check=await pool.query(`SELECT id FROM creator_beta_sessions WHERE id=$1 AND creator_id=$2 LIMIT 1`,[sessionId,req.studioBridge.creator_id]);if(!check.rows[0])return res.status(400).json({ok:false,error:"Beta-Session gehört nicht zu diesem Creator."})}
        const result=await pool.query(`INSERT INTO creator_beta_feedback(creator_id,bridge_id,session_id,kind,severity,category,title,description,repro_steps,expected,actual,launcher_version,platform,provider,diagnostics,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,'new',NOW(),NOW()) RETURNING *`,[req.studioBridge.creator_id,req.studioBridge.id,sessionId,kind,severity,category,title,betaText(req.body?.description,5000,""),betaText(req.body?.repro_steps,5000,""),betaText(req.body?.expected,3000,""),betaText(req.body?.actual,3000,""),betaText(req.body?.launcher_version,80,""),betaText(req.body?.platform,80,""),betaText(req.body?.provider,80,""),JSON.stringify(sanitizeBetaDiagnostics(req.body?.diagnostics||{}))]);
        return res.status(201).json({ok:true,feedback:publicBetaFeedback(result.rows[0])});
    }catch(error){return res.status(error?.code==="beta_not_active"?403:500).json({ok:false,error:error?.message||"Beta-Feedback konnte nicht gesendet werden."})}
});

app.get("/api/bridge/games/rules",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{
    try{
        const access=await requireCreatorFeatureAccess(req.studioBridge.creator_id,"games","creator");
        return res.json({ok:true,rules:await listCreatorGameRules(req.studioBridge.creator_id),recent_hits:await recentCreatorGameRuleHits(req.studioBridge.creator_id,15),limits:{max_rules:Number(access.entitlements.max_game_rules||0)}});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Game-Regeln konnten nicht geladen werden."))}
});
app.get("/api/bridge/games/runtime",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"games","creator");return res.json({ok:true,runtime:await getCreatorGameRuntimePublic(req.studioBridge.creator_id,{ensure:true}),profile:await getCreatorGameProfile(req.studioBridge.creator_id)})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Game Runtime konnte nicht geladen werden."))}});
app.post("/api/bridge/games/runtime/start",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"games","creator");return res.json({ok:true,runtime:await startCreatorGameRuntime(req.studioBridge.creator_id)})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:400,"Game konnte nicht gestartet werden."))}});
app.post("/api/bridge/games/runtime/stop",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"games","creator");return res.json({ok:true,runtime:await stopCreatorGameRuntime(req.studioBridge.creator_id)})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:400,"Game konnte nicht gestoppt werden."))}});
app.post("/api/bridge/games/runtime/reset",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"games","creator");return res.json({ok:true,runtime:await resetCreatorGameRuntime(req.studioBridge.creator_id)})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:400,"Game konnte nicht zurückgesetzt werden."))}});
app.post("/api/bridge/games/runtime/score",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"games","creator");return res.json({ok:true,runtime:await scoreCreatorGameRuntime(req.studioBridge.creator_id,req.body||{})})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:error?.code==="game_not_running"?409:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:error?.code==="game_not_running"?409:400,"Game Score konnte nicht geändert werden."))}});
app.post("/api/bridge/cut-studio/audition-runtime",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");const runtime=await updateCutAuditionRuntime(req.studioBridge.creator_id,req.studioBridge.id,req.body||{});return res.json({ok:true,runtime})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:error?.code==="cut_project_missing"?404:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:error?.code==="cut_project_missing"?404:400,"Audition Clock konnte nicht aktualisiert werden."))}
});
app.get("/api/bridge/cut-studio/jobs",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        const access=await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");
        return res.json({ok:true,jobs:await listCutExportJobs(req.studioBridge.creator_id,50,{includeAudition:true}),limits:{max_pending_jobs:Number(access.entitlements.max_pending_cut_jobs||0)}});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut-Export-Jobs konnten nicht geladen werden."))}
});
app.post("/api/bridge/cut-studio/jobs/:id/claim",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");return res.json({ok:true,job:await transitionCutExportJob(req.studioBridge.creator_id,req.params.id,"claimed",{bridgeId:req.studioBridge.id})})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409,"Cut-Job konnte nicht reserviert werden."))}
});
app.post("/api/bridge/cut-studio/jobs/:id/processing",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");return res.json({ok:true,job:await transitionCutExportJob(req.studioBridge.creator_id,req.params.id,"processing",{bridgeId:req.studioBridge.id})})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409,"Cut-Job konnte nicht gestartet werden."))}
});
app.post("/api/bridge/cut-studio/jobs/:id/complete",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");return res.json({ok:true,job:await transitionCutExportJob(req.studioBridge.creator_id,req.params.id,"completed",{bridgeId:req.studioBridge.id,result:req.body?.result||{}})})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409,"Cut-Job konnte nicht abgeschlossen werden."))}
});
app.post("/api/bridge/cut-studio/jobs/:id/fail",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");return res.json({ok:true,job:await transitionCutExportJob(req.studioBridge.creator_id,req.params.id,"failed",{bridgeId:req.studioBridge.id,errorMessage:req.body?.error_message||"Media Engine Fehler"})})}
    catch(error){return res.status(error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409,"Cut-Job konnte nicht als fehlgeschlagen markiert werden."))}
});

app.post("/api/bridge/cut-studio/jobs/:id/retry",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{
        await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");
        const current=(await pool.query(`SELECT * FROM creator_cut_export_jobs WHERE creator_id=$1 AND id=$2 LIMIT 1`,[req.studioBridge.creator_id,req.params.id])).rows[0];
        if(!current)return res.status(404).json({ok:false,error:"Cut-Job nicht gefunden."});
        if(current.bridge_id&&String(current.bridge_id)!==String(req.studioBridge.id))return res.status(409).json({ok:false,error:"Dieser Cut-Job gehört zu einem anderen Launcher."});
        const job=await transitionCutExportJob(req.studioBridge.creator_id,req.params.id,"queued",{bridgeId:req.studioBridge.id,errorMessage:""});
        return res.json({ok:true,job});
    }catch(error){
        const status=error?.code==="creator_feature_locked"?403:error?.code==="cut_job_missing"?404:409;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Cut-Job konnte nicht erneut eingereiht werden."));
    }
});

app.get("/api/bridge/cut-studio/projects",widgetBridgeHeartbeatLimiter,requireStudioBridge,async(req,res)=>{try{const access=await requireCreatorFeatureAccess(req.studioBridge.creator_id,"cut_studio","creator");return res.json({ok:true,projects:await listCutProjects(req.studioBridge.creator_id),limits:{max_projects:Number(access.entitlements.max_cut_projects||0),max_clips_per_project:Number(access.entitlements.max_cut_clips_per_project||0)}})}catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut Studio Projekte konnten nicht geladen werden."))}});

app.post("/api/bridge/cut-studio/projects",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{
        const creatorId=req.studioBridge.creator_id,access=await requireCreatorFeatureAccess(creatorId,"cut_studio","creator");
        const clean=sanitizeCutProject(req.body||{});
        const result=await createCutProjectWithLimit(creatorId,clean,Number(access.entitlements.max_cut_projects||0));
        return res.status(201).json({ok:true,project:publicCutProject(result.rows[0],0)});
    }catch(error){
        const status=error?.code==="creator_feature_locked"||error?.code==="cut_project_limit"?403:500;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Cut-Projekt konnte über den Launcher nicht erstellt werden.",{includeCode:true}));
    }
});

app.put("/api/bridge/cut-studio/projects/:id",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{
        const creatorId=req.studioBridge.creator_id;await requireCreatorFeatureAccess(creatorId,"cut_studio","creator");const clean=sanitizeCutProject(req.body||{});
        const result=await pool.query(`UPDATE creator_cut_projects SET title=$3,status=$4,format=$5,notes=$6,source_name=$7,export_preset=$8::jsonb,updated_at=NOW() WHERE creator_id=$1 AND id=$2 RETURNING *`,[creatorId,req.params.id,clean.title,clean.status,clean.format,clean.notes,clean.source_name,JSON.stringify(clean.export_preset)]);
        if(!result.rows[0])return res.status(404).json({ok:false,error:"Cut-Projekt nicht gefunden."});
        const count=await pool.query(`SELECT COUNT(*)::int AS count FROM creator_cut_clips WHERE project_id=$1`,[req.params.id]);
        return res.json({ok:true,project:publicCutProject(result.rows[0],count.rows[0]?.count||0)});
    }catch(error){return res.status(error?.code==="creator_feature_locked"?403:500).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:500,"Cut-Projekt konnte über den Launcher nicht gespeichert werden."))}
});

app.post("/api/bridge/cut-studio/projects/:id/clips",widgetBridgeEventLimiter,requireStudioBridge,async(req,res)=>{
    try{
        const creatorId=req.studioBridge.creator_id,access=await requireCreatorFeatureAccess(creatorId,"cut_studio","creator");
        const requested=sanitizeCutClip(req.body||{});
        const result=await createCutClipWithLimit(creatorId,req.params.id,requested,Number(access.entitlements.max_cut_clips_per_project||0));
        return res.status(201).json({ok:true,clip:publicCutClip(result.rows[0])});
    }catch(error){
        const status=error?.code==="creator_feature_locked"||error?.code==="cut_clip_limit"?403:error?.code==="cut_project_missing"?404:500;
        return res.status(status).json(clientSafeErrorPayload(req,error,status,"Clip konnte über den Launcher nicht erstellt werden.",{includeCode:true}));
    }
});

app.get(
    "/api/bridge/widget-studio/library",
    widgetBridgeHeartbeatLimiter,
    requireStudioBridge,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const creatorId=req.studioBridge.creator_id;
            const access=await creatorAccessProfile(creatorId);
            const [widgets,scenes,creator,game,cutProjects,gameRules,gameRuleHits,cutJobs]=await Promise.all([
                getCreatorSceneSources(creatorId,{includeGame:Boolean(access.entitlements.games)}),
                pool.query(
                    `SELECT * FROM creator_widget_scenes WHERE creator_id=$1 AND status='live' AND published_config IS NOT NULL ORDER BY updated_at DESC`,
                    [creatorId]
                ),
                studioCreatorIdentity(creatorId),
                access.entitlements.games?getCreatorGameRuntimePublic(creatorId,{ensure:true}):Promise.resolve(null),
                access.entitlements.cut_studio?listCutProjects(creatorId):Promise.resolve([]),
                access.entitlements.games?listCreatorGameRules(creatorId):Promise.resolve([]),
                access.entitlements.games?recentCreatorGameRuleHits(creatorId,10):Promise.resolve([]),
                access.entitlements.cut_studio?listCutExportJobs(creatorId,25,{includeAudition:true}):Promise.resolve([])
            ]);
            return res.json({
                ok:true,creator,access,entitlements:access.entitlements,
                widgets:widgets.filter(widget=>widget.status==="live").map(widget=>({
                    id:widget.id,
                    name:widget.name,
                    widget_type:widget.widget_type,
                    source_url:widget.source_url,
                    source_urls:widget.source_urls||{}
                })),
                scenes:scenes.rows.map(row=>publicSceneRow(row,APP_BASE_URL)),
                game,
                game_rules:gameRules,
                game_rule_hits:gameRuleHits,
                cut_projects:cutProjects,
                cut_jobs:cutJobs,
                server_time:new Date().toISOString()
            });
        } catch (error) {
            return res.status(500).json({ok:false,error:"Creator-Bibliothek konnte nicht geladen werden."});
        }
    }
);


app.post(
    "/api/bridge/widget-studio/widgets/:id/control",
    widgetBridgeEventLimiter,
    requireStudioBridge,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const creatorId = req.studioBridge.creator_id;
            const current = await getStudioWidgetById(creatorId, req.params.id);
            if (!current) return res.status(404).json({ok:false,error:"Widget nicht gefunden."});

            const definition = studioWidgetDefinition(current.widget_type);
            const manualValueControl = definition.mode === "manual_counter" || (definition.source_kind === "manual" && definition.mode === "goal");
            const manualTimerControl = definition.mode === "manual_timer";
            if (!manualValueControl && !manualTimerControl) {
                return res.status(400).json({ok:false,error:"Dieses Widget besitzt keine manuelle Live-Steuerung."});
            }

            const draft = sanitizeStudioWidgetConfig(current.draft_config, current.widget_type);
            const action = String(req.body?.action || "increment");
            const amount = Math.round(studioClamp(req.body?.amount, -1000000, 1000000, 1));

            let next = 0;
            let running = false;
            let updatedAt = null;

            if (manualValueControl) {
                const before = Math.max(0, Math.round(Number(draft.settings?.manualValue || 0)));
                next = before;
                if (action === "reset") next = 0;
                else if (action === "set") next = Math.round(studioClamp(req.body?.value, 0, 1000000000, before));
                else if (action === "increment") next = Math.round(studioClamp(before + amount, 0, 1000000000, before));
                else return res.status(400).json({ok:false,error:"Unbekannte Counter-Aktion."});
                draft.settings.manualValue = next;
            } else {
                const now = Date.now();
                const base = Math.max(0, Math.round(Number(draft.settings?.manualTimerSeconds || 0)));
                const wasRunning = Boolean(draft.settings?.manualTimerRunning);
                const previousUpdatedAt = draft.settings?.manualTimerUpdatedAt ? Date.parse(String(draft.settings.manualTimerUpdatedAt)) : NaN;
                const elapsed = wasRunning && Number.isFinite(previousUpdatedAt)
                    ? Math.max(0, Math.floor((now - previousUpdatedAt) / 1000))
                    : 0;
                const before = Math.min(359999, base + elapsed);
                next = before;
                running = wasRunning;

                if (action === "reset") {
                    next = 0;
                    running = false;
                } else if (action === "start") {
                    running = true;
                } else if (action === "pause") {
                    running = false;
                } else if (action === "toggle") {
                    running = !wasRunning;
                } else if (action === "set") {
                    next = Math.round(studioClamp(req.body?.value, 0, 359999, before));
                } else if (action === "increment") {
                    next = Math.round(studioClamp(before + amount, 0, 359999, before));
                } else {
                    return res.status(400).json({ok:false,error:"Unbekannte Timer-Aktion."});
                }

                updatedAt = new Date(now).toISOString();
                draft.settings.manualTimerSeconds = next;
                draft.settings.manualTimerRunning = running;
                draft.settings.manualTimerUpdatedAt = updatedAt;
            }

            let published = null;
            if (current.status === "live" && current.published_config) {
                published = sanitizeStudioWidgetConfig(current.published_config, current.widget_type);
                if (manualValueControl) {
                    published.settings.manualValue = next;
                } else {
                    published.settings.manualTimerSeconds = next;
                    published.settings.manualTimerRunning = running;
                    published.settings.manualTimerUpdatedAt = updatedAt;
                }
            }

            const result = await pool.query(
                `UPDATE creator_widgets
                 SET draft_config = $3::jsonb,
                     published_config = CASE WHEN $4::text IS NULL THEN published_config ELSE $4::jsonb END,
                     version = version + 1,
                     updated_at = NOW()
                 WHERE creator_id = $1 AND id = $2
                 RETURNING *`,
                [creatorId, current.id, JSON.stringify(draft), published ? JSON.stringify(published) : null]
            );

            return res.json({
                ok:true,
                value:next,
                running,
                widget:publicStudioWidgetRow(result.rows[0])
            });
        } catch (error) {
            safeLogError("Widget Studio Bridge Control Fehler:",error);
            return res.status(500).json({ok:false,error:"Widget konnte über den Launcher nicht gesteuert werden."});
        }
    }
);


app.post(
    "/api/bridge/widget-studio/logout",
    widgetBridgeHeartbeatLimiter,
    requireStudioBridge,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        try {
            const bridgeId=String(req.studioBridge.id);
            const creatorId=String(req.studioBridge.creator_id);
            const revoked=await revokeCurrentStudioBridge(bridgeId,creatorId);
            return res.json({ok:true,revoked});
        } catch (error) {
            return res.status(500).json({ok:false,error:"Launcher konnte nicht abgemeldet werden."});
        }
    }
);


app.get(
    "/api/creator/widget-studio/bridge",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            return res.json({
                ok: true,
                status: await getStudioBridgeStatus(req.creatorAccount.id),
                bridges: await listStudioBridges(req.creatorAccount.id, true),
                live: await getStudioLiveState(req.creatorAccount.id)
            });
        } catch (error) {
            safeLogError("Widget Studio Bridge Status Fehler:",error);
            return res.status(500).json({ ok:false, error:"Bridge-Status konnte nicht geladen werden." });
        }
    }
);

app.post(
    "/api/creator/widget-studio/bridge/keys",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const created = await createStudioBridgeKey(
                req.creatorAccount.id,
                req.body?.label || "Creator Suite Launcher"
            );
            return res.status(201).json({
                ok: true,
                bridge: created.bridge,
                token: created.token,
                warning: "Dieser Bridge-Schlüssel wird nur einmal vollständig angezeigt."
            });
        } catch (error) {
            safeLogError("Widget Studio Bridge Key Fehler:",error);
            return res.status(500).json({ ok:false, error:"Bridge-Schlüssel konnte nicht erstellt werden." });
        }
    }
);

app.delete(
    "/api/creator/widget-studio/bridge/keys/:id",
    requireCreatorAccount,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const revoked = await revokeStudioBridgeKey(req.creatorAccount.id, req.params.id);
            if (!revoked) return res.status(404).json({ ok:false, error:"Aktiver Bridge-Schlüssel nicht gefunden." });
            return res.json({ ok:true, revoked:true });
        } catch (error) {
            safeLogError("Widget Studio Bridge Revoke Fehler:",error);
            return res.status(500).json({ ok:false, error:"Bridge-Schlüssel konnte nicht widerrufen werden." });
        }
    }
);

app.get(
    "/api/bridge/widget-studio/release-policy",
    widgetBridgeHeartbeatLimiter,
    requireStudioBridge,
    async (req, res) => {
        res.set("Cache-Control", "no-store");

        const bridge =
            publicStudioBridgeRow(
                req.studioBridge
            );

        const channel =
            req.query?.channel === "beta"
                ? "beta"
                : "stable";

        const data =
            await launcherReleasePolicy(
                req.query?.current ||
                bridge?.client_version ||
                "",
                channel,
                false,
                `${req.studioBridge.creator_id}:${req.studioBridge.id}`
            );

        return res.json({
            ok: true,
            ...data,
            server_time: new Date().toISOString()
        });
    }
);


app.get(
    "/api/bridge/widget-studio/scenes",
    widgetBridgeHeartbeatLimiter,
    requireStudioBridge,
    async(req,res)=>{
        try{
            const result=await pool.query(
                `SELECT * FROM creator_widget_scenes WHERE creator_id=$1 AND status='live' AND published_config IS NOT NULL ORDER BY updated_at DESC`,
                [req.studioBridge.creator_id]
            );
            return res.json({ok:true,scenes:result.rows.map(row=>publicSceneRow(row,APP_BASE_URL)),server_time:new Date().toISOString()});
        }catch(error){safeLogError("Bridge Scene Liste Fehler:",error);return res.status(500).json({ok:false,error:"Scene Liste konnte nicht geladen werden."})}
    }
);


app.get(
    "/api/bridge/stream-studio/config",
    widgetBridgeHeartbeatLimiter,
    requireStudioBridge,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const creatorId=req.studioBridge.creator_id;
            const context=await streamStudioSourceContext(creatorId,creatorId);
            const settingsData=await getCreatorSettings(creatorId);
            const multistreamLimit=streamStudioMultistreamLimit(context.access);
            const config=sanitizeStreamStudioConfig(settingsData.settings?.stream_studio||{},context.liveSceneIds,context.liveSourceIds,multistreamLimit,context.ownedSceneIds);
            const sceneRow=context.sceneRows.find(row=>String(row.id)===config.program_scene_id&&row.status==="live")||null;
            const sourceMap=new Map(context.sceneSources.filter(source=>source.status==="live").map(source=>[String(source.id),source]));
            let programScene=null;
            if(sceneRow){
                const runtime=await hydratePublicScene(sceneRow);
                programScene={...publicSceneRow(sceneRow,APP_BASE_URL),runtime_layouts:runtime?.layouts||{}};
            }
            return res.json({
                ok:true,
                config,
                program_scene:programScene,
                overlays:config.overlay_widget_ids.map(id=>sourceMap.get(id)).filter(Boolean).map(publicStreamStudioSource),
                multistream:{max_destinations:multistreamLimit,mode:"launcher_local",failure_policy:"isolate_destination",credentials:"launcher_local_only",cloud_relay:false},
                engine:{capture:"launcher_local",stream_keys:"launcher_only",multistream:"launcher_local",scene_graph:"hybrid_offscreen",protocol:4},
                server_time:new Date().toISOString()
            });
        }catch(error){safeLogError("Bridge Stream Studio Fehler:",error);return res.status(500).json({ok:false,error:"Stream Studio Konfiguration konnte nicht geladen werden."});}
    }
);

app.get(
    "/api/bridge/widget-studio/status",
    widgetBridgeHeartbeatLimiter,
    requireStudioBridge,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        const creatorId = req.studioBridge.creator_id;
        const bridge = await getStudioBridgeStatus(creatorId);
        const release = await launcherReleasePolicy(
            bridge.client_version || "",
            req.query?.channel === "beta" ? "beta" : "stable",
            false,
            `${creatorId}:${req.studioBridge.id}`
        );
        return res.json({
            ok: true,
            bridge,
            live: await getStudioLiveState(creatorId),
            creator: await studioCreatorIdentity(creatorId),
            release_policy: release.policy,
            release_catalog: release.catalog,
            server_time: new Date().toISOString(),
            protocol: 1
        });
    }
);

app.post(
    "/api/bridge/widget-studio/heartbeat",
    widgetBridgeHeartbeatLimiter,
    requireStudioBridge,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const creatorId = req.studioBridge.creator_id;
            await touchStudioBridge(req.studioBridge.id, creatorId, {
                ...(req.body || {}),
                live_session_active: req.body?.live_session_active === true
            });
            const bridge = await getStudioBridgeStatus(creatorId);
            const release = await launcherReleasePolicy(
                bridge.client_version || "",
                req.body?.update_channel === "beta" ? "beta" : "stable",
                false,
                `${creatorId}:${req.studioBridge.id}`
            );
            return res.json({
                ok: true,
                bridge,
                live: await getStudioLiveState(creatorId),
                creator: await studioCreatorIdentity(creatorId),
                release_policy: release.policy,
                release_catalog: release.catalog,
                server_time: new Date().toISOString(),
                heartbeat_after_ms: 10000,
                protocol: 1
            });
        } catch (error) {
            safeLogError("Widget Studio Bridge Heartbeat Fehler:",error);
            return res.status(400).json({ ok:false, error:error.message || "Heartbeat fehlgeschlagen." });
        }
    }
);

app.post(
    "/api/bridge/widget-studio/session/resume",
    widgetBridgeEventLimiter,
    requireStudioBridge,
    async (req,res) => {
        res.set("Cache-Control","no-store");
        const creatorId=req.studioBridge.creator_id;
        const sessionId=String(req.body?.session_id||"");
        const dryRun=req.body?.dry_run===true;

        if(!validSessionId(sessionId)){
            return res.status(400).json({ok:false,allowed:false,reason:"invalid_session_id",error:"Ungültige LIVE Session-ID."});
        }

        try{
            await requireCreatorFeatureAccess(creatorId,"live_bridge","creator");
            const clientVersion=studioText(req.body?.client_version,40,req.studioBridge.client_version||"");
            const channel=req.body?.update_channel==="beta"?"beta":"stable";
            const release=await launcherReleasePolicy(
                clientVersion,
                channel,
                false,
                `${creatorId}:${req.studioBridge.id}`
            );
            const safety=releasePolicyAllowsLive(release.policy);

            if(!safety.ok){
                return res.json({
                    ok:true,
                    allowed:false,
                    reason:safety.reason,
                    message:release.policy?.message||"LIVE Recovery ist durch die Release Policy blockiert.",
                    release_policy:release.policy,
                    release_catalog:release.catalog,
                    server_time:new Date().toISOString()
                });
            }

            const sessionResult=await pool.query(
                `SELECT * FROM creator_live_sessions WHERE creator_id=$1 AND id=$2 LIMIT 1`,
                [creatorId,sessionId]
            );
            const session=sessionResult.rows[0]||null;
            const resumable=canResumeSessionRow(session);
            if(!resumable.ok){
                return res.json({
                    ok:true,
                    allowed:false,
                    reason:resumable.reason,
                    message:"Die gespeicherte LIVE Session kann nicht mehr fortgesetzt werden.",
                    release_policy:release.policy,
                    release_catalog:release.catalog,
                    server_time:new Date().toISOString()
                });
            }

            const currentResult=await pool.query(
                `SELECT * FROM creator_live_state WHERE creator_id=$1 LIMIT 1`,
                [creatorId]
            );
            const preview=buildResumedLiveState(session,currentResult.rows[0]||null);

            if(dryRun){
                return res.json({
                    ok:true,
                    allowed:true,
                    dry_run:true,
                    session_id:sessionId,
                    session:{id:session.id,provider:session.provider,status:session.status,metadata:session.metadata||{},started_at:session.started_at,updated_at:session.updated_at},
                    live:{...preview,stale:false},
                    creator:await studioCreatorIdentity(creatorId),
                    release_policy:release.policy,
                    release_catalog:release.catalog,
                    server_time:new Date().toISOString()
                });
            }

            const db=await pool.connect();
            try{
                await db.query("BEGIN");
                const lockedSessionResult=await db.query(
                    `SELECT * FROM creator_live_sessions WHERE creator_id=$1 AND id=$2 FOR UPDATE`,
                    [creatorId,sessionId]
                );
                const lockedSession=lockedSessionResult.rows[0]||null;
                const lockedCheck=canResumeSessionRow(lockedSession);
                if(!lockedCheck.ok)throw new Error("LIVE Session ist nicht mehr fortsetzbar.");

                const stateResult=await db.query(
                    `SELECT * FROM creator_live_state WHERE creator_id=$1 FOR UPDATE`,
                    [creatorId]
                );
                const resumed=buildResumedLiveState(lockedSession,stateResult.rows[0]||null);

                await db.query(
                    `
                    INSERT INTO creator_live_state
                        (creator_id,session_id,provider,connected,likes,viewers,shares,gifts_count,gifts_value,followers_gained,started_at,last_event_at,bridge_heartbeat_at,updated_at)
                    VALUES
                        ($1,$2,'launcher_bridge',TRUE,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
                    ON CONFLICT (creator_id) DO UPDATE SET
                        session_id=EXCLUDED.session_id,
                        provider='launcher_bridge',
                        connected=TRUE,
                        likes=EXCLUDED.likes,
                        viewers=EXCLUDED.viewers,
                        shares=EXCLUDED.shares,
                        gifts_count=EXCLUDED.gifts_count,
                        gifts_value=EXCLUDED.gifts_value,
                        followers_gained=EXCLUDED.followers_gained,
                        started_at=EXCLUDED.started_at,
                        last_event_at=COALESCE(EXCLUDED.last_event_at,creator_live_state.last_event_at),
                        bridge_heartbeat_at=NOW(),
                        updated_at=NOW()
                    `,
                    [creatorId,sessionId,resumed.likes,resumed.viewers,resumed.shares,resumed.gifts_count,resumed.gifts_value,resumed.followers_gained,resumed.started_at,resumed.last_event_at]
                );
                await db.query(
                    `UPDATE creator_live_sessions SET status='live',ended_at=NULL,updated_at=NOW() WHERE creator_id=$1 AND id=$2`,
                    [creatorId,sessionId]
                );
                await db.query("COMMIT");
            }catch(error){
                await db.query("ROLLBACK");
                throw error;
            }finally{
                db.release();
            }

            await touchStudioBridge(req.studioBridge.id,creatorId,{
                ...(req.body||{}),
                live_session_active:true
            });

            const live=await getStudioLiveState(creatorId);
            return res.json({
                ok:true,
                allowed:true,
                recovered:true,
                session_id:sessionId,
                live,
                creator:await studioCreatorIdentity(creatorId),
                release_policy:release.policy,
                release_catalog:release.catalog,
                server_time:new Date().toISOString()
            });
        }catch(error){
            const status=error?.code==="creator_feature_locked"?403:400;
            return res.status(status).json(clientSafeErrorPayload(req,error,status,"LIVE Session konnte nicht fortgesetzt werden.",{extra:{allowed:false}}));
        }
    }
);


app.post(
    "/api/bridge/widget-studio/session/start",
    widgetBridgeEventLimiter,
    requireStudioBridge,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const creatorId = req.studioBridge.creator_id;
            await requireCreatorFeatureAccess(creatorId,"live_bridge","creator");
            await touchStudioBridge(req.studioBridge.id, creatorId, { ...(req.body || {}), live_session_active:true });
            const live = await applyStudioLiveEvent(
                creatorId,
                { event_type:"live_start", event_key:req.body?.event_key || null, payload:req.body?.payload || {} },
                "launcher_bridge"
            );
            await pool.query(`UPDATE creator_live_state SET bridge_heartbeat_at=NOW() WHERE creator_id=$1`, [creatorId]);
            return res.json({ ok:true, live, session_id:live.session_id });
        } catch (error) {
            safeLogError("Widget Studio Bridge Session Start Fehler:",error);
            return res.status(error?.code==="creator_feature_locked"?403:400).json({ ok:false, error:error.message || "LIVE-Session konnte nicht gestartet werden." });
        }
    }
);

app.post(
    "/api/bridge/widget-studio/session/end",
    widgetBridgeEventLimiter,
    requireStudioBridge,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const creatorId = req.studioBridge.creator_id;
            await touchStudioBridge(req.studioBridge.id, creatorId, { ...(req.body || {}), live_session_active:false });
            const live = await applyStudioLiveEvent(
                creatorId,
                { event_type:"live_end", event_key:req.body?.event_key || null, payload:req.body?.payload || {} },
                "launcher_bridge"
            );
            return res.json({ ok:true, live });
        } catch (error) {
            safeLogError("Widget Studio Bridge Session End Fehler:",error);
            return res.status(400).json({ ok:false, error:error.message || "LIVE-Session konnte nicht beendet werden." });
        }
    }
);

app.post(
    "/api/bridge/widget-studio/events",
    widgetBridgeEventLimiter,
    requireStudioBridge,
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            const creatorId = req.studioBridge.creator_id;
            await requireCreatorFeatureAccess(creatorId,"live_bridge","creator");
            await touchStudioBridge(req.studioBridge.id, creatorId, { ...(req.body || {}), live_session_active:true });
            const incoming = Array.isArray(req.body?.events) ? req.body.events : [req.body?.event || req.body];
            const events = incoming.filter(Boolean).slice(0, WIDGET_BRIDGE_MAX_BATCH);
            if (!events.length) return res.status(400).json({ ok:false, error:"Keine Events übergeben." });
            const results = [];
            for (const event of events) {
                const type = String(event?.event_type || "");
                if (["live_start","live_end","reset"].includes(type)) {
                    return res.status(400).json({ ok:false, error:"LIVE Start/Ende bitte über die Session-Endpunkte senden." });
                }
                const live = await applyStudioLiveEvent(creatorId, event || {}, "launcher_bridge");
                results.push({ event_key:event?.event_key || null, event_type:type, live });
            }
            await pool.query(`UPDATE creator_live_state SET bridge_heartbeat_at=NOW() WHERE creator_id=$1`, [creatorId]);
            return res.json({
                ok:true,
                accepted:results.length,
                live:await getStudioLiveState(creatorId),
                bridge:await getStudioBridgeStatus(creatorId)
            });
        } catch (error) {
            safeLogError("Widget Studio Bridge Event Fehler:",error);
            return res.status(error?.code==="creator_feature_locked"?403:400).json({ ok:false, error:error.message || "Bridge-Events konnten nicht verarbeitet werden." });
        }
    }
);

app.get("/api/bridge/widget-studio/stream-bot", widgetBridgeEventLimiter, requireStudioBridge, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try{return res.json({ok:true,stream_bot:await getStreamBotConfig(req.studioBridge.creator_id)});}
    catch(error){safeLogError("Stream Bot Settings Fehler:",error);return res.status(500).json({ok:false,error:"Stream-Bot-Einstellungen konnten nicht geladen werden."});}
});

app.post("/api/bridge/widget-studio/stream-bot", widgetBridgeEventLimiter, requireStudioBridge, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try{
        await requireCreatorFeatureAccess(req.studioBridge.creator_id,"live_bridge","creator");
        const streamBot=await saveStreamBotConfig(req.studioBridge.creator_id,req.body?.stream_bot||req.body||{});
        return res.json({ok:true,stream_bot:streamBot});
    }catch(error){
        safeLogError("Stream Bot Settings Save Fehler:",error);
        return res.status(error?.code==="creator_feature_locked"?403:400).json(clientSafeErrorPayload(req,error,error?.code==="creator_feature_locked"?403:400,"Stream-Bot-Einstellungen konnten nicht gespeichert werden."));
    }
});

app.get("/api/bridge/widget-studio/actions", widgetBridgeEventLimiter, requireStudioBridge, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try {
        const creatorId=req.studioBridge.creator_id;
        const limit=Math.max(1,Math.min(50,Number(req.query?.limit)||20));

        await pool.query(
            `
            UPDATE creator_live_actions
            SET status='expired',
                lease_until=NULL,
                last_error=COALESCE(last_error,'delivery_expired')
            WHERE creator_id=$1
              AND status IN ('pending','delivered')
              AND (
                COALESCE(expires_at,created_at+($2::int*INTERVAL '1 minute'))<=NOW()
                OR attempts >= $3
              )
            `,
            [creatorId,ACTION_TTL_MINUTES,ACTION_MAX_ATTEMPTS]
        );

        const result=await pool.query(
            `
            WITH claimable AS (
                SELECT id
                FROM creator_live_actions
                WHERE creator_id=$1
                  AND status IN ('pending','delivered')
                  AND COALESCE(expires_at,created_at+($2::int*INTERVAL '1 minute'))>NOW()
                  AND attempts < $3
                  AND (
                    status='pending'
                    OR lease_until IS NULL
                    OR lease_until<=NOW()
                  )
                ORDER BY created_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT $4
            )
            UPDATE creator_live_actions action
            SET status='delivered',
                delivered_at=NOW(),
                lease_until=NOW()+($5::int*INTERVAL '1 second'),
                attempts=action.attempts+1,
                last_error=NULL
            FROM claimable
            WHERE action.id=claimable.id
            RETURNING action.*
            `,
            [creatorId,ACTION_TTL_MINUTES,ACTION_MAX_ATTEMPTS,limit,ACTION_LEASE_SECONDS]
        );

        return res.json({
            ok:true,
            actions:result.rows.map(publicStudioAction),
            lease_seconds:ACTION_LEASE_SECONDS,
            max_attempts:ACTION_MAX_ATTEMPTS,
            server_time:new Date().toISOString()
        });
    } catch(error){
        safeLogError("Widget Studio Bridge Actions Fehler:",error);
        return res.status(500).json({ok:false,error:"Launcher-Aktionen konnten nicht geladen werden."});
    }
});

app.post("/api/bridge/widget-studio/actions/ack", widgetBridgeEventLimiter, requireStudioBridge, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try {
        const creatorId=req.studioBridge.creator_id;
        const ids=normalizeActionIds(req.body?.ids,50);
        if(!ids.length)return res.json({ok:true,acked:0});
        const result=await pool.query(
            `
            UPDATE creator_live_actions
            SET status='acked',
                acked_at=NOW(),
                lease_until=NULL,
                last_error=NULL
            WHERE creator_id=$1
              AND id=ANY($2::text[])
              AND status='delivered'
            RETURNING id
            `,
            [creatorId,ids]
        );
        return res.json({ok:true,acked:result.rowCount});
    } catch(error){
        safeLogError("Widget Studio Bridge Action ACK Fehler:",error);
        return res.status(400).json({ok:false,error:"Launcher-Aktionen konnten nicht bestätigt werden."});
    }
});

app.post("/api/bridge/widget-studio/actions/nack", widgetBridgeEventLimiter, requireStudioBridge, async (req,res)=>{
    res.set("Cache-Control","no-store");
    try {
        const creatorId=req.studioBridge.creator_id;
        const ids=normalizeActionIds(req.body?.ids,50);
        const errorText=studioText(req.body?.error,300,"tts_failed");
        if(!ids.length)return res.json({ok:true,nacked:0,retry_scheduled:0,expired:0});

        const result=await pool.query(
            `
            UPDATE creator_live_actions
            SET last_error=$3,
                status=CASE
                    WHEN attempts >= $4
                      OR COALESCE(expires_at,created_at+($5::int*INTERVAL '1 minute'))<=NOW()
                    THEN 'expired'
                    ELSE 'delivered'
                END,
                lease_until=CASE
                    WHEN attempts >= $4
                      OR COALESCE(expires_at,created_at+($5::int*INTERVAL '1 minute'))<=NOW()
                    THEN NULL
                    ELSE NOW()+($6::int*INTERVAL '1 second')
                END
            WHERE creator_id=$1
              AND id=ANY($2::text[])
              AND status='delivered'
            RETURNING id,status
            `,
            [creatorId,ids,errorText,ACTION_MAX_ATTEMPTS,ACTION_TTL_MINUTES,ACTION_RETRY_DELAY_SECONDS]
        );
        const retry=result.rows.filter(row=>row.status==="delivered").length;
        const expired=result.rows.filter(row=>row.status==="expired").length;
        return res.json({ok:true,nacked:result.rowCount,retry_scheduled:retry,expired});
    } catch(error){
        safeLogError("Widget Studio Bridge Action NACK Fehler:",error);
        return res.status(400).json({ok:false,error:"Launcher-Aktion konnte nicht als fehlgeschlagen markiert werden."});
    }
});

// ============================================================
// WIDGET STUDIO · ÖFFENTLICHE CREATOR-ASSETS
// ============================================================

app.get("/widget-assets/:publicToken",publicRuntimeIpLimiter,widgetReadLimiter,async(req,res)=>{
    const token=String(req.params.publicToken||"");
    if(!/^[a-f0-9]{48}$/i.test(token))return res.status(404).end();
    try{
        const result=await pool.query(`
            SELECT a.mime_type,a.content,a.sha256
            FROM creator_widget_assets a
            JOIN creator_accounts c ON c.id=a.creator_id
            WHERE a.public_token=$1 AND c.status='active'
            LIMIT 1
        `,[token]);
        const row=result.rows[0];
        if(!row)return res.status(404).end();
        res.set("Content-Type",String(row.mime_type||"application/octet-stream"));
        res.set("Cache-Control","private, max-age=300, must-revalidate");
        res.set("CDN-Cache-Control","no-store");
        res.set("Surrogate-Control","no-store");
        res.set("ETag",`"${String(row.sha256||"")}"`);
        res.set("Content-Disposition","inline");
        res.set("X-Content-Type-Options","nosniff");
        return res.send(row.content);
    }catch(error){
        safeLogError("Widget Asset Public Fehler:",error);
        return res.status(500).end();
    }
});

// ============================================================
// WIDGET STUDIO V1 - ÖFFENTLICHE OBS API
// ============================================================

app.get(
    "/api/widgets/studio/:publicToken",
    publicRuntimeIpLimiter,
    widgetReadLimiter,
    async (req, res) => {

        res.set("Cache-Control", "no-store");

        try {

            const row =
                await getPublicStudioWidget(
                    req.params.publicToken
                );

            if (!row) {
                return res.status(404).json({
                    ok: false,
                    error: "Widget nicht gefunden oder nicht veröffentlicht."
                });
            }

            const definition = studioWidgetDefinition(row.widget_type);
            const staticObs = definition.source_kind === "static";
            const manualOnly = definition.source_kind === "manual";
            const detachedData = staticObs || manualOnly;
            const snapshot = detachedData
                ? null
                : await studioDataSnapshot(
                    row.creator_id
                );
            const publicSnapshot = detachedData
                ? {
                    profile: {
                        connected: false,
                        display_name: "",
                        avatar_url: "",
                        followers: 0,
                        likes_total: 0,
                        updated_at: null
                    },
                    live: {
                        connected: false,
                        provider: "none",
                        stale: true,
                        likes: 0,
                        viewers: 0,
                        shares: 0,
                        gifts_count: 0,
                        gifts_value: 0,
                        followers_gained: 0,
                        session_id: null,
                        last_event_at: null
                    },
                    bridge: {
                        configured: false,
                        online: false
                    }
                }
                : snapshot;
            const eventType = detachedData ? null : (definition.event_type || null);
            const events = eventType
                ? await getRecentStudioLiveEvents(row.creator_id, eventType, 20, snapshot.live.session_id)
                : [];

            return res.json({
                ok: true,
                widget: {
                    id: row.id,
                    type: row.widget_type,
                    name: row.name,
                    definition,
                    config: sanitizeStudioWidgetConfig(row.published_config, row.widget_type),
                    published_at: row.published_at
                },
                creator: {
                    display_name:
                        (detachedData ? row.creator_display_name : publicSnapshot.profile.display_name) ||
                        row.creator_display_name ||
                        "Creator",
                    avatar_url:
                        detachedData ? "" : (publicSnapshot.profile.avatar_url || "")
                },
                data: publicSnapshot,
                events,
                tiktok: detachedData
                    ? {
                        connected: false,
                        display_name: "",
                        avatar_url: "",
                        follower_count: 0,
                        likes_count: 0,
                        updated_at: null
                    }
                    : {
                        connected: publicSnapshot.profile.connected,
                        display_name: publicSnapshot.profile.display_name,
                        avatar_url: publicSnapshot.profile.avatar_url,
                        follower_count: publicSnapshot.profile.followers,
                        likes_count: publicSnapshot.profile.likes_total,
                        updated_at: publicSnapshot.profile.updated_at
                    },
                live: publicSnapshot.live,
                bridge: publicSnapshot.bridge
            });

        }
        catch (error) {

            safeLogError("Widget Studio Public Fehler:",error);

            return res.status(500).json({
                ok: false,
                error: "Widget-Daten konnten nicht geladen werden."
            });

        }

    }
);


// ============================================================
// WIDGET STUDIO - FOLLOWER GOAL - CREATOR API
// ============================================================

app.get(
    "/api/creator/widgets/follower-goal",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const source =
                await getFollowerWidgetSourceByCreator(
                    req.creatorAccount.id,
                    true
                );

            const tiktok =
                await getFollowerWidgetTikTokData(
                    req.creatorAccount.id
                );

            return res.json({

                ok:
                    true,

                widget:
                    "follower_goal",

                config:
                    sanitizeFollowerGoalWidgetConfig(
                        source.config
                    ),

                source_key:
                    source.source_key,

                source_url:
                    followerWidgetSourceUrl(
                        source.source_key
                    ),

                updated_at:
                    source.updated_at,

                tiktok

            });

        }
        catch (error) {

            safeLogError("Follower Widget Laden Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Follower-Widget konnte nicht geladen werden."

                });

        }

    }
);


app.put(
    "/api/creator/widgets/follower-goal",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const source =
                await saveFollowerWidgetSource(
                    req.creatorAccount.id,
                    req.body?.config
                );

            const tiktok =
                await getFollowerWidgetTikTokData(
                    req.creatorAccount.id
                );

            return res.json({

                ok:
                    true,

                widget:
                    "follower_goal",

                config:
                    sanitizeFollowerGoalWidgetConfig(
                        source.config
                    ),

                source_key:
                    source.source_key,

                source_url:
                    followerWidgetSourceUrl(
                        source.source_key
                    ),

                updated_at:
                    source.updated_at,

                tiktok

            });

        }
        catch (error) {

            safeLogError("Follower Widget Speichern Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        error?.message ||
                        "Follower-Widget konnte nicht gespeichert werden."

                });

        }

    }
);


app.post(
    "/api/creator/widgets/follower-goal/rotate-key",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const source =
                await rotateFollowerWidgetSourceKey(
                    req.creatorAccount.id
                );

            return res.json({

                ok:
                    true,

                source_key:
                    source.source_key,

                source_url:
                    followerWidgetSourceUrl(
                        source.source_key
                    ),

                updated_at:
                    source.updated_at

            });

        }
        catch (error) {

            safeLogError("Follower Widget Schlüssel Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Neuer OBS-Schlüssel konnte nicht erstellt werden."

                });

        }

    }
);


// ============================================================
// WIDGET STUDIO - FOLLOWER GOAL - ÖFFENTLICHE OBS API
// ============================================================

app.get(
    "/api/widgets/follower-goal/:sourceKey",

    widgetReadLimiter,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const source =
                await getFollowerWidgetSourceByKey(
                    req.params.sourceKey
                );

            if (
                !source
            ) {

                return res
                    .status(404)
                    .json({

                        ok:
                            false,

                        error:
                            "Widget-Quelle nicht gefunden."

                    });

            }

            const config =
                sanitizeFollowerGoalWidgetConfig(
                    source.config
                );

            const tiktok =
                await getFollowerWidgetTikTokData(
                    source.creator_id
                );

            return res.json({

                ok:
                    true,

                widget:
                    "follower_goal",

                enabled:
                    config.enabled,

                creator:
                    {

                        display_name:
                            source.display_name ||
                            "Creator"

                    },

                config,

                live:
                    {

                        connected:
                            tiktok.connected,

                        follower_count:
                            tiktok.follower_count,

                        tiktok_display_name:
                            tiktok.display_name,

                        source:
                            tiktok.source,

                        updated_at:
                            tiktok.updated_at

                    },

                updated_at:
                    source.updated_at

            });

        }
        catch (error) {

            safeLogError("Öffentliches Follower Widget Fehler:",error);

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Widget-Daten konnten nicht geladen werden."

                });

        }

    }
);


// ============================================================
// NEXUS BASIS
// ============================================================

app.get(
    "/api/nexus/status",

    requireCreatorAccount,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        const allowed =
            canUseModule(
                req.creatorAccount.plan,
                "nexus"
            );


        return res.json({

            ok:
                true,

            service:
                "NEXUS",

            version:
                "1.0",

            status:
                "online",

            allowed,

            plan:
                normalizePlan(
                    req.creatorAccount.plan
                ),

            integrations: {

                website:
                    "online",

                creator_account:
                    "online",

                launcher:
                    "prepared",

                tiktok:
                    "active",

                cut_studio:
                    "project_runtime",

                games:
                    "active",

                audio_studio:
                    "roadmap",

                twitch:
                    "roadmap",

                obs:
                    "roadmap"

            }

        });

    }
);
// ============================================================
// TIKTOK CONNECTION LADEN
// ============================================================

async function getConnection(
    creatorId = DEFAULT_CREATOR_ID
) {

    const result =
        await pool.query(
            `
            SELECT *
            FROM tiktok_connections
            WHERE creator_id = $1
            LIMIT 1
            `,
            [
                normalizeCreatorId(
                    creatorId
                )
            ]
        );


    if (
        !result.rows[0]
    ) {

        return null;

    }


    const row =
        result.rows[0];


    return {

        ...row,

        access_token:
            decryptSecret(
                row.access_token
            ),

        refresh_token:
            decryptSecret(
                row.refresh_token
            )

    };

}


// ============================================================
// TIKTOK TOKENS SPEICHERN
// ============================================================

async function saveTokens(
    creatorId,
    data
) {

    creatorId =
        normalizeCreatorId(
            creatorId
        );


    const existing =
        await getConnection(
            creatorId
        );


    const now =
        Date.now();


    const refreshToken =
        data.refresh_token ||
        existing?.refresh_token ||
        null;


    const accessExpiresAt =
        data.expires_in != null
            ? now +
              Number(
                  data.expires_in
              ) *
              1000
            : existing?.access_expires_at ||
              null;


    const refreshExpiresAt =
        data.refresh_expires_in != null
            ? now +
              Number(
                  data.refresh_expires_in
              ) *
              1000
            : existing?.refresh_expires_at ||
              null;


    await pool.query(
        `
        INSERT INTO tiktok_connections (

            creator_id,
            connected,
            open_id,
            access_token,
            refresh_token,
            access_expires_at,
            refresh_expires_at,
            scope,
            updated_at

        )

        VALUES (
            $1,
            TRUE,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            NOW()
        )

        ON CONFLICT (
            creator_id
        )

        DO UPDATE SET

            connected =
                TRUE,

            open_id =
                COALESCE(
                    EXCLUDED.open_id,
                    tiktok_connections.open_id
                ),

            access_token =
                EXCLUDED.access_token,

            refresh_token =
                COALESCE(
                    EXCLUDED.refresh_token,
                    tiktok_connections.refresh_token
                ),

            access_expires_at =
                EXCLUDED.access_expires_at,

            refresh_expires_at =
                COALESCE(
                    EXCLUDED.refresh_expires_at,
                    tiktok_connections.refresh_expires_at
                ),

            scope =
                EXCLUDED.scope,

            updated_at =
                NOW()
        `,
        [
            creatorId,

            data.open_id ||
            existing?.open_id ||
            null,

            encryptSecret(
                data.access_token
            ),

            refreshToken
                ? encryptSecret(
                    refreshToken
                )
                : null,

            accessExpiresAt,

            refreshExpiresAt,

            data.scope ||
            existing?.scope ||
            ""
        ]
    );

}


// ============================================================
// TIKTOK PROFIL SPEICHERN
// ============================================================

async function saveProfile(
    creatorId,
    profile
) {

    await pool.query(
        `
        UPDATE tiktok_connections

        SET
            open_id = $2,
            display_name = $3,
            avatar_url = $4,
            follower_count = $5,
            following_count = $6,
            likes_count = $7,
            video_count = $8,
            updated_at = NOW()

        WHERE creator_id = $1
        `,
        [
            normalizeCreatorId(
                creatorId
            ),

            profile.open_id ||
            null,

            profile.display_name ||
            "",

            profile.avatar_url ||
            "",

            Number(
                profile.follower_count ||
                0
            ),

            Number(
                profile.following_count ||
                0
            ),

            Number(
                profile.likes_count ||
                0
            ),

            Number(
                profile.video_count ||
                0
            )
        ]
    );

}


// ============================================================
// LAUNCHER API KEY
// ============================================================

function requireLauncherKey(
    req,
    res,
    next
) {

    const supplied =
        req.get(
            "X-CFS-API-Key"
        );


    if (
        !supplied
    ) {

        return res
            .status(401)
            .json({

                ok:
                    false,

                error:
                    "API-Key fehlt."

            });

    }


    if (
        !safeEqualText(
            LAUNCHER_API_KEY,
            supplied
        )
    ) {

        return res
            .status(403)
            .json({

                ok:
                    false,

                error:
                    "API-Key ungültig."

            });

    }


    next();

}


// ============================================================
// ÖFFENTLICHER SYSTEMSTATUS
//
// Für die Marketing-/Startseite absichtlich minimal: keine Version,
// keine Redirect-URI, keine Modul- oder Datenbankdetails. Operative
// Checks verwenden weiterhin /api/health.
// ============================================================

app.get(
    "/api/public/status",
    async (req, res) => {
        res.set("Cache-Control", "no-store");
        if (isShuttingDown) {
            res.setHeader("Retry-After","30");
            return res.status(503).json({ok:false,status:"maintenance",message:"Dienst wird kontrolliert neu gestartet."});
        }
        try {
            await pool.query("SELECT 1");
            const incident=await getWebsiteIncidentState();
            const status=incident.mode==="normal"?"online":incident.mode;
            return res.json({
                ok:status==="online"||status==="degraded",
                status,
                message:incident.public_message||"",
                incident_started_at:incident.started_at||null
            });
        } catch (error) {
            safeLogError("public-status", error);
            return res.status(503).json({ok:false,status:"degraded",message:"Systemstatus derzeit nicht vollständig verfügbar."});
        }
    }
);


// ============================================================
// PUBLIC AUTH / WEBAUTHN READINESS
//
// Nur absichtlich öffentliche WebAuthn-/MFA-Metadaten. Keine Account-,
// Credential-, Challenge- oder Recovery-Daten. Der Produktions-Drill kann
// damit RP-ID und Origin des tatsächlich deployten Servers verifizieren.
// ============================================================

app.get(
    "/api/public/auth-readiness",
    (req, res) => {
        res.set("Cache-Control", "no-store");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        return res.json({
            schema:1,
            ok:true,
            canonical_origin:APP_CANONICAL_ORIGIN,
            secure_context_required:NODE_ENV !== "development",
            passkeys:{
                available:true,
                rp_id:PASSKEY_RP_ID,
                expected_origins:[...PASSKEY_EXPECTED_ORIGINS],
                user_verification:"required",
                challenge_ttl_seconds:Math.floor(PASSKEY_CHALLENGE_TTL_MS / 1000),
                max_per_account:PASSKEY_MAX_PER_ACCOUNT
            },
            mfa:{
                totp:true,
                recovery_codes:true,
                passkey_login:true,
                account_step_up:true
            }
        });
    }
);


// ============================================================
// HEALTH CHECK · OPERATIVER MINIMALDATENSATZ
// ============================================================

app.get(
    "/api/health",
    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        if (isShuttingDown) {
            res.setHeader("Retry-After","30");
            return res.status(503).json({ok:false,status:"shutting_down"});
        }

        try {

            await pool.query(
                "SELECT 1"
            );

            const schemaResult = await pool.query(
                `SELECT schema_version
                 FROM creator_database_schema_state
                 WHERE slot = $1
                 LIMIT 1`,
                [DATABASE_SCHEMA_SLOT]
            );
            const observedSchemaVersion = Number(schemaResult.rows?.[0]?.schema_version || 0);

            if (observedSchemaVersion !== DATABASE_SCHEMA_VERSION) {
                res.setHeader("Retry-After", "15");
                return res.status(503).json({
                    ok:false,
                    service:APP_NAME,
                    version:BACKEND_VERSION,
                    status:"schema_mismatch",
                    database:"connected",
                    schema_version:observedSchemaVersion
                });
            }


            return res.json({

                ok:
                    true,

                service:
                    APP_NAME,

                version:
                    BACKEND_VERSION,

                status:
                    "online",

                database:
                    "connected",

                schema_version:
                    DATABASE_SCHEMA_VERSION

            });

        }
        catch (error) {

            safeLogError(
                "health-check",
                error
            );


            return res
                .status(503)
                .json({

                    ok:
                        false,

                    service:
                        APP_NAME,

                    version:
                        BACKEND_VERSION,

                    status:
                        "database_error"

                });

        }

    }
);


// ============================================================
// CREATOR-SPEZIFISCHE TIKTOK VERBINDUNG
//
// Diese Routen sind die öffentliche Creator-Suite-Verbindung.
// Der bestehende /auth/tiktok Owner-Pfad bleibt für Legacy/Root erhalten.
// ============================================================

function publicTikTokConnection(connection) {
    const grantedScopes=String(connection?.scope||"")
        .split(/[\s,]+/)
        .map(scope=>scope.trim())
        .filter(Boolean);
    return {
        connected:Boolean(connection?.connected),
        scopes:{
            basic:grantedScopes.includes("user.info.basic"),
            stats:grantedScopes.includes("user.info.stats")
        },
        profile:{
            display_name:connection?.display_name||"",
            avatar_url:connection?.avatar_url||"",
            follower_count:Number(connection?.follower_count||0),
            following_count:Number(connection?.following_count||0),
            likes_count:Number(connection?.likes_count||0),
            video_count:Number(connection?.video_count||0)
        },
        updated_at:connection?.updated_at||null
    };
}

app.get(
    "/api/creator/tiktok/status",
    requireCreatorAccount,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try {
            const connection=await getConnection(req.creatorAccount.id);
            return res.json({ok:true,...publicTikTokConnection(connection)});
        } catch (error) {
            safeLogError("Creator TikTok Status Fehler:",error);
            return res.status(500).json({ok:false,connected:false,error:"TikTok Status konnte nicht geladen werden."});
        }
    }
);

app.get(
    "/auth/creator/tiktok",
    requireCreatorAccount,
    tiktokConnectLimiter,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try {
            return await beginTikTokOAuth(res,req.creatorAccount.id);
        } catch (error) {
            safeLogError("Creator TikTok Login Fehler:",error);
            return res.status(500).send(renderPage("TikTok Verbindung",`<p class="error">TikTok Login konnte nicht gestartet werden.</p>`));
        }
    }
);

app.post(
    "/api/creator/tiktok/sync",
    requireCreatorAccount,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try {
            const connection=await getConnection(req.creatorAccount.id);
            if(!connection?.connected)return res.status(409).json({ok:false,error:"TikTok ist noch nicht verbunden."});
            const profile=await fetchTikTokProfile(req.creatorAccount.id);
            return res.json({ok:true,connected:true,profile,updated_at:profile.updated_at});
        } catch (error) {
            const diagnostic=getSafeDiagnostic(error,"creator_profile_sync");
            return res.status(502).json({ok:false,error:diagnosticMessage(diagnostic),diagnostic});
        }
    }
);

app.post(
    "/api/creator/tiktok/disconnect",
    requireCreatorAccount,
    requireCreatorAccountElevation,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try {
            const creatorId=req.creatorAccount.id;
            const connection=await getConnection(creatorId);
            if(connection?.access_token){
                try {
                    const body=new URLSearchParams({client_key:CLIENT_KEY,client_secret:CLIENT_SECRET,token:connection.access_token});
                    await fetchTikTok(TIKTOK_REVOKE_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
                } catch (error) {
                    console.warn("Creator TikTok Revoke Warnung:",getSafeDiagnostic(error,"creator_disconnect"));
                }
            }
            await pool.query(`DELETE FROM tiktok_connections WHERE creator_id=$1`,[creatorId]);
            await pool.query(`DELETE FROM tiktok_oauth_states WHERE creator_id=$1`,[creatorId]);
            await recordSecurityEvent(creatorId,"tiktok_disconnected");
            return res.json({ok:true,connected:false});
        } catch (error) {
            safeLogError("Creator TikTok Disconnect Fehler:",error);
            return res.status(500).json({ok:false,error:"TikTok-Verbindung konnte nicht getrennt werden."});
        }
    }
);

// ============================================================
// TIKTOK STATUS
// ============================================================

app.get(
    "/api/tiktok/status",
    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        try {

            const connection =
                await getConnection(
                    DEFAULT_CREATOR_ID
                );


            const grantedScopes =
                String(
                    connection?.scope ||
                    ""
                )
                    .split(
                        /[\s,]+/
                    )
                    .map(
                        scope =>
                            scope.trim()
                    )
                    .filter(
                        Boolean
                    );


            return res.json({

                ok:
                    true,

                connected:
                    Boolean(
                        connection?.connected
                    ),

                scopes: {

                    basic:
                        grantedScopes.includes(
                            "user.info.basic"
                        ),

                    stats:
                        grantedScopes.includes(
                            "user.info.stats"
                        )

                },

                profile: {

                    display_name:
                        connection?.display_name ||
                        "",

                    avatar_url:
                        connection?.avatar_url ||
                        "",

                    follower_count:
                        Number(
                            connection?.follower_count ||
                            0
                        ),

                    following_count:
                        Number(
                            connection?.following_count ||
                            0
                        ),

                    likes_count:
                        Number(
                            connection?.likes_count ||
                            0
                        ),

                    video_count:
                        Number(
                            connection?.video_count ||
                            0
                        )

                },

                updated_at:
                    connection?.updated_at ||
                    null

            });

        }
        catch (error) {

            safeLogError("TikTok Status Error:",error);


            return res
                .status(500)
                .json({

                    ok:
                        false,

                    connected:
                        false,

                    error:
                        "Status konnte nicht geladen werden."

                });

        }

    }
);


// ============================================================
// LAUNCHER - TIKTOK PROFIL
// ============================================================

app.get(
    "/api/launcher/tiktok/profile",

    requireLauncherKey,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        let creatorId =
            DEFAULT_CREATOR_ID;


        try {

            creatorId =
                creatorIdFromRequest(
                    req
                );


            const connection =
                await getConnection(
                    creatorId
                );


            if (
                !connection?.connected
            ) {

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        connected:
                            false,

                        creator_id:
                            creatorId,

                        error:
                            "TikTok ist nicht verbunden."

                    });

            }


            if (
                !connection?.refresh_token
            ) {

                return res
                    .status(401)
                    .json({

                        ok:
                            false,

                        connected:
                            false,

                        creator_id:
                            creatorId,

                        error:
                            "TikTok Refresh Token fehlt."

                    });

            }


            const profile =
                await fetchTikTokProfile(
                    creatorId
                );


            return res.json({

                ok:
                    true,

                connected:
                    true,

                creator_id:
                    creatorId,

                profile

            });

        }
        catch (error) {

            const diagnostic =
                getSafeDiagnostic(
                    error,
                    "launcher_profile"
                );


            console.error(
                "[CFS TikTok] Launcher-Profil fehlgeschlagen:",
                diagnostic
            );


            return res
                .status(502)
                .json({

                    ok:
                        false,

                    connected:
                        false,

                    creator_id:
                        creatorId,

                    error:
                        diagnosticMessage(
                            diagnostic
                        ),

                    diagnostic

                });

        }

    }
);


// ============================================================
// ALTER ÖFFENTLICHER PROFIL-ENDPUNKT DEAKTIVIERT
// ============================================================

app.get(
    "/api/tiktok/profile",
    (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        return res
            .status(410)
            .json({

                ok:
                    false,

                error:
                    "Dieser öffentliche Profil-Endpunkt wurde deaktiviert."

            });

    }
);


// ============================================================
// TIKTOK OAUTH START
// ============================================================

async function beginTikTokOAuth(
    res,
    creatorId = DEFAULT_CREATOR_ID
) {

    creatorId =
        normalizeCreatorId(
            creatorId
        );


    const state =
        crypto
            .randomBytes(
                32
            )
            .toString(
                "hex"
            );


    const stateHash =
        hashValue(
            state
        );


    await cleanupExpiredOAuthStates();


    await pool.query(
        `
        INSERT INTO tiktok_oauth_states (
            state_hash,
            creator_id,
            expires_at
        )

        VALUES (
            $1,
            $2,
            NOW() + INTERVAL '10 minutes'
        )
        `,
        [
            stateHash,
            creatorId
        ]
    );


    res.cookie(
        TIKTOK_STATE_COOKIE,
        state,
        {

            httpOnly:
                true,

            secure:
                NODE_ENV !==
                "development",

            sameSite:
                "lax",

            priority:
                "high",

            maxAge:
                OAUTH_TTL_MS,

            path:
                "/auth/tiktok"

        }
    );


    const params =
        new URLSearchParams({

            client_key:
                CLIENT_KEY,

            response_type:
                "code",

            scope:
                REQUESTED_SCOPES.join(
                    ","
                ),

            redirect_uri:
                REDIRECT_URI,

            state

        });


    return res.redirect(
        `${TIKTOK_AUTHORIZE_URL}?${params.toString()}`
    );

}


// ============================================================
// TIKTOK OWNER GATE
// ============================================================

function renderTikTokOwnerGate(
    errorMessage = ""
) {

    const errorHtml =
        errorMessage
            ? `
                <p class="error">
                    ${escapeHtml(
                        errorMessage
                    )}
                </p>
              `
            : "";


    return renderPage(
        "TikTok Verbindung",
        `

        <p class="muted">
            Diese Verbindung ist aktuell als geschützter
            Creator-Owner-Login eingerichtet.
        </p>

        <p class="muted">
            TikTok-Tokens werden ausschließlich
            auf dem Server verarbeitet.
        </p>

        ${errorHtml}

        <form
            method="post"
            action="/auth/tiktok/start"
        >

            <label for="connect_code">
                Creator-Verbindungscode
            </label>

            <input
                id="connect_code"
                name="connect_code"
                type="password"
                required
                autocomplete="current-password"
            >

            <button
                class="button"
                type="submit"
            >
                TikTok Login starten
            </button>

        </form>

        <p class="muted small">
            Hier wird nicht dein TikTok-Passwort eingegeben.
        </p>

        `
    );

}


// ============================================================
// /auth/tiktok
// ============================================================

app.get(
    "/auth/tiktok",

    tiktokConnectLimiter,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        try {

            if (
                ALLOW_PUBLIC_TIKTOK_CONNECT
            ) {

                return await beginTikTokOAuth(
                    res,
                    DEFAULT_CREATOR_ID
                );

            }


            if (
                !TIKTOK_CONNECT_CODE
            ) {

                return res
                    .status(503)
                    .send(
                        renderPage(
                            "TikTok Verbindung",
                            `
                            <p>
                                Die TikTok-Verwaltung
                                ist derzeit gesperrt.
                            </p>

                            <p class="muted">
                                CFS_TIKTOK_CONNECT_CODE
                                ist auf dem Server nicht gesetzt.
                            </p>
                            `
                        )
                    );

            }


            return res.send(
                renderTikTokOwnerGate()
            );

        }
        catch (error) {

            safeLogError("TikTok Login Error:",error);


            return res
                .status(500)
                .send(
                    renderPage(
                        "TikTok Verbindung",
                        `
                        <p class="error">
                            TikTok Login konnte nicht gestartet werden.
                        </p>
                        `
                    )
                );

        }

    }
);


// ============================================================
// TIKTOK LOGIN START
// ============================================================

app.post(
    "/auth/tiktok/start",

    tiktokConnectLimiter,
    requireTrustedPublicWrite,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        try {

            if (
                ALLOW_PUBLIC_TIKTOK_CONNECT
            ) {

                return await beginTikTokOAuth(
                    res,
                    DEFAULT_CREATOR_ID
                );

            }


            if (
                !TIKTOK_CONNECT_CODE
            ) {

                return res
                    .status(503)
                    .send(
                        renderPage(
                            "TikTok Verbindung",
                            `
                            <p>
                                Privater Creator-Login
                                ist nicht eingerichtet.
                            </p>
                            `
                        )
                    );

            }


            const suppliedCode =
                String(
                    req.body?.connect_code ||
                    ""
                ).trim();


            if (
                !suppliedCode ||
                !safeEqualText(
                    TIKTOK_CONNECT_CODE,
                    suppliedCode
                )
            ) {

                return res
                    .status(403)
                    .send(
                        renderTikTokOwnerGate(
                            "Der Creator-Verbindungscode ist nicht korrekt."
                        )
                    );

            }


            return await beginTikTokOAuth(
                res,
                DEFAULT_CREATOR_ID
            );

        }
        catch (error) {

            safeLogError("TikTok Login Start Error:",error);


            return res
                .status(500)
                .send(
                    renderPage(
                        "TikTok Verbindung",
                        `
                        <p class="error">
                            TikTok Anmeldung konnte nicht gestartet werden.
                        </p>
                        `
                    )
                );

        }

    }
);


// ============================================================
// TIKTOK CALLBACK
// ============================================================

app.get(
    "/auth/tiktok/callback",
    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );


        try {

            const {
                code,
                state,
                error,
                error_description:
                    errorDescription
            } =
                req.query;


            if (
                error
            ) {

                return res
                    .status(400)
                    .send(
                        renderPage(
                            "TikTok Verbindung",
                            `
                            <p>
                                TikTok Verbindung wurde
                                nicht abgeschlossen.
                            </p>

                            <p class="muted">
                                ${escapeHtml(
                                    errorDescription ||
                                    error
                                )}
                            </p>
                            `
                        )
                    );

            }


            if (
                !code
            ) {

                return res
                    .status(400)
                    .send(
                        renderPage(
                            "TikTok Verbindung",
                            `
                            <p>
                                Kein Autorisierungscode
                                von TikTok erhalten.
                            </p>
                            `
                        )
                    );

            }


            const cookies =
                parseCookies(
                    req
                );


            const cookieState =
                cookies[
                    TIKTOK_STATE_COOKIE
                ];


            if (
                !state ||
                !cookieState ||
                !safeEqualText(
                    state,
                    cookieState
                )
            ) {

                return res
                    .status(400)
                    .send(
                        renderPage(
                            "Sicherheitsprüfung",
                            `
                            <p>
                                OAuth Sicherheitsprüfung
                                fehlgeschlagen.
                            </p>
                            `
                        )
                    );

            }


            const stateHash =
                hashValue(
                    state
                );


            const stateResult =
                await pool.query(
                    `
                    DELETE FROM tiktok_oauth_states

                    WHERE
                        state_hash = $1

                    AND
                        expires_at >= NOW()

                    RETURNING
                        creator_id
                    `,
                    [
                        stateHash
                    ]
                );


            if (
                !stateResult.rowCount
            ) {

                return res
                    .status(400)
                    .send(
                        renderPage(
                            "Sicherheitsprüfung",
                            `
                            <p>
                                Login ist abgelaufen
                                oder wurde bereits verwendet.
                            </p>
                            `
                        )
                    );

            }


            const creatorId =
                normalizeCreatorId(
                    stateResult
                        .rows[0]
                        .creator_id
                );


            const tokenData =
                await exchangeAuthorizationCode(
                    code
                );


            await saveTokens(
                creatorId,
                tokenData
            );


            const profile =
                await fetchTikTokProfile(
                    creatorId
                );


            res.clearCookie(
                TIKTOK_STATE_COOKIE,
                {
                    httpOnly:true,
                    secure:NODE_ENV !== "development",
                    sameSite:"lax",
                    priority:"high",
                    path:"/auth/tiktok"
                }
            );


            return res.send(
                renderPage(
                    "TikTok erfolgreich verbunden",
                    `

                    <div class="success">
                        ✓ TikTok erfolgreich verbunden
                    </div>

                    ${
                        profile.avatar_url
                            ? `
                                <img
                                    class="avatar"
                                    src="${escapeHtml(
                                        profile.avatar_url
                                    )}"
                                    alt="TikTok Profilbild"
                                >
                              `
                            : ""
                    }

                    <h2>
                        ${escapeHtml(
                            profile.display_name ||
                            "TikTok Creator"
                        )}
                    </h2>

                    <div class="stats">

                        <div>
                            <span>
                                Follower
                            </span>

                            <strong>
                                ${formatNumber(
                                    profile.follower_count
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Gefolgt
                            </span>

                            <strong>
                                ${formatNumber(
                                    profile.following_count
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Likes
                            </span>

                            <strong>
                                ${formatNumber(
                                    profile.likes_count
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Videos
                            </span>

                            <strong>
                                ${formatNumber(
                                    profile.video_count
                                )}
                            </strong>
                        </div>

                    </div>

                    <p>
                        <a
                            class="button"
                            href="/pages/tiktok.html"
                        >
                            Zum TikTok Hub
                        </a>
                    </p>

                    `
                )
            );

        }
        catch (error) {

            const diagnostic =
                getSafeDiagnostic(
                    error,
                    "oauth_callback"
                );


            console.error(
                "TikTok Callback Error:",
                diagnostic
            );


            return res
                .status(500)
                .send(
                    renderPage(
                        "TikTok Verbindung",
                        `

                        <p class="error">
                            Beim Verbinden mit TikTok
                            ist ein Fehler aufgetreten.
                        </p>

                        <p class="muted">
                            ${escapeHtml(
                                diagnosticMessage(
                                    diagnostic
                                )
                            )}
                        </p>

                        `
                    )
                );

        }

    }
);


// ============================================================
// TIKTOK TOKEN EXCHANGE
// ============================================================

async function exchangeAuthorizationCode(
    code
) {

    const body =
        new URLSearchParams({

            client_key:
                CLIENT_KEY,

            client_secret:
                CLIENT_SECRET,

            code:
                String(
                    code
                ),

            grant_type:
                "authorization_code",

            redirect_uri:
                REDIRECT_URI

        });


    const response =
        await fetchTikTok(
            TIKTOK_TOKEN_URL,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/x-www-form-urlencoded",

                    "Cache-Control":
                        "no-cache"

                },

                body

            }
        );


    const data =
        await safeJson(
            response
        );


    if (
        !response.ok ||
        !data?.access_token ||
        !data?.refresh_token
    ) {

        throw createTikTokApiError(
            "token_exchange",
            response,
            data,
            "TikTok Token Exchange fehlgeschlagen."
        );

    }


    return data;

}


// ============================================================
// ACCESS TOKEN PRÜFEN
// ============================================================

async function ensureFreshAccessToken(
    creatorId
) {

    const connection =
        await getConnection(
            creatorId
        );


    if (
        !connection?.connected
    ) {

        throw new Error(
            "Keine TikTok-Verbindung."
        );

    }


    const expiresAt =
        Number(
            connection
                .access_expires_at ||
            0
        );


    if (
        connection.access_token &&
        expiresAt &&
        Date.now() <
            expiresAt -
            ACCESS_TOKEN_SAFETY_WINDOW_MS
    ) {

        return true;

    }


    await refreshAccessToken(
        creatorId
    );


    return true;

}


// ============================================================
// TOKEN REFRESH
// ============================================================

async function refreshAccessToken(
    creatorId
) {

    const connection =
        await getConnection(
            creatorId
        );


    if (
        !connection?.refresh_token
    ) {

        throw new Error(
            "Kein Refresh Token vorhanden."
        );

    }


    const body =
        new URLSearchParams({

            client_key:
                CLIENT_KEY,

            client_secret:
                CLIENT_SECRET,

            grant_type:
                "refresh_token",

            refresh_token:
                connection
                    .refresh_token

        });


    const response =
        await fetchTikTok(
            TIKTOK_TOKEN_URL,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/x-www-form-urlencoded",

                    "Cache-Control":
                        "no-cache"

                },

                body

            }
        );


    const data =
        await safeJson(
            response
        );


    if (
        !response.ok ||
        !data?.access_token
    ) {

        throw createTikTokApiError(
            "token_refresh",
            response,
            data,
            "TikTok Token Refresh fehlgeschlagen."
        );

    }


    await saveTokens(
        creatorId,
        {

            ...data,

            refresh_token:
                data.refresh_token ||
                connection.refresh_token

        }
    );

}


// ============================================================
// TIKTOK PROFIL LADEN
// ============================================================

async function fetchTikTokProfile(
    creatorId
) {

    await ensureFreshAccessToken(
        creatorId
    );


    const connection =
        await getConnection(
            creatorId
        );


    if (
        !connection?.access_token
    ) {

        throw new Error(
            "Kein TikTok Access Token vorhanden."
        );

    }


    const fields = [

        "open_id",
        "avatar_url",
        "display_name",
        "follower_count",
        "following_count",
        "likes_count",
        "video_count"

    ].join(",");


    const url =
        TIKTOK_USER_INFO_URL +
        "?fields=" +
        encodeURIComponent(
            fields
        );


    const response =
        await fetchTikTok(
            url,
            {

                method:
                    "GET",

                headers: {

                    Authorization:
                        `Bearer ${connection.access_token}`,

                    "Cache-Control":
                        "no-cache"

                }

            }
        );


    const data =
        await safeJson(
            response
        );


    if (
        !response.ok ||
        !data?.data?.user
    ) {

        throw createTikTokApiError(
            "user_info",
            response,
            data,
            "TikTok User Info fehlgeschlagen."
        );

    }


    const user =
        data.data.user;


    const profile = {

        open_id:
            user.open_id ||
            connection.open_id ||
            "",

        display_name:
            user.display_name ||
            "",

        avatar_url:
            user.avatar_url ||
            "",

        follower_count:
            Number(
                user.follower_count ||
                0
            ),

        following_count:
            Number(
                user.following_count ||
                0
            ),

        likes_count:
            Number(
                user.likes_count ||
                0
            ),

        video_count:
            Number(
                user.video_count ||
                0
            ),

        updated_at:
            new Date()
                .toISOString()

    };


    await saveProfile(
        creatorId,
        profile
    );


    return profile;

}
// ============================================================
// TIKTOK RESET
// ============================================================

app.get(
    "/auth/tiktok/reset",
    (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        return res.send(
            renderPage(
                "TikTok Verbindung zurücksetzen",
                `

                <p class="muted">
                    Hier wird nur die aktuell gespeicherte
                    TikTok-Verbindung der cfs_zockt
                    Creator Suite gelöscht.
                </p>

                <form
                    method="post"
                    action="/auth/tiktok/reset"
                >

                    <label for="connect_code">
                        Creator-Verbindungscode
                    </label>

                    <input
                        id="connect_code"
                        name="connect_code"
                        type="password"
                        required
                        autocomplete="current-password"
                    >

                    <button
                        class="button danger"
                        type="submit"
                    >
                        TikTok Verbindung zurücksetzen
                    </button>

                </form>

                `
            )
        );

    }
);


app.post(
    "/auth/tiktok/reset",
    requireTrustedPublicWrite,
    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const suppliedCode =
                String(
                    req.body?.connect_code ||
                    ""
                ).trim();


            if (
                !TIKTOK_CONNECT_CODE ||
                !suppliedCode ||
                !safeEqualText(
                    TIKTOK_CONNECT_CODE,
                    suppliedCode
                )
            ) {

                return res
                    .status(403)
                    .send(
                        renderPage(
                            "TikTok Verbindung zurücksetzen",
                            `
                            <p class="error">
                                Verbindungscode ist nicht korrekt.
                            </p>
                            `
                        )
                    );

            }


            await pool.query(
                `
                DELETE FROM tiktok_connections
                WHERE creator_id = $1
                `,
                [
                    DEFAULT_CREATOR_ID
                ]
            );


            await pool.query(
                `
                DELETE FROM tiktok_oauth_states
                `
            );


            console.log(
                "[CFS TikTok] TikTok-Verbindung wurde zurückgesetzt."
            );


            return res.send(
                renderPage(
                    "TikTok zurückgesetzt",
                    `

                    <div class="success">
                        ✓ TikTok-Verbindung wurde gelöscht
                    </div>

                    <p class="muted">
                        Jetzt kannst du TikTok neu verbinden.
                    </p>

                    <p>
                        <a
                            class="button"
                            href="/auth/tiktok"
                        >
                            TikTok neu verbinden
                        </a>
                    </p>

                    `
                )
            );

        }
        catch (error) {

            safeLogError("TikTok Reset Fehler:",error);


            return res
                .status(500)
                .send(
                    renderPage(
                        "TikTok Reset Fehler",
                        `
                        <p class="error">
                            Die TikTok-Verbindung konnte
                            nicht zurückgesetzt werden.
                        </p>
                        `
                    )
                );

        }

    }
);


// ============================================================
// TIKTOK DISCONNECT
// ============================================================

app.post(
    "/auth/tiktok/disconnect",

    requireLauncherKey,

    async (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        try {

            const creatorId =
                creatorIdFromRequest(
                    req
                );


            const connection =
                await getConnection(
                    creatorId
                );


            if (
                connection?.access_token
            ) {

                const body =
                    new URLSearchParams({

                        client_key:
                            CLIENT_KEY,

                        client_secret:
                            CLIENT_SECRET,

                        token:
                            connection.access_token

                    });


                const revokeResponse =
                    await fetchTikTok(
                        TIKTOK_REVOKE_URL,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/x-www-form-urlencoded"

                            },

                            body

                        }
                    );


                if (
                    !revokeResponse.ok
                ) {

                    const revokeData =
                        await safeJson(
                            revokeResponse
                        );


                    console.warn(
                        "TikTok Revoke:",
                        sanitizeTikTokError(
                            revokeData
                        )
                    );

                }

            }


            await pool.query(
                `
                DELETE FROM tiktok_connections
                WHERE creator_id = $1
                `,
                [
                    creatorId
                ]
            );


            return res.json({

                ok:
                    true,

                connected:
                    false,

                creator_id:
                    creatorId

            });

        }
        catch (error) {

            safeLogError("Disconnect Error:",error);


            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "TikTok-Verbindung konnte nicht getrennt werden."

                });

        }

    }
);


// ============================================================
// TIKTOK FETCH MIT TIMEOUT
// ============================================================

async function fetchTikTok(
    url,
    options = {}
) {

    const target = assertOutboundHttpsUrl(url,{allowedHosts:["open.tiktokapis.com"],label:"TikTok API URL"});
    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => {

                controller.abort();

            },
            TIKTOK_TIMEOUT_MS
        );


    try {

        return await fetch(
            target.href,
            {

                ...options,

                // TikTok API-Aufrufe dürfen nicht still zu einem anderen Host
                // weitergeleitet werden. Das verhindert Redirect-Leaks von Tokens.
                redirect:
                    "error",

                signal:
                    controller.signal

            }
        );

    }
    catch (error) {

        if (
            error?.name ===
            "AbortError"
        ) {

            const timeoutError =
                new Error(
                    "TikTok Anfrage hat das Zeitlimit überschritten."
                );


            timeoutError.tiktokDiagnostic = {

                stage:
                    "network_timeout",

                http_status:
                    null,

                code:
                    "timeout",

                description:
                    "TikTok API antwortete nicht innerhalb von 15 Sekunden.",

                log_id:
                    ""

            };


            throw timeoutError;

        }


        throw error;

    }
    finally {

        clearTimeout(
            timeout
        );

    }

}


// ============================================================
// JSON SICHER LESEN
// ============================================================

async function safeJson(
    response
) {

    const text =
        await readResponseTextBounded(response,1024*1024);


    if (
        !text
    ) {

        return {};

    }


    try {

        return JSON.parse(
            text
        );

    }
    catch {

        return {

            raw_response:
                text.slice(
                    0,
                    500
                )

        };

    }

}


// ============================================================
// TIKTOK FEHLER SÄUBERN
// ============================================================

function sanitizeTikTokError(
    data
) {

    if (
        !data ||
        typeof data !==
            "object"
    ) {

        return {};

    }


    const nested =
        data.error &&
        typeof data.error ===
            "object"
            ? data.error
            : {};


    const code =

        nested.code ??

        data.code ??

        data.error_code ??

        (
            typeof data.error ===
            "string"
                ? data.error
                : ""
        );


    const description =

        nested.message ??

        data.error_description ??

        data.message ??

        "";


    const logId =

        nested.log_id ??

        data.log_id ??

        "";


    return {

        code:
            cleanDiagnosticText(
                code,
                120
            ),

        description:
            cleanDiagnosticText(
                description,
                300
            ),

        log_id:
            cleanDiagnosticText(
                logId,
                160
            )

    };

}


// ============================================================
// TIKTOK API ERROR
// ============================================================

function createTikTokApiError(
    stage,
    response,
    data,
    fallbackMessage
) {

    const safe =
        sanitizeTikTokError(
            data
        );


    const diagnostic = {

        stage:
            cleanDiagnosticText(
                stage,
                80
            ),

        http_status:
            response &&
            Number.isFinite(
                Number(
                    response.status
                )
            )
                ? Number(
                    response.status
                )
                : null,

        code:
            safe.code ||
            "",

        description:
            safe.description ||
            "",

        log_id:
            safe.log_id ||
            ""

    };


    console.error(
        `[CFS TikTok] ${stage} fehlgeschlagen:`,
        diagnostic
    );


    const error =
        new Error(
            fallbackMessage ||
            "TikTok API Fehler."
        );


    error.tiktokDiagnostic =
        diagnostic;


    return error;

}


// ============================================================
// DIAGNOSE
// ============================================================

function getSafeDiagnostic(
    error,
    fallbackStage =
        "unknown"
) {

    if (
        error?.tiktokDiagnostic &&
        typeof error.tiktokDiagnostic ===
            "object"
    ) {

        const source =
            error.tiktokDiagnostic;


        return {

            stage:
                cleanDiagnosticText(
                    source.stage ||
                    fallbackStage,
                    80
                ),

            http_status:
                Number.isFinite(
                    Number(
                        source.http_status
                    )
                )
                    ? Number(
                        source.http_status
                    )
                    : null,

            code:
                cleanDiagnosticText(
                    source.code ||
                    "",
                    120
                ),

            description:
                cleanDiagnosticText(
                    source.description ||
                    "",
                    300
                ),

            log_id:
                cleanDiagnosticText(
                    source.log_id ||
                    "",
                    160
                )

        };

    }


    return {

        stage:
            cleanDiagnosticText(
                fallbackStage,
                80
            ),

        http_status:
            null,

        code:
            "",

        description:
            cleanDiagnosticText(
                error?.message ||
                "Unbekannter Fehler",
                300
            ),

        log_id:
            ""

    };

}


// ============================================================
// DIAGNOSE TEXT
// ============================================================

function diagnosticMessage(
    diagnostic
) {

    const parts = [
        "TikTok Profildaten konnten nicht aktualisiert werden."
    ];


    if (
        diagnostic?.stage
    ) {

        parts.push(
            `Stufe: ${diagnostic.stage}`
        );

    }


    if (
        diagnostic?.http_status
    ) {

        parts.push(
            `TikTok HTTP ${diagnostic.http_status}`
        );

    }


    if (
        diagnostic?.code
    ) {

        parts.push(
            `Code: ${diagnostic.code}`
        );

    }


    if (
        diagnostic?.description
    ) {

        parts.push(
            `Meldung: ${diagnostic.description}`
        );

    }


    if (
        diagnostic?.log_id
    ) {

        parts.push(
            `Log-ID: ${diagnostic.log_id}`
        );

    }


    return parts.join(
        " | "
    );

}


// ============================================================
// DIAGNOSE TEXT BEREINIGEN
// ============================================================

function cleanDiagnosticText(
    value,
    maxLength =
        300
) {

    return redactSensitiveText(
        value ??
        ""
    )
        .replace(
            /[\r\n\t]+/g,
            " "
        )
        .trim()
        .slice(
            0,
            maxLength
        );

}


// ============================================================
// COOKIES
// ============================================================

function parseCookies(
    req
) {

    const result =
        {};


    const header =
        req.headers.cookie ||
        "";


    for (
        const item
        of header.split(";")
    ) {

        const index =
            item.indexOf("=");


        if (
            index ===
            -1
        ) {

            continue;

        }


        const key =
            item
                .slice(
                    0,
                    index
                )
                .trim();


        const value =
            item
                .slice(
                    index + 1
                )
                .trim();


        if (
            !key
        ) {

            continue;

        }


        try {

            result[key] =
                decodeURIComponent(
                    value
                );

        }
        catch {

            result[key] =
                value;

        }

    }


    return result;

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value ??
        ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


// ============================================================
// ZAHL FORMATIEREN
// ============================================================

function formatNumber(
    value
) {

    return new Intl
        .NumberFormat(
            "de-DE"
        )
        .format(
            Number(
                value ||
                0
            )
        );

}


// ============================================================
// PUBLIC ORDNER ERMITTELN
// ============================================================

function resolvePublicDirectory() {

    if (
        process.env.PUBLIC_DIR
    ) {

        return path.resolve(
            __dirname,
            process.env.PUBLIC_DIR
        );

    }


    const candidates = [

        path.join(
            __dirname,
            "public"
        ),

        path.join(
            __dirname,
            "Öffentlich"
        )

    ];


    for (
        const candidate
        of candidates
    ) {

        if (
            fs.existsSync(
                candidate
            )
        ) {

            return candidate;

        }

    }


    return path.join(
        __dirname,
        "public"
    );

}


const PUBLIC_DIR =
    resolvePublicDirectory();


// ============================================================
// SERVER HTML SEITE
// ============================================================

function renderPage(
    title,
    content
) {

    return `
    <!doctype html>

    <html lang="de">

    <head>

        <meta charset="utf-8">

        <meta
            name="viewport"
            content="width=device-width,initial-scale=1"
        >

        <meta
            name="robots"
            content="noindex,nofollow"
        >

        <title>
            ${escapeHtml(title)} | cfs_zockt
        </title>

        <style>

            * {
                box-sizing: border-box;
            }

            body {

                margin: 0;

                min-height: 100vh;

                padding: 40px 20px;

                background:
                    radial-gradient(
                        circle at top,
                        rgba(0, 120, 255, .22),
                        transparent 45%
                    ),
                    #070a11;

                color: #fff;

                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;

            }

            main {

                width:
                    min(
                        700px,
                        100%
                    );

                margin: auto;

                padding: 32px;

                border:
                    1px solid #26334c;

                border-radius: 24px;

                background:
                    #0d121d;

                text-align:
                    center;

            }

            h1,
            h2 {
                margin-top: 10px;
            }

            .muted {

                color:
                    #9caac0;

                line-height:
                    1.6;

            }

            .small {
                font-size: 13px;
            }

            .error {

                color:
                    #ff9fac;

                font-weight:
                    bold;

            }

            .success {

                display:
                    inline-block;

                padding:
                    10px 15px;

                margin-bottom:
                    15px;

                border-radius:
                    30px;

                background:
                    #12361e;

                color:
                    #94f3ae;

            }

            .avatar {

                display:
                    block;

                width:
                    110px;

                height:
                    110px;

                margin:
                    18px auto;

                border-radius:
                    50%;

                object-fit:
                    cover;

                border:
                    3px solid #198cff;

            }

            .stats {

                display:
                    grid;

                grid-template-columns:
                    repeat(
                        2,
                        1fr
                    );

                gap:
                    12px;

                margin:
                    25px 0;

            }

            .stats div {

                padding:
                    18px;

                background:
                    #080d16;

                border:
                    1px solid #253149;

                border-radius:
                    14px;

            }

            .stats span {

                display:
                    block;

                color:
                    #94a2bb;

                margin-bottom:
                    8px;

            }

            .stats strong {
                font-size: 25px;
            }

            form {

                width:
                    min(
                        420px,
                        100%
                    );

                margin:
                    24px auto;

                text-align:
                    left;

            }

            label {

                display:
                    block;

                margin-bottom:
                    8px;

                font-weight:
                    bold;

            }

            input {

                width:
                    100%;

                min-height:
                    46px;

                padding:
                    10px 12px;

                border:
                    1px solid #32405c;

                border-radius:
                    10px;

                background:
                    #09111e;

                color:
                    #fff;

                font:
                    inherit;

            }

            .button {

                display:
                    inline-block;

                margin-top:
                    15px;

                padding:
                    13px 20px;

                border:
                    0;

                background:
                    #168cff;

                color:
                    #fff;

                text-decoration:
                    none;

                border-radius:
                    12px;

                font-weight:
                    bold;

                cursor:
                    pointer;

            }

            form .button {
                width: 100%;
            }

            .danger {
                background: #b42333;
            }

            @media (
                max-width: 500px
            ) {

                .stats {
                    grid-template-columns:
                        1fr;
                }

            }

        </style>

    </head>

    <body>

        <main>

            <p class="muted">
                cfs_zockt Creator Suite
            </p>

            <h1>
                ${escapeHtml(title)}
            </h1>

            ${content}

        </main>

    </body>

    </html>
    `;

}


// ============================================================
// CSP-VERSTOSS-TELEMETRIE · PUBLIC RESILIENCE PASS 15
//
// Browser dürfen Verstöße der bereits erzwungenen CSP melden. Gespeichert
// werden nur normalisierte/aggregierte Felder: keine rohe IP, kein User-Agent,
// keine Query-Strings und keine vollständigen tokenartigen Pfadsegmente.
// ============================================================

const CSP_REPORT_RETENTION_DAYS = 30;
const CSP_REPORT_MAX_ROWS = 5000;

const publicCspReportLimiter =
    createRateLimiter({
        windowMs: 60 * 1000,
        max: 60,
        keyGenerator: req => requestIp(req),
        message: "Zu viele Security-Telemetrieberichte."
    });

function cspSafeToken(value,maxLength=240) {
    return String(value||"")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g,"")
        .slice(0,maxLength);
}

function cspSafeRoute(value) {
    try {
        const url = new URL(String(value||""),APP_CANONICAL_ORIGIN);
        if (url.origin !== APP_CANONICAL_ORIGIN) return "external";
        const route = url.pathname
            .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/gi,":id")
            .split("/")
            .map(segment => /^[A-Za-z0-9_-]{24,}$/.test(segment) ? ":token" : segment)
            .join("/");
        return route.slice(0,240) || "/";
    }
    catch {
        return "unknown";
    }
}

function cspBlockedTarget(value) {
    const raw = String(value||"").trim();
    const lower = raw.toLowerCase();
    if (!raw) return {kind:"unknown",host:""};
    if (["inline","eval","wasm-eval","trusted-types-sink"].includes(lower)) return {kind:lower,host:""};
    if (lower.startsWith("data:")) return {kind:"data",host:""};
    if (lower.startsWith("blob:")) return {kind:"blob",host:""};
    try {
        const url = new URL(raw,APP_CANONICAL_ORIGIN);
        if (url.origin === APP_CANONICAL_ORIGIN) return {kind:"self",host:""};
        return {kind:"external",host:String(url.hostname||"").toLowerCase().slice(0,255)};
    }
    catch {
        return {kind:"other",host:""};
    }
}

function cspViolationBodies(payload) {
    const items = Array.isArray(payload) ? payload : [payload];
    const out=[];
    for (const item of items.slice(0,10)) {
        if (!item || typeof item !== "object") continue;
        if (item["csp-report"] && typeof item["csp-report"] === "object") out.push(item["csp-report"]);
        else if (String(item.type||"") === "csp-violation" && item.body && typeof item.body === "object") out.push(item.body);
        else if (item.effectiveDirective || item["effective-directive"]) out.push(item);
    }
    return out;
}

function normalizeCspViolation(body) {
    const directive = cspSafeToken(body?.effectiveDirective ?? body?.["effective-directive"],80);
    if (!directive) return null;
    const documentValue = body?.documentURL ?? body?.["document-uri"] ?? "";
    const documentRoute = cspSafeRoute(documentValue);
    if (documentRoute === "external") return null;
    const sourceValue = body?.sourceFile ?? body?.["source-file"] ?? "";
    const blocked = cspBlockedTarget(body?.blockedURL ?? body?.["blocked-uri"] ?? "");
    const statusCode = Math.max(0,Math.min(999,Math.trunc(Number(body?.statusCode ?? body?.["status-code"] ?? 0)||0)));
    const item={
        effective_directive:directive,
        blocked_kind:blocked.kind,
        blocked_host:blocked.host,
        document_route:documentRoute,
        source_route:sourceValue?cspSafeRoute(sourceValue):"",
        status_code:statusCode
    };
    item.fingerprint=crypto.createHash("sha256").update(JSON.stringify(item)).digest("hex");
    return item;
}

app.post(
    "/api/public/security/csp-report",
    publicCspReportLimiter,
    express.json({
        type:["application/csp-report","application/reports+json"],
        limit:"32kb",
        strict:false
    }),
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const reports=cspViolationBodies(req.body).map(normalizeCspViolation).filter(Boolean);
            for(const report of reports){
                await pool.query(`
                    INSERT INTO public_csp_reports(
                        fingerprint,effective_directive,blocked_kind,blocked_host,document_route,source_route,status_code,
                        occurrences,first_seen,last_seen
                    ) VALUES($1,$2,$3,$4,$5,$6,$7,1,NOW(),NOW())
                    ON CONFLICT(fingerprint) DO UPDATE SET
                        occurrences=public_csp_reports.occurrences+1,
                        last_seen=NOW(),
                        status_code=EXCLUDED.status_code
                `,[report.fingerprint,report.effective_directive,report.blocked_kind,report.blocked_host,report.document_route,report.source_route,report.status_code]);
            }
            if(reports.length){
                await pool.query(`DELETE FROM public_csp_reports WHERE last_seen < NOW() - ($1::int * INTERVAL '1 day')`,[CSP_REPORT_RETENTION_DAYS]);
                await pool.query(`
                    DELETE FROM public_csp_reports
                    WHERE fingerprint IN (
                        SELECT fingerprint FROM public_csp_reports
                        ORDER BY last_seen DESC OFFSET $1
                    )
                `,[CSP_REPORT_MAX_ROWS]);
            }
            return res.status(204).end();
        }catch(error){
            safeLogError("CSP Report Telemetrie Fehler:",error);
            return res.status(204).end();
        }
    }
);

app.get(
    "/api/admin/creator-suite/csp-reports",
    requireCreatorAccount,
    requireCreatorAdmin,
    async(_req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const [rowsResult,summaryResult]=await Promise.all([
                pool.query(`
                    SELECT effective_directive,blocked_kind,blocked_host,document_route,source_route,status_code,
                           occurrences,first_seen,last_seen
                    FROM public_csp_reports
                    ORDER BY last_seen DESC
                    LIMIT 100
                `),
                pool.query(`
                    SELECT
                        COALESCE(SUM(occurrences),0)::bigint AS occurrences,
                        COUNT(*)::int AS unique_patterns,
                        COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '24 hours')::int AS active_patterns_24h,
                        COALESCE(SUM(occurrences) FILTER (WHERE blocked_kind='external'),0)::bigint AS external_occurrences
                    FROM public_csp_reports
                `)
            ]);
            const summary=summaryResult.rows[0]||{};
            return res.json({
                ok:true,
                privacy:{raw_ip_stored:false,user_agent_stored:false,query_strings_stored:false,retention_days:CSP_REPORT_RETENTION_DAYS},
                summary:{
                    occurrences:Number(summary.occurrences||0),
                    unique_patterns:Number(summary.unique_patterns||0),
                    active_patterns_24h:Number(summary.active_patterns_24h||0),
                    external_occurrences:Number(summary.external_occurrences||0)
                },
                reports:rowsResult.rows.map(row=>({
                    effective_directive:String(row.effective_directive||""),
                    blocked_kind:String(row.blocked_kind||"unknown"),
                    blocked_host:String(row.blocked_host||""),
                    document_route:String(row.document_route||""),
                    source_route:String(row.source_route||""),
                    status_code:Number(row.status_code||0),
                    occurrences:Number(row.occurrences||0),
                    first_seen:row.first_seen||null,
                    last_seen:row.last_seen||null
                }))
            });
        }catch(error){
            safeLogError("Admin CSP Reports Fehler:",error);
            return res.status(500).json({ok:false,error:"CSP-Telemetrie konnte nicht geladen werden.",reference:_req?.requestId||null});
        }
    }
);


// ============================================================
// PRIVATE SUPPORT- / SECURITY-MELDUNGEN · WEBSITE
// ============================================================

const PUBLIC_SUPPORT_CATEGORIES = new Set(["security","account","privacy","technical","other"]);
const PUBLIC_SUPPORT_PRIORITIES = new Set(["normal","high","critical"]);
const PUBLIC_SUPPORT_STATUSES = new Set(["new","reviewing","resolved","rejected"]);
const PUBLIC_SUPPORT_CONTACT_RETENTION_DAYS = 30;
const PUBLIC_SUPPORT_RESOLVED_RETENTION_DAYS = 90;

function publicSupportText(value,maxLength,fallback="") {
    const text=String(value??"")
        .replace(/[\u0000-\u001f\u007f]/g," ")
        .replace(/\s+/g," ")
        .trim();
    return (text||fallback).slice(0,maxLength);
}

function publicSupportMessage(value,maxLength=4000) {
    return String(value??"")
        .replace(/\u0000/g,"")
        .replace(/\r\n?/g,"\n")
        .trim()
        .slice(0,maxLength);
}

function publicSupportEmail(value) {
    const email=String(value||"").trim().toLowerCase().slice(0,254);
    if(!email)return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:"";
}

function publicSupportSourcePath(value) {
    const pathValue=String(value||"").trim().slice(0,320);
    return /^\/[A-Za-z0-9_~!$&'()*+,;=:@%./?#-]*$/.test(pathValue)?pathValue:"";
}

function publicSupportHash(value) {
    return crypto
        .createHmac("sha256",PUBLIC_SUPPORT_HASH_SALT)
        .update(String(value||""))
        .digest("hex");
}

function publicSupportSubmissionId(value) {
    const token=String(value||"").trim();
    return /^[A-Za-z0-9_-]{20,120}$/.test(token)?token:"";
}

function publicSupportContainsSecret(value) {
    const text=String(value||"");
    if(!text)return false;
    const patterns=[
        /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
        /\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+\/=-]{16,}/i,
        /\b(?:access[_ -]?token|refresh[_ -]?token|api[_ -]?key|client[_ -]?secret|password|passwort|secret)\s*[:=]\s*["']?[A-Za-z0-9._~+\/=-]{12,}/i,
        /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
        /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/i,
        /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
        /https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/i
    ];
    return patterns.some(pattern=>pattern.test(text));
}

function publicSupportReportRow(row) {
    return {
        id:String(row?.id||""),
        category:String(row?.category||"other"),
        priority:String(row?.priority||"normal"),
        contact_email:String(row?.contact_email||""),
        subject:String(row?.subject||""),
        message:String(row?.message||""),
        source_path:String(row?.source_path||""),
        status:String(row?.status||"new"),
        admin_note:String(row?.admin_note||""),
        handled_at:row?.handled_at||null,
        handled_by:row?.handled_by||null,
        created_at:row?.created_at||null,
        updated_at:row?.updated_at||null
    };
}

app.post(
    "/api/public/support/report",
    publicSupportReportLimiter,
    requireTrustedPublicWrite,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            // Honeypot: Bots dürfen eine neutrale Erfolgsmeldung bekommen,
            // ohne einen Datensatz zu erzeugen.
            if(String(req.body?.website||"").trim()){
                return res.status(202).json({ok:true,message:"Danke. Deine Meldung wurde angenommen."});
            }

            const submissionId=publicSupportSubmissionId(req.body?.submission_id);
            const category=String(req.body?.category||"").trim();
            const priority=String(req.body?.priority||"normal").trim();
            const contactEmail=publicSupportEmail(req.body?.contact_email);
            const subject=publicSupportText(req.body?.subject,140,"");
            const message=publicSupportMessage(req.body?.message,4000);
            const sourcePath=publicSupportSourcePath(req.body?.source_path);

            if(!submissionId)return res.status(400).json({ok:false,error:"Meldungs-Sitzung ist ungültig. Bitte lade die Seite neu."});
            if(!PUBLIC_SUPPORT_CATEGORIES.has(category))return res.status(400).json({ok:false,error:"Bitte wähle einen gültigen Bereich."});
            if(!PUBLIC_SUPPORT_PRIORITIES.has(priority))return res.status(400).json({ok:false,error:"Bitte wähle eine gültige Dringlichkeit."});
            if(String(req.body?.contact_email||"").trim()&&!contactEmail)return res.status(400).json({ok:false,error:"Bitte gib eine gültige E-Mail-Adresse an oder lasse das Feld leer."});
            if(subject.length<5)return res.status(400).json({ok:false,error:"Bitte beschreibe das Thema mit mindestens 5 Zeichen."});
            if(message.length<20)return res.status(400).json({ok:false,error:"Bitte beschreibe die Meldung mit mindestens 20 Zeichen."});
            if(publicSupportContainsSecret(`${subject}\n${message}`)){
                return res.status(400).json({ok:false,error:"Bitte entferne Passwörter, Tokens, private Schlüssel oder andere Secrets aus der Meldung."});
            }

            const submitterHash=publicSupportHash(`submitter|${requestIp(req)}|${String(req.get("User-Agent")||"").slice(0,220)}`);
            const submissionHash=publicSupportHash(`submission|${submissionId}`);

            const recentResult=await pool.query(`
                SELECT COUNT(*)::int AS recent_reports
                FROM public_support_reports
                WHERE submitter_hash=$1
                  AND created_at > NOW() - ($2::bigint * INTERVAL '1 millisecond')
            `,[submitterHash,PUBLIC_SUPPORT_RATE_WINDOW_MS]);

            if(Number(recentResult.rows[0]?.recent_reports||0)>=PUBLIC_SUPPORT_RATE_MAX){
                res.setHeader("Retry-After",String(Math.ceil(PUBLIC_SUPPORT_RATE_WINDOW_MS/1000)));
                return res.status(429).json({ok:false,error:"Zu viele Support-Meldungen in kurzer Zeit. Bitte versuche es später erneut."});
            }

            const result=await pool.query(`
                INSERT INTO public_support_reports(
                    submission_hash,submitter_hash,category,priority,contact_email,subject,message,source_path,
                    status,admin_note,handled_at,handled_by,created_at,updated_at
                )
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,'new','',NULL,NULL,NOW(),NOW())
                ON CONFLICT(submission_hash) DO NOTHING
                RETURNING id,created_at
            `,[submissionHash,submitterHash,category,priority,contactEmail,subject,message,sourcePath]);

            return res.status(result.rows[0]?201:200).json({
                ok:true,
                duplicate:!result.rows[0],
                reference:result.rows[0]?.id||null,
                message:"Danke. Deine Meldung wurde privat gespeichert und ist nicht öffentlich sichtbar."
            });
        }catch(error){
            safeLogError("Public Support Report Fehler:",error);
            return res.status(500).json({ok:false,error:"Die Meldung konnte nicht gespeichert werden."});
        }
    }
);

app.get(
    "/api/admin/creator-suite/support-reports",
    requireCreatorAccount,
    requireCreatorAdmin,
    requireCreatorAdminSensitiveRead,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            await cleanupOldSupportReports();
            const requestedStatus=String(req.query?.status||"new").trim();
            const requestedCategory=String(req.query?.category||"all").trim();
            const query=publicSupportText(req.query?.q,100,"");
            const params=[];
            const where=[];

            if(requestedStatus!=="all"){
                if(!PUBLIC_SUPPORT_STATUSES.has(requestedStatus))return res.status(400).json({ok:false,error:"Unbekannter Support-Status."});
                params.push(requestedStatus);where.push(`status=$${params.length}`);
            }
            if(requestedCategory!=="all"){
                if(!PUBLIC_SUPPORT_CATEGORIES.has(requestedCategory))return res.status(400).json({ok:false,error:"Unbekannte Support-Kategorie."});
                params.push(requestedCategory);where.push(`category=$${params.length}`);
            }
            if(query){
                params.push(`%${query}%`);
                where.push(`(subject ILIKE $${params.length} OR message ILIKE $${params.length} OR contact_email ILIKE $${params.length} OR admin_note ILIKE $${params.length})`);
            }

            const condition=where.length?`WHERE ${where.join(" AND ")}`:"";
            const [reportsResult,summaryResult]=await Promise.all([
                pool.query(`SELECT * FROM public_support_reports ${condition} ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,created_at DESC LIMIT 250`,params),
                pool.query(`
                    SELECT
                        COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE status='new')::int AS new,
                        COUNT(*) FILTER (WHERE status='reviewing')::int AS reviewing,
                        COUNT(*) FILTER (WHERE status='resolved')::int AS resolved,
                        COUNT(*) FILTER (WHERE status='new' AND category='security')::int AS new_security,
                        COUNT(*) FILTER (WHERE status IN ('new','reviewing') AND priority='critical')::int AS critical_open
                    FROM public_support_reports
                `)
            ]);
            const summary=summaryResult.rows[0]||{};
            return res.json({
                ok:true,
                retention:{
                    contact_email_days:PUBLIC_SUPPORT_CONTACT_RETENTION_DAYS,
                    resolved_report_days:PUBLIC_SUPPORT_RESOLVED_RETENTION_DAYS
                },
                summary:{
                    total:Number(summary.total||0),
                    new:Number(summary.new||0),
                    reviewing:Number(summary.reviewing||0),
                    resolved:Number(summary.resolved||0),
                    new_security:Number(summary.new_security||0),
                    critical_open:Number(summary.critical_open||0)
                },
                reports:reportsResult.rows.map(publicSupportReportRow)
            });
        }catch(error){
            safeLogError("Admin Support Reports Fehler:",error);
            return res.status(500).json({ok:false,error:"Support-Meldungen konnten nicht geladen werden."});
        }
    }
);

app.put(
    "/api/admin/creator-suite/support-reports/:id",
    requireCreatorAccount,
    requireCreatorAdmin,
    requireTrustedPublicWrite,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const status=String(req.body?.status||"").trim();
            if(!PUBLIC_SUPPORT_STATUSES.has(status))return res.status(400).json({ok:false,error:"Bitte einen gültigen Support-Status wählen."});
            const adminNote=publicSupportMessage(req.body?.admin_note,2000);
            const result=await pool.query(`
                UPDATE public_support_reports
                SET status=$2,admin_note=$3,handled_at=NOW(),handled_by=$4,updated_at=NOW()
                WHERE id=$1
                RETURNING *
            `,[String(req.params.id||""),status,adminNote,req.creatorAccount.id]);
            if(!result.rows[0])return res.status(404).json({ok:false,error:"Support-Meldung nicht gefunden."});
            return res.json({ok:true,report:publicSupportReportRow(result.rows[0])});
        }catch(error){
            safeLogError("Admin Support Report Update Fehler:",error);
            return res.status(500).json({ok:false,error:"Support-Meldung konnte nicht aktualisiert werden."});
        }
    }
);


app.delete(
    "/api/admin/creator-suite/support-reports/:id",
    requireCreatorAccount,
    requireCreatorAdmin,
    requireTrustedPublicWrite,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const id=String(req.params.id||"");
            const current=await pool.query(`SELECT status FROM public_support_reports WHERE id=$1 LIMIT 1`,[id]);
            if(!current.rows[0])return res.status(404).json({ok:false,error:"Support-Meldung nicht gefunden."});
            if(!["resolved","rejected"].includes(String(current.rows[0].status||""))){
                return res.status(409).json({ok:false,error:"Offene Support-Meldungen müssen vor dem endgültigen Löschen erledigt oder abgewiesen werden."});
            }
            await pool.query(`DELETE FROM public_support_reports WHERE id=$1`,[id]);
            return res.json({ok:true,purged:true});
        }catch(error){
            safeLogError("Admin Support Report Purge Fehler:",error);
            return res.status(500).json({ok:false,error:"Support-Meldung konnte nicht sicher gelöscht werden."});
        }
    }
);


// ============================================================
// ÖFFENTLICHE REZENSIONEN · MERCH-PLANUNG
// ============================================================

const PUBLIC_REVIEW_CAMPAIGN = "merch";
const PUBLIC_REVIEW_APPEALS = new Set(["yes","maybe","no"]);
const PUBLIC_REVIEW_VARIANTS = new Set(["schwarz","blau","beide","ueberarbeiten"]);
const PUBLIC_REVIEW_STATUSES = new Set(["pending","approved","rejected"]);

function publicReviewText(value,maxLength,fallback="") {
    const text=String(value??"")
        .replace(/[\u0000-\u001f\u007f]/g," ")
        .replace(/\s+/g," ")
        .trim();
    return (text||fallback).slice(0,maxLength);
}

function publicReviewComment(value,maxLength=600) {
    return String(value??"")
        .replace(/\u0000/g,"")
        .replace(/\r\n?/g,"\n")
        .trim()
        .slice(0,maxLength);
}

function publicReviewHash(value) {
    return crypto
        .createHmac("sha256",PUBLIC_REVIEW_HASH_SALT)
        .update(String(value||""))
        .digest("hex");
}

function publicReviewClientToken(value) {
    const token=String(value||"").trim();
    return /^[A-Za-z0-9_-]{20,120}$/.test(token)?token:"";
}

function publicReviewRow(row,{includeStatus=false}={}) {
    const item={
        id:String(row?.id||""),
        campaign:String(row?.campaign||PUBLIC_REVIEW_CAMPAIGN),
        display_name:String(row?.display_name||"Gast"),
        rating:Number(row?.rating||0),
        appeal:String(row?.appeal||""),
        variant:String(row?.variant||""),
        comment:String(row?.comment||""),
        created_at:row?.created_at||null,
        updated_at:row?.updated_at||null
    };
    if(includeStatus){
        item.status=String(row?.status||"pending");
        item.admin_note=String(row?.admin_note||"");
        item.moderated_at=row?.moderated_at||null;
        item.moderated_by=row?.moderated_by||null;
    }
    return item;
}

async function publicReviewSummary(campaign=PUBLIC_REVIEW_CAMPAIGN) {
    const [summaryResult,latestResult]=await Promise.all([
        pool.query(`
            SELECT
                COUNT(*)::int AS total_reviews,
                COALESCE(ROUND(AVG(rating)::numeric,2),0) AS average_rating,
                COUNT(*) FILTER (WHERE rating=1)::int AS rating_1,
                COUNT(*) FILTER (WHERE rating=2)::int AS rating_2,
                COUNT(*) FILTER (WHERE rating=3)::int AS rating_3,
                COUNT(*) FILTER (WHERE rating=4)::int AS rating_4,
                COUNT(*) FILTER (WHERE rating=5)::int AS rating_5,
                COUNT(*) FILTER (WHERE appeal='yes')::int AS appeal_yes,
                COUNT(*) FILTER (WHERE appeal='maybe')::int AS appeal_maybe,
                COUNT(*) FILTER (WHERE appeal='no')::int AS appeal_no,
                COUNT(*) FILTER (WHERE variant='schwarz')::int AS variant_schwarz,
                COUNT(*) FILTER (WHERE variant='blau')::int AS variant_blau,
                COUNT(*) FILTER (WHERE variant='beide')::int AS variant_beide,
                COUNT(*) FILTER (WHERE variant='ueberarbeiten')::int AS variant_ueberarbeiten
            FROM public_reviews
            WHERE campaign=$1 AND status <> 'rejected'
        `,[campaign]),
        pool.query(`
            SELECT id,campaign,display_name,rating,appeal,variant,comment,created_at,updated_at
            FROM public_reviews
            WHERE campaign=$1 AND status='approved' AND comment <> ''
            ORDER BY updated_at DESC,id DESC
            LIMIT 12
        `,[campaign])
    ]);
    const row=summaryResult.rows[0]||{};
    return {
        campaign,
        total_reviews:Number(row.total_reviews||0),
        average_rating:Number(row.average_rating||0),
        ratings:{
            1:Number(row.rating_1||0),2:Number(row.rating_2||0),3:Number(row.rating_3||0),
            4:Number(row.rating_4||0),5:Number(row.rating_5||0)
        },
        appeal:{
            yes:Number(row.appeal_yes||0),maybe:Number(row.appeal_maybe||0),no:Number(row.appeal_no||0)
        },
        variants:{
            schwarz:Number(row.variant_schwarz||0),blau:Number(row.variant_blau||0),
            beide:Number(row.variant_beide||0),ueberarbeiten:Number(row.variant_ueberarbeiten||0)
        },
        reviews:latestResult.rows.map(item=>publicReviewRow(item))
    };
}

app.get(
    "/api/public/reviews/merch",
    publicReviewReadLimiter,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            return res.json({ok:true,summary:await publicReviewSummary(PUBLIC_REVIEW_CAMPAIGN)});
        }catch(error){
            safeLogError("Public Reviews lesen Fehler:",error);
            return res.status(500).json({ok:false,error:"Rezensionen konnten nicht geladen werden."});
        }
    }
);

app.post(
    "/api/public/reviews/merch",
    publicReviewSubmitLimiter,
    requireTrustedPublicWrite,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            // Honeypot: normale Besucher sehen dieses Feld nicht.
            if(String(req.body?.website||"").trim()){
                return res.status(202).json({ok:true,moderation:"pending",message:"Danke für deine Rückmeldung."});
            }

            const clientToken=publicReviewClientToken(req.body?.client_token);
            if(!clientToken)return res.status(400).json({ok:false,error:"Rezensions-Sitzung ist ungültig. Bitte lade die Seite neu."});

            const rating=Math.round(Number(req.body?.rating||0));
            const appeal=String(req.body?.appeal||"").trim();
            const variant=String(req.body?.variant||"").trim();
            const displayName=publicReviewText(req.body?.display_name,40,"Gast");
            const comment=publicReviewComment(req.body?.comment,600);

            if(rating<1||rating>5)return res.status(400).json({ok:false,error:"Bitte wähle eine Bewertung von 1 bis 5."});
            if(!PUBLIC_REVIEW_APPEALS.has(appeal))return res.status(400).json({ok:false,error:"Bitte wähle deinen ersten Eindruck."});
            if(!PUBLIC_REVIEW_VARIANTS.has(variant))return res.status(400).json({ok:false,error:"Bitte wähle eine Designrichtung."});

            const clientTokenHash=publicReviewHash(`client|${clientToken}`);
            const submitterHash=publicReviewHash(`submitter|${requestIp(req)}|${String(req.get("User-Agent")||"").slice(0,220)}`);

            // Der In-Memory-Limiter schützt eine einzelne Instanz. Diese
            // zusätzliche DB-Prüfung hält denselben Grenzwert auch bei
            // mehreren Instanzen bzw. nach Prozess-Neustarts ein, ohne
            // Klartext-IP oder User-Agent zu speichern. Eine bestehende
            // Browser-Rezension darf weiterhin aktualisiert werden.
            const reviewAbuseResult=await pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE client_token_hash <> $3)::int AS recent_other_reviews,
                    COUNT(*) FILTER (WHERE client_token_hash = $3)::int AS same_client_reviews
                FROM public_reviews
                WHERE campaign=$1
                  AND submitter_hash=$2
                  AND updated_at > NOW() - ($4::bigint * INTERVAL '1 millisecond')
            `,[PUBLIC_REVIEW_CAMPAIGN,submitterHash,clientTokenHash,PUBLIC_REVIEW_RATE_WINDOW_MS]);

            const reviewAbuseRow=reviewAbuseResult.rows[0]||{};
            if(
                Number(reviewAbuseRow.same_client_reviews||0)===0 &&
                Number(reviewAbuseRow.recent_other_reviews||0)>=PUBLIC_REVIEW_RATE_MAX
            ){
                res.setHeader("Retry-After",String(Math.ceil(PUBLIC_REVIEW_RATE_WINDOW_MS/1000)));
                return res.status(429).json({
                    ok:false,
                    error:"Zu viele Rezensionen in kurzer Zeit. Bitte versuche es später erneut."
                });
            }

            // Freitext geht immer in Moderation. Rein strukturierte Rezensionen
            // dürfen direkt in der anonymen Statistik erscheinen.
            const status=comment?"pending":"approved";

            const result=await pool.query(`
                INSERT INTO public_reviews(
                    campaign,client_token_hash,submitter_hash,display_name,rating,appeal,variant,comment,status,
                    admin_note,moderated_at,moderated_by,created_at,updated_at
                )
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'',NULL,NULL,NOW(),NOW())
                ON CONFLICT(campaign,client_token_hash) DO UPDATE SET
                    submitter_hash=EXCLUDED.submitter_hash,
                    display_name=EXCLUDED.display_name,
                    rating=EXCLUDED.rating,
                    appeal=EXCLUDED.appeal,
                    variant=EXCLUDED.variant,
                    comment=EXCLUDED.comment,
                    status=EXCLUDED.status,
                    admin_note='',
                    moderated_at=NULL,
                    moderated_by=NULL,
                    updated_at=NOW()
                RETURNING *
            `,[PUBLIC_REVIEW_CAMPAIGN,clientTokenHash,submitterHash,displayName,rating,appeal,variant,comment,status]);

            return res.status(201).json({
                ok:true,
                review:publicReviewRow(result.rows[0],{includeStatus:true}),
                moderation:status,
                message:comment
                    ?"Danke! Deine Bewertung zählt bereits. Dein Text wird vor der öffentlichen Anzeige geprüft."
                    :"Danke! Deine Rezension wurde gespeichert.",
                summary:await publicReviewSummary(PUBLIC_REVIEW_CAMPAIGN)
            });
        }catch(error){
            safeLogError("Public Review speichern Fehler:",error);
            return res.status(500).json({ok:false,error:"Rezension konnte nicht gespeichert werden."});
        }
    }
);

app.get(
    "/api/admin/creator-suite/public-reviews",
    requireCreatorAccount,
    requireCreatorAdmin,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const requested=String(req.query?.status||"all").trim();
            const params=[PUBLIC_REVIEW_CAMPAIGN];
            let where="campaign=$1";
            if(requested!=="all"){
                if(!PUBLIC_REVIEW_STATUSES.has(requested))return res.status(400).json({ok:false,error:"Unbekannter Rezensionsstatus."});
                params.push(requested);
                where+=` AND status=$${params.length}`;
            }
            const query=publicReviewText(req.query?.q,80,"");
            if(query){
                params.push(`%${query}%`);
                where+=` AND (display_name ILIKE $${params.length} OR comment ILIKE $${params.length} OR admin_note ILIKE $${params.length})`;
            }

            const [rowsResult,moderationResult,summary]=await Promise.all([
                pool.query(`SELECT * FROM public_reviews WHERE ${where} ORDER BY updated_at DESC,id DESC LIMIT 250`,params),
                pool.query(`
                    SELECT
                        COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE status='pending')::int AS pending,
                        COUNT(*) FILTER (WHERE status='approved')::int AS approved,
                        COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
                        COUNT(*) FILTER (WHERE comment <> '')::int AS with_comment
                    FROM public_reviews
                    WHERE campaign=$1
                `,[PUBLIC_REVIEW_CAMPAIGN]),
                publicReviewSummary(PUBLIC_REVIEW_CAMPAIGN)
            ]);
            const moderation=moderationResult.rows[0]||{};
            return res.json({
                ok:true,
                summary,
                moderation:{
                    total:Number(moderation.total||0),
                    pending:Number(moderation.pending||0),
                    approved:Number(moderation.approved||0),
                    rejected:Number(moderation.rejected||0),
                    with_comment:Number(moderation.with_comment||0)
                },
                reviews:rowsResult.rows.map(item=>publicReviewRow(item,{includeStatus:true}))
            });
        }catch(error){
            safeLogError("Admin Public Reviews Fehler:",error);
            return res.status(500).json({ok:false,error:"Rezensionen konnten nicht geladen werden."});
        }
    }
);

app.put(
    "/api/admin/creator-suite/public-reviews/:id",
    requireCreatorAccount,
    requireCreatorAdmin,
    requireTrustedPublicWrite,
    async(req,res)=>{
        res.set("Cache-Control","no-store");
        try{
            const status=String(req.body?.status||"").trim();
            if(!PUBLIC_REVIEW_STATUSES.has(status))return res.status(400).json({ok:false,error:"Bitte einen gültigen Rezensionsstatus wählen."});
            const adminNote=publicReviewText(req.body?.admin_note,1000,"");
            const result=await pool.query(`
                UPDATE public_reviews
                SET status=$2,admin_note=$3,moderated_at=NOW(),moderated_by=$4,updated_at=NOW()
                WHERE id=$1 AND campaign=$5
                RETURNING *
            `,[String(req.params.id||""),status,adminNote,req.creatorAccount.id,PUBLIC_REVIEW_CAMPAIGN]);
            if(!result.rows[0])return res.status(404).json({ok:false,error:"Rezension nicht gefunden."});
            return res.json({
                ok:true,
                review:publicReviewRow(result.rows[0],{includeStatus:true}),
                summary:await publicReviewSummary(PUBLIC_REVIEW_CAMPAIGN)
            });
        }catch(error){
            safeLogError("Admin Public Review Update Fehler:",error);
            return res.status(500).json({ok:false,error:"Rezension konnte nicht moderiert werden."});
        }
    }
);


// ============================================================
// UNBEKANNTE API / AUTH ROUTEN
// ============================================================

app.use(
    (
        req,
        res,
        next
    ) => {

        if (
            req.path.startsWith(
                "/api/"
            ) ||
            req.path.startsWith(
                "/auth/"
            )
        ) {

            return res
                .status(404)
                .json({

                    ok:
                        false,

                    error:
                        "Endpunkt nicht gefunden.",

                    reference:
                        req.requestId || null

                });

        }

        next();

    }
);


// ============================================================
// RFC 9116 SECURITY.TXT
//
// Explizite Route, weil express.static Dot-Verzeichnisse standardmäßig
// nicht ausliefert. /security.txt bleibt nur ein kanonischer Redirect.
// ============================================================

app.get("/.well-known/security.txt", (_req, res) => {
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600, must-revalidate");
    return res.sendFile(path.join(PUBLIC_DIR, ".well-known", "security.txt"));
});

app.get("/security.txt", (_req, res) => {
    return res.redirect(308, "/.well-known/security.txt");
});


// ============================================================
// TIKTOK → WEBSITE FUNNEL · MONETIZATION / GROWTH PASS
//
// Stabile, kurze Einstiegspfade für Bio-/Profil- und optionale
// Destination-Links. Bewusst 302 statt permanentem Redirect,
// damit Kampagnenziele später ohne gecachte 308er geändert werden
// können. Es gibt keine nutzersteuerbare Redirect-URL.
// ============================================================

const TIKTOK_FUNNEL_QUERY =
    "source=tiktok&utm_source=tiktok&utm_medium=social&utm_campaign=profile";

app.get("/go/tiktok", (_req, res) => {
    return res.redirect(302, `/?${TIKTOK_FUNNEL_QUERY}`);
});

app.get("/go/tiktok/tools", (_req, res) => {
    return res.redirect(302, `/?${TIKTOK_FUNNEL_QUERY}#creator-preview`);
});

app.get("/go/tiktok/community", (_req, res) => {
    return res.redirect(302, `/?${TIKTOK_FUNNEL_QUERY}#community`);
});


// ============================================================
// SEO URL CANONICALIZATION · WEBSITE SEO PASS
//
// express.static({extensions:["html"]}) kann ansonsten auch
// extensionless Varianten derselben Datei ausliefern. Für die
// indexierbaren öffentlichen Seiten wird deshalb eine einzige
// kanonische URL erzwungen. Query-Strings bleiben erhalten.
// ============================================================

const SEO_CANONICAL_PATHS = new Map([
    ["/index.html", "/"],
    ["/pages/creator-suite", "/pages/creator-suite.html"],
    ["/pages/plans", "/pages/plans.html"],
    ["/pages/roadmap", "/pages/roadmap.html"],
    ["/pages/support", "/pages/support.html"],
    ["/pages/security", "/pages/security.html"],
    ["/pages/impressum", "/pages/impressum.html"],
    ["/pages/datenschutz", "/pages/datenschutz.html"],
    ["/pages/nutzungsbedingungen", "/pages/nutzungsbedingungen.html"]
]);

app.use((req, res, next) => {
    if (!isSafeHttpMethod(req.method)) {
        return next();
    }

    const targetPath = SEO_CANONICAL_PATHS.get(req.path);

    if (!targetPath) {
        return next();
    }

    const rawUrl = String(req.originalUrl || req.url || "");
    const queryIndex = rawUrl.indexOf("?");
    const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : "";

    return res.redirect(308, `${targetPath}${query}`);
});


// ============================================================
// ÖFFENTLICHE WEBSITE AUS /public
//
// WICHTIG:
// - API UND AUTH LIEGEN VOR EXPRESS.STATIC
// - HTML WIRD NICHT ALT GECACHT
// - CSS / JS / BILDER WERDEN BEI JEDEM AUFRUF
//   AUF AKTUALITÄT GEPRÜFT
// ============================================================

app.use(
    express.static(
        PUBLIC_DIR,
        {

            extensions: [
                "html"
            ],

            dotfiles:
                "deny",

            etag:
                true,

            lastModified:
                true,

            cacheControl:
                false,

            setHeaders:
                (
                    res,
                    filePath
                ) => {

                    const extension =
                        path
                            .extname(
                                filePath
                            )
                            .toLowerCase();


                    // ------------------------------------------
                    // HTML NICHT CACHEN
                    // ------------------------------------------

                    if (
                        extension ===
                        ".html"
                    ) {

                        res.setHeader(
                            "Cache-Control",
                            "no-store, no-cache, must-revalidate, proxy-revalidate"
                        );

                        res.setHeader(
                            "Pragma",
                            "no-cache"
                        );

                        res.setHeader(
                            "Expires",
                            "0"
                        );

                        return;

                    }


                    // ------------------------------------------
                    // CSS / JS / BILDER / SONSTIGE ASSETS
                    // ------------------------------------------

                    res.setHeader(
                        "Cache-Control",
                        "public, max-age=0, must-revalidate"
                    );

                }

        }
    )
);


// ============================================================
// ÖFFENTLICHE 404-SEITE · PUBLIC RESILIENCE PASS 15
// ============================================================

app.use((req,res)=>{
    res.setHeader("Cache-Control","no-store");
    res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive");
    if(req.accepts("html")){
        return res.status(404).sendFile(path.join(PUBLIC_DIR,"pages","not-found.html"));
    }
    return res.status(404).type("text/plain; charset=utf-8").send(`Seite nicht gefunden. Referenz: ${req.requestId||"-"}`);
});


// ============================================================
// REQUEST BODY ERROR BOUNDARY · SECURITY PASS R50
// ============================================================

function requestBodyFailure(error) {
    const type=String(error?.type||"");
    const status=Number(error?.status||error?.statusCode||0);
    if(type==="entity.too.large"||type==="parameters.too.many"||status===413){
        return {status:413,message:"Der Request-Body ist zu groß."};
    }
    if(type==="entity.parse.failed"||type==="encoding.unsupported"||(error instanceof SyntaxError&&status===400)){
        return {status:400,message:"Der Request-Body ist ungültig."};
    }
    return null;
}

// ============================================================
// SERVER ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }

        const bodyFailure=requestBodyFailure(error);
        if(bodyFailure){
            res.setHeader("Cache-Control","no-store");
            res.setHeader("CDN-Cache-Control","no-store");
            res.setHeader("Surrogate-Control","no-store");
            if(req.path.startsWith("/api/")||req.path.startsWith("/auth/")){
                return res.status(bodyFailure.status).json({ok:false,error:bodyFailure.message});
            }
            return res.status(bodyFailure.status).type("text/plain; charset=utf-8").send(bodyFailure.message);
        }

        safeLogError(
            `unhandled:${req?.requestId||"no-request-id"}`,
            error
        );


        if (
            req.path.startsWith(
                "/api/"
            ) ||
            req.path.startsWith(
                "/auth/"
            )
        ) {

            return res
                .status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Interner Serverfehler.",

                    reference:
                        req.requestId || null

                });

        }


        res.setHeader("Cache-Control","no-store");
        res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive");
        return res
            .status(500)
            .sendFile(
                path.join(PUBLIC_DIR,"pages","error.html")
            );

    }
);


// ============================================================
// START
// ============================================================

async function startServer() {

    try {

        validateConfiguration();


        let bootstrapWaitLogged = false;
        await withDatabaseBootstrapLock(
            pool,
            () => initDatabase(),
            {
                onWait: elapsed => {
                    if (!bootstrapWaitLogged && elapsed >= 1000) {
                        bootstrapWaitLogged = true;
                        console.warn("Warte auf exklusiven Datenbank-Schema-Bootstrap einer anderen Instanz.");
                    }
                }
            }
        );
        startAccountMailOutboxWorker();
        startProductionMonitorWorker();


        httpServer = http.createServer(
            {
                maxHeaderSize: HTTP_MAX_HEADER_SIZE,
                headersTimeout: HTTP_HEADERS_TIMEOUT_MS,
                requestTimeout: HTTP_REQUEST_TIMEOUT_MS,
                keepAliveTimeout: HTTP_KEEP_ALIVE_TIMEOUT_MS
            },
            app
        );
        httpServer.maxRequestsPerSocket = HTTP_MAX_REQUESTS_PER_SOCKET;

        httpServer.listen(
            PORT,
            () => {

                console.log("");

                console.log(
                    "============================================================"
                );

                console.log(
                    `${APP_NAME} Backend ${BACKEND_VERSION}`
                );

                console.log(
                    `Port: ${PORT}`
                );

                console.log(
                    `Website: ${PUBLIC_DIR}`
                );

                console.log(
                    `TikTok Redirect: ${REDIRECT_URI}`
                );

                console.log(
                    "------------------------------------------------------------"
                );

                console.log(
                    "Creator Accounts: ONLINE"
                );

                console.log(
                    "Creator Sessions: ONLINE"
                );

                console.log(
                    "Account-Löschung: ONLINE"
                );

                console.log(
                    `Security-Aktivität: ONLINE / ${SECURITY_EVENT_RETENTION_DAYS} Tage`
                );

                console.log(
                    "Creator Settings: ONLINE"
                );

                console.log(
                    "Widget Studio: ONLINE / Follower Goal v1"
                );

                console.log(
                    "Plan-System: FREE / CREATOR / PRO"
                );

                console.log(
                    "Website Cache: HTML deaktiviert"
                );

                console.log(
                    `Security: Rate Limits aktiv / Passwort min. ${PASSWORD_MIN_LENGTH} Zeichen`
                );

                console.log(
                    `Session-Limit: max. ${CREATOR_MAX_SESSIONS} aktive Sitzungen pro Creator`
                );

                console.log(
                    "------------------------------------------------------------"
                );

                console.log(
                    "Creator Suite Module:"
                );


                for (
                    const module
                    of Object.values(
                        CREATOR_MODULES
                    )
                ) {

                    console.log(
                        `- ${module.title}: ${module.status} / ${module.minimum_plan.toUpperCase()}`
                    );

                }


                console.log(
                    "------------------------------------------------------------"
                );

                console.log(
                    "TikTok: ONLINE"
                );

                console.log(
                    "Launcher API: ONLINE"
                );

                console.log(
                    "NEXUS Basis: ONLINE"
                );

                console.log(
                    "Cut Studio Backend: PREPARED"
                );

                console.log(
                    "Games Backend: PREPARED"
                );

                console.log(
                    "Audio Studio: ROADMAP"
                );

                console.log(
                    "Twitch: ROADMAP"
                );

                console.log(
                    "OBS: ROADMAP"
                );


                if (
                    !TOKEN_ENCRYPTION_KEY
                ) {

                    console.warn(
                        "Hinweis: CFS_TOKEN_ENCRYPTION_KEY ist nicht gesetzt."
                    );

                    console.warn(
                        "TikTok-Tokens werden aktuell nicht zusätzlich verschlüsselt gespeichert."
                    );

                }


                if (
                    !ALLOW_PUBLIC_TIKTOK_CONNECT &&
                    !TIKTOK_CONNECT_CODE
                ) {

                    console.warn(
                        "Hinweis: CFS_TIKTOK_CONNECT_CODE ist nicht gesetzt."
                    );

                }


                console.log(
                    "============================================================"
                );

                console.log("");

            }
        );

    }
    catch (error) {

        safeLogError(
            "startup",
            error
        );


        process.exit(
            1
        );

    }

}


async function gracefulShutdown(reason, error = null) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (error) {
        safeLogError(`fatal:${reason}`, error);
        await Promise.race([
            sendDirectProductionMonitorAlert({status:"open",alertKey:"process.fatal",severity:"critical",title:"Backend-Prozess beendet sich nach fatalem Fehler",summary:`Fataler Runtime-Pfad: ${String(reason||"runtime").slice(0,80)}.`}),
            new Promise(resolve=>setTimeout(resolve,3500))
        ]).catch(()=>{});
    }
    else console.warn(`Shutdown gestartet: ${String(reason || "signal")}`);

    const forceExit = setTimeout(() => {
        console.error("Shutdown-Zeitlimit erreicht. Prozess wird beendet.");
        process.exit(error ? 1 : 0);
    }, SHUTDOWN_GRACE_MS);
    forceExit.unref?.();

    try {
        if (httpServer) {
            httpServer.closeIdleConnections?.();
            await new Promise(resolve => httpServer.close(() => resolve()));
        }
        await stopProductionMonitorWorker();
        await stopAccountMailOutboxWorker();
        await pool.end();
        clearTimeout(forceExit);
        process.exit(error ? 1 : 0);
    } catch (shutdownError) {
        safeLogError("shutdown", shutdownError);
        clearTimeout(forceExit);
        process.exit(1);
    }
}

process.once("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
process.once("SIGINT", () => { void gracefulShutdown("SIGINT"); });
process.once("uncaughtException", error => { void gracefulShutdown("uncaughtException", error); });
process.once("unhandledRejection", reason => {
    const error = reason instanceof Error ? reason : new Error(String(reason || "Unhandled rejection"));
    void gracefulShutdown("unhandledRejection", error);
});

startServer();
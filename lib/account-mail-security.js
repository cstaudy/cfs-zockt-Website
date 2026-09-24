"use strict";

const crypto = require("crypto");

const ACCOUNT_MAIL_MODES = new Set(["disabled", "webhook"]);

function clean(value) {
  return String(value ?? "").trim();
}

function boolish(value, fallback = false) {
  const normalized = clean(value).toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

function httpsUrl(value) {
  try {
    const url = new URL(clean(value));
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function accountMailConfig(env = {}, nodeEnv = "production") {
  const mode = clean(env.CFS_ACCOUNT_MAIL_MODE || "disabled").toLowerCase();
  const webhookUrl = clean(env.CFS_ACCOUNT_MAIL_WEBHOOK_URL);
  const webhookSecret = clean(env.CFS_ACCOUNT_MAIL_WEBHOOK_SECRET);
  const verificationRequired = boolish(env.CFS_EMAIL_VERIFICATION_REQUIRED, false);
  const configured = mode === "webhook" && httpsUrl(webhookUrl) && webhookSecret.length >= 32;
  return Object.freeze({
    mode,
    webhookUrl,
    webhookSecret,
    verificationRequired,
    enabled: configured,
    development: String(nodeEnv || "production") === "development"
  });
}

function validateAccountMailConfig(config) {
  if (!ACCOUNT_MAIL_MODES.has(config.mode)) {
    throw new Error("CFS_ACCOUNT_MAIL_MODE muss disabled oder webhook sein.");
  }
  if (config.mode === "webhook") {
    if (!httpsUrl(config.webhookUrl)) {
      throw new Error("CFS_ACCOUNT_MAIL_WEBHOOK_URL muss eine HTTPS-URL ohne eingebettete Zugangsdaten sein.");
    }
    if (config.webhookSecret.length < 32) {
      throw new Error("CFS_ACCOUNT_MAIL_WEBHOOK_SECRET muss mindestens 32 Zeichen lang sein.");
    }
  }
  if (config.verificationRequired && !config.enabled) {
    throw new Error("CFS_EMAIL_VERIFICATION_REQUIRED=true setzt einen vollständig konfigurierten Account-Mail-Webhook voraus.");
  }
  return true;
}

function createAccountActionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function accountActionTokenHash(purpose, token) {
  return crypto
    .createHash("sha256")
    .update(`cfs-account-action-v1|${clean(purpose)}|${clean(token)}`)
    .digest("hex");
}

function validAccountActionToken(token) {
  return /^[A-Za-z0-9_-]{40,80}$/.test(clean(token));
}

function normalizeMailMessage(message = {}) {
  const normalized = {
    kind: clean(message?.kind).slice(0, 64),
    to: clean(message?.to).slice(0, 254),
    subject: clean(message?.subject).slice(0, 180),
    text: String(message?.text || "").slice(0, 20000)
  };

  if (!normalized.kind) {
    const error = new Error("Account-Mail benötigt eine Kategorie.");
    error.code = "account_mail_invalid_kind";
    throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.to)) {
    const error = new Error("Account-Mail benötigt eine gültige Empfängeradresse.");
    error.code = "account_mail_invalid_recipient";
    throw error;
  }
  if (!normalized.subject) {
    const error = new Error("Account-Mail benötigt einen Betreff.");
    error.code = "account_mail_invalid_subject";
    throw error;
  }
  if (!normalized.text.trim()) {
    const error = new Error("Account-Mail benötigt einen Textinhalt.");
    error.code = "account_mail_invalid_text";
    throw error;
  }

  return normalized;
}

function mailWebhookSignature(secret, timestamp, body) {
  return crypto
    .createHmac("sha256", clean(secret))
    .update(`v1.${String(timestamp)}.${body}`)
    .digest("hex");
}

async function sendAccountMail(config, message, fetchImpl = globalThis.fetch) {
  if (!config?.enabled) {
    const error = new Error("Account-Mailversand ist nicht konfiguriert.");
    error.code = "account_mail_unavailable";
    throw error;
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("HTTP-Mailtransport ist in dieser Laufzeit nicht verfügbar.");
  }
  const payload = {
    version: 1,
    kind: clean(message?.kind).slice(0, 64),
    to: clean(message?.to).slice(0, 254),
    subject: clean(message?.subject).slice(0, 180),
    text: String(message?.text || "").slice(0, 20000)
  };
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = mailWebhookSignature(config.webhookSecret, timestamp, body);
  const response = await fetchImpl(config.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-CFS-Mail-Timestamp": String(timestamp),
      "X-CFS-Mail-Signature": `v1=${signature}`
    },
    body,
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    const error = new Error(`Account-Mail-Webhook antwortete mit HTTP ${response.status}.`);
    error.code = "account_mail_delivery_failed";
    throw error;
  }

  return true;
}

module.exports = {
  ACCOUNT_MAIL_MODES,
  accountMailConfig,
  validateAccountMailConfig,
  createAccountActionToken,
  accountActionTokenHash,
  validAccountActionToken,
  normalizeMailMessage,
  mailWebhookSignature,
  sendAccountMail
};

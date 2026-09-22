"use strict";

const crypto = require("crypto");

const DEVICE_LINK_DELIVERY_LEGACY = "start_legacy";
const DEVICE_LINK_DELIVERY_POLL_V2 = "poll_v2";
const DEVICE_LINK_SECRET_RE = /^cfsd_[A-Za-z0-9_-]{32}$/;
const DEVICE_LINK_CODE_RE = /^CFS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

function normalizeCredentialDelivery(value) {
  return String(value || "").trim().toLowerCase() === DEVICE_LINK_DELIVERY_POLL_V2
    ? DEVICE_LINK_DELIVERY_POLL_V2
    : DEVICE_LINK_DELIVERY_LEGACY;
}

function validDeviceSecret(value) {
  return DEVICE_LINK_SECRET_RE.test(String(value || ""));
}

function normalizeDeviceCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return DEVICE_LINK_CODE_RE.test(code) ? code : "";
}

function deriveBridgeToken(deviceLinkId, deviceSecret) {
  const id = String(deviceLinkId || "").trim();
  const secret = String(deviceSecret || "");
  if (!id || id.length > 128 || !validDeviceSecret(secret)) return "";
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`cfs-device-link-bridge-v2:${id}`, "utf8")
    .digest("base64url");
  return `cfsb_${digest}`;
}

function shouldDeliverPollCredential({credentialDelivery="",status="",expiresAt=null,now=Date.now()}={}) {
  if (normalizeCredentialDelivery(credentialDelivery) !== DEVICE_LINK_DELIVERY_POLL_V2) return false;
  if (!new Set(["approved","consumed"]).has(String(status || ""))) return false;
  const expiry = expiresAt ? new Date(expiresAt).getTime() : 0;
  return Boolean(expiry && Number.isFinite(expiry) && expiry > Number(now));
}

module.exports = {
  DEVICE_LINK_DELIVERY_LEGACY,
  DEVICE_LINK_DELIVERY_POLL_V2,
  normalizeCredentialDelivery,
  validDeviceSecret,
  normalizeDeviceCode,
  deriveBridgeToken,
  shouldDeliverPollCredential
};

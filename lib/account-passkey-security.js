"use strict";

const crypto = require("crypto");

let simpleWebAuthnPromise = null;

async function simpleWebAuthn() {
  if (!simpleWebAuthnPromise) {
    simpleWebAuthnPromise = import("@simplewebauthn/server");
  }
  return simpleWebAuthnPromise;
}

function webauthnUserID(creatorId) {
  return new Uint8Array(
    crypto.createHash("sha256").update(`cfs-webauthn-user-v1|${String(creatorId || "")}`).digest()
  );
}

function normalizePasskeyName(value) {
  const clean = String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
  return clean || "Passkey";
}

function passkeyReference(credentialId) {
  return crypto
    .createHash("sha256")
    .update(`cfs-passkey-ref-v1|${String(credentialId || "")}`)
    .digest("base64url")
    .slice(0, 24);
}

function validChallengeId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

module.exports = {
  simpleWebAuthn,
  webauthnUserID,
  normalizePasskeyName,
  passkeyReference,
  validChallengeId
};

"use strict";

const LIVE_LOCKED_FIELDS=Object.freeze([
  "backendUrl",
  "provider",
  "machineName",
  "tiktokUsername",
  "bridgeToken",
  "tiktoolApiKey"
]);

function own(object,key){
  return Boolean(object&&Object.prototype.hasOwnProperty.call(object,key));
}

function normalizedText(value){
  return String(value??"").trim();
}

function normalizedBackend(value){
  return normalizedText(value).replace(/\/+$/g,"");
}

function normalizedUsername(value){
  return normalizedText(value).replace(/^@/,"");
}

function requestedChange(current={},input={},field){
  if(!own(input,field))return false;
  switch(field){
    case "backendUrl":
      return normalizedBackend(input.backendUrl)!==normalizedBackend(current.backendUrl);
    case "provider":
      return normalizedText(input.provider||"mock")!==normalizedText(current.provider||"mock");
    case "machineName":
      return normalizedText(input.machineName)!==normalizedText(current.machineName);
    case "tiktokUsername":
      return normalizedUsername(input.tiktokUsername)!==normalizedUsername(current.tiktokUsername);
    case "bridgeToken":
    case "tiktoolApiKey":
      // Secrets are write-only in the renderer. A non-empty value always means replacement.
      return Boolean(normalizedText(input[field]));
    default:
      return false;
  }
}

function planSettingsTransition({current={},input={},liveActive=false}={}){
  const criticalChanges=LIVE_LOCKED_FIELDS.filter(field=>requestedChange(current,input,field));
  if(liveActive&&criticalChanges.length){
    const error=new Error("Verbindungs- und Provider-Einstellungen können während einer aktiven LIVE Session nicht geändert werden. LIVE zuerst beenden.");
    error.code="LIVE_SETTINGS_LOCKED";
    error.fields=criticalChanges;
    throw error;
  }

  const providerChanged=criticalChanges.includes("provider");
  const backendChanged=criticalChanges.includes("backendUrl");
  return {
    criticalChanges,
    providerChanged,
    backendChanged,
    secretChanged:criticalChanges.includes("bridgeToken")||criticalChanges.includes("tiktoolApiKey"),
    bridgeCredentialsChanged:criticalChanges.some(field=>["backendUrl","provider","machineName","bridgeToken"].includes(field)),
    providerCredentialsChanged:criticalChanges.some(field=>["provider","tiktokUsername","tiktoolApiKey"].includes(field))
  };
}

function assertLiveSafeSecretChange(liveActive,label="Schlüssel"){
  if(!liveActive)return;
  const error=new Error(`${label} kann während einer aktiven LIVE Session nicht geändert werden. LIVE zuerst beenden.`);
  error.code="LIVE_SETTINGS_LOCKED";
  throw error;
}

module.exports={LIVE_LOCKED_FIELDS,planSettingsTransition,assertLiveSafeSecretChange,normalizedBackend,normalizedUsername};

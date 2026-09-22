"use strict";

const crypto = require("crypto");

const MONITOR_MODES = new Set(["disabled", "webhook"]);
const MONITOR_SEVERITIES = Object.freeze(["info", "warning", "critical"]);
const MONITOR_SEVERITY_RANK = Object.freeze({info:0,warning:1,critical:2});
const MONITOR_ALERT_STATUS = new Set(["open", "resolved"]);

function clean(value){return String(value??"").trim()}
function boolish(value,fallback=false){const v=clean(value).toLowerCase();if(v==="true")return true;if(v==="false")return false;return fallback}
function boundedInt(value,fallback,min,max){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function httpsUrl(value){try{const u=new URL(clean(value));return u.protocol==="https:"&&Boolean(u.hostname)&&!u.username&&!u.password}catch{return false}}
function safeText(value,max=300){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function normalizeSeverity(value){const v=clean(value).toLowerCase();return MONITOR_SEVERITY_RANK[v]!==undefined?v:"warning"}
function normalizeAlertStatus(value){const v=clean(value).toLowerCase();return MONITOR_ALERT_STATUS.has(v)?v:"open"}
function monitorAlertConfig(env={},nodeEnv="production"){
  const mode=clean(env.CFS_MONITOR_MODE||"disabled").toLowerCase();
  const required=boolish(env.CFS_MONITOR_REQUIRED,false);
  const webhookUrl=clean(env.CFS_MONITOR_ALERT_WEBHOOK_URL);
  const webhookSecret=clean(env.CFS_MONITOR_ALERT_WEBHOOK_SECRET);
  const intervalSeconds=boundedInt(env.CFS_MONITOR_INTERVAL_SECONDS,60,30,900);
  const repeatMinutes=boundedInt(env.CFS_MONITOR_REPEAT_MINUTES,120,15,1440);
  const backupMaxAgeHours=boundedInt(env.CFS_MONITOR_BACKUP_MAX_AGE_HOURS,36,6,336);
  const recoveryMaxAgeDays=boundedInt(env.CFS_MONITOR_RECOVERY_MAX_AGE_DAYS,90,7,365);
  const enabled=mode==="webhook"&&httpsUrl(webhookUrl)&&webhookSecret.length>=32;
  return Object.freeze({mode,required,webhookUrl,webhookSecret,enabled,intervalSeconds,repeatMinutes,backupMaxAgeHours,recoveryMaxAgeDays,development:String(nodeEnv||"production")==="development"});
}
function validateMonitorAlertConfig(config){
  if(!MONITOR_MODES.has(config.mode))throw new Error("CFS_MONITOR_MODE muss disabled oder webhook sein.");
  if(config.mode==="webhook"){
    if(!httpsUrl(config.webhookUrl))throw new Error("CFS_MONITOR_ALERT_WEBHOOK_URL muss eine HTTPS-URL ohne eingebettete Zugangsdaten sein.");
    if(String(config.webhookSecret||"").length<32)throw new Error("CFS_MONITOR_ALERT_WEBHOOK_SECRET muss mindestens 32 Zeichen lang sein.");
  }
  if(config.required&&!config.enabled)throw new Error("CFS_MONITOR_REQUIRED=true setzt einen vollständig konfigurierten Monitoring-Webhook voraus.");
  return true;
}
function monitorWebhookSignature(secret,timestamp,body){return crypto.createHmac("sha256",clean(secret)).update(`v1.${String(timestamp)}.${body}`).digest("hex")}
function normalizeAlert(input={}){
  const alertKey=safeText(input.alert_key||input.key,100).toLowerCase().replace(/[^a-z0-9_.:-]/g,"_");
  if(!alertKey)throw new Error("Monitoring Alert-Key fehlt.");
  const alertId=safeText(input.alert_id,80)||crypto.randomUUID();
  return Object.freeze({
    schema:1,
    alert_id:alertId,
    alert_key:alertKey,
    status:normalizeAlertStatus(input.status),
    severity:normalizeSeverity(input.severity),
    title:safeText(input.title,160)||"cfs_zockt Monitoring",
    summary:safeText(input.summary,600),
    observed_at:new Date(input.observed_at||Date.now()).toISOString(),
    service:safeText(input.service,120)||"cfs_zockt Creator Suite",
    version:safeText(input.version,80),
    environment:safeText(input.environment,80)||"production",
    details:input.details&&typeof input.details==="object"&&!Array.isArray(input.details)?input.details:{}
  });
}
async function sendProductionMonitorAlert(config,input,fetchImpl=globalThis.fetch){
  if(!config?.enabled){const error=new Error("Production Monitoring Webhook ist nicht konfiguriert.");error.code="monitor_unavailable";throw error}
  if(typeof fetchImpl!=="function")throw new Error("HTTP-Monitortransport ist in dieser Laufzeit nicht verfügbar.");
  const payload=normalizeAlert(input),body=JSON.stringify(payload),timestamp=Math.floor(Date.now()/1000),signature=monitorWebhookSignature(config.webhookSecret,timestamp,body);
  const response=await fetchImpl(config.webhookUrl,{method:"POST",redirect:"error",headers:{"Content-Type":"application/json","Accept":"application/json","X-CFS-Monitor-Timestamp":String(timestamp),"X-CFS-Monitor-Signature":`v1=${signature}`,"X-CFS-Monitor-Alert-ID":payload.alert_id,"Idempotency-Key":payload.alert_id},body,signal:AbortSignal.timeout(10000)});
  if(!response.ok){const error=new Error(`Monitoring-Webhook antwortete mit HTTP ${response.status}.`);error.code="monitor_delivery_failed";error.status=Number(response.status||0);throw error}
  return{ok:true,status:Number(response.status||0),alert:payload};
}
function hoursSince(value,nowMs=Date.now()){const t=Date.parse(value||"");return Number.isFinite(t)?Math.max(0,(nowMs-t)/3600000):null}
function daysSince(value,nowMs=Date.now()){const h=hoursSince(value,nowMs);return h==null?null:h/24}
function alert(key,severity,title,summary,details={}){return{alert_key:key,severity,title,summary,details}}
function evaluateProductionMonitor(metrics={},config={},nowMs=Date.now()){
  const alerts=[];
  const dbLatency=Number(metrics.db_latency_ms||0);
  if(dbLatency>=2000)alerts.push(alert("database.latency","critical","Datenbank sehr langsam",`PostgreSQL-Ping benötigt ${Math.round(dbLatency)} ms.`,{db_latency_ms:Math.round(dbLatency)}));
  else if(dbLatency>=750)alerts.push(alert("database.latency","warning","Datenbank-Latenz erhöht",`PostgreSQL-Ping benötigt ${Math.round(dbLatency)} ms.`,{db_latency_ms:Math.round(dbLatency)}));

  const mail=metrics.mail||{};
  if(mail.enabled){
    const pending=Number(mail.pending||0),dead=Number(mail.dead||0),oldest=mail.oldest_pending_seconds==null?0:Number(mail.oldest_pending_seconds||0);
    if(dead>0)alerts.push(alert("mail.dead","critical","Account-Mail endgültig fehlgeschlagen",`${dead} Mail-Zustellung(en) sind in den letzten 24 Stunden endgültig fehlgeschlagen.`,{dead_24h:dead}));
    if(pending>=50||oldest>=1800)alerts.push(alert("mail.backlog","critical","Account-Mail-Outbox stark gestaut",`${pending} Mails warten; älteste wartet ${Math.round(oldest)} Sekunden.`,{pending,oldest_pending_seconds:Math.round(oldest)}));
    else if(pending>=10||oldest>=300)alerts.push(alert("mail.backlog","warning","Account-Mail-Outbox gestaut",`${pending} Mails warten; älteste wartet ${Math.round(oldest)} Sekunden.`,{pending,oldest_pending_seconds:Math.round(oldest)}));
  }

  const billing=metrics.billing||{};
  if(billing.enabled){
    const failed=Number(billing.failed_15m||0),stuck=Number(billing.stuck_processing||0);
    if(stuck>0)alerts.push(alert("billing.stuck","critical","Stripe-Webhook hängt",`${stuck} Billing-Event(s) sind länger als 10 Minuten im Processing-Zustand.`,{stuck_processing:stuck}));
    if(failed>=3)alerts.push(alert("billing.failed","critical","Mehrere Stripe-Webhooks fehlgeschlagen",`${failed} Billing-Events sind in 15 Minuten fehlgeschlagen.`,{failed_15m:failed}));
    else if(failed>=1)alerts.push(alert("billing.failed","warning","Stripe-Webhook fehlgeschlagen",`${failed} Billing-Event ist in 15 Minuten fehlgeschlagen.`,{failed_15m:failed}));
  }

  const auth=metrics.auth||{};
  const throttled=Number(auth.login_throttled_15m||0),mfaFailed=Number(auth.mfa_failed_15m||0),stepupFailed=Number(auth.stepup_failed_15m||0),resetRequests=Number(auth.password_reset_requested_15m||0);
  if(throttled>=30||mfaFailed>=25||stepupFailed>=25||resetRequests>=50)alerts.push(alert("auth.anomaly","critical","Starke Auth-/Recovery-Anomalie",`Ungewöhnlich viele Authentifizierungsereignisse in 15 Minuten.`,{login_throttled_15m:throttled,mfa_failed_15m:mfaFailed,stepup_failed_15m:stepupFailed,password_reset_requested_15m:resetRequests}));
  else if(throttled>=10||mfaFailed>=10||stepupFailed>=10||resetRequests>=20)alerts.push(alert("auth.anomaly","warning","Auth-/Recovery-Anomalie",`Erhöhte Authentifizierungsaktivität in 15 Minuten.`,{login_throttled_15m:throttled,mfa_failed_15m:mfaFailed,stepup_failed_15m:stepupFailed,password_reset_requested_15m:resetRequests}));

  const mode=clean(metrics.incident?.mode||"normal").toLowerCase();
  if(mode==="security_lockdown")alerts.push(alert("incident.mode","critical","Security Lockdown aktiv","Der öffentliche Incident-Modus steht auf SECURITY LOCKDOWN.",{mode}));
  else if(mode==="maintenance"||mode==="degraded")alerts.push(alert("incident.mode","warning","Eingeschränkter Betriebsmodus aktiv",`Der Incident-Modus steht auf ${mode.toUpperCase()}.`,{mode}));

  const ops=metrics.operations||{};
  const backupHours=hoursSince(ops.backup_last_success_at,nowMs),backupFailedAfterSuccess=Boolean(ops.backup_last_failure_at)&&(!ops.backup_last_success_at||Date.parse(ops.backup_last_failure_at)>Date.parse(ops.backup_last_success_at));
  if(backupFailedAfterSuccess)alerts.push(alert("backup.failed","critical","Letztes logisches Backup fehlgeschlagen","Seit dem letzten erfolgreichen Backup wurde ein fehlgeschlagener Backup-Lauf registriert.",{last_success_at:ops.backup_last_success_at||null,last_failure_at:ops.backup_last_failure_at||null}));
  if(backupHours==null)alerts.push(alert("backup.freshness","warning","Kein Backup-Nachweis vorhanden","Es wurde noch kein erfolgreicher verschlüsselter logischer Backup-Lauf im Operations-Monitor registriert.",{}));
  else if(backupHours>=Number(config.backupMaxAgeHours||36)*2)alerts.push(alert("backup.freshness","critical","Backup-Nachweis stark veraltet",`Letztes erfolgreiches logisches Backup ist ${backupHours.toFixed(1)} Stunden alt.`,{age_hours:Number(backupHours.toFixed(1))}));
  else if(backupHours>=Number(config.backupMaxAgeHours||36))alerts.push(alert("backup.freshness","warning","Backup-Nachweis veraltet",`Letztes erfolgreiches logisches Backup ist ${backupHours.toFixed(1)} Stunden alt.`,{age_hours:Number(backupHours.toFixed(1))}));

  const recoveryDays=daysSince(ops.recovery_last_success_at,nowMs),recoveryFailedAfterSuccess=Boolean(ops.recovery_last_failure_at)&&(!ops.recovery_last_success_at||Date.parse(ops.recovery_last_failure_at)>Date.parse(ops.recovery_last_success_at));
  if(recoveryFailedAfterSuccess)alerts.push(alert("recovery.failed","critical","Letzter Recovery-Drill fehlgeschlagen","Seit dem letzten erfolgreichen Recovery-Drill wurde ein fehlgeschlagener Drill registriert.",{last_success_at:ops.recovery_last_success_at||null,last_failure_at:ops.recovery_last_failure_at||null}));
  if(recoveryDays==null)alerts.push(alert("recovery.freshness","warning","Kein LIVE-Recovery-Nachweis vorhanden","Es wurde noch kein erfolgreicher LIVE_RESTORE_PASS im Operations-Monitor registriert.",{}));
  else if(recoveryDays>=Number(config.recoveryMaxAgeDays||90)*1.5)alerts.push(alert("recovery.freshness","critical","Recovery-Drill stark veraltet",`Letzter erfolgreicher Recovery-Drill ist ${recoveryDays.toFixed(1)} Tage alt.`,{age_days:Number(recoveryDays.toFixed(1))}));
  else if(recoveryDays>=Number(config.recoveryMaxAgeDays||90))alerts.push(alert("recovery.freshness","warning","Recovery-Drill veraltet",`Letzter erfolgreicher Recovery-Drill ist ${recoveryDays.toFixed(1)} Tage alt.`,{age_days:Number(recoveryDays.toFixed(1))}));

  const severities={critical:alerts.filter(a=>a.severity==="critical").length,warning:alerts.filter(a=>a.severity==="warning").length,info:alerts.filter(a=>a.severity==="info").length};
  return{schema:1,ok:alerts.length===0,status:severities.critical?"critical":severities.warning?"warning":"healthy",alerts,severities};
}
function monitorDrillCodeHash(secret,drillId,code){return crypto.createHmac("sha256",clean(secret)).update(`cfs-monitor-drill-code-v1\0${clean(drillId)}\0${clean(code).toUpperCase()}`).digest("hex")}
function monitorEvidenceHmac(secret,record){const body={...record};delete body.evidence_hmac_sha256;return crypto.createHmac("sha256",clean(secret)).update("cfs-monitor-evidence-v1\0").update(JSON.stringify(body)).digest("hex")}
function signMonitorEvidence(secret,record){const signed={...record};signed.evidence_hmac_sha256=monitorEvidenceHmac(secret,signed);return signed}
function verifyMonitorEvidence(secret,record){const actual=clean(record?.evidence_hmac_sha256);if(!/^[a-f0-9]{64}$/i.test(actual))return false;const expected=monitorEvidenceHmac(secret,record);try{return crypto.timingSafeEqual(Buffer.from(actual,"hex"),Buffer.from(expected,"hex"))}catch{return false}}

module.exports={MONITOR_MODES,MONITOR_SEVERITIES,MONITOR_SEVERITY_RANK,monitorAlertConfig,validateMonitorAlertConfig,monitorWebhookSignature,normalizeAlert,sendProductionMonitorAlert,evaluateProductionMonitor,monitorDrillCodeHash,signMonitorEvidence,verifyMonitorEvidence};

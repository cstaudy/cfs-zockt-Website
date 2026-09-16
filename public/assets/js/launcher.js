(() => {
"use strict";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let state = { channel:"stable", data:null };

function fmtDate(value) {
  if (!value) return "–";
  try { return new Date(value).toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"short"}); }
  catch { return "–"; }
}

function fmtBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "–";
  if (value < 1024*1024) return `${Math.round(value/1024)} KB`;
  return `${(value/1024/1024).toFixed(1)} MB`;
}

function openUrl(url) {
  if (!/^https:\/\/(github\.com|objects\.githubusercontent\.com)\//i.test(String(url || ""))) return;
  window.open(url,"_blank","noopener");
}

function artifactCard(label, asset, description) {
  if (!asset) return `<div class="artifact disabled"><div><span>${label}</span><strong>Nicht veröffentlicht</strong><small>${description}</small></div><button disabled>NICHT VERFÜGBAR</button></div>`;
  return `<div class="artifact"><div><span>${label}</span><strong>${CFS.escape(asset.name)}</strong><small>${fmtBytes(asset.size)} · ${Number(asset.download_count||0)} Downloads</small></div><button data-download="${CFS.escape(asset.url)}">ÖFFNEN</button></div>`;
}

function renderRelease() {
  const data = state.data || {};
  const policy = data.policy || {};
  const release = policy.release;
  const catalog = data.catalog || {};
  const bridge = data.bridge || {};

  $$(".channel-switch button").forEach(btn => btn.classList.toggle("active",btn.dataset.channel===state.channel));
  $("#currentVersion").textContent = policy.current_version || bridge.client_version || "–";
  $("#minimumVersion").textContent = policy.minimum_version || "–";
  $("#recommendedVersion").textContent = policy.recommended_version || "–";
  $("#buildTargetVersion").textContent = policy.build_target_version || "–";

  const dot = $("#compatDot");
  dot.className = "compat-dot";
  const notice = $("#compatNotice");
  notice.className = "compat-notice";
  if (policy.safety?.maintenance?.active) {
    dot.classList.add("danger");
    $("#compatTitle").textContent = "Creator Suite Wartungsmodus";
    $("#compatMeta").textContent = "Neue LIVE-Sessions sind vorübergehend gesperrt.";
    notice.classList.add("danger");
    notice.textContent = policy.safety.maintenance.message || "Bitte warte, bis der Wartungsmodus aufgehoben wurde.";
  } else if (policy.version_blocked) {
    dot.classList.add("danger");
    $("#compatTitle").textContent = "Launcher-Version gesperrt";
    $("#compatMeta").textContent = `Installiert ${policy.current_version}`;
    notice.classList.add("danger");
    notice.textContent = policy.message || "Diese Version darf keine neue LIVE-Session starten.";
  } else if (!policy.current_version) {
    dot.classList.add("warn");
    $("#compatTitle").textContent = "Keine installierte Version erkannt";
    $("#compatMeta").textContent = "Launcher war noch nicht mit der Bridge verbunden.";
    notice.textContent = "Du kannst den zugewiesenen Stable-Launcher installieren und danach den Bridge-Key verbinden.";
  } else if (policy.update_required) {
    dot.classList.add("danger");
    $("#compatTitle").textContent = "Update erforderlich";
    $("#compatMeta").textContent = `Installiert ${policy.current_version} · Minimum ${policy.minimum_version}`;
    notice.classList.add("danger");
    notice.textContent = policy.message || "Diese Launcher-Version liegt unter der freigegebenen Mindestversion.";
  } else if (policy.rollback_recommended) {
    dot.classList.add("warn");
    $("#compatTitle").textContent = "Rollback empfohlen";
    $("#compatMeta").textContent = `${policy.current_version} → ${policy.recommended_version}`;
    notice.classList.add("warn");
    notice.textContent = policy.message || "Für diesen Kanal wird vorübergehend eine ältere Version empfohlen.";
  } else if (policy.update_available) {
    dot.classList.add("warn");
    $("#compatTitle").textContent = "Update verfügbar";
    $("#compatMeta").textContent = `${policy.current_version} → ${policy.recommended_version}`;
    notice.classList.add("warn");
    notice.textContent = "Deine Version ist weiterhin kompatibel, aber ein neuerer zugewiesener Release ist verfügbar.";
  } else if (policy.status === "rollout_pending") {
    dot.classList.add("ok");
    $("#compatTitle").textContent = "Gestaffelter Rollout";
    $("#compatMeta").textContent = `Weiter auf ${policy.recommended_version || policy.current_version}`;
    notice.textContent = policy.message || "Der nächste Release wird schrittweise verteilt.";
  } else if (policy.compatible === true) {
    dot.classList.add("ok");
    $("#compatTitle").textContent = "Launcher kompatibel";
    $("#compatMeta").textContent = `Version ${policy.current_version}`;
    notice.textContent = "Deine installierte Version erfüllt die aktuelle Release-Policy.";
  } else {
    dot.classList.add("warn");
    $("#compatTitle").textContent = "Kompatibilität unbekannt";
    $("#compatMeta").textContent = "Version konnte nicht ausgewertet werden.";
  }

  const rollout = policy.rollout || {};
  $("#safetyStatus").textContent = policy.live_allowed === false ? "LIVE BLOCK" : policy.safety?.pin?.version ? "PINNED" : "NORMAL";
  $("#rolloutPercent").textContent = rollout.percent == null ? "–" : `${rollout.percent}%`;
  $("#rolloutCohort").textContent = rollout.bucket == null ? "–" : `#${rollout.bucket} · ${rollout.eligible ? "IN" : "WAIT"}`;
  $("#rolloutTarget").textContent = rollout.target_version || "–";

  const safetyBanner = $("#safetyBanner");
  const safetyText = policy.safety?.maintenance?.active
    ? policy.safety.maintenance.message
    : policy.version_blocked
      ? policy.message
      : policy.rollback_recommended
        ? policy.message
        : policy.safety?.pin?.missing
          ? `Safety Pin ${policy.safety.pin.version} wurde im Release-Katalog nicht gefunden.`
          : "";
  safetyBanner.className = "safety-banner"+(safetyText ? (policy.live_allowed===false ? " danger" : " warn") : " hidden");
  safetyBanner.textContent = safetyText || "";

  const heroDownload = $("#heroDownload");
  heroDownload.disabled = !release?.setup?.url;
  heroDownload.dataset.url = release?.setup?.url || "";

  if (release) {
    $("#heroReleaseLabel").textContent = state.channel === "beta" ? "BETA RELEASE" : "STABLE RELEASE";
    $("#heroReleaseVersion").textContent = `v${release.version}`;
    $("#heroReleaseMeta").textContent = `Veröffentlicht ${fmtDate(release.published_at)}`;

    $("#releaseCard").innerHTML = `<div class="release-main">
      <div>
        <div class="release-tag"><b>v${CFS.escape(release.version)}</b><span>${release.prerelease?"BETA":"STABLE"}</span></div>
        <div class="release-name">${CFS.escape(release.name)}</div>
        <div class="release-meta"><span>${fmtDate(release.published_at)}</span><span>${CFS.escape(catalog.repo||"")}</span><span>${catalog.stale?"CACHE · STALE":catalog.cache==="network"?"LIVE VON GITHUB":"CACHE"}</span></div>
      </div>
      <div class="release-state"><strong>${policy.version_blocked?"VERSION GESPERRT":policy.rollback_recommended?"ROLLBACK":policy.update_required?"UPDATE ERFORDERLICH":policy.update_available?"UPDATE VERFÜGBAR":policy.status==="rollout_pending"?"ROLLOUT WARTET":"AKTUELLER RELEASE"}</strong><small>${release.assets?.length||0} Release-Dateien</small></div>
    </div>`;

    $("#artifactGrid").innerHTML = [
      artifactCard("WINDOWS SETUP",release.setup,"Installer für normale Windows-Nutzung."),
      artifactCard("PORTABLE",release.portable,"Start ohne Installation."),
      artifactCard("SHA-256",release.checksums,"Prüfsummen aller Release-Artefakte."),
      artifactCard("MANIFEST",release.manifest,"Dateigröße und SHA-256 je Artefakt.")
    ].join("");

    $("#changelogTitle").textContent = `${release.name} · v${release.version}`;
    $("#changelogBody").textContent = release.notes || "Für diesen Release wurden keine Release Notes hinterlegt.";
    const link = $("#releasePageLink");
    link.classList.toggle("hidden",!release.page_url);
    link.href = release.page_url || "#";
  } else {
    $("#heroReleaseLabel").textContent = "NOCH NICHT VERÖFFENTLICHT";
    $("#heroReleaseVersion").textContent = policy.build_target_version ? `Build-Ziel v${policy.build_target_version}` : "Kein Release";
    $("#heroReleaseMeta").textContent = catalog.error || "Für diesen Kanal gibt es noch keinen veröffentlichten Launcher.";
    $("#releaseCard").innerHTML = `<div class="release-empty"><strong>Noch kein veröffentlichter ${state.channel==="beta"?"Beta":"Stable"}-Launcher.</strong><p>Die Website bietet bewusst keinen internen Build als Download an. Erst ein echter GitHub Release mit Windows-Artefakten erscheint hier.</p></div>`;
    $("#artifactGrid").innerHTML = [
      artifactCard("WINDOWS SETUP",null,"Wird nach erfolgreichem Release-Gate veröffentlicht."),
      artifactCard("PORTABLE",null,"Wird nach erfolgreichem Release-Gate veröffentlicht."),
      artifactCard("SHA-256",null,"Wird zusammen mit dem Release erzeugt."),
      artifactCard("MANIFEST",null,"Wird zusammen mit dem Release erzeugt.")
    ].join("");
    $("#changelogTitle").textContent = "Noch kein veröffentlichter Release";
    $("#changelogBody").textContent = catalog.error || "Der Release-Katalog ist erreichbar, enthält aber noch keinen passenden Launcher-Release.";
    $("#releasePageLink").classList.add("hidden");
  }

  const isLive = Boolean(data.live?.connected && data.live?.session_id);
  const online = Boolean(bridge.online);
  $("#bridgeDot").className = "bridge-dot"+(isLive?" live":online?" online":"");
  $("#bridgeTitle").textContent = isLive?"LAUNCHER LIVE":online?"LAUNCHER ONLINE":bridge.configured?"LAUNCHER OFFLINE":"BRIDGE NICHT EINGERICHTET";
  $("#bridgeMeta").textContent = isLive?"Aktive LIVE-Session über Creator Cloud.":online?`${bridge.machine_name||"Creator PC"} · ${bridge.client_version||"Launcher"}`:bridge.configured?"Bridge-Key vorhanden, aber Heartbeat ist offline.":"Erzeuge zuerst einen Bridge-Key im Widget Studio.";
  $("#bridgeData").innerHTML = [
    ["PC",bridge.machine_name||"–"],
    ["VERSION",bridge.client_version||"–"],
    ["LETZTER KONTAKT",fmtDate(bridge.last_seen_at)],
    ["KATALOG",catalog.stale?"STALE CACHE":catalog.ok?"ONLINE":"OFFLINE"]
  ].map(([key,value])=>`<div><span>${key}</span><strong>${CFS.escape(value)}</strong></div>`).join("");
}

function fmtDeviceState(device){
  if(device.status==="revoked")return["WIDERRUFEN","revoked"];
  if(device.online)return["ONLINE","online"];
  return["OFFLINE",""];
}
function renderDevices(devices=[]){
  const host=$("#deviceGrid");if(!host)return;
  host.innerHTML=devices.length?devices.map(device=>{
    const [label,cls]=fmtDeviceState(device);
    return `<article class="device-card ${device.status==="active"?"active":""}">
      <div class="device-card-head"><div><strong>${CFS.escape(device.machine_name||device.label||"Creator PC")}</strong><span>${CFS.escape(device.auth_method==="device_link"?"DEVICE LINK":"LEGACY KEY")}</span></div><b class="device-state ${cls}">${label}</b></div>
      <div class="device-card-meta"><span>Launcher ${CFS.escape(device.client_version||"–")}</span><span>Letzter Kontakt: ${CFS.escape(fmtDate(device.last_seen_at))}</span><span>Verbunden: ${CFS.escape(fmtDate(device.created_at))}</span></div>
      ${device.status==="active"?`<button class="btn revoke-device" data-device-id="${CFS.escape(device.id)}">GERÄT WIDERRUFEN</button>`:""}
    </article>`;
  }).join(""):`<div class="release-empty">Noch kein Launcher mit diesem Creator Account verbunden.</div>`;
}
async function loadDevices(){
  try{const data=await CFS.json("/api/creator/launcher/devices");renderDevices(data.devices||[])}
  catch(error){$("#deviceGrid").innerHTML=`<div class="release-empty">${CFS.escape(error.message)}</div>`}
}

async function load({refresh=false}={}) {
  $("#refreshReleases").disabled = true;
  try {
    const params = new URLSearchParams({channel:state.channel});
    if (refresh) params.set("refresh","1");
    const data = await CFS.json(`/api/creator/launcher/releases?${params}`);
    state.data = data;
    renderRelease();
  } catch (error) {
    $("#heroReleaseVersion").textContent = "Release Center offline";
    $("#heroReleaseMeta").textContent = error.message;
    $("#releaseCard").innerHTML = `<div class="release-empty"><strong>Release Center konnte nicht geladen werden.</strong><p>${CFS.escape(error.message)}</p></div>`;
  } finally {
    $("#refreshReleases").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded",async()=>{
  const me = await CFS.requireAuth();
  if (!me) return;

  $("#mobileNavToggle").onclick=()=>$("#mainNav").classList.toggle("open");
  $$(".channel-switch button").forEach(btn=>btn.onclick=()=>{
    state.channel=btn.dataset.channel==="beta"?"beta":"stable";
    load();
  });
  $("#refreshReleases").onclick=()=>load({refresh:true});
  $("#refreshDevices").onclick=()=>loadDevices();
  $("#deviceGrid").onclick=async event=>{
    const button=event.target.closest(".revoke-device");
    if(!button)return;
    if(!confirm("Diesen Launcher wirklich widerrufen?"))return;
    try{
      await CFS.json(`/api/creator/launcher/devices/${encodeURIComponent(button.dataset.deviceId)}`,{method:"DELETE"});
      await loadDevices();
    }catch(error){alert(error.message)}
  };
  $("#heroDownload").onclick=()=>openUrl($("#heroDownload").dataset.url);
  $("#artifactGrid").onclick=event=>{
    const button=event.target.closest("[data-download]");
    if(button)openUrl(button.dataset.download);
  };

  load();
  loadDevices();
});
})();

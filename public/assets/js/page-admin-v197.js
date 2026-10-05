(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const loginTarget = "/pages/login.html?returnTo=" + encodeURIComponent("/pages/admin.html");

  function setCard(id, label, detail, state = "") {
    const card = $(id);
    if (!card) return;
    card.classList.remove("is-ok", "is-warn", "is-bad");
    if (state) card.classList.add(`is-${state}`);
    const strong = card.querySelector("strong");
    const small = card.querySelector("small");
    if (strong) strong.textContent = label;
    if (small) small.textContent = detail;
  }

  function ageText(dateValue) {
    if (!dateValue) return "kein Heartbeat";
    const ms = Date.now() - new Date(dateValue).getTime();
    if (!Number.isFinite(ms)) return "unbekannt";
    const sec = Math.max(0, Math.round(ms / 1000));
    if (sec < 60) return `vor ${sec}s`;
    const min = Math.round(sec / 60);
    return `vor ${min} min`;
  }

  async function init() {
    try {
      const me = await CFS.json("/api/account/me", { headers:{"Accept":"application/json"} });
      if (!me?.authenticated) return location.replace(loginTarget);
      if (!me?.admin) return location.replace("/pages/dashboard.html");
      $("adminDisplayName").textContent = me?.account?.display_name || "CFS Admin";
      $("adminEmail").textContent = me?.account?.email || "Admin-Konto";
    } catch (error) {
      if (Number(error?.status) === 401) return location.replace(loginTarget);
      const box = $("adminHubError");
      if (box) { box.hidden = false; box.textContent = error?.message || "Admin-Konto konnte nicht geprüft werden."; }
      return;
    }

    try {
      const ai = await CFS.json("/api/creator/cfs-ai/status", { headers:{"Accept":"application/json"} });
      const enabled = ai?.gateway?.enabled === true;
      const configured = ai?.gateway?.configured !== false;
      const worker = ai?.worker || null;
      const service = ai?.service || worker?.status?.service || null;
      const serviceOnline = Boolean(service && (service.ok === true || service.online === true || service.status === "online" || service.ready === true));
      setCard("adminAiStatus", !enabled ? "DEAKTIVIERT" : (serviceOnline ? "ONLINE" : "BEREIT"), !enabled ? "CFS_AI_ENABLED ist aus." : (serviceOnline ? "Lokaler AI-Service meldet sich." : "Gateway aktiv; Service-Status wird über die Bridge geliefert."), !enabled ? "warn" : (configured ? "ok" : "bad"));
      setCard("adminTransportStatus", String(ai?.gateway?.transport || "–").toUpperCase(), configured ? "Transport ist konfiguriert." : "Bridge-Token fehlt oder ist nicht aktiv.", configured ? "ok" : "bad");
    } catch (error) {
      setCard("adminAiStatus", "NICHT ERREICHBAR", error?.message || "CFS AI Status konnte nicht geladen werden.", "bad");
    }

    try {
      const bridge = await CFS.json("/api/creator/cfs-ai/bridge", { headers:{"Accept":"application/json"} });
      const worker = bridge?.worker || null;
      const lastSeen = worker?.last_seen_at || worker?.updated_at || null;
      const fresh = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 45000 : false;
      setCard("adminBridgeStatus", fresh ? "ONLINE" : (worker ? "STALE" : "OFFLINE"), worker ? `${worker.worker_id || "Worker"} · ${ageText(lastSeen)}` : "Noch kein Worker-Heartbeat.", fresh ? "ok" : "warn");
      setCard("adminTransportStatus", String(bridge?.transport || "–").toUpperCase(), bridge?.transport === "bridge" ? "Outbound Bridge aktiv." : "Direkter Transport aktiv.", bridge?.transport === "bridge" ? "ok" : "warn");
    } catch (error) {
      setCard("adminBridgeStatus", "FEHLER", error?.message || "Bridge-Status nicht erreichbar.", "bad");
    }
  }

  document.addEventListener("DOMContentLoaded", init, { once:true });
})();

(() => {
  "use strict";
  if (location.pathname.toLowerCase() !== "/pages/dashboard.html") return;

  function cookieValue(name) {
    const prefix = `${name}=`;
    return document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length) || "";
  }

  function csrfToken() {
    return decodeURIComponent(cookieValue("__Host-cfs_csrf") || cookieValue("cfs_csrf_dev") || "");
  }

  function renderPublicLiveControl(state = {}) {
    const headline = document.getElementById("cfsPublicLiveHeadline");
    const text = document.getElementById("cfsPublicLiveText");
    const pill = document.getElementById("cfsPublicLivePill");
    const start = document.getElementById("cfsPublicLiveStart");
    const stop = document.getElementById("cfsPublicLiveStop");
    if (!headline || !text || !pill || !start || !stop) return;

    const active = state.active === true;
    pill.textContent = active ? "LIVE AKTIV" : "AUTO / OFFEN";
    pill.classList.toggle("is-live", active);
    pill.classList.toggle("is-offline", !active);
    pill.classList.remove("is-unknown");
    headline.textContent = active ? "Die öffentliche Website zeigt dich als LIVE." : "Automatische Erkennung ist aktiv.";
    text.textContent = active
      ? "Der manuelle Fallback endet automatisch nach spätestens 12 Stunden."
      : "Nur nutzen, wenn TikTok LIVE nicht automatisch erkannt wird. Zuschauerzahlen werden nicht erfunden.";
    start.hidden = active;
    stop.hidden = !active;
  }

  async function loadPublicLiveControl() {
    const response = await fetch("/api/creator/public-live-control", {headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderPublicLiveControl(await response.json());
  }

  async function setPublicLiveControl(active) {
    const start = document.getElementById("cfsPublicLiveStart");
    const stop = document.getElementById("cfsPublicLiveStop");
    if (start) start.disabled = true;
    if (stop) stop.disabled = true;
    try {
      const token = csrfToken();
      const response = await fetch("/api/creator/public-live-control", {
        method:"POST",
        credentials:"same-origin",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          ...(token ? {"X-CSRF-Token":token} : {})
        },
        body:JSON.stringify({active:Boolean(active)})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      renderPublicLiveControl(data);
    } catch (error) {
      const headline = document.getElementById("cfsPublicLiveHeadline");
      const text = document.getElementById("cfsPublicLiveText");
      if (headline) headline.textContent = "LIVE-Status konnte nicht gespeichert werden.";
      if (text) text.textContent = String(error?.message || "Bitte Seite neu laden und erneut versuchen.");
    } finally {
      if (start) start.disabled = false;
      if (stop) stop.disabled = false;
    }
  }

  function initPublicLiveControl() {
    const start = document.getElementById("cfsPublicLiveStart");
    const stop = document.getElementById("cfsPublicLiveStop");
    if (!start || !stop || start.dataset.bound === "1") return;
    start.dataset.bound = "1";
    start.addEventListener("click", () => setPublicLiveControl(true));
    stop.addEventListener("click", () => setPublicLiveControl(false));
    loadPublicLiveControl().catch(() => renderPublicLiveControl({active:false}));
  }

  function initDiagnosticsLabel() {
    const details = document.querySelector(".creator-dashboard-diagnostics-v166");
    const label = details?.querySelector(":scope > summary > strong");
    if (!details || !label || details.dataset.bound === "1") return;
    details.dataset.bound = "1";
    const sync = () => { label.textContent = details.open ? "AUSBLENDEN" : "ANZEIGEN"; };
    details.addEventListener("toggle", sync);
    sync();
  }

  function apply() {
    document.body.classList.add("cfs-dashboard-neon-v128", "cfs-dashboard-v166-ready");
    // Shared brand and suite styles own the cascade; retain live-status behavior.
    initPublicLiveControl();
    initDiagnosticsLabel();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once:true });
  else apply();
})();

(() => {
  "use strict";
  if (location.pathname.toLowerCase() !== "/pages/dashboard.html") return;

  function ensureStyleLast() {
    const link = document.querySelector('link[data-cfs-dashboard-neon]');
    if (link && link.parentNode === document.head && document.head.lastElementChild !== link) {
      document.head.appendChild(link);
    }
  }

  function buildPrimaryTools() {
    if (document.getElementById("cfsDashboardV128Primary")) return;
    const quick = document.getElementById("cfsDashboardV9Quick");
    if (!quick) return;

    const section = document.createElement("section");
    section.className = "cfs-dashboard-v128-section";
    section.id = "cfsDashboardV128Primary";
    section.innerHTML = `
      <div class="cfs-dashboard-v128-head">
        <h2>Was möchtest du machen?</h2>
        <p>Wähle einen Bereich und leg direkt los.</p>
      </div>
      <div class="cfs-dashboard-v128-grid">
        <a class="cfs-dashboard-v128-card" href="/pages/widget-studio.html">
          <span class="cfs-dashboard-v128-card-icon">▦</span>
          <strong>Widgets</strong>
          <p>Eigene Overlays, Alerts und Stream-Elemente erstellen.</p>
          <span>WIDGETS ÖFFNEN →</span>
        </a>
        <a class="cfs-dashboard-v128-card" href="/pages/stream-studio.html">
          <span class="cfs-dashboard-v128-card-icon">◉</span>
          <strong>Stream Studio</strong>
          <p>Szenen, Quellen, Overlays und Stream-Workflow vorbereiten.</p>
          <span>STREAM STUDIO ÖFFNEN →</span>
        </a>
        <a class="cfs-dashboard-v128-card" href="/pages/tiktok.html">
          <span class="cfs-dashboard-v128-card-icon">♪</span>
          <strong>TikTok</strong>
          <p>Verbindung, Profilwerte und unterstützte Creator-Daten verwalten.</p>
          <span>TIKTOK ÖFFNEN →</span>
        </a>
        <a class="cfs-dashboard-v128-card" href="/pages/games.html">
          <span class="cfs-dashboard-v128-card-icon">◆</span>
          <strong>Games &amp; Tools</strong>
          <p>Interactive Games und weitere Creator-Werkzeuge öffnen.</p>
          <span>TOOLS ÖFFNEN →</span>
        </a>
      </div>`;
    quick.insertAdjacentElement("afterend", section);
  }

  function buildStudioOverview() {
    if (document.getElementById("cfsDashboardV128Studios")) return;
    const primary = document.getElementById("cfsDashboardV128Primary");
    if (!primary) return;

    const section = document.createElement("section");
    section.className = "cfs-dashboard-v128-section cfs-dashboard-v128-compact";
    section.id = "cfsDashboardV128Studios";
    section.innerHTML = `
      <div class="cfs-dashboard-v128-head">
        <h2>Deine Studios und Games auf einen Blick.</h2>
        <p>Schneller Zugriff auf die wichtigsten Bereiche.</p>
      </div>
      <div class="cfs-dashboard-v128-grid">
        <a class="cfs-dashboard-v128-card" href="/pages/stream-studio.html">
          <span class="cfs-dashboard-v128-card-icon">◉</span><strong>Stream Studio</strong><p>Szenen, Overlays und Ausgabe.</p><span>ÖFFNEN →</span>
        </a>
        <a class="cfs-dashboard-v128-card" href="/pages/cut-studio.html">
          <span class="cfs-dashboard-v128-card-icon">✂</span><strong>Cut Studio</strong><p>Clips und Creator-Material bearbeiten.</p><span>ÖFFNEN →</span>
        </a>
        <a class="cfs-dashboard-v128-card" href="/pages/tiktok.html">
          <span class="cfs-dashboard-v128-card-icon">♪</span><strong>TikTok Hub</strong><p>Profil, Verbindung und Creator-Daten.</p><span>ÖFFNEN →</span>
        </a>
        <a class="cfs-dashboard-v128-card" href="/pages/launcher.html">
          <span class="cfs-dashboard-v128-card-icon">▣</span><strong>Creator-PC</strong><p>Launcher, Desktop-Bridge und lokale Tools.</p><span>ÖFFNEN →</span>
        </a>
      </div>`;
    primary.insertAdjacentElement("afterend", section);
  }

  function orderCoreBlocks() {
    const hero = document.querySelector(".creator-dashboard-hero");
    const focus = document.getElementById("cfsDashboardV9Focus");
    const onboarding = document.querySelector(".cfs-onboarding-v4");
    const quick = document.getElementById("cfsDashboardV9Quick");
    if (!hero) return;

    if (focus) hero.insertAdjacentElement("afterend", focus);
    if (onboarding && focus) focus.insertAdjacentElement("afterend", onboarding);
    if (quick && onboarding) onboarding.insertAdjacentElement("afterend", quick);
  }

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
      ? "Dieser manuelle Fallback bleibt maximal 12 Stunden aktiv und kann jederzeit beendet werden. Launcher-/LIVE-Signale funktionieren parallel weiter."
      : "Wenn TikTok LIVE nicht automatisch erkannt wird, kannst du die Website hier sofort auf LIVE setzen. Es werden keine Zuschauerzahlen erfunden.";
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

  function apply() {
    document.body.classList.add("cfs-dashboard-neon-v128");
    ensureStyleLast();
    orderCoreBlocks();
    buildPrimaryTools();
    buildStudioOverview();
    initPublicLiveControl();
    if (document.getElementById("cfsDashboardV128Primary")) {
      document.body.classList.add("cfs-dashboard-v128-ready");
    }
  }

  function init() {
    apply();
    [120, 350, 800, 1500].forEach(delay => setTimeout(apply, delay));
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 4500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();

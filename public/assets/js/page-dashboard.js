document.addEventListener("DOMContentLoaded", async () => {
  const me = await CFS.requireAuth();
  if (!me) return;
  const a = me.account;
  if (me.admin && window.adminCreatorNav) adminCreatorNav.hidden = false;

  const setStatus = (id, ready, title, meta) => {
    const el = document.getElementById(id);
    el.classList.toggle("ready", !!ready);
    el.classList.toggle("wait", !ready);
    el.querySelector("strong").textContent = title;
    el.querySelector("small").textContent = meta;
  };

  const connection = { account: true, tiktok: false, launcher: false, live: false, obs: false };
  const renderSystemSummary = () => {
    const readyCount = Object.values(connection).filter(Boolean).length;
    const signal = document.getElementById("systemSignal");
    const headline = document.getElementById("systemHeadline");
    const next = document.getElementById("systemNext");
    signal.classList.toggle("ready", readyCount >= 4);
    signal.classList.toggle("wait", readyCount < 4);
    if (!connection.launcher) {
      headline.textContent = "Launcher noch verbinden";
      next.innerHTML = 'Verbinde deinen PC per Device-Link. <a href="/pages/launcher.html">Launcher öffnen →</a>';
    } else if (!connection.tiktok) {
      headline.textContent = "PC verbunden · TikTok noch offen";
      next.innerHTML = 'Dein Launcher ist bereit. Als Nächstes TikTok verbinden. <a href="/pages/tiktok.html">TikTok öffnen →</a>';
    } else if (!connection.obs) {
      headline.textContent = "Verbindungen stehen · erstes Widget fehlt";
      next.innerHTML = 'Jetzt ein Widget erstellen und veröffentlichen. <a href="/pages/widget-studio.html">Widget Studio →</a>';
    } else {
      headline.textContent = connection.live ? "Alles bereit für deinen Stream" : "Dein Setup ist verbunden";
      next.textContent = connection.live ? "Launcher, TikTok und Widgets sind bereit. Du kannst mit deinem Stream-Setup weitermachen." : "Die wichtigsten Verbindungen stehen. LIVE-Zugriff hängt von deiner Freigabe ab.";
    }
    signal.querySelector("span").textContent = `${readyCount}/5 BEREIT`;
  };
  renderSystemSummary();
  document.getElementById("refreshStatus")?.addEventListener("click", () => location.reload());

  const badges = [`<span class="access-badge ${a.plan === "pro" ? "pro" : ""}">${CFS.planLabel(a.plan)} PLAN</span>`];
  if (me.access?.beta?.active) badges.push('<span class="access-badge beta">✓ BETA TESTER</span>');
  if (me.access?.effective_plan && me.access.effective_plan !== a.plan) {
    badges.push(`<span class="access-badge pro">ZUGRIFF: ${CFS.planLabel(me.access.effective_plan)}</span>`);
  }
  accessBadges.innerHTML = badges.join("");
  statusAccountMeta.textContent = a.display_name || a.email || "Creator";

  let moduleData = {modules: me.modules || [], entitlements: me.entitlements || {}, access: me.access || {}};
  try { moduleData = await CFS.json("/api/creator/modules"); } catch {}

  const liveReady = Boolean(moduleData.entitlements?.live_bridge);
  connection.live = liveReady;
  renderSystemSummary();
  setStatus(
    "statusLive",
    liveReady,
    liveReady ? "FREIGESCHALTET" : "NICHT FREIGESCHALTET",
    liveReady ? (moduleData.access?.beta?.active ? "Über Beta-Freigabe" : `${CFS.planLabel(moduleData.access?.effective_plan || a.plan)} Zugriff`) : "CREATOR Plan oder Beta-Freigabe benötigt"
  );

  try {
    const tt = await CFS.json("/api/creator/tiktok/status");
    connection.tiktok = !!tt.connected;
    renderSystemSummary();
    setStatus("statusTikTok", !!tt.connected, tt.connected ? "VERBUNDEN" : "OFFLINE",
      tt.connected ? `${tt.profile?.display_name || "TikTok"} · ${Number(tt.profile?.follower_count || 0).toLocaleString("de-DE")} Follower` : "TikTok verbinden");
  } catch {
    setStatus("statusTikTok", false, "OFFLINE", "TikTok-Status nicht verfügbar");
  }

  try {
    const devices = await CFS.json("/api/creator/launcher/devices");
    const active = (devices.devices || []).filter(d => d.status === "active");
    const online = active.find(d => d.online);
    connection.launcher = active.length > 0;
    renderSystemSummary();
    setStatus("statusLauncher", active.length > 0, online ? "ONLINE" : active.length ? "VERBUNDEN" : "OFFLINE",
      online ? `${online.machine_name || "Creator PC"} · ${online.client_version || ""}` : active.length ? `${active.length} PC verbunden` : "Launcher per Device-Link verbinden");
  } catch {
    setStatus("statusLauncher", false, "OFFLINE", "Noch kein PC erkannt");
  }

  try {
    const widgets = await CFS.json("/api/creator/widget-studio/widgets");
    const liveWidgets = (widgets.widgets || []).filter(w => w.status === "live");
    connection.obs = liveWidgets.length > 0;
    renderSystemSummary();
    setStatus("statusObs", liveWidgets.length > 0, liveWidgets.length ? "BEREIT" : "NOCH LEER",
      liveWidgets.length ? `${liveWidgets.length} veröffentlicht${liveWidgets.length === 1 ? "es Widget" : "e Widgets"}` : "Erstes Widget veröffentlichen");
  } catch {
    setStatus("statusObs", false, "PRÜFEN", "Widget-Status nicht verfügbar");
  }

  try {
    const stateData = await CFS.json("/api/creator/modules/launcher/state");
    if (!(stateData.state && stateData.state.creator_setup)) setupWarning.classList.remove("hidden");
  } catch {
    setupWarning.classList.remove("hidden");
  }

  const paths = {
    dashboard:"/pages/dashboard.html", editor:"/pages/editor.html", widget_studio:"/pages/widget-studio.html",
    tiktok:"/pages/tiktok.html", launcher:"/pages/launcher.html", cut_studio:"/pages/cut-studio.html",
    games:"/pages/games.html", nexus:"/pages/nexus.html", audio_studio:"/pages/audio-studio.html",
    twitch:"/pages/integrations.html", obs:"/pages/integrations.html", scene_studio:"/pages/scene-studio.html"
  };
  const descriptions = {
    widget_studio:"Widgets bauen und OBS-URLs veröffentlichen.",
    launcher:"Creator-PC und LIVE-Bridge verwalten.",
    games:"Interaktive Community-Games für LIVE.",
    cut_studio:"Lokale Clips schneiden und exportieren.",
    tiktok:"TikTok-Profil und Verbindung verwalten.",
    scene_studio:"Mehrere Elemente als Szene kombinieren."
  };

  const modules = moduleData.modules || [];
  const simpleKeys = ["widget_studio","launcher","tiktok","games","cut_studio","scene_studio"];
  simpleToolGrid.innerHTML = simpleKeys.map(key => {
    const m = modules.find(x => x.key === key);
    if (!m) return "";
    return `<article class="beginner-tool ${m.allowed ? "" : "locked"}">
      <span class="badge ${m.allowed ? "ok" : "lock"}">${m.allowed ? "BEREIT" : "GESPERRT"}</span>
      <h3>${CFS.escape(m.title)}</h3>
      <p>${CFS.escape(descriptions[key] || "Creator Tool")}</p>
      <div class="card-actions"><a class="btn" href="${paths[key]}">${m.allowed ? "ÖFFNEN" : "INFO"}</a></div>
    </article>`;
  }).join("");

  moduleGrid.innerHTML = modules.map(m => `
    <article class="card">
      <span class="badge ${m.allowed ? "ok" : "lock"}">${m.allowed ? "FREIGESCHALTET" : `${CFS.escape(String(m.minimum_plan || "creator").toUpperCase())} ERFORDERLICH`}</span>
      <div class="meta" style="margin-top:12px">${CFS.escape(m.status || "")}</div>
      <h3>${CFS.escape(m.title)}</h3>
      <div class="card-actions"><a class="btn" href="${paths[m.key] || "/pages/dashboard.html"}">${m.allowed ? "ÖFFNEN" : "INFO"}</a></div>
    </article>
  `).join("");

});

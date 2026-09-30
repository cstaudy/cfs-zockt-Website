document.addEventListener("DOMContentLoaded", async () => {
  const me = await CFS.requireAuth();
  if (!me) return;
  const a = me.account;
  if (me.admin && window.adminCreatorNav) adminCreatorNav.hidden = false;

  const creatorName = String(a.display_name || "").trim();
  const greeting = document.getElementById("dashboardGreeting");
  if (greeting) greeting.textContent = creatorName ? `Willkommen zurück, ${creatorName}.` : "Willkommen zurück in deiner Creator Suite.";

  const journey = { setup: null, widget: null, tiktok: null, launcher: null };
  const setJourneyStep = (id, value, meta) => {
    const el = document.getElementById(id);
    if (!el) return;
    const ready = value === true;
    const unknown = value === null || value === "unknown";
    el.classList.toggle("ready", ready);
    el.classList.toggle("wait", !ready);
    el.classList.toggle("unknown", unknown);
    const small = el.querySelector("small");
    if (small) small.textContent = meta;
  };

  const renderNextStep = () => {
    const title = document.getElementById("nextStepTitle");
    const text = document.getElementById("nextStepText");
    const action = document.getElementById("nextStepAction");
    if (!title || !text || !action) return;

    if (Object.values(journey).some(value => value === null)) {
      title.textContent = "Dein Workspace wird geprüft …";
      text.textContent = "Wir laden Setup, Widgets und Verbindungen. Danach bekommst du genau einen sinnvollen nächsten Schritt.";
      action.textContent = "BITTE WARTEN";
      action.href = "/pages/dashboard.html";
      action.setAttribute("aria-disabled", "true");
      return;
    }

    action.removeAttribute("aria-disabled");
    if (journey.setup === false) {
      title.textContent = "Grundsetup einmal speichern";
      text.textContent = "Lege Theme, Ziel und dein bevorzugtes Startmodul fest. Das ist die Basis für deinen Creator-Workspace.";
      action.textContent = "SETUP ÖFFNEN";
      action.href = "/pages/setup.html";
    } else if (journey.widget === false) {
      title.textContent = "Dein erstes Widget bauen";
      text.textContent = "Du kannst direkt mit einem manuellen Widget starten. Dafür brauchst du weder TikTok noch eine LIVE-Verbindung.";
      action.textContent = "WIDGET STARTEN";
      action.href = "/pages/widget-studio.html";
    } else if (journey.tiktok === false) {
      title.textContent = "TikTok verbinden";
      text.textContent = "Deine Widget-Basis steht. Verbinde TikTok, wenn du Profil- oder LIVE-Daten in unterstützten Widgets verwenden möchtest.";
      action.textContent = "TIKTOK ÖFFNEN";
      action.href = "/pages/tiktok.html";
    } else if (journey.launcher === false) {
      title.textContent = "Creator-PC verbinden";
      text.textContent = "Verbinde den Launcher für Desktop-Bridge, lokale Tools und unterstützte LIVE-Funktionen.";
      action.textContent = "LAUNCHER ÖFFNEN";
      action.href = "/pages/launcher.html";
    } else {
      title.textContent = "Grundsetup bereit";
      text.textContent = "Setup, Widget, TikTok und Launcher sind verbunden. Du kannst jetzt an Widgets, Szenen oder weiteren Creator-Tools weiterarbeiten.";
      action.textContent = "WIDGET STUDIO";
      action.href = "/pages/widget-studio.html";
    }
  };

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
  else if (me.access?.provider_beta?.enabled && me.access?.provider_beta?.status === "pending") badges.push('<span class="access-badge beta">BETA FREIGABE AUSSTEHEND</span>');
  else if (me.access?.provider_beta?.enabled && me.access?.provider_beta?.status === "paused") badges.push('<span class="access-badge beta">BETA PAUSIERT</span>');
  if (me.access?.effective_plan && me.access.effective_plan !== a.plan) {
    badges.push(`<span class="access-badge pro">ZUGRIFF: ${CFS.planLabel(me.access.effective_plan)}</span>`);
  }
  accessBadges.innerHTML = badges.join("");
  statusAccountMeta.textContent = a.display_name || a.email || "Creator";

  let moduleData = {modules: me.modules || [], entitlements: me.entitlements || {}, access: me.access || {}};
  try { moduleData = await CFS.json("/api/creator/modules"); } catch {}

  const renderStreamReady = async () => {
    const host=document.getElementById("streamReadySteps"),headline=document.getElementById("streamReadyHeadline"),nextTitle=document.getElementById("streamReadyNextTitle"),nextText=document.getElementById("streamReadyNextText"),nextAction=document.getElementById("streamReadyNextAction");
    if(!host||!headline||!nextTitle||!nextText||!nextAction)return;
    try{
      const data=await CFS.json("/api/creator/stream-ready");
      host.innerHTML=(data.steps||[]).map((step,index)=>`<article class="creator-stream-ready-step ${step.ready?"ready":"wait"}"><span>${String(index+1).padStart(2,"0")}</span><div><strong>${CFS.escape(step.label||step.key||"Schritt")}</strong><small>${CFS.escape(step.detail||"")}</small></div><b>${step.ready?"✓ BEREIT":"OFFEN"}</b></article>`).join("");
      if(data.ready){
        headline.textContent="Dein Basis-Stream ist startklar";
        nextTitle.textContent="TikTok, Launcher, OBS und Widget sind bereit";
        nextText.textContent="Du kannst dein veröffentlichtes Widget jetzt direkt aus dem Widget Studio in die aktuelle OBS-Szene einfügen.";
        nextAction.textContent="WIDGET STUDIO ÖFFNEN";
        nextAction.href="/pages/widget-studio.html";
      }else{
        const next=data.next||{};
        headline.textContent="Noch ein paar Schritte bis streambereit";
        nextTitle.textContent=next.label?`${next.label} fertig einrichten`:"Stream-Setup vervollständigen";
        nextText.textContent=next.detail||"Öffne den nächsten noch fehlenden Schritt.";
        nextAction.textContent="JETZT ERLEDIGEN";
        nextAction.href=next.href||"/pages/dashboard.html";
      }
      nextAction.removeAttribute("aria-disabled");
    }catch{
      headline.textContent="Stream-Startcheck nicht verfügbar";
      nextTitle.textContent="Status konnte nicht geladen werden";
      nextText.textContent="Lade die Seite neu oder prüfe TikTok, Launcher und Widget Studio einzeln.";
      nextAction.textContent="STATUS NEU LADEN";
      nextAction.href="/pages/dashboard.html";
      nextAction.removeAttribute("aria-disabled");
    }
  };
  renderStreamReady();

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
    journey.tiktok = !!tt.connected;
    setJourneyStep("progressTikTok", journey.tiktok, tt.connected ? "Verbunden" : "Optional verbinden");
    renderSystemSummary();
    renderNextStep();
    setStatus("statusTikTok", !!tt.connected, tt.connected ? "VERBUNDEN" : "OFFLINE",
      tt.connected ? `${tt.profile?.display_name || "TikTok"} · ${Number(tt.profile?.follower_count || 0).toLocaleString("de-DE")} Follower` : "TikTok verbinden");
  } catch {
    journey.tiktok = "unknown";
    setJourneyStep("progressTikTok", journey.tiktok, "Status nicht verfügbar");
    renderNextStep();
    setStatus("statusTikTok", false, "OFFLINE", "TikTok-Status nicht verfügbar");
  }

  try {
    const devices = await CFS.json("/api/creator/launcher/devices");
    const active = (devices.devices || []).filter(d => d.status === "active");
    const online = active.find(d => d.online);
    connection.launcher = active.length > 0;
    journey.launcher = active.length > 0;
    setJourneyStep("progressLauncher", journey.launcher, online ? "Online" : active.length ? "Verbunden" : "Optional verbinden");
    renderSystemSummary();
    renderNextStep();
    setStatus("statusLauncher", active.length > 0, online ? "ONLINE" : active.length ? "VERBUNDEN" : "OFFLINE",
      online ? `${online.machine_name || "Creator PC"} · ${online.client_version || ""}` : active.length ? `${active.length} PC verbunden` : "Launcher per Device-Link verbinden");
  } catch {
    journey.launcher = "unknown";
    setJourneyStep("progressLauncher", journey.launcher, "Status nicht verfügbar");
    renderNextStep();
    setStatus("statusLauncher", false, "OFFLINE", "Noch kein PC erkannt");
  }

  try {
    const widgets = await CFS.json("/api/creator/widget-studio/widgets");
    const liveWidgets = (widgets.widgets || []).filter(w => w.status === "live");
    connection.obs = liveWidgets.length > 0;
    journey.widget = (widgets.widgets || []).length > 0;
    setJourneyStep("progressWidget", journey.widget, journey.widget ? `${(widgets.widgets || []).length} Widget${(widgets.widgets || []).length === 1 ? "" : "s"} angelegt` : "Noch kein Widget");
    renderSystemSummary();
    renderNextStep();
    setStatus("statusObs", liveWidgets.length > 0, liveWidgets.length ? "BEREIT" : "NOCH LEER",
      liveWidgets.length ? `${liveWidgets.length} veröffentlicht${liveWidgets.length === 1 ? "es Widget" : "e Widgets"}` : "Erstes Widget veröffentlichen");
  } catch {
    journey.widget = "unknown";
    setJourneyStep("progressWidget", journey.widget, "Status nicht verfügbar");
    renderNextStep();
    setStatus("statusObs", false, "PRÜFEN", "Widget-Status nicht verfügbar");
  }

  try {
    const stateData = await CFS.json("/api/creator/modules/launcher/state");
    journey.setup = Boolean(stateData.state && stateData.state.creator_setup);
    setJourneyStep("progressSetup", journey.setup, journey.setup ? "Gespeichert" : "Noch offen");
    if (!journey.setup) setupWarning.classList.remove("hidden");
    renderNextStep();
  } catch {
    journey.setup = "unknown";
    setJourneyStep("progressSetup", journey.setup, "Status nicht verfügbar");
    setupWarning.classList.remove("hidden");
    renderNextStep();
  }

  const paths = {
    dashboard:"/pages/dashboard.html", editor:"/pages/editor.html", widget_studio:"/pages/widget-studio.html",
    tiktok:"/pages/tiktok.html", launcher:"/pages/launcher.html", cut_studio:"/pages/cut-studio.html",
    games:"/pages/games.html", nexus:"/pages/nexus.html", audio_studio:"/pages/audio-studio.html",
    twitch:"/pages/integrations.html", youtube:"/pages/integrations.html", obs:"/pages/integrations.html", scene_studio:"/pages/scene-studio.html"
  };
  const descriptions = {
    widget_studio:"Widgets bauen, testen und OBS-URLs veröffentlichen.",
    launcher:"Creator-PC, Device-Link und Desktop-Bridge verwalten.",
    games:"Interaktive Community-Games für unterstützte LIVE-Workflows.",
    cut_studio:"Clips und Creator-Material im vorbereiteten Cut-Workflow bearbeiten.",
    tiktok:"TikTok-Profil, Verbindung und unterstützte Creator-Daten verwalten.",
    scene_studio:"Widgets und Elemente als gemeinsame Szene kombinieren.",
    editor:"Creator-Inhalte mit den erweiterten Editor-Werkzeugen bearbeiten.",
    nexus:"Creator Control Plane für Status, sichere Launcher-Aktionen und Event→Action-Automationen.",
    audio_studio:"Vorbereiteter Bereich auf der Roadmap.",
    twitch:"Twitch Konto, EventSub und Twitch-Widgets verwalten.",
    youtube:"YouTube Kanal, LIVE/Chat und YouTube-Widgets verwalten.",
    obs:"Geplante tiefere OBS-Integration auf der Roadmap."
  };
  const kinds = {
    widget_studio:"BAUEN", scene_studio:"BAUEN", editor:"BAUEN",
    tiktok:"VERBINDEN", launcher:"VERBINDEN", twitch:"VERBINDEN", youtube:"VERBINDEN", obs:"VERBINDEN",
    games:"ERWEITERN", cut_studio:"ERWEITERN", nexus:"ERWEITERN", audio_studio:"ERWEITERN"
  };
  const statusLabel = status => ({active:"VERFÜGBAR", beta:"BETA", preview:"PREVIEW", roadmap:"ROADMAP"}[String(status || "").toLowerCase()] || String(status || "STATUS").toUpperCase());
  const minimumPlanLabel = plan => CFS.planLabel(String(plan || "free").toLowerCase());

  const modules = moduleData.modules || [];
  const usableModules = modules.filter(m => ["active","beta","preview"].includes(String(m.status || "").toLowerCase()));
  const readyModules = usableModules.filter(m => m.allowed);
  const readyCount = document.getElementById("toolReadyCount");
  const totalCount = document.getElementById("toolTotalCount");
  const accessPlan = document.getElementById("toolAccessPlan");
  if (readyCount) readyCount.textContent = `${readyModules.length}`;
  if (totalCount) totalCount.textContent = `${usableModules.length}`;
  if (accessPlan) accessPlan.textContent = CFS.planLabel(moduleData.access?.effective_plan || a.plan);

  const simpleKeys = ["widget_studio","launcher","tiktok","games","cut_studio","scene_studio"];
  const simpleToolMarkup = simpleKeys.map(key => {
    const m = modules.find(x => x.key === key);
    if (!m) return "";
    const status = statusLabel(m.status);
    const minPlan = minimumPlanLabel(m.minimum_plan);
    return `<article class="beginner-tool creator-tool-entry ${m.allowed ? "" : "locked"}">
      <div class="beginner-tool-top">
        <span class="creator-tool-kind">${CFS.escape(kinds[key] || "TOOL")}</span>
        <span class="badge ${m.allowed ? "ok" : "lock"}">${m.allowed ? status : `${CFS.escape(minPlan)} ERFORDERLICH`}</span>
      </div>
      <h3>${CFS.escape(m.title)}</h3>
      <p>${CFS.escape(descriptions[key] || "Creator Tool")}</p>
      <small class="creator-tool-meta">${CFS.escape(status)} · ab ${CFS.escape(minPlan)}</small>
      <div class="card-actions"><a class="btn${m.allowed ? " primary" : ""}" href="${paths[key]}">${m.allowed ? "ÖFFNEN" : "DETAILS"}</a></div>
    </article>`;
  }).join("");
  simpleToolGrid.innerHTML = simpleToolMarkup || `<div class="ui-state ui-state-empty" role="status"><strong>Noch keine Creator-Module verfügbar</strong><p>Die Modulübersicht konnte für diesen Account noch nicht aufgebaut werden. Lade den Status neu oder öffne das Setup.</p><div class="ui-state-actions"><a class="btn" href="/pages/setup.html">SETUP ÖFFNEN</a><button class="btn" type="button" data-ui-reload>NEU LADEN</button></div></div>`;

  moduleGrid.innerHTML = modules.map(m => {
    const status = statusLabel(m.status);
    const minPlan = minimumPlanLabel(m.minimum_plan);
    return `<article class="card creator-module-card">
      <div class="creator-module-card-head"><span class="badge ${m.allowed ? "ok" : "lock"}">${m.allowed ? "FREIGESCHALTET" : `${CFS.escape(minPlan)} ERFORDERLICH`}</span><small>${CFS.escape(status)}</small></div>
      <h3>${CFS.escape(m.title)}</h3>
      <p>${CFS.escape(descriptions[m.key] || "Creator Suite Modul")}</p>
      <div class="card-actions"><a class="btn" href="${paths[m.key] || "/pages/dashboard.html"}">${m.allowed ? "ÖFFNEN" : "DETAILS"}</a></div>
    </article>`;
  }).join("") || `<div class="ui-state ui-state-empty" role="status"><strong>Keine erweiterten Module gefunden</strong><p>Für deinen Account wurden aktuell keine weiteren Module gemeldet.</p></div>`;

  const operationCard = (prefix, stateName, titleText, metaText) => {
    const card = document.getElementById(`dashboard${prefix}Card`);
    const title = document.getElementById(`dashboard${prefix}Title`);
    const meta = document.getElementById(`dashboard${prefix}Meta`);
    if (!card || !title || !meta) return;
    card.classList.remove("ready", "warn", "wait");
    card.classList.add(stateName || "wait");
    title.textContent = titleText;
    meta.textContent = metaText;
  };

  try {
    const gameData = await CFS.json("/api/creator/games/runtime");
    const gameRuntime = gameData.runtime || {};
    const local = gameData.local_engine || {};
    const selected = (gameData.catalog || []).find(game => game.key === gameData.profile?.game_type);
    const status = String(gameRuntime.status || "idle").toLowerCase();
    operationCard("Game", status === "running" ? "ready" : status === "starting" ? "warn" : "wait",
      status === "running" ? `${selected?.label || gameRuntime.title || "Game"} läuft` : status === "starting" ? "Game startet …" : `${selected?.label || gameData.profile?.title || "Game-Plattform"} bereit`,
      selected?.engine === "launcher_local" ? `${local.launcher_online ? "Launcher online" : "Launcher offline"} · ${Number(local.modules?.length || 0)} lokale Module` : "Cloud-Runtime verfügbar");
  } catch {
    operationCard("Game", "warn", "Game-Status nicht verfügbar", "Games-Seite öffnen und Verbindung prüfen");
  }

  try {
    const streamData = await CFS.json("/api/creator/stream-studio/runtime");
    const r = streamData.runtime || {};
    const live = Boolean(r.live || r.output?.live || r.session?.live);
    const launcherOnline = Boolean(r.launcher?.online || r.bridge?.online || r.interactive_game_engine?.launcher_online);
    const gameContext = streamData.game_context || {mode:"none"};
    const platformLabel = value => ({playstation_5:"PS5",playstation_4:"PS4",pc:"PC",xbox_series:"XBOX SERIES",xbox_one:"XBOX ONE",switch:"SWITCH"}[String(value||"")] || "PLATTFORM OFFEN");
    if (gameContext.mode === "active" && gameContext.game_name) {
      const minutes = Math.max(0, Math.floor(Number(gameContext.elapsed_seconds || 0) / 60));
      operationCard("Playing", "ready", `${gameContext.game_name} aktiv`, `${platformLabel(gameContext.platform)} · ${minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)} h ${minutes%60} min`} · laufender CFS-Spielkontext`);
    } else if (gameContext.mode === "recent" && gameContext.game_name) {
      operationCard("Playing", "wait", `Zuletzt: ${gameContext.game_name}`, `${platformLabel(gameContext.platform)} · bestätigter letzter Spielkontext`);
    } else {
      operationCard("Playing", "wait", "Kein aktives Spiel", "Game Activity ist aktuell nicht aktiv");
    }
    operationCard("Stream", live ? "ready" : launcherOnline ? "ready" : "wait", live ? "LIVE Session aktiv" : "Stream Studio bereit",
      live ? "Program-Ausgabe und Laufzeit aktiv" : launcherOnline ? "Launcher verbunden · bereit für lokale Sources" : "Studio verfügbar · Launcher derzeit offline");
  } catch {
    operationCard("Stream", "warn", "Stream-Status nicht verfügbar", "Stream Studio öffnen und Status prüfen");
  }

  try {
    const cutData = await CFS.json("/api/creator/cut-studio/projects");
    const projects = Array.isArray(cutData.projects) ? cutData.projects : [];
    const newest = projects[0];
    operationCard("Cut", projects.length ? "ready" : "wait", projects.length ? `${projects.length} Cut-Projekt${projects.length === 1 ? "" : "e"}` : "Noch kein Cut-Projekt",
      newest ? `Zuletzt: ${newest.title || "Cut Projekt"}` : "Recording aus Stream Studio übernehmen oder Projekt anlegen");
  } catch {
    operationCard("Cut", "warn", "CUT-Status nicht verfügbar", "CUT Studio öffnen und Projekte prüfen");
  }

  if (!connection.launcher) {
    operationCard("Launcher", "wait", "Creator-PC offline", "Launcher verbinden für Capture, Games und lokale Medien");
  } else {
    operationCard("Launcher", "ready", "Creator-PC verbunden", "Release-Policy wird geprüft …");
    try {
      const releaseData = await CFS.json("/api/creator/launcher/releases?channel=stable");
      const policy = releaseData.policy || {};
      const current = policy.current_version || releaseData.bridge?.client_version || "Launcher";
      const target = policy.build_target_version || policy.recommended_version || "";
      if (policy.version_blocked === true || policy.live_allowed === false || policy.update_required === true) {
        operationCard("Launcher", "warn", "Launcher Update erforderlich", `${current}${target ? ` → ${target}` : ""} · lokale/LIVE-Funktionen können blockiert sein`);
      } else if (policy.update_available === true) {
        operationCard("Launcher", "warn", "Launcher Update verfügbar", `${current}${target ? ` → ${target}` : ""} · aktuell noch kompatibel`);
      } else if (policy.compatible === true) {
        operationCard("Launcher", "ready", "Creator-PC kompatibel", `Launcher ${current} · Release-Policy erfüllt`);
      } else {
        operationCard("Launcher", "warn", "Launcher verbunden", `Version ${current} · Kompatibilität noch nicht bestätigt`);
      }
    } catch {
      operationCard("Launcher", "warn", "Creator-PC verbunden", "Release-Policy konnte nicht geladen werden");
    }
  }

  document.querySelectorAll("[data-ui-reload]").forEach(button => button.addEventListener("click", () => location.reload()));

});

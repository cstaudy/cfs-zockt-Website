
(() => {
  "use strict";

  const STORAGE_KEY = "cfs_recent_creator_tools_v9";
  const MAX_RECENT = 5;
  const path = location.pathname.toLowerCase();

  const TOOL_META = Object.freeze({
    "/pages/widget-studio.html": { title:"Widget Studio", kind:"BAUEN", icon:"▦", description:"Widgets erstellen, testen und veröffentlichen." },
    "/pages/stream-studio.html": { title:"Stream Studio", kind:"STREAM", icon:"◉", description:"Szenen, Quellen und Ausgabe zusammenführen." },
    "/pages/scene-studio.html": { title:"Scene Studio", kind:"BAUEN", icon:"◇", description:"Widgets und Elemente als Szene kombinieren." },
    "/pages/editor.html": { title:"Creator Editor", kind:"BAUEN", icon:"✎", description:"Creator-Inhalte und Layouts bearbeiten." },
    "/pages/cut-studio.html": { title:"Cut Studio", kind:"ERWEITERN", icon:"✂", description:"Clips und Creator-Material bearbeiten." },
    "/pages/audio-studio.html": { title:"Audio Studio", kind:"ERWEITERN", icon:"♪", description:"Audio-Workflow und vorbereitete Audio-Funktionen." },
    "/pages/games.html": { title:"Games", kind:"ERWEITERN", icon:"◆", description:"Interaktive Community-Games öffnen." },
    "/pages/nexus.html": { title:"NEXUS", kind:"ERWEITERN", icon:"N", description:"Weiterführende Creator-Funktionen erkunden." },
    "/pages/tiktok.html": { title:"TikTok", kind:"VERBINDEN", icon:"♪", description:"TikTok-Profil und unterstützte Creator-Daten verwalten." },
    "/pages/integrations.html": { title:"Integrationen", kind:"VERBINDEN", icon:"↗", description:"Externe Verbindungen zentral verwalten." },
    "/pages/launcher.html": { title:"Launcher", kind:"VERBINDEN", icon:"▣", description:"Creator-PC und Desktop-Bridge verwalten." },
    "/pages/launcher-connect.html": { title:"Gerät verbinden", kind:"VERBINDEN", icon:"↔", description:"Einen Launcher sicher mit dem Account verbinden." },
    "/pages/setup.html": { title:"Grundsetup", kind:"SYSTEM", icon:"⚙", description:"Creator-Grundsetup und Start-Workflow festlegen." },
    "/pages/settings.html": { title:"Einstellungen", kind:"SYSTEM", icon:"≡", description:"Creator-Einstellungen verwalten." },
    "/pages/account.html": { title:"Account", kind:"SYSTEM", icon:"◎", description:"Account, Sicherheit und Sitzungen verwalten." }
  });

  function loadRecent() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(item => TOOL_META[item.path]).slice(0,MAX_RECENT) : [];
    } catch {
      return [];
    }
  }

  function saveRecent(items) {
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_RECENT)));
    } catch {}
  }

  function recordCurrentTool() {
    const meta = TOOL_META[path];
    if (!meta || path === "/pages/account.html" || path === "/pages/setup.html" || path === "/pages/settings.html") return;

    const current = loadRecent().filter(item => item.path !== path);
    current.unshift({ path, at:Date.now() });
    saveRecent(current);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function recentMarkup() {
    const items = loadRecent();
    if (!items.length) {
      return `<div class="cfs-dashboard-v9-empty-recent">
        Noch kein Tool-Verlauf vorhanden. Sobald du ein Creator-Tool öffnest, erscheint es hier zum schnellen Weiterarbeiten.
      </div>`;
    }

    return items.slice(0,3).map(item => {
      const meta = TOOL_META[item.path];
      if (!meta) return "";
      return `<a class="cfs-dashboard-v9-recent-item" href="${escapeHtml(item.path)}">
        <span class="cfs-dashboard-v9-recent-icon">${escapeHtml(meta.icon)}</span>
        <span class="cfs-dashboard-v9-recent-copy">
          <strong>${escapeHtml(meta.title)}</strong>
          <span>${escapeHtml(meta.kind)} · zuletzt verwendet</span>
        </span>
        <span class="cfs-dashboard-v9-recent-arrow">›</span>
      </a>`;
    }).join("");
  }

  function focusSection() {
    if (document.getElementById("cfsDashboardV9Focus")) return;

    const hero = document.querySelector(".creator-dashboard-hero");
    if (!hero) return;

    const section = document.createElement("section");
    section.className = "cfs-dashboard-v9-focus";
    section.id = "cfsDashboardV9Focus";
    section.innerHTML = `
      <article class="cfs-dashboard-v9-card primary">
        <span class="cfs-dashboard-v9-kicker">JETZT WICHTIG</span>
        <h2 id="cfsDashboardV9NextTitle">Dein nächster Schritt wird geladen …</h2>
        <p id="cfsDashboardV9NextText">Wir prüfen dein Setup und zeigen dir danach genau eine sinnvolle Hauptaktion.</p>
        <div class="cfs-dashboard-v9-actions">
          <a class="cfs-dashboard-v9-action primary" id="cfsDashboardV9NextAction" href="/pages/dashboard.html" aria-disabled="true">BITTE WARTEN</a>
          <button class="cfs-dashboard-v9-action" type="button" data-cfs-help-topic="start">WARUM DIESER SCHRITT?</button>
        </div>
      </article>

      <article class="cfs-dashboard-v9-card">
        <span class="cfs-dashboard-v9-kicker">WEITERARBEITEN</span>
        <h2 style="font-size:20px">Zuletzt genutzt</h2>
        <p>Deine zuletzt geöffneten Creator-Tools – lokal in diesem Browser gespeichert.</p>
        <div class="cfs-dashboard-v9-recent" id="cfsDashboardV9Recent">${recentMarkup()}</div>
      </article>`;

    const onboarding = document.querySelector(".cfs-onboarding-v4");
    if (onboarding) onboarding.insertAdjacentElement("afterend",section);
    else hero.insertAdjacentElement("afterend",section);
  }

  function syncNextStep() {
    const sourceTitle = document.getElementById("nextStepTitle");
    const sourceText = document.getElementById("nextStepText");
    const sourceAction = document.getElementById("nextStepAction");

    const targetTitle = document.getElementById("cfsDashboardV9NextTitle");
    const targetText = document.getElementById("cfsDashboardV9NextText");
    const targetAction = document.getElementById("cfsDashboardV9NextAction");

    if (!sourceTitle || !sourceText || !sourceAction || !targetTitle || !targetText || !targetAction) return;

    targetTitle.textContent = sourceTitle.textContent || "Dein nächster Schritt";
    targetText.textContent = sourceText.textContent || "";
    targetAction.textContent = sourceAction.textContent || "WEITER";
    targetAction.href = sourceAction.getAttribute("href") || "/pages/dashboard.html";

    if (sourceAction.getAttribute("aria-disabled") === "true") {
      targetAction.setAttribute("aria-disabled","true");
    } else {
      targetAction.removeAttribute("aria-disabled");
    }
  }

  function quickActions() {
    if (document.getElementById("cfsDashboardV9Quick")) return;

    const focus = document.getElementById("cfsDashboardV9Focus");
    if (!focus) return;

    const quick = document.createElement("section");
    quick.className = "cfs-dashboard-v9-quick";
    quick.id = "cfsDashboardV9Quick";
    quick.setAttribute("aria-label","Schnellzugriff");
    quick.innerHTML = `
      <a href="/pages/widget-studio.html">
        <i>▦</i>
        <span><strong>Widget bauen</strong><small>Direkt ins Widget Studio.</small></span>
      </a>
      <a href="/pages/stream-studio.html">
        <i>◉</i>
        <span><strong>Stream vorbereiten</strong><small>Szenen, Quellen und Ausgabe.</small></span>
      </a>
      <a href="/pages/account.html">
        <i>◎</i>
        <span><strong>Account prüfen</strong><small>Sicherheit, Passkeys und Sitzungen.</small></span>
      </a>`;
    focus.insertAdjacentElement("afterend",quick);
  }

  function toolFromCard(card) {
    const title = card.querySelector("h3")?.textContent?.trim();
    const description = card.querySelector("p")?.textContent?.trim() || "";
    const link = card.querySelector("a[href]");
    if (!title || !link) return null;

    let pathname = "";
    try { pathname = new URL(link.href,location.origin).pathname.toLowerCase(); } catch {}
    const meta = TOOL_META[pathname] || {};
    const locked = card.classList.contains("locked") || /ERFORDERLICH|DETAILS/i.test(card.textContent || "");

    return {
      title,
      description,
      href: link.getAttribute("href") || pathname || "/pages/dashboard.html",
      path: pathname,
      kind: meta.kind || card.querySelector(".creator-tool-kind")?.textContent?.trim() || "TOOL",
      locked
    };
  }

  function collectTools() {
    const cards = [
      ...document.querySelectorAll("#simpleToolGrid article"),
      ...document.querySelectorAll("#moduleGrid article")
    ];

    const found = [];
    const seen = new Set();

    for (const card of cards) {
      const tool = toolFromCard(card);
      if (!tool) continue;
      const key = tool.path || tool.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(tool);
    }

    if (!found.length) {
      for (const [toolPath,meta] of Object.entries(TOOL_META)) {
        if (["/pages/account.html","/pages/settings.html"].includes(toolPath)) continue;
        found.push({
          title:meta.title,
          description:meta.description,
          href:toolPath,
          path:toolPath,
          kind:meta.kind,
          locked:false
        });
      }
    }

    return found;
  }

  function renderTools() {
    const grid = document.getElementById("cfsDashboardV9Results");
    if (!grid) return;

    const input = document.getElementById("cfsDashboardV9Search");
    const filter = document.getElementById("cfsDashboardV9Filter");
    const query = String(input?.value || "").trim().toLowerCase();
    const kind = String(filter?.value || "ALL");

    const tools = collectTools()
      .filter(tool => {
        if (kind !== "ALL" && tool.kind.toUpperCase() !== kind) return false;
        if (!query) return true;
        return [tool.title,tool.description,tool.kind].join(" ").toLowerCase().includes(query);
      })
      .slice(0,12);

    if (!tools.length) {
      grid.innerHTML = `<div class="cfs-dashboard-v9-no-results">
        Kein passendes Tool gefunden. Suche nach „Widget“, „Stream“, „TikTok“, „Launcher“, „Games“ oder öffne die Toolbox oben im Menü.
      </div>`;
      return;
    }

    grid.innerHTML = tools.map(tool => `
      <article class="cfs-dashboard-v9-tool${tool.locked ? " locked" : ""}">
        <div class="cfs-dashboard-v9-tool-top">
          <span class="cfs-dashboard-v9-tool-kind">${escapeHtml(tool.kind)}</span>
          <span class="cfs-dashboard-v9-tool-badge">${tool.locked ? "PLAN PRÜFEN" : "VERFÜGBAR"}</span>
        </div>
        <h3>${escapeHtml(tool.title)}</h3>
        <p>${escapeHtml(tool.description)}</p>
        <a href="${escapeHtml(tool.href)}">${tool.locked ? "DETAILS ANSEHEN" : "ÖFFNEN"} →</a>
      </article>`).join("");
  }

  function finder() {
    if (document.getElementById("cfsDashboardV9Finder")) return;

    const quick = document.getElementById("cfsDashboardV9Quick");
    if (!quick) return;

    const section = document.createElement("section");
    section.className = "cfs-dashboard-v9-finder";
    section.id = "cfsDashboardV9Finder";
    section.innerHTML = `
      <div class="cfs-dashboard-v9-finder-head">
        <div>
          <span class="cfs-dashboard-v9-kicker">TOOL-FINDER</span>
          <h2>Was möchtest du machen?</h2>
        </div>
        <p>Suche nach einer Aufgabe statt nach einem Modulnamen. Gesperrte Tools bleiben sichtbar, aber deutlich gekennzeichnet.</p>
      </div>
      <div class="cfs-dashboard-v9-search">
        <input id="cfsDashboardV9Search" type="search" maxlength="80" autocomplete="off" placeholder="z. B. Widget, Stream, TikTok, Clips …">
        <select class="cfs-dashboard-v9-filter" id="cfsDashboardV9Filter" aria-label="Tool-Kategorie">
          <option value="ALL">ALLE BEREICHE</option>
          <option value="BAUEN">BAUEN</option>
          <option value="STREAM">STREAM</option>
          <option value="VERBINDEN">VERBINDEN</option>
          <option value="ERWEITERN">ERWEITERN</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>
      </div>
      <div class="cfs-dashboard-v9-results" id="cfsDashboardV9Results"></div>`;

    quick.insertAdjacentElement("afterend",section);

    section.querySelector("#cfsDashboardV9Search")?.addEventListener("input",renderTools);
    section.querySelector("#cfsDashboardV9Filter")?.addEventListener("change",renderTools);
    renderTools();
  }

  function moveTechnicalSections() {
    if (document.getElementById("cfsDashboardV9Details")) return;

    const finderSection = document.getElementById("cfsDashboardV9Finder");
    if (!finderSection) return;

    const details = document.createElement("details");
    details.className = "cfs-dashboard-v9-details";
    details.id = "cfsDashboardV9Details";

    const summary = document.createElement("summary");
    summary.textContent = "Status, Verbindungen & erweiterte Übersicht";

    const body = document.createElement("div");
    body.className = "cfs-dashboard-v9-details-body";

    const selectors = [
      ".beginner-status",
      ".beginner-system-summary",
      "#setupWarning",
      ".creator-journey",
      ".beginner-actions",
      ".creator-workspace-map"
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node) body.appendChild(node);
    }

    details.append(summary,body);
    finderSection.insertAdjacentElement("afterend",details);

    // The old tool overview is redundant once the finder is present, but keep it in DOM
    // so existing page-dashboard.js can still populate all IDs safely.
    const originalTools = document.querySelector(".section #simpleToolGrid")?.closest(".section");
    if (originalTools) originalTools.classList.add("cfs-dashboard-v9-original-tools-hidden");
  }

  function observeSourceNextStep() {
    const source = document.getElementById("nextStepCard");
    if (!source) return;

    syncNextStep();
    const observer = new MutationObserver(syncNextStep);
    observer.observe(source,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["href","aria-disabled"]});
  }

  function observeToolData() {
    const targets = [
      document.getElementById("simpleToolGrid"),
      document.getElementById("moduleGrid")
    ].filter(Boolean);

    if (!targets.length) return;

    let timer = null;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(renderTools,40);
    };

    const observer = new MutationObserver(refresh);
    targets.forEach(target => observer.observe(target,{subtree:true,childList:true,characterData:true}));
  }

  function recordToolClicks() {
    document.addEventListener("click",event => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;

      let targetPath = "";
      try {
        const url = new URL(link.href,location.origin);
        if (url.origin !== location.origin) return;
        targetPath = url.pathname.toLowerCase();
      } catch {
        return;
      }

      if (!TOOL_META[targetPath]) return;

      const current = loadRecent().filter(item => item.path !== targetPath);
      current.unshift({path:targetPath,at:Date.now()});
      saveRecent(current);
    });
  }

  function initDashboard() {
    if (path !== "/pages/dashboard.html") return;

    focusSection();
    quickActions();
    finder();
    moveTechnicalSections();
    observeSourceNextStep();
    observeToolData();

    setTimeout(() => {
      syncNextStep();
      renderTools();
    },500);

    setTimeout(renderTools,1400);
  }

  function init() {
    if (!document.body.classList.contains("creator-workspace")) return;

    recordCurrentTool();
    recordToolClicks();
    initDashboard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

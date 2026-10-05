(() => {
  "use strict";

  if (!document.body?.classList.contains("creator-workspace")) return;

  const PATH = location.pathname.toLowerCase();
  const HELP = Object.freeze({
    "/pages/dashboard.html": ["Dashboard lesen", "Arbeite zuerst den markierten nächsten Schritt ab. Wenn Statusdaten hängen, lade sie neu statt Einstellungen auf Verdacht zu ändern.", [["STATUS NEU LADEN", "#refreshStatus"], ["SYSTEMCHECK", "/pages/system-check.html"]]],
    "/pages/account.html": ["Account sicher ändern", "Ändere Sicherheitsfaktoren einzeln und prüfe danach den neuen Status. Recovery-Codes, Passwörter und Tokens gehören nie in Support-Nachrichten.", [["SICHERHEIT", "#security"], ["SUPPORT", "/pages/support.html"]]],
    "/pages/integrations.html": ["Verbindungen einzeln prüfen", "Verbinde oder synchronisiere immer nur einen Provider und kontrolliere danach dessen Status. CFS schaltet keine andere Plattform automatisch um.", [["STREAM STUDIO", "/pages/stream-studio.html"], ["SYSTEMCHECK", "/pages/system-check.html"]]],
    "/pages/setup.html": ["Grundsetup klein halten", "Speichere zuerst nur die Basis. Provider, Launcher und Studios kannst du anschließend getrennt verbinden und testen.", [["DASHBOARD", "/pages/dashboard.html"], ["INTEGRATIONEN", "/pages/integrations.html"]]],
    "/pages/settings.html": ["Einstellungen nachvollziehbar ändern", "Ändere möglichst nur eine Gruppe gleichzeitig. So kannst du bei einem unerwarteten Ergebnis klar erkennen, welche Einstellung betroffen ist.", [["DASHBOARD", "/pages/dashboard.html"], ["ACCOUNT", "/pages/account.html"]]],
    "/pages/widget-studio.html": ["Widget-Workflow", "Erstelle oder öffne zuerst ein Widget, prüfe die Vorschau und veröffentliche erst danach. LIVE-Provider sind für manuelle Testdaten nicht erforderlich.", [["SHOP", "/pages/shop.html"], ["INTEGRATIONEN", "/pages/integrations.html"]]],
    "/pages/scene-studio.html": ["Scene-Workflow", "Öffne eine Scene, platziere nur bereits vorhandene Creator-Widgets und speichere vor dem Veröffentlichen. Fremde Shop-IDs werden nicht übernommen.", [["WIDGET STUDIO", "/pages/widget-studio.html"], ["SHOP", "/pages/shop.html"]]],
    "/pages/stream-studio.html": ["LIVE Schritt für Schritt", "Prüfe zuerst Scene, Audio und Zielstatus. Starte erst danach die lokale Session; Stream-Keys bleiben im sicheren Launcher-/Provider-Pfad.", [["INTEGRATIONEN", "/pages/integrations.html"], ["LAUNCHER", "/pages/launcher.html"]]],
    "/pages/cut-studio.html": ["Lokaler Cut-Workflow", "Projekt und Clip-Metadaten liegen in der Suite; Video- und Audiodateien bleiben lokal. Erzeuge erst am Ende den Launcher-Exportjob.", [["LAUNCHER", "/pages/launcher.html"], ["DASHBOARD", "/pages/dashboard.html"]]],
    "/pages/audio-studio.html": ["Audio-Status richtig einordnen", "Dieser Bereich verwaltet vorbereitete Preset-Zustände. Die eigentliche Audioverarbeitung ist in dieser Web-Version noch kein freigegebener Cloud-Workflow.", [["LIVE MIXER", "/pages/stream-studio.html#studio-audio"], ["LAUNCHER", "/pages/launcher.html"]]],
    "/pages/launcher.html": ["Launcher zuerst verbinden", "Prüfe Release, Kompatibilität und Bridge getrennt. Ein fehlender Launcher-Heartbeat ändert keine Cloud-Inhalte und startet keinen Stream.", [["GERÄT VERBINDEN", "/pages/launcher-connect.html"], ["SYSTEMCHECK", "/pages/system-check.html"]]],
    "/pages/launcher-connect.html": ["Gerät sicher verbinden", "Nutze den Device-Link nur auf deinem eigenen Creator-PC. Ein Verbindungsfehler löscht keine bestehenden Creator-Inhalte.", [["LAUNCHER", "/pages/launcher.html"], ["SYSTEMCHECK", "/pages/system-check.html"]]],
    "/pages/launcher-download.html": ["Release vor Installation prüfen", "Installiere nur den freigegebenen Release-Kanal und vergleiche verfügbare Integritätsangaben. Ein Build-Ziel ist noch kein veröffentlichter Download.", [["LAUNCHER", "/pages/launcher.html"], ["SYSTEMCHECK", "/pages/system-check.html"]]],
    "/pages/launcher-provider-connect.html": ["Provider lokal freigeben", "Bestätige nur das Streaming-Ziel, das du tatsächlich nutzen willst. Stream-Credentials werden nicht als normale Creator-Konfiguration gespeichert.", [["INTEGRATIONEN", "/pages/integrations.html"], ["STREAM STUDIO", "/pages/stream-studio.html"]]],
    "/pages/games.html": ["Game-Modul", "Wähle zuerst das gewünschte Game-Modul und prüfe dessen Status. LIVE- oder Launcher-Abhängigkeiten werden separat angezeigt.", [["DASHBOARD", "/pages/dashboard.html"], ["STREAM STUDIO", "/pages/stream-studio.html"]]],
    "/pages/tiktok.html": ["TikTok optional verbinden", "Verbinde TikTok nur, wenn dein Workflow echte TikTok-Daten benötigt. Ein nicht verbundener Provider blockiert manuelle Creator-Workflows nicht automatisch.", [["INTEGRATIONEN", "/pages/integrations.html"], ["WIDGET STUDIO", "/pages/widget-studio.html"]]],
    "/pages/nexus.html": ["NEXUS als Diagnose", "NEXUS zeigt Integrations- und Eventstatus. Nutze für Verbindungsänderungen weiterhin die jeweilige Provider- oder Launcher-Seite.", [["INTEGRATIONEN", "/pages/integrations.html"], ["DASHBOARD", "/pages/dashboard.html"]]],
    "/pages/editor.html": ["Editor sicher verwenden", "Arbeite nur am aktuell geladenen Creator-Inhalt und speichere bewusst. Nutze bei fehlendem Ausgangsobjekt den jeweiligen Studio-Einstieg.", [["WIDGET STUDIO", "/pages/widget-studio.html"], ["SCENE STUDIO", "/pages/scene-studio.html"]]],
    "/pages/system-check.html": ["Diagnose statt Automatismus", "Der Systemcheck liest Zustände und zeigt nächste Schritte. Er startet keinen Stream und verbindet keine Provider automatisch.", [["DASHBOARD", "/pages/dashboard.html"], ["INTEGRATIONEN", "/pages/integrations.html"]]],
    "/pages/technical-status.html": ["Technischen Status einordnen", "Nutze diese Ansicht zur Diagnose. Offene reale Windows-/OBS-/Provider-Acceptance wird hier nicht durch lokale Code-Checks ersetzt.", [["SYSTEMCHECK", "/pages/system-check.html"], ["DASHBOARD", "/pages/dashboard.html"]]]
  });

  const EMPTY_SELECTORS = [
    ".activity-empty",
    ".release-empty",
    ".cut-empty",
    ".stream-session-empty",
    ".stream-health-empty",
    ".stream-activity-empty",
    ".ui-state-empty",
    ".scene-hint"
  ];

  const MOBILE_ACTION_SELECTORS = [
    ".creator-tool-entry-actions",
    ".card-actions",
    ".release-hero-actions",
    ".shop-workflow-links",
    ".shop-workflow-issues",
    ".account-card-actions",
    ".management-actions"
  ];

  function button(label, href, primary = false) {
    const link = document.createElement("a");
    link.className = `btn${primary ? " primary" : ""}`;
    link.href = href;
    link.textContent = label;
    if (String(href).startsWith("#")) {
      link.addEventListener("click", event => {
        const target = document.querySelector(String(href));
        if (!target) return;
        event.preventDefault();
        if (target instanceof HTMLButtonElement) target.click();
        target.scrollIntoView?.({ behavior: "smooth", block: "center" });
        target.focus?.({ preventScroll: true });
      });
    }
    return link;
  }

  function setLiveSemantics(node, type = "empty") {
    if (!(node instanceof HTMLElement)) return;
    node.classList.add("creator-ux-state", `creator-ux-state-${type}`);
    if (!node.hasAttribute("role")) node.setAttribute("role", type === "error" ? "alert" : "status");
    if (!node.hasAttribute("aria-live")) node.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  }

  function normalize(root = document) {
    EMPTY_SELECTORS.forEach(selector => root.querySelectorAll?.(selector).forEach(node => setLiveSemantics(node, "empty")));
    root.querySelectorAll?.(".notice.danger").forEach(node => setLiveSemantics(node, "error"));
    root.querySelectorAll?.(".notice.warn").forEach(node => setLiveSemantics(node, "warning"));
    root.querySelectorAll?.(".notice:not(.danger):not(.warn)").forEach(node => {
      if (node.textContent.trim()) setLiveSemantics(node, "success");
    });
    MOBILE_ACTION_SELECTORS.forEach(selector => root.querySelectorAll?.(selector).forEach(node => node.classList.add("creator-ux-mobile-actions")));
  }

  function renderState(target, options = {}) {
    const node = typeof target === "string" ? document.querySelector(target) : target;
    if (!(node instanceof HTMLElement)) return null;
    const type = ["error", "warning", "success", "empty"].includes(options.type) ? options.type : "empty";
    node.replaceChildren();
    setLiveSemantics(node, type);

    if (options.title) {
      const title = document.createElement("strong");
      title.className = "creator-ux-state-title";
      title.textContent = String(options.title);
      node.appendChild(title);
    }
    if (options.text) {
      const text = document.createElement("p");
      text.className = "creator-ux-state-text";
      text.textContent = String(options.text);
      node.appendChild(text);
    }
    const actions = Array.isArray(options.actions) ? options.actions : [];
    if (actions.length) {
      const wrap = document.createElement("div");
      wrap.className = "creator-ux-state-actions creator-ux-mobile-actions";
      actions.forEach((action, index) => {
        if (!action?.href || !action?.label) return;
        wrap.appendChild(button(String(action.label), String(action.href), action.primary === true || index === 0));
      });
      node.appendChild(wrap);
    }
    return node;
  }

  function ensureAnnouncer() {
    let node = document.getElementById("creatorUxAnnouncer");
    if (node) return node;
    const main = document.querySelector("main");
    if (!main) return null;
    node = document.createElement("div");
    node.id = "creatorUxAnnouncer";
    node.className = "creator-ux-announcer creator-ux-state";
    node.hidden = true;
    const anchor = main.querySelector(".creator-tool-entry,.page-hero,.account-hero,.release-hero");
    if (anchor?.parentNode) anchor.insertAdjacentElement("afterend", node);
    else main.prepend(node);
    return node;
  }

  function announce(message, type = "error", options = {}) {
    const node = ensureAnnouncer();
    if (!node) return;
    node.hidden = false;
    renderState(node, {
      type,
      title: options.title || (type === "error" ? "Aktion nicht abgeschlossen" : type === "warning" ? "Bitte prüfen" : "Status"),
      text: message,
      actions: options.actions || (type === "error" ? [{ label: "SEITE NEU LADEN", href: location.pathname + location.search }] : [])
    });
    node.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }

  function installHelp() {
    const config = HELP[PATH];
    if (!config || document.getElementById("creatorUxHelp")) return;
    const main = document.querySelector("main");
    if (!main) return;
    const [title, copy, actions] = config;
    const details = document.createElement("details");
    details.id = "creatorUxHelp";
    details.className = "creator-ux-help";
    details.innerHTML = '<summary>HILFE ZU DIESEM BEREICH</summary>';

    const body = document.createElement("div");
    body.className = "creator-ux-help-body";
    const copyWrap = document.createElement("div");
    copyWrap.className = "creator-ux-help-copy";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const p = document.createElement("p");
    p.textContent = copy;
    copyWrap.append(strong, p);
    const actionWrap = document.createElement("div");
    actionWrap.className = "creator-ux-help-actions creator-ux-mobile-actions";
    for (const [label, href] of actions || []) actionWrap.appendChild(button(label, href));
    body.append(copyWrap, actionWrap);
    details.appendChild(body);

    const anchor = main.querySelector(".creator-tool-entry,.page-hero,.account-hero,.release-hero,.beginner-hero");
    if (anchor) anchor.insertAdjacentElement("afterend", details);
    else main.prepend(details);
  }

  function installAutomaticRetry(root = document) {
    const candidates = root.querySelectorAll?.(".creator-ux-state-empty,.creator-ux-state-error") || [];
    for (const node of candidates) {
      if (!(node instanceof HTMLElement) || node.dataset.creatorUxRetry === "1") continue;
      const text = node.textContent || "";
      if (!/(konnte[n]? nicht geladen|laden fehlgeschlagen|nicht verfügbar|fehler beim laden)/i.test(text)) continue;
      if (node.querySelector("a,button")) continue;
      const wrap = document.createElement("div");
      wrap.className = "creator-ux-state-actions creator-ux-mobile-actions";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn";
      retry.textContent = "ERNEUT LADEN";
      retry.addEventListener("click", () => location.reload());
      wrap.appendChild(retry);
      node.appendChild(wrap);
      node.dataset.creatorUxRetry = "1";
    }
  }

  function apply(root = document) {
    normalize(root);
    installAutomaticRetry(root);
  }

  function init() {
    installHelp();
    apply(document);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) apply(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.CFSCreatorUX = Object.freeze({ renderState, announce, normalize: apply });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

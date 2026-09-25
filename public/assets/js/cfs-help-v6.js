
(() => {
  "use strict";

  const MARK = "/assets/img/brand/cfs-zockt-mark-original.png";
  const path = location.pathname.toLowerCase();

  const TOPICS = Object.freeze({
    start: {
      category:"ERSTE SCHRITTE",
      title:"Sauber mit cfs_zockt starten",
      text:"Für den Einstieg musst du nicht alle Module gleichzeitig einrichten. Arbeite zuerst den sicheren Grundstart ab.",
      steps:[
        "E-Mail-Adresse bestätigen.",
        "Passkey oder Authenticator-App als zusätzlichen Schutz einrichten.",
        "Grundsetup speichern.",
        "Ein erstes Widget anlegen und in der Vorschau testen."
      ],
      actions:[["Dashboard","/pages/dashboard.html","primary"],["Grundsetup","/pages/setup.html",""]]
    },
    email: {
      category:"ACCOUNT",
      title:"E-Mail bestätigen",
      text:"Die Bestätigung zeigt, dass du Zugriff auf die angegebene Adresse hast. Verwende immer nur den neuesten Bestätigungslink.",
      steps:[
        "Bestätigungslink anfordern.",
        "Posteingang und Spam/Junk prüfen.",
        "Den neuesten Link öffnen.",
        "Danach anmelden und den Account absichern."
      ],
      actions:[["Bestätigung öffnen","/pages/verify-email.html","primary"],["Login","/pages/login.html",""]]
    },
    password: {
      category:"SICHERHEIT",
      title:"Passwort richtig verwenden",
      text:"Dein Passwort wird für sensible Account-Aktionen zusätzlich abgefragt. Gib es nur in den offiziellen cfs_zockt Formularen ein.",
      steps:[
        "Verwende ein langes, einzigartiges Passwort.",
        "Gib dein Passwort niemals in Support-Nachrichten oder in den CFS Guide ein.",
        "Bei Verlust den offiziellen Recovery-Ablauf verwenden."
      ],
      actions:[["Passwort-Recovery","/pages/forgot-password.html","primary"],["Account-Sicherheit","/pages/account.html#account-security",""]]
    },
    passkey: {
      category:"SICHERHEIT",
      title:"Passkey einrichten",
      text:"Passkeys verwenden WebAuthn und sind phishing-resistenter als ein Passwort allein. Windows Hello, Browser-Passkeys oder Sicherheitsschlüssel können verwendet werden.",
      steps:[
        "Account → Sicherheit öffnen.",
        "Einen klaren Namen für den Passkey vergeben.",
        "Aktuelles Passwort bestätigen.",
        "Windows Hello bzw. den gewählten Passkey bestätigen."
      ],
      actions:[["Passkeys öffnen","/pages/account.html#account-security","primary"]]
    },
    mfa: {
      category:"SICHERHEIT",
      title:"Authenticator & Recovery-Codes",
      text:"TOTP erzeugt zeitbasierte Einmalcodes. Recovery-Codes dienen nur als Notfallweg und jeder Code ist nur einmal nutzbar.",
      steps:[
        "Authenticator-App einrichten.",
        "Den 6-stelligen Code bestätigen.",
        "Recovery-Codes sicher außerhalb des Browsers speichern.",
        "Recovery-Codes niemals an Support weitergeben."
      ],
      actions:[["2FA öffnen","/pages/account.html#account-security","primary"]]
    },
    sessions: {
      category:"SICHERHEIT",
      title:"Aktive Sitzungen prüfen",
      text:"Hier siehst du aktive Login-Sitzungen. Wenn dir etwas unbekannt vorkommt, kannst du andere Sitzungen beenden.",
      steps:[
        "Aktuelle Sitzung erkennen.",
        "Unbekannte oder alte Sitzungen widerrufen.",
        "Bei Verdacht zusätzlich Passwort ändern und Passkey/2FA prüfen."
      ],
      actions:[["Sitzungen öffnen","/pages/account.html#account-sessions","primary"]]
    },
    export: {
      category:"DATENSCHUTZ",
      title:"Datenexport",
      text:"Der Export enthält deine accountbezogenen Daten, aber keine Passwörter, Passwort-Hashes oder geheimen Schlüssel.",
      steps:[
        "Aktuelles Passwort nur im Export-Formular eingeben.",
        "Export lokal sicher speichern.",
        "Datei nicht öffentlich teilen, wenn persönliche Daten enthalten sind."
      ],
      actions:[["Account erweitert","/pages/account.html#account-advanced","primary"]]
    },
    delete: {
      category:"GEFAHRENBEREICH",
      title:"Account dauerhaft löschen",
      text:"Die Kontolöschung ist endgültig. Nutze sie nur, wenn du deine Creator-Daten wirklich dauerhaft entfernen möchtest.",
      steps:[
        "Vorher optional einen Datenexport erstellen.",
        "Verbundene Dienste prüfen.",
        "Aktuelles Passwort bestätigen.",
        "Die verlangte Bestätigung exakt eingeben."
      ],
      actions:[["Datenexport","/pages/account.html#account-advanced",""],["Account öffnen","/pages/account.html#account-advanced","primary"]]
    },
    setup: {
      category:"CREATOR SETUP",
      title:"Grundsetup",
      text:"Das Grundsetup hält nur die wichtigsten Creator-Einstellungen fest. Du kannst später jederzeit nachjustieren.",
      steps:[
        "Theme auswählen.",
        "Bevorzugte Widgets festlegen.",
        "Creator-Ziel bzw. Start-Workflow speichern.",
        "Danach im Dashboard oder Widget Studio weitermachen."
      ],
      actions:[["Setup öffnen","/pages/setup.html","primary"],["Dashboard","/pages/dashboard.html",""]]
    },
    widgets: {
      category:"WIDGET STUDIO",
      title:"Erstes Widget anlegen",
      text:"Beginne mit einem einfachen Widget und teste die Vorschau, bevor du Live-Daten oder Stream-Software einbindest.",
      steps:[
        "Widget-Typ auswählen.",
        "Name und Darstellung festlegen.",
        "Mit Testdaten in der Vorschau prüfen.",
        "Erst danach Live-Daten oder Launcher verbinden."
      ],
      actions:[["Widget Studio","/pages/widget-studio.html","primary"],["Dashboard","/pages/dashboard.html",""]]
    },
    stream: {
      category:"STREAM STUDIO",
      title:"Stream Studio verstehen",
      text:"Das Stream Studio verbindet Szenen, Quellen und Ausgaben. Für neue Nutzer ist ein schrittweiser Aufbau zuverlässiger als alles gleichzeitig zu konfigurieren.",
      steps:[
        "Eine Szene auswählen oder anlegen.",
        "Nur die benötigten Quellen hinzufügen.",
        "Vorschau prüfen.",
        "Ausgabeprofil und Live-Ziel erst danach konfigurieren."
      ],
      actions:[["Stream Studio","/pages/stream-studio.html","primary"],["Scene Studio","/pages/scene-studio.html",""]]
    },
    tiktok: {
      category:"VERBINDUNG",
      title:"TikTok verbinden",
      text:"TikTok ist für den Grundstart optional. Verbinde den Account erst, wenn du Funktionen verwenden möchtest, die echte TikTok-Daten benötigen.",
      steps:[
        "TikTok-Verbindungsstatus prüfen.",
        "Nur über den offiziellen OAuth-Weg verbinden.",
        "Nach der Verbindung den Synchronisationsstatus prüfen.",
        "Bei Bedarf die Verbindung wieder über cfs_zockt trennen."
      ],
      actions:[["TikTok öffnen","/pages/tiktok.html","primary"],["Integrationen","/pages/integrations.html",""]]
    },
    launcher: {
      category:"DESKTOP",
      title:"CFS Launcher",
      text:"Der Launcher verbindet Desktop-Funktionen mit deiner Creator Suite. Für normale Account- und Basis-Widget-Funktionen ist er nicht sofort erforderlich.",
      steps:[
        "Kompatible Launcher-Version verwenden.",
        "Geräteverbindung nur mit dem angezeigten Code bestätigen.",
        "Bridge-Status prüfen.",
        "Erst danach Desktop- oder Stream-Funktionen verwenden."
      ],
      actions:[["Launcher","/pages/launcher.html","primary"],["Gerät verbinden","/pages/launcher-connect.html",""]]
    },
    device: {
      category:"DESKTOP",
      title:"Gerät sicher verbinden",
      text:"Der Gerätecode ist nur für die aktuelle Verbindung gedacht. Teile ihn nicht öffentlich.",
      steps:[
        "Code im Launcher erzeugen.",
        "Code auf dieser Seite eingeben.",
        "Gerätename und Account prüfen.",
        "Verbindung erst dann bestätigen."
      ],
      actions:[["Gerät verbinden","/pages/launcher-connect.html","primary"]]
    },
    integrations: {
      category:"VERBINDUNGEN",
      title:"Integrationen verwalten",
      text:"Verbinde nur Dienste, die du tatsächlich verwendest. Zusätzliche Verbindungen erhöhen sonst nur die Komplexität.",
      steps:[
        "Benötigte Integration auswählen.",
        "Status und Berechtigungen prüfen.",
        "Verbindung testen.",
        "Nicht mehr benötigte Integrationen wieder trennen."
      ],
      actions:[["Integrationen","/pages/integrations.html","primary"]]
    },
    plans: {
      category:"PLAN",
      title:"FREE, CREATOR und PRO",
      text:"Starte mit dem Plan, der deine aktuellen Funktionen abdeckt. Zusätzliche Module sollten erst dann freigeschaltet werden, wenn du sie wirklich brauchst.",
      steps:[
        "Benötigte Funktionen vergleichen.",
        "FREE zuerst vollständig nutzen.",
        "Creator/PRO nur für konkrete Zusatzfunktionen wählen."
      ],
      actions:[["Pläne ansehen","/pages/plans.html","primary"]]
    },
    support: {
      category:"SUPPORT",
      title:"Technisches Problem melden",
      text:"Eine gute Meldung beschreibt betroffenen Bereich, erwartetes Verhalten, tatsächliches Verhalten und reproduzierbare Schritte. Geheimnisse gehören nie in die Meldung.",
      steps:[
        "Systemstatus prüfen.",
        "Betroffenen Bereich nennen.",
        "Erwartung und tatsächliches Ergebnis trennen.",
        "Keine Passwörter, Tokens, Recovery-Codes oder API-Keys mitsenden."
      ],
      actions:[["Support öffnen","/pages/support.html#support-report","primary"],["Systemstatus","/api/public/status",""]]
    }
  });

  const PAGE_HELP = Object.freeze({
    "/pages/login.html": {
      title:"Account-Start ohne Umwege",
      copy:"Registrieren, E-Mail bestätigen, anmelden. Mehr brauchst du für den ersten Einstieg nicht.",
      topics:["start","email","password"]
    },
    "/pages/verify-email.html": {
      title:"E-Mail-Bestätigung",
      copy:"Fordere nur bei Bedarf einen neuen Link an und öffne anschließend den neuesten Link aus deinem Postfach.",
      topics:["email","start"]
    },
    "/pages/dashboard.html": {
      title:"Dein nächster Schritt",
      copy:"Der Startcheck führt dich durch den sicheren Grundstart. TikTok und Launcher bleiben zunächst optional.",
      topics:["start","passkey","widgets"]
    },
    "/pages/account.html": {
      title:"Account & Sicherheit",
      copy:"Beginne mit E-Mail, Passkey oder 2FA. Erweiterte Aktionen sind bewusst getrennt.",
      topics:["passkey","mfa","sessions","export"]
    },
    "/pages/setup.html": {
      title:"Grundsetup",
      copy:"Lege nur Theme, Widgets und deinen Start-Workflow fest. Feintuning kann später erfolgen.",
      topics:["setup","widgets"]
    },
    "/pages/widget-studio.html": {
      title:"Widget Studio",
      copy:"Baue zuerst ein Widget mit Testdaten. Live-Verbindungen kommen danach.",
      topics:["widgets","tiktok","launcher"]
    },
    "/pages/stream-studio.html": {
      title:"Stream Studio",
      copy:"Szenen, Quellen und Ausgabe nacheinander einrichten – nicht alles gleichzeitig.",
      topics:["stream","widgets","launcher"]
    },
    "/pages/tiktok.html": {
      title:"TikTok-Verbindung",
      copy:"TikTok ist optional. Verbinde es nur, wenn dein Workflow echte TikTok-Daten benötigt.",
      topics:["tiktok","integrations"]
    },
    "/pages/integrations.html": {
      title:"Integrationen",
      copy:"Nur benötigte Dienste verbinden und danach den Status prüfen.",
      topics:["integrations","tiktok","launcher"]
    },
    "/pages/launcher.html": {
      title:"CFS Launcher",
      copy:"Prüfe zuerst Version und Kompatibilität, danach Gerät und Bridge verbinden.",
      topics:["launcher","device"]
    },
    "/pages/launcher-connect.html": {
      title:"Gerät verbinden",
      copy:"Gerätecode, Gerätename und Account vor der Bestätigung kontrollieren.",
      topics:["device","launcher"]
    },
    "/pages/plans.html": {
      title:"Passenden Plan wählen",
      copy:"Wähle Zusatzfunktionen nach Bedarf statt vorsorglich alles freizuschalten.",
      topics:["plans"]
    },
    "/pages/support.html": {
      title:"Schneller zur Lösung",
      copy:"Status prüfen, Problem eingrenzen und erst danach eine private Meldung absenden.",
      topics:["support","password"]
    }
  });

  const FIELD_HELP = Object.freeze({
    loginPassword:"password",
    regPassword:"password",
    verifyEmailAddress:"email",
    passkeyPassword:"passkey",
    passkeyRemovePassword:"passkey",
    mfaSetupPassword:"mfa",
    mfaRecoveryPassword:"mfa",
    mfaDisablePassword:"mfa",
    exportPassword:"export",
    deleteConfirmation:"delete",
    deviceCode:"device",
    themeSelect:"setup"
  });

  const NOTICE_HINTS = [
    { match:["401","nicht autorisiert","unauthorized","anmeldung erforderlich"], topic:"password", title:"Anmeldung prüfen" },
    { match:["passwort","password"], topic:"password", title:"Passwort prüfen" },
    { match:["bestätig","verification","verifiz"], topic:"email", title:"E-Mail-Bestätigung prüfen" },
    { match:["passkey","webauthn"], topic:"passkey", title:"Passkey-Hilfe öffnen" },
    { match:["totp","authenticator","2fa","mfa"], topic:"mfa", title:"2FA-Hilfe öffnen" },
    { match:["launcher","gerät","device"], topic:"launcher", title:"Launcher-Hilfe öffnen" },
    { match:["tiktok","oauth"], topic:"tiktok", title:"TikTok-Hilfe öffnen" },
    { match:["widget"], topic:"widgets", title:"Widget-Hilfe öffnen" },
    { match:["stream","szene","scene"], topic:"stream", title:"Stream-Hilfe öffnen" }
  ];

  let activeTopic = "";
  let drawer = null;

  function topicSearchText(key, topic) {
    return [key,topic.category,topic.title,topic.text,...topic.steps].join(" ").toLowerCase();
  }

  function createDrawer() {
    if (drawer) return drawer;

    drawer = document.createElement("section");
    drawer.className = "cfs-help-drawer";
    drawer.id = "cfsHelpDrawer";
    drawer.hidden = true;
    drawer.setAttribute("aria-label","cfs_zockt Hilfe-Center");

    drawer.innerHTML = `
      <div class="cfs-help-drawer-backdrop" data-cfs-help-close></div>
      <div class="cfs-help-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="cfsHelpTitle">
        <header class="cfs-help-head">
          <span class="cfs-help-mark"><img src="${MARK}" alt=""></span>
          <div class="cfs-help-head-copy">
            <strong id="cfsHelpTitle">cfs_zockt Hilfe-Center</strong>
            <span>Kurze Erklärungen, sichere nächste Schritte und direkte Wege.</span>
          </div>
          <button class="cfs-help-close" type="button" aria-label="Hilfe schließen" data-cfs-help-close>×</button>
        </header>
        <div class="cfs-help-search">
          <input id="cfsHelpSearch" type="search" maxlength="100" autocomplete="off" placeholder="Hilfe durchsuchen …">
        </div>
        <div class="cfs-help-content" id="cfsHelpContent"></div>
      </div>`;

    document.body.appendChild(drawer);

    drawer.querySelectorAll("[data-cfs-help-close]").forEach(node => {
      node.addEventListener("click", close);
    });

    drawer.querySelector("#cfsHelpSearch")?.addEventListener("input", event => {
      renderSearch(event.target.value);
    });

    return drawer;
  }

  function actionNode(label, href, style) {
    if (String(href).startsWith("help:")) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (style === "primary") button.classList.add("primary");
      button.addEventListener("click", () => open(String(href).slice(5)));
      return button;
    }

    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (style === "primary") a.classList.add("primary");
    return a;
  }

  function renderTopic(key, { current = false } = {}) {
    const topic = TOPICS[key];
    if (!topic) return null;

    const article = document.createElement("article");
    article.className = `cfs-help-topic${current ? " current" : ""}`;
    article.dataset.topic = key;

    const kicker = document.createElement("div");
    kicker.className = "cfs-help-topic-kicker";
    kicker.textContent = topic.category;

    const title = document.createElement("h3");
    title.textContent = topic.title;

    const text = document.createElement("p");
    text.textContent = topic.text;

    const list = document.createElement("ul");
    for (const step of topic.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      list.appendChild(li);
    }

    const actions = document.createElement("div");
    actions.className = "cfs-help-topic-actions";
    for (const [label,href,style] of topic.actions || []) {
      actions.appendChild(actionNode(label,href,style));
    }

    const safe = document.createElement("div");
    safe.className = "cfs-help-safe";
    safe.textContent = "Sicherheit: Gib Passwörter, Tokens, Recovery-Codes oder API-Keys niemals in Hilfe-Chats oder Support-Nachrichten ein.";

    article.append(kicker,title,text,list,actions,safe);
    return article;
  }

  function renderSearch(query = "") {
    const content = document.getElementById("cfsHelpContent");
    if (!content) return;

    const normalized = String(query || "").trim().toLowerCase();
    const keys = Object.keys(TOPICS).filter(key => {
      if (!normalized) return true;
      return topicSearchText(key,TOPICS[key]).includes(normalized);
    });

    content.replaceChildren();

    if (!keys.length) {
      const empty = document.createElement("div");
      empty.className = "cfs-help-empty";
      empty.textContent = "Keine passende Schnellhilfe gefunden. Öffne den CFS Guide oder den Support-Bereich und beschreibe kurz, was du erreichen möchtest.";
      content.appendChild(empty);
      return;
    }

    for (const key of keys) {
      const node = renderTopic(key,{current:key === activeTopic});
      if (node) content.appendChild(node);
    }
  }

  function open(topic = "") {
    createDrawer();

    activeTopic = TOPICS[topic] ? topic : "";
    const search = drawer.querySelector("#cfsHelpSearch");
    if (search) search.value = "";

    renderSearch("");
    drawer.hidden = false;
    document.documentElement.style.overflow = "hidden";

    requestAnimationFrame(() => {
      if (activeTopic) {
        drawer.querySelector(`[data-topic="${activeTopic}"]`)?.scrollIntoView({block:"start"});
      }
      drawer.querySelector(".cfs-help-close")?.focus();
    });
  }

  function close() {
    if (!drawer) return;
    drawer.hidden = true;
    document.documentElement.style.overflow = "";
  }

  function helpButton(topic, label = "WARUM?") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cfs-help-field-button";
    button.textContent = label;
    button.addEventListener("click", () => open(topic));
    return button;
  }

  function insertPageStrip() {
    const cfg = PAGE_HELP[path];
    if (!cfg || document.querySelector(".cfs-help-strip")) return;

    const main = document.querySelector("main");
    if (!main) return;

    const hero = main.querySelector(
      ".page-hero,.beginner-hero,.creator-dashboard-hero,.account-v2-hero,.widget-studio-hero,.stream-studio-hero,.auth-entry-hero,.auth-recovery-hero"
    );

    const strip = document.createElement("section");
    strip.className = "cfs-help-strip";
    strip.setAttribute("aria-label","Hilfe zu dieser Seite");

    const icon = document.createElement("span");
    icon.className = "cfs-help-strip-icon";
    icon.textContent = "?";

    const copy = document.createElement("div");
    copy.className = "cfs-help-strip-copy";
    const strong = document.createElement("strong");
    strong.textContent = cfg.title;
    const p = document.createElement("p");
    p.textContent = cfg.copy;
    copy.append(strong,p);

    const actions = document.createElement("div");
    actions.className = "cfs-help-strip-actions";

    cfg.topics.slice(0,3).forEach((topicKey,index) => {
      const topic = TOPICS[topicKey];
      if (!topic) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cfs-help-mini${index === 0 ? " primary" : ""}`;
      button.textContent = index === 0 ? "HILFE ÖFFNEN" : topic.title.toUpperCase();
      button.addEventListener("click", () => open(topicKey));
      actions.appendChild(button);
    });

    strip.append(icon,copy,actions);

    if (hero) hero.insertAdjacentElement("afterend",strip);
    else main.prepend(strip);
  }

  function installFieldHelp() {
    for (const [id,topic] of Object.entries(FIELD_HELP)) {
      const input = document.getElementById(id);
      if (!input) continue;

      const field = input.closest(".field,label");
      if (!field || field.querySelector(`[data-cfs-field-help="${id}"]`)) continue;

      field.classList.add("cfs-help-field");
      const button = helpButton(topic);
      button.dataset.cfsFieldHelp = id;
      field.appendChild(button);
    }

    if (path === "/pages/tiktok.html") {
      const connect = document.getElementById("ttConnect");
      if (connect && !connect.parentElement?.querySelector("[data-cfs-tiktok-help]")) {
        const button = helpButton("tiktok","WIE FUNKTIONIERT DAS?");
        button.dataset.cfsTiktokHelp = "1";
        connect.insertAdjacentElement("afterend",button);
      }
    }

    if (path === "/pages/widget-studio.html") {
      const target = document.getElementById("wsSimpleStepTitle") || document.getElementById("wsApp");
      if (target && !document.querySelector("[data-cfs-widget-help]")) {
        const button = helpButton("widgets","ERSTES WIDGET?");
        button.dataset.cfsWidgetHelp = "1";
        target.insertAdjacentElement("afterend",button);
      }
    }

    if (path === "/pages/stream-studio.html") {
      const target = document.getElementById("live-workspace") || document.querySelector("main");
      if (target && !document.querySelector("[data-cfs-stream-help]")) {
        const note = document.createElement("div");
        note.className = "cfs-help-inline-note";
        note.dataset.cfsStreamHelp = "1";
        note.textContent = "Neu im Stream Studio? Öffne die Hilfe und baue Szene → Quellen → Vorschau → Ausgabe nacheinander auf.";
        const button = helpButton("stream","STREAM-HILFE");
        note.append(" ",button);
        target.insertAdjacentElement("beforebegin",note);
      }
    }
  }

  function detectNoticeTopic(text) {
    const normalized = String(text || "").toLowerCase();
    if (!normalized) return null;

    const looksLikeError =
      /\b(fehler|fehlgeschlagen|ungültig|unzulässig|nicht möglich|nicht gefunden|abgebrochen|error|failed|invalid|denied)\b/i.test(normalized)
      || /\b40[0139]\b|\b429\b|\b50[0234]\b/.test(normalized);

    if (!looksLikeError) return null;

    for (const hint of NOTICE_HINTS) {
      if (hint.match.some(word => normalized.includes(word))) return hint;
    }

    return { topic:"support", title:"Was kann ich jetzt tun?" };
  }

  function attachNextHelp(node, hint) {
    if (!node || node.dataset.cfsHelpNext === "1") return;
    node.dataset.cfsHelpNext = "1";

    const box = document.createElement("div");
    box.className = "cfs-help-next";
    box.innerHTML = `
      <span class="cfs-help-next-icon">?</span>
      <div class="cfs-help-next-copy">
        <strong></strong>
        <span>Öffne die passende Erklärung, bevor du Werte oder Sicherheitseinstellungen mehrfach änderst.</span>
      </div>`;

    box.querySelector("strong").textContent = hint.title;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cfs-help-mini";
    button.textContent = "HILFE";
    button.addEventListener("click", () => open(hint.topic));
    box.appendChild(button);

    node.insertAdjacentElement("afterend",box);
  }

  function scanNotices(root = document) {
    const selectors = [
      ".notice",
      "[role='status']",
      "[data-support-status]",
      "#wsMessage",
      "#connectResult",
      "#message"
    ];

    root.querySelectorAll?.(selectors.join(",")).forEach(node => {
      if (node.closest(".cfs-help-next")) return;
      const hint = detectNoticeTopic(node.textContent);
      if (hint) attachNextHelp(node,hint);
    });
  }

  function observeNotices() {
    scanNotices();

    const observer = new MutationObserver(records => {
      for (const record of records) {
        const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
        if (!target) continue;

        const candidate = target.closest?.(".notice,[role='status'],[data-support-status],#wsMessage,#connectResult,#message");
        if (candidate) {
          const hint = detectNoticeTopic(candidate.textContent);
          if (hint) attachNextHelp(candidate,hint);
        }

        for (const added of record.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) scanNotices(added);
        }
      }
    });

    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  function wireGlobalTriggers() {
    document.addEventListener("click", event => {
      const openTrigger = event.target.closest?.("[data-cfs-help-topic]");
      if (openTrigger) {
        event.preventDefault();
        open(openTrigger.dataset.cfsHelpTopic || "");
      }
    });

    document.addEventListener("cfs:help-open", event => {
      open(event.detail?.topic || "");
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && drawer && !drawer.hidden) close();
    });
  }

  function init() {
    if (path.includes("/admin-") || document.body.dataset.cfsHelp === "off") return;

    createDrawer();
    insertPageStrip();
    installFieldHelp();
    observeNotices();
    wireGlobalTriggers();
  }

  window.CFSHelpV6 = Object.freeze({
    open,
    close,
    topics:Object.keys(TOPICS)
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

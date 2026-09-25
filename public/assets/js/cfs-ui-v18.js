"use strict";

/* =========================================================
   cfs_zockt · Consolidated UI Bundle v18
   Bundles v5-v17 in deterministic execution order.
   ========================================================= */


/* ===== BEGIN CONSOLIDATED LAYER CFS-GUIDE-V5 ===== */


(() => {
  "use strict";

  const MARK = "/assets/img/brand/cfs-zockt-mark-original.png";
  const SEEN_KEY = "cfs_guide_v5_seen";
  const OPEN_KEY = "cfs_guide_v5_open";
  const MAX_MESSAGES = 20;

  const path = location.pathname.toLowerCase();

  const pageContext = {
    "/": ["Willkommen bei cfs_zockt", "Ich zeige dir, was die Creator Suite kann und wie du kostenlos startest."],
    "/index.html": ["Willkommen bei cfs_zockt", "Ich zeige dir, was die Creator Suite kann und wie du kostenlos startest."],
    "/pages/login.html": ["Account starten", "Ich helfe bei Registrierung, Login und E-Mail-Bestätigung."],
    "/pages/verify-email.html": ["E-Mail bestätigen", "Ich helfe dir, den Bestätigungslink anzufordern und danach weiterzumachen."],
    "/pages/forgot-password.html": ["Passwort wiederherstellen", "Ich führe dich durch den sicheren Recovery-Ablauf."],
    "/pages/reset-password.html": ["Neues Passwort setzen", "Hier kannst du deinen Zugang sicher wiederherstellen."],
    "/pages/dashboard.html": ["Creator Dashboard", "Hier findest du deinen nächsten sinnvollen Schritt und deine wichtigsten Tools."],
    "/pages/account.html": ["Account & Sicherheit", "Ich helfe bei Passkeys, 2FA, Sitzungen und Account-Einstellungen."],
    "/pages/widget-studio.html": ["Widget Studio", "Ich helfe dir, dein erstes Widget zu bauen und für den Stream vorzubereiten."],
    "/pages/stream-studio.html": ["Stream Studio", "Ich helfe bei Szenen, Quellen und deinem Stream-Workflow."],
    "/pages/tiktok.html": ["TikTok", "Ich erkläre Verbindung, Status und typische TikTok-Schritte."],
    "/pages/integrations.html": ["Integrationen", "Ich helfe dir, externe Dienste sauber zu verbinden."],
    "/pages/launcher.html": ["CFS Launcher", "Ich führe dich durch Download, Verbindung und Desktop-Bridge."],
    "/pages/launcher-connect.html": ["Gerät verbinden", "Ich helfe beim sicheren Device-Link zwischen Browser und Launcher."],
    "/pages/setup.html": ["Grundsetup", "Ich helfe dir, die wichtigsten Creator-Einstellungen einmal sauber festzulegen."],
    "/pages/settings.html": ["Einstellungen", "Ich erkläre dir die wichtigsten Optionen und was du wirklich ändern musst."],
    "/pages/games.html": ["Creator Games", "Ich zeige dir, wie interaktive Spiele in deinen Workflow passen."],
    "/pages/nexus.html": ["NEXUS", "Ich erkläre dir den aktuellen NEXUS-Bereich und seine Möglichkeiten."],
    "/pages/audio-studio.html": ["Audio Studio", "Ich helfe dir, den Audio-Bereich einzuordnen und verfügbare Funktionen zu finden."],
    "/pages/cut-studio.html": ["Cut Studio", "Ich helfe bei Clips, Aufnahmen und dem Cut-Workflow."],
    "/pages/scene-studio.html": ["Scene Studio", "Ich helfe dir, Szenen übersichtlich aufzubauen."],
    "/pages/editor.html": ["Creator Editor", "Ich helfe dir, Creator-Inhalte und Layouts zu bearbeiten."],
    "/pages/plans.html": ["Pläne", "Ich erkläre FREE, CREATOR und PRO ohne versteckte automatische Upgrades."],
    "/pages/support.html": ["Support", "Ich helfe dir, den richtigen Support-Weg für dein Problem zu finden."],
    "/pages/security.html": ["Sicherheit", "Ich erkläre die wichtigsten Schutzmechanismen von cfs_zockt."],
    "/pages/creator-suite.html": ["Creator Suite", "Ich zeige dir, welche Module für deinen Workflow relevant sind."]
  };

  const faq = [
    {
      keys:["start","anfang","beginnen","loslegen","erste schritte","neu"],
      answer:"Für einen sauberen Start reichen vier Dinge: E-Mail bestätigen, Account mit Passkey oder 2FA absichern, Grundsetup speichern und ein erstes Widget anlegen.",
      actions:[["Dashboard öffnen","/pages/dashboard.html","primary"],["Grundsetup","/pages/setup.html",""]]
    },
    {
      keys:["passkey","webauthn","windows hello","sicherheitsschlüssel"],
      answer:"Ein Passkey ist die einfachste starke Anmeldung. Öffne Account → Sicherheit → Passkeys und füge dort deinen Browser, Windows Hello oder einen Sicherheitsschlüssel hinzu.",
      actions:[["Passkeys öffnen","/pages/account.html#account-security","primary"]]
    },
    {
      keys:["2fa","totp","authenticator","recovery code","recovery-code"],
      answer:"Unter Account → Sicherheit kannst du eine Authenticator-App einrichten. Recovery-Codes sind Einmalcodes und sollten sicher außerhalb des Browsers gespeichert werden.",
      actions:[["2FA öffnen","/pages/account.html#account-security","primary"]]
    },
    {
      keys:["widget","follower goal","overlay"],
      answer:"Für den Einstieg brauchst du TikTok noch nicht. Öffne das Widget Studio, erstelle ein einfaches Widget und teste zuerst die Vorschau.",
      actions:[["Widget Studio","/pages/widget-studio.html","primary"]]
    },
    {
      keys:["tiktok","oauth","live"],
      answer:"TikTok ist optional für den Grundstart. Verbinde es erst, wenn Account, Sicherheit und dein erstes Widget sauber eingerichtet sind.",
      actions:[["TikTok öffnen","/pages/tiktok.html","primary"],["Integrationen","/pages/integrations.html",""]]
    },
    {
      keys:["launcher","desktop","gerät","device"],
      answer:"Der CFS Launcher verbindet Desktop-Funktionen mit deinem Account. Für normale Website- und Widget-Funktionen musst du ihn nicht sofort installieren.",
      actions:[["Launcher öffnen","/pages/launcher.html","primary"]]
    },
    {
      keys:["stream","obs","szene","scene"],
      answer:"Für deinen Stream-Workflow baust du zuerst Widgets und Szenen. Danach öffnest du das Stream Studio, um Quellen und Ausgabe zusammenzuführen.",
      actions:[["Stream Studio","/pages/stream-studio.html","primary"],["Scene Studio","/pages/scene-studio.html",""]]
    },
    {
      keys:["plan","free","creator","pro","preis","kosten"],
      answer:"Du kannst mit FREE starten. CREATOR und PRO schalten zusätzliche Module frei. Einen Planwechsel solltest du nur vornehmen, wenn du die zusätzlichen Funktionen wirklich brauchst.",
      actions:[["Pläne ansehen","/pages/plans.html","primary"]]
    },
    {
      keys:["email","e-mail","bestätigen","verifizierung","verification"],
      answer:"Fordere auf der Bestätigungsseite einen Link an, prüfe auch Spam/Junk und öffne immer nur den neuesten Link. Nach erfolgreicher Bestätigung kannst du dich direkt anmelden.",
      actions:[["E-Mail bestätigen","/pages/verify-email.html","primary"]]
    },
    {
      keys:["passwort","password","vergessen","recovery"],
      answer:"Nutze für verlorene Passwörter ausschließlich den offiziellen Recovery-Ablauf. Recovery-Links laufen ab und sollten nicht weitergegeben werden.",
      actions:[["Passwort-Recovery","/pages/forgot-password.html","primary"]]
    },
    {
      keys:["hilfe-center","hilfecenter","hilfe center","warum"],
      answer:"Im Hilfe-Center findest du kurze Erklärungen zu den wichtigsten Funktionen und jeweils sichere nächste Schritte. Es ist direkt in die Website integriert.",
      actions:[["Hilfe-Center öffnen","help:start","primary"],["Support","/pages/support.html",""]]
    },
    {
      keys:["support","hilfe","problem","fehler","funktioniert nicht"],
      answer:"Wenn ein Schritt nicht funktioniert, prüfe zuerst die sichtbare Fehlermeldung und den Status der betroffenen Funktion. Für technische Probleme kannst du anschließend den Support-Bereich öffnen.",
      actions:[["Support öffnen","/pages/support.html","primary"],["Systemstatus","/api/public/status",""]]
    }
  ];

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu,"")
      .trim();
  }

  function currentContext() {
    return pageContext[path] || ["CFS Guide", "Frag mich nach dem nächsten Schritt oder nach einer Funktion dieser Seite."];
  }

  function root() {
    let host = document.getElementById("cfsGuideRoot");
    if (host) return host;

    host = document.createElement("div");
    host.id = "cfsGuideRoot";
    host.innerHTML = `
      <button class="cfs-guide-launcher" id="cfsGuideLauncher" type="button" aria-controls="cfsGuidePanel" aria-expanded="false">
        <span class="cfs-guide-launcher-wrap">
          <span class="cfs-guide-launcher-mark"><img src="${MARK}" alt=""></span>
          <span class="cfs-guide-badge" id="cfsGuideBadge" hidden>1</span>
        </span>
        <span class="cfs-guide-launcher-copy"><strong>CFS Guide</strong><small>Hilfe & nächste Schritte</small></span>
      </button>

      <section class="cfs-guide-panel" id="cfsGuidePanel" role="dialog" aria-label="CFS Guide" hidden>
        <header class="cfs-guide-head">
          <span class="cfs-guide-head-mark"><img src="${MARK}" alt=""></span>
          <div class="cfs-guide-head-copy">
            <strong>CFS Guide</strong>
            <span><i class="cfs-guide-online-dot"></i> Lokaler Creator-Assistent</span>
          </div>
          <button class="cfs-guide-close" id="cfsGuideClose" type="button" aria-label="CFS Guide schließen">×</button>
        </header>

        <div class="cfs-guide-body" id="cfsGuideBody">
          <div class="cfs-guide-context">
            <span>DU BIST HIER</span>
            <strong id="cfsGuideContextTitle"></strong>
            <p id="cfsGuideContextCopy"></p>
          </div>
          <div class="cfs-guide-messages" id="cfsGuideMessages" aria-live="polite"></div>
        </div>

        <footer class="cfs-guide-footer">
          <div class="cfs-guide-suggestions" id="cfsGuideSuggestions"></div>
          <form class="cfs-guide-form" id="cfsGuideForm">
            <input class="cfs-guide-input" id="cfsGuideInput" type="text" maxlength="240" autocomplete="off" placeholder="Was möchtest du machen?">
            <button class="cfs-guide-send" id="cfsGuideSend" type="submit" aria-label="Nachricht senden">↑</button>
          </form>
          <div class="cfs-guide-footnote">Der CFS Guide arbeitet lokal im Browser und erhält keine Passwörter, Tokens oder Secrets.</div>
        </footer>
      </section>`;
    document.body.appendChild(host);
    return host;
  }

  function addMessage(text, who = "guide", actions = []) {
    const list = document.getElementById("cfsGuideMessages");
    if (!list) return;

    while (list.children.length >= MAX_MESSAGES) {
      list.firstElementChild?.remove();
    }

    const wrap = document.createElement("div");
    wrap.className = `cfs-guide-message ${who}`;
    wrap.textContent = text;

    if (actions.length) {
      const actionsNode = document.createElement("div");
      actionsNode.className = "cfs-guide-actions";
      for (const [label, href, style] of actions) {
        if (String(href).startsWith("help:")) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `cfs-guide-chip${style === "primary" ? " primary" : ""}`;
          button.textContent = label;
          button.addEventListener("click", () => {
            const topic = String(href).slice(5);
            if (window.CFSHelpV6?.open) window.CFSHelpV6.open(topic);
            else document.dispatchEvent(new CustomEvent("cfs:help-open",{detail:{topic}}));
          });
          actionsNode.appendChild(button);
          continue;
        }

        const a = document.createElement("a");
        a.className = `cfs-guide-chip${style === "primary" ? " primary" : ""}`;
        a.href = href;
        a.textContent = label;
        actionsNode.appendChild(a);
      }
      wrap.appendChild(actionsNode);
    }

    list.appendChild(wrap);
    const body = document.getElementById("cfsGuideBody");
    if (body) body.scrollTop = body.scrollHeight;
  }

  function setSuggestions(items) {
    const node = document.getElementById("cfsGuideSuggestions");
    if (!node) return;
    node.replaceChildren();

    for (const text of items.slice(0,4)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cfs-guide-suggestion";
      button.textContent = text;
      button.addEventListener("click", () => respond(text, true));
      node.appendChild(button);
    }
  }

  async function safeJson(url) {
    try {
      if (window.CFS?.json) return await window.CFS.json(url);
      const response = await fetch(url, { credentials:"same-origin", headers:{Accept:"application/json"} });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function accountAdvice() {
    if (!window.CFS?.me) return null;
    let me;
    try { me = await window.CFS.me(); } catch { return null; }
    if (!me?.authenticated || !me?.account) return null;

    const [passkeys,mfa] = await Promise.all([
      safeJson("/api/account/passkeys"),
      safeJson("/api/account/mfa")
    ]);

    const emailVerified = Boolean(me.account.email_verified);
    const passkeyCount = Array.isArray(passkeys?.passkeys) ? passkeys.passkeys.length : 0;
    const mfaEnabled = Boolean(mfa?.enabled);

    if (!emailVerified) {
      return {
        text:"Dein Account ist angemeldet, aber die E-Mail-Adresse ist noch nicht bestätigt. Das ist dein sinnvollster nächster Schritt.",
        actions:[["E-Mail bestätigen","/pages/verify-email.html","primary"]]
      };
    }

    if (passkeyCount === 0 && !mfaEnabled) {
      return {
        text:"Deine E-Mail ist bestätigt. Als Nächstes solltest du den Account mit einem Passkey oder einer Authenticator-App absichern.",
        actions:[["Sicherheit öffnen","/pages/account.html#account-security","primary"]]
      };
    }

    return {
      text:`Dein Grundschutz sieht gut aus${passkeyCount ? `: ${passkeyCount} Passkey${passkeyCount === 1 ? "" : "s"}` : ""}${mfaEnabled ? `${passkeyCount ? " und " : ": "}2FA aktiv` : ""}. Frag mich nach Widgets, Stream, TikTok oder Launcher.`,
      actions:[["Dashboard","/pages/dashboard.html","primary"],["Widget Studio","/pages/widget-studio.html",""]]
    };
  }

  function pageSpecificReply() {
    if (path === "/pages/dashboard.html") {
      return {
        text:"Im Dashboard solltest du zuerst den Bereich „Erste Schritte“ abarbeiten. Dort siehst du genau einen offenen nächsten Schritt.",
        actions:[["Zum Startcheck","#","primary"],["Widget Studio","/pages/widget-studio.html",""]]
      };
    }

    if (path === "/pages/account.html") {
      return {
        text:"Für einen neuen Account sind zuerst E-Mail-Verifizierung und ein Passkey oder 2FA wichtig. Sitzungen und erweiterte Funktionen kannst du danach prüfen.",
        actions:[["Sicherheit","/pages/account.html#account-security","primary"],["Sitzungen","/pages/account.html#account-sessions",""]]
      };
    }

    if (path === "/pages/login.html") {
      return {
        text:"Neu hier? Registriere zuerst deinen Creator-Account. Danach bestätigst du die E-Mail und meldest dich an.",
        actions:[["Registrierung","#regForm","primary"],["E-Mail bestätigen","/pages/verify-email.html",""]]
      };
    }

    if (path === "/pages/widget-studio.html") {
      return {
        text:"Starte mit einem einfachen Widget und prüfe zuerst die Vorschau. Eine TikTok-Verbindung ist dafür nicht zwingend nötig.",
        actions:[["Dashboard","/pages/dashboard.html",""],["Setup","/pages/setup.html",""]]
      };
    }

    return null;
  }

  function fallbackReply(query) {
    const [title] = currentContext();
    return {
      text:`Dazu habe ich aktuell keine freie Textantwort. Im integrierten Hilfe-Center findest du die wichtigsten Abläufe und sichere nächste Schritte für „${title}“.`,
      actions:[["Hilfe-Center","help:start","primary"],["Support öffnen","/pages/support.html",""]]
    };
  }

  async function findReply(raw) {
    const query = normalize(raw);

    if (!query || ["hilfe","help","was nun","was jetzt","weiter","nachster schritt","nächster schritt"].includes(query)) {
      return (await accountAdvice()) || pageSpecificReply() || {
        text:"Sag mir, was du erreichen möchtest. Ich kann dich z. B. bei Account-Start, Sicherheit, Widgets, TikTok, Launcher oder Stream unterstützen.",
        actions:[["Kostenlos starten","/pages/login.html#regForm","primary"],["Creator Suite","/pages/creator-suite.html",""]]
      };
    }

    for (const item of faq) {
      if (item.keys.some(key => query.includes(normalize(key)))) {
        return { text:item.answer, actions:item.actions };
      }
    }

    if (query.includes("wo bin") || query.includes("diese seite") || query.includes("hier machen")) {
      const [title,copy] = currentContext();
      return { text:`Du bist bei „${title}“. ${copy}`, actions:[] };
    }

    return fallbackReply(query);
  }

  async function respond(raw, fromSuggestion = false) {
    const value = String(raw || "").trim();
    if (!value) return;

    if (!fromSuggestion) addMessage(value, "user");

    const reply = await findReply(value);
    addMessage(reply.text, "guide", reply.actions || []);
  }

  async function welcome() {
    const [title,copy] = currentContext();
    document.getElementById("cfsGuideContextTitle").textContent = title;
    document.getElementById("cfsGuideContextCopy").textContent = copy;

    const advice = await accountAdvice();
    if (advice && path.startsWith("/pages/")) {
      addMessage(`Willkommen beim CFS Guide. ${advice.text}`, "guide", advice.actions);
    } else {
      addMessage(`Willkommen beim CFS Guide. ${copy}`, "guide");
    }

    const suggestions = path.includes("account")
      ? ["Nächster Schritt","Passkey einrichten","2FA erklären","Hilfe-Center"]
      : path.includes("widget")
        ? ["Erstes Widget","Nächster Schritt","TikTok nötig?","Hilfe-Center"]
        : ["Nächster Schritt","Wie starte ich?","Hilfe-Center","Support"];

    setSuggestions(suggestions);
  }

  function setOpen(open, { focus = true } = {}) {
    const panel = document.getElementById("cfsGuidePanel");
    const launcher = document.getElementById("cfsGuideLauncher");
    const badge = document.getElementById("cfsGuideBadge");
    if (!panel || !launcher) return;

    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (badge) badge.hidden = true;

    try { sessionStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch {}

    if (open && focus) {
      setTimeout(() => document.getElementById("cfsGuideInput")?.focus(), 30);
    }
  }

  function init() {
    // Avoid admin-only surfaces and embedded utility pages.
    if (path.includes("/admin-") || document.body.dataset.cfsGuide === "off") return;

    root();

    document.getElementById("cfsGuideLauncher")?.addEventListener("click", () => {
      const panel = document.getElementById("cfsGuidePanel");
      setOpen(Boolean(panel?.hidden));
    });

    document.getElementById("cfsGuideClose")?.addEventListener("click", () => setOpen(false));

    document.getElementById("cfsGuideForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const input = document.getElementById("cfsGuideInput");
      const value = input?.value || "";
      if (!value.trim()) return;
      if (input) input.value = "";
      respond(value);
    });

    welcome();

    let seen = false;
    let rememberedOpen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
      rememberedOpen = sessionStorage.getItem(OPEN_KEY) === "1";
    } catch {}

    if (rememberedOpen) {
      setOpen(true, { focus:false });
    } else if (!seen && path === "/pages/dashboard.html") {
      // One gentle first-run introduction on the dashboard only.
      setTimeout(() => {
        setOpen(true, { focus:false });
        try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
      }, 850);
    } else {
      const badge = document.getElementById("cfsGuideBadge");
      if (!seen && badge) badge.hidden = false;
      try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    }

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !document.getElementById("cfsGuidePanel")?.hidden) {
        setOpen(false);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-GUIDE-V5 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-HELP-V6 ===== */


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

/* ===== END CONSOLIDATED LAYER CFS-HELP-V6 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-EMPTY-V7 ===== */


(() => {
  "use strict";

  const path = location.pathname.toLowerCase();
  let scheduled = false;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function stateMarkup({
    kicker = "ERSTER SCHRITT",
    title,
    text,
    icon = "＋",
    positive = false,
    compact = false,
    steps = [],
    actions = []
  }) {
    const className = `cfs-empty-state${positive ? " positive" : ""}${compact ? " compact" : ""}`;

    const stepHtml = steps.length
      ? `<div class="cfs-empty-steps">${steps.map((step,index) => `
          <div class="cfs-empty-step">
            <b>${String(index + 1).padStart(2,"0")}</b>
            <strong>${esc(step[0])}</strong>
            <span>${esc(step[1])}</span>
          </div>`).join("")}</div>`
      : "";

    const actionHtml = actions.length
      ? `<div class="cfs-empty-actions">${actions.map(action => {
          const cls = `cfs-empty-action${action.primary ? " primary" : ""}`;
          if (action.href) {
            return `<a class="${cls}" href="${esc(action.href)}">${esc(action.label)}</a>`;
          }
          if (action.help) {
            return `<button class="${cls}" type="button" data-cfs-v7-help="${esc(action.help)}">${esc(action.label)}</button>`;
          }
          if (action.click) {
            return `<button class="${cls}" type="button" data-cfs-v7-click="${esc(action.click)}">${esc(action.label)}</button>`;
          }
          if (action.focus) {
            return `<button class="${cls}" type="button" data-cfs-v7-focus="${esc(action.focus)}">${esc(action.label)}</button>`;
          }
          return "";
        }).join("")}</div>`
      : "";

    return `
      <div class="${className}">
        <div class="cfs-empty-state-head">
          <span class="cfs-empty-state-icon">${esc(icon)}</span>
          <div class="cfs-empty-state-copy">
            <span class="cfs-empty-state-kicker">${esc(kicker)}</span>
            <h3>${esc(title)}</h3>
            <p>${esc(text)}</p>
          </div>
        </div>
        ${stepHtml}
        ${actionHtml}
      </div>`;
  }

  function openHelp(topic) {
    if (window.CFSHelpV6?.open) {
      window.CFSHelpV6.open(topic);
      return;
    }
    document.dispatchEvent(new CustomEvent("cfs:help-open",{detail:{topic}}));
  }

  function clickSelector(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    target.click();
    target.scrollIntoView?.({behavior:"smooth",block:"center"});
  }

  function focusId(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView?.({behavior:"smooth",block:"center"});
    setTimeout(() => target.focus?.({preventScroll:true}),250);
  }

  function wireActions() {
    if (document.documentElement.dataset.cfsV7Wired === "1") return;
    document.documentElement.dataset.cfsV7Wired = "1";

    document.addEventListener("click", event => {
      const help = event.target.closest?.("[data-cfs-v7-help]");
      if (help) {
        event.preventDefault();
        openHelp(help.dataset.cfsV7Help);
        return;
      }

      const click = event.target.closest?.("[data-cfs-v7-click]");
      if (click) {
        event.preventDefault();
        clickSelector(click.dataset.cfsV7Click);
        return;
      }

      const focus = event.target.closest?.("[data-cfs-v7-focus]");
      if (focus) {
        event.preventDefault();
        focusId(focus.dataset.cfsV7Focus);
      }
    });
  }

  function enhanceWidgetEmpty() {
    if (path !== "/pages/widget-studio.html") return;
    const empty = document.getElementById("wsEmpty");
    if (!empty || empty.hidden || empty.querySelector(".cfs-empty-state")) return;

    empty.classList.add("cfs-v7-upgraded");
    empty.innerHTML = stateMarkup({
      kicker:"DEIN ERSTES WIDGET",
      title:"Starte klein – in wenigen Minuten zur ersten Vorschau.",
      text:"Du brauchst weder TikTok noch den Launcher für dein erstes Widget. Erstelle zuerst ein Widget, teste es mit Beispieldaten und veröffentliche erst danach.",
      icon:"▦",
      steps:[
        ["Widget wählen","Starte mit Goal, Text, Timer oder einem einfachen Overlay."],
        ["Vorschau testen","Nutze Beispieldaten und prüfe Design und Lesbarkeit."],
        ["Veröffentlichen","Erst wenn alles passt, das Widget für deinen Stream freigeben."]
      ],
      actions:[
        {label:"ERSTES WIDGET ERSTELLEN",click:'[data-action="open-create"]',primary:true},
        {label:"WIDGET-HILFE",help:"widgets"}
      ]
    });
  }

  function enhanceTikTok() {
    if (path !== "/pages/tiktok.html") return;

    const status = document.getElementById("ttStatus");
    const text = document.getElementById("ttText");
    const connect = document.getElementById("ttConnect");
    if (!status || !text || !connect) return;

    const card = status.closest(".card");
    if (!card) return;

    const connected = String(status.textContent || "").trim().toUpperCase() === "VERBUNDEN";
    let host = card.querySelector("[data-cfs-v7-tiktok-state]");

    if (connected) {
      host?.remove();
      card.classList.add("cfs-v7-connected");
      return;
    }

    if (!connect.hidden && !host && String(status.textContent || "").trim().toUpperCase() === "OFFLINE") {
      host = document.createElement("div");
      host.className = "cfs-first-use-inline";
      host.dataset.cfsV7TiktokState = "1";
      host.innerHTML = stateMarkup({
        kicker:"OPTIONAL FÜR DEN START",
        title:"TikTok ist noch nicht verbunden – das ist okay.",
        text:"Du kannst Account, Setup und normale Widgets bereits ohne TikTok verwenden. Verbinde TikTok erst, wenn du Profilwerte oder TikTok-Funktionen brauchst.",
        icon:"♪",
        compact:true,
        actions:[
          {label:"TIKTOK VERBINDEN",href:"/auth/creator/tiktok",primary:true},
          {label:"ERSTES WIDGET OHNE TIKTOK",href:"/pages/widget-studio.html"},
          {label:"WARUM VERBINDEN?",help:"tiktok"}
        ]
      });
      card.appendChild(host);
    }
  }

  function enhanceIntegrations() {
    if (path !== "/pages/integrations.html") return;

    const status = document.getElementById("ttStatus");
    const text = document.getElementById("ttText");
    if (!status || !text) return;

    const card = status.closest(".management-summary-card");
    if (!card) return;

    const connected = String(status.textContent || "").trim().toUpperCase() === "VERBUNDEN";
    const existing = card.querySelector("[data-cfs-v7-integrations-state]");

    if (connected) {
      existing?.remove();
      return;
    }

    if (!existing && String(status.textContent || "").trim().toUpperCase() === "OFFLINE") {
      const host = document.createElement("div");
      host.className = "cfs-first-use-inline";
      host.dataset.cfsV7IntegrationsState = "1";
      host.innerHTML = stateMarkup({
        kicker:"NOCH KEINE VERBINDUNG",
        title:"Verbinde nur, was du wirklich brauchst.",
        text:"TikTok und Launcher sind optionale Erweiterungen. Für deinen ersten Website- und Widget-Start musst du nicht alle Integrationen gleichzeitig einrichten.",
        icon:"↗",
        compact:true,
        actions:[
          {label:"TIKTOK HUB",href:"/pages/tiktok.html",primary:true},
          {label:"WIDGET STUDIO",href:"/pages/widget-studio.html"},
          {label:"INTEGRATIONS-HILFE",help:"integrations"}
        ]
      });
      card.appendChild(host);
    }
  }

  function enhanceLauncherDevices() {
    if (path !== "/pages/launcher.html") return;
    const grid = document.getElementById("deviceGrid");
    if (!grid || grid.querySelector(".cfs-empty-state")) return;

    const text = String(grid.textContent || "").trim().toLowerCase();
    if (!text.includes("noch kein launcher") && !text.includes("kein launcher")) return;

    grid.innerHTML = stateMarkup({
      kicker:"NOCH KEIN PC VERBUNDEN",
      title:"Verbinde den Launcher erst, wenn du Desktop-Funktionen brauchst.",
      text:"Normale Account-, Setup- und Basis-Widget-Funktionen laufen auch ohne Launcher. Für LIVE-Bridge und Desktop-Funktionen installierst du den Launcher und bestätigst anschließend den Device-Link.",
      icon:"▣",
      steps:[
        ["Launcher laden","Verwende nur den auf dieser Seite angebotenen Release."],
        ["Device-Link starten","Im Launcher einen Verbindungscode erzeugen."],
        ["Code bestätigen","Gerätename und Account vor der Freigabe prüfen."]
      ],
      actions:[
        {label:"WINDOWS SETUP LADEN",click:"#heroDownload",primary:true},
        {label:"GERÄT VERBINDEN",href:"/pages/launcher-connect.html"},
        {label:"SPÄTER · ZU WIDGETS",href:"/pages/widget-studio.html"},
        {label:"LAUNCHER-HILFE",help:"launcher"}
      ]
    });

    const download = grid.querySelector('[data-cfs-v7-click="#heroDownload"]');
    const heroDownload = document.getElementById("heroDownload");
    if (download && heroDownload?.disabled) {
      download.disabled = true;
      download.textContent = "RELEASE WIRD GEPRÜFT";
    }
  }

  function syncLauncherDownloadButton() {
    if (path !== "/pages/launcher.html") return;
    const button = document.querySelector('#deviceGrid [data-cfs-v7-click="#heroDownload"]');
    const hero = document.getElementById("heroDownload");
    if (!button || !hero) return;
    button.disabled = Boolean(hero.disabled);
    button.textContent = hero.disabled ? "RELEASE WIRD GEPRÜFT" : "WINDOWS SETUP LADEN";
  }

  function enhanceAccountPasskeys() {
    if (path !== "/pages/account.html") return;

    const list = document.getElementById("passkeyList");
    if (list && !list.querySelector(".cfs-empty-state")) {
      const empty = list.querySelector(".activity-empty");
      const text = String(empty?.textContent || "").trim().toLowerCase();
      if (text.includes("noch kein passkey")) {
        list.innerHTML = stateMarkup({
          kicker:"EMPFOHLENER ACCOUNT-SCHUTZ",
          title:"Noch kein Passkey eingerichtet.",
          text:"Ein Passkey ist der einfachste starke Login-Schutz. Windows Hello oder ein Browser-Passkey reichen für den Einstieg.",
          icon:"⌘",
          compact:true,
          actions:[
            {label:"PASSKEY HINZUFÜGEN",focus:"passkeyLabel",primary:true},
            {label:"PASSKEY ERKLÄREN",help:"passkey"}
          ]
        });
      }
    }
  }

  function enhanceAccountSessions() {
    if (path !== "/pages/account.html") return;
    const list = document.getElementById("sessionList");
    if (!list || list.querySelector(".cfs-empty-state")) return;

    const empty = list.querySelector(".activity-empty");
    const text = String(empty?.textContent || "").trim().toLowerCase();
    if (!empty || (!text.includes("keine") && !text.includes("noch keine"))) return;

    list.innerHTML = stateMarkup({
      kicker:"SITZUNGEN",
      title:"Aktuell werden keine weiteren Sitzungen angezeigt.",
      text:"Sobald zusätzliche Browser- oder Geräte-Sitzungen vorhanden sind, kannst du sie hier einzeln prüfen und widerrufen.",
      icon:"✓",
      positive:true,
      compact:true,
      actions:[
        {label:"SITZUNGEN VERSTEHEN",help:"sessions"}
      ]
    });
  }

  function enhanceSecurityEvents() {
    if (path !== "/pages/account.html") return;
    const list = document.getElementById("securityEventList");
    if (!list || list.querySelector(".cfs-empty-state")) return;

    const empty = list.querySelector(".activity-empty");
    const text = String(empty?.textContent || "").trim().toLowerCase();
    if (!empty || !text.includes("keine sicherheitsereignisse")) return;

    list.innerHTML = stateMarkup({
      kicker:"SICHERHEITSAKTIVITÄT",
      title:"Noch keine gespeicherten Sicherheitsereignisse.",
      text:"Neue relevante Account-Ereignisse erscheinen hier automatisch. Ein leerer Verlauf erfordert keine Aktion.",
      icon:"✓",
      positive:true,
      compact:true,
      actions:[
        {label:"ACCOUNT-SCHUTZ PRÜFEN",href:"/pages/account.html#account-security"}
      ]
    });
  }

  function markSuccessNotices() {
    const positiveWords = [
      "gespeichert",
      "erfolgreich",
      "bestätigt",
      "aktiviert",
      "hinzugefügt",
      "verbunden",
      "synchronisiert",
      "erstellt",
      "aktualisiert",
      "geändert",
      "entfernt",
      "gesendet",
      "unterwegs"
    ];

    const negativeWords = [
      "fehler",
      "fehlgeschlagen",
      "nicht ",
      "ungültig",
      "warn",
      "problem",
      "konnte nicht",
      "unbekannt"
    ];

    document.querySelectorAll(".notice,[role='status']").forEach(node => {
      if (node.classList.contains("danger") || node.classList.contains("error")) {
        node.classList.remove("cfs-success-confirmation");
        return;
      }

      const text = String(node.textContent || "").trim().toLowerCase();
      if (!text) return;

      const positive = positiveWords.some(word => text.includes(word));
      const negative = negativeWords.some(word => text.includes(word));

      node.classList.toggle("cfs-success-confirmation", positive && !negative);
    });
  }

  function enhance() {
    scheduled = false;
    enhanceWidgetEmpty();
    enhanceTikTok();
    enhanceIntegrations();
    enhanceLauncherDevices();
    syncLauncherDownloadButton();
    enhanceAccountPasskeys();
    enhanceAccountSessions();
    enhanceSecurityEvents();
    markSuccessNotices();
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  function init() {
    if (path.includes("/admin-") || document.body.dataset.cfsEmptyStates === "off") return;

    wireActions();
    enhance();

    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:["hidden","class","disabled"]
    });

    // Some status requests complete after page startup.
    setTimeout(scheduleEnhance,350);
    setTimeout(scheduleEnhance,1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-EMPTY-V7 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-NAV-V8 ===== */


(() => {
  "use strict";

  const path = location.pathname.toLowerCase();

  const CREATOR_META = Object.freeze({
    "/pages/dashboard.html": { label:"Dashboard", group:"Creator Suite", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/widget-studio.html": { label:"Widget Studio", group:"Creator Suite", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/stream-studio.html": { label:"Stream Studio", group:"Creator Suite", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/account.html": { label:"Account", group:"Creator Suite", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },

    "/pages/tiktok.html": { label:"TikTok", group:"Verbindungen", parent:"/pages/integrations.html", parentLabel:"Integrationen" },
    "/pages/integrations.html": { label:"Integrationen", group:"Verbindungen", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/launcher.html": { label:"Launcher", group:"Verbindungen", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/launcher-connect.html": { label:"Gerät verbinden", group:"Verbindungen", parent:"/pages/launcher.html", parentLabel:"Launcher" },

    "/pages/scene-studio.html": { label:"Scene Studio", group:"Toolbox", parent:"/pages/stream-studio.html", parentLabel:"Stream Studio" },
    "/pages/editor.html": { label:"Creator Editor", group:"Toolbox", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/cut-studio.html": { label:"Cut Studio", group:"Toolbox", parent:"/pages/stream-studio.html", parentLabel:"Stream Studio" },
    "/pages/audio-studio.html": { label:"Audio Studio", group:"Toolbox", parent:"/pages/stream-studio.html", parentLabel:"Stream Studio" },
    "/pages/games.html": { label:"Games", group:"Toolbox", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/nexus.html": { label:"NEXUS", group:"Toolbox", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },

    "/pages/setup.html": { label:"Grundsetup", group:"System", parent:"/pages/dashboard.html", parentLabel:"Dashboard" },
    "/pages/settings.html": { label:"Einstellungen", group:"System", parent:"/pages/dashboard.html", parentLabel:"Dashboard" }
  });

  const PUBLIC_META = Object.freeze({
    "/pages/creator-suite.html": "Creator Suite",
    "/pages/plans.html": "Pläne",
    "/pages/roadmap.html": "Roadmap",
    "/pages/security.html": "Sicherheit",
    "/pages/support.html": "Support",
    "/pages/login.html": "Account",
    "/pages/verify-email.html": "E-Mail bestätigen",
    "/pages/forgot-password.html": "Passwort wiederherstellen",
    "/pages/reset-password.html": "Neues Passwort",
    "/pages/privacy.html": "Datenschutz",
    "/pages/imprint.html": "Impressum"
  });

  function pathOf(anchor) {
    try {
      return new URL(anchor.href,location.origin).pathname.toLowerCase();
    } catch {
      return "";
    }
  }

  function hrefKey(anchor) {
    try {
      const url = new URL(anchor.href,location.origin);
      return `${url.pathname.toLowerCase()}${url.hash}`;
    } catch {
      return "";
    }
  }

  function findLink(links, pathname, hash = "") {
    return links.find(link => {
      try {
        const url = new URL(link.href,location.origin);
        return url.pathname.toLowerCase() === pathname && (hash ? url.hash === hash : !url.hash);
      } catch {
        return false;
      }
    }) || null;
  }

  function group(title,{wide=false}={}) {
    const details = document.createElement("details");
    details.className = "cfs-nav-v8-group";

    const summary = document.createElement("summary");
    summary.textContent = title;

    const menu = document.createElement("div");
    menu.className = `cfs-nav-v8-menu${wide ? " wide" : ""}`;

    details.append(summary,menu);
    return {details,menu,summary};
  }

  function menuTitle(text) {
    const node = document.createElement("div");
    node.className = "cfs-nav-v8-menu-title";
    node.textContent = text;
    return node;
  }

  function separator() {
    const node = document.createElement("div");
    node.className = "cfs-nav-v8-menu-separator";
    return node;
  }

  function clearActive(nav) {
    nav.querySelectorAll("a.active,a[aria-current='page']").forEach(link => {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    });
    nav.querySelectorAll(".cfs-nav-v8-group.active").forEach(item => item.classList.remove("active"));
  }

  function markPublicActive(nav) {
    clearActive(nav);

    nav.querySelectorAll("a[href]").forEach(link => {
      try {
        const url = new URL(link.href,location.origin);
        if (url.origin !== location.origin) return;

        let active = false;
        if (url.pathname.toLowerCase() === path) {
          if (url.hash) active = url.hash === location.hash;
          else active = true;
        }

        if (active) {
          link.classList.add("active");
          link.setAttribute("aria-current","page");
          link.closest(".cfs-nav-v8-group")?.classList.add("active");
        }
      } catch {}
    });
  }

  function markCreatorActive(nav) {
    clearActive(nav);
    nav.querySelectorAll("a[href]").forEach(link => {
      if (pathOf(link) !== path) return;
      link.classList.add("active");
      link.setAttribute("aria-current","page");
      link.closest(".cfs-nav-v8-group")?.classList.add("active");
    });
  }

  function polishPublicNav() {
    const nav = document.querySelector(".public-nav");
    if (!nav || nav.dataset.cfsNavV8 === "1") return;

    nav.dataset.cfsNavV8 = "1";
    nav.classList.add("cfs-nav-v8");

    const links = Array.from(nav.querySelectorAll(":scope > a"));
    const start = findLink(links,"/");
    const suite = findLink(links,"/pages/creator-suite.html");
    const plans = findLink(links,"/pages/plans.html");
    const support = findLink(links,"/pages/support.html");
    const login = links.find(link => link.hasAttribute("data-login-link")) || findLink(links,"/pages/login.html");
    const register = links.find(link => link.hasAttribute("data-auth-cta")) || null;

    const explore = group("ENTDECKEN",{wide:true});
    explore.menu.append(menuTitle("CREATOR TOOLS"));

    const exploreItems = [
      findLink(links,"/pages/creator-suite.html","#widget-studio"),
      findLink(links,"/pages/creator-suite.html","#games"),
      findLink(links,"/pages/creator-suite.html","#launcher")
    ].filter(Boolean);

    exploreItems.forEach(link => explore.menu.appendChild(link));

    explore.menu.append(separator(),menuTitle("PROJEKT"));
    [
      findLink(links,"/pages/roadmap.html"),
      findLink(links,"/pages/security.html")
    ].filter(Boolean).forEach(link => explore.menu.appendChild(link));

    const accountZone = document.createElement("div");
    accountZone.className = "cfs-nav-v8-account-zone";
    if (login) accountZone.appendChild(login);
    if (register) accountZone.appendChild(register);

    nav.replaceChildren();
    [start,suite,plans,support].filter(Boolean).forEach(link => nav.appendChild(link));
    if (explore.menu.querySelector("a")) nav.appendChild(explore.details);
    if (accountZone.children.length) nav.appendChild(accountZone);

    markPublicActive(nav);
  }

  function collectCreatorLinks(nav) {
    return Array.from(nav.querySelectorAll("a[data-creator-link],a[href]"))
      .filter((link,index,array) => array.indexOf(link) === index);
  }

  function polishCreatorNav() {
    const nav = document.querySelector(".creator-nav");
    if (!nav || nav.dataset.cfsNavV8 === "1") return;

    nav.dataset.cfsNavV8 = "1";
    nav.classList.add("cfs-nav-v8");

    const links = collectCreatorLinks(nav);
    const logout = nav.querySelector(".creator-logout,[data-logout]");

    const byPath = pathname => links.find(link => pathOf(link) === pathname) || null;

    const primary = [
      byPath("/pages/dashboard.html"),
      byPath("/pages/widget-studio.html"),
      byPath("/pages/stream-studio.html"),
      byPath("/pages/account.html")
    ].filter(Boolean);

    const connections = group("VERBINDUNGEN");
    [
      byPath("/pages/tiktok.html"),
      byPath("/pages/integrations.html"),
      byPath("/pages/launcher.html")
    ].filter(Boolean).forEach(link => connections.menu.appendChild(link));

    const toolbox = group("TOOLBOX",{wide:true});
    toolbox.menu.append(menuTitle("CREATOR TOOLS"));
    [
      byPath("/pages/scene-studio.html"),
      byPath("/pages/editor.html"),
      byPath("/pages/cut-studio.html"),
      byPath("/pages/audio-studio.html"),
      byPath("/pages/games.html"),
      byPath("/pages/nexus.html")
    ].filter(Boolean).forEach(link => toolbox.menu.appendChild(link));

    toolbox.menu.append(separator(),menuTitle("SETUP & SYSTEM"));
    [
      byPath("/pages/setup.html"),
      byPath("/pages/settings.html"),
      byPath("/pages/launcher-connect.html")
    ].filter(Boolean).forEach(link => toolbox.menu.appendChild(link));

    toolbox.menu.append(separator(),menuTitle("WECHSELN"));
    const publicSite = links.find(link => {
      try {
        const url = new URL(link.href,location.origin);
        return url.pathname === "/";
      } catch { return false; }
    });
    if (publicSite) toolbox.menu.appendChild(publicSite);

    const admin = document.getElementById("adminCreatorNav");
    if (admin) toolbox.menu.appendChild(admin);

    nav.replaceChildren();
    primary.forEach(link => nav.appendChild(link));
    if (connections.menu.querySelector("a")) nav.appendChild(connections.details);
    if (toolbox.menu.querySelector("a")) nav.appendChild(toolbox.details);

    if (logout) {
      const accountZone = document.createElement("div");
      accountZone.className = "cfs-nav-v8-account-zone";
      accountZone.appendChild(logout);
      nav.appendChild(accountZone);
    }

    markCreatorActive(nav);
  }

  function sidebarSection(text) {
    const label = document.createElement("div");
    label.className = "cfs-sidebar-section-title";
    label.textContent = text;
    return label;
  }

  function repolishSidebar() {
    const aside = document.querySelector(".cfs-global-sidebar");
    if (!aside || aside.dataset.cfsSidebarV8 === "1") return;

    // The account sidebar has a deliberately different information model.
    if (path === "/pages/account.html") {
      aside.dataset.cfsSidebarV8 = "1";
      aside.classList.add("cfs-sidebar-v8");
      return;
    }

    const links = Array.from(aside.querySelectorAll("a.cfs-sidebar-link"));
    const byPath = pathname => links.find(link => pathOf(link) === pathname) || null;
    const mainLabel = aside.querySelector(".cfs-sidebar-label");

    aside.replaceChildren();
    aside.dataset.cfsSidebarV8 = "1";
    aside.classList.add("cfs-sidebar-v8");

    if (mainLabel) {
      mainLabel.textContent = "CREATOR SUITE";
      aside.appendChild(mainLabel);
    }

    aside.appendChild(sidebarSection("ARBEITEN"));
    [
      byPath("/pages/dashboard.html"),
      byPath("/pages/widget-studio.html"),
      byPath("/pages/stream-studio.html"),
      byPath("/pages/account.html")
    ].filter(Boolean).forEach(link => aside.appendChild(link));

    aside.appendChild(sidebarSection("VERBINDUNGEN"));
    [
      byPath("/pages/tiktok.html"),
      byPath("/pages/integrations.html"),
      byPath("/pages/launcher.html")
    ].filter(Boolean).forEach(link => {
      link.classList.add("cfs-sidebar-secondary");
      aside.appendChild(link);
    });

    aside.appendChild(sidebarSection("SYSTEM"));

    // Setup was not part of the original v3 sidebar, so create it if needed.
    let setup = byPath("/pages/setup.html");
    if (!setup) {
      setup = document.createElement("a");
      setup.className = "cfs-sidebar-link cfs-sidebar-secondary";
      setup.href = "/pages/setup.html";
      setup.innerHTML = '<span class="cfs-sidebar-icon">⚙</span><span>Grundsetup</span>';
      if (path === "/pages/setup.html") setup.classList.add("active");
    }

    const settings = byPath("/pages/settings.html");
    const support = byPath("/pages/support.html");

    [setup,settings,support].filter(Boolean).forEach(link => {
      link.classList.add("cfs-sidebar-secondary");
      aside.appendChild(link);
    });
  }

  function creatorContext() {
    const meta = CREATOR_META[path];
    if (!meta) return null;

    const crumbs = [
      {label:"Creator Suite",href:"/pages/dashboard.html"}
    ];

    if (meta.group && meta.group !== "Creator Suite") {
      const groupHref =
        meta.group === "Verbindungen" ? "/pages/integrations.html" :
        meta.group === "System" ? "/pages/settings.html" :
        "/pages/dashboard.html";
      crumbs.push({label:meta.group,href:groupHref});
    }

    crumbs.push({label:meta.label,href:""});
    return { ...meta, crumbs };
  }

  function publicContext() {
    const label = PUBLIC_META[path];
    if (!label) return null;
    return {
      label,
      parent:"/",
      parentLabel:"Startseite",
      crumbs:[
        {label:"Start",href:"/"},
        {label,href:""}
      ]
    };
  }

  function injectContextBar() {
    if (document.querySelector(".cfs-nav-v8-context")) return;

    const isCreator = document.body.classList.contains("creator-workspace");
    const context = isCreator ? creatorContext() : publicContext();
    if (!context) return;

    const main = document.querySelector("main");
    if (!main) return;

    const bar = document.createElement("nav");
    bar.className = "cfs-nav-v8-context";
    bar.setAttribute("aria-label","Breadcrumb");

    const crumbs = document.createElement("div");
    crumbs.className = "cfs-nav-v8-crumbs";

    context.crumbs.forEach((crumb,index) => {
      if (index) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = "›";
        crumbs.appendChild(sep);
      }

      if (crumb.href && index < context.crumbs.length - 1) {
        const a = document.createElement("a");
        a.href = crumb.href;
        a.textContent = crumb.label;
        crumbs.appendChild(a);
      } else {
        const strong = document.createElement("strong");
        strong.textContent = crumb.label;
        crumbs.appendChild(strong);
      }
    });

    const back = document.createElement("a");
    back.className = "cfs-nav-v8-back";
    back.href = context.parent;
    back.innerHTML = `← <span>${context.parentLabel}</span>`;

    bar.append(crumbs,back);

    // Place directly before main so it stays above the page hero but below the header/sidebar.
    main.insertAdjacentElement("beforebegin",bar);
  }

  function closeOtherGroups(event) {
    const opened = event.target.closest?.(".cfs-nav-v8-group");
    if (!opened || !opened.open) return;

    document.querySelectorAll(".cfs-nav-v8-group[open]").forEach(group => {
      if (group !== opened) group.open = false;
    });
  }

  function wireDropdownBehavior() {
    document.addEventListener("toggle",closeOtherGroups,true);

    document.addEventListener("click",event => {
      if (event.target.closest?.(".cfs-nav-v8-group")) return;
      document.querySelectorAll(".cfs-nav-v8-group[open]").forEach(group => group.open = false);
    });

    document.addEventListener("keydown",event => {
      if (event.key !== "Escape") return;
      document.querySelectorAll(".cfs-nav-v8-group[open]").forEach(group => group.open = false);
    });
  }

  function init() {
    polishPublicNav();
    polishCreatorNav();

    // cfs-shell-v3 creates the sidebar in the same startup phase.
    repolishSidebar();
    injectContextBar();
    wireDropdownBehavior();

    window.addEventListener("hashchange",() => {
      const publicNav = document.querySelector(".public-nav.cfs-nav-v8");
      if (publicNav) markPublicActive(publicNav);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-NAV-V8 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-DASHBOARD-V9 ===== */


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

/* ===== END CONSOLIDATED LAYER CFS-DASHBOARD-V9 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-FORMS-V10 ===== */


(() => {
  "use strict";

  const path = location.pathname.toLowerCase();

  const HINTS = Object.freeze({
    loginEmail:"Verwende die E-Mail-Adresse deines Creator-Accounts.",
    loginPassword:"Dein Passwort bleibt im Formular und wird nicht im CFS Guide gespeichert.",
    displayName:"So wird dein Creator-Name innerhalb der Plattform angezeigt.",
    regEmail:"An diese Adresse senden wir den Bestätigungslink.",
    regPassword:"Mindestens 15 Zeichen. Ein einzigartiges Passwort ist empfohlen.",
    regPasswordConfirm:"Muss exakt mit dem neuen Passwort übereinstimmen.",
    verifyEmailAddress:"Fordere nur bei Bedarf einen neuen Bestätigungslink an.",
    passkeyLabel:"Ein kurzer Name hilft dir später, Geräte und Passkeys auseinanderzuhalten.",
    passkeyPassword:"Das aktuelle Passwort bestätigt diese sensible Änderung.",
    mfaSetupPassword:"Das aktuelle Passwort bestätigt die Einrichtung von 2FA.",
    mfaEnableCode:"Gib den aktuellen 6-stelligen Code deiner Authenticator-App ein.",
    mfaRecoveryPassword:"Für neue Recovery-Codes ist eine erneute Bestätigung nötig.",
    mfaRecoveryTotp:"Verwende den aktuellen Code deiner Authenticator-App.",
    mfaDisablePassword:"2FA zu deaktivieren ist eine sensible Account-Änderung.",
    mfaDisableCode:"Bestätige das Deaktivieren mit einem aktuellen 2FA-Code.",
    currentPassword:"Das aktuelle Passwort bestätigt den Passwortwechsel.",
    newPassword:"Verwende ein neues, einzigartiges Passwort.",
    newPasswordConfirm:"Muss exakt mit dem neuen Passwort übereinstimmen.",
    exportPassword:"Der Export enthält persönliche Daten. Deshalb wird dein Passwort erneut verlangt.",
    deletePassword:"Die Kontolöschung ist endgültig und verlangt deshalb dein aktuelles Passwort.",
    deleteConfirmation:"Gib das verlangte Bestätigungswort exakt ein.",
    themeSelect:"Du kannst das Theme später jederzeit ändern.",
    deviceCode:"Verwende nur einen Code, den dein eigener CFS Launcher gerade anzeigt."
  });

  const FORM_NOTES = Object.freeze({
    regForm:"Nach der Registrierung musst du deine E-Mail-Adresse bestätigen.",
    verifyResendForm:"Mehrfaches Anfordern beschleunigt die Zustellung nicht. Verwende den neuesten Link.",
    passkeyAddForm:"Der Passkey wird erst nach erfolgreicher Geräte-/Browser-Bestätigung gespeichert.",
    mfaSetupForm:"Nach der Einrichtung musst du 2FA noch mit einem gültigen Code aktivieren.",
    deleteAccountForm:"Diese Aktion kann nicht rückgängig gemacht werden.",
    dataExportForm:"Der Export wird nur für deinen aktuell angemeldeten Account erstellt.",
    setupForm:"Du kannst alle Setup-Werte später erneut ändern."
  });

  function safeId(value) {
    return String(value || "").replace(/[^a-zA-Z0-9_-]/g,"");
  }

  function labelFor(control) {
    if (control.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
      if (explicit) return explicit;
    }
    return control.closest("label") || control.closest(".field")?.querySelector(":scope > label") || null;
  }

  function markRequired(control) {
    if (!control.required) return;

    const label = labelFor(control);
    if (!label || label.querySelector(".cfs-form-required")) return;

    const badge = document.createElement("span");
    badge.className = "cfs-form-required";
    badge.textContent = "PFLICHT";
    label.appendChild(badge);
  }

  function hintText(control) {
    if (control.id && HINTS[control.id]) return HINTS[control.id];

    const name = String(control.name || "").toLowerCase();
    if (name === "contact_email") return "Optional. Wird nur als Kontaktangabe für diese private Support-Meldung gespeichert.";
    if (name === "subject") return "Kurz beschreiben, was passiert ist.";
    if (name === "message") return "Keine Passwörter, Tokens, Recovery-Codes oder API-Keys einfügen.";
    if (name === "follower_goal") return "Dient als Zielwert für passende Creator-Anzeigen und Widgets.";

    return "";
  }

  function ensureMeta(control) {
    const container = control.closest(".field") || control.closest("label");
    if (!container) return null;

    let meta = container.querySelector(":scope > .cfs-field-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "cfs-field-meta";
      control.insertAdjacentElement("afterend",meta);
    }
    return meta;
  }

  function addHint(control) {
    const text = hintText(control);
    if (!text) return;

    const meta = ensureMeta(control);
    if (!meta || meta.querySelector(".cfs-field-hint")) return;

    const hint = document.createElement("span");
    hint.className = "cfs-field-hint";
    hint.textContent = text;
    meta.prepend(hint);
  }

  function addCounter(control) {
    const max = Number(control.getAttribute("maxlength"));
    if (!Number.isFinite(max) || max <= 0) return;
    if (!["INPUT","TEXTAREA"].includes(control.tagName)) return;
    if (control.type === "password" || control.type === "hidden") return;

    const meta = ensureMeta(control);
    if (!meta || meta.querySelector(".cfs-field-counter")) return;

    const counter = document.createElement("span");
    counter.className = "cfs-field-counter";

    const update = () => {
      const count = String(control.value || "").length;
      counter.textContent = `${count}/${max}`;
      counter.classList.toggle("near-limit",count >= max * .8 && count < max);
      counter.classList.toggle("at-limit",count >= max);
    };

    control.addEventListener("input",update);
    meta.appendChild(counter);
    update();
  }

  function addPasswordToggle(control) {
    if (control.type !== "password" || control.dataset.cfsPasswordToggle === "1") return;
    control.dataset.cfsPasswordToggle = "1";

    const shell = document.createElement("div");
    shell.className = "cfs-password-shell";

    control.parentNode.insertBefore(shell,control);
    shell.appendChild(control);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cfs-password-toggle";
    button.textContent = "ANZEIGEN";
    button.setAttribute("aria-label","Passwort anzeigen");
    button.setAttribute("aria-pressed","false");

    button.addEventListener("click",() => {
      const visible = control.type === "text";
      control.type = visible ? "password" : "text";
      button.textContent = visible ? "ANZEIGEN" : "AUSBLENDEN";
      button.setAttribute("aria-label",visible ? "Passwort anzeigen" : "Passwort ausblenden");
      button.setAttribute("aria-pressed",visible ? "false" : "true");
      control.focus({preventScroll:true});
    });

    shell.appendChild(button);
  }

  function validationText(control) {
    const validity = control.validity;
    if (!validity) return "Bitte überprüfe dieses Feld.";
    if (validity.valueMissing) return "Dieses Pflichtfeld darf nicht leer sein.";
    if (validity.typeMismatch && control.type === "email") return "Bitte gib eine gültige E-Mail-Adresse ein.";
    if (validity.tooShort) return `Bitte mindestens ${control.minLength} Zeichen eingeben.`;
    if (validity.tooLong) return `Maximal ${control.maxLength} Zeichen erlaubt.`;
    if (validity.rangeUnderflow) return `Der Wert muss mindestens ${control.min} sein.`;
    if (validity.rangeOverflow) return `Der Wert darf höchstens ${control.max} sein.`;
    if (validity.patternMismatch) {
      if (control.inputMode === "numeric") return "Bitte den Code im erwarteten Zahlenformat eingeben.";
      return "Das eingegebene Format ist noch nicht gültig.";
    }
    return "Bitte überprüfe die Eingabe.";
  }

  function errorNode(control) {
    const base = safeId(control.id || control.name || "field");
    const id = `cfsFieldError-${base}-${Array.from(document.querySelectorAll("input,select,textarea")).indexOf(control)}`;

    let node = document.getElementById(id);
    if (node) return node;

    node = document.createElement("div");
    node.className = "cfs-field-error";
    node.id = id;
    node.hidden = true;

    const host = control.closest(".field") || control.closest("label");
    const meta = host?.querySelector(":scope > .cfs-field-meta");
    if (meta) meta.insertAdjacentElement("afterend",node);
    else control.insertAdjacentElement("afterend",node);

    const existing = String(control.getAttribute("aria-describedby") || "").trim();
    control.setAttribute("aria-describedby",[existing,id].filter(Boolean).join(" "));
    return node;
  }

  function showInvalid(control) {
    if (control.disabled || control.readOnly) return;
    if (control.validity?.valid) {
      clearInvalid(control);
      return;
    }

    const node = errorNode(control);
    node.textContent = validationText(control);
    node.hidden = false;
    control.setAttribute("aria-invalid","true");
  }

  function clearInvalid(control) {
    control.removeAttribute("aria-invalid");
    const described = String(control.getAttribute("aria-describedby") || "").split(/\s+/);
    for (const id of described) {
      if (!id.startsWith("cfsFieldError-")) continue;
      const node = document.getElementById(id);
      if (node) node.hidden = true;
    }
  }

  function enhanceControl(control) {
    if (control.dataset.cfsFormV10 === "1") return;
    if (control.type === "hidden") return;
    if (control.closest(".support-honeypot")) return;

    control.dataset.cfsFormV10 = "1";
    markRequired(control);
    addHint(control);
    addCounter(control);
    addPasswordToggle(control);

    control.addEventListener("invalid",event => {
      event.preventDefault();
      showInvalid(control);
    });

    control.addEventListener("input",() => {
      if (control.hasAttribute("aria-invalid")) {
        if (control.validity?.valid) clearInvalid(control);
        else showInvalid(control);
      }
    });

    control.addEventListener("blur",() => {
      if (control.required && String(control.value || "").trim() && !control.validity?.valid) showInvalid(control);
    });
  }

  function addFormNote(form) {
    if (!form.id || !FORM_NOTES[form.id] || form.querySelector(".cfs-form-submit-note")) return;

    const note = document.createElement("div");
    note.className = "cfs-form-submit-note";
    note.textContent = FORM_NOTES[form.id];

    const submit = form.querySelector('button[type="submit"],input[type="submit"]');
    const host = submit?.closest(".submit-row,.field,.full,.support-form-actions") || submit?.parentElement || form;
    host.appendChild(note);
  }

  function enhanceForm(form) {
    if (form.dataset.cfsFormEnhanced === "1") return;
    form.dataset.cfsFormEnhanced = "1";
    form.classList.add("cfs-form-v10");

    form.querySelectorAll("input,select,textarea").forEach(enhanceControl);
    addFormNote(form);

    form.addEventListener("submit",() => {
      const firstInvalid = Array.from(form.elements).find(el =>
        el instanceof HTMLElement &&
        typeof el.checkValidity === "function" &&
        !el.checkValidity()
      );

      if (firstInvalid) {
        showInvalid(firstInvalid);
        setTimeout(() => {
          firstInvalid.scrollIntoView?.({behavior:"smooth",block:"center"});
          firstInvalid.focus?.({preventScroll:true});
        },20);
      }
    },true);
  }

  function classifyExistingActions() {
    document.querySelectorAll(".danger-button").forEach(button => {
      button.dataset.cfsDanger = "true";
    });
  }

  function classifyNotices() {
    document.querySelectorAll(".notice,[role='status']").forEach(node => {
      if (node.classList.contains("hidden") || node.hidden) return;

      const text = String(node.textContent || "").trim().toLowerCase();
      if (!text) return;

      node.classList.add("cfs-form-status");
      node.classList.remove("cfs-status-success","cfs-status-error","cfs-status-warning");

      const error = /fehler|fehlgeschlagen|ungültig|nicht möglich|abgelehnt|error|failed|invalid/.test(text);
      const warning = /achtung|warnung|prüfe|prüfung|noch nicht|nicht bestätigt/.test(text);
      const success = /erfolgreich|gespeichert|bestätigt|aktiviert|erstellt|gesendet|unterwegs|verbunden|geändert/.test(text);

      if (error) node.classList.add("cfs-status-error");
      else if (warning) node.classList.add("cfs-status-warning");
      else if (success) node.classList.add("cfs-status-success");
    });
  }

  function enhanceAll(root = document) {
    document.body.classList.add("cfs-form-v10");
    root.querySelectorAll?.("form").forEach(enhanceForm);
    classifyExistingActions();
    classifyNotices();
  }

  function observe() {
    let scheduled = false;

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        enhanceAll(document);
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:["hidden","class","disabled","required"]
    });
  }

  function init() {
    if (path.includes("/admin-") || document.body.dataset.cfsForms === "off") return;

    enhanceAll();
    observe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-FORMS-V10 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-MOBILE-V11 ===== */


(() => {
  "use strict";

  const path = location.pathname.toLowerCase();
  const MOBILE = window.matchMedia("(max-width: 760px)");

  const WORKSPACE_PATHS = new Set([
    "/pages/widget-studio.html",
    "/pages/stream-studio.html",
    "/pages/scene-studio.html",
    "/pages/editor.html",
    "/pages/cut-studio.html",
    "/pages/audio-studio.html"
  ]);

  function creatorPage() {
    return document.body.classList.contains("creator-workspace");
  }

  function dockLink(href,label,icon) {
    const a = document.createElement("a");
    a.href = href;
    a.innerHTML = `<span class="cfs-mobile-dock-icon">${icon}</span><span>${label}</span>`;
    if (path === href) {
      a.classList.add("active");
      a.setAttribute("aria-current","page");
    }
    return a;
  }

  function installDock() {
    if (!creatorPage() || document.getElementById("cfsMobileDock")) return;

    const dock = document.createElement("nav");
    dock.id = "cfsMobileDock";
    dock.className = "cfs-mobile-dock cfs-mobile-only";
    dock.setAttribute("aria-label","Mobile Creator Navigation");

    dock.append(
      dockLink("/pages/dashboard.html","Dashboard","⌂"),
      dockLink("/pages/widget-studio.html","Widgets","▦"),
      dockLink("/pages/stream-studio.html","Stream","◉"),
      dockLink("/pages/account.html","Account","◎")
    );

    const guide = document.createElement("button");
    guide.type = "button";
    guide.innerHTML = '<span class="cfs-mobile-dock-icon">?</span><span>Guide</span>';
    guide.addEventListener("click",() => {
      const launcher = document.getElementById("cfsGuideLauncher");
      if (launcher) launcher.click();
      else if (window.CFSHelpV6?.open) window.CFSHelpV6.open("start");
    });
    dock.appendChild(guide);

    document.body.appendChild(dock);
    document.body.classList.add("cfs-mobile-dock-ready");
  }

  function removeDockStateWhenDesktop() {
    if (MOBILE.matches) {
      document.body.classList.add("cfs-mobile-dock-ready");
    } else {
      document.body.classList.remove("cfs-mobile-dock-ready");
    }
  }

  function closeMenusAfterNavigation() {
    document.addEventListener("click",event => {
      const link = event.target.closest?.(".nav a,.cfs-nav-v8-menu a");
      if (!link || !MOBILE.matches) return;

      document.querySelectorAll(".cfs-nav-v8-group[open]").forEach(group => group.open = false);

      const menuToggle = document.querySelector("[data-menu-toggle],[aria-controls='siteNav'],[aria-controls='creatorNav']");
      const nav = document.querySelector(".nav.open,.nav.is-open,[data-nav-open='true']");
      if (nav && menuToggle instanceof HTMLElement) {
        menuToggle.click();
      }
    });
  }

  function addWorkspaceNote() {
    if (!WORKSPACE_PATHS.has(path) || document.querySelector(".cfs-mobile-workspace-note")) return;

    const main = document.querySelector("main");
    if (!main) return;

    const hero = main.querySelector(".page-hero,.creator-dashboard-hero,.widget-studio-hero,.stream-studio-hero");
    const note = document.createElement("div");
    note.className = "cfs-mobile-workspace-note cfs-mobile-only";
    note.textContent = "Dieser Arbeitsbereich ist auf Desktop besonders groß. Auf dem Handy kannst du breite Werkzeugleisten und Arbeitsflächen horizontal verschieben.";

    if (hero) hero.insertAdjacentElement("afterend",note);
    else main.prepend(note);
  }

  function eligibleSubmit(form) {
    if (!form || form.dataset.cfsMobileAction === "off") return null;

    const submit = form.querySelector('button[type="submit"].btn,input[type="submit"].btn,button[type="submit"]');
    if (!submit || submit.disabled) return null;

    if (form.closest(".cfs-guide-panel,.cfs-help-drawer")) return null;

    return submit;
  }

  function installStickyFormAction(form) {
    if (!MOBILE.matches || form.dataset.cfsMobileSticky === "1") return;

    const submit = eligibleSubmit(form);
    if (!submit) return;

    const rect = form.getBoundingClientRect();
    if (rect.height < 420) return;

    form.dataset.cfsMobileSticky = "1";

    const wrap = document.createElement("div");
    wrap.className = "cfs-mobile-form-action cfs-mobile-only";
    wrap.dataset.cfsMobileFor = form.id || "form";

    const clone = document.createElement("button");
    clone.type = "button";
    clone.className = submit.className || "btn primary";
    clone.textContent = submit.textContent || submit.value || "SPEICHERN";

    clone.addEventListener("click",() => {
      if (submit.disabled) return;
      submit.scrollIntoView?.({behavior:"smooth",block:"center"});
      setTimeout(() => submit.click(),220);
    });

    wrap.appendChild(clone);
    form.appendChild(wrap);

    const sync = () => {
      clone.disabled = Boolean(submit.disabled);
      clone.textContent = submit.textContent || submit.value || "SPEICHERN";
      clone.className = submit.className || "btn primary";
    };

    new MutationObserver(sync).observe(submit,{
      attributes:true,
      childList:true,
      characterData:true,
      subtree:true,
      attributeFilter:["disabled","class"]
    });
  }

  function enhanceLongForms() {
    if (!MOBILE.matches) return;
    document.querySelectorAll("form").forEach(installStickyFormAction);
  }

  function markScrollableRows() {
    const selectors = [
      ".tabs",
      ".chip-row",
      ".filter-row",
      ".toolbar",
      ".creator-toolbar",
      ".widget-toolbar",
      ".stream-toolbar"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(node => {
      node.classList.add("cfs-mobile-rail");
    });
  }

  function keepFocusedFieldVisible() {
    document.addEventListener("focusin",event => {
      if (!MOBILE.matches) return;
      const control = event.target.closest?.("input,textarea,select");
      if (!control) return;

      setTimeout(() => {
        const rect = control.getBoundingClientRect();
        const topLimit = 90;
        const bottomLimit = window.innerHeight - 150;

        if (rect.top < topLimit || rect.bottom > bottomLimit) {
          control.scrollIntoView({behavior:"smooth",block:"center"});
        }
      },180);
    });
  }

  function avoidDoubleGuideControls() {
    const sync = () => {
      const launcher = document.getElementById("cfsGuideLauncher");
      if (!launcher) return;
      launcher.setAttribute("aria-label","CFS Guide öffnen");
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function refreshForViewport() {
    removeDockStateWhenDesktop();

    if (MOBILE.matches) {
      installDock();
      enhanceLongForms();
      markScrollableRows();
      addWorkspaceNote();
    }
  }

  function init() {
    refreshForViewport();
    closeMenusAfterNavigation();
    keepFocusedFieldVisible();
    avoidDoubleGuideControls();

    if (typeof MOBILE.addEventListener === "function") {
      MOBILE.addEventListener("change",refreshForViewport);
    } else {
      MOBILE.addListener(refreshForViewport);
    }

    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (MOBILE.matches) {
          enhanceLongForms();
          markScrollableRows();
        }
      });
    }).observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-MOBILE-V11 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-ACCESSIBILITY-V12 ===== */


(() => {
  "use strict";

  let previousFocus = null;
  let activeTrap = null;
  let lastAnnouncement = "";
  let announceTimer = null;

  function ensureMainTarget() {
    const main = document.querySelector("main");
    if (!main) return null;

    if (!main.id) main.id = "cfsMainContent";
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex","-1");
    return main;
  }

  function installSkipLink() {
    if (document.querySelector(".cfs-skip-link")) return;

    const main = ensureMainTarget();
    if (!main) return;

    const link = document.createElement("a");
    link.className = "cfs-skip-link";
    link.href = `#${main.id}`;
    link.textContent = "Zum Hauptinhalt springen";

    link.addEventListener("click",() => {
      setTimeout(() => main.focus({preventScroll:true}),0);
    });

    document.body.prepend(link);
  }

  function installLiveRegion() {
    if (document.getElementById("cfsA11yLive")) return;

    const live = document.createElement("div");
    live.id = "cfsA11yLive";
    live.className = "cfs-a11y-live";
    live.setAttribute("aria-live","polite");
    live.setAttribute("aria-atomic","true");
    document.body.appendChild(live);
  }

  function announce(text,{assertive=false}={}) {
    const clean = String(text || "").replace(/\s+/g," ").trim();
    if (!clean || clean === lastAnnouncement) return;

    lastAnnouncement = clean;
    clearTimeout(announceTimer);

    announceTimer = setTimeout(() => {
      const live = document.getElementById("cfsA11yLive");
      if (!live) return;

      live.setAttribute("aria-live",assertive ? "assertive" : "polite");
      live.textContent = "";
      requestAnimationFrame(() => {
        live.textContent = clean.slice(0,280);
      });
    },70);
  }

  function classifyAnnouncement(node) {
    const text = String(node?.textContent || "").trim();
    if (!text) return;

    const error = /fehler|fehlgeschlagen|ungültig|nicht möglich|error|failed|invalid|abgelehnt/i.test(text);
    const success = /erfolgreich|gespeichert|bestätigt|aktiviert|verbunden|gesendet|erstellt/i.test(text);

    if (error) announce(text,{assertive:true});
    else if (success) announce(text);
  }

  function observeStatusMessages() {
    const selectors = ".notice,[role='status'],.cfs-form-status,#loginMsg,#regMsg,#mfaMsg,#passkeyMsg,#sessionMsg,#exportMsg,#deleteMsg";

    document.querySelectorAll(selectors).forEach(classifyAnnouncement);

    const observer = new MutationObserver(records => {
      for (const record of records) {
        const target = record.target.nodeType === Node.ELEMENT_NODE
          ? record.target
          : record.target.parentElement;

        if (!target) continue;

        const node = target.closest?.(selectors);
        if (node) classifyAnnouncement(node);

        record.addedNodes.forEach(added => {
          if (added.nodeType !== Node.ELEMENT_NODE) return;
          if (added.matches?.(selectors)) classifyAnnouncement(added);
          added.querySelectorAll?.(selectors).forEach(classifyAnnouncement);
        });
      }
    });

    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  function focusable(container) {
    if (!container) return [];

    return Array.from(container.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
    )).filter(node => {
      const style = getComputedStyle(node);
      return style.visibility !== "hidden" && style.display !== "none" && node.getClientRects().length > 0;
    });
  }

  function activateTrap(container) {
    if (!container || container.hidden) return;
    if (activeTrap === container) return;

    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    activeTrap = container;
    container.classList.add("cfs-focus-trapped");

    const items = focusable(container);
    const preferred =
      container.querySelector("[autofocus]") ||
      container.querySelector("input,textarea,select") ||
      items[0];

    setTimeout(() => preferred?.focus?.(),20);
  }

  function deactivateTrap(container) {
    if (activeTrap !== container) return;

    container.classList.remove("cfs-focus-trapped");
    activeTrap = null;

    const restore = previousFocus;
    previousFocus = null;
    setTimeout(() => restore?.focus?.(),20);
  }

  function trapKeydown(event) {
    if (!activeTrap || event.key !== "Tab") return;

    const items = focusable(activeTrap);
    if (!items.length) {
      event.preventDefault();
      activeTrap.focus?.();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function watchDialog(selector,{modal=false}={}) {
    const sync = () => {
      const dialog = document.querySelector(selector);
      if (!dialog) return;

      if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex","-1");
      if (modal) dialog.setAttribute("aria-modal","true");

      if (!dialog.hidden) activateTrap(dialog);
      else deactivateTrap(dialog);
    };

    sync();

    const rootObserver = new MutationObserver(sync);
    rootObserver.observe(document.body,{subtree:true,childList:true});

    const attachObserver = () => {
      const dialog = document.querySelector(selector);
      if (!dialog || dialog.dataset.cfsA11yObserved === "1") return;

      dialog.dataset.cfsA11yObserved = "1";
      new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:["hidden","aria-hidden"]});
    };

    attachObserver();
    new MutationObserver(attachObserver).observe(document.body,{subtree:true,childList:true});
  }

  function navigationKeyboard() {
    document.addEventListener("keydown",event => {
      const summary = event.target.closest?.(".cfs-nav-v8-group>summary");
      const menuLink = event.target.closest?.(".cfs-nav-v8-menu a");

      if (summary) {
        const group = summary.parentElement;
        const links = focusable(group.querySelector(".cfs-nav-v8-menu"));

        if (event.key === "ArrowDown") {
          event.preventDefault();
          group.open = true;
          setTimeout(() => links[0]?.focus(),0);
        } else if (event.key === "Escape") {
          event.preventDefault();
          group.open = false;
          summary.focus();
        }
        return;
      }

      if (!menuLink) return;

      const menu = menuLink.closest(".cfs-nav-v8-menu");
      const group = menu?.closest(".cfs-nav-v8-group");
      const summaryNode = group?.querySelector(":scope>summary");
      const links = focusable(menu);
      const index = links.indexOf(menuLink);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        links[(index + 1) % links.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        links[(index - 1 + links.length) % links.length]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        links[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        links[links.length - 1]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (group) group.open = false;
        summaryNode?.focus();
      }
    });

    document.querySelectorAll(".cfs-nav-v8-group>summary").forEach(summary => {
      const details = summary.parentElement;
      summary.setAttribute("aria-haspopup","true");
      summary.setAttribute("aria-expanded",details.open ? "true" : "false");

      details.addEventListener("toggle",() => {
        summary.setAttribute("aria-expanded",details.open ? "true" : "false");
      });
    });
  }

  function buttonNames() {
    document.querySelectorAll("button").forEach(button => {
      if (button.getAttribute("aria-label")) return;

      const text = String(button.textContent || "").trim();
      if (text) return;

      if (button.title) {
        button.setAttribute("aria-label",button.title);
        return;
      }

      const icon = button.querySelector("svg,img");
      const alt = icon?.getAttribute?.("alt");
      if (alt) button.setAttribute("aria-label",alt);
    });
  }

  function syncExpandedStates() {
    document.querySelectorAll("details").forEach(details => {
      const summary = details.querySelector(":scope>summary");
      if (!summary) return;

      summary.setAttribute("aria-expanded",details.open ? "true" : "false");

      if (details.dataset.cfsA11yDetails === "1") return;
      details.dataset.cfsA11yDetails = "1";

      details.addEventListener("toggle",() => {
        summary.setAttribute("aria-expanded",details.open ? "true" : "false");
      });
    });
  }

  function addKeyboardHints() {
    if (!window.matchMedia("(pointer:fine)").matches) return;

    document.querySelectorAll(".cfs-nav-v8-group>summary").forEach(summary => {
      if (summary.querySelector(".cfs-keyboard-hint")) return;

      const hint = document.createElement("span");
      hint.className = "cfs-keyboard-hint";
      hint.innerHTML = "<kbd>↓</kbd>";
      hint.setAttribute("aria-hidden","true");
      summary.appendChild(hint);
    });
  }

  function observeDynamicAccessibility() {
    let scheduled = false;

    const refresh = () => {
      if (scheduled) return;
      scheduled = true;

      requestAnimationFrame(() => {
        scheduled = false;
        buttonNames();
        syncExpandedStates();
        addKeyboardHints();
      });
    };

    new MutationObserver(refresh).observe(document.body,{subtree:true,childList:true});
  }

  function init() {
    installSkipLink();
    installLiveRegion();
    buttonNames();
    syncExpandedStates();
    navigationKeyboard();
    addKeyboardHints();
    observeStatusMessages();

    watchDialog("#cfsGuidePanel",{modal:true});
    watchDialog("#cfsHelpDrawer .cfs-help-drawer-panel",{modal:true});

    document.addEventListener("keydown",trapKeydown,true);
    observeDynamicAccessibility();
  }

  window.CFSA11yV12 = Object.freeze({ announce });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-ACCESSIBILITY-V12 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-HOME-V13 ===== */


(() => {
  "use strict";

  if (location.pathname !== "/" && location.pathname !== "/index.html") return;

  const LOGO = "/assets/img/brand/cfs-zockt-mark-original.png";

  function enhanceBody() {
    document.body.classList.add("cfs-home-v13");
  }

  function enhanceStage() {
    const stage = document.querySelector(".brand-hero-stage");
    if (!stage || stage.querySelector(".cfs-home-v13-stage")) return;

    // Keep the original stage in the DOM for existing content/tests, but replace the
    // visible presentation with a product-oriented example workflow.
    Array.from(stage.children).forEach(child => {
      child.hidden = true;
      child.setAttribute("aria-hidden","true");
    });

    const preview = document.createElement("div");
    preview.className = "cfs-home-v13-stage";
    preview.setAttribute("aria-label","Beispiel für einen cfs_zockt Creator-Workflow");
    preview.innerHTML = `
      <div class="cfs-home-v13-stage-head">
        <div class="cfs-home-v13-stage-brand">
          <img src="${LOGO}" alt="">
          <div>
            <strong>cfs_zockt Creator Suite</strong>
            <span>Beispiel-Workflow für den Einstieg</span>
          </div>
        </div>
        <span class="cfs-home-v13-preview-note">KEINE LIVE-DATEN</span>
      </div>

      <div class="cfs-home-v13-workflow">
        <article class="primary">
          <span class="cfs-home-v13-step">01</span>
          <div>
            <strong>Widget Studio</strong>
            <p>Ein erstes Widget erstellen und mit Beispieldaten in der Vorschau testen.</p>
          </div>
          <span class="cfs-home-v13-workflow-badge">START</span>
        </article>

        <article>
          <span class="cfs-home-v13-step">02</span>
          <div>
            <strong>Stream Studio</strong>
            <p>Szenen, Quellen und Widgets zu einem Stream-Workflow zusammenführen.</p>
          </div>
          <span class="cfs-home-v13-workflow-badge">ERWEITERN</span>
        </article>

        <article class="optional">
          <span class="cfs-home-v13-step">03</span>
          <div>
            <strong>TikTok &amp; Launcher</strong>
            <p>Erst verbinden, wenn dein Workflow Live-Daten oder Desktop-Funktionen braucht.</p>
          </div>
          <span class="cfs-home-v13-workflow-badge">OPTIONAL</span>
        </article>
      </div>

      <div class="cfs-home-v13-stage-foot">
        <span>Produktansicht zur Orientierung.<br>Keine Nutzer-, Live- oder Erfolgsstatistik.</span>
        <strong>ACCOUNT → WIDGET → ERWEITERN</strong>
      </div>`;

    stage.appendChild(preview);
  }

  function injectEntryPath() {
    if (document.getElementById("cfsHomeV13Entry")) return;

    const hero = document.querySelector(".brand-hero");
    if (!hero) return;

    const section = document.createElement("section");
    section.className = "cfs-home-v13-entry";
    section.id = "cfsHomeV13Entry";
    section.setAttribute("aria-label","So startest du mit cfs_zockt");
    section.innerHTML = `
      <div class="cfs-home-v13-entry-inner">
        <article class="cfs-home-v13-entry-card">
          <b>01</b>
          <span>KOSTENLOSER START</span>
          <strong>Account erstellen</strong>
          <p>Für den normalen Einstieg werden keine Zahlungsdaten abgefragt. Danach bestätigst du deine E-Mail.</p>
        </article>

        <article class="cfs-home-v13-entry-card">
          <b>02</b>
          <span>ERSTES ERGEBNIS</span>
          <strong>Widget bauen &amp; testen</strong>
          <p>Manuelle Widgets funktionieren auch ohne TikTok-Verbindung. Du kannst zuerst gestalten und Vorschauen testen.</p>
        </article>

        <article class="cfs-home-v13-entry-card">
          <b>03</b>
          <span>SPÄTER ERWEITERN</span>
          <strong>Stream, TikTok &amp; Desktop</strong>
          <p>Stream Studio, TikTok und Launcher kommen erst dazu, wenn du sie für deinen Workflow wirklich brauchst.</p>
        </article>
      </div>

      <div class="cfs-home-v13-entry-actions">
        <div class="cfs-home-v13-entry-actions-copy">
          <strong>Du musst nicht alles auf einmal einrichten.</strong>
          <span>Beginne mit Account + Widget. Erweiterungen bleiben getrennte, bewusste Schritte.</span>
        </div>
        <div class="actions">
          <a class="btn primary" href="/pages/login.html#regForm" data-auth-cta data-funnel-cta="v13-path-register">KOSTENLOS STARTEN</a>
          <a class="btn" href="#produktbeweis">WAS FUNKTIONIERT HEUTE?</a>
        </div>
      </div>`;

    hero.insertAdjacentElement("afterend",section);
  }

  function focusProductProof() {
    const section = document.getElementById("produktbeweis");
    const heading = section?.querySelector(".marketing-heading");
    if (!section || !heading || section.querySelector(".cfs-home-v13-proof-focus")) return;

    const note = document.createElement("div");
    note.className = "cfs-home-v13-proof-focus";
    note.innerHTML = `
      <strong>Für den Einstieg wichtig: Du kannst zuerst lokal/manuell bauen und testen.</strong>
      <p>Verbindungen wie TikTok und Launcher sind Erweiterungen des Workflows und keine Voraussetzung, um die Creator Suite kennenzulernen.</p>`;
    heading.insertAdjacentElement("afterend",note);
  }

  function moveRuntimeStrip() {
    const runtime = document.querySelector(".home-runtime-strip");
    const proof = document.getElementById("produktbeweis");
    if (!runtime || !proof || runtime.dataset.cfsV13Moved === "1") return;

    runtime.dataset.cfsV13Moved = "1";
    proof.insertAdjacentElement("afterend",runtime);
  }

  function improveFirstViewportLabels() {
    const eyebrow = document.querySelector(".brand-eyebrow");
    if (eyebrow) {
      eyebrow.innerHTML = 'CREATOR SUITE · <span>WIDGETS.</span> STREAM. CONTENT.';
    }

    const primary = document.querySelector('.brand-hero-actions [data-funnel-cta="hero-register"]');
    if (primary) primary.textContent = "KOSTENLOS MIT WIDGETS STARTEN";

    const secondary = document.querySelector('.brand-hero-actions [data-funnel-cta="hero-suite"]');
    if (secondary) secondary.textContent = "TOOLS ANSEHEN";
  }

  function init() {
    enhanceBody();
    improveFirstViewportLabels();
    enhanceStage();
    injectEntryPath();
    focusProductProof();
    moveRuntimeStrip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-HOME-V13 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-SUITE-V14 ===== */


(() => {
  "use strict";

  if (location.pathname.toLowerCase() !== "/pages/creator-suite.html") return;

  const GOALS = [
    {
      icon:"▦",
      title:"Ein Widget bauen",
      text:"Goal, Counter, Timer oder Overlay erstellen und zuerst mit manuellen bzw. Testdaten prüfen.",
      state:"VERFÜGBAR",
      stateClass:"ready",
      plan:"FREE",
      meta:["ohne TikTok möglich","Vorschau zuerst"],
      href:"#widget-studio",
      action:"WIDGETS ANSEHEN",
      featured:true
    },
    {
      icon:"◇",
      title:"Szenen zusammenbauen",
      text:"Widgets zu Szenen kombinieren, Ebenen strukturieren und Übergänge für den Output konfigurieren.",
      state:"VERFÜGBAR",
      stateClass:"ready",
      plan:"FREE",
      meta:["Scene Studio","Übergänge"],
      href:"/pages/login.html",
      action:"SCENE STUDIO",
      login:true
    },
    {
      icon:"◉",
      title:"Einen Stream vorbereiten",
      text:"Szenen, Widgets, Overlays und lokale Streaming-Ziele in einem eigenen Streaming-Cockpit zusammenführen.",
      state:"VERFÜGBAR",
      stateClass:"ready",
      plan:"LOCAL",
      meta:["Stream Studio","Desktop-Capture im Launcher"],
      href:"/pages/login.html",
      action:"STREAM STUDIO",
      login:true
    },
    {
      icon:"♪",
      title:"TikTok verbinden",
      text:"TikTok erst dann verbinden, wenn dein Workflow echte TikTok-Daten oder Creator-Kontext benötigt.",
      state:"VERFÜGBAR",
      stateClass:"ready",
      plan:"FREE",
      meta:["optional","OAuth-Verbindung"],
      href:"/pages/login.html",
      action:"TIKTOK HUB",
      login:true
    },
    {
      icon:"▣",
      title:"Desktop-Funktionen nutzen",
      text:"Launcher, Device-Link und lokale Bridge für Funktionen verwenden, die direkt am Creator-PC laufen müssen.",
      state:"VERFÜGBAR",
      stateClass:"ready",
      plan:"FREE",
      meta:["Launcher","Device-Link"],
      href:"#launcher",
      action:"LAUNCHER ANSEHEN"
    },
    {
      icon:"◆",
      title:"Community erweitern",
      text:"Interactive Games ergänzen, sobald dein Basis-Setup steht und du Community-Interaktion ausbauen möchtest.",
      state:"CREATOR",
      stateClass:"beta",
      plan:"CREATOR",
      meta:["Games","später ergänzen"],
      href:"#games",
      action:"GAMES ANSEHEN"
    }
  ];

  function addBodyClass() {
    document.body.classList.add("cfs-suite-v14");
  }

  function improveHero() {
    const heroGrid = document.querySelector(".marketing-hero-grid");
    const aside = document.querySelector(".marketing-hero-card");
    if (!heroGrid || !aside || heroGrid.querySelector(".cfs-suite-v14-hero-map")) return;

    aside.hidden = true;
    aside.setAttribute("aria-hidden","true");

    const map = document.createElement("aside");
    map.className = "cfs-suite-v14-hero-map";
    map.setAttribute("aria-label","Empfohlener Einstieg in die Creator Suite");
    map.innerHTML = `
      <div class="cfs-suite-v14-hero-head">
        <span>EMPFOHLENER EINSTIEG</span>
        <b>nicht alles auf einmal</b>
      </div>

      <article class="cfs-suite-v14-map-step primary">
        <i>01</i>
        <div>
          <strong>Widget bauen</strong>
          <p>Manuell gestalten und in der Vorschau testen.</p>
        </div>
        <span class="cfs-suite-v14-map-state">FREE</span>
      </article>

      <article class="cfs-suite-v14-map-step">
        <i>02</i>
        <div>
          <strong>Szene &amp; Stream ergänzen</strong>
          <p>Erst nach dem ersten funktionierenden Element weiter ausbauen.</p>
        </div>
        <span class="cfs-suite-v14-map-state">ERWEITERN</span>
      </article>

      <article class="cfs-suite-v14-map-step optional">
        <i>03</i>
        <div>
          <strong>TikTok &amp; Launcher verbinden</strong>
          <p>Nur wenn Live-Daten oder Desktop-Funktionen benötigt werden.</p>
        </div>
        <span class="cfs-suite-v14-map-state">OPTIONAL</span>
      </article>`;
    aside.insertAdjacentElement("afterend",map);

    const headline = heroGrid.querySelector("h1");
    if (headline) headline.innerHTML = 'DEIN CREATOR-WORKFLOW.<br><span>SCHRITT FÜR SCHRITT.</span>';

    const paragraph = headline?.nextElementSibling;
    if (paragraph?.tagName === "P") {
      paragraph.textContent = "Starte mit einem Widget und erweitere deinen Workflow erst dann um Szenen, Stream, TikTok oder Desktop-Funktionen. Die Module bleiben getrennt, damit du nur einrichtest, was du wirklich brauchst.";
    }

    const primary = heroGrid.querySelector('.actions .btn.primary');
    if (primary) primary.textContent = "KOSTENLOS MIT WIDGETS STARTEN";

    const secondary = heroGrid.querySelector('.actions .btn:not(.primary)');
    if (secondary) secondary.textContent = "PASSENDES TOOL FINDEN";
  }

  function goalCard(goal) {
    const article = document.createElement("article");
    article.className = `cfs-suite-v14-goal${goal.featured ? " featured" : ""}`;

    const head = document.createElement("div");
    head.className = "cfs-suite-v14-goal-head";

    const icon = document.createElement("span");
    icon.className = "cfs-suite-v14-goal-icon";
    icon.textContent = goal.icon;

    const badge = document.createElement("span");
    badge.className = `cfs-suite-v14-badge ${goal.stateClass}`;
    badge.textContent = goal.state;

    head.append(icon,badge);

    const h3 = document.createElement("h3");
    h3.textContent = goal.title;

    const p = document.createElement("p");
    p.textContent = goal.text;

    const meta = document.createElement("div");
    meta.className = "cfs-suite-v14-goal-meta";
    [goal.plan,...goal.meta].forEach(value => {
      const item = document.createElement("span");
      item.textContent = value;
      meta.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "cfs-suite-v14-goal-actions";

    const a = document.createElement("a");
    a.href = goal.href;
    a.className = goal.featured ? "primary" : "";
    a.textContent = goal.action;
    if (goal.login) a.dataset.loginLink = "";
    actions.appendChild(a);

    article.append(head,h3,p,meta,actions);
    return article;
  }

  function injectNavigator() {
    if (document.getElementById("cfsSuiteV14Navigator")) return;

    const hero = document.querySelector(".marketing-hero");
    if (!hero) return;

    const section = document.createElement("section");
    section.className = "cfs-suite-v14-navigator";
    section.id = "cfsSuiteV14Navigator";
    section.setAttribute("aria-label","Creator Suite nach Aufgabe auswählen");

    const container = document.createElement("div");
    container.className = "container";

    const heading = document.createElement("div");
    heading.className = "cfs-suite-v14-heading";
    heading.innerHTML = `
      <div>
        <span>WAS MÖCHTEST DU MACHEN?</span>
        <h2>WÄHLE NACH AUFGABE, NICHT NACH MODULNAME.</h2>
      </div>
      <p>Die Creator Suite ist absichtlich modular. Ein FREE-Account reicht für den Grundstart. TikTok, Launcher und erweiterte Module kommen erst dazu, wenn dein Workflow sie wirklich braucht.</p>`;

    const grid = document.createElement("div");
    grid.className = "cfs-suite-v14-goals";
    GOALS.forEach(goal => grid.appendChild(goalCard(goal)));

    const planGuide = document.createElement("div");
    planGuide.className = "cfs-suite-v14-plan-guide";
    planGuide.innerHTML = `
      <article class="cfs-suite-v14-plan-card">
        <strong>Mit FREE sinnvoll starten</strong>
        <p>Der normale Einstieg ist verfügbar. Widgets, Scene Studio, TikTok Hub und Launcher werden auf dieser Produktseite als verfügbare Bereiche geführt. Erweiterte Module bleiben klar getrennt.</p>
        <div class="cfs-suite-v14-plan-row">
          <span class="current">FREE · VERFÜGBAR</span>
          <span>CREATOR · technisch vorbereitet</span>
          <span>PRO · technisch vorbereitet</span>
        </div>
      </article>

      <article class="cfs-suite-v14-plan-card">
        <strong>Status bleibt sichtbar</strong>
        <p>Beta, Preview und Roadmap werden nicht als fertig dargestellt. Die detaillierte Statusübersicht steht direkt im nächsten Abschnitt.</p>
        <div class="cfs-suite-v14-plan-row">
          <span class="current">VERFÜGBAR</span>
          <span>BETA</span>
          <span>PREVIEW</span>
          <span>ROADMAP</span>
        </div>
      </article>`;

    container.append(heading,grid,planGuide);
    section.appendChild(container);
    hero.insertAdjacentElement("afterend",section);
  }

  function labelExistingSections() {
    const status = document.getElementById("status");
    if (status && !status.querySelector(".cfs-suite-v14-section-label")) {
      const container = status.querySelector(".container");
      const heading = container?.querySelector(".marketing-heading");
      if (heading) {
        const note = document.createElement("div");
        note.className = "cfs-suite-v14-section-label";
        note.innerHTML = "<strong>Produktstatus:</strong> Diese Angaben stammen aus der bestehenden Creator-Suite-Seite. v14 ändert keine Verfügbarkeit und macht aus Beta/Preview/Roadmap keine fertigen Funktionen.";
        heading.insertAdjacentElement("afterend",note);
      }
    }

    const tools = document.getElementById("tools");
    if (tools && !tools.querySelector(".cfs-suite-v14-section-label")) {
      const container = tools.querySelector(".container");
      const heading = container?.querySelector(".marketing-heading");
      if (heading) {
        const note = document.createElement("div");
        note.className = "cfs-suite-v14-section-label";
        note.innerHTML = "<strong>Einordnung:</strong> FREE zeigt den Grundstart. CREATOR/PRO-Badges bleiben Produkt-/Plan-Einordnungen und bedeuten keine automatische Freischaltung oder aktive Abrechnung.";
        heading.insertAdjacentElement("afterend",note);
      }
    }
  }

  function movePlanSectionCloserToTools() {
    const plans = document.getElementById("plans");
    const tools = document.getElementById("tools");
    if (!plans || !tools || plans.dataset.cfsV14Moved === "1") return;

    plans.dataset.cfsV14Moved = "1";
    tools.insertAdjacentElement("afterend",plans);
  }

  function init() {
    addBodyClass();
    improveHero();
    injectNavigator();
    labelExistingSections();
    movePlanSectionCloserToTools();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-SUITE-V14 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-PLANS-V15 ===== */


(() => {
  "use strict";

  if (location.pathname.toLowerCase() !== "/pages/plans.html") return;

  const PLAN_KEYS = ["free","creator","pro"];
  let catalog = null;
  let billing = null;
  let me = null;

  function euro(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "–";
    return new Intl.NumberFormat("de-DE",{
      style:"currency",
      currency:"EUR",
      minimumFractionDigits:n === 0 ? 0 : 2
    }).format(n);
  }

  function safeText(value,fallback="–") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function planCard(key) {
    return Array.from(document.querySelectorAll(".product-plan-grid>article"))
      .find(card => String(card.querySelector("h3")?.textContent || "").trim().toLowerCase() === key);
  }

  function catalogPlan(key) {
    return (catalog?.plans || []).find(plan => String(plan.key).toLowerCase() === key) || null;
  }

  async function json(url,options) {
    if (window.CFS?.json) return window.CFS.json(url,options);
    const response = await fetch(url,{
      credentials:"same-origin",
      headers:{Accept:"application/json","Content-Type":"application/json"},
      ...options
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
    return body;
  }

  function alertBox(message,type="") {
    const box = document.getElementById("cfsPlansV15Alert");
    if (!box) return;
    box.hidden = false;
    box.className = `cfs-plans-v15-alert${type ? ` ${type}` : ""}`;
    box.textContent = message;
  }

  function addBodyClass() {
    document.body.classList.add("cfs-plans-v15");
  }

  function injectLiveStatus() {
    if (document.getElementById("cfsPlansV15Live")) return;

    const hero = document.querySelector(".marketing-hero");
    if (!hero) return;

    const section = document.createElement("section");
    section.id = "cfsPlansV15Live";
    section.className = "cfs-plans-v15-live";
    section.setAttribute("aria-label","Aktueller Billing- und Planstatus");
    section.innerHTML = `
      <div class="container">
        <div class="cfs-plans-v15-live-grid">
          <article class="cfs-plans-v15-live-card primary">
            <span class="cfs-plans-v15-kicker">LIVE-KONFIGURATION</span>
            <h2>Was ist aktuell wirklich buchbar?</h2>
            <p>Diese Anzeige wird aus der öffentlichen Plan-Konfiguration des Servers geladen. Ein geplanter Preis ist nicht automatisch ein freigeschalteter Checkout.</p>
            <div class="cfs-plans-v15-config" id="cfsPlansV15Config">
              <div class="cfs-plans-v15-config-row">
                <span><strong>Planstatus wird geladen …</strong><small>Serverkonfiguration wird geprüft.</small></span>
                <span class="cfs-plans-v15-state">PRÜFUNG</span>
              </div>
            </div>
          </article>

          <article class="cfs-plans-v15-live-card">
            <span class="cfs-plans-v15-kicker">DEIN ACCOUNT</span>
            <h2 id="cfsPlansV15AccountTitle">Noch nicht angemeldet</h2>
            <p id="cfsPlansV15AccountText">Du kannst die Preise und Planlogik öffentlich vergleichen. Zum Buchen oder Verwalten eines Abos musst du angemeldet sein.</p>
            <div class="cfs-plans-v15-account" id="cfsPlansV15Account" hidden></div>
            <div class="cfs-plans-v15-actions" id="cfsPlansV15AccountActions">
              <a class="btn primary" href="/pages/login.html" data-login-link>ANMELDEN</a>
              <a class="btn" href="/pages/login.html#regForm" data-auth-cta>FREE STARTEN</a>
            </div>
          </article>
        </div>
      </div>`;

    const alert = document.createElement("div");
    alert.id = "cfsPlansV15Alert";
    alert.className = "cfs-plans-v15-alert";
    alert.hidden = true;

    hero.insertAdjacentElement("afterend",section);
    section.insertAdjacentElement("afterend",alert);
  }

  function renderConfig() {
    const host = document.getElementById("cfsPlansV15Config");
    if (!host) return;

    if (!catalog?.plans) {
      host.innerHTML = `
        <div class="cfs-plans-v15-config-row">
          <span><strong>Planstatus konnte nicht geladen werden.</strong><small>Die statische Planübersicht bleibt sichtbar.</small></span>
          <span class="cfs-plans-v15-state error">NICHT GELADEN</span>
        </div>`;
      return;
    }

    host.replaceChildren();

    for (const key of PLAN_KEYS) {
      const plan = catalogPlan(key);
      if (!plan) continue;

      const row = document.createElement("div");
      row.className = "cfs-plans-v15-config-row";

      const copy = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = `${safeText(plan.label,key.toUpperCase())} · ${euro(plan.price_eur_monthly)} / Monat`;

      const small = document.createElement("small");
      small.textContent = key === "free"
        ? "FREE benötigt keinen Checkout."
        : plan.checkout_available
          ? "Server meldet einen konfigurierten Checkout für diesen Plan."
          : "Preis ist im Katalog vorhanden, Checkout aber nicht freigeschaltet.";

      copy.append(strong,small);

      const state = document.createElement("span");
      state.className = `cfs-plans-v15-state${key === "free" || plan.checkout_available ? " ready" : ""}`;
      state.textContent = key === "free"
        ? "VERFÜGBAR"
        : plan.checkout_available
          ? "CHECKOUT BEREIT"
          : "NICHT BUCHBAR";

      row.append(copy,state);
      host.appendChild(row);
    }
  }

  function ensurePriceState(card,key) {
    if (!card) return null;

    let state = card.querySelector(".cfs-plan-v15-price-state");
    if (!state) {
      state = document.createElement("span");
      state.className = "cfs-plan-v15-price-state";
      card.querySelector(".product-price")?.insertAdjacentElement("afterend",state);
    }

    const plan = catalogPlan(key);
    if (!plan) {
      state.textContent = "Serverstatus nicht geladen";
      state.className = "cfs-plan-v15-price-state";
      return state;
    }

    if (key === "free") {
      state.textContent = "FREE ist verfügbar";
      state.className = "cfs-plan-v15-price-state ready";
    } else if (plan.checkout_available) {
      state.textContent = "Checkout ist serverseitig konfiguriert";
      state.className = "cfs-plan-v15-price-state ready";
    } else {
      state.textContent = "Geplanter Preis · aktuell kein öffentlicher Checkout";
      state.className = "cfs-plan-v15-price-state";
    }

    return state;
  }

  function ensureCheckoutAction(card,key) {
    if (!card || key === "free") return;

    let button = card.querySelector("[data-cfs-v15-checkout]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "btn cfs-plan-v15-checkout";
      button.dataset.cfsV15Checkout = key;
      card.appendChild(button);
    }

    const plan = catalogPlan(key);
    const checkoutReady = Boolean(plan?.checkout_available);
    const effective = String(billing?.effective_plan || me?.account?.plan || "free").toLowerCase();
    const sub = billing?.subscription || {};
    const isCurrent = effective === key;

    button.onclick = null;
    button.disabled = false;

    if (!checkoutReady) {
      button.textContent = "NOCH NICHT BUCHBAR";
      button.disabled = true;
      return;
    }

    if (!me?.authenticated) {
      button.textContent = "ANMELDEN ZUM BUCHEN";
      button.onclick = () => { location.href = "/pages/login.html"; };
      return;
    }

    if (isCurrent) {
      button.textContent = "AKTUELLER PLAN";
      button.disabled = true;
      return;
    }

    if (sub.configured && sub.access_active) {
      button.textContent = "ÜBER BILLING VERWALTEN";
      button.onclick = openPortal;
      button.disabled = !billing?.portal_available;
      return;
    }

    button.textContent = `${key.toUpperCase()} BUCHEN`;
    button.classList.add("primary");
    button.onclick = () => checkout(key);
  }

  function renderPlanCards() {
    for (const key of PLAN_KEYS) {
      const card = planCard(key);
      if (!card) continue;

      card.classList.add("cfs-plan-card-v15");
      card.classList.toggle("cfs-current-plan",String(billing?.effective_plan || me?.account?.plan || "").toLowerCase() === key);

      const plan = catalogPlan(key);
      const price = card.querySelector(".product-price");
      if (price && plan) {
        const small = key === "free"
          ? "/ Monat"
          : plan.checkout_available
            ? "/ Monat"
            : "/ Monat · geplant";

        price.innerHTML = `${euro(plan.price_eur_monthly)} <small>${small}</small>`;
      }

      ensurePriceState(card,key);
      ensureCheckoutAction(card,key);
    }
  }

  function renderAccount() {
    const title = document.getElementById("cfsPlansV15AccountTitle");
    const text = document.getElementById("cfsPlansV15AccountText");
    const box = document.getElementById("cfsPlansV15Account");
    const actions = document.getElementById("cfsPlansV15AccountActions");
    if (!title || !text || !box || !actions) return;

    if (!me?.authenticated) {
      title.textContent = "Noch nicht angemeldet";
      text.textContent = "Du kannst die Planlogik öffentlich vergleichen. Zum Buchen oder Verwalten eines Abos musst du angemeldet sein.";
      box.hidden = true;
      return;
    }

    title.textContent = "Dein aktueller Planstatus";
    text.textContent = "Billing-Zugriff und Planrechte bleiben getrennt. Ein Beta-Zugang ändert deinen bezahlten Plan nicht automatisch.";

    box.hidden = false;
    box.innerHTML = `
      <div class="cfs-plans-v15-account-row"><span>Plan</span><strong>${safeText(billing?.plan || me?.account?.plan || "free").toUpperCase()}</strong></div>
      <div class="cfs-plans-v15-account-row"><span>Effektiver Zugriff</span><strong>${safeText(billing?.effective_plan || me?.account?.plan || "free").toUpperCase()}</strong></div>
      <div class="cfs-plans-v15-account-row"><span>Zugriffsquelle</span><strong>${safeText(billing?.access_source || "plan").replaceAll("_"," ").toUpperCase()}</strong></div>
      <div class="cfs-plans-v15-account-row"><span>Abo-Status</span><strong>${safeText(billing?.subscription?.status || "none").toUpperCase()}</strong></div>`;

    actions.replaceChildren();

    const account = document.createElement("a");
    account.className = "btn";
    account.href = "/pages/account.html";
    account.textContent = "ACCOUNT ÖFFNEN";
    actions.appendChild(account);

    if (billing?.subscription?.configured) {
      const portal = document.createElement("button");
      portal.type = "button";
      portal.className = "btn primary";
      portal.textContent = "BILLING VERWALTEN";
      portal.disabled = !billing?.portal_available;
      portal.addEventListener("click",openPortal);
      actions.appendChild(portal);
    }
  }

  async function checkout(plan) {
    try {
      alertBox("Checkout wird vorbereitet …");
      const result = await json("/api/creator/billing/checkout",{
        method:"POST",
        body:JSON.stringify({plan})
      });
      if (!result?.url) throw new Error("Checkout URL fehlt.");
      location.href = result.url;
    } catch (error) {
      alertBox(error?.message || "Checkout konnte nicht erstellt werden.","bad");
    }
  }

  async function openPortal() {
    try {
      alertBox("Billing-Portal wird vorbereitet …");
      const result = await json("/api/creator/billing/portal",{
        method:"POST",
        body:"{}"
      });
      if (!result?.url) throw new Error("Portal URL fehlt.");
      location.href = result.url;
    } catch (error) {
      alertBox(error?.message || "Billing-Portal konnte nicht geöffnet werden.","bad");
    }
  }

  async function loadData() {
    try {
      catalog = await json("/api/plans/catalog");
    } catch (error) {
      catalog = null;
      alertBox("Der aktuelle Server-Planstatus konnte nicht geladen werden. Es wird nur die statische Übersicht angezeigt.","bad");
    }

    try {
      me = window.CFS?.me ? await window.CFS.me() : null;
    } catch {
      me = null;
    }

    if (me?.authenticated) {
      try {
        billing = await json("/api/creator/billing/status");
      } catch {
        billing = null;
      }
    }

    renderConfig();
    renderAccount();
    renderPlanCards();
  }

  function handleReturnState() {
    const params = new URLSearchParams(location.search);
    const state = params.get("billing");

    if (state === "success") {
      alertBox("Checkout wurde abgeschlossen. Der endgültige Abo-Status wird serverseitig über den signierten Billing-Webhook aktualisiert.","ok");

      let tries = 0;
      const timer = setInterval(async () => {
        tries += 1;
        if (me?.authenticated) {
          try {
            billing = await json("/api/creator/billing/status");
            renderAccount();
            renderPlanCards();
          } catch {}
        }
        if (billing?.subscription?.access_active || tries >= 8) clearInterval(timer);
      },1200);
    } else if (state === "cancel") {
      alertBox("Checkout wurde abgebrochen. Es wurde durch diese Seite kein Planwechsel bestätigt.");
    }

    if (state) {
      const clean = new URL(location.href);
      clean.searchParams.delete("billing");
      clean.searchParams.delete("session_id");
      history.replaceState(null,"",`${clean.pathname}${clean.search}${clean.hash}`);
    }
  }

  function init() {
    document.body.classList.add("cfs-plans-v15");
    injectLiveStatus();
    loadData().finally(handleReturnState);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-PLANS-V15 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-SUPPORT-V16 ===== */


(() => {
  "use strict";

  const path = location.pathname.toLowerCase();
  const CONTEXT_KEY = "cfs_support_recovery_context_v16";

  const TRIAGE = [
    {
      icon:"◎",
      title:"Account oder Login",
      text:"Login, Passwort, Passkey, 2FA oder Sitzung zuerst über die vorgesehenen Account- und Recovery-Wege prüfen.",
      category:"account",
      priority:"normal",
      subject:"Problem mit Account oder Login",
      links:[
        ["ACCOUNT","/pages/account.html"],
        ["RECOVERY","/pages/forgot-password.html"]
      ]
    },
    {
      icon:"▦",
      title:"Widget oder Stream",
      text:"Bei Creator-Tools zuerst Dashboard, Widget Studio bzw. Stream Studio öffnen und den betroffenen Schritt eingrenzen.",
      category:"technical",
      priority:"normal",
      subject:"Technisches Problem in Creator-Tool",
      links:[
        ["WIDGETS","/pages/widget-studio.html"],
        ["STREAM","/pages/stream-studio.html"]
      ]
    },
    {
      icon:"↗",
      title:"TikTok oder Launcher",
      text:"Verbindungsstatus prüfen, bevor du neu verbindest. TikTok und Launcher sind getrennte optionale Verbindungen.",
      category:"technical",
      priority:"normal",
      subject:"Problem mit TikTok oder Launcher",
      links:[
        ["INTEGRATIONEN","/pages/integrations.html"],
        ["LAUNCHER","/pages/launcher.html"]
      ]
    },
    {
      icon:"!",
      title:"Sicherheit oder Datenschutz",
      text:"Keine Secrets mitsenden. Bei offengelegten Zugangsdaten zuerst widerrufen oder ändern und erst danach privat melden.",
      category:"security",
      priority:"high",
      subject:"Private Sicherheits- oder Datenschutzmeldung",
      links:[
        ["SICHERHEIT","/pages/security.html"],
        ["DATENSCHUTZ","/pages/datenschutz.html"]
      ]
    }
  ];

  let publicStatus = null;

  function safePath(value) {
    try {
      const url = new URL(value,location.origin);
      if (url.origin !== location.origin) return "/";
      return url.pathname;
    } catch {
      return "/";
    }
  }

  function rememberContext(kind,sourcePath) {
    const payload = {
      kind:String(kind || "technical").slice(0,40),
      path:safePath(sourcePath || location.pathname),
      at:Date.now()
    };
    try { sessionStorage.setItem(CONTEXT_KEY,JSON.stringify(payload)); } catch {}
  }

  function loadContext() {
    try {
      const raw = JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || "null");
      if (!raw || typeof raw !== "object") return null;
      if (!raw.path || Date.now() - Number(raw.at || 0) > 2 * 60 * 60 * 1000) return null;
      return {kind:String(raw.kind || "technical"),path:safePath(raw.path),at:Number(raw.at || 0)};
    } catch {
      return null;
    }
  }

  async function loadPublicStatus() {
    try {
      const response = await fetch("/api/public/status",{
        credentials:"same-origin",
        headers:{Accept:"application/json"}
      });
      const data = await response.json().catch(() => ({}));
      publicStatus = {
        ok:Boolean(data?.ok),
        status:String(data?.status || (response.ok ? "online" : "degraded")).toLowerCase(),
        message:String(data?.message || "").trim()
      };
    } catch {
      publicStatus = {ok:false,status:"error",message:"Status konnte gerade nicht geladen werden."};
    }
    return publicStatus;
  }

  function statusLabel(status) {
    const map = {
      online:"ONLINE",
      degraded:"EINGESCHRÄNKT",
      maintenance:"WARTUNG",
      readonly:"EINGESCHRÄNKT",
      error:"NICHT GELADEN"
    };
    return map[status] || status.toUpperCase();
  }

  function statusCopy(status) {
    if (!status) return "Status wird geladen …";
    if (status.message) return status.message;
    if (status.status === "online") return "Der öffentliche Status meldet aktuell keinen bekannten Ausfall.";
    if (status.status === "maintenance") return "Der Dienst befindet sich laut öffentlichem Status in Wartung.";
    if (status.status === "degraded" || status.status === "readonly") return "Der Dienst meldet aktuell einen eingeschränkten Zustand.";
    return "Der öffentliche Status konnte gerade nicht vollständig geprüft werden.";
  }

  function setFormPreset(item) {
    const form = document.querySelector("[data-support-report]");
    if (!form) return;

    const category = form.elements.namedItem("category");
    const priority = form.elements.namedItem("priority");
    const subject = form.elements.namedItem("subject");

    if (category) category.value = item.category;
    if (priority) priority.value = item.priority;
    if (subject && !String(subject.value || "").trim()) subject.value = item.subject;

    const report = document.getElementById("support-report");
    report?.scrollIntoView({behavior:"smooth",block:"start"});

    setTimeout(() => subject?.focus?.({preventScroll:true}),280);
  }

  function triageCard(item) {
    const article = document.createElement("article");
    article.className = "cfs-support-v16-choice";

    const icon = document.createElement("i");
    icon.textContent = item.icon;

    const title = document.createElement("strong");
    title.textContent = item.title;

    const text = document.createElement("p");
    text.textContent = item.text;

    const actions = document.createElement("div");
    actions.className = "cfs-support-v16-choice-actions";

    item.links.forEach(([label,href]) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      actions.appendChild(a);
    });

    const report = document.createElement("button");
    report.type = "button";
    report.className = "primary";
    report.textContent = "MELDUNG VORBEREITEN";
    report.addEventListener("click",() => setFormPreset(item));
    actions.appendChild(report);

    article.append(icon,title,text,actions);
    return article;
  }

  function installSupportTriage() {
    if (path !== "/pages/support.html" || document.getElementById("cfsSupportV16Triage")) return;

    const hero = document.querySelector(".support-hero");
    if (!hero) return;

    const context = loadContext();

    const section = document.createElement("section");
    section.id = "cfsSupportV16Triage";
    section.className = "cfs-support-v16-triage";
    section.setAttribute("aria-label","Support Problem-Lotse");

    const head = document.createElement("div");
    head.className = "cfs-support-v16-head";
    head.innerHTML = `
      <div>
        <span>PROBLEM-LOTSE</span>
        <h2>ERST EINGRENZEN, DANN MELDEN.</h2>
        <p>Wähle den Bereich, der am besten passt. Wir zeigen dir zuerst den direkten Selbsthilfe-Weg und bereiten nur bei Bedarf die private Meldung vor.</p>
      </div>
      <div class="cfs-support-v16-status">
        <small>ÖFFENTLICHER SYSTEMSTATUS</small>
        <strong id="cfsSupportV16Status">WIRD GELADEN</strong>
        <p id="cfsSupportV16StatusCopy">Status wird sicher abgefragt …</p>
      </div>`;

    const grid = document.createElement("div");
    grid.className = "cfs-support-v16-grid";
    TRIAGE.forEach(item => grid.appendChild(triageCard(item)));

    section.append(head,grid);

    const contextNode = document.createElement("div");
    contextNode.className = "cfs-support-v16-context";
    contextNode.id = "cfsSupportV16Context";
    contextNode.hidden = !context;
    if (context) {
      const label = context.kind === "not_found" ? "404-Seite" : "technischen Fehlerseite";
      contextNode.textContent = `Du kommst aus einer ${label}. Als sichere Quelle wurde nur der Pfad „${context.path}“ gemerkt – keine Query-Parameter, Tokens oder Formulardaten.`;
    }
    section.appendChild(contextNode);

    hero.insertAdjacentElement("afterend",section);

    loadPublicStatus().then(status => {
      const strong = document.getElementById("cfsSupportV16Status");
      const copy = document.getElementById("cfsSupportV16StatusCopy");
      if (strong) {
        strong.textContent = statusLabel(status.status);
        strong.className = status.status;
      }
      if (copy) copy.textContent = statusCopy(status);
    });

    installDiagnostics(context);
  }

  function diagnosticText(context) {
    const view = innerWidth <= 760 ? "mobile" : innerWidth <= 1100 ? "tablet" : "desktop";
    const lines = [
      "--- Sichere Diagnose ---",
      `Quelle: ${context?.path || "/pages/support.html"}`,
      `Systemstatus: ${publicStatus?.status || "nicht geprüft"}`,
      `Browser online: ${navigator.onLine ? "ja" : "nein"}`,
      `Ansicht: ${view}`,
      "--- Ende Diagnose ---"
    ];
    return lines.join("\n");
  }

  function installDiagnostics(context) {
    const form = document.querySelector("[data-support-report]");
    if (!form || form.querySelector(".cfs-support-v16-diagnostics")) return;

    const note = document.createElement("div");
    note.className = "cfs-support-v16-diagnostics";
    note.innerHTML = `
      <div class="cfs-support-v16-diagnostics-head">
        <div>
          <strong>Sichere Diagnose hinzufügen</strong>
          <p>Optional. Fügt nur Pfad, öffentlichen Systemstatus, Online-Status und Ansichtsgröße hinzu. Keine URL-Parameter, Cookies, Tokens oder Passwörter.</p>
        </div>
      </div>`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "DIAGNOSE EINFÜGEN";
    note.querySelector(".cfs-support-v16-diagnostics-head").appendChild(button);

    button.addEventListener("click",async () => {
      if (!publicStatus) await loadPublicStatus();

      const message = form.elements.namedItem("message");
      if (!message) return;

      const marker = "--- Sichere Diagnose ---";
      if (String(message.value || "").includes(marker)) {
        button.textContent = "DIAGNOSE BEREITS ENTHALTEN";
        button.disabled = true;
        return;
      }

      const current = String(message.value || "").trim();
      message.value = `${current}${current ? "\n\n" : ""}${diagnosticText(context)}`;
      message.dispatchEvent(new Event("input",{bubbles:true}));
      message.focus({preventScroll:true});
      button.textContent = "DIAGNOSE EINGEFÜGT";
      button.disabled = true;
    });

    const notice = form.querySelector(".support-form-notice");
    if (notice) notice.insertAdjacentElement("afterend",note);
    else form.appendChild(note);
  }

  function supportFromErrorLink() {
    document.querySelectorAll('a[href^="/pages/support.html"]').forEach(link => {
      if (link.dataset.cfsRecoveryV16 === "1") return;
      link.dataset.cfsRecoveryV16 = "1";

      link.addEventListener("click",() => {
        if (path === "/pages/error.html") rememberContext("technical_error",path);
        if (path === "/pages/not-found.html") rememberContext("not_found",path);
      });
    });
  }

  function installRecoveryPanel() {
    if (!["/pages/error.html","/pages/not-found.html"].includes(path)) return;
    if (document.querySelector(".cfs-recovery-v16")) return;

    const card = document.querySelector("main .card");
    if (!card) return;

    const is404 = path === "/pages/not-found.html";
    const panel = document.createElement("section");
    panel.className = "cfs-recovery-v16";
    panel.innerHTML = `
      <span>${is404 ? "404 · NÄCHSTER SCHRITT" : "FEHLER · NÄCHSTER SCHRITT"}</span>
      <h2>${is404 ? "DER LINK ENDET HIER – DEINE DATEN NICHT." : "PRÜFE ZUERST, OB DER DIENST GERADE ERREICHBAR IST."}</h2>
      <p>${is404
        ? "Ein 404 ändert weder Account noch Creator-Daten. Öffne den passenden Hauptbereich oder melde einen wiederholt falschen Link privat."
        : "Die Fehlerseite zeigt bewusst keine internen Details. Nutze den öffentlichen Status und melde nur reproduzierbare Probleme über den privaten Weg."}</p>
      <div class="cfs-recovery-v16-steps">
        <div class="cfs-recovery-v16-step"><b>01</b><strong>${is404 ? "Ziel neu öffnen" : "Status prüfen"}</strong></div>
        <div class="cfs-recovery-v16-step"><b>02</b><strong>${is404 ? "Navigation verwenden" : "Erneut versuchen"}</strong></div>
        <div class="cfs-recovery-v16-step"><b>03</b><strong>Nur bei Bedarf melden</strong></div>
      </div>
      <div class="cfs-recovery-v16-actions">
        <a class="btn primary" href="${is404 ? "/pages/creator-suite.html" : "/api/public/status"}">${is404 ? "CREATOR SUITE" : "SYSTEMSTATUS"}</a>
        <a class="btn" href="/pages/dashboard.html">DASHBOARD</a>
        <a class="btn" href="/pages/support.html#support-report" data-cfs-recovery-support>PRIVAT MELDEN</a>
      </div>
      <div class="cfs-recovery-v16-status" id="cfsRecoveryV16Status">Öffentlicher Status wird geprüft …</div>`;

    card.appendChild(panel);

    panel.querySelector("[data-cfs-recovery-support]")?.addEventListener("click",() => {
      rememberContext(is404 ? "not_found" : "technical_error",path);
    });

    loadPublicStatus().then(status => {
      const node = document.getElementById("cfsRecoveryV16Status");
      if (!node) return;
      node.textContent = `Systemstatus: ${statusLabel(status.status)}${status.message ? ` · ${status.message}` : ""}`;
      node.classList.toggle("ok",status.status === "online");
      node.classList.toggle("warn",status.status !== "online");
    });
  }

  function prefillFromContext() {
    if (path !== "/pages/support.html") return;
    const context = loadContext();
    if (!context) return;

    const form = document.querySelector("[data-support-report]");
    if (!form) return;

    const category = form.elements.namedItem("category");
    const priority = form.elements.namedItem("priority");
    const subject = form.elements.namedItem("subject");

    if (category) category.value = "technical";
    if (priority) priority.value = "normal";
    if (subject && !String(subject.value || "").trim()) {
      subject.value = context.kind === "not_found"
        ? "Wiederholt falscher oder veralteter Link"
        : "Wiederholt auftretender technischer Fehler";
      subject.dispatchEvent(new Event("input",{bubbles:true}));
    }
  }

  function init() {
    supportFromErrorLink();
    installRecoveryPanel();
    installSupportTriage();
    prefillFromContext();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-SUPPORT-V16 ===== */
;

/* ===== BEGIN CONSOLIDATED LAYER CFS-SECURITY-V17 ===== */


(() => {
  "use strict";

  const path = location.pathname.toLowerCase();

  async function safeJson(url) {
    try {
      if (window.CFS?.json) return await window.CFS.json(url);
      const response = await fetch(url,{credentials:"same-origin",headers:{Accept:"application/json"}});
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  function openSecurityTab() {
    const tab = document.querySelector('[data-account-tab="security"]');
    if (tab) {
      tab.click();
      setTimeout(() => {
        document.querySelector('[data-account-panel="security"]')?.scrollIntoView({behavior:"smooth",block:"start"});
      },80);
    }
  }

  function focusField(id) {
    openSecurityTab();
    setTimeout(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView?.({behavior:"smooth",block:"center"});
      setTimeout(() => target?.focus?.({preventScroll:true}),220);
    },180);
  }

  function securityStep(index,title,text,badge,state="") {
    const article = document.createElement("article");
    article.className = `cfs-security-v17-step${state ? ` ${state}` : ""}`;
    article.dataset.cfsSecurityStep = String(index);

    const top = document.createElement("div");
    top.className = "cfs-security-v17-step-top";

    const number = document.createElement("span");
    number.className = "cfs-security-v17-step-number";
    number.textContent = state === "done" ? "✓" : String(index).padStart(2,"0");

    const badgeNode = document.createElement("span");
    badgeNode.className = "cfs-security-v17-step-badge";
    badgeNode.textContent = badge;

    top.append(number,badgeNode);

    const strong = document.createElement("strong");
    strong.textContent = title;

    const p = document.createElement("p");
    p.textContent = text;

    article.append(top,strong,p);
    return article;
  }

  async function installSecurityOverview() {
    if (path !== "/pages/account.html") return;

    const panel = document.querySelector('[data-account-panel="security"]');
    const intro = panel?.querySelector(".account-section-intro");
    if (!panel || !intro || document.getElementById("cfsSecurityV17Overview")) return;

    const shell = document.createElement("section");
    shell.id = "cfsSecurityV17Overview";
    shell.className = "cfs-security-v17-overview";
    shell.setAttribute("aria-label","Sicherheits-Setup");
    shell.innerHTML = `
      <div class="cfs-security-v17-head">
        <div>
          <span>SICHERHEITS-SETUP</span>
          <h2>Erst Zugang sichern, dann Recovery ergänzen.</h2>
          <p>Passkey und Authenticator erfüllen unterschiedliche Rollen. Du musst nicht alles gleichzeitig einrichten. Der nächste sinnvolle Schritt wird aus deinem aktuellen Accountstatus abgeleitet.</p>
        </div>
        <div class="cfs-security-v17-score" aria-live="polite">
          <small>GRUNDSCHUTZ</small>
          <strong id="cfsSecurityV17Score">WIRD GEPRÜFT</strong>
          <em id="cfsSecurityV17ScoreSub">Accountstatus wird geladen …</em>
        </div>
      </div>
      <div class="cfs-security-v17-grid" id="cfsSecurityV17Grid"></div>
      <div class="cfs-security-v17-next">
        <div class="cfs-security-v17-next-copy">
          <span>NÄCHSTER SINNVOLLER SCHRITT</span>
          <strong id="cfsSecurityV17NextTitle">Status wird geprüft …</strong>
          <p id="cfsSecurityV17NextText">Einen Moment – Sicherheitsstatus wird geladen.</p>
        </div>
        <div class="cfs-security-v17-next-actions" id="cfsSecurityV17NextActions"></div>
      </div>`;

    intro.insertAdjacentElement("afterend",shell);

    let me = null;
    try { me = await window.CFS?.me?.(); } catch {}

    const [passkeys,mfa] = await Promise.all([
      safeJson("/api/account/passkeys"),
      safeJson("/api/account/mfa")
    ]);

    const emailVerified = Boolean(me?.account?.email_verified);
    const passkeyCount = Array.isArray(passkeys?.passkeys) ? passkeys.passkeys.length : 0;
    const mfaEnabled = Boolean(mfa?.enabled);
    const recoveryRemaining = Number(mfa?.recovery_codes_remaining || 0);

    const grid = document.getElementById("cfsSecurityV17Grid");
    if (!grid) return;

    const requiredDone = Number(emailVerified) + Number(passkeyCount > 0 || mfaEnabled);

    grid.append(
      securityStep(
        1,
        "E-Mail bestätigt",
        "Bestätigt, dass du Zugriff auf die Account-Adresse hast.",
        emailVerified ? "BESTÄTIGT" : "OFFEN",
        emailVerified ? "done" : "current"
      ),
      securityStep(
        2,
        "Starker Login-Schutz",
        passkeyCount > 0
          ? `${passkeyCount} Passkey${passkeyCount === 1 ? "" : "s"} vorhanden.`
          : mfaEnabled
            ? "Authenticator ist aktiv. Ein Passkey kann den Login zusätzlich vereinfachen."
            : "Richte einen Passkey oder eine Authenticator-App ein.",
        passkeyCount > 0 ? "PASSKEY AKTIV" : mfaEnabled ? "2FA AKTIV" : "OFFEN",
        passkeyCount > 0 || mfaEnabled ? "done" : emailVerified ? "current" : ""
      ),
      securityStep(
        3,
        "Authenticator als Backup",
        mfaEnabled
          ? "TOTP ist aktiv und kann als zweiter Faktor verwendet werden."
          : "Optional: Authenticator-App als unabhängigen zweiten Faktor ergänzen.",
        mfaEnabled ? "AKTIV" : "OPTIONAL",
        mfaEnabled ? "done" : "optional"
      ),
      securityStep(
        4,
        "Recovery vorbereitet",
        mfaEnabled
          ? recoveryRemaining > 0
            ? `${recoveryRemaining} Recovery-Code${recoveryRemaining === 1 ? "" : "s"} verbleiben.`
            : "Keine verbleibenden Recovery-Codes gemeldet."
          : "Recovery-Codes werden relevant, sobald TOTP aktiv ist.",
        mfaEnabled ? recoveryRemaining > 0 ? `${recoveryRemaining} VERBLEIBEND` : "PRÜFEN" : "SPÄTER",
        mfaEnabled && recoveryRemaining > 0 ? "done" : "optional"
      )
    );

    const score = document.getElementById("cfsSecurityV17Score");
    const scoreSub = document.getElementById("cfsSecurityV17ScoreSub");
    const title = document.getElementById("cfsSecurityV17NextTitle");
    const text = document.getElementById("cfsSecurityV17NextText");
    const actions = document.getElementById("cfsSecurityV17NextActions");

    if (score) score.textContent = requiredDone === 2 ? "GRUNDLAGE STEHT" : `${requiredDone}/2`;
    if (scoreSub) {
      scoreSub.textContent = requiredDone === 2
        ? "E-Mail + starker Login-Schutz vorhanden."
        : "Für den Grundschutz zählen E-Mail und mindestens ein starker Login-Faktor.";
    }

    function addAction(label,{href="",field="",primary=false,help=""}={}) {
      const node = href ? document.createElement("a") : document.createElement("button");
      if (!href) node.type = "button";
      node.textContent = label;
      if (href) node.href = href;
      if (primary) node.classList.add("primary");

      if (field) node.addEventListener("click",() => focusField(field));
      if (help) node.addEventListener("click",() => window.CFSHelpV6?.open?.(help));

      actions?.appendChild(node);
    }

    if (!emailVerified) {
      title.textContent = "E-Mail-Adresse bestätigen";
      text.textContent = "Bestätige zuerst deine Account-Adresse. Danach richtest du den eigentlichen Login-Schutz ein.";
      addAction("E-MAIL BESTÄTIGEN",{href:"/pages/verify-email.html",primary:true});
      addAction("WARUM?",{help:"email"});
    } else if (passkeyCount === 0 && !mfaEnabled) {
      title.textContent = "Einen starken Login-Faktor einrichten";
      text.textContent = "Ein Passkey ist der einfachste Einstieg. Alternativ kannst du direkt eine Authenticator-App verwenden.";
      addAction("PASSKEY HINZUFÜGEN",{field:"passkeyLabel",primary:true});
      addAction("2FA EINRICHTEN",{field:"mfaSetupPassword"});
    } else if (mfaEnabled && recoveryRemaining <= 2) {
      title.textContent = "Recovery-Codes erneuern";
      text.textContent = "Dein Grundschutz steht, aber nur wenige oder keine Recovery-Codes sind noch verfügbar.";
      addAction("RECOVERY-CODES ERNEUERN",{field:"mfaRecoveryPassword",primary:true});
      if (passkeyCount === 0) addAction("PASSKEY ERGÄNZEN",{field:"passkeyLabel"});
    } else if (passkeyCount > 0 && !mfaEnabled) {
      title.textContent = "Grundschutz steht";
      text.textContent = "Dein Passkey schützt den Login. Eine Authenticator-App ist jetzt eine optionale zusätzliche Backup-Methode.";
      addAction("2FA OPTIONAL EINRICHTEN",{field:"mfaSetupPassword"});
      addAction("SITZUNGEN PRÜFEN",{href:"/pages/account.html#account-sessions"});
    } else {
      title.textContent = "Sicherheits-Grundsetup vollständig";
      text.textContent = "E-Mail, starker Login-Schutz und Recovery-Bausteine sind vorhanden. Prüfe gelegentlich Passkeys und aktive Sitzungen.";
      addAction("SITZUNGEN PRÜFEN",{href:"/pages/account.html#account-sessions",primary:true});
      addAction("SICHERHEIT ERKLÄREN",{help:"passkey"});
    }
  }

  function addPasskeyExplanation() {
    if (path !== "/pages/account.html") return;

    const form = document.getElementById("passkeyAddForm");
    if (!form || form.previousElementSibling?.classList.contains("cfs-security-v17-explain")) return;

    const box = document.createElement("div");
    box.className = "cfs-security-v17-explain";
    box.innerHTML = `
      <strong>Was passiert beim Hinzufügen?</strong>
      <p>Nach der Passwortbestätigung öffnet dein Browser bzw. Betriebssystem den WebAuthn-Dialog. Erst wenn du diesen bestätigst, wird der neue Passkey serverseitig gespeichert.</p>
      <div class="cfs-security-v17-sequence">
        <div><b>01</b><span>Passkey benennen</span></div>
        <div><b>02</b><span>Passwort bestätigen</span></div>
        <div><b>03</b><span>Browser/Windows Hello bestätigen</span></div>
      </div>`;
    form.insertAdjacentElement("beforebegin",box);
  }

  function addMfaExplanation() {
    if (path !== "/pages/account.html") return;

    const setup = document.getElementById("mfaSetupBlock");
    if (!setup || setup.querySelector(".cfs-security-v17-explain")) return;

    const box = document.createElement("div");
    box.className = "cfs-security-v17-explain";
    box.innerHTML = `
      <strong>Authenticator in zwei Schritten</strong>
      <p>Zuerst wird ein neues TOTP-Secret erzeugt. Danach musst du einen aktuellen 6-stelligen Code eingeben. Erst dann ist 2FA wirklich aktiv.</p>`;
    setup.prepend(box);

    const enroll = document.getElementById("mfaEnrollBlock");
    if (enroll && !enroll.querySelector(".cfs-security-v17-sequence")) {
      const sequence = document.createElement("div");
      sequence.className = "cfs-security-v17-sequence";
      sequence.innerHTML = `
        <div><b>01</b><span>Secret in Authenticator-App speichern</span></div>
        <div><b>02</b><span>Aktuellen 6-stelligen Code erzeugen</span></div>
        <div><b>03</b><span>Code hier bestätigen</span></div>`;
      enroll.prepend(sequence);
    }
  }

  function wrapMfaDisable() {
    if (path !== "/pages/account.html") return;

    const form = document.getElementById("mfaDisableForm");
    if (!form || form.closest(".cfs-security-v17-danger")) return;

    const details = document.createElement("details");
    details.className = "cfs-security-v17-danger";

    const summary = document.createElement("summary");
    summary.textContent = "2FA deaktivieren";

    const body = document.createElement("div");
    body.className = "cfs-security-v17-danger-body";

    form.parentNode.insertBefore(details,form);
    details.append(summary,body);
    body.appendChild(form);
  }

  function addRecoveryActions() {
    if (path !== "/pages/account.html") return;

    const block = document.getElementById("mfaCodesBlock");
    const codes = document.getElementById("mfaRecoveryCodes");
    if (!block || !codes || block.querySelector(".cfs-security-v17-recovery-actions")) return;

    const actions = document.createElement("div");
    actions.className = "cfs-security-v17-recovery-actions";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "RECOVERY-CODES KOPIEREN";
    copy.addEventListener("click",async () => {
      const value = String(codes.textContent || "").trim();
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        copy.textContent = "KOPIERT";
        window.CFSA11yV12?.announce?.("Recovery-Codes wurden in die Zwischenablage kopiert.");
      } catch {
        copy.textContent = "KOPIEREN NICHT MÖGLICH";
      }
    });

    actions.appendChild(copy);

    const note = document.createElement("div");
    note.className = "cfs-security-v17-recovery-note";
    note.textContent = "Zwischenablagen können von anderer Software gelesen werden. Speichere Recovery-Codes anschließend an einem sicheren Ort außerhalb dieses Browsers und lösche unnötige Kopien.";

    block.append(actions,note);
  }

  function installLoginMethodChooser() {
    if (path !== "/pages/login.html") return;

    const form = document.getElementById("mfaLoginForm");
    if (!form || form.dataset.cfsSecurityV17 === "1") return;
    form.dataset.cfsSecurityV17 = "1";

    const totpField = document.getElementById("mfaTotpField");
    const recoveryField = document.getElementById("mfaRecoveryField");
    const submit = document.getElementById("mfaLoginButton");
    const passkey = document.getElementById("passkeyLoginButton");

    const chooser = document.createElement("div");
    chooser.className = "cfs-security-v17-login-methods";
    chooser.hidden = true;
    chooser.innerHTML = `
      <strong>Zweiten Faktor auswählen</strong>
      <p>Verwende bevorzugt Passkey oder Authenticator. Recovery-Codes sind Einmalcodes für den Notfall.</p>
      <div class="cfs-security-v17-login-tabs" role="tablist" aria-label="Methode für zweiten Faktor"></div>
      <div class="cfs-security-v17-login-note" id="cfsSecurityV17LoginNote"></div>`;

    form.prepend(chooser);
    const tabs = chooser.querySelector(".cfs-security-v17-login-tabs");
    const note = chooser.querySelector("#cfsSecurityV17LoginNote");

    function originalAvailable(node,key) {
      const attr = `cfsV17Available${key}`;
      if (!(attr in node.dataset)) node.dataset[attr] = node.hidden ? "0" : "1";
      return node.dataset[attr] === "1";
    }

    function setMethod(method,available) {
      if (!available[method]) return;

      totpField.classList.toggle("cfs-security-v17-hidden-method",method !== "totp");
      recoveryField.classList.toggle("cfs-security-v17-hidden-method",method !== "recovery");

      const codeMode = method === "totp" || method === "recovery";
      submit.classList.toggle("cfs-security-v17-hidden-method",!codeMode);
      passkey.classList.toggle("cfs-security-v17-hidden-method",method !== "passkey");

      tabs.querySelectorAll("button").forEach(button => {
        const active = button.dataset.method === method;
        button.classList.toggle("active",active);
        button.setAttribute("aria-selected",active ? "true" : "false");
      });

      document.getElementById("mfaCode").required = method === "totp";
      document.getElementById("mfaRecoveryCode").required = method === "recovery";

      if (method === "passkey") {
        note.textContent = "Passkey bestätigt den zweiten Faktor über deinen Browser bzw. Windows Hello.";
        note.classList.remove("warn");
        setTimeout(() => passkey.focus(),20);
      } else if (method === "totp") {
        note.textContent = "Gib den aktuellen 6-stelligen Code deiner Authenticator-App ein.";
        note.classList.remove("warn");
        setTimeout(() => document.getElementById("mfaCode")?.focus(),20);
      } else {
        note.textContent = "Recovery-Codes sind nur für den Notfall und jeder Code wird nach erfolgreicher Verwendung verbraucht.";
        note.classList.add("warn");
        setTimeout(() => document.getElementById("mfaRecoveryCode")?.focus(),20);
      }
    }

    function buildChooser() {
      if (form.hidden) return;

      const available = {
        totp:originalAvailable(totpField,"Totp"),
        recovery:originalAvailable(recoveryField,"Recovery"),
        passkey:originalAvailable(passkey,"Passkey")
      };

      const methods = [
        ["passkey","PASSKEY"],
        ["totp","AUTHENTICATOR"],
        ["recovery","RECOVERY-CODE"]
      ].filter(([key]) => available[key]);

      if (!methods.length) return;

      chooser.hidden = false;
      tabs.replaceChildren();

      methods.forEach(([key,label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.role = "tab";
        button.dataset.method = key;
        button.textContent = label;
        button.addEventListener("click",() => setMethod(key,available));
        tabs.appendChild(button);
      });

      const defaultMethod = available.passkey ? "passkey" : available.totp ? "totp" : "recovery";
      setMethod(defaultMethod,available);
    }

    new MutationObserver(buildChooser).observe(form,{attributes:true,attributeFilter:["hidden"]});
    buildChooser();
  }

  function init() {
    if (path === "/pages/account.html") {
      installSecurityOverview();
      addPasskeyExplanation();
      addMfaExplanation();
      wrapMfaDisable();
      addRecoveryActions();
    }

    if (path === "/pages/login.html") {
      installLoginMethodChooser();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();

/* ===== END CONSOLIDATED LAYER CFS-SECURITY-V17 ===== */
;

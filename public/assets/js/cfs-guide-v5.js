
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

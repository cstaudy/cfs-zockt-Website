
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

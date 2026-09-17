
const CFS = {
  csrfToken() {
    const cookies = String(document.cookie || "").split(";");
    const names = ["__Host-cfs_csrf", "cfs_csrf_dev"];
    for (const name of names) {
      const prefix = `${name}=`;
      const row = cookies.map(value => value.trim()).find(value => value.startsWith(prefix));
      if (row) return decodeURIComponent(row.slice(prefix.length));
    }
    return "";
  },

  async json(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const method = String(options.method || "GET").toUpperCase();
    const target = new URL(url, location.href);
    if (typeof options.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method) && target.origin === location.origin) {
      const csrf = this.csrfToken();
      if (csrf) headers.set("X-CSRF-Token", csrf);
    }
    const response = await fetch(target.href, { credentials: "same-origin", ...options, method, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || `HTTP ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  async me() {
    try {
      return await this.json("/api/account/me");
    } catch (error) {
      if (error.status === 401) return { authenticated: false, account: null };
      throw error;
    }
  },

  async requireAuth() {
    const data = await this.me();
    if (!data?.authenticated || !data?.account) {
      location.replace("/pages/login.html");
      return null;
    }
    return data;
  },

  planRank(plan) {
    return ({ free: 0, creator: 1, pro: 2 })[String(plan || "free").toLowerCase()] ?? 0;
  },

  planLabel(plan) {
    return String(plan || "free").toUpperCase();
  },

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};

// Expose the shared CFS helper explicitly for pages that access window.CFS.
window.CFS = CFS;


function normalizeTrafficSource(value) {
  const source = String(value || "").trim().toLowerCase();
  if (!source) return "";
  if (source.includes("tiktok") || source === "tt") return "tiktok";
  if (source.includes("discord")) return "discord";
  return source.replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

function initTrafficSourceExperience() {
  if (!document.body.classList.contains("public-home")) return;

  const params = new URLSearchParams(location.search);
  const requestedSource = normalizeTrafficSource(
    params.get("utm_source") || params.get("source") || params.get("src")
  );

  let source = requestedSource;
  try {
    if (requestedSource) sessionStorage.setItem("cfsTrafficSource", requestedSource);
    if (!source) source = normalizeTrafficSource(sessionStorage.getItem("cfsTrafficSource"));
  } catch {}

  document.documentElement.dataset.trafficSource = source || "direct";

  if (source === "tiktok") {
    const sourceEntry = document.querySelector("[data-source-entry]");
    if (sourceEntry) sourceEntry.hidden = false;

    // Attribution bleibt beim Wechsel zur Registrierung im URL-Kontext erhalten.
    document.querySelectorAll('a[href^="/pages/login.html"]').forEach(link => {
      try {
        const target = new URL(link.getAttribute("href"), location.origin);
        target.searchParams.set("source", "tiktok");
        link.setAttribute("href", `${target.pathname}${target.search}${target.hash}`);
      } catch {}
    });
  }

  // Kein Drittanbieter-Tracking: nur eine flüchtige Session-Notiz für den
  // aktuellen Funnel-Kontext. Eine spätere Analytics-Lösung kann dieselben
  // data-funnel-cta Marker nach einem eigenen Consent-Pass übernehmen.
  document.querySelectorAll("[data-funnel-cta]").forEach(link => {
    link.addEventListener("click", () => {
      try {
        sessionStorage.setItem("cfsFunnelLastAction", String(link.dataset.funnelCta || "").slice(0, 64));
      } catch {}
    });
  });
}

function safePartnerUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

async function initPartnerRecommendations() {
  if (!document.body.classList.contains("public-home")) return;

  const section = document.querySelector("[data-partner-section]");
  const grid = document.querySelector("[data-partner-grid]");
  if (!section || !grid) return;

  try {
    const response = await fetch("/config/monetization.json", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return;

    const config = await response.json();
    const items = Array.isArray(config?.items) ? config.items.slice(0, 6) : [];
    if (config?.enabled !== true || items.length === 0) return;

    const usableItems = items
      .map(item => ({
        title: String(item?.title || "").trim().slice(0, 90),
        category: String(item?.category || "CREATOR-EMPFEHLUNG").trim().slice(0, 40),
        copy: String(item?.copy || "").trim().slice(0, 260),
        cta: String(item?.cta || "EMPFEHLUNG ANSEHEN").trim().slice(0, 50),
        url: safePartnerUrl(item?.url)
      }))
      .filter(item => item.title && item.copy && item.url);

    if (usableItems.length === 0) return;

    grid.replaceChildren();
    for (const item of usableItems) {
      const card = document.createElement("article");
      card.className = "brand-partner-card";

      const badge = document.createElement("span");
      badge.textContent = `WERBUNG / AFFILIATE · ${item.category}`;

      const title = document.createElement("h3");
      title.textContent = item.title;

      const copy = document.createElement("p");
      copy.textContent = item.copy;

      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "sponsored noopener noreferrer";
      link.textContent = `${item.cta} →`;
      link.dataset.funnelCta = "partner-outbound";
      link.addEventListener("click", () => {
        try { sessionStorage.setItem("cfsFunnelLastAction", "partner-outbound"); } catch {}
      });

      card.append(badge, title, copy, link);
      grid.append(card);
    }

    const kicker = section.querySelector("[data-partner-kicker]");
    const intro = section.querySelector("[data-partner-intro]");
    if (kicker && config.kicker) kicker.textContent = String(config.kicker).slice(0, 60);
    if (intro && config.intro) intro.textContent = String(config.intro).slice(0, 320);

    const disclosure = section.querySelector("[data-partner-disclosure]");
    if (disclosure) {
      disclosure.textContent = String(config.disclosure || "WERBUNG / AFFILIATE: Entsprechend gekennzeichnete Links können vergütet werden.").slice(0, 500);
      disclosure.hidden = false;
    }

    section.hidden = false;
  } catch {
    // Monetarisierung ist optional. Bei Config-/Netzwerkfehlern bleibt die
    // Fläche unsichtbar und beeinträchtigt die öffentliche Website nicht.
  }
}

async function initPublicAuthNavigation() {
  const authCtas = [...document.querySelectorAll("[data-auth-cta]")];
  const loginLinks = [...document.querySelectorAll("[data-login-link]")];
  if (authCtas.length === 0 && loginLinks.length === 0) return;

  let me;
  try {
    me = await CFS.me();
  } catch {
    return;
  }
  if (!me?.authenticated || !me?.account) return;

  authCtas.forEach(link => {
    link.href = "/pages/dashboard.html";
    link.textContent = "ZUM DASHBOARD";
  });
  loginLinks.forEach(link => {
    link.href = "/pages/account.html";
    link.textContent = "ACCOUNT";
  });
}

async function initPublicHomeExperience() {
  if (!document.body.classList.contains("public-home")) return;

  const healthDot = document.getElementById("publicHealthDot");
  const healthText = document.getElementById("publicHealthText");
  const healthMeta = document.getElementById("publicHealthMeta");

  try {
    const health = await CFS.json("/api/public/status");
    const status = String(health?.status || "degraded");
    const online = status === "online";
    const labels = {
      online: "SYSTEM ONLINE",
      degraded: "SYSTEM EINGESCHRÄNKT",
      maintenance: "WARTUNG AKTIV",
      security_lockdown: "SICHERHEITS-MODUS AKTIV"
    };
    healthDot?.classList.toggle("online", online);
    healthDot?.classList.toggle("issue", !online);
    if (healthText) healthText.textContent = labels[status] || "SYSTEM PRÜFEN";
    if (healthMeta) healthMeta.textContent = String(health?.message || "").trim() || (online
      ? "Öffentlicher Status · keine internen Infrastrukturdetails"
      : "Einige Schreibfunktionen können vorübergehend eingeschränkt sein.");
  } catch {
    healthDot?.classList.add("issue");
    if (healthText) healthText.textContent = "STATUS NICHT ERREICHBAR";
    if (healthMeta) healthMeta.textContent = "Die Website ist erreichbar, der öffentliche Systemstatus konnte aber nicht geladen werden.";
  }

  let me;
  try {
    me = await CFS.me();
  } catch {
    return;
  }
  if (!me?.authenticated || !me?.account) return;

  document.querySelectorAll("[data-auth-cta]").forEach(link => {
    link.href = "/pages/dashboard.html";
    link.textContent = "ZUM DASHBOARD";
  });
  document.querySelectorAll("[data-login-link]").forEach(link => {
    link.href = "/pages/account.html";
    link.textContent = "ACCOUNT";
  });
  document.querySelectorAll("[data-dashboard-link]").forEach(link => {
    link.href = "/pages/dashboard.html";
    const title = link.querySelector("b");
    const copy = link.querySelector("span");
    if (title) title.textContent = "WEITER ZUM DASHBOARD";
    if (copy) copy.textContent = "Dein Account ist erkannt. Öffne dein Creator Cockpit.";
  });

  const snapshot = document.getElementById("homeCreatorSnapshot");
  if (!snapshot) return;
  snapshot.hidden = false;
  const snapshotText = document.getElementById("homeCreatorSnapshotText");
  if (snapshotText) snapshotText.textContent = `${me.account.display_name || "Creator"}: Wir prüfen kurz deine wichtigsten Verbindungen.`;

  const setSnapshot = (id, ready, label) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("ready", ready);
    el.classList.toggle("wait", !ready);
    const text = el.querySelector("em");
    if (text) text.textContent = label;
  };
  setSnapshot("homeSnapAccount", true, "Account verbunden");

  const results = await Promise.allSettled([
    CFS.json("/api/creator/launcher/devices"),
    CFS.json("/api/creator/tiktok/status"),
    CFS.json("/api/creator/widget-studio/widgets")
  ]);

  const devices = results[0].status === "fulfilled" ? results[0].value : null;
  const tiktok = results[1].status === "fulfilled" ? results[1].value : null;
  const widgets = results[2].status === "fulfilled" ? results[2].value : null;
  const activeDevices = (devices?.devices || []).filter(device => device.status === "active");
  const liveWidgets = (widgets?.widgets || []).filter(widget => widget.status === "live");

  setSnapshot("homeSnapLauncher", activeDevices.length > 0, activeDevices.some(device => device.online) ? "Launcher online" : activeDevices.length ? "Launcher verbunden" : "Launcher fehlt");
  setSnapshot("homeSnapTikTok", Boolean(tiktok?.connected), tiktok?.connected ? "TikTok verbunden" : "TikTok offen");
  setSnapshot("homeSnapWidgets", liveWidgets.length > 0, liveWidgets.length ? `${liveWidgets.length} Widget${liveWidgets.length === 1 ? "" : "s"} live` : "Noch kein Widget live");

  const readyParts = [activeDevices.length > 0, Boolean(tiktok?.connected), liveWidgets.length > 0].filter(Boolean).length;
  if (snapshotText) {
    snapshotText.textContent = readyParts === 3
      ? "Dein Account, Launcher, TikTok und veröffentlichte Widgets sind miteinander verbunden."
      : "Dein Account ist aktiv. Im Dashboard siehst du sofort, welcher Verbindungsschritt noch fehlt.";
  }
}

function initCreatorNavigation() {
  const nav = document.querySelector("[data-creator-nav]");
  if (!nav) return;

  const currentPath = location.pathname === "/index.html" ? "/" : (location.pathname || "/");
  let activeLink = null;

  nav.querySelectorAll("a[data-creator-link][href]").forEach(link => {
    let target;
    try { target = new URL(link.getAttribute("href"), location.origin); } catch { return; }
    const matches = target.origin === location.origin && target.pathname === currentPath;
    link.classList.toggle("active", matches);
    if (matches) {
      link.setAttribute("aria-current", "page");
      activeLink = link;
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const more = nav.querySelector("[data-creator-more]");
  if (more) {
    more.classList.toggle("has-active", Boolean(more.querySelector("a.active")));
    more.addEventListener("click", event => {
      if (event.target.closest("a")) more.removeAttribute("open");
    });
    document.addEventListener("click", event => {
      if (more.hasAttribute("open") && !more.contains(event.target)) more.removeAttribute("open");
    });
  }

  // A page-specific label is optional; when present it mirrors the active creator route.
  const current = document.querySelector("[data-creator-current]");
  if (current && activeLink) current.textContent = activeLink.textContent.trim();
}



function initAccessibilityBaseline() {
  const main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main-content";
    if (!document.querySelector(".skip-link")) {
      const skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = `#${main.id}`;
      skip.textContent = "Zum Hauptinhalt springen";
      document.body.prepend(skip);
    }
  }

  document.querySelectorAll(".notice").forEach(notice => {
    const dangerous = notice.classList.contains("danger");
    if (!notice.hasAttribute("role")) notice.setAttribute("role", dangerous ? "alert" : "status");
    if (!dangerous && !notice.hasAttribute("aria-live")) notice.setAttribute("aria-live", "polite");
    notice.setAttribute("aria-atomic", "true");
  });

  document.querySelectorAll("[aria-disabled='true']").forEach(element => {
    if (element.matches("a[href]")) element.setAttribute("tabindex", "-1");
  });

  document.addEventListener("click", event => {
    const disabledLink = event.target.closest("a[aria-disabled='true']");
    if (disabledLink) event.preventDefault();
  });

  const liveTargets = document.querySelectorAll("#sceneToast, #message, #loginMsg, #regMsg, #systemHeadline, #nextStepTitle");
  liveTargets.forEach(target => {
    if (!target.hasAttribute("aria-live")) target.setAttribute("aria-live", "polite");
    target.setAttribute("aria-atomic", "true");
  });

  const labelFallbacks = {
    gameOutputUrl: "Game Overlay URL",
    sceneName: "Scene Name",
    sceneOutputUrl: "Scene Output URL",
    sourceUrl: "Widget Browser Source URL",
    wsOutputUrl: "Widget Output URL",
    wsObsUrl: "OBS Browser Source URL",
    wsBoardOutputUrl: "Stream Board Output URL",
    wsBridgeToken: "Launcher Bridge Schlüssel"
  };
  Object.entries(labelFallbacks).forEach(([id, label]) => {
    const field = document.getElementById(id);
    if (field && !field.hasAttribute("aria-label") && !field.hasAttribute("aria-labelledby")) field.setAttribute("aria-label", label);
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const target = record.target?.nodeType === 1 ? record.target : record.target?.parentElement;
      const notice = target?.closest?.(".notice");
      if (!notice) continue;
      const dangerous = notice.classList.contains("danger");
      notice.setAttribute("role", dangerous ? "alert" : "status");
      if (!dangerous) notice.setAttribute("aria-live", "polite");
      notice.setAttribute("aria-atomic", "true");
    }
  });
  observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:["class"]});
}

document.addEventListener("DOMContentLoaded", () => {
  // CSP-kompatibler Logo-Fallback statt Inline-onerror-Handlern.
  document.querySelectorAll("img[data-logo-fallback]").forEach(image => {
    const showFallback = () => {
      image.hidden = true;
      if (image.nextElementSibling) image.nextElementSibling.hidden = false;
    };

    image.addEventListener("error", showFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) showFallback();
  });


  // Öffentliche Navigation: aktuelle Seite kenntlich machen, ohne Hash-Ziele
  // künstlich als eigene Seite zu behandeln.
  document.querySelectorAll(".public-nav").forEach(nav => {
    const currentPath = location.pathname || "/";
    nav.querySelectorAll("a[href]").forEach(link => {
      let target;
      try { target = new URL(link.getAttribute("href"), location.origin); } catch { return; }
      if (target.origin !== location.origin || target.hash) return;
      const matches = target.pathname === currentPath || (currentPath === "/index.html" && target.pathname === "/");
      if (matches && !link.hasAttribute("data-login-link") && !link.hasAttribute("data-auth-cta")) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  });

  // Gemeinsame Website-Navigation. Manche ältere Seiten verwenden
  // data-mobile-toggle/data-nav, neuere Seiten mobileNavToggle/mainNav.
  // Der zentrale Handler unterstützt beide Varianten und läuft im Capture-Modus,
  // damit alte seitenlokale Toggle-Handler nicht versehentlich doppelt schalten.
  const menuButtons = [
    ...document.querySelectorAll("[data-mobile-toggle], #mobileNavToggle")
  ];

  menuButtons.forEach((button, index) => {
    const header = button.closest(".site-header") || document;
    const nav =
      header.querySelector("[data-nav]") ||
      header.querySelector("#mainNav") ||
      header.querySelector(".nav");

    if (!nav) return;

    if (!nav.id) nav.id = `cfs-mobile-nav-${index + 1}`;
    button.setAttribute("aria-controls", nav.id);
    button.setAttribute("aria-expanded", String(nav.classList.contains("open")));
    button.setAttribute("aria-label", "Navigation öffnen");

    const setOpen = open => {
      nav.classList.toggle("open", open);
      button.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Navigation schließen" : "Navigation öffnen");
      button.textContent = open ? "SCHLIESSEN" : "MENÜ";
      if (!open) nav.querySelectorAll("details[open]").forEach(detail => detail.removeAttribute("open"));
    };

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(!nav.classList.contains("open"));
      },
      true
    );

    nav.addEventListener("click", event => {
      if (event.target.closest("a, [data-logout]")) setOpen(false);
    });

    document.addEventListener("click", event => {
      if (!nav.classList.contains("open")) return;
      if (button.contains(event.target) || nav.contains(event.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        setOpen(false);
        button.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760 && nav.classList.contains("open")) setOpen(false);
    });
  });

  document.querySelectorAll("[data-logout]").forEach(button => {
    button.addEventListener("click", async () => {
      try {
        await CFS.json("/api/account/logout", {
          method: "POST"
        });
      } catch {}
      location.replace("/pages/login.html");
    });
  });

  initAccessibilityBaseline();
  initCreatorNavigation();
  initTrafficSourceExperience();
  initPartnerRecommendations();
  initPublicAuthNavigation();
  initPublicHomeExperience();
});

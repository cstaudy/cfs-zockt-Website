(() => {
  "use strict";

  const MARK = "/assets/img/brand/cfs-zockt-mark-original.png";
  const path = location.pathname.toLowerCase();

  const generalCreatorPages = new Set([
    "/pages/dashboard.html",
    "/pages/account.html",
    "/pages/settings.html",
    "/pages/setup.html",
    "/pages/integrations.html",
    "/pages/tiktok.html",
    "/pages/launcher.html",
    "/pages/launcher-connect.html",
    "/pages/audio-studio.html",
    "/pages/nexus.html",
    "/pages/games.html"
  ]);

  const specializedCreatorPages = new Set([
    "/pages/widget-studio.html",
    "/pages/stream-studio.html",
    "/pages/editor.html",
    "/pages/scene-studio.html",
    "/pages/cut-studio.html"
  ]);

  function brandMarkup({ creator = false, compact = false } = {}) {
    return `
      <span class="cfs-brand-mark" aria-hidden="true"><img src="${MARK}" alt=""></span>
      <span class="cfs-brand-copy">
        <strong><span class="cfs-brand-prefix">cfs_</span><span class="cfs-brand-name">zockt</span></strong>
        <small>${creator ? "CREATOR SUITE" : "GAMING · CREATOR SUITE"}</small>
      </span>`;
  }

  function upgradeHeaderBrands() {
    document.querySelectorAll(".brand-logo-link").forEach(anchor => {
      anchor.classList.add("cfs-brand-lockup");
      anchor.innerHTML = brandMarkup({ creator: false });
    });

    document.querySelectorAll(".creator-brand").forEach(anchor => {
      anchor.classList.add("cfs-brand-lockup");
      anchor.innerHTML = brandMarkup({ creator: true });
    });

    const heroLogo = document.querySelector(".brand-hero-logo");
    if (heroLogo && !document.querySelector(".cfs-hero-brand")) {
      const brand = document.createElement("div");
      brand.className = "cfs-hero-brand";
      brand.innerHTML = brandMarkup({ creator: false });
      heroLogo.replaceWith(brand);
    }

    document.querySelectorAll(".public-footer-brand").forEach(footerBrand => {
      const existingImg = footerBrand.querySelector("img");
      if (existingImg) {
        const lockup = document.createElement("div");
        lockup.className = "cfs-footer-lockup";
        lockup.innerHTML = brandMarkup({ creator: false, compact: true });
        existingImg.replaceWith(lockup);
      }
    });
  }

  function markActiveTopNavigation() {
    document.querySelectorAll(".public-nav a, .creator-nav a").forEach(link => {
      try {
        const url = new URL(link.href, location.origin);
        const active = url.pathname.toLowerCase() === path;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
      } catch {}
    });
  }

  function icon(name) {
    const icons = {
      dashboard:"⌂", account:"◎", widgets:"▦", stream:"◫", tiktok:"♪",
      integrations:"◇", launcher:"▣", settings:"⚙", support:"?",
      overview:"⌂", security:"◇", sessions:"▣", advanced:"⚙"
    };
    return icons[name] || "•";
  }

  function makeLink({ label, href, key, active = false }) {
    const a = document.createElement("a");
    a.className = `cfs-sidebar-link${active ? " active" : ""}`;
    a.href = href;
    a.innerHTML = `<span class="cfs-sidebar-icon">${icon(key)}</span><span>${label}</span>`;
    return a;
  }

  function makeAccountButton({ label, tab, active = false }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `cfs-sidebar-link${active ? " active" : ""}`;
    button.dataset.cfsAccountTab = tab;
    button.innerHTML = `<span class="cfs-sidebar-icon">${icon(tab)}</span><span>${label}</span>`;
    button.addEventListener("click", () => {
      const realTab = document.querySelector(`[data-account-tab="${tab}"]`);
      if (realTab) realTab.click();
      syncAccountSidebar(tab);
    });
    return button;
  }

  function syncAccountSidebar(tabName) {
    document.querySelectorAll("[data-cfs-account-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.cfsAccountTab === tabName);
    });
  }

  function accountTabFromLocation() {
    const match = /^#account-(overview|security|sessions|advanced)$/.exec(location.hash);
    if (match) return match[1];
    const selected = document.querySelector("[data-account-tab][aria-selected='true']");
    return selected?.dataset.accountTab || "overview";
  }

  function injectCreatorSidebar() {
    if (!document.body.classList.contains("creator-workspace")) return;

    if (specializedCreatorPages.has(path)) {
      document.body.classList.add("cfs-specialized-workspace");
      return;
    }

    if (!generalCreatorPages.has(path)) return;
    if (document.querySelector(".cfs-global-sidebar")) return;

    const aside = document.createElement("aside");
    aside.className = "cfs-global-sidebar";
    aside.setAttribute("aria-label", "Creator Navigation");

    const label = document.createElement("div");
    label.className = "cfs-sidebar-label";
    label.textContent = path === "/pages/account.html" ? "ACCOUNT" : "CREATOR SUITE";
    aside.appendChild(label);

    if (path === "/pages/account.html") {
      const current = accountTabFromLocation();
      aside.append(
        makeAccountButton({ label:"Übersicht", tab:"overview", active:current === "overview" }),
        makeAccountButton({ label:"Sicherheit", tab:"security", active:current === "security" }),
        makeAccountButton({ label:"Sitzungen", tab:"sessions", active:current === "sessions" }),
        makeAccountButton({ label:"Erweitert", tab:"advanced", active:current === "advanced" })
      );

      const divider = document.createElement("div");
      divider.className = "cfs-sidebar-divider";
      aside.appendChild(divider);
      aside.append(
        makeLink({ label:"Dashboard", href:"/pages/dashboard.html", key:"dashboard" }),
        makeLink({ label:"Einstellungen", href:"/pages/settings.html", key:"settings" }),
        makeLink({ label:"Support", href:"/pages/support.html", key:"support" })
      );

      window.addEventListener("hashchange", () => syncAccountSidebar(accountTabFromLocation()));
      document.addEventListener("click", event => {
        const tab = event.target.closest?.("[data-account-tab]");
        if (tab) setTimeout(() => syncAccountSidebar(tab.dataset.accountTab), 0);
      });
    } else {
      const items = [
        ["Dashboard","/pages/dashboard.html","dashboard"],
        ["Account","/pages/account.html","account"],
        ["Widgets","/pages/widget-studio.html","widgets"],
        ["Stream Studio","/pages/stream-studio.html","stream"],
        ["TikTok","/pages/tiktok.html","tiktok"],
        ["Integrationen","/pages/integrations.html","integrations"],
        ["Launcher","/pages/launcher.html","launcher"],
        ["Einstellungen","/pages/settings.html","settings"]
      ];
      items.forEach(([labelText, href, key]) => {
        aside.appendChild(makeLink({
          label:labelText,
          href,
          key,
          active:path === href.toLowerCase()
        }));
      });
      const divider = document.createElement("div");
      divider.className = "cfs-sidebar-divider";
      aside.appendChild(divider);
      aside.appendChild(makeLink({ label:"Support", href:"/pages/support.html", key:"support" }));
    }

    const header = document.querySelector(".site-header");
    if (header) header.insertAdjacentElement("afterend", aside);
    else document.body.prepend(aside);
    document.body.classList.add("cfs-sidebar-ready");
  }


  function installUiBundleAssets() {
    if (!document.querySelector('link[data-cfs-ui-v18]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/assets/css/cfs-ui-v18.css";
      link.dataset.cfsUiV18 = "1";
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[data-cfs-ui-v18]')) {
      const script = document.createElement("script");
      script.src = "/assets/js/cfs-ui-v18.js";
      script.defer = true;
      script.dataset.cfsUiV18 = "1";
      document.head.appendChild(script);
    }
  }

  function init() {
    document.documentElement.classList.add("cfs-ui-v3", "cfs-os-v24");
    document.body.classList.add("cfs-ui-v3", "cfs-os-v24");
    upgradeHeaderBrands();
    markActiveTopNavigation();
    injectCreatorSidebar();
    installUiBundleAssets();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();

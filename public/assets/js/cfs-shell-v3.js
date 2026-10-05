(() => {
  "use strict";

  const BRAND_MARK = "/assets/img/brand/cfs-zockt-mark-clean.png";
  const BRAND_WORDMARK = "/assets/img/brand/cfs-zockt-wordmark-transparent.png";
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
    "/pages/games.html",
    "/pages/shop.html",
    "/pages/cfs-ai.html"
  ]);

  const specializedCreatorPages = new Set([
    "/pages/widget-studio.html",
    "/pages/stream-studio.html",
    "/pages/editor.html",
    "/pages/scene-studio.html",
    "/pages/cut-studio.html"
  ]);

  function brandContextLabel(creator = false) {
    if (!creator) return "GAMING · STREAMS · COMMUNITY";
    if (path === "/pages/admin.html" || path === "/pages/admin-creators.html") return "ADMIN CONTROL";
    if (path === "/pages/cfs-ai.html") return "CFS AI";
    return "CREATOR SUITE";
  }

  function brandMarkup({ creator = false } = {}) {
    return `
      <span class="cfs-brand-wordmark"><img src="${BRAND_WORDMARK}" alt="" aria-hidden="true"></span>
      <span class="cfs-brand-copy">
        <strong>CFS ZOCKT</strong>
        <small>${brandContextLabel(creator)}</small>
      </span>`;
  }

  function upgradeHeaderBrands() {
    document.querySelectorAll(".brand-logo-link, .gaming-brand, .site-header a.brand, header.top a.brand").forEach(anchor => {
      const creatorBrand = document.body.classList.contains("creator-workspace") && !anchor.classList.contains("gaming-brand");
      anchor.classList.add("cfs-brand-lockup");
      anchor.innerHTML = brandMarkup({ creator: creatorBrand });
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

    document.querySelectorAll(".public-footer-brand, .gaming-footer-brand, .cfs-footer-v165-brand").forEach(footerBrand => {
      footerBrand.classList.add("cfs-brand-lockup", "cfs-footer-lockup");
      footerBrand.innerHTML = brandMarkup({ creator: false });
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
      dashboard:"⌂", account:"◎", widgets:"▦", stream:"◫", tiktok:"♪", shop:"$",
      integrations:"◇", launcher:"▣", settings:"⚙", support:"?",
      overview:"⌂", security:"◇", sessions:"▣", advanced:"⚙", ai:"✦"
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
        ["Builder","/pages/universal-builder.html","widgets"],
        ["Shop","/pages/shop.html","shop"],
        ["Stream Studio","/pages/stream-studio.html","stream"],
        ["TikTok","/pages/tiktok.html","tiktok"],
        ["Integrationen","/pages/integrations.html","integrations"],
        ["Launcher","/pages/launcher.html","launcher"],
        ...(path === "/pages/admin.html" ? [["Admin","/pages/admin.html","security"]] : []),
        ...(path === "/pages/cfs-ai.html" ? [["CFS AI","/pages/cfs-ai.html","ai"]] : []),
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


  async function injectCfsAiAdminNavigation() {
    if (!document.body.classList.contains("creator-workspace")) return;
    try {
      const response = await fetch("/api/account/me", { credentials:"same-origin", headers:{"Accept":"application/json"} });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.admin) return;

      const moreMenu = document.querySelector(".creator-nav-more-menu");
      if (moreMenu) {
        if (!moreMenu.querySelector('a[href="/pages/admin.html"]')) {
          const adminLink = document.createElement("a");
          adminLink.dataset.creatorLink = "";
          adminLink.href = "/pages/admin.html";
          adminLink.textContent = "ADMIN";
          moreMenu.prepend(adminLink);
        }
        if (!moreMenu.querySelector('a[href="/pages/cfs-ai.html"]')) {
          const aiLink = document.createElement("a");
          aiLink.dataset.creatorLink = "";
          aiLink.href = "/pages/cfs-ai.html";
          aiLink.textContent = "CFS AI";
          moreMenu.prepend(aiLink);
        }
      }

      const sidebar = document.querySelector(".cfs-global-sidebar");
      if (sidebar) {
        const divider = sidebar.querySelector(".cfs-sidebar-divider");
        if (!sidebar.querySelector('a[href="/pages/admin.html"]')) {
          const adminLink = makeLink({ label:"Admin", href:"/pages/admin.html", key:"security", active:path === "/pages/admin.html" });
          if (divider) sidebar.insertBefore(adminLink, divider);
          else sidebar.appendChild(adminLink);
        }
        if (!sidebar.querySelector('a[href="/pages/cfs-ai.html"]')) {
          const aiLink = makeLink({ label:"CFS AI", href:"/pages/cfs-ai.html", key:"ai", active:path === "/pages/cfs-ai.html" });
          if (divider) sidebar.insertBefore(aiLink, divider);
          else sidebar.appendChild(aiLink);
        }
      }
    } catch {}
  }


  function injectCreatorShopNavigation() {
    document.querySelectorAll(".creator-nav").forEach(nav => {
      if (nav.querySelector('a[href="/pages/shop.html"]')) return;
      const more = nav.querySelector(".creator-nav-more");
      const link = document.createElement("a");
      link.href = "/pages/shop.html";
      link.dataset.creatorLink = "";
      link.className = "cfs172-shop-link";
      link.textContent = "SHOP";
      if (path === "/pages/shop.html") { link.classList.add("active"); link.setAttribute("aria-current","page"); }
      nav.insertBefore(link, more || nav.querySelector(".creator-logout") || null);
    });
  }

  function injectCreatorBuilderNavigation() {
    document.querySelectorAll(".creator-nav").forEach(nav => {
      if (nav.querySelector('a[href="/pages/universal-builder.html"]')) return;
      const more = nav.querySelector(".creator-nav-more");
      const link = document.createElement("a");
      link.href = "/pages/universal-builder.html";
      link.dataset.creatorLink = "";
      link.className = "cfs204-builder-link";
      link.textContent = "BUILDER";
      if (path === "/pages/universal-builder.html") { link.classList.add("active"); link.setAttribute("aria-current","page"); }
      nav.insertBefore(link, more || nav.querySelector(".creator-logout") || null);
    });
  }

  function ensureBrandV192() {
    document.body.dataset.cfsBrandV192 = "1";
    if (!document.querySelector('link[data-cfs-brand-v192]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/assets/css/cfs-brand-unified-v192.css";
      link.dataset.cfsBrandV192 = "1";
      document.head.appendChild(link);
    }
  }

  function ensureBrandV197() {
    document.body.dataset.cfsBrandV197 = "1";
    if (!document.querySelector('link[data-cfs-brand-v197]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/assets/css/cfs-brand-v197.css";
      link.dataset.cfsBrandV197 = "1";
      document.head.appendChild(link);
    }
  }

  function ensureBrandV198() {
    document.body.dataset.cfsBrandV198 = "1";
    let link = document.querySelector('link[data-cfs-brand-v198]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/assets/css/cfs-brand-v198.css";
      link.dataset.cfsBrandV198 = "1";
    }
    // Keep the professional layer last so legacy page styles cannot overwrite it.
    document.head.appendChild(link);
  }

  function ensureSuiteV203() {
    if (!document.body.classList.contains("creator-workspace")) return;
    document.body.dataset.cfsSuiteV203 = "1";
    if (document.querySelector('link[data-cfs-suite-v203]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/css/cfs-suite-v203.css";
    link.dataset.cfsSuiteV203 = "1";
    document.head.appendChild(link);
  }

  function injectFallbackBrandHeader() {
    if (document.querySelector(".site-header, header.top")) return;
    const header = document.createElement("header");
    const creator = document.body.classList.contains("creator-workspace");
    header.className = `site-header ${creator ? "creator-site-header" : "brand-header public-site-header"} cfs-shell-generated-header`;
    header.innerHTML = `<div class="container header-inner"><a class="brand cfs-brand-lockup" href="${creator ? "/pages/dashboard.html" : "/"}" aria-label="cfs_zockt ${creator ? "Creator Suite Dashboard" : "Startseite"}">${brandMarkup({ creator })}</a></div>`;
    document.body.prepend(header);
  }

  function installUnifiedV172() {
    if (document.querySelector('link[data-cfs-unified-v172]')) return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="/assets/css/cfs-unified-v172.css";
    link.dataset.cfsUnifiedV172="1";
    document.head.appendChild(link);
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

  function updateCopyrightYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll("[data-cfs-current-year]").forEach(node => { node.textContent = year; });
  }

  function injectCreatorProductSignature() {
    if (!document.body.classList.contains("creator-workspace")) return;
    if (document.querySelector(".cfs-product-signature-v180")) return;
    const footer = document.createElement("footer");
    footer.className = "cfs-product-signature-v180";
    footer.innerHTML = `<div class="cfs-brand-lockup">${brandMarkup({ creator: true })}</div><small>© <span data-cfs-current-year>${new Date().getFullYear()}</span> cfs_zockt · Alle Rechte vorbehalten.</small>`;
    document.body.appendChild(footer);
  }

  function init() {
    document.documentElement.classList.add("cfs-ui-v3", "cfs-os-v24");
    document.body.classList.add("cfs-ui-v3", "cfs-os-v24");
    ensureBrandV192();
    ensureBrandV197();
    injectFallbackBrandHeader();
    installUnifiedV172();
    upgradeHeaderBrands();
    injectCreatorShopNavigation();
    injectCreatorBuilderNavigation();
    markActiveTopNavigation();
    injectCreatorSidebar();
    injectCfsAiAdminNavigation();
    injectCreatorProductSignature();
    updateCopyrightYear();
    installUiBundleAssets();
    ensureBrandV198();
    ensureSuiteV203();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();

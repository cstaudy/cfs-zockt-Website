
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

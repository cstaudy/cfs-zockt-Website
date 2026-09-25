
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

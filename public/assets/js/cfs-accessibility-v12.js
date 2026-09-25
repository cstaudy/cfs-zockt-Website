
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

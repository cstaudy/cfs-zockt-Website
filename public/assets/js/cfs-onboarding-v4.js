
(() => {
  "use strict";

  const path = location.pathname.toLowerCase();
  const STORAGE_EMAIL = "cfs_pending_verification_email";
  const STORAGE_NAME = "cfs_pending_creator_name";
  const STORAGE_DISMISS = "cfs_onboarding_v4_complete_dismissed";

  function authFlowMarkup(current) {
    const steps = [
      ["account","01","Account","Creator-Konto anlegen"],
      ["email","02","E-Mail","Adresse bestätigen"],
      ["login","03","Dashboard","Anmelden & starten"]
    ];
    return `<div class="cfs-auth-flow" aria-label="Account Startpfad">${steps.map(([key,n,title,copy]) => {
      const state = key === current ? "current" :
        ((current === "email" && key === "account") || (current === "login" && (key === "account" || key === "email"))) ? "done" : "";
      return `<div class="cfs-auth-flow-step ${state}"><b>${state === "done" ? "✓" : n}</b><div><strong>${title}</strong><small>${copy}</small></div></div>`;
    }).join("")}</div>`;
  }

  function installAuthFlow() {
    if (path === "/pages/login.html") {
      const hero = document.querySelector(".auth-entry-hero");
      if (hero && !document.querySelector(".cfs-auth-flow")) {
        hero.insertAdjacentHTML("afterend", authFlowMarkup("account"));
      }

      const params = new URLSearchParams(location.search);
      if (params.get("verified") === "1") {
        const panel = document.getElementById("loginPanel");
        if (panel && !panel.querySelector(".cfs-welcome-return")) {
          const note = document.createElement("div");
          note.className = "cfs-welcome-return";
          note.textContent = "E-Mail bestätigt. Du kannst dich jetzt anmelden und direkt mit deinem Creator-Setup weitermachen.";
          panel.prepend(note);
        }
      }
    }

    if (path === "/pages/verify-email.html") {
      const hero = document.querySelector(".auth-recovery-hero");
      if (hero && !document.querySelector(".cfs-auth-flow")) {
        hero.insertAdjacentHTML("afterend", authFlowMarkup("email"));
      }

      const panel = document.querySelector(".auth-recovery-panel");
      if (panel && !document.getElementById("verifyNextAction")) {
        const next = document.createElement("div");
        next.id = "verifyNextAction";
        next.className = "cfs-verify-next";
        next.hidden = true;
        next.innerHTML = `
          <div>
            <strong>E-Mail bestätigt</strong>
            <p>Dein Account ist bereit. Melde dich jetzt an und öffne dein Creator Dashboard.</p>
          </div>
          <a class="btn primary" href="/pages/login.html?verified=1">JETZT ANMELDEN</a>`;
        panel.appendChild(next);
      }
    }
  }

  function safeJson(url) {
    return CFS.json(url).catch(() => null);
  }

  function stepMarkup({ index, title, copy }) {
    return `
      <article class="cfs-onboarding-step" data-onboarding-step="${index}">
        <div>
          <div class="cfs-onboarding-step-top">
            <span class="cfs-onboarding-step-number">${String(index).padStart(2,"0")}</span>
            <strong>${title}</strong>
          </div>
          <p>${copy}</p>
        </div>
        <div class="cfs-onboarding-step-status">WIRD GEPRÜFT</div>
      </article>`;
  }

  async function installDashboardOnboarding() {
    if (path !== "/pages/dashboard.html") return;
    const hero = document.querySelector(".creator-dashboard-hero");
    if (!hero || document.querySelector(".cfs-onboarding-v4")) return;

    const shell = document.createElement("section");
    shell.className = "cfs-onboarding-v4";
    shell.setAttribute("aria-label", "Erste Schritte");
    shell.innerHTML = `
      <div class="cfs-onboarding-head">
        <div>
          <span class="cfs-onboarding-kicker">ERSTE SCHRITTE</span>
          <h2>In vier Schritten startklar.</h2>
          <p>Nur das Wesentliche für einen sicheren und funktionierenden Start. TikTok und Launcher bleiben optional und können später dazukommen.</p>
        </div>
        <div class="cfs-onboarding-progress" aria-live="polite">
          <strong id="cfsOnboardingProgressValue">0/4</strong>
          <span id="cfsOnboardingProgressText">Status wird geprüft …</span>
          <div class="cfs-onboarding-progressbar"><i id="cfsOnboardingProgressBar"></i></div>
        </div>
      </div>
      <div class="cfs-onboarding-steps">
        ${stepMarkup({index:1,title:"E-Mail bestätigen",copy:"Bestätigt, dass du Zugriff auf deine Account-Adresse hast."})}
        ${stepMarkup({index:2,title:"Account absichern",copy:"Richte einen Passkey oder eine Authenticator-App ein."})}
        ${stepMarkup({index:3,title:"Grundsetup speichern",copy:"Theme, Ziel und deinen bevorzugten Workflow festlegen."})}
        ${stepMarkup({index:4,title:"Erstes Widget",copy:"Ein Widget anlegen – TikTok ist dafür nicht erforderlich."})}
      </div>
      <div class="cfs-onboarding-next">
        <div class="cfs-onboarding-next-copy">
          <span>DEIN NÄCHSTER SCHRITT</span>
          <strong id="cfsOnboardingNextTitle">Status wird geprüft …</strong>
          <p id="cfsOnboardingNextText">Einen Moment – wir prüfen deinen Account.</p>
        </div>
        <a class="btn primary" id="cfsOnboardingNextAction" href="/pages/dashboard.html" aria-disabled="true">BITTE WARTEN</a>
      </div>`;

    hero.insertAdjacentElement("afterend", shell);

    let me = null;
    try {
      me = await CFS.me();
    } catch {}
    if (!me?.authenticated) return;

    const [passkeys, mfa, setup, widgets] = await Promise.all([
      safeJson("/api/account/passkeys"),
      safeJson("/api/account/mfa"),
      safeJson("/api/creator/modules/launcher/state"),
      safeJson("/api/creator/widget-studio/widgets")
    ]);

    const passkeyCount = Array.isArray(passkeys?.passkeys) ? passkeys.passkeys.length : 0;
    const mfaEnabled = Boolean(mfa?.enabled);
    const widgetCount = Array.isArray(widgets?.widgets) ? widgets.widgets.length : 0;

    const steps = [
      {
        done:Boolean(me.account?.email_verified),
        title:"E-Mail bestätigen",
        doneText:"BESTÄTIGT",
        nextTitle:"E-Mail-Adresse bestätigen",
        nextText:"Bestätige zuerst deine E-Mail-Adresse. Danach bleibt dein Account eindeutig zugeordnet.",
        href:"/pages/verify-email.html"
      },
      {
        done:passkeyCount > 0 || mfaEnabled,
        title:"Account absichern",
        doneText:passkeyCount > 0 ? `${passkeyCount} PASSKEY${passkeyCount === 1 ? "" : "S"}` : "2FA AKTIV",
        nextTitle:"Account-Schutz einrichten",
        nextText:"Ein Passkey ist der einfachste starke Schutz. Alternativ kannst du TOTP verwenden.",
        href:"/pages/account.html#account-security"
      },
      {
        done:Boolean(setup?.state?.creator_setup),
        title:"Grundsetup speichern",
        doneText:"GESPEICHERT",
        nextTitle:"Grundsetup einmal festlegen",
        nextText:"Lege Theme, Follower-Ziel und deinen bevorzugten Start-Workflow fest.",
        href:"/pages/setup.html"
      },
      {
        done:widgetCount > 0,
        title:"Erstes Widget",
        doneText:widgetCount > 0 ? `${widgetCount} WIDGET${widgetCount === 1 ? "" : "S"}` : "OFFEN",
        nextTitle:"Dein erstes Widget anlegen",
        nextText:"Starte mit einem einfachen Widget. TikTok oder Launcher brauchst du dafür noch nicht.",
        href:"/pages/widget-studio.html"
      }
    ];

    const firstOpen = steps.findIndex(step => !step.done);
    steps.forEach((step, index) => {
      const node = shell.querySelector(`[data-onboarding-step="${index + 1}"]`);
      if (!node) return;
      node.classList.toggle("done", step.done);
      node.classList.toggle("current", !step.done && index === firstOpen);
      const status = node.querySelector(".cfs-onboarding-step-status");
      status.textContent = step.done ? step.doneText : (index === firstOpen ? "JETZT ERLEDIGEN" : "NOCH OFFEN");
    });

    const complete = steps.filter(step => step.done).length;
    const percent = Math.round((complete / steps.length) * 100);
    document.getElementById("cfsOnboardingProgressValue").textContent = `${complete}/4`;
    document.getElementById("cfsOnboardingProgressText").textContent = complete === 4 ? "Grundsetup vollständig" : `${percent}% abgeschlossen`;
    document.getElementById("cfsOnboardingProgressBar").style.width = `${percent}%`;

    const title = document.getElementById("cfsOnboardingNextTitle");
    const text = document.getElementById("cfsOnboardingNextText");
    const action = document.getElementById("cfsOnboardingNextAction");

    if (complete === 4) {
      shell.classList.add("cfs-onboarding-success");
      title.textContent = "Grundsetup abgeschlossen";
      text.textContent = "Dein Account ist bestätigt, geschützt und dein Workspace ist startklar.";
      action.textContent = "WIDGET STUDIO ÖFFNEN";
      action.href = "/pages/widget-studio.html";
      action.removeAttribute("aria-disabled");

      if (localStorage.getItem(STORAGE_DISMISS) === "1") {
        shell.remove();
        return;
      }

      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "cfs-onboarding-dismiss";
      dismiss.textContent = "STARTCHECK AUSBLENDEN";
      dismiss.addEventListener("click", () => {
        localStorage.setItem(STORAGE_DISMISS, "1");
        shell.remove();
      });
      shell.querySelector(".cfs-onboarding-next-copy").appendChild(dismiss);
    } else {
      const next = steps[firstOpen];
      title.textContent = next.nextTitle;
      text.textContent = next.nextText;
      action.textContent = "WEITER";
      action.href = next.href;
      action.removeAttribute("aria-disabled");
    }
  }

  function prefillVerificationEmail() {
    if (path !== "/pages/verify-email.html") return;
    const input = document.getElementById("verifyEmailAddress");
    if (!input || input.value) return;
    try {
      const stored = sessionStorage.getItem(STORAGE_EMAIL);
      if (stored) input.value = stored;
    } catch {}
  }

  function init() {
    installAuthFlow();
    prefillVerificationEmail();
    installDashboardOnboarding();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }

  window.CFSOnboardingV4 = Object.freeze({
    pendingEmailKey: STORAGE_EMAIL,
    pendingNameKey: STORAGE_NAME,
    showVerifiedAction() {
      const next = document.getElementById("verifyNextAction");
      if (next) next.hidden = false;
    }
  });
})();

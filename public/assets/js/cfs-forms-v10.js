
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

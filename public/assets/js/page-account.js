document.addEventListener("DOMContentLoaded", async () => {
  const profileForm = document.getElementById("profileForm");
  const displayNameInput = document.getElementById("displayName");
  const emailInput = document.getElementById("email");
  const planElement = document.getElementById("plan");
  const saveMsg = document.getElementById("saveMsg");
  const logoutAllBtn = document.getElementById("logoutAllBtn");
  const securityMsg = document.getElementById("securityMsg");
  const securityEventList = document.getElementById("securityEventList");
  const securitySignalText = document.getElementById("securitySignalText");
  const securitySignalStatus = document.getElementById("securitySignalStatus");
  const deleteAccountForm = document.getElementById("deleteAccountForm");
  const deletePassword = document.getElementById("deletePassword");
  const deleteConfirmation = document.getElementById("deleteConfirmation");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const deleteMsg = document.getElementById("deleteMsg");
  const sessionList = document.getElementById("sessionList");
  const sessionMsg = document.getElementById("sessionMsg");
  const dataExportForm = document.getElementById("dataExportForm");
  const exportPassword = document.getElementById("exportPassword");
  const dataExportBtn = document.getElementById("dataExportBtn");
  const exportMsg = document.getElementById("exportMsg");
  const tiktokLifecycleText = document.getElementById("tiktokLifecycleText");
  const disconnectTikTokBtn = document.getElementById("disconnectTikTokBtn");
  const tiktokLifecycleMsg = document.getElementById("tiktokLifecycleMsg");
  const passwordChangeForm = document.getElementById("passwordChangeForm");
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");
  const newPasswordConfirm = document.getElementById("newPasswordConfirm");
  const passwordChangeBtn = document.getElementById("passwordChangeBtn");
  const passwordChangeMsg = document.getElementById("passwordChangeMsg");
  const emailVerificationText = document.getElementById("emailVerificationText");
  const emailVerificationStatus = document.getElementById("emailVerificationStatus");
  const requestVerificationBtn = document.getElementById("requestVerificationBtn");
  const emailVerificationMsg = document.getElementById("emailVerificationMsg");
  const mfaSummaryText = document.getElementById("mfaSummaryText");
  const mfaSummaryStatus = document.getElementById("mfaSummaryStatus");
  const mfaManageText = document.getElementById("mfaManageText");
  const mfaSetupBlock = document.getElementById("mfaSetupBlock");
  const mfaActiveBlock = document.getElementById("mfaActiveBlock");
  const mfaEnrollBlock = document.getElementById("mfaEnrollBlock");
  const mfaCodesBlock = document.getElementById("mfaCodesBlock");
  const mfaRecoveryCodes = document.getElementById("mfaRecoveryCodes");
  const mfaSetupForm = document.getElementById("mfaSetupForm");
  const mfaSetupPassword = document.getElementById("mfaSetupPassword");
  const mfaSetupBtn = document.getElementById("mfaSetupBtn");
  const mfaSecret = document.getElementById("mfaSecret");
  const mfaOtpUri = document.getElementById("mfaOtpUri");
  const mfaEnableForm = document.getElementById("mfaEnableForm");
  const mfaEnableCode = document.getElementById("mfaEnableCode");
  const mfaEnableBtn = document.getElementById("mfaEnableBtn");
  const mfaRecoveryForm = document.getElementById("mfaRecoveryForm");
  const mfaRecoveryPassword = document.getElementById("mfaRecoveryPassword");
  const mfaRecoveryTotp = document.getElementById("mfaRecoveryTotp");
  const mfaRecoveryBtn = document.getElementById("mfaRecoveryBtn");
  const mfaDisableForm = document.getElementById("mfaDisableForm");
  const mfaDisablePassword = document.getElementById("mfaDisablePassword");
  const mfaDisableCode = document.getElementById("mfaDisableCode");
  const mfaDisableBtn = document.getElementById("mfaDisableBtn");
  const mfaMsg = document.getElementById("mfaMsg");
  const passkeySummaryText = document.getElementById("passkeySummaryText");
  const passkeySummaryStatus = document.getElementById("passkeySummaryStatus");
  const passkeyList = document.getElementById("passkeyList");
  const passkeyAddForm = document.getElementById("passkeyAddForm");
  const passkeyLabel = document.getElementById("passkeyLabel");
  const passkeyPassword = document.getElementById("passkeyPassword");
  const passkeyRemovePassword = document.getElementById("passkeyRemovePassword");
  const passkeyAddBtn = document.getElementById("passkeyAddBtn");
  const passkeyMsg = document.getElementById("passkeyMsg");
  let currentAccountEmail = "";

  function showNotice(element, message, danger = false) {
    element.textContent = message;
    element.className = danger ? "notice danger" : "notice";
  }

  function updateDeleteButton() {
    const passwordReady = deletePassword.value.length > 0;
    const confirmationReady = deleteConfirmation.value.trim().toUpperCase() === "LÖSCHEN";
    deleteAccountBtn.disabled = !(passwordReady && confirmationReady);
  }

  deletePassword.addEventListener("input", updateDeleteButton);
  deleteConfirmation.addEventListener("input", updateDeleteButton);

  const securityEventLabels = {
    account_registered: "Creator-Konto erstellt",
    login_success: "Erfolgreich angemeldet",
    logout_all: "Auf allen Geräten abgemeldet",
    profile_updated: "Creator-Profil geändert",
    session_revoked: "Login-Sitzung beendet",
    data_export_requested: "Datenexport erstellt",
    tiktok_disconnected: "TikTok-Verbindung getrennt",
    password_changed: "Passwort geändert",
    email_verification_requested: "E-Mail-Bestätigung angefordert",
    email_verified: "E-Mail-Adresse bestätigt",
    password_reset_requested: "Passwort-Recovery angefordert",
    password_reset_completed: "Passwort über Recovery geändert",
    mfa_enabled: "Zwei-Faktor-Schutz aktiviert",
    mfa_disabled: "Zwei-Faktor-Schutz deaktiviert",
    login_success_mfa: "Mit Zwei-Faktor-Schutz angemeldet",
    mfa_recovery_code_used: "Recovery-Code zur Anmeldung verwendet",
    mfa_recovery_codes_regenerated: "Recovery-Codes erneuert",
    login_success_passkey: "Mit Passkey angemeldet",
    passkey_added: "Passkey hinzugefügt",
    passkey_removed: "Passkey entfernt",
    mfa_after_password_failed: "Korrektes Passwort, zweiter Faktor fehlgeschlagen",
    login_throttled: "Viele Passwortversuche vorübergehend gedrosselt"
  };

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Zeitpunkt unbekannt";
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function authMethodLabel(method) {
    const key = String(method || "").toLowerCase();
    if (key === "passkey") return "Passkey";
    if (key === "totp") return "Passwort + Authenticator";
    if (key === "recovery_code") return "Passwort + Recovery-Code";
    if (key === "registration") return "Registrierung";
    if (key === "password_change") return "nach Passwortänderung";
    if (key === "password") return "Passwort";
    return "ältere Sitzung";
  }

  async function loadSessions() {
    try {
      const result = await CFS.json("/api/account/sessions");
      const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
      sessionList.replaceChildren();

      if (!sessions.length) {
        const empty = document.createElement("div");
        empty.className = "activity-empty";
        empty.textContent = "Keine aktive Sitzung gefunden.";
        sessionList.appendChild(empty);
        return;
      }

      for (const item of sessions) {
        const row = document.createElement("div");
        row.className = "session-row";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = item.current ? "Diese Sitzung" : "Weitere aktive Sitzung";
        const meta = document.createElement("p");
        meta.textContent = `Gestartet: ${formatDate(item.created_at)} · Methode: ${authMethodLabel(item.auth_method)} · Ablauf: ${formatDate(item.expires_at)}`;
        copy.append(title, meta);

        const button = document.createElement("button");
        button.className = "btn ghost danger-button";
        button.type = "button";
        button.textContent = item.current ? "HIER ABMELDEN" : "SITZUNG BEENDEN";
        button.addEventListener("click", async () => {
          const confirmed = window.confirm(item.current
            ? "Diese aktuelle Sitzung wirklich beenden?"
            : "Diese aktive Sitzung wirklich beenden?");
          if (!confirmed) return;
          button.disabled = true;
          try {
            const revoked = await CFS.json(`/api/account/sessions/${encodeURIComponent(item.id)}`, { method: "DELETE" });
            if (revoked.current) {
              window.location.href = "/pages/login.html?session=revoked";
              return;
            }
            showNotice(sessionMsg, "Sitzung wurde beendet.");
            await Promise.all([loadSessions(), loadSecurityEvents()]);
          } catch (error) {
            showNotice(sessionMsg, error?.message || "Sitzung konnte nicht beendet werden.", true);
            button.disabled = false;
          }
        });

        row.append(copy, button);
        sessionList.appendChild(row);
      }
    } catch (error) {
      console.error("Sitzungen laden fehlgeschlagen:", error);
      sessionList.replaceChildren();
      const failed = document.createElement("div");
      failed.className = "activity-empty";
      failed.textContent = "Aktive Sitzungen konnten nicht geladen werden.";
      sessionList.appendChild(failed);
    }
  }

  async function loadTikTokLifecycle() {
    try {
      const result = await CFS.json("/api/creator/tiktok/status");
      if (result?.connected) {
        tiktokLifecycleText.textContent = result.profile?.display_name
          ? `Verbunden mit ${result.profile.display_name}. Du kannst die Autorisierung hier trennen.`
          : "TikTok ist mit deinem Creator-Konto verbunden. Du kannst die Autorisierung hier trennen.";
        disconnectTikTokBtn.hidden = false;
      } else {
        tiktokLifecycleText.textContent = "Aktuell ist keine TikTok-Autorisierung mit diesem Creator-Konto verbunden.";
        disconnectTikTokBtn.hidden = true;
      }
    } catch (error) {
      console.error("TikTok Lifecycle Status fehlgeschlagen:", error);
      tiktokLifecycleText.textContent = "TikTok-Status konnte nicht geladen werden.";
      disconnectTikTokBtn.hidden = true;
    }
  }


  async function loadMailSecurity(account) {
    currentAccountEmail = String(account?.email || "");
    try {
      const status = await CFS.json("/api/account/mail/status");
      if (account?.email_verified) {
        emailVerificationText.textContent = `Bestätigt${account.email_verified_at ? ` · ${formatDate(account.email_verified_at)}` : ""}.`;
        emailVerificationStatus.textContent = "BESTÄTIGT";
        emailVerificationStatus.className = "status-pill active";
        requestVerificationBtn.hidden = true;
        return;
      }
      if (status?.email_verification_available) {
        emailVerificationText.textContent = "Diese Adresse ist noch nicht bestätigt. Du kannst einen neuen zeitlich begrenzten Bestätigungslink anfordern.";
        emailVerificationStatus.textContent = status?.email_verification_required ? "BESTÄTIGUNG ERFORDERLICH" : "NOCH NICHT BESTÄTIGT";
        emailVerificationStatus.className = "status-pill planned";
        requestVerificationBtn.hidden = false;
      } else {
        emailVerificationText.textContent = "Die technische Verifizierung ist vorbereitet, der produktive Mail-Relay ist auf diesem Server aber noch nicht aktiviert.";
        emailVerificationStatus.textContent = "MAIL-RELAY NICHT AKTIV";
        emailVerificationStatus.className = "status-pill planned";
        requestVerificationBtn.hidden = true;
      }
    } catch {
      emailVerificationText.textContent = "Status des Mail-Relays konnte nicht geladen werden.";
      emailVerificationStatus.textContent = "STATUS UNBEKANNT";
      emailVerificationStatus.className = "status-pill planned";
      requestVerificationBtn.hidden = true;
    }
  }

  function showRecoveryCodes(codes) {
    const rows = Array.isArray(codes) ? codes.filter(Boolean) : [];
    if (!rows.length) { mfaCodesBlock.hidden = true; return; }
    mfaRecoveryCodes.textContent = rows.join("\n");
    mfaCodesBlock.hidden = false;
  }

  async function loadMfaStatus() {
    try {
      const result = await CFS.json("/api/account/mfa");
      const enabled = Boolean(result?.enabled);
      const remaining = Number(result?.recovery_codes_remaining || 0);
      mfaSummaryText.textContent = enabled
        ? `Aktiv${result?.enabled_at ? ` seit ${formatDate(result.enabled_at)}` : ""}. Noch ${remaining} unbenutzte Recovery-Codes.`
        : "Optionaler TOTP-Schutz ist aktuell nicht aktiviert.";
      mfaSummaryStatus.textContent = enabled ? "AKTIV · TOTP + RECOVERY" : "OPTIONAL · NICHT AKTIV";
      mfaSummaryStatus.className = enabled ? "status-pill active" : "status-pill planned";
      mfaManageText.textContent = enabled
        ? `Zwei-Faktor-Schutz ist aktiv. ${remaining} Recovery-Codes sind noch unbenutzt.`
        : "Aktiviere TOTP mit einer Authenticator-App. Das Secret wird verschlüsselt gespeichert; Recovery-Codes erscheinen nur einmal im Klartext.";
      mfaSetupBlock.hidden = enabled;
      mfaActiveBlock.hidden = !enabled;
      if (enabled) mfaEnrollBlock.hidden = true;
      return result;
    } catch (error) {
      mfaSummaryText.textContent = "MFA-Status konnte nicht geladen werden.";
      mfaSummaryStatus.textContent = "STATUS UNBEKANNT";
      mfaSummaryStatus.className = "status-pill planned";
      mfaManageText.textContent = "MFA-Status konnte nicht geladen werden.";
      return null;
    }
  }

  async function loadPasskeys() {
    if (!passkeyList) return null;
    const browserSupported = Boolean(window.CFSWebAuthn?.supported?.());
    try {
      const result = await CFS.json("/api/account/passkeys");
      const items = Array.isArray(result?.passkeys) ? result.passkeys : [];
      passkeyList.replaceChildren();
      passkeySummaryText.textContent = items.length
        ? `${items.length} Passkey${items.length === 1 ? "" : "s"} registriert. WebAuthn bindet die Signatur an die echte Domain.`
        : "Noch kein Passkey registriert. TOTP bleibt als separate zweite Schutzschicht verfügbar.";
      passkeySummaryStatus.textContent = items.length ? `AKTIV · ${items.length} PASSKEY${items.length === 1 ? "" : "S"}` : "OPTIONAL · NICHT AKTIV";
      passkeySummaryStatus.className = items.length ? "status-pill active" : "status-pill planned";
      passkeyAddBtn.disabled = !browserSupported;
      if (!browserSupported) showNotice(passkeyMsg, "Dieser Browser unterstützt WebAuthn/Passkeys nicht oder stellt die API hier nicht bereit.", true);

      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "activity-empty";
        empty.textContent = "Noch kein Passkey registriert.";
        passkeyList.appendChild(empty);
        return result;
      }

      for (const item of items) {
        const row = document.createElement("div");
        row.className = "session-row";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = item.label || "Passkey";
        const meta = document.createElement("p");
        const backup = item.backed_up ? "synchronisierbar/gesichert" : "gerätgebunden oder nicht als gesichert gemeldet";
        meta.textContent = `Hinzugefügt: ${formatDate(item.created_at)} · ${backup}${item.last_used_at ? ` · zuletzt genutzt: ${formatDate(item.last_used_at)}` : ""}`;
        copy.append(title, meta);
        const button = document.createElement("button");
        button.className = "btn ghost danger-button";
        button.type = "button";
        button.textContent = "ENTFERNEN";
        button.addEventListener("click", async () => {
          if (!passkeyRemovePassword.value) { showNotice(passkeyMsg, "Bitte zuerst das aktuelle Passwort im Feld „Passwort für Entfernen“ eingeben.", true); passkeyRemovePassword.focus(); return; }
          if (!window.confirm(`Passkey „${item.label || "Passkey"}“ wirklich entfernen? Andere aktive Sitzungen werden beendet.`)) return;
          button.disabled = true;
          try {
            const result = await CFS.json(`/api/account/passkeys/${encodeURIComponent(item.id)}`, {
              method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({password:passkeyRemovePassword.value})
            });
            passkeyRemovePassword.value = "";
            showNotice(passkeyMsg, result?.message || "Passkey entfernt.");
            await Promise.all([loadPasskeys(), loadSecurityEvents(), loadSessions(), loadMfaStatus()]);
          } catch (error) {
            showNotice(passkeyMsg, error?.message || "Passkey konnte nicht entfernt werden.", true);
            button.disabled = false;
          }
        });
        row.append(copy, button);
        passkeyList.appendChild(row);
      }
      return result;
    } catch (error) {
      passkeySummaryText.textContent = "Passkey-Status konnte nicht geladen werden.";
      passkeySummaryStatus.textContent = "STATUS UNBEKANNT";
      passkeySummaryStatus.className = "status-pill planned";
      passkeyList.replaceChildren();
      const failed = document.createElement("div"); failed.className = "activity-empty"; failed.textContent = "Passkeys konnten nicht geladen werden."; passkeyList.appendChild(failed);
      return null;
    }
  }

  async function loadSecurityEvents() {
    try {
      const result = await CFS.json("/api/account/security-events");
      const events = Array.isArray(result?.events) ? result.events : [];
      const suspicious = Number(result?.summary?.suspicious_mfa_failures_30d || 0);
      const lastLoginAt = result?.summary?.last_login_at || null;
      if (securitySignalText && securitySignalStatus) {
        securitySignalText.textContent = suspicious > 0
          ? `${suspicious} fehlgeschlagene Bestätigung${suspicious === 1 ? "" : "en"} nach korrektem Passwort in den letzten 30 Tagen. Letzte erfolgreiche Anmeldung: ${lastLoginAt ? formatDate(lastLoginAt) : "noch nicht erfasst"}.`
          : `Keine fehlgeschlagene zweite Faktor-Bestätigung nach korrektem Passwort in den letzten 30 Tagen. Letzte erfolgreiche Anmeldung: ${lastLoginAt ? formatDate(lastLoginAt) : "noch nicht erfasst"}.`;
        securitySignalStatus.textContent = suspicious > 0 ? "PRÜFEN" : "KEIN SIGNAL";
        securitySignalStatus.className = suspicious > 0 ? "status-pill planned" : "status-pill active";
      }

      securityEventList.replaceChildren();

      if (!events.length) {
        const empty = document.createElement("li");
        empty.className = "activity-empty";
        empty.textContent = "Noch keine Sicherheitsereignisse gespeichert.";
        securityEventList.appendChild(empty);
        return;
      }

      for (const item of events) {
        const entry = document.createElement("li");
        entry.className = "activity-entry";

        const label = document.createElement("strong");
        label.textContent = securityEventLabels[item?.event_type] || "Account-Aktivität";

        const time = document.createElement("time");
        const date = new Date(item?.created_at);
        time.dateTime = Number.isNaN(date.getTime()) ? "" : date.toISOString();
        time.textContent = Number.isNaN(date.getTime())
          ? "Zeitpunkt unbekannt"
          : new Intl.DateTimeFormat("de-DE", {
              dateStyle: "medium",
              timeStyle: "short"
            }).format(date);

        entry.append(label, time);
        securityEventList.appendChild(entry);
      }
    } catch (error) {
      console.error("Sicherheitsaktivität laden fehlgeschlagen:", error);
      securityEventList.replaceChildren();
      const failed = document.createElement("li");
      failed.className = "activity-empty";
      failed.textContent = "Sicherheitsaktivität konnte nicht geladen werden.";
      securityEventList.appendChild(failed);
    }
  }

  try {
    const authResult = await CFS.requireAuth();
    if (!authResult) return;

    const account = authResult.account || authResult;

    displayNameInput.value = account.display_name || "";
    emailInput.value = account.email || "";
    await loadMailSecurity(account);
    planElement.textContent = CFS.planLabel(account.plan || "free");

    const access = authResult.access || {};
    const entitlements = authResult.entitlements || {};
    const badgeHost = document.getElementById("accountAccessBadges");
    const accessText = document.getElementById("accountAccessText");
    const featureHost = document.getElementById("accountFeatureGrid");

    const badges = [`<span class="access-badge">${CFS.planLabel(account.plan || "free")} PLAN</span>`];
    if (access.beta?.active) badges.push('<span class="access-badge beta">✓ BETA TESTER</span>');
    if (access.effective_plan && access.effective_plan !== account.plan) {
      badges.push(`<span class="access-badge pro">ZUGRIFF: ${CFS.planLabel(access.effective_plan)}</span>`);
    }
    badgeHost.innerHTML = badges.join("");
    accessText.textContent = access.beta?.active
      ? "Beta-Freigabe erweitert deinen normalen Plan für die aktuelle Testphase."
      : "Deine Funktionen richten sich nach deinem aktiven Plan.";

    const featureLabels = [
      ["live_bridge","Creator LIVE"],
      ["live_widgets","LIVE Widgets"],
      ["alerts","Alerts"],
      ["auto_thanks","AutoThanks"],
      ["stream_deck","Stream Deck"],
      ["games","Games"],
      ["cut_studio","Cut Studio"],
      ["advanced_output","Advanced Output"]
    ];
    featureHost.innerHTML = featureLabels.map(([key,label]) => {
      const yes = Boolean(entitlements[key]);
      return `<div class="access-feature ${yes ? "yes" : "no"}"><span>${CFS.escape(label)}</span><b>${yes ? "✓ FREI" : "GESPERRT"}</b></div>`;
    }).join("");

    await Promise.all([loadSecurityEvents(), loadSessions(), loadTikTokLifecycle(), loadMfaStatus(), loadPasskeys()]);

    requestVerificationBtn?.addEventListener("click", async () => {
      if (!currentAccountEmail) return;
      requestVerificationBtn.disabled = true;
      showNotice(emailVerificationMsg, "Bestätigungslink wird angefordert …");
      try {
        const result = await CFS.json("/api/account/email/verification/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentAccountEmail })
        });
        showNotice(emailVerificationMsg, result?.message || "Bestätigungslink wurde angefordert.");
      } catch (error) {
        showNotice(emailVerificationMsg, error?.message || "Bestätigungslink konnte nicht angefordert werden.", true);
      } finally {
        requestVerificationBtn.disabled = false;
      }
    });

    passkeyAddForm?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!window.CFSWebAuthn?.supported?.()) { showNotice(passkeyMsg, "Dieser Browser unterstützt WebAuthn/Passkeys nicht.", true); return; }
      if (!passkeyPassword.value) { showNotice(passkeyMsg, "Bitte aktuelles Passwort eingeben.", true); return; }
      passkeyAddBtn.disabled = true;
      try {
        showNotice(passkeyMsg, "Passkey-Einrichtung wird vorbereitet …");
        const start = await CFS.json("/api/account/passkeys/register/options", {
          method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({password:passkeyPassword.value})
        });
        const response = await CFSWebAuthn.create(start.options);
        const result = await CFS.json("/api/account/passkeys/register/verify", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({challenge_id:start.challenge_id,response,label:passkeyLabel.value})
        });
        passkeyPassword.value = "";
        showRecoveryCodes(result?.recovery_codes);
        showNotice(passkeyMsg, result?.message || "Passkey wurde hinzugefügt.");
        await Promise.all([loadPasskeys(), loadSecurityEvents(), loadSessions(), loadMfaStatus()]);
      } catch (error) {
        const aborted = error?.name === "NotAllowedError" || /abgebrochen/i.test(String(error?.message||""));
        showNotice(passkeyMsg, aborted ? "Passkey-Einrichtung wurde abgebrochen." : (error?.message || "Passkey konnte nicht hinzugefügt werden."), true);
      } finally { passkeyAddBtn.disabled = false; }
    });

    mfaSetupForm?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!mfaSetupPassword.value) { showNotice(mfaMsg, "Bitte aktuelles Passwort eingeben.", true); return; }
      mfaSetupBtn.disabled = true;
      try {
        const result = await CFS.json("/api/account/mfa/setup", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:mfaSetupPassword.value})});
        mfaSetupPassword.value = "";
        mfaSecret.value = result?.secret || "";
        mfaOtpUri.value = result?.otpauth_uri || "";
        mfaEnrollBlock.hidden = false;
        showNotice(mfaMsg, result?.message || "MFA-Einrichtung gestartet.");
        mfaEnableCode.focus();
      } catch(error) { showNotice(mfaMsg, error?.message || "MFA-Einrichtung konnte nicht gestartet werden.", true); }
      finally { mfaSetupBtn.disabled = false; }
    });

    mfaEnableForm?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!/^\d{6}$/.test(mfaEnableCode.value.trim())) { showNotice(mfaMsg, "Bitte einen 6-stelligen Authenticator-Code eingeben.", true); return; }
      mfaEnableBtn.disabled = true;
      try {
        const result = await CFS.json("/api/account/mfa/enable", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:mfaEnableCode.value.trim()})});
        mfaEnableCode.value = "";
        mfaSecret.value = "";
        mfaOtpUri.value = "";
        showRecoveryCodes(result?.recovery_codes);
        showNotice(mfaMsg, result?.message || "Zwei-Faktor-Schutz ist aktiv.");
        await Promise.all([loadMfaStatus(), loadSecurityEvents(), loadSessions()]);
      } catch(error) { showNotice(mfaMsg, error?.message || "MFA konnte nicht aktiviert werden.", true); }
      finally { mfaEnableBtn.disabled = false; }
    });

    mfaRecoveryForm?.addEventListener("submit", async event => {
      event.preventDefault();
      mfaRecoveryBtn.disabled = true;
      try {
        const result = await CFS.json("/api/account/mfa/recovery-codes", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:mfaRecoveryPassword.value,code:mfaRecoveryTotp.value.trim()})});
        mfaRecoveryPassword.value = ""; mfaRecoveryTotp.value = "";
        showRecoveryCodes(result?.recovery_codes);
        showNotice(mfaMsg, result?.message || "Recovery-Codes wurden erneuert.");
        await Promise.all([loadMfaStatus(), loadSecurityEvents()]);
      } catch(error) { showNotice(mfaMsg, error?.message || "Recovery-Codes konnten nicht erneuert werden.", true); }
      finally { mfaRecoveryBtn.disabled = false; }
    });

    mfaDisableForm?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!window.confirm("Zwei-Faktor-Schutz wirklich deaktivieren? Andere aktive Sitzungen werden beendet.")) return;
      mfaDisableBtn.disabled = true;
      const entered = mfaDisableCode.value.trim();
      const body = {password:mfaDisablePassword.value};
      if (/^\d{6}$/.test(entered)) body.code = entered; else body.recovery_code = entered;
      try {
        const result = await CFS.json("/api/account/mfa/disable", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        mfaDisablePassword.value = ""; mfaDisableCode.value = ""; mfaCodesBlock.hidden = true;
        showNotice(mfaMsg, result?.message || "Zwei-Faktor-Schutz wurde deaktiviert.");
        await Promise.all([loadMfaStatus(), loadSecurityEvents(), loadSessions()]);
      } catch(error) { showNotice(mfaMsg, error?.message || "MFA konnte nicht deaktiviert werden.", true); }
      finally { mfaDisableBtn.disabled = false; }
    });

    passwordChangeForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!passwordChangeForm.reportValidity()) return;
      if (newPassword.value !== newPasswordConfirm.value) {
        showNotice(passwordChangeMsg, "Die beiden neuen Passwörter stimmen nicht überein.", true);
        return;
      }
      if (newPassword.value.length < 15) {
        showNotice(passwordChangeMsg, "Das neue Passwort muss mindestens 15 Zeichen lang sein.", true);
        return;
      }

      passwordChangeBtn.disabled = true;
      showNotice(passwordChangeMsg, "Passwort wird sicher geändert …");
      try {
        const result = await CFS.json("/api/account/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_password: currentPassword.value,
            new_password: newPassword.value
          })
        });
        currentPassword.value = "";
        newPassword.value = "";
        newPasswordConfirm.value = "";
        showNotice(passwordChangeMsg, result?.message || "Passwort wurde geändert. Andere Sitzungen wurden beendet.");
        await Promise.all([loadSecurityEvents(), loadSessions()]);
      } catch (error) {
        showNotice(passwordChangeMsg, error?.message || "Passwort konnte nicht geändert werden.", true);
      } finally {
        passwordChangeBtn.disabled = false;
      }
    });

    dataExportForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!dataExportForm.reportValidity()) return;
      dataExportBtn.disabled = true;
      showNotice(exportMsg, "Datenexport wird erstellt …");
      try {
        const result = await CFS.json("/api/account/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: exportPassword.value })
        });
        const payload = result?.export || {};
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `cfs_zockt-account-export-${date}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        exportPassword.value = "";
        showNotice(exportMsg, "Datenexport wurde erstellt und heruntergeladen.");
        await Promise.all([loadSecurityEvents(), loadSessions()]);
      } catch (error) {
        showNotice(exportMsg, error?.message || "Datenexport konnte nicht erstellt werden.", true);
      } finally {
        dataExportBtn.disabled = false;
      }
    });

    disconnectTikTokBtn.addEventListener("click", async () => {
      if (!window.confirm("TikTok wirklich von diesem Creator-Konto trennen?")) return;
      disconnectTikTokBtn.disabled = true;
      try {
        await CFS.json("/api/creator/tiktok/disconnect", { method: "POST" });
        showNotice(tiktokLifecycleMsg, "TikTok-Verbindung wurde getrennt.");
        await Promise.all([loadTikTokLifecycle(), loadSecurityEvents()]);
      } catch (error) {
        showNotice(tiktokLifecycleMsg, error?.message || "TikTok-Verbindung konnte nicht getrennt werden.", true);
      } finally {
        disconnectTikTokBtn.disabled = false;
      }
    });

    profileForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!profileForm.reportValidity()) return;

      try {
        const result = await CFS.json("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: displayNameInput.value.trim() })
        });

        const updatedAccount = result?.account || null;
        if (updatedAccount?.display_name) {
          displayNameInput.value = updatedAccount.display_name;
        }

        showNotice(saveMsg, "Profil wurde gespeichert.");
        await loadSecurityEvents();
      } catch (error) {
        console.error("Profil speichern fehlgeschlagen:", error);
        showNotice(saveMsg, error?.message || "Änderung konnte nicht gespeichert werden.", true);
      }
    });

    logoutAllBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("Möchtest du wirklich alle aktiven Sitzungen beenden? Du wirst danach auch auf diesem Gerät abgemeldet.");
      if (!confirmed) return;

      logoutAllBtn.disabled = true;
      showNotice(securityMsg, "Sitzungen werden beendet …");

      try {
        await CFS.json("/api/account/logout-all", { method: "POST" });
        showNotice(securityMsg, "Alle Sitzungen wurden beendet. Du wirst abgemeldet.");
        window.setTimeout(() => { window.location.href = "/pages/login.html"; }, 700);
      } catch (error) {
        console.error("Logout-All fehlgeschlagen:", error);
        showNotice(securityMsg, error?.message || "Die Sitzungen konnten nicht beendet werden.", true);
        logoutAllBtn.disabled = false;
      }
    });

    deleteAccountForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!deleteAccountForm.reportValidity()) return;
      if (deleteConfirmation.value.trim().toUpperCase() !== "LÖSCHEN") {
        showNotice(deleteMsg, "Bitte gib zur Bestätigung exakt LÖSCHEN ein.", true);
        return;
      }

      const finalConfirm = window.confirm(
        "Creator-Konto wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden."
      );

      if (!finalConfirm) return;

      deleteAccountBtn.disabled = true;
      deletePassword.disabled = true;
      deleteConfirmation.disabled = true;
      showNotice(deleteMsg, "Creator-Konto wird gelöscht …");

      try {
        await CFS.json("/api/account", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: deletePassword.value,
            confirmation: deleteConfirmation.value.trim()
          })
        });

        showNotice(deleteMsg, "Dein Creator-Konto wurde gelöscht. Du wirst zum Login weitergeleitet.");

        window.setTimeout(() => {
          window.location.href = "/pages/login.html?account=deleted";
        }, 900);
      } catch (error) {
        console.error("Account löschen fehlgeschlagen:", error);
        showNotice(deleteMsg, error?.message || "Das Creator-Konto konnte nicht gelöscht werden.", true);
        deletePassword.disabled = false;
        deleteConfirmation.disabled = false;
        updateDeleteButton();
      }
    });
  } catch (error) {
    console.error("Account-Seite konnte nicht geladen werden:", error);
  }
});

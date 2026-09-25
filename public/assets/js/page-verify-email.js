(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const COOLDOWN_MS = 30 * 1000;
  const COOLDOWN_KEY = "cfs_verify_email_resend_until";

  const show = (el, text, bad = false) => {
    el.textContent = text;
    el.className = "notice" + (bad ? " danger" : "");
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const output = $("verifyEmailMsg");
    const resendForm = $("verifyResendForm");
    const resendButton = $("verifyResendBtn");
    const resendMessage = $("verifyResendMsg");
    const emailInput = $("verifyEmailAddress");
    const defaultButtonLabel = "BESTÄTIGUNGSLINK ANFORDERN";
    const repeatButtonLabel = "BESTÄTIGUNGSLINK ERNEUT ANFORDERN";

    let mailReady = false;
    let sentOnce = false;
    let cooldownTimer = null;

    try {
      const pendingEmail = sessionStorage.getItem("cfs_pending_verification_email") || "";
      if (pendingEmail && emailInput && !emailInput.value) emailInput.value = pendingEmail;
    } catch {}

    const cooldownUntil = () => {
      try {
        return Number(sessionStorage.getItem(COOLDOWN_KEY) || 0) || 0;
      } catch {
        return 0;
      }
    };

    const setCooldownUntil = value => {
      try {
        if (value > Date.now()) sessionStorage.setItem(COOLDOWN_KEY, String(value));
        else sessionStorage.removeItem(COOLDOWN_KEY);
      } catch {}
    };

    const refreshResendButton = () => {
      const remainingMs = Math.max(0, cooldownUntil() - Date.now());
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      if (remainingSeconds > 0) {
        resendButton.disabled = true;
        resendButton.textContent = `ERNEUT SENDEN IN ${remainingSeconds}s`;
        return remainingSeconds;
      }

      resendButton.disabled = !mailReady;
      resendButton.textContent = sentOnce ? repeatButtonLabel : defaultButtonLabel;
      return 0;
    };

    const stopCooldownTimer = () => {
      if (cooldownTimer) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
    };

    const runCooldownTimer = () => {
      stopCooldownTimer();
      if (!refreshResendButton()) return;

      cooldownTimer = setInterval(() => {
        if (!refreshResendButton()) stopCooldownTimer();
      }, 250);
    };

    const startCooldown = () => {
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      runCooldownTimer();
    };

    const validateEmail = () => {
      const value = String(emailInput.value || "").trim();
      emailInput.removeAttribute("aria-invalid");

      if (!value) {
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
        show(resendMessage, "Bitte gib deine E-Mail-Adresse ein.", true);
        return false;
      }

      if (!emailInput.validity.valid) {
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
        show(resendMessage, "Bitte gib eine gültige E-Mail-Adresse ein.", true);
        return false;
      }

      return true;
    };

    const params = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    const token = String(params.get("token") || "").trim();
    history.replaceState(null,"",location.pathname);

    try {
      const status = await CFS.json("/api/account/mail/status");
      mailReady = Boolean(status?.email_verification_available);
      if (!mailReady) {
        show(resendMessage, "Der produktive Mail-Relay ist auf diesem Server noch nicht aktiviert.", true);
      }
    } catch {
      mailReady = false;
      show(resendMessage, "Der E-Mail-Versandstatus konnte gerade nicht geprüft werden. Bitte versuche es später erneut.", true);
    }

    if (cooldownUntil() > Date.now()) {
      sentOnce = true;
      runCooldownTimer();
    } else {
      setCooldownUntil(0);
      refreshResendButton();
    }

    if (token) {
      try {
        const result = await CFS.json("/api/account/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        show(output, result?.message || "E-Mail-Adresse wurde bestätigt.");
        try { sessionStorage.setItem("cfs_recently_verified", "1"); } catch {}
        window.CFSOnboardingV4?.showVerifiedAction?.();
      } catch (error) {
        show(output, error?.message || "Der Bestätigungslink ist ungültig oder abgelaufen.", true);
      }
    } else {
      show(output, "Wenn du einen Bestätigungslink erhalten hast, öffne ihn vollständig. Alternativ kannst du unten einen neuen Link anfordern.");
    }

    emailInput.addEventListener("input", () => {
      if (emailInput.hasAttribute("aria-invalid")) {
        emailInput.removeAttribute("aria-invalid");
      }
    });

    resendForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!mailReady) {
        show(resendMessage, "Der E-Mail-Versand ist gerade nicht verfügbar. Bitte versuche es später erneut.", true);
        return;
      }

      const remainingSeconds = refreshResendButton();
      if (remainingSeconds > 0) {
        show(resendMessage, `Bitte warte noch ${remainingSeconds} Sekunden, bevor du einen neuen Link anforderst.`);
        return;
      }

      if (!validateEmail()) return;

      resendButton.disabled = true;
      resendButton.textContent = "WIRD ANGEFORDERT …";
      show(resendMessage, "Bestätigungslink wird angefordert …");

      try {
        await CFS.json("/api/account/email/verification/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: String(emailInput.value || "").trim().toLowerCase() })
        });

        sentOnce = true;
        show(
          resendMessage,
          "Anfrage erfolgreich. Wenn die Adresse zu einem Konto gehört, ist ein neuer Bestätigungslink unterwegs. Prüfe bitte Posteingang und Spam-Ordner."
        );
        try { sessionStorage.setItem("cfs_pending_verification_email", String(emailInput.value || "").trim().toLowerCase()); } catch {}
        startCooldown();
      } catch (error) {
        show(resendMessage, error?.message || "Ein neuer Bestätigungslink konnte nicht angefordert werden.", true);
        refreshResendButton();
      }
    });
  });
})();

(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const message = (el,text,bad=false) => { el.textContent=text; el.className="notice"+(bad?" danger":""); };
  const post = async (url,form) => {
    const body = Object.fromEntries(new FormData(form));
    return CFS.json(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  };
  const normalizeEmail = value => String(value||"").trim().toLowerCase();
  const updateRules = () => {
    const p = $("regPassword").value;
    const c = $("regPasswordConfirm").value;
    const states = {length:p.length>=15,match:p.length>0&&p===c};
    Object.entries(states).forEach(([key,ok]) => document.querySelector(`[data-rule="${key}"]`)?.classList.toggle("ok",ok));
    return Object.values(states).every(Boolean);
  };
  document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(location.search);
    const registrationAnchor = location.hash === "#regForm" || location.hash === "#registerPanel";
    if (registrationAnchor) {
      window.setTimeout(() => {
        const target = $("regForm");
        target?.scrollIntoView({behavior:"smooth",block:"center"});
        $("displayName")?.focus({preventScroll:true});
      }, 80);
    }
    if (params.get("password") === "reset") {
      message($("loginMsg"), "Passwort wurde geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.");
      history.replaceState(null, "", location.pathname + location.hash);
    }
    const source = String(new URLSearchParams(location.search).get("source") || "").trim().toLowerCase();
    if (source === "tiktok") {
      const context = document.querySelector("[data-login-source-context]");
      if (context) context.hidden = false;
    }
    try { const me = await CFS.me(); if (me?.authenticated) return location.replace("/pages/dashboard.html"); } catch {}
    $("regPassword").addEventListener("input",updateRules); $("regPasswordConfirm").addEventListener("input",updateRules);
    $("loginForm").addEventListener("submit", async e => {
      e.preventDefault(); const form=e.currentTarget; if(!form.reportValidity()) return;
      $("loginEmail").value=normalizeEmail($("loginEmail").value); $("loginButton").disabled=true; $("loginBusy").textContent="Anmeldung wird geprüft…";
      try {
        const result = await post("/api/account/login",form);
        if (result?.mfa_required) {
          form.hidden = true;
          $("mfaLoginForm").hidden = false;
          const methods = result?.mfa_methods || {};
          $("mfaTotpField").hidden = !methods.totp;
          $("mfaRecoveryField").hidden = !methods.recovery;
          $("mfaLoginButton").hidden = !(methods.totp || methods.recovery);
          $("passkeyLoginButton").hidden = !methods.passkey;
          if (methods.totp) $("mfaCode").focus();
          else if (methods.passkey) $("passkeyLoginButton").focus();
          message($("loginMsg"), methods.passkey
            ? "Passwort korrekt. Bestätige den zweiten Faktor mit Passkey, Authenticator oder Recovery-Code."
            : "Passwort korrekt. Bitte bestätige jetzt den zweiten Faktor.");
        } else {
          location.replace("/pages/dashboard.html");
        }
      }
      catch (error) {
        if (error?.data?.code === "email_verification_required") {
          message($("loginMsg"),"Bitte bestätige zuerst deine E-Mail-Adresse. Über „E-Mail bestätigen“ kannst du einen neuen Link anfordern.",true);
        } else {
          message($("loginMsg"),"Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.",true);
        }
      }
      finally { $("loginButton").disabled=false; $("loginBusy").textContent=""; }
    });
    $("mfaLoginForm").addEventListener("submit", async e => {
      e.preventDefault();
      const code=$("mfaCode").value.trim();
      const recovery=$("mfaRecoveryCode").value.trim();
      if(!code&&!recovery){message($("loginMsg"),"Bitte Authenticator- oder Recovery-Code eingeben.",true);return;}
      $("mfaLoginButton").disabled=true; $("mfaBusy").textContent="Zweiter Faktor wird geprüft…";
      try {
        const result=await CFS.json("/api/account/mfa/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,recovery_code:recovery})});
        if(result?.recovery_code_used) message($("loginMsg"),"Recovery-Code akzeptiert. Dieser Code ist jetzt verbraucht.");
        location.replace("/pages/dashboard.html");
      } catch(error){message($("loginMsg"),error?.message||"Zweiter Faktor konnte nicht bestätigt werden.",true);}
      finally{$("mfaLoginButton").disabled=false;$("mfaBusy").textContent="";}
    });
    $("passkeyLoginButton").addEventListener("click", async () => {
      if (!window.CFSWebAuthn?.supported?.()) { message($("loginMsg"),"Dieser Browser unterstützt WebAuthn/Passkeys nicht.",true); return; }
      $("passkeyLoginButton").disabled=true; $("mfaBusy").textContent="Passkey wird geprüft…";
      try {
        const start=await CFS.json("/api/account/mfa/passkey/options",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
        const response=await CFSWebAuthn.get(start.options);
        await CFS.json("/api/account/mfa/passkey/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({challenge_id:start.challenge_id,response})});
        location.replace("/pages/dashboard.html");
      } catch(error) {
        const aborted=error?.name==="NotAllowedError" || /abgebrochen/i.test(String(error?.message||""));
        message($("loginMsg"),aborted?"Passkey-Anmeldung wurde abgebrochen.":(error?.message||"Passkey konnte nicht bestätigt werden."),true);
      } finally { $("passkeyLoginButton").disabled=false; $("mfaBusy").textContent=""; }
    });

    $("mfaRestartButton").addEventListener("click",()=>location.reload());

    $("regForm").addEventListener("submit", async e => {
      e.preventDefault(); const form=e.currentTarget; if(!form.reportValidity()) return;
      $("regEmail").value=normalizeEmail($("regEmail").value);
      if(!updateRules()){message($("regMsg"),"Bitte die Passwort-Anforderungen erfüllen.",true);return;}
      $("regButton").disabled=true; $("regBusy").textContent="Konto wird sicher angelegt…";
      try {
        const body={display_name:$("displayName").value.trim(),email:$("regEmail").value,password:$("regPassword").value};
        const result = await CFS.json("/api/account/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        if (result?.verification_required) {
          message($("regMsg"),"Konto angelegt. Bitte bestätige jetzt den Link aus der E-Mail, bevor du dich anmeldest.");
          form.reset();
          updateRules();
        } else {
          location.replace("/pages/dashboard.html");
        }
      } catch (x) { message($("regMsg"),x.status===409?"Ein Konto mit diesen Daten kann nicht erstellt werden.":"Registrierung fehlgeschlagen. Bitte Eingaben prüfen und später erneut versuchen.",true); }
      finally { $("regButton").disabled=false; $("regBusy").textContent=""; }
    });
  });
})();

(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const show = (text,bad=false) => { const el=$("forgotPasswordMsg"); el.textContent=text; el.className="notice"+(bad?" danger":""); };
  document.addEventListener("DOMContentLoaded", async () => {
    const form=$("forgotPasswordForm");
    const button=$("forgotPasswordBtn");
    try {
      const status=await CFS.json("/api/account/mail/status");
      if(!status?.password_recovery_available){
        button.disabled=true;
        $("mailUnavailableNote").hidden=false;
      }
    } catch {
      button.disabled=true;
      $("mailUnavailableNote").hidden=false;
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if(!form.reportValidity()) return;
      button.disabled=true;
      show("Recovery-Anfrage wird geprüft …");
      try {
        const result=await CFS.json("/api/account/password/forgot",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({email:String($("forgotEmail").value||"").trim().toLowerCase()})
        });
        show(result?.message||"Wenn ein passendes Konto existiert, wurde ein Recovery-Link angefordert.");
        form.reset();
      } catch(error){
        show(error?.message||"Recovery ist aktuell nicht verfügbar.",true);
      } finally {
        try { const status=await CFS.json("/api/account/mail/status"); button.disabled=!status?.password_recovery_available; }
        catch { button.disabled=true; }
      }
    });
  });
})();

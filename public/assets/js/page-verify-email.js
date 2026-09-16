(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const show=(el,text,bad=false)=>{el.textContent=text;el.className="notice"+(bad?" danger":"");};
  document.addEventListener("DOMContentLoaded", async () => {
    const output=$("verifyEmailMsg");
    const resendForm=$("verifyResendForm");
    const resendButton=$("verifyResendBtn");
    const params=new URLSearchParams(String(location.hash||"").replace(/^#/,""));
    const token=String(params.get("token")||"").trim();
    history.replaceState(null,"",location.pathname);

    try {
      const status=await CFS.json("/api/account/mail/status");
      if(!status?.email_verification_available){
        resendButton.disabled=true;
        show($("verifyResendMsg"),"Der produktive Mail-Relay ist auf diesem Server noch nicht aktiviert.",true);
      }
    } catch {
      resendButton.disabled=true;
    }

    if(token){
      try{
        const result=await CFS.json("/api/account/email/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
        show(output,result?.message||"E-Mail-Adresse wurde bestätigt.");
      }catch(error){show(output,error?.message||"Der Bestätigungslink ist ungültig oder abgelaufen.",true);}
    } else {
      show(output,"Wenn du einen Bestätigungslink erhalten hast, öffne ihn vollständig. Alternativ kannst du unten einen neuen Link anfordern.");
    }

    resendForm.addEventListener("submit",async event=>{
      event.preventDefault();
      if(!resendForm.reportValidity()) return;
      resendButton.disabled=true;
      try{
        const result=await CFS.json("/api/account/email/verification/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:String($("verifyEmailAddress").value||"").trim().toLowerCase()})});
        show($("verifyResendMsg"),result?.message||"Wenn möglich, wurde ein neuer Bestätigungslink angefordert.");
        resendForm.reset();
      }catch(error){show($("verifyResendMsg"),error?.message||"Ein neuer Bestätigungslink konnte nicht angefordert werden.",true);}
      finally{try{const status=await CFS.json("/api/account/mail/status");resendButton.disabled=!status?.email_verification_available;}catch{resendButton.disabled=true;}}
    });
  });
})();

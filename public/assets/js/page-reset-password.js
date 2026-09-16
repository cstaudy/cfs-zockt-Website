(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  let recoveryToken="";
  const show=(text,bad=false)=>{const el=$("resetPasswordMsg");el.textContent=text;el.className="notice"+(bad?" danger":"");};
  const update=()=>{
    const password=$("resetPassword").value;
    const confirm=$("resetPasswordConfirm").value;
    const states={length:password.length>=15,match:password.length>0&&password===confirm};
    Object.entries(states).forEach(([key,ok])=>document.querySelector(`[data-rule="${key}"]`)?.classList.toggle("ok",ok));
    return Object.values(states).every(Boolean);
  };
  document.addEventListener("DOMContentLoaded",()=>{
    const params=new URLSearchParams(String(location.hash||"").replace(/^#/,""));
    recoveryToken=String(params.get("token")||"").trim();
    history.replaceState(null,"",location.pathname);
    if(!recoveryToken){
      $("resetPasswordBtn").disabled=true;
      show("Der Recovery-Link fehlt oder ist unvollständig. Fordere bitte einen neuen Link an.",true);
      return;
    }
    $("resetPassword").addEventListener("input",update);
    $("resetPasswordConfirm").addEventListener("input",update);
    $("resetPasswordForm").addEventListener("submit",async event=>{
      event.preventDefault();
      if(!event.currentTarget.reportValidity()||!update()) return;
      const button=$("resetPasswordBtn");button.disabled=true;
      try{
        const result=await CFS.json("/api/account/password/reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:recoveryToken,new_password:$("resetPassword").value})});
        recoveryToken="";
        event.currentTarget.reset();
        show(result?.message||"Passwort geändert. Bitte melde dich neu an.");
        window.setTimeout(()=>location.replace("/pages/login.html?password=reset"),1200);
      }catch(error){show(error?.message||"Der Recovery-Link ist ungültig oder abgelaufen.",true);button.disabled=false;}
    });
  });
})();

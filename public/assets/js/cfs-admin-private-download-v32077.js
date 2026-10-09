"use strict";
// The server is always authoritative; UI visibility is NOT security.
(async function(){
  const state=document.getElementById("adminPrivatePcState");
  const button=document.getElementById("adminPrivatePcDownload");
  if(!state||!button)return;
  const notify=(message)=>{state.textContent=message;};
  const blocked=()=>{button.setAttribute("aria-disabled","true");};
  blocked();
  try{
    const r=await fetch("/api/admin/desktop/availability",{credentials:"same-origin",cache:"no-store"});
    const obj=await r.json();
    if(!r.ok||!obj.available){
      notify(obj.code==="owner_not_configured"?"Auf dem Server muss zuerst die private Owner-E-Mail konfiguriert werden.":
             obj.code==="email_not_verified"?"Bitte bestätige zunächst deine Account-E-Mail.":
             "Privater Download derzeit nicht freigeschaltet.");
      return;
    }
    const elev=await fetch("/api/admin/creator-suite/elevation",{credentials:"same-origin",cache:"no-store"});
    const status=elev.ok?await elev.json():{};
    if(!status.active){notify("Berechtigt. Bitte in Creator Control den Admin-Schutz entsperren und danach diese Seite neu laden.");return;}
    button.removeAttribute("aria-disabled");
    notify("Berechtigt und entsperrt – das private Windows-Paket ist bereit.");
  }catch{notify("Status derzeit nicht abrufbar. Bitte später erneut versuchen.");}
  button.addEventListener("click",(event)=>{
    if(button.getAttribute("aria-disabled")==="true")event.preventDefault();
  });
})();

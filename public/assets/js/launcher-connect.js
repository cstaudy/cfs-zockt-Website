(()=>{"use strict";
const $=s=>document.querySelector(s);
const code=new URLSearchParams(location.search).get("code")||"";
let link=null;
function result(text,bad=false){const el=$("#connectResult");el.hidden=false;el.textContent=text;el.className="connect-result "+(bad?"bad":"ok")}
async function init(){
  const me=await CFS.requireAuth();if(!me)return;
  $("#accountInfo").innerHTML=`<strong>${CFS.escape(me.account?.display_name||"Creator")}</strong><span>${CFS.escape(String(me.account?.plan||"free").toUpperCase())} · ${CFS.escape(me.account?.email||"")}</span>`;
  $("#deviceCode").textContent=code||"CODE FEHLT";
  if(!code){result("Öffne diese Seite direkt über den Button im Launcher.",true);return}
  try{
    const data=await CFS.json(`/api/creator/launcher/device-link/${encodeURIComponent(code)}`);
    link=data.device_link;
    $("#deviceInfo").innerHTML=`<strong>${CFS.escape(link.machine_name||"Creator PC")}</strong><span>Launcher ${CFS.escape(link.client_version||"–")} · Status ${CFS.escape(String(link.status||"pending").toUpperCase())}</span>`;
    const usable=link.status==="pending"&&(!link.expires_at||new Date(link.expires_at).getTime()>Date.now());
    $("#confirmDevice").disabled=!usable;
    if(!usable)result("Dieser Geräte-Code ist nicht mehr gültig.",true);
  }catch(error){result(error.message,true)}
}
$("#confirmDevice").onclick=async()=>{
  if(!link)return;
  $("#confirmDevice").disabled=true;
  try{
    await CFS.json("/api/creator/launcher/device-link/confirm",{method:"POST",body:JSON.stringify({user_code:code})});
    result("Dieser PC ist jetzt mit deinem Creator Account verbunden. Du kannst zum Launcher zurückkehren.");
    $("#deviceInfo").innerHTML+=`<span>✓ VERBUNDEN</span>`;
  }catch(error){result(error.message,true);$("#confirmDevice").disabled=false}
};
document.addEventListener("DOMContentLoaded",init);
})();
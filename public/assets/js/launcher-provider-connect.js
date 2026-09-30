(function(){
  "use strict";
  const result=document.getElementById("providerConnectResult");
  const badge=document.getElementById("providerConnectBadge");
  const copy=document.getElementById("providerConnectCopy");
  const form=document.getElementById("providerConnectForm");
  const providerInput=document.getElementById("providerConnectProvider");
  const handoffInput=document.getElementById("providerConnectHandoff");
  const params=new URLSearchParams(String(location.hash||"").replace(/^#/,""));
  const provider=String(params.get("provider")||"").trim().toLowerCase();
  const handoff=String(params.get("handoff")||"").trim();
  try{history.replaceState(null,"",location.pathname+location.search)}catch{}
  const label=provider==="twitch"?"Twitch":provider==="youtube"?"YouTube":provider==="tiktok"?"TikTok":"Provider";
  if(copy)copy.textContent=`${label} wird sicher mit deinem verbundenen Creator-Account verknüpft.`;
  if(!["tiktok","twitch","youtube"].includes(provider)||!/^[A-Za-z0-9_-]{32,160}$/.test(handoff)){
    if(badge){badge.textContent="ABGELAUFEN";badge.classList.remove("available")}
    if(result)result.innerHTML="<strong>Verbindung konnte nicht gestartet werden.</strong><p>Der Launcher-Code fehlt oder ist ungültig. Starte die Verbindung im Launcher erneut.</p>";
    return;
  }
  providerInput.value=provider;
  handoffInput.value=handoff;
  if(badge)badge.textContent=`${label.toUpperCase()} · WEITER`;
  setTimeout(()=>form.submit(),150);
})();

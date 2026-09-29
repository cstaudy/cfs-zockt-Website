"use strict";
(() => {
  const gameEl=document.getElementById("game"),eventEl=document.getElementById("event"),eventTitle=document.getElementById("eventTitle"),eventText=document.getElementById("eventText"),empty=document.getElementById("empty"),status=document.getElementById("status");
  let lastSequence=-1;
  const pretty=value=>String(value||"").replace(/[-_]+/g," ").replace(/\b\w/g,m=>m.toUpperCase());
  async function refresh(){
    try{
      const response=await fetch("/api/public/state",{cache:"no-store"});
      if(!response.ok)throw new Error("status");
      const data=await response.json();
      gameEl.textContent=pretty(data.active_game)||"INTERACTIVE GAME";
      status.textContent=data.active_game?"BEREIT":"NICHT AUSGEWÄHLT";
      const events=Array.isArray(data.recent_events)?data.recent_events:[],latest=events[events.length-1];
      if(latest&&Number(latest.sequence)>lastSequence){
        lastSequence=Number(latest.sequence)||lastSequence;
        eventTitle.textContent=[latest.username,pretty(latest.type)].filter(Boolean).join(" · ")||"Community Event";
        const detail=latest.gift_name?`${latest.gift_name}${latest.gift_count>1?` ×${latest.gift_count}`:""}`:(latest.text|| (latest.like_count?`${latest.like_count} Likes`:"Event empfangen"));
        eventText.textContent=detail;
        eventEl.hidden=false;empty.hidden=true;
      }
    }catch{status.textContent="VERBINDUNG …"}
  }
  refresh();setInterval(refresh,1000);
})();

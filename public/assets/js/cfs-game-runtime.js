(()=>{"use strict";
const root=document.getElementById("gameRuntime"),token=new URLSearchParams(location.hash.slice(1)).get("token")||"";
let lastVersion=null,lastPayload=null;
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
function remaining(runtime){if(!runtime?.round_ends_at)return"–";const ms=new Date(runtime.round_ends_at).getTime()-Date.now();return Math.max(0,Math.ceil(ms/1000))+"s"}
function render(payload){
  lastPayload=payload;const r=payload.runtime||{},c=r.config||{},s=r.state||{},target=Math.max(1,Number(s.target_score||c.target_score||100)),a=Math.max(0,Number(s.score_a||0)),b=Math.max(0,Number(s.score_b||0)),pct=Math.max(0,Math.min(100,(a/(Math.max(1,a+b)))*100)),winner=String(s.winner||"");
  const show=r.status==="running"||Boolean(winner);
  if(!show){root.innerHTML="";return}
  root.innerHTML=`<div class="game-shell"><div class="game-head"><div><div class="game-kicker">${esc(String(r.game_type||"GAME").replaceAll("_"," ").toUpperCase())}</div><div class="game-title">${esc(r.title||"Community Game")}</div></div><div class="game-timer" id="gameTimer">${esc(remaining(r))}</div></div><div class="teams"><div class="team"><div class="team-name">${esc(c.team_a_name||"TEAM A")}</div><div class="team-score">${a}</div></div><div class="versus">VS</div><div class="team"><div class="team-name">${esc(c.team_b_name||"TEAM B")}</div><div class="team-score">${b}</div></div></div><div class="game-progress" style="--a:${pct}%"><div class="game-progress-a"></div><div class="game-progress-b"></div></div>${winner?`<div class="winner"><div><strong>${esc(winner==="a"?c.team_a_name||"TEAM A":c.team_b_name||"TEAM B")} WINS</strong><span>${Math.max(a,b)} / ${target} PUNKTE</span></div></div>`:""}</div>`;
}
async function tick(){
  if(!token){root.innerHTML="";return}
  try{const response=await fetch("/api/games/runtime/"+encodeURIComponent(token),{cache:"no-store"}),payload=await response.json();if(!response.ok)throw new Error(payload.error||"Game Runtime Fehler");if(lastVersion!==payload.runtime?.version){render(payload);lastVersion=payload.runtime?.version}else if(lastPayload){const timer=document.getElementById("gameTimer");if(timer)timer.textContent=remaining(lastPayload.runtime)}}catch{if(lastVersion===null)root.innerHTML=""}
}
tick();setInterval(tick,1000);
})();
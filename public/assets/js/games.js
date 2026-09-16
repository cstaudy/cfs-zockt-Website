(()=>{"use strict";
const $=s=>document.querySelector(s);let runtime=null,profile=null,timer=null,rules=[],ruleHits=[],ruleLimit=0;
function toast(msg,bad=false){const e=$("#gameToast");e.textContent=msg;e.style.borderColor=bad?"#713441":"#1d5d86";e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2400)}
function left(){if(!runtime?.round_ends_at)return"–";return Math.max(0,Math.ceil((new Date(runtime.round_ends_at).getTime()-Date.now())/1000))+"s"}
function profileFromForm(){return{title:$("#gameTitle").value.trim(),game_type:$("#gameType").value,enabled:$("#gameEnabled").value==="true",team_a_name:$("#teamAName").value.trim(),team_b_name:$("#teamBName").value.trim(),target_score:Number($("#gameTarget").value||100),round_seconds:Number($("#gameRoundSeconds").value||180),rules:$("#gameRules").value.trim()}}
function rulePayloadFromRow(row){
  const get=field=>row.querySelector(`[data-rule-field="${field}"]`);
  return{
    label:get("label")?.value||"",
    enabled:get("enabled")?.value==="true",
    event_type:get("event_type")?.value||"follow",
    team:get("team")?.value||"a",
    points:Number(get("points")?.value||1),
    amount_mode:get("amount_mode")?.value||"fixed",
    min_amount:Number(get("min_amount")?.value||1),
    gift_name:get("gift_name")?.value||"",
    gift_id:get("gift_id")?.value||""
  };
}
function newRulePayload(){
  return{
    label:$("#newRuleLabel").value.trim(),
    enabled:true,
    event_type:$("#newRuleEvent").value,
    team:$("#newRuleTeam").value,
    points:Number($("#newRulePoints").value||1),
    amount_mode:$("#newRuleMode").value,
    min_amount:Number($("#newRuleMin").value||1),
    gift_name:$("#newRuleGiftName").value.trim(),
    gift_id:$("#newRuleGiftId").value.trim()
  };
}
function renderRules(){
  $("#gameRuleCount").textContent=`${rules.length} / ${ruleLimit||0}`;
  $("#gameRuleList").innerHTML=rules.length?rules.map(rule=>`<div class="game-rule-card" data-rule-id="${CFS.escape(rule.id)}">
    <label><span>LABEL</span><input data-rule-field="label" value="${CFS.escape(rule.label||"")}"></label>
    <label><span>EVENT</span><select data-rule-field="event_type">${["follow","like","gift","share"].map(v=>`<option value="${v}" ${rule.event_type===v?"selected":""}>${v.toUpperCase()}</option>`).join("")}</select></label>
    <label><span>TEAM</span><select data-rule-field="team"><option value="a" ${rule.team==="a"?"selected":""}>A</option><option value="b" ${rule.team==="b"?"selected":""}>B</option></select></label>
    <label><span>PUNKTE</span><input data-rule-field="points" type="number" min="1" max="1000" value="${Number(rule.points||1)}"></label>
    <label><span>WERTUNG</span><select data-rule-field="amount_mode"><option value="fixed" ${rule.amount_mode==="fixed"?"selected":""}>FIX</option><option value="multiply" ${rule.amount_mode==="multiply"?"selected":""}>× MENGE</option></select></label>
    <label><span>MIN.</span><input data-rule-field="min_amount" type="number" min="1" value="${Number(rule.min_amount||1)}"></label>
    <label><span>GIFT NAME</span><input data-rule-field="gift_name" value="${CFS.escape(rule.gift_name||"")}"></label>
    <label><span>GIFT ID</span><input data-rule-field="gift_id" value="${CFS.escape(rule.gift_id||"")}"></label>
    <div class="game-rule-actions"><select data-rule-field="enabled"><option value="true" ${rule.enabled?"selected":""}>AN</option><option value="false" ${!rule.enabled?"selected":""}>AUS</option></select><button class="btn" data-save-rule>SAFE</button><button class="btn danger" data-delete-rule>×</button></div>
  </div>`).join(""):'<div class="game-rule-empty">Noch keine LIVE-Regel. Erstelle oben die erste Zuordnung.</div>';
  $("#gameRuleHits").innerHTML=ruleHits.length?ruleHits.map(hit=>`<div class="game-rule-hit"><strong>${CFS.escape(String(hit.event_type||"").toUpperCase())} → TEAM ${CFS.escape(String(hit.team||"a").toUpperCase())} · <b>+${Number(hit.points||0)}</b></strong><small>${CFS.escape(hit.actor_name||"LIVE Event")}${hit.gift_name?` · ${CFS.escape(hit.gift_name)}`:""} · ${hit.created_at?new Date(hit.created_at).toLocaleTimeString("de-DE"):""}</small></div>`).join(""):'<div class="game-rule-empty">Noch kein echter Regel-Treffer in der LIVE-Pipeline.</div>';
}
function render(){
  if(profile){$("#gameTitle").value=profile.title||"Community Battle";$("#gameType").value=profile.game_type||"chat_battle";$("#gameEnabled").value=String(profile.enabled!==false);$("#teamAName").value=profile.team_a_name||"TEAM A";$("#teamBName").value=profile.team_b_name||"TEAM B";$("#gameTarget").value=profile.target_score||100;$("#gameRoundSeconds").value=profile.round_seconds||180;$("#gameRules").value=profile.rules||""}
  const r=runtime||{},c=r.config||profile||{},s=r.state||{},running=r.status==="running";
  $("#runtimeHeroState").textContent=running?"RUNNING":"IDLE";renderRules();$("#runtimePill").textContent=running?"RUNNING":"IDLE";$("#runtimePill").className="game-runtime-pill"+(running?" running":"");$("#runtimeTitle").textContent=r.title||c.title||"Community Battle";$("#scoreATeam").textContent=c.team_a_name||"TEAM A";$("#scoreBTeam").textContent=c.team_b_name||"TEAM B";$("#scoreA").textContent=Number(s.score_a||0);$("#scoreB").textContent=Number(s.score_b||0);$("#runtimeTarget").textContent=Number(s.target_score||c.target_score||100);$("#runtimeRound").textContent=Number(s.round||1);$("#runtimeTimer").textContent=left();$("#startGame").disabled=running;$("#stopGame").disabled=!running;document.querySelectorAll("[data-score-team]").forEach(b=>b.disabled=!running);const url=r.source_url||"";$("#gameOutputUrl").value=url;$("#openGameUrl").href=url||"#";$("#copyGameUrl").disabled=!url
}
async function load(){const [p,r,ruleData]=await Promise.all([CFS.json("/api/creator/modules/games/state"),CFS.json("/api/creator/games/runtime"),CFS.json("/api/creator/games/rules")]);profile=r.profile&&Object.keys(r.profile).length?r.profile:(p.state||{});runtime=r.runtime;rules=ruleData.rules||[];ruleHits=ruleData.recent_hits||[];ruleLimit=Number(ruleData.limits?.max_rules||0);render()}
async function action(path,body={}){const d=await CFS.json(path,{method:"POST",body:JSON.stringify(body)});runtime=d.runtime;profile=runtime?.config||profile;render();return d}
document.addEventListener("DOMContentLoaded",async()=>{const me=await CFS.requireAuth();if(!me)return;document.querySelector("[data-mobile-toggle]")?.addEventListener("click",()=>document.querySelector("[data-nav]")?.classList.toggle("open"));try{await load()}catch(e){if(e.status===403){$("#gameGate").textContent=e.message;$("#gameGate").classList.remove("hidden");$("#gameApp").classList.add("hidden")}else toast(e.message,true)}
$("#saveGameProfile").onclick=async()=>{try{const p=profileFromForm(),d=await CFS.json("/api/creator/modules/games/state",{method:"PUT",body:JSON.stringify({state:p})});profile=d.state;render();toast("Game-Profil gespeichert.")}catch(e){toast(e.message,true)}};
$("#startGame").onclick=()=>action("/api/creator/games/runtime/start").then(()=>toast("Game gestartet.")).catch(e=>toast(e.message,true));$("#stopGame").onclick=()=>action("/api/creator/games/runtime/stop").then(()=>toast("Game gestoppt.")).catch(e=>toast(e.message,true));$("#resetGame").onclick=()=>action("/api/creator/games/runtime/reset").then(()=>toast("Runde zurückgesetzt.")).catch(e=>toast(e.message,true));document.querySelectorAll("[data-score-team]").forEach(b=>b.onclick=()=>action("/api/creator/games/runtime/score",{team:b.dataset.scoreTeam,delta:Number(b.dataset.scoreDelta||1)}).catch(e=>toast(e.message,true)));$("#addGameRule").onclick=async()=>{if(ruleLimit&&rules.length>=ruleLimit){toast(`Maximal ${ruleLimit} Game-Regeln in deinem Zugriff.`,true);return}try{const d=await CFS.json("/api/creator/games/rules",{method:"POST",body:JSON.stringify(newRulePayload())});rules.push(d.rule);$("#newRuleLabel").value="";$("#newRuleGiftName").value="";$("#newRuleGiftId").value="";renderRules();toast("Game-Regel erstellt.")}catch(e){toast(e.message,true)}};
$("#gameRuleList").onclick=async e=>{const row=e.target.closest("[data-rule-id]");if(!row)return;const id=row.dataset.ruleId;if(e.target.closest("[data-save-rule]")){try{const d=await CFS.json(`/api/creator/games/rules/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify(rulePayloadFromRow(row))});rules=rules.map(r=>r.id===id?d.rule:r);renderRules();toast("Game-Regel gespeichert.")}catch(err){toast(err.message,true)}}if(e.target.closest("[data-delete-rule]")){if(!confirm("Game-Regel löschen?"))return;try{await CFS.json(`/api/creator/games/rules/${encodeURIComponent(id)}`,{method:"DELETE"});rules=rules.filter(r=>r.id!==id);renderRules();toast("Game-Regel gelöscht.")}catch(err){toast(err.message,true)}}};
$("#copyGameUrl").onclick=async()=>{const u=$("#gameOutputUrl").value;if(u){await navigator.clipboard.writeText(u);toast("Game Output URL kopiert.")}};timer=setInterval(()=>{if(runtime?.status==="running")$("#runtimeTimer").textContent=left()},1000);
setInterval(async()=>{try{const [r,d]=await Promise.all([CFS.json("/api/creator/games/runtime"),CFS.json("/api/creator/games/rules")]);runtime=r.runtime;rules=d.rules||rules;ruleHits=d.recent_hits||ruleHits;ruleLimit=Number(d.limits?.max_rules||ruleLimit);render()}catch{}},3000);});
})();
(()=>{"use strict";
const $=s=>document.querySelector(s);const state={data:null,selected:null,betaCenter:null,production:null,billingCenter:null,releaseOps:null,configDoctor:null,publicReviews:null,supportReports:null,cspTelemetry:null,adminElevation:null,adminAudit:null,incidentState:null,me:null};
function toast(msg,bad=false){const e=$("#adminToast");e.textContent=msg;e.style.borderColor=bad?"#713541":"#1c5c86";e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2500)}
async function adminJson(url,options={}){try{return await CFS.json(url,options)}catch(error){if(error.status===428&&error.data?.code==="admin_reauth_required"){state.adminElevation={active:false,expires_at:null};renderAdminElevation();toast("Admin-Schutz gesperrt. Bitte Passwort oben erneut bestätigen.",true)}throw error}}
function renderAdminElevation(){const box=document.querySelector(".admin-security-stepup"),status=$("#adminElevationStatus"),meta=$("#adminElevationMeta");if(!box||!status||!meta)return;const active=Boolean(state.adminElevation?.active),until=state.adminElevation?.expires_at?new Date(state.adminElevation.expires_at):null,remaining=until?Math.max(0,Math.ceil((until-Date.now())/60000)):0;box.classList.toggle("is-unlocked",active&&remaining>0);status.textContent=active&&remaining>0?"ENTSPERRT":"GESPERRT";meta.textContent=active&&remaining>0?`Privilegierte Schreibaktionen sind noch ca. ${remaining} Min. freigegeben. Die Freigabe gilt nur für diese Login-Sitzung.`:"Änderungen an Creator-, Moderations-, Beta- und Release-Daten benötigen eine frische Passwortbestätigung."}
async function loadAdminElevation(){state.adminElevation=await CFS.json("/api/admin/creator-suite/elevation");renderAdminElevation()}
async function unlockAdminElevation(){const input=$("#adminElevationPassword"),password=String(input?.value||"");if(!password){toast("Bitte aktuelles Admin-Passwort eingeben.",true);return}try{state.adminElevation=await CFS.json("/api/admin/creator-suite/elevation",{method:"POST",body:JSON.stringify({password})});if(input)input.value="";renderAdminElevation();toast("Admin-Schreibschutz für 10 Minuten entsperrt.");await loadAdminAudit().catch(()=>{})}catch(error){if(input)input.value="";state.adminElevation={active:false};renderAdminElevation();toast(error.message,true)}}
async function lockAdminElevation(){try{await CFS.json("/api/admin/creator-suite/elevation",{method:"DELETE",body:"{}"});state.adminElevation={active:false};renderAdminElevation();toast("Admin-Schreibschutz gesperrt.")}catch(error){toast(error.message,true)}}
function renderAdminAudit(){const host=$("#adminAuditList"),meta=$("#adminAuditMeta"),badge=$("#adminAuditIntegrity"),data=state.adminAudit;if(!host)return;const rows=data?.events||[],integrity=data?.integrity||{};if(meta)meta.textContent=`${rows.length} letzte privilegierte Schreibaktionen · Aufbewahrung ${Number(data?.retention_days||0)} Tage · ohne Request-Body, IP oder User-Agent.`;if(badge){const ok=integrity.verified!==false;badge.classList.toggle("bad",!ok);badge.textContent=ok?`KETTE OK · ${Number(integrity.chained_events||0)} VERKETTET${Number(integrity.legacy_events||0)?` · ${Number(integrity.legacy_events)} LEGACY`:""}`:`INTEGRITÄTSFEHLER${integrity.first_bad_event_id?` · EVENT ${CFS.escape(String(integrity.first_bad_event_id))}`:""}`;}host.innerHTML=rows.length?rows.map(row=>`<div class="admin-audit-row"><strong>${CFS.escape(row.method||"")}</strong><span>${CFS.escape(row.admin_creator_id||"")}</span><code>${CFS.escape(row.route||"")}</code><b class="${row.outcome==="success"?"ok":"bad"}">${CFS.escape(String(row.status_code||""))}</b><small>${row.created_at?new Date(row.created_at).toLocaleString("de-DE"):"–"}${row.request_id?` · ${CFS.escape(row.request_id)}`:""}${Number(row.chain_version||0)===1&&row.event_hash?` · HMAC ${CFS.escape(String(row.event_hash).slice(0,10))}…`:" · LEGACY"}</small></div>`).join(""):'<div class="admin-empty">Noch keine privilegierte Admin-Schreibaktion protokolliert.</div>'}
async function loadAdminAudit(){state.adminAudit=await CFS.json("/api/admin/creator-suite/audit-events");renderAdminAudit()}
async function exportAdminAudit(){try{const data=await adminJson("/api/admin/creator-suite/audit-export",{method:"POST",body:"{}"});const payload=JSON.stringify(data.export||{},null,2),blob=new Blob([payload],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`cfs-admin-audit-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Forensik-Export erstellt.");await loadAdminAudit()}catch(error){toast(error.message,true)}}
function renderIncidentState(){const data=state.incidentState?.incident||{},mode=String(data.mode||"normal"),panel=$("#adminIncidentPanel"),current=$("#incidentCurrentMode"),meta=$("#incidentCurrentMeta"),select=$("#incidentMode"),message=$("#incidentPublicMessage");if(panel){panel.classList.toggle("is-lockdown",mode==="security_lockdown");panel.classList.toggle("is-maintenance",mode==="maintenance")}if(current)current.textContent=mode==="security_lockdown"?"SECURITY LOCKDOWN":mode==="maintenance"?"WARTUNG":mode==="degraded"?"DEGRADED":"NORMAL";if(meta)meta.textContent=data.updated_at?`Zuletzt geändert ${new Date(data.updated_at).toLocaleString("de-DE")}${data.started_at?` · Incident seit ${new Date(data.started_at).toLocaleString("de-DE")}`:""}`:"Kein aktiver Incident.";if(select)select.value=mode;if(message&&document.activeElement!==message)message.value=String(data.public_message||"")}
async function loadIncidentState(){state.incidentState=await adminJson("/api/admin/creator-suite/incident-state");renderIncidentState()}
async function saveIncidentState(){const mode=$("#incidentMode")?.value||"normal",public_message=String($("#incidentPublicMessage")?.value||""),revoke_other_sessions=Boolean($("#incidentRevokeSessions")?.checked);if(mode==="security_lockdown"&&!public_message.trim()){toast("Bitte für den Security Lockdown eine kurze öffentliche Meldung setzen.",true);return}state.incidentState=await adminJson("/api/admin/creator-suite/incident-state",{method:"PUT",body:JSON.stringify({mode,public_message,revoke_other_sessions})});if($("#incidentRevokeSessions"))$("#incidentRevokeSessions").checked=false;renderIncidentState();toast(state.incidentState?.revoked_sessions?`Incident gespeichert · ${state.incidentState.revoked_sessions} andere Sitzungen beendet.`:"Incident-Status gespeichert.");await loadAdminAudit().catch(()=>{})}
function age(value){if(!value)return"–";const ms=Date.now()-new Date(value).getTime(),m=Math.floor(ms/60000);if(m<1)return"gerade eben";if(m<60)return`${m} Min.`;const h=Math.floor(m/60);if(h<48)return`${h} Std.`;return`${Math.floor(h/24)} Tage`}
function stateClass(key){return["fresh","online"].includes(key)?"ok":["aging","recent"].includes(key)?"warn":"bad"}
function betaClass(key){return key==="active"?"ok":key==="paused"?"warn":""}
function filtered(){if(!state.data)return[];const q=$("#adminSearch").value.trim().toLowerCase(),plan=$("#adminPlan").value,beta=$("#adminBeta").value,health=$("#adminHealth").value;return state.data.creators.filter(c=>{const hay=[c.display_name,c.email,c.tiktok.display_name].join(" ").toLowerCase();if(q&&!hay.includes(q))return false;if(plan!=="all"&&c.plan!==plan)return false;if(beta!=="all"&&c.beta.status!==beta)return false;if(health==="ready"&&c.readiness.score<75)return false;if(health==="attention"&&c.readiness.score>=75)return false;return true})}
function renderSummary(){const s=state.data?.summary||{};$("#kCreators").textContent=s.creators??0;$("#kTikTok").textContent=s.tiktok_connected??0;$("#kSync").textContent=s.sync_fresh??0;$("#kLauncher").textContent=s.launcher_online??0;$("#kBeta").textContent=s.beta_active??0;$("#kLive").textContent=s.live_now??0}
function renderRootAccess(){
  const me=state.me,account=me?.account||{};
  const name=$("#adminRootName"),text=$("#adminRootAccessText");
  if(name)name.textContent=account.display_name||account.email||"CFS Root";
  if(text)text.textContent=me?.access?.access_source==="root_admin"?"ROOT ACCESS AKTIV · Plan-Limits sind für dieses Admin-Konto aufgehoben.":"ADMIN AKTIV · Root-Freigaben werden vom Backend geprüft.";
}
function renderFocus(){
  const creators=state.data?.creators||[];
  const attention=creators.filter(c=>Number(c.readiness?.score||0)<75).length;
  const tiktok=creators.filter(c=>!c.tiktok?.connected||!["fresh","recent"].includes(c.tiktok?.sync?.key)).length;
  const launcher=creators.filter(c=>c.launcher?.connection?.key!=="online").length;
  const feedback=Number(state.betaCenter?.summary?.open_feedback||0);
  const reviews=Number(state.publicReviews?.moderation?.pending||0);
  const supportNew=Number(state.supportReports?.summary?.new||0);
  const supportCritical=Number(state.supportReports?.summary?.critical_open||0);
  if($("#focusAttention"))$("#focusAttention").textContent=attention;
  if($("#focusTikTok"))$("#focusTikTok").textContent=tiktok;
  if($("#focusLauncher"))$("#focusLauncher").textContent=launcher;
  if($("#focusFeedback"))$("#focusFeedback").textContent=feedback;
  if($("#focusReviews"))$("#focusReviews").textContent=reviews;
  if($("#focusSupportReports"))$("#focusSupportReports").textContent=supportCritical?`${supportNew}/${supportCritical}!`:supportNew;
}
function renderRows(){const rows=filtered();$("#adminRows").innerHTML=rows.length?rows.map(c=>`<tr data-id="${CFS.escape(c.id)}" class="${state.selected===c.id?"active":""}"><td><div class="creator-cell"><strong>${CFS.escape(c.display_name||"Creator")}</strong><small>${CFS.escape(c.email||"")}</small><span class="state plan-state">${CFS.escape(c.plan.toUpperCase())}</span></div></td><td><div class="connection-stack"><span class="state ${stateClass(c.tiktok.sync.key)}">TikTok · ${CFS.escape(c.tiktok.sync.label)}</span><span class="state ${stateClass(c.launcher.connection.key)}">Launcher · ${CFS.escape(c.launcher.connection.label)}</span></div></td><td><div class="content-counts"><strong>${c.widgets.live}/${c.widgets.total}</strong><small>Widgets</small><strong>${c.scenes.live}/${c.scenes.total}</strong><small>Scenes</small></div></td><td><span class="ready-score ${c.readiness.score>=75?"ready":"attention"}">${c.readiness.score}%</span></td><td><span class="state ${betaClass(c.beta.status)}">${c.beta.status==="none"?"–":CFS.escape(c.beta.status.toUpperCase())}</span></td></tr>`).join(""):'<tr><td colspan="5">Keine Creator für diesen Filter.</td></tr>'}
function selected(){return state.data?.creators.find(c=>c.id===state.selected)||null}
function renderDetail(){const c=selected(),host=$("#adminDetail");if(!c){host.innerHTML='<div class="admin-empty">Creator auswählen.</div>';return}const avatar=c.tiktok.avatar_url?`<img src="${CFS.escape(c.tiktok.avatar_url)}" alt="">`:`<div class="admin-avatar">${CFS.escape(String(c.display_name||"CF").slice(0,2).toUpperCase())}</div>`;host.innerHTML=`<div class="admin-profile"><div class="admin-profile-head">${avatar}<div><strong>${CFS.escape(c.display_name||"Creator")}</strong><small>${CFS.escape(c.email||"")}</small><small>${CFS.escape(c.plan.toUpperCase())} · registriert ${new Date(c.created_at).toLocaleDateString('de-DE')}</small></div></div><div class="detail-grid"><div><span>TIKTOK</span><strong>${CFS.escape(c.tiktok.display_name||"OFFLINE")}</strong></div><div><span>FOLLOWER</span><strong>${Number(c.tiktok.followers||0).toLocaleString('de-DE')}</strong></div><div><span>LAUNCHER</span><strong>${CFS.escape(c.launcher.connection.label)}</strong></div><div><span>VERSION</span><strong>${CFS.escape(c.launcher.client_version||"–")}</strong></div><div><span>WIDGETS</span><strong>${c.widgets.live}/${c.widgets.total} live</strong></div><div><span>SCENES</span><strong>${c.scenes.live}/${c.scenes.total} live</strong></div></div><div class="detail-section"><span>SYSTEMSTATUS</span><div class="notice">TikTok: ${CFS.escape(c.tiktok.sync.label)} · ${age(c.tiktok.updated_at)}<br>Launcher: ${CFS.escape(c.launcher.connection.label)} · ${age(c.launcher.last_seen_at)}<br>Gesamtbereitschaft: ${c.readiness.score}%</div><div class="detail-actions"><button class="btn" id="forceTikTokSync" ${c.tiktok.connected?'':'disabled'}>TIKTOK SYNC PRÜFEN</button></div></div><details class="detail-section detail-advanced"><summary>BETA & ADMIN-NOTIZEN</summary><div class="detail-advanced-body"><select id="betaStatus"><option value="none" ${c.beta.status==='none'?'selected':''}>Kein Beta-Tester</option><option value="active" ${c.beta.status==='active'?'selected':''}>Beta aktiv</option><option value="paused" ${c.beta.status==='paused'?'selected':''}>Beta pausiert</option></select><textarea id="betaNotes" maxlength="1200" placeholder="Notizen zum Test, Feedback, Besonderheiten…">${CFS.escape(c.beta.notes||"")}</textarea><div class="detail-actions"><button class="btn primary" id="saveBeta">BETA STATUS SPEICHERN</button></div></div></details></div>`;$("#forceTikTokSync").onclick=()=>syncTikTok(c.id);$("#saveBeta").onclick=()=>saveBeta(c.id)}
function feedbackFiltered(){const list=state.betaCenter?.feedback||[],filter=$("#feedbackFilter")?.value||"open";if(filter==="all")return list;if(filter==="open")return list.filter(item=>["new","reviewing"].includes(item.status));if(filter==="critical"||filter==="high")return list.filter(item=>item.severity===filter&&["new","reviewing"].includes(item.status));return list.filter(item=>item.status===filter)}
function renderRc(){const c=state.betaCenter;if(!c)return;const s=c.summary||{},rc=c.release_candidate||{};$("#kFeedbackOpen").textContent=s.open_feedback??0;$("#kFeedbackCritical").textContent=s.open_critical??0;$("#kFeedbackHigh").textContent=s.open_high??0;$("#kBetaSessions").textContent=s.completed_sessions??0;$("#kTestedCreators").textContent=s.tested_creators??0;$("#kRcScore").textContent=`${rc.score??0}%`;const card=$("#rcCard");card.className="rc-card "+(rc.ready?"ready":"blocked");$("#rcStatus").textContent=rc.ready?"BETA-DATEN BEREIT FÜR RC-ENTSCHEIDUNG":"NOCH BLOCKIERT";$("#rcChecks").innerHTML=(rc.checks||[]).map(x=>`<div class="rc-check ${x.ok?"ok":"bad"}"><span>${CFS.escape(x.label)}</span><b>${CFS.escape(String(x.value))} / ${CFS.escape(x.target)}</b></div>`).join("")}
function renderFeedbackInbox(){const host=$("#feedbackInbox");if(!host||!state.betaCenter)return;const list=feedbackFiltered();host.innerHTML=list.length?list.map(f=>`<article class="feedback-card ${CFS.escape(f.severity)}"><div class="feedback-card-head"><div><strong>${CFS.escape(f.title)}</strong><small>${CFS.escape(f.creator?.display_name||"Creator")} · ${new Date(f.created_at).toLocaleString("de-DE")}</small></div><span class="state ${f.status==="fixed"||f.status==="closed"?"ok":f.severity==="critical"||f.severity==="high"?"bad":"warn"}">${CFS.escape(f.status.toUpperCase())}</span></div><div class="feedback-meta"><span>${CFS.escape(f.kind.toUpperCase())}</span><span>${CFS.escape(f.severity.toUpperCase())}</span><span>${CFS.escape(f.category.toUpperCase())}</span><span>V${CFS.escape(f.launcher_version||"–")}</span></div><div class="feedback-body">${CFS.escape(f.description||"Keine Beschreibung")}${f.repro_steps?`<br><br><b>REPRO:</b><br>${CFS.escape(f.repro_steps)}`:""}</div><div class="feedback-actions"><select data-feedback-status="${CFS.escape(f.id)}"><option value="new" ${f.status==="new"?"selected":""}>NEW</option><option value="reviewing" ${f.status==="reviewing"?"selected":""}>REVIEWING</option><option value="fixed" ${f.status==="fixed"?"selected":""}>FIXED</option><option value="closed" ${f.status==="closed"?"selected":""}>CLOSED</option></select><input data-feedback-note="${CFS.escape(f.id)}" value="${CFS.escape(f.admin_notes||"")}" placeholder="Admin Notiz"><button class="btn" data-save-feedback="${CFS.escape(f.id)}">SPEICHERN</button></div></article>`).join(""):'<div class="admin-empty">Kein Feedback für diesen Filter.</div>'}
function renderBetaSessions(){const h=$("#betaSessionList");if(!h||!state.betaCenter)return;const list=state.betaCenter.sessions||[];h.innerHTML=list.length?list.map(s=>`<article class="beta-session-card"><strong>${CFS.escape(s.creator?.display_name||"Creator")} · ${CFS.escape(s.label||"Beta Test")}</strong><small>${new Date(s.started_at).toLocaleString("de-DE")} · ${CFS.escape(s.status.toUpperCase())} · V${CFS.escape(s.launcher_version||"–")}</small><small>${Math.round(Number(s.duration_seconds||0)/60)} Min. · ${CFS.escape(s.provider||"–")} · ${CFS.escape(s.platform||"–")}</small>${s.result_summary?`<div class="session-result">${CFS.escape(s.result_summary)}</div>`:""}</article>`).join(""):'<div class="admin-empty">Noch keine Beta-Testsession.</div>'}
function renderBetaAdmin(){if(!state.betaCenter)return;renderRc();renderFeedbackInbox();renderBetaSessions()}
function reviewStatusClass(status){return status==="approved"?"ok":status==="rejected"?"bad":"warn"}
function reviewAppealLabel(value){return({yes:"Spricht mich an",maybe:"Interessant / unsicher",no:"Nicht mein Stil"})[value]||value||"–"}
function reviewVariantLabel(value){return({schwarz:"Schwarz",blau:"Blau",beide:"Beide",ueberarbeiten:"Noch überarbeiten"})[value]||value||"–"}
function renderPublicReviews(){
  const data=state.publicReviews,host=$("#reviewAdminList");if(!data||!host)return;
  const m=data.moderation||{};
  $("#kReviewsTotal").textContent=m.total??0;$("#kReviewsPending").textContent=m.pending??0;$("#kReviewsApproved").textContent=m.approved??0;$("#kReviewsRejected").textContent=m.rejected??0;$("#kReviewsComments").textContent=m.with_comment??0;
  const list=data.reviews||[];
  host.innerHTML=list.length?list.map(r=>`<article class="review-admin-card ${CFS.escape(r.status||"pending")}" data-review-id="${CFS.escape(r.id)}"><div class="review-admin-head"><div><div class="review-stars" aria-label="${Number(r.rating||0)} von 5 Sternen">${"★".repeat(Math.max(0,Math.min(5,Number(r.rating||0))))}${"☆".repeat(Math.max(0,5-Math.min(5,Number(r.rating||0))))}</div><strong>${CFS.escape(r.display_name||"Gast")}</strong><small>${r.updated_at?new Date(r.updated_at).toLocaleString("de-DE"):"–"}</small></div><span class="state ${reviewStatusClass(r.status)}">${CFS.escape(String(r.status||"pending").toUpperCase())}</span></div><div class="review-admin-meta"><span>${CFS.escape(reviewAppealLabel(r.appeal))}</span><span>${CFS.escape(reviewVariantLabel(r.variant))}</span><span>${Number(r.rating||0)}/5</span></div><div class="review-admin-comment ${r.comment?"":"empty"}">${r.comment?CFS.escape(r.comment):"Kein Freitext – diese strukturierte Bewertung benötigt normalerweise keine Textmoderation."}</div><label class="review-admin-note-field"><span>ADMIN-NOTIZ · NICHT ÖFFENTLICH</span><textarea maxlength="1000" data-review-note="${CFS.escape(r.id)}" placeholder="Optional: Grund, Prüfhinweis oder interne Notiz…">${CFS.escape(r.admin_note||"")}</textarea></label><div class="review-admin-actions"><button class="btn review-pending" type="button" data-review-status="pending" data-review-action="${CFS.escape(r.id)}">PENDING</button><button class="btn primary review-approve" type="button" data-review-status="approved" data-review-action="${CFS.escape(r.id)}">FREIGEBEN</button><button class="btn review-reject" type="button" data-review-status="rejected" data-review-action="${CFS.escape(r.id)}">ABLEHNEN</button></div>${r.moderated_at?`<small class="review-moderated">Zuletzt moderiert: ${new Date(r.moderated_at).toLocaleString("de-DE")}</small>`:""}</article>`).join(""):'<div class="admin-empty">Keine Rezensionen für diesen Filter.</div>';
  renderFocus();
}
async function loadPublicReviews(){
  const status=$("#reviewStatus")?.value||"pending",q=$("#reviewSearch")?.value.trim()||"";
  const params=new URLSearchParams();params.set("status",status);if(q)params.set("q",q);
  state.publicReviews=await adminJson(`/api/admin/creator-suite/public-reviews?${params.toString()}`);renderPublicReviews();
}
async function moderatePublicReview(id,status){
  const note=document.querySelector(`[data-review-note="${CSS.escape(id)}"]`)?.value||"";
  await adminJson(`/api/admin/creator-suite/public-reviews/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({status,admin_note:note})});
  toast(status==="approved"?"Rezension freigegeben.":status==="rejected"?"Rezension abgelehnt.":"Rezension auf Pending gesetzt.");
  await loadPublicReviews();
}

function supportCategoryLabel(value){return({security:"Sicherheit",account:"Account",privacy:"Datenschutz",technical:"Technik",other:"Sonstiges"})[value]||value||"–"}
function supportPriorityLabel(value){return({normal:"Normal",high:"Hoch",critical:"Kritisch"})[value]||value||"–"}
function supportStatusClass(status){return status==="resolved"?"ok":status==="rejected"?"bad":status==="reviewing"?"warn":"warn"}
function renderSupportReports(){
  const data=state.supportReports,host=$("#supportAdminList");if(!data||!host)return;
  const m=data.summary||{};
  $("#kSupportTotal").textContent=m.total??0;$("#kSupportNew").textContent=m.new??0;$("#kSupportReviewing").textContent=m.reviewing??0;$("#kSupportResolved").textContent=m.resolved??0;$("#kSupportSecurity").textContent=m.new_security??0;$("#kSupportCritical").textContent=m.critical_open??0;
  const list=data.reports||[];
  host.innerHTML=list.length?list.map(r=>`<article class="support-admin-card ${CFS.escape(r.priority||"normal")} ${CFS.escape(r.status||"new")}" data-support-id="${CFS.escape(r.id)}"><div class="support-admin-head"><div><span>${CFS.escape(supportCategoryLabel(r.category))} · ${CFS.escape(supportPriorityLabel(r.priority))}</span><strong>${CFS.escape(r.subject||"Ohne Thema")}</strong><small>${r.created_at?new Date(r.created_at).toLocaleString("de-DE"):"–"}${r.source_path?` · ${CFS.escape(r.source_path)}`:""}</small></div><span class="state ${supportStatusClass(r.status)}">${CFS.escape(String(r.status||"new").toUpperCase())}</span></div><div class="support-admin-message">${CFS.escape(r.message||"")}</div><div class="support-admin-contact"><b>KONTAKT</b><span>${r.contact_email?CFS.escape(r.contact_email):"keine E-Mail angegeben"}</span></div><label class="review-admin-note-field"><span>ADMIN-NOTIZ · NICHT ÖFFENTLICH</span><textarea maxlength="2000" data-support-note="${CFS.escape(r.id)}" placeholder="Prüfung, Entscheidung oder interner Hinweis…">${CFS.escape(r.admin_note||"")}</textarea></label><div class="support-admin-actions"><button class="btn" type="button" data-support-status="new" data-support-action="${CFS.escape(r.id)}">NEU</button><button class="btn" type="button" data-support-status="reviewing" data-support-action="${CFS.escape(r.id)}">IN PRÜFUNG</button><button class="btn primary" type="button" data-support-status="resolved" data-support-action="${CFS.escape(r.id)}">ERLEDIGT</button><button class="btn review-reject" type="button" data-support-status="rejected" data-support-action="${CFS.escape(r.id)}">ABWEISEN</button></div>${r.handled_at?`<small class="review-moderated">Zuletzt bearbeitet: ${new Date(r.handled_at).toLocaleString("de-DE")}</small>`:""}</article>`).join(""):'<div class="admin-empty">Keine Support-Meldungen für diesen Filter.</div>';
  renderFocus();
}
async function loadSupportReports(){
  const status=$("#supportReportStatus")?.value||"new",category=$("#supportReportCategory")?.value||"all",q=$("#supportReportSearch")?.value.trim()||"";
  const params=new URLSearchParams({status,category});if(q)params.set("q",q);
  state.supportReports=await adminJson(`/api/admin/creator-suite/support-reports?${params.toString()}`);renderSupportReports();
}
async function moderateSupportReport(id,status){
  const note=document.querySelector(`[data-support-note="${CSS.escape(id)}"]`)?.value||"";
  await adminJson(`/api/admin/creator-suite/support-reports/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({status,admin_note:note})});
  toast(status==="resolved"?"Support-Meldung erledigt.":status==="reviewing"?"Support-Meldung ist in Prüfung.":status==="rejected"?"Support-Meldung abgewiesen.":"Support-Meldung auf Neu gesetzt.");
  await loadSupportReports();
}

function renderCspTelemetry(){
  const data=state.cspTelemetry,host=$("#cspAdminList");if(!data||!host)return;
  const m=data.summary||{};
  $("#kCspOccurrences").textContent=m.occurrences??0;$("#kCspPatterns").textContent=m.unique_patterns??0;$("#kCspActive").textContent=m.active_patterns_24h??0;$("#kCspExternal").textContent=m.external_occurrences??0;
  const rows=data.reports||[];
  host.innerHTML=rows.length?rows.map(r=>`<article class="csp-admin-card"><div><strong>${CFS.escape(r.effective_directive||"unknown")}</strong><span>${CFS.escape(r.blocked_kind||"unknown")}${r.blocked_host?` · ${CFS.escape(r.blocked_host)}`:""}</span></div><div><b>${Number(r.occurrences||0)}×</b><small>${CFS.escape(r.document_route||"/")}${r.source_route&&r.source_route!=="unknown"?` ← ${CFS.escape(r.source_route)}`:""}</small><em>${r.last_seen?new Date(r.last_seen).toLocaleString("de-DE"):"–"}</em></div></article>`).join(""):'<div class="admin-empty">Keine CSP-Verstöße gespeichert.</div>';
}
async function loadCspTelemetry(){state.cspTelemetry=await adminJson('/api/admin/creator-suite/csp-reports');renderCspTelemetry()}

function renderAcceptanceEditor(){
  const protocols=state.releaseOps?.protocols||{},select=$("#acceptanceProtocol"),keys=Object.keys(protocols);
  const current=select.value;
  select.innerHTML=keys.map(key=>`<option value="${CFS.escape(key)}">${CFS.escape(protocols[key].label||key)}</option>`).join("");
  if(current&&keys.includes(current))select.value=current;
  const protocol=protocols[select.value]||protocols[keys[0]];
  if(!protocol){$("#acceptanceSteps").innerHTML="";return}
  const latest=state.releaseOps?.acceptances?.latest?.[protocol.key]||null,byId=new Map((latest?.step_results||[]).map(step=>[step.id,step]));
  $("#acceptanceSteps").innerHTML=(protocol.steps||[]).map(step=>{const status=byId.get(step.id)?.status||"pending";return `<div class="acceptance-step" data-acceptance-step="${CFS.escape(step.id)}"><label>${CFS.escape(step.label)}${step.required?" *":""}</label><select data-acceptance-status><option value="pending" ${status==="pending"?"selected":""}>PENDING</option><option value="pass" ${status==="pass"?"selected":""}>PASS</option><option value="fail" ${status==="fail"?"selected":""}>FAIL</option><option value="skip" ${status==="skip"?"selected":""}>SKIP</option></select></div>`}).join("");
  $("#acceptanceTarget").value=latest?.target||"";
  $("#acceptanceReference").value=latest?.reference||"";
  $("#acceptanceNotes").value=latest?.notes||"";
}
function creatorOptions(){return (state.data?.creators||[]).map(c=>`<option value="${CFS.escape(c.id)}">${CFS.escape(c.display_name||c.email||c.id)}</option>`).join("")}
function renderReleaseOps(){
  const ops=state.releaseOps;if(!ops)return;
  const gate=ops.go_no_go||{};
  $("#releaseGoStatus").textContent=String(gate.recommendation||"hold").toUpperCase();
  $("#releaseGoStatus").className=`release-go-status ${gate.recommendation==="go"?"go":"hold"}`;
  $("#releaseGoScore").textContent=`${gate.score||0}% · ${gate.passed||0}/${gate.total||0}`;
  $("#releaseGoChecks").innerHTML=(gate.checks||[]).map(c=>`<div class="release-go-check ${c.ok?"ok":"bad"}"><span>${CFS.escape(c.label)}</span><b>${c.ok?"PASS":"BLOCK"}</b></div>`).join("");
  renderAcceptanceEditor();
  const cohorts=ops.cohorts?.items||[];
  $("#releaseCohortList").innerHTML=cohorts.length?cohorts.map(c=>`<article class="release-cohort"><div class="release-cohort-head"><div><strong>${CFS.escape(c.name)}</strong><small>${CFS.escape(String(c.stage).toUpperCase())} · ${CFS.escape(String(c.status).toUpperCase())}</small></div><b>${c.evaluation?.score||0}%</b></div><div class="release-go-check ${c.evaluation?.ready?"ok":"bad"}"><span>${c.evaluation?.active_members||0}/${c.evaluation?.target_testers||c.target_testers} Tester · ${c.evaluation?.completed_sessions||0} Sessions</span><b>${c.evaluation?.ready?"READY":"OFFEN"}</b></div><div class="cohort-members">${(c.members||[]).map(m=>`<div class="cohort-member"><span>${CFS.escape(m.creator?.display_name||m.creator_id)}</span><b>${CFS.escape(String(m.status||"").toUpperCase())}</b></div>`).join("")||'<small>Noch keine Creator zugewiesen.</small>'}</div><div class="cohort-member-actions"><select data-cohort-creator="${CFS.escape(c.id)}">${creatorOptions()}</select><select data-cohort-member-status="${CFS.escape(c.id)}"><option value="invited">INVITED</option><option value="active">ACTIVE</option><option value="completed">COMPLETED</option><option value="removed">REMOVED</option></select><button class="btn" data-save-cohort-member="${CFS.escape(c.id)}">CREATOR SETZEN</button></div></article>`).join(""):'<div class="admin-empty">Noch kein V39 Release Cohort.</div>';
  const decisions=ops.decisions||[];
  $("#releaseDecisionHistory").innerHTML=decisions.length?decisions.slice(0,12).map(d=>`<article class="release-decision-row"><strong>${CFS.escape(String(d.decision||"hold").toUpperCase())} · Empfehlung ${CFS.escape(String(d.recommendation||"hold").toUpperCase())}</strong><span>${CFS.escape(d.rationale||"")}</span><small>${d.created_at?new Date(d.created_at).toLocaleString("de-DE"):""}</small></article>`).join(""):'<div class="admin-empty">Noch keine finale Entscheidung.</div>';
}
async function loadReleaseOps(){state.releaseOps=await adminJson("/api/admin/creator-suite/release-operations");renderReleaseOps()}
async function saveAcceptance(){
  const protocol=$("#acceptanceProtocol").value,steps=[...$("#acceptanceSteps").querySelectorAll("[data-acceptance-step]")].map(row=>({id:row.dataset.acceptanceStep,status:row.querySelector("[data-acceptance-status]").value}));
  await adminJson("/api/admin/creator-suite/release-acceptance",{method:"POST",body:JSON.stringify({protocol,step_results:steps,target:$("#acceptanceTarget").value.trim(),reference:$("#acceptanceReference").value.trim(),notes:$("#acceptanceNotes").value.trim(),release_version:state.releaseOps?.release_version||""})});
  toast("Acceptance Snapshot gespeichert.");await Promise.all([loadReleaseOps(),loadProduction()]);
}
async function createCohort(){
  await adminJson("/api/admin/creator-suite/release-cohorts",{method:"POST",body:JSON.stringify({stage:$("#cohortStage").value,name:$("#cohortName").value.trim(),target_testers:Number($("#cohortTarget").value||5),status:"active"})});
  $("#cohortName").value="";toast("Release Cohort erstellt.");await loadReleaseOps();
}
async function saveCohortMember(cohortId){
  const creator=document.querySelector(`[data-cohort-creator="${CSS.escape(cohortId)}"]`)?.value,status=document.querySelector(`[data-cohort-member-status="${CSS.escape(cohortId)}"]`)?.value||"invited";
  if(!creator)throw new Error("Creator auswählen.");
  await adminJson(`/api/admin/creator-suite/release-cohorts/${encodeURIComponent(cohortId)}/members/${encodeURIComponent(creator)}`,{method:"PUT",body:JSON.stringify({status,sessions_required:1})});
  toast("Cohort-Mitglied aktualisiert.");await loadReleaseOps();
}
async function saveReleaseDecision(){
  await adminJson("/api/admin/creator-suite/release-decisions",{method:"POST",body:JSON.stringify({decision:$("#releaseDecision").value,rationale:$("#releaseDecisionRationale").value.trim()})});
  $("#releaseDecisionRationale").value="";toast("Go/No-Go Entscheidung gespeichert.");await loadReleaseOps();
}
function renderProduction(){
  const p=state.production?.readiness;if(!p)return;
  $("#prodScore").textContent=`${p.score||0}%`;
  const doctor=state.configDoctor?.runtime||null;
  if(doctor){
    $("#configDoctorScore").textContent=doctor.ready?`READY ${doctor.passed}/${doctor.total}`:`BLOCKED ${doctor.passed}/${doctor.total}`;
    $("#configDoctorScore").className=`config-doctor-score ${doctor.ready?"ready":"blocked"}`;
    $("#configDoctorChecks").innerHTML=(doctor.checks||[]).map(c=>`<div class="config-doctor-row ${CFS.escape(c.status||"missing")}"><span>${CFS.escape(c.name)}</span><b>${CFS.escape(String(c.status||"").toUpperCase())}</b></div>`).join("");
  }else{
    $("#configDoctorScore").textContent="–";$("#configDoctorScore").className="config-doctor-score";$("#configDoctorChecks").innerHTML="";
  }
  $("#prodChecks").innerHTML=(p.checks||[]).map(c=>`<div class="prod-check ${c.ok?"ok":"bad"}"><span>${CFS.escape(c.label)}</span><b>${c.ok?"PASS":"OFFEN"}</b></div>`).join("");
  const stripe=state.production?.stripe_testmode||{};
  $("#stripeTestmodeStatus").textContent=stripe.verified?`VERIFIED ${stripe.passed}/${stripe.total}`:`OFFEN ${stripe.passed||0}/${stripe.total||0}`;
  $("#stripeTestmodeChecks").textContent=(stripe.checks||[]).map(c=>`${c.ok?"✓":"○"} ${c.type}`).join(" · ");
  const list=state.billingCenter?.subscriptions||[];
  $("#billingAdminList").innerHTML=list.length?list.map(s=>`<div class="billing-admin-row"><div><strong>${CFS.escape(s.creator?.display_name||"Creator")}</strong><small>${CFS.escape(s.creator?.email||"")}</small></div><div><small>PLAN</small><strong>${CFS.escape(String(s.plan||"free").toUpperCase())}</strong></div><div><small>STATUS</small><strong>${CFS.escape(String(s.status||"none").toUpperCase())}</strong></div><div><small>ZUGRIFF</small><strong>${s.access_active?"AKTIV":"AUS"}</strong></div></div>`).join(""):'<div class="admin-empty">Noch keine Billing-Subscription.</div>';
  const kinds=state.production?.evidence?.kinds||[];
  const select=$("#prodEvidenceKind"),current=select.value;
  select.innerHTML=kinds.map(kind=>`<option value="${CFS.escape(kind)}">${CFS.escape(kind.toUpperCase())}</option>`).join("");
  if(current&&kinds.includes(current))select.value=current;
  const history=state.production?.evidence?.history||[];
  $("#prodEvidenceList").innerHTML=history.length?history.slice(0,40).map(e=>`<article class="prod-evidence-row ${CFS.escape(e.status||"")}"><div><strong>${CFS.escape(String(e.kind||"").toUpperCase())}</strong><small>Release ${CFS.escape(e.release_version||"–")}</small></div><strong>${CFS.escape(String(e.status||"").toUpperCase())}</strong><small>${CFS.escape(e.source||"manual")}</small><small>${e.observed_at?new Date(e.observed_at).toLocaleString("de-DE"):"–"}</small><small class="evidence-proof">${CFS.escape(e.reference||e.artifact_sha256||e.notes||"Keine Referenz")}</small></article>`).join(""):'<div class="admin-empty">Noch keine Production Evidence gespeichert.</div>';
}
async function loadProduction(){const [production,billing,doctor]=await Promise.all([adminJson("/api/admin/creator-suite/production-readiness"),adminJson("/api/admin/creator-suite/billing-center"),adminJson("/api/admin/creator-suite/config-doctor")]);state.production=production;state.billingCenter=billing;state.configDoctor=doctor;renderProduction()}
async function loadBetaCenter(){state.betaCenter=await adminJson("/api/admin/creator-suite/beta-center");renderBetaAdmin();renderFocus()}
async function saveFeedback(id){const status=document.querySelector(`[data-feedback-status="${CSS.escape(id)}"]`)?.value||"new",admin_notes=document.querySelector(`[data-feedback-note="${CSS.escape(id)}"]`)?.value||"";await adminJson(`/api/admin/creator-suite/beta-feedback/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({status,admin_notes})});toast("Feedback aktualisiert.");await loadBetaCenter()}
async function saveProductionEvidence(){
  const payload={
    kind:$("#prodEvidenceKind").value,
    status:$("#prodEvidenceStatus").value,
    source:$("#prodEvidenceSource").value.trim(),
    reference:$("#prodEvidenceReference").value.trim(),
    artifact_sha256:$("#prodEvidenceSha").value.trim(),
    notes:$("#prodEvidenceNotes").value.trim(),
    release_version:state.production?.release_version||""
  };
  await adminJson("/api/admin/creator-suite/production-evidence",{method:"POST",body:JSON.stringify(payload)});
  $("#prodEvidenceReference").value="";$("#prodEvidenceSha").value="";$("#prodEvidenceNotes").value="";
  toast("Production Evidence gespeichert.");
  await loadProduction();
}
function render(){renderSummary();renderRootAccess();renderAdminElevation();renderAdminAudit();renderIncidentState();renderFocus();renderRows();renderDetail();renderBetaAdmin();renderPublicReviews();renderSupportReports();renderCspTelemetry();renderProduction();renderReleaseOps()}
async function load(){state.data=await adminJson('/api/admin/creator-suite/overview');if(state.selected&&!state.data.creators.some(c=>c.id===state.selected))state.selected=null;render()}
async function saveBeta(id){try{await adminJson(`/api/admin/creator-suite/creators/${encodeURIComponent(id)}/beta`,{method:'PUT',body:JSON.stringify({status:$("#betaStatus").value,notes:$("#betaNotes").value})});toast('Beta-Status gespeichert.');await load()}catch(e){toast(e.message,true)}}
async function syncTikTok(id){const b=$("#forceTikTokSync");b.disabled=true;try{await adminJson(`/api/admin/creator-suite/creators/${encodeURIComponent(id)}/sync-tiktok`,{method:'POST',body:'{}'});toast('TikTok Profil aktualisiert.');await load()}catch(e){toast(e.message,true)}finally{if(document.body.contains(b))b.disabled=false}}
function bindAdminWorkspaceUx(){
  const panels=[...document.querySelectorAll('.admin-workspace')];
  const cards=[...document.querySelectorAll('[data-admin-open]')];
  const setActive=id=>cards.forEach(card=>card.classList.toggle('active',card.dataset.adminOpen===id));
  cards.forEach(card=>card.addEventListener('click',()=>{
    const panel=document.getElementById(card.dataset.adminOpen);
    if(!panel)return;
    panel.open=true;setActive(panel.id);
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  panels.forEach(panel=>panel.addEventListener('toggle',()=>{if(panel.open)setActive(panel.id)}));
}
document.addEventListener('DOMContentLoaded',async()=>{bindAdminWorkspaceUx();const me=await CFS.requireAuth();if(!me)return;if(!me.admin){location.replace('/pages/dashboard.html');return}state.me=me;renderRootAccess();$("#adminElevationUnlock").onclick=unlockAdminElevation;$("#adminElevationLock").onclick=lockAdminElevation;$("#adminElevationPassword").addEventListener("keydown",e=>{if(e.key==="Enter")unlockAdminElevation()});$("#refreshAdminAudit").onclick=()=>loadAdminAudit().catch(e=>toast(e.message,true));$("#exportAdminAudit").onclick=exportAdminAudit;for(const id of ['adminSearch','adminPlan','adminBeta','adminHealth'])$("#"+id).addEventListener(id==='adminSearch'?'input':'change',()=>{renderRows();renderDetail()});$("#adminRows").onclick=e=>{const r=e.target.closest('[data-id]');if(r){state.selected=r.dataset.id;renderRows();renderDetail()}};$("#adminRefresh").onclick=()=>Promise.all([loadAdminElevation(),loadAdminAudit(),loadIncidentState(),load(),loadBetaCenter(),loadPublicReviews(),loadSupportReports(),loadCspTelemetry(),loadProduction(),loadReleaseOps()]).catch(e=>toast(e.message,true));$("#refreshReviews").onclick=()=>loadPublicReviews().catch(e=>toast(e.message,true));$("#reviewStatus").onchange=()=>loadPublicReviews().catch(e=>toast(e.message,true));let reviewSearchTimer=null;$("#reviewSearch").oninput=()=>{clearTimeout(reviewSearchTimer);reviewSearchTimer=setTimeout(()=>loadPublicReviews().catch(e=>toast(e.message,true)),250)};$("#reviewAdminList").onclick=e=>{const b=e.target.closest("[data-review-action]");if(b)moderatePublicReview(b.dataset.reviewAction,b.dataset.reviewStatus).catch(err=>toast(err.message,true))};$("#refreshSupportReports").onclick=()=>loadSupportReports().catch(e=>toast(e.message,true));$("#refreshCspReports").onclick=()=>loadCspTelemetry().catch(e=>toast(e.message,true));$("#supportReportStatus").onchange=()=>loadSupportReports().catch(e=>toast(e.message,true));$("#supportReportCategory").onchange=()=>loadSupportReports().catch(e=>toast(e.message,true));let supportSearchTimer=null;$("#supportReportSearch").oninput=()=>{clearTimeout(supportSearchTimer);supportSearchTimer=setTimeout(()=>loadSupportReports().catch(e=>toast(e.message,true)),250)};$("#supportAdminList").onclick=e=>{const b=e.target.closest("[data-support-action]");if(b)moderateSupportReport(b.dataset.supportAction,b.dataset.supportStatus).catch(err=>toast(err.message,true))};$("#refreshBetaInbox").onclick=()=>loadBetaCenter().catch(e=>toast(e.message,true));$("#refreshProduction").onclick=()=>loadProduction().catch(e=>toast(e.message,true));$("#saveProductionEvidence").onclick=()=>saveProductionEvidence().catch(e=>toast(e.message,true));$("#refreshReleaseOps").onclick=()=>loadReleaseOps().catch(e=>toast(e.message,true));$("#acceptanceProtocol").onchange=renderAcceptanceEditor;$("#saveAcceptance").onclick=()=>saveAcceptance().catch(e=>toast(e.message,true));$("#createCohort").onclick=()=>createCohort().catch(e=>toast(e.message,true));$("#releaseCohortList").onclick=e=>{const b=e.target.closest("[data-save-cohort-member]");if(b)saveCohortMember(b.dataset.saveCohortMember).catch(err=>toast(err.message,true))};$("#saveReleaseDecision").onclick=()=>saveReleaseDecision().catch(e=>toast(e.message,true));$("#feedbackFilter").onchange=renderFeedbackInbox;$("#feedbackInbox").onclick=e=>{const b=e.target.closest("[data-save-feedback]");if(b)saveFeedback(b.dataset.saveFeedback).catch(err=>toast(err.message,true))};$("#refreshIncidentState").onclick=()=>loadIncidentState().catch(e=>toast(e.message,true));$("#saveIncidentState").onclick=()=>saveIncidentState().catch(e=>toast(e.message,true));try{await Promise.all([loadAdminElevation(),loadAdminAudit(),loadIncidentState(),load(),loadBetaCenter(),loadPublicReviews(),loadSupportReports(),loadCspTelemetry(),loadProduction(),loadReleaseOps()])}catch(e){toast(e.message,true)}});
setInterval(renderAdminElevation,30000);
})();
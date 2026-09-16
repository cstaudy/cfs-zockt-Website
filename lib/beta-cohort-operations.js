"use strict";

const STAGES=Object.freeze({
  pilot:{label:"Pilot Beta",default_target:5,min_completed_creators:5,min_completed_sessions:5},
  expanded:{label:"Expanded Beta",default_target:20,min_completed_creators:20,min_completed_sessions:20}
});
const STAGE_KEYS=Object.freeze(Object.keys(STAGES));
const COHORT_STATUSES=new Set(["planning","active","completed","paused","closed"]);
const MEMBER_STATUSES=new Set(["invited","active","completed","removed"]);

function text(value,max=2000){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max)}
function n(value,fallback=0){const x=Number(value);return Number.isFinite(x)?Math.max(0,Math.floor(x)):fallback}
function sanitizeCohort(input={},options={}){
  const stage=STAGES[String(input.stage||"")]?String(input.stage):"pilot";
  const def=STAGES[stage];
  return{
    release_version:text(input.release_version||options.releaseVersion,80),
    name:text(input.name,160)||def.label,
    stage,
    target_testers:Math.max(1,Math.min(100,n(input.target_testers,def.default_target))),
    status:COHORT_STATUSES.has(String(input.status||""))?String(input.status):"planning",
    notes:text(input.notes,4000)
  };
}
function sanitizeMember(input={}){
  const creatorId=text(input.creator_id,120);
  if(!creatorId)throw new Error("Creator-ID fehlt.");
  return{
    creator_id:creatorId,
    status:MEMBER_STATUSES.has(String(input.status||""))?String(input.status):"invited",
    sessions_required:Math.max(1,Math.min(20,n(input.sessions_required,1))),
    notes:text(input.notes,2000)
  };
}
function evaluateCohort(cohort={},members=[],sessions=[]){
  const stage=STAGES[String(cohort.stage||"")]?String(cohort.stage):"pilot",def=STAGES[stage];
  const activeMembers=(Array.isArray(members)?members:[]).filter(m=>["active","completed"].includes(String(m.status)));
  const completedMembers=(Array.isArray(members)?members:[]).filter(m=>String(m.status)==="completed");
  const ids=new Set(activeMembers.map(m=>String(m.creator_id)));
  const relevantSessions=(Array.isArray(sessions)?sessions:[]).filter(s=>String(s.status)==="completed"&&ids.has(String(s.creator_id))&&(!cohort.release_version||String(s.launcher_version||"")===String(cohort.release_version)));
  const sessionCreators=new Set(relevantSessions.map(s=>String(s.creator_id)));
  const target=Math.max(1,n(cohort.target_testers,def.default_target));
  const checks=[
    {id:"target_members",label:"Beta-Tester im Cohort",ok:activeMembers.length>=target,value:activeMembers.length,target:`≥ ${target}`},
    {id:"completed_creators",label:"Creator mit echter abgeschlossener Release-Testsession",ok:sessionCreators.size>=def.min_completed_creators,value:sessionCreators.size,target:`≥ ${def.min_completed_creators}`},
    {id:"completed_sessions",label:"Abgeschlossene Cohort-Sessions",ok:relevantSessions.length>=def.min_completed_sessions,value:relevantSessions.length,target:`≥ ${def.min_completed_sessions}`}
  ];
  const passed=checks.filter(c=>c.ok).length;
  return{
    ready:checks.every(c=>c.ok),stage,label:def.label,
    score:Math.round(passed/checks.length*100),passed,total:checks.length,
    target_testers:target,active_members:activeMembers.length,completed_members:completedMembers.length,
    completed_sessions:relevantSessions.length,session_creators:sessionCreators.size,checks
  };
}
function releaseCohortReadiness(cohorts=[],membersByCohort={},sessions=[]){
  const byStage={};
  for(const stage of STAGE_KEYS){
    const candidates=(Array.isArray(cohorts)?cohorts:[]).filter(c=>String(c.stage)===stage&&["active","completed"].includes(String(c.status)));
    candidates.sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0));
    const cohort=candidates[0]||null;
    byStage[stage]=cohort?{cohort,evaluation:evaluateCohort(cohort,membersByCohort[String(cohort.id)]||[],sessions)}:null;
  }
  return{
    pilot_ready:Boolean(byStage.pilot?.evaluation?.ready),
    expanded_ready:Boolean(byStage.expanded?.evaluation?.ready),
    stages:byStage
  };
}
module.exports={STAGES,STAGE_KEYS,COHORT_STATUSES,MEMBER_STATUSES,sanitizeCohort,sanitizeMember,evaluateCohort,releaseCohortReadiness};

"use strict";

const REQUIRED_ACCEPTANCES=Object.freeze(["windows_install","updater_e2e","stripe_testmode","obs_output","tiktok_live"]);
const DECISIONS=new Set(["go","hold","no_go"]);

function bool(v){return v===true}
function acceptancePassed(latest,key){return latest?.[key]?.status==="passed"&&latest?.[key]?.evaluation?.ready===true}
function goNoGoAssessment({production={},acceptances={},cohorts={},feedback={},releaseVersion=""}={}){
  const checks=[
    {id:"production_readiness",label:"Production Readiness vollständig",ok:production.ready===true,detail:`${production.passed||0}/${production.total||0}`},
    ...REQUIRED_ACCEPTANCES.map(key=>({id:`acceptance_${key}`,label:`Acceptance ${key}`,ok:acceptancePassed(acceptances,key),detail:acceptances?.[key]?.status||"missing"})),
    {id:"pilot_beta",label:"Pilot Beta mit 5 Creator abgeschlossen",ok:cohorts.pilot_ready===true,detail:""},
    {id:"expanded_beta",label:"Expanded Beta mit 20 Creator abgeschlossen",ok:cohorts.expanded_ready===true,detail:""},
    {id:"critical_bugs",label:"Keine offenen Critical Bugs",ok:Number(feedback.open_critical||0)===0,detail:String(feedback.open_critical||0)},
    {id:"high_bugs",label:"Keine offenen High Bugs",ok:Number(feedback.open_high||0)===0,detail:String(feedback.open_high||0)}
  ];
  const hardBlock=checks.some(c=>!c.ok);
  const passed=checks.filter(c=>c.ok).length;
  return{
    release_version:String(releaseVersion||""),
    recommendation:hardBlock?"hold":"go",
    ready:!hardBlock,
    score:Math.round(passed/checks.length*100),
    passed,total:checks.length,checks,
    blockers:checks.filter(c=>!c.ok).map(c=>c.id)
  };
}
function sanitizeDecision(input={},assessment={}){
  const decision=DECISIONS.has(String(input.decision||""))?String(input.decision):"hold";
  const rationale=String(input.rationale||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,4000);
  if(rationale.length<12)throw new Error("Go/No-Go Entscheidung braucht eine nachvollziehbare Begründung.");
  if(decision==="go"&&assessment.ready!==true)throw new Error("GO ist blockiert, solange das automatische Go/No-Go Gate nicht vollständig bestanden ist.");
  return{decision,rationale};
}
module.exports={REQUIRED_ACCEPTANCES,DECISIONS,goNoGoAssessment,sanitizeDecision};

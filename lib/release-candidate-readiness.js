"use strict";

const DEFAULT_THRESHOLDS=Object.freeze({
  active_beta_testers:2,
  tested_creators:2,
  completed_sessions:5,
  max_open_critical:0,
  max_open_high:0
});

function n(value){const x=Number(value);return Number.isFinite(x)?Math.max(0,x):0}

function releaseCandidateReadiness(metrics={},thresholds=DEFAULT_THRESHOLDS){
  const t={...DEFAULT_THRESHOLDS,...(thresholds||{})};
  const m={
    active_beta_testers:n(metrics.active_beta_testers),
    tested_creators:n(metrics.tested_creators),
    completed_sessions:n(metrics.completed_sessions),
    open_feedback:n(metrics.open_feedback),
    open_critical:n(metrics.open_critical),
    open_high:n(metrics.open_high)
  };
  const checks=[
    {key:"active_beta_testers",label:"Aktive Beta-Tester",ok:m.active_beta_testers>=t.active_beta_testers,value:m.active_beta_testers,target:`≥ ${t.active_beta_testers}`},
    {key:"tested_creators",label:"Creator mit abgeschlossener Testsession",ok:m.tested_creators>=t.tested_creators,value:m.tested_creators,target:`≥ ${t.tested_creators}`},
    {key:"completed_sessions",label:"Abgeschlossene Beta-Sessions",ok:m.completed_sessions>=t.completed_sessions,value:m.completed_sessions,target:`≥ ${t.completed_sessions}`},
    {key:"open_critical",label:"Offene kritische Bugs",ok:m.open_critical<=t.max_open_critical,value:m.open_critical,target:`≤ ${t.max_open_critical}`},
    {key:"open_high",label:"Offene High-Bugs",ok:m.open_high<=t.max_open_high,value:m.open_high,target:`≤ ${t.max_open_high}`}
  ];
  const passed=checks.filter(c=>c.ok).length;
  return {
    ready:checks.every(c=>c.ok),
    score:Math.round((passed/checks.length)*100),
    passed,total:checks.length,checks,metrics:m,thresholds:t,
    note:"Dieses Gate bewertet Beta-Daten. Echter Windows/OBS/TikTok-LIVE-Feldtest bleibt separat erforderlich."
  };
}

module.exports={releaseCandidateReadiness,DEFAULT_THRESHOLDS};

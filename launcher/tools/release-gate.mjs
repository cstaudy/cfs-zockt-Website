import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const reportDir=path.join(root,"reports");
fs.mkdirSync(reportDir,{recursive:true});

const cases=[
  ["static","tools/static-check.mjs"],
  ["bridge","tools/bridge-client-test.mjs"],
  ["spool","tools/event-spool-test.mjs"],
  ["preflight","tools/preflight-test.mjs"],
  ["gifts","tools/gift-streak-test.mjs"],
  ["monitor","tools/event-monitor-test.mjs"],
  ["obs_doctor","tools/obs-doctor-test.mjs"],
  ["shutdown","tools/graceful-shutdown-test.mjs"],
  ["backup","tools/config-backup-test.mjs"],
  ["recovery","tools/recovery-manager-test.mjs"],
  ["health","tools/cloud-health-test.mjs"],
  ["manifest","tools/release-manifest-test.mjs"],
  ["version_policy","tools/version-policy-client-test.mjs"],
  ["release_safety","tools/release-safety-preflight-test.mjs"],
  ["creator_profile","tools/creator-profile-bridge-test.mjs"],
  ["device_link","tools/device-link-client-test.mjs"],
  ["device_config","tools/device-link-config-test.mjs"],
  ["output_window","tools/output-window-manager-test.mjs"],
  ["output_gate","tools/output-gate-store-test.mjs"],
  ["stream_deck_store","tools/stream-deck-store-test.mjs"],
  ["stream_deck_actions","tools/stream-deck-actions-test.mjs"],
  ["entitlement_guard","tools/entitlement-guard-test.mjs"],
  ["entitlement_preflight","tools/entitlement-preflight-test.mjs"],
  ["beta_session_store","tools/beta-session-store-v27-test.mjs"],
  ["beta_feedback_bridge","tools/beta-feedback-bridge-v27-test.mjs"],
  ["creator_tools","tools/creator-tools-bridge-v28-test.mjs"],
  ["game_live_rules","tools/game-live-rules-v29-test.mjs"],
  ["cut_jobs","tools/cut-job-bridge-v29-test.mjs"],
  ["flush_serialization","tools/bridge-flush-serialization-v29-test.mjs"],
  ["media_source","tools/media-source-store-v30-test.mjs"],
  ["media_engine","tools/cut-media-engine-v30-test.mjs"],
  ["cut_job_retry","tools/cut-job-retry-v30-test.mjs"],
  ["cut_timeline","../tools/cut-timeline-v31-test.mjs"],
  ["cut_caption_reel","tools/cut-media-caption-reel-v31-test.mjs"],
  ["cut_audio_model","../tools/cut-audio-transition-v32-test.mjs"],
  ["cut_transition_engine","tools/cut-media-transition-audio-v32-test.mjs"],
  ["ffmpeg_bundle_prep","tools/ffmpeg-bundle-prep-v32-test.mjs"],
  ["cut_music_model","../tools/cut-music-keyframes-v33-test.mjs"],
  ["media_source_music","tools/media-source-store-v33-test.mjs"],
  ["cut_music_keyframes","tools/cut-media-music-keyframes-v33-test.mjs"],
  ["cut_music_static","../tools/cut-music-keyframes-v33-qa.mjs"],
  ["cut_free_keyframes","../tools/cut-free-keyframes-voice-sfx-v34-test.mjs"],
  ["media_source_multitrack","tools/media-source-store-v34-test.mjs"],
  ["cut_multitrack_engine","tools/cut-media-multitrack-v34-test.mjs"],
  ["cut_multitrack_static","../tools/cut-multitrack-keyframes-v34-qa.mjs"],
  ["cut_curve_mixer_model","../tools/cut-curve-mixer-v35-test.mjs"],
  ["cut_curve_mixer_engine","tools/cut-media-curve-mixer-v35-test.mjs"],
  ["cut_curve_mixer_static","../tools/cut-curve-mixer-v35-qa.mjs"],
  ["cut_curve_mixer_real","tools/cut-media-real-v35.mjs"],
  ["cut_final_model","../tools/cut-multitrack-bezier-v36-test.mjs"],
  ["media_source_v36","tools/media-source-store-v36-test.mjs"],
  ["cut_final_engine","tools/cut-media-multitrack-v36-test.mjs"],
  ["cut_final_static","../tools/cut-final-editing-v36-qa.mjs"],
  ["cut_final_real","tools/cut-media-real-v36.mjs"],
  ["billing_policy","../tools/billing-policy-v37-test.mjs"],
  ["production_readiness","../tools/production-readiness-v37-test.mjs"],
  ["billing_static","../tools/billing-v37-qa.mjs"],
  ["billing_launcher","tools/billing-entitlement-v37-test.mjs"],
  ["production_evidence","../tools/production-evidence-v38-test.mjs"],
  ["stripe_testmode_e2e","../tools/stripe-testmode-e2e-v38-test.mjs"],
  ["windows_build_evidence","tools/windows-build-evidence-v38-test.mjs"],
  ["production_canary","../tools/production-canary-v38-test.mjs"],
  ["production_v38_static","../tools/production-v38-qa.mjs"],
  ["release_acceptance_v39","../tools/release-acceptance-v39-test.mjs"],
  ["beta_cohort_v39","../tools/beta-cohort-v39-test.mjs"],
  ["go_no_go_v39","../tools/release-go-no-go-v39-test.mjs"],
  ["release_ops_admin_v39","../tools/release-ops-admin-v39-qa.mjs"],
  ["release_ops_static_v39","../tools/release-ops-v39-qa.mjs"],
  ["acceptance_template_v39","tools/windows-acceptance-template-v39-test.mjs"],
  ["repo_hygiene_v40","../tools/repository-hygiene-v40-test.mjs"],
  ["github_setup_v40","../tools/github-setup-v40-qa.mjs"],
  ["deployment_flow_v40","../tools/deployment-flow-v40-test.mjs"],
  ["legacy_flags_v40","../tools/legacy-verification-flags-v40-test.mjs"],
  ["file_placement_v40","../tools/github-files-placement-v40-test.mjs"],
  ["config_doctor_v41","../tools/config-doctor-v41-test.mjs"],
  ["github_bootstrap_v41","../tools/github-bootstrap-v41-test.mjs"],
  ["configuration_workflow_v41","../tools/configuration-workflow-v41-qa.mjs"],
  ["admin_config_doctor_v41","../tools/admin-config-doctor-v41-qa.mjs"],
  ["github_labels_v41","../tools/github-labels-v41-test.mjs"],
  ["final_test_plan_v42","../tools/final-test-plan-v42-test.mjs"],
  ["final_verification_v42","../tools/final-verification-v42-qa.mjs"],
  ["final_test_files_v42","../tools/final-test-files-v42-test.mjs"],
  ["server_runtime_symbols_v42","../tools/server-runtime-symbols-v42-test.mjs"],
  ["post_v42_bridge_controls","tools/post-v42-bridge-controls-test.mjs"],
  ["acceptance_part2_provider","tools/tiktool-provider-acceptance-part2-test.mjs"],
  ["acceptance_part2_live","tools/live-acceptance-part2-test.mjs"],
  ["acceptance_part2_audio","../tools/widget-runtime-audio-part2-test.mjs"],
  ["beta_profile","tools/beta-profile-bridge-test.mjs"],
  ["session_store","tools/live-session-store-test.mjs"],
  ["resume_protocol","tools/live-resume-bridge-test.mjs"],
  ["action_lease","tools/action-lease-client-test.mjs"],
  ["provider_switch","tools/provider-switch-test.mjs"],
  ["logger_tail","tools/logger-tail-test.mjs"],
  ["scenes","tools/scene-output-bridge-test.mjs"],
  ["e2e","tools/e2e-live-session-test.mjs"],
  ["stress","tools/event-stress-test.mjs"],
  ["obs","tools/obs-multi-widget-load-test.mjs"],
  ["release","tools/release-check.mjs"]
];

const launcherVersion=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8")).version;
const writeReport=(results,{complete=false}={})=>{
  const blockers=results.filter(x=>!x.ok);
  const payload={
    schema:2,
    generated_at:new Date().toISOString(),
    launcher_version:launcherVersion,
    complete,
    expected_total:cases.length,
    ok:complete&&blockers.length===0&&results.length===cases.length,
    total:results.length,
    passed:results.length-blockers.length,
    failed:blockers.length,
    results
  };
  fs.writeFileSync(path.join(reportDir,"release-gate.json"),JSON.stringify(payload,null,2));
  const lines=[
    "# cfs_zockt Creator Suite — Release Gate",
    "",
    `Generated: ${payload.generated_at}`,
    `Launcher: ${payload.launcher_version}`,
    `Result: ${complete?(payload.ok?"PASS":"FAIL"):"RUNNING"} (${payload.passed}/${payload.expected_total})`,
    "",
    "| Gate | Status | Dauer |",
    "|---|---:|---:|",
    ...results.map(x=>`| ${x.key} | ${x.ok?"PASS":"FAIL"} | ${x.duration_ms} ms |`),
    "",
    !complete
      ? "## Lauf noch nicht abgeschlossen\n\nDer Report ist ein Checkpoint und wird nach jedem Gate aktualisiert."
      : payload.ok
        ? "## Automatisches Gate bestanden\n\nDer Build ist für die **manuellen Real-World-Gates** bereit."
        : "## Blocker\n\n" + blockers.map(x=>`- **${x.key}**: ${x.stderr||x.stdout||"fehlgeschlagen"}`).join("\n")
  ];
  fs.writeFileSync(path.join(reportDir,"release-gate.md"),lines.join("\n"));
  return {payload,lines};
};

const results=[];
writeReport(results,{complete:false});
for(const [key,file] of cases){
  const started=Date.now();
  const p=spawnSync(process.execPath,[path.join(root,file),...(key==="release"?[root]:[])],{
    cwd:root,encoding:"utf8",timeout:30000
  });
  const result={
    key,file,ok:p.status===0,duration_ms:Date.now()-started,
    stdout:(p.stdout||"").trim().slice(-12000),
    stderr:(p.stderr||"").trim().slice(-12000)
  };
  results.push(result);
  console.log(`[${results.length}/${cases.length}] ${key}: ${result.ok?"PASS":"FAIL"}`);
  writeReport(results,{complete:false});
}

const {payload,lines}=writeReport(results,{complete:true});
const blockers=results.filter(x=>!x.ok);
console.log(lines.join("\n"));
if(!payload.ok)process.exit(1);

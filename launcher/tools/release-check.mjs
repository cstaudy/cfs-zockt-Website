import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, ".."));
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const fail = m => { console.error("FAIL:", m); process.exitCode = 1; };
const ok = m => console.log("OK:", m);

const pkg = JSON.parse(read("package.json"));
pkg.version === "0.42.0" ? ok("launcher version 0.42.0") : fail(`version ${pkg.version}`);
pkg.dependencies?.["electron-updater"] ? ok("electron-updater dependency") : fail("electron-updater missing");
pkg.build?.publish?.[0]?.provider === "github" ? ok("GitHub publish provider") : fail("publish provider missing");

for (const file of [
  "src/update-manager.js",
  "src/diagnostics.js",
  "src/event-spool.js",
  "src/preflight.js",
  "src/gift-streak-tracker.js",
  "src/event-monitor.js",
  "src/obs-doctor.js",
  "src/support-bundle.js",
  "src/config-backup.js",
  "src/recovery-manager.js",
  "src/cloud-health.js",
  "src/release-manifest.js",
  "tools/config-backup-test.mjs",
  "tools/recovery-manager-test.mjs",
  "tools/cloud-health-test.mjs",
  "tools/release-manifest-test.mjs",
  "tools/generate-release-manifest.mjs",
  "tools/version-policy-client-test.mjs",
  "tools/release-safety-preflight-test.mjs",
  "tools/creator-profile-bridge-test.mjs",
  "tools/device-link-client-test.mjs",
  "tools/device-link-config-test.mjs",
  "tools/output-window-manager-test.mjs",
  "tools/output-gate-store-test.mjs",
  "tools/stream-deck-store-test.mjs",
  "tools/stream-deck-actions-test.mjs",
  "tools/entitlement-guard-test.mjs",
  "tools/entitlement-preflight-test.mjs",
  "tools/beta-session-store-v27-test.mjs",
  "tools/beta-feedback-bridge-v27-test.mjs",
  "tools/creator-tools-bridge-v28-test.mjs",
  "tools/game-live-rules-v29-test.mjs",
  "tools/cut-job-bridge-v29-test.mjs",
  "tools/bridge-flush-serialization-v29-test.mjs",
  "src/media-source-store.js",
  "src/cut-media-engine.js",
  "tools/media-source-store-v30-test.mjs",
  "tools/cut-media-engine-v30-test.mjs",
  "tools/cut-job-retry-v30-test.mjs",
  "tools/cut-media-caption-reel-v31-test.mjs",
  "tools/cut-media-transition-audio-v32-test.mjs",
  "tools/ffmpeg-bundle-prep-v32-test.mjs",
  "tools/stage-ffmpeg-windows.mjs",
  "tools/media-source-store-v33-test.mjs",
  "tools/cut-media-music-keyframes-v33-test.mjs",
  "tools/media-source-store-v34-test.mjs",
  "tools/cut-media-multitrack-v34-test.mjs",
  "tools/cut-media-curve-mixer-v35-test.mjs",
  "tools/cut-media-real-v35.mjs",
  "tools/media-source-store-v36-test.mjs",
  "tools/cut-media-multitrack-v36-test.mjs",
  "tools/cut-media-real-v36.mjs",
  "tools/billing-entitlement-v37-test.mjs",
  "src/windows-build-evidence.js",
  "tools/generate-windows-build-evidence.mjs",
  "tools/windows-build-evidence-v38-test.mjs",
  "tools/windows-acceptance-template-v39-test.mjs",
  "../tools/repository-hygiene-v40-test.mjs",
  "../tools/github-setup-v40-qa.mjs",
  "../tools/deployment-flow-v40-test.mjs",
  "../tools/legacy-verification-flags-v40-test.mjs",
  "../tools/github-files-placement-v40-test.mjs",
  "../tools/config-doctor-v41-test.mjs",
  "../tools/github-bootstrap-v41-test.mjs",
  "../tools/configuration-workflow-v41-qa.mjs",
  "../tools/admin-config-doctor-v41-qa.mjs",
  "../tools/github-labels-v41-test.mjs",
  "../tools/final-test-plan-v42-test.mjs",
  "../tools/final-verification-v42-qa.mjs",
  "../tools/final-test-files-v42-test.mjs",
  "vendor/ffmpeg/README.md",
  "tools/beta-profile-bridge-test.mjs",
  "tools/live-session-store-test.mjs",
  "tools/live-resume-bridge-test.mjs",
  "tools/action-lease-client-test.mjs",
  "tools/provider-switch-test.mjs",
  "tools/logger-tail-test.mjs",
  "tools/scene-output-bridge-test.mjs",
  "tools/event-monitor-test.mjs",
  "tools/obs-doctor-test.mjs",
  "tools/graceful-shutdown-test.mjs",
  "tools/e2e-live-session-test.mjs",
  "tools/event-stress-test.mjs",
  "tools/gift-streak-test.mjs",
  "tools/obs-multi-widget-load-test.mjs",
  "tools/release-gate.mjs",
  "build-windows.bat",
  "BUILD_WINDOWS.md",
  "renderer/index.html",
  "renderer/app.js"
]) {
  fs.existsSync(path.join(root,file)) ? ok(file) : fail(`${file} missing`);
}

const main = read("main.js");
for (const feature of [
  "requestSingleInstanceLock",
  "render-process-gone",
  "launcher:update-check",
  "launcher:diagnostics-export",
  "bridge-self-test",
  "launcher:preflight",
  "launcher:spool-clear",
  "launcher:device-link-start",
  "launcher:device-logout",
  "launcher:output-start",
  "launcher:output-stop",
  "launcher:output-gate-update",
  "launcher:stream-deck-action",
  "launcher:stream-deck-button-save",
  "launcher:creator-tools-refresh",
  "launcher:game-control",
  "launcher:open-cut-project",
  "launcher:media-engine-probe",
  "launcher:cut-source-select",
  "launcher:cut-music-select",
  "launcher:cut-music-clear",
  "launcher:cut-voice-select",
  "launcher:cut-voice-clear",
  "launcher:cut-music-track-select",
  "launcher:cut-voice-track-select",
  "launcher:cut-sfx-select",
  "launcher:cut-sfx-clear",
  "launcher:cut-job-process",
  "launcher:cut-export-folder"
]) {
  main.includes(feature) ? ok(`main: ${feature}`) : fail(`main missing ${feature}`);
}

const renderer = read("renderer/app.js");
for (const feature of [
  "queuedActionIds",
  "ttsVoiceName",
  "bridgeSelfTest",
  "checkForUpdates",
  "exportDiagnostics",
  "startDeviceLink",
  "logoutDevice",
  "startLocalOutput",
  "renderOutputGate",
  "renderStreamDeck",
  "renderDeckEditor",
  "renderCreatorTools",
  "data-process-cut-job",
  "data-select-cut-source",
  "data-select-cut-music",
  "data-select-cut-voice",
  "data-select-cut-sfx",
  "effective_plan"
]) {
  renderer.includes(feature) ? ok(`renderer: ${feature}`) : fail(`renderer missing ${feature}`);
}

const ffmpegResource=(pkg.build?.extraResources||[]).find(x=>x.from==="vendor/ffmpeg"&&x.to==="ffmpeg");
ffmpegResource ? ok("optional FFmpeg extraResources prepared") : fail("FFmpeg extraResources missing");

if (!process.exitCode) console.log("\nLauncher V0.42 release checks passed.");

"use strict";

const GUARD_PASS = "21.10.23";
const GUARD_SCHEMA = 1;
const DEFAULT_GUARD_PROFILE = "windows_multistream_10m";

const DEFAULT_THRESHOLDS = Object.freeze({
  minDurationMs: 10 * 60 * 1000,
  minSampleCoveragePct: 85,
  encoderSpeedWarnBelow: 0.98,
  encoderSpeedFailBelow: 0.90,
  fpsWarnRatioBelow: 0.97,
  fpsFailRatioBelow: 0.90,
  droppedFramesWarnAbove: 5,
  droppedFramesFailAbove: 30,
  targetLiveCoverageWarnBelow: 98,
  targetLiveCoverageFailBelow: 95,
  targetOutageWarnAboveMs: 10_000,
  targetOutageFailAboveMs: 30_000,
  targetReconnectWarnAbove: 3,
  recordingLiveCoverageWarnBelow: 98,
  recordingLiveCoverageFailBelow: 95,
  recordingOutageWarnAboveMs: 10_000,
  recordingOutageFailAboveMs: 30_000,
  helperRestartWarnAbove: 0,
  helperRestartFailAbove: 3,
  frameStallWarnAbove: 0,
  frameStallFailAbove: 3,
  deviceLossWarnAbove: 0,
  deviceLossFailAbove: 2,
  audioContinuityWarnAboveMs: 2_000,
  audioContinuityFailAboveMs: 10_000,
  recoveryWarnAbove: 2,
  recoveryFailAbove: 5
});

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function int(value, fallback = 0) { return Math.max(0, Math.round(number(value, fallback))); }
function pct(value) { return Math.max(0, Math.min(100, number(value))); }
function round(value, digits = 2) { const p = 10 ** digits; return Math.round(number(value) * p) / p; }
function statusRank(status) { return ({ PASS: 0, WARN: 1, INCOMPLETE: 2, FAIL: 3 }[status] ?? 0); }
function worstStatus(rows = []) { return rows.reduce((worst, row) => statusRank(row?.status) > statusRank(worst) ? row.status : worst, "PASS"); }
function check(id, label, status, detail, metrics = {}) { return { id, label, status, detail, metrics }; }
function thresholdStatus(value, { warnBelow = null, failBelow = null, warnAbove = null, failAbove = null } = {}) {
  const v = number(value);
  if (failBelow !== null && v < failBelow) return "FAIL";
  if (failAbove !== null && v > failAbove) return "FAIL";
  if (warnBelow !== null && v < warnBelow) return "WARN";
  if (warnAbove !== null && v > warnAbove) return "WARN";
  return "PASS";
}
function ratioPct(a, b) { return b > 0 ? (number(a) / number(b)) * 100 : 0; }
function audioBytesToMs(bytes) {
  // s16le, 48 kHz, stereo = 192000 bytes/sec = 192 bytes/ms.
  return int(bytes) / 192;
}

function buildScenarioCoverage(summary = {}, meta = {}) {
  const audioSources = Array.isArray(meta.audioSources) ? meta.audioSources : [];
  const appAudioExpected = audioSources.some((key) => ["game", "discord", "music", "alerts"].includes(String(key).toLowerCase()));
  const gameExpected = String(meta.captureType || "").toLowerCase() === "game";
  const rows = [
    { id: "scene_switch", label: "Scene-Wechsel", observed: int(summary.sceneSwitches) >= 1, required: true },
    { id: "transition", label: "Animierte Transition", observed: int(summary.sceneTransitions) >= 1, required: true },
    { id: "target_reconnect", label: "Isolierter Ziel-Reconnect", observed: int(summary.reconnects) >= 1, required: int(summary.expectedTargets) >= 2 },
    { id: "game_rebind", label: "Game Window/Process Rebind", observed: int(summary.gameCapture?.windowRebinds) + int(summary.gameCapture?.processRebinds) >= 1, required: gameExpected },
    { id: "audio_rebind", label: "Application-Audio Rebind", observed: int(summary.applicationAudio?.processRebinds) >= 1, required: appAudioExpected },
    { id: "recording", label: "Lokales Recording", observed: summary.recording?.observed === true, required: meta.recordingExpected === true }
  ];
  const required = rows.filter((row) => row.required);
  return {
    rows,
    required: required.length,
    observed: required.filter((row) => row.observed).length,
    complete: required.every((row) => row.observed),
    missing: required.filter((row) => !row.observed).map((row) => row.label)
  };
}

function evaluateSoakGuard(summary = {}, meta = {}, options = {}) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) };
  const sampleMs = Math.max(1000, int(meta.sampleMs, 2000));
  const durationMs = int(summary.durationMs);
  const expectedSamples = Math.max(1, Math.floor(durationMs / sampleMs) + 1);
  const sampleCoveragePct = ratioPct(int(summary.samples), expectedSamples);
  const expectedFps = Math.max(0, number(meta.expectedFps));
  const checks = [];

  checks.push(check(
    "duration",
    "Soak-Dauer",
    durationMs >= thresholds.minDurationMs ? "PASS" : "INCOMPLETE",
    durationMs >= thresholds.minDurationMs
      ? `${(durationMs / 60000).toFixed(1)} min erfasst.`
      : `${(durationMs / 60000).toFixed(1)} min erfasst; mindestens ${(thresholds.minDurationMs / 60000).toFixed(0)} min für den Guard erforderlich.`,
    { valueMs: durationMs, minimumMs: thresholds.minDurationMs }
  ));

  checks.push(check(
    "sample_coverage",
    "Evidence-Abdeckung",
    sampleCoveragePct >= thresholds.minSampleCoveragePct ? "PASS" : "INCOMPLETE",
    `${int(summary.samples)} Samples · rechnerische Abdeckung ${round(sampleCoveragePct, 1)}%.`,
    { samples: int(summary.samples), expectedSamples, coveragePct: round(sampleCoveragePct, 2), minimumPct: thresholds.minSampleCoveragePct }
  ));

  const expectedTargets = int(summary.expectedTargets);
  const seenTargets = Array.isArray(summary.targetIds) ? summary.targetIds.length : 0;
  checks.push(check(
    "targets_present",
    "Streaming-Ziele",
    seenTargets >= expectedTargets ? "PASS" : "FAIL",
    `${seenTargets}/${expectedTargets} erwarteten Zielen wurden beobachtet.`,
    { observed: seenTargets, expected: expectedTargets }
  ));

  const minEncoderSpeed = number(summary.minEncoderSpeed);
  const encoderStatus = minEncoderSpeed > 0
    ? thresholdStatus(minEncoderSpeed, { warnBelow: thresholds.encoderSpeedWarnBelow, failBelow: thresholds.encoderSpeedFailBelow })
    : "INCOMPLETE";
  checks.push(check(
    "encoder_speed",
    "Encoder-Speed",
    encoderStatus,
    minEncoderSpeed > 0 ? `Minimum ${minEncoderSpeed.toFixed(2)}x.` : "Keine belastbare Encoder-Speed gemessen.",
    { value: round(minEncoderSpeed, 3), warnBelow: thresholds.encoderSpeedWarnBelow, failBelow: thresholds.encoderSpeedFailBelow }
  ));

  if (expectedFps > 0) {
    const averageFps = number(summary.averageFps);
    const fpsRatio = expectedFps > 0 ? averageFps / expectedFps : 0;
    checks.push(check(
      "fps",
      "Output-FPS",
      averageFps > 0 ? thresholdStatus(fpsRatio, { warnBelow: thresholds.fpsWarnRatioBelow, failBelow: thresholds.fpsFailRatioBelow }) : "INCOMPLETE",
      averageFps > 0 ? `Ø ${averageFps.toFixed(1)} FPS bei erwarteten ${expectedFps.toFixed(0)} FPS.` : "Keine belastbare FPS-Messung vorhanden.",
      { averageFps: round(averageFps, 2), expectedFps, ratio: round(fpsRatio, 3) }
    ));
  }

  checks.push(check(
    "dropped_frames",
    "Dropped Frames",
    thresholdStatus(int(summary.maxDroppedFrames), { warnAbove: thresholds.droppedFramesWarnAbove, failAbove: thresholds.droppedFramesFailAbove }),
    `Maximal ${int(summary.maxDroppedFrames)} gemeldete Dropped Frames.`,
    { value: int(summary.maxDroppedFrames), warnAbove: thresholds.droppedFramesWarnAbove, failAbove: thresholds.droppedFramesFailAbove }
  ));

  if (int(summary.errors) > 0) checks.push(check("engine_errors", "Streaming-Engine Fehler", "FAIL", `${int(summary.errors)} Engine-Fehler gemeldet.`, { value: int(summary.errors) }));
  else checks.push(check("engine_errors", "Streaming-Engine Fehler", "PASS", "Keine Engine-Fehler gemeldet.", { value: 0 }));

  if (int(summary.watchdogRestarts) > 0) checks.push(check("watchdog", "FFmpeg Watchdog", "FAIL", `${int(summary.watchdogRestarts)} Watchdog-Restart(s) gemeldet.`, { value: int(summary.watchdogRestarts) }));
  else checks.push(check("watchdog", "FFmpeg Watchdog", "PASS", "Kein Watchdog-Restart gemeldet.", { value: 0 }));

  if (int(summary.sceneSwitchFailures) > 0) checks.push(check("scene_switch", "Scene Hot Switch", "FAIL", `${int(summary.sceneSwitchFailures)} Scene-Switch-Fehler gemeldet.`, { failures: int(summary.sceneSwitchFailures) }));
  else checks.push(check("scene_switch", "Scene Hot Switch", "PASS", `${int(summary.sceneSwitches)} Scene-Wechsel ohne gemeldeten Switch-Fehler.`, { switches: int(summary.sceneSwitches), failures: 0 }));

  checks.push(check(
    "transition_fallback",
    "Transition Runtime",
    int(summary.sceneTransitionFallbacks) > 0 ? "WARN" : "PASS",
    int(summary.sceneTransitionFallbacks) > 0 ? `${int(summary.sceneTransitionFallbacks)} Transition-Fallback(s) auf CUT.` : `${int(summary.sceneTransitions)} Transition(s), kein Fallback gemeldet.`,
    { transitions: int(summary.sceneTransitions), fallbacks: int(summary.sceneTransitionFallbacks) }
  ));

  for (const [id, target] of Object.entries(summary.targets || {})) {
    const liveCoveragePct = pct(target.liveCoveragePct ?? ratioPct(target.liveSamples, target.samples));
    const outageMs = int(target.longestNonLiveMs);
    const coverageStatus = thresholdStatus(liveCoveragePct, { warnBelow: thresholds.targetLiveCoverageWarnBelow, failBelow: thresholds.targetLiveCoverageFailBelow });
    const outageStatus = thresholdStatus(outageMs, { warnAbove: thresholds.targetOutageWarnAboveMs, failAbove: thresholds.targetOutageFailAboveMs });
    const reconnectStatus = int(target.maxReconnectAttempt) > thresholds.targetReconnectWarnAbove ? "WARN" : "PASS";
    checks.push(check(
      `target:${id}`,
      `Ziel ${target.label || id}`,
      worstStatus([{ status: coverageStatus }, { status: outageStatus }, { status: reconnectStatus }, { status: int(target.errorSamples) > 0 ? "FAIL" : "PASS" }]),
      `${round(liveCoveragePct, 2)}% live · längste Unterbrechung ${(outageMs / 1000).toFixed(1)} s · Reconnect-Attempt max ${int(target.maxReconnectAttempt)} · Error-Samples ${int(target.errorSamples)}.`,
      { liveCoveragePct: round(liveCoveragePct, 3), longestNonLiveMs: outageMs, maxReconnectAttempt: int(target.maxReconnectAttempt), errorSamples: int(target.errorSamples) }
    ));
  }

  if (meta.recordingExpected === true) {
    if (summary.recording?.observed !== true) {
      checks.push(check("recording", "Recording-Kontinuität", "FAIL", "Recording war erwartet, wurde aber nicht beobachtet."));
    } else {
      const liveCoveragePct = pct(summary.recording.liveCoveragePct ?? ratioPct(summary.recording.liveSamples, summary.samples));
      const outageMs = int(summary.recording.longestNonLiveMs);
      const dropped = int(summary.recording.maxDroppedFrames);
      const speed = number(summary.recording.minSpeed);
      const st = worstStatus([
        { status: thresholdStatus(liveCoveragePct, { warnBelow: thresholds.recordingLiveCoverageWarnBelow, failBelow: thresholds.recordingLiveCoverageFailBelow }) },
        { status: thresholdStatus(outageMs, { warnAbove: thresholds.recordingOutageWarnAboveMs, failAbove: thresholds.recordingOutageFailAboveMs }) },
        { status: thresholdStatus(dropped, { warnAbove: thresholds.droppedFramesWarnAbove, failAbove: thresholds.droppedFramesFailAbove }) },
        { status: speed > 0 ? thresholdStatus(speed, { warnBelow: thresholds.encoderSpeedWarnBelow, failBelow: thresholds.encoderSpeedFailBelow }) : "INCOMPLETE" }
      ]);
      checks.push(check("recording", "Recording-Kontinuität", st, `${round(liveCoveragePct, 2)}% live · längste Unterbrechung ${(outageMs / 1000).toFixed(1)} s · DROP ${dropped} · Speed ${speed.toFixed(2)}x.`, { liveCoveragePct: round(liveCoveragePct, 3), longestNonLiveMs: outageMs, droppedFrames: dropped, minSpeed: round(speed, 3) }));
    }
  }

  const game = summary.gameCapture || {};
  const gameStatus = worstStatus([
    { status: int(game.captureErrors) > 0 ? "FAIL" : "PASS" },
    { status: thresholdStatus(int(game.helperRestarts), { warnAbove: thresholds.helperRestartWarnAbove, failAbove: thresholds.helperRestartFailAbove }) },
    { status: thresholdStatus(int(game.frameStalls), { warnAbove: thresholds.frameStallWarnAbove, failAbove: thresholds.frameStallFailAbove }) },
    { status: thresholdStatus(int(game.deviceLossRestarts), { warnAbove: thresholds.deviceLossWarnAbove, failAbove: thresholds.deviceLossFailAbove }) }
  ]);
  checks.push(check("game_recovery", "Game-Capture Recovery", gameStatus, `${int(game.helperRestarts)} Helper-Restarts · ${int(game.frameStalls)} Stalls · ${int(game.deviceLossRestarts)} D3D-Recovery · ${int(game.captureErrors)} Capture-Errors.`, { ...game }));

  const audio = summary.applicationAudio || {};
  const continuityMs = audioBytesToMs(audio.continuityBytes);
  const audioStatus = worstStatus([
    { status: thresholdStatus(int(audio.helperRestarts), { warnAbove: thresholds.helperRestartWarnAbove, failAbove: thresholds.helperRestartFailAbove }) },
    { status: thresholdStatus(int(audio.recoveries), { warnAbove: thresholds.recoveryWarnAbove, failAbove: thresholds.recoveryFailAbove }) },
    { status: thresholdStatus(continuityMs, { warnAbove: thresholds.audioContinuityWarnAboveMs, failAbove: thresholds.audioContinuityFailAboveMs }) }
  ]);
  checks.push(check("audio_recovery", "Application-Audio Recovery", audioStatus, `${int(audio.recoveries)} Recoveries · ${int(audio.helperRestarts)} Helper-Restarts · ${(continuityMs / 1000).toFixed(2)} s Continuity-Silence.`, { recoveries: int(audio.recoveries), helperRestarts: int(audio.helperRestarts), processRebinds: int(audio.processRebinds), continuityMs: round(continuityMs, 2) }));

  const scenarioCoverage = buildScenarioCoverage(summary, meta);
  const status = worstStatus(checks);
  const acceptanceStatus = status === "FAIL" ? "FAIL" : (status === "INCOMPLETE" || !scenarioCoverage.complete ? "INCOMPLETE" : status);
  const counts = checks.reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, { PASS: 0, WARN: 0, FAIL: 0, INCOMPLETE: 0 });

  return {
    schema: GUARD_SCHEMA,
    pass: GUARD_PASS,
    profile: DEFAULT_GUARD_PROFILE,
    status,
    acceptanceStatus,
    acceptanceReady: acceptanceStatus === "PASS",
    platformAcceptance: false,
    realWindowsAcceptance: false,
    generatedAt: new Date().toISOString(),
    counts,
    thresholds,
    sampleMs,
    expectedFps,
    scenarioCoverage,
    checks
  };
}

module.exports = {
  GUARD_PASS,
  GUARD_SCHEMA,
  DEFAULT_GUARD_PROFILE,
  DEFAULT_THRESHOLDS,
  evaluateSoakGuard,
  buildScenarioCoverage,
  audioBytesToMs,
  worstStatus
};

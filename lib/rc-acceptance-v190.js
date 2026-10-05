"use strict";

const VERSION = "v190";
const STATUS_VALUES = Object.freeze(["pending", "pass", "fail", "skip", "blocked"]);
const STATUS_SET = new Set(STATUS_VALUES);

const GROUPS = Object.freeze([
  {
    id: "windows",
    label: "Windows Launcher / Distribution",
    cases: [
      ["windows.clean_install", "Setup auf sauberem Windows 11 installieren", "required"],
      ["windows.portable_start", "Portable Launcher startet auf Windows 11", "required"],
      ["windows.device_link", "Creator Device-Link und erneute Anmeldung prüfen", "required"],
      ["windows.safe_storage", "SafeStorage bleibt nach Launcher-/Windows-Neustart nutzbar", "required"],
      ["windows.update", "Installed Updater E2E inklusive Safety Gate prüfen", "required"],
      ["windows.diagnostics", "Preflight/Diagnostics/Support Bundle ohne Secrets prüfen", "required"],
      ["windows.signing", "Authenticode/Publisher-/SmartScreen-Verhalten dokumentieren", "required"]
    ]
  },
  {
    id: "obs",
    label: "OBS",
    cases: [
      ["obs.browser_widget", "Widget als OBS Browser Source real laden", "required"],
      ["obs.browser_scene", "Scene als OBS Browser Source real laden", "required"],
      ["obs.websocket_connect", "OBS WebSocket verbinden und reconnecten", "required"],
      ["obs.scene_switch", "Scene lesen und sicher umschalten", "required"],
      ["obs.widget_install", "Widget-Quelle über Launcher erstellen/aktualisieren", "required"],
      ["obs.boundary", "Keine beliebige Remote-Streaming-Start-Aktion möglich", "required"]
    ]
  },
  {
    id: "twitch",
    label: "Twitch",
    cases: [
      ["twitch.oauth", "OAuth mit echtem Testaccount verbinden", "required"],
      ["twitch.reauth", "Reauth/Scope-Nachforderung für Stream-Target prüfen", "required"],
      ["twitch.sync", "Profil/Channel-Sync real prüfen", "required"],
      ["twitch.events", "EventSub Live/Offline/Follows/Subs/Cheers/Chat real prüfen", "required"],
      ["twitch.target", "Provider → Streaming-Ziel ohne Browser-/DB-Key-Leak prüfen", "required"],
      ["twitch.revoke", "Disconnect/Revoke und anschließendes Reconnect prüfen", "required"]
    ]
  },
  {
    id: "tiktok",
    label: "TikTok",
    cases: [
      ["tiktok.connect", "TikTok-Verbindung mit echtem Testaccount prüfen", "required"],
      ["tiktok.events", "LIVE-/Like-/Gift-/Share-/Viewer-Ereignisse real prüfen", "required"],
      ["tiktok.reconnect", "Provider-Unterbrechung und Reconnect prüfen", "required"],
      ["tiktok.output", "9:16 Workflow/Output real prüfen", "required"],
      ["tiktok.target", "Offiziellen Server-URL/Stream-Key-Zugang als lokales Ziel prüfen", "conditional", "Nur wenn der Testaccount offiziell Encoder-/Stream-Key-Zugang besitzt; kein Scraping oder Circumvention."]
    ]
  },
  {
    id: "youtube",
    label: "YouTube",
    cases: [
      ["youtube.oauth", "Google/YouTube OAuth mit echtem Testaccount verbinden", "required"],
      ["youtube.channel", "Channel-Sync und Token-Refresh real prüfen", "required"],
      ["youtube.live", "Aktiven Live-Broadcast und Live-Chat real prüfen", "required"],
      ["youtube.events", "Membership/Super-Chat-Pfade real prüfen, soweit Testaccount unterstützt", "conditional", "Kann mit Begründung SKIP sein, wenn der Testaccount die jeweilige Monetarisierungsfunktion nicht besitzt."],
      ["youtube.target", "LiveStreams/Ingest → lokales Streaming-Ziel ohne Browser-/DB-Key-Leak prüfen", "required"]
    ]
  },
  {
    id: "multistream",
    label: "Multistream",
    cases: [
      ["multistream.parallel", "Mindestens zwei Ziele parallel streamen", "required"],
      ["multistream.isolation", "Fehler eines Ziels stoppt andere Ziele nicht", "required"],
      ["multistream.manual_stop", "Manueller Stop unterdrückt Auto-Reconnect nur für dieses Ziel", "required"],
      ["multistream.custom_rtmp", "Custom RTMP bleibt vollständig lokal gespeichert", "required"],
      ["multistream.no_cloud_secret", "Keine Stream-Keys/RTMP-Secrets in DB, Browser, Logs oder Support Export", "required"]
    ]
  },
  {
    id: "stability",
    label: "Reconnect / Soak / Stabilität",
    cases: [
      ["stability.network_drop", "Netzwerkunterbrechung und kontrollierten Reconnect prüfen", "required"],
      ["stability.provider_drop", "Einzelnen Provider-Ausfall und Recovery prüfen", "required"],
      ["stability.launcher_restart", "Launcher-Neustart während vorbereitetem Workflow prüfen", "required"],
      ["stability.soak", "Mindestens 60 Minuten Stream-/Multistream-Soak ohne kritischen Fehler", "required"],
      ["stability.watchdog", "Watchdog/Recovery-Evidence ohne Secrets prüfen", "required"]
    ]
  },
  {
    id: "browser",
    label: "Public / Creator / Admin Browser-Abnahme",
    cases: [
      ["browser.public", "Public Website visuell/responsiv prüfen", "required"],
      ["browser.creator", "Creator Dashboard/Shop/Studios visuell/responsiv prüfen", "required"],
      ["browser.admin", "Admin Control Center visuell/responsiv prüfen", "required"],
      ["browser.mobile", "Mobile Touch-/Scroll-/Fehlerzustände auf realem Gerät prüfen", "required"],
      ["browser.accessibility", "Keyboard/Fokus/ARIA-Basis auf realem Browser prüfen", "required"]
    ]
  },
  {
    id: "security",
    label: "Account / Isolation / Passkey",
    cases: [
      ["security.passkey", "Passkey/WebAuthn auf echter Hardware und echtem Browser prüfen", "required"],
      ["security.creator_isolation", "Zwei Creator: Widget/Scene/Shop/Provider-Zugriffe gegenseitig blockiert", "required"],
      ["security.admin_isolation", "Creator ohne Admin-Mail kann Admin-HTML/API nicht nutzen", "required"],
      ["security.secret_review", "Logs/Browser/Support-Evidence auf OAuth-/Stream-Secrets prüfen", "required"]
    ]
  }
]);

function safeText(value, max = 2000) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
function allCases() {
  return GROUPS.flatMap(group => group.cases.map(([id, label, requirement, condition = ""]) => ({
    id, group: group.id, group_label: group.label, label, requirement, condition
  })));
}
function caseDefinition(id) {
  return allCases().find(item => item.id === String(id || "")) || null;
}
function baseline({ backendVersion = "3.20.35", schemaVersion = 78, launcherVersion = "0.47.30" } = {}) {
  return {
    schema: 1,
    acceptance_version: VERSION,
    product: "cfs_zockt Creator Suite",
    backend_version: String(backendVersion),
    schema_version: Number(schemaVersion),
    launcher_version: String(launcherVersion),
    commerce_enabled: false,
    scope: "release_candidate_real_world_acceptance",
    created_at: null,
    updated_at: null,
    records: allCases().map(item => ({
      id: item.id,
      group: item.group,
      label: item.label,
      requirement: item.requirement,
      condition: item.condition,
      status: "pending",
      notes: "",
      reference: "",
      tested_at: null
    }))
  };
}
function dangerousEvidence(text) {
  const value = String(text || "");
  return /(?:rtmps?:\/\/|oauth:\S+|bearer\s+[A-Za-z0-9._~+\/-]{12,}|(?:access|refresh)[_-]?token\s*[=:]\s*\S+|client[_-]?secret\s*[=:]\s*\S+|stream[_ -]?key\s*[=:]\s*\S+)/i.test(value)
    || /^[A-Za-z]:\\/.test(value)
    || /^\//.test(value)
    || /https?:\/\/[^\s?#]+\?[^\s]+/.test(value);
}
function normalizeRecord(input = {}, existing = null) {
  const def = caseDefinition(input.id || existing?.id);
  if (!def) throw new Error("Unbekannte v190 Acceptance-ID.");
  const status = STATUS_SET.has(String(input.status || existing?.status || "pending")) ? String(input.status || existing?.status || "pending") : "pending";
  const notes = safeText(input.notes ?? existing?.notes, 2000);
  const reference = safeText(input.reference ?? existing?.reference, 500);
  const testedAt = status === "pending" ? null : (safeText(input.tested_at ?? existing?.tested_at, 80) || new Date().toISOString());
  if (["pass", "fail", "skip", "blocked"].includes(status) && notes.length < 12 && !reference) {
    throw new Error(`${def.id}: ${status.toUpperCase()} braucht eine Referenz oder nachvollziehbare Notiz.`);
  }
  if (status === "pass" && !reference) throw new Error(`${def.id}: PASS braucht eine Evidence-Referenz.`);
  if (status === "skip" && def.requirement === "required") {
    // SKIP is allowed to document reality, but it must remain a hard blocker in evaluate().
  }
  if (dangerousEvidence(notes) || dangerousEvidence(reference)) {
    throw new Error(`${def.id}: Evidence enthält möglicherweise Secret/RTMP-URL/absoluten lokalen Pfad. Nur sichere Referenz-IDs verwenden.`);
  }
  return { ...def, status, notes, reference, tested_at: testedAt };
}
function normalizePlan(input = {}) {
  const base = baseline({
    backendVersion: input.backend_version || "3.20.35",
    schemaVersion: input.schema_version ?? 78,
    launcherVersion: input.launcher_version || "0.47.30"
  });
  const byId = new Map((Array.isArray(input.records) ? input.records : []).map(record => [String(record?.id || ""), record]));
  base.created_at = input.created_at || null;
  base.updated_at = input.updated_at || null;
  base.records = base.records.map(record => normalizeRecord(byId.get(record.id) || record, record));
  return base;
}
function evaluate(plan = {}) {
  const normalized = normalizePlan(plan);
  const rows = normalized.records.map(record => {
    const resolved = record.requirement === "conditional"
      ? ["pass", "skip"].includes(record.status)
      : record.status === "pass";
    return { ...record, resolved, blocker: !resolved };
  });
  const counts = Object.fromEntries(STATUS_VALUES.map(status => [status, rows.filter(row => row.status === status).length]));
  const groups = GROUPS.map(group => {
    const records = rows.filter(row => row.group === group.id);
    const blockers = records.filter(row => row.blocker);
    return { id: group.id, label: group.label, total: records.length, passed: records.filter(row => row.status === "pass").length, blockers: blockers.length, ready: blockers.length === 0 };
  });
  const blockers = rows.filter(row => row.blocker).map(row => row.id);
  return {
    ready: blockers.length === 0,
    recommendation: blockers.length === 0 ? "RC_READY_FOR_GO_NO_GO" : "HOLD",
    total: rows.length,
    resolved: rows.filter(row => row.resolved).length,
    blockers,
    counts,
    groups,
    records: rows
  };
}
function markdown(plan = {}) {
  const normalized = normalizePlan(plan), result = evaluate(normalized);
  const lines = [
    "# cfs_zockt — RC Acceptance Status v190", "",
    `Backend: **${normalized.backend_version}**  `,
    `Schema: **${normalized.schema_version}**  `,
    `Launcher: **${normalized.launcher_version}**  `,
    `Commerce: **deaktiviert**`, "",
    `Status: **${result.recommendation}** · ${result.resolved}/${result.total} aufgelöst`, "",
    "> Dieser Report ist für reale Zielumgebungs-Abnahmen. Ein automatischer Code-Test darf hier keinen realen PASS eintragen.", ""
  ];
  for (const group of GROUPS) {
    lines.push(`## ${group.label}`, "");
    for (const row of result.records.filter(record => record.group === group.id)) {
      const box = row.status === "pass" ? "x" : " ";
      const req = row.requirement === "conditional" ? " · conditional" : "";
      lines.push(`- [${box}] \`${row.id}\` — ${row.label} — **${row.status.toUpperCase()}**${req}`);
      if (row.condition) lines.push(`  - Bedingung: ${row.condition}`);
      if (row.notes) lines.push(`  - Notiz: ${row.notes}`);
      if (row.reference) lines.push(`  - Evidence: \`${row.reference}\``);
    }
    lines.push("");
  }
  lines.push("## Go/No-Go-Regel", "", "- Pflichtprüfungen zählen nur mit `PASS` als aufgelöst.", "- `SKIP` bei Pflichtprüfungen bleibt ein Blocker.", "- Conditional-Prüfungen dürfen mit dokumentierter Begründung `SKIP` sein.", "- `GO` ist erst nach realer Abnahme und separater Entscheidung zulässig.", "");
  return lines.join("\n");
}

module.exports = { VERSION, STATUS_VALUES, GROUPS, allCases, caseDefinition, baseline, dangerousEvidence, normalizeRecord, normalizePlan, evaluate, markdown };

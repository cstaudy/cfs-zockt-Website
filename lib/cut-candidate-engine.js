"use strict";

const crypto = require("node:crypto");
const { GAME_PROFILES, sanitizeReferenceLearning, applyReferenceGuidance, profileId } = require("./cut-reference-learning");

function clamp(value, min, max, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function text(value, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}
function stableCandidateId(event, index) {
  const basis = [event.category, event.start, event.end, event.label, index].join("|");
  return `cand_${crypto.createHash("sha256").update(basis).digest("hex").slice(0, 16)}`;
}
function allowedCategory(category, gameProfile) {
  const profile = GAME_PROFILES[profileId(gameProfile)] || GAME_PROFILES.generic;
  const value = text(category, 40).toLowerCase();
  return profile.categories.includes(value) ? value : "";
}
function sanitizeOwnEvent(input = {}, gameProfile = "generic", index = 0) {
  const category = allowedCategory(input.category || input.type || input.kind, gameProfile);
  if (!category) return null;
  const start = clamp(input.start ?? input.start_seconds ?? input.start_s, 0, 24 * 60 * 60, 0);
  const rawEnd = input.end ?? input.end_seconds ?? input.end_s;
  const end = clamp(rawEnd, start + 0.05, 24 * 60 * 60, start + Math.max(0.05, clamp(input.duration ?? input.duration_seconds, 0.05, 180, 1)));
  if (!(end > start)) return null;
  const confidence = clamp(input.confidence, 0, 1, 0.5);
  const shortScore = clamp(input.short_score ?? input.shortScore ?? input.score, 0, 1, confidence);
  const hookScore = clamp(input.hook_score ?? input.hookScore, 0, 1, 0);
  const reaction = clamp(input.reaction, 0, 1, 0);
  const actionDensity = clamp(input.action_density ?? input.actionDensity, 0, 1, Math.max(shortScore, confidence));
  const id = text(input.id || input.evidence_id, 80).replace(/[^a-zA-Z0-9_.:-]/g, "") || `evidence_${index + 1}`;
  return {
    id,
    category,
    start: round(start),
    end: round(end),
    confidence: round(confidence),
    short_score: round(shortScore),
    hook_score: round(hookScore),
    reaction: round(reaction),
    action_density: round(actionDensity),
    context_before: round(clamp(input.context_before ?? input.contextBefore, 0, 8, 0), 2),
    context_after: round(clamp(input.context_after ?? input.contextAfter, 0, 8, 0), 2),
    label: text(input.label || input.title || category, 120),
    reason: text(input.reason || input.evidence || "", 260),
    source: "own_clip"
  };
}

function sanitizeOwnClipEvidence(input = {}, gameProfile = "generic") {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const rawEvents = Array.isArray(source.events)
    ? source.events
    : Array.isArray(source.highlights)
      ? source.highlights
      : Array.isArray(source.candidates)
        ? source.candidates
        : [];
  const events = rawEvents.slice(0, 120).map((event, index) => sanitizeOwnEvent(event, gameProfile, index)).filter(Boolean);
  const durationSeconds = clamp(source.duration_seconds ?? source.duration ?? source.media_duration_seconds, 0, 24 * 60 * 60, 0);
  return {
    schema: 1,
    source: "own_clip",
    semantic_source: "own_clip_evidence",
    game_profile: profileId(gameProfile),
    duration_seconds: round(durationSeconds, 3),
    events,
    analyzed_at: text(source.analyzed_at ?? source.analyzedAt, 40),
    analyzer: text(source.analyzer || "local", 60) || "local",
    raw_media_included: false
  };
}

function sanitizeGroundTruth(input = []) {
  const rows = Array.isArray(input) ? input : [];
  const out = [];
  const seen = new Set();
  for (const row of rows.slice(0, 200)) {
    if (!row || typeof row !== "object") continue;
    const candidateId = text(row.candidate_id ?? row.candidateId ?? row.id, 90).replace(/[^a-zA-Z0-9_.:-]/g, "");
    const evidenceId = text(row.evidence_id ?? row.evidenceId, 90).replace(/[^a-zA-Z0-9_.:-]/g, "");
    const decisionRaw = String(row.decision ?? row.action ?? row.status ?? "").toLowerCase();
    const decision = ["keep", "reject"].includes(decisionRaw) ? decisionRaw : "";
    if ((!candidateId && !evidenceId) || !decision) continue;
    const key = candidateId || `evidence:${evidenceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      candidate_id: candidateId,
      evidence_id: evidenceId,
      decision,
      note: text(row.note || row.reason, 240),
      decided_at: text(row.decided_at ?? row.decidedAt, 40)
    });
  }
  return out;
}

function truthFor(candidate, groundTruth) {
  const direct = groundTruth.find(row => row.candidate_id && row.candidate_id === candidate.id);
  if (direct) return direct;
  return groundTruth.find(row => row.evidence_id && row.evidence_id === candidate.evidence_id) || null;
}

function baseCandidateFromEvidence(event, index) {
  const start = Math.max(0, event.start - event.context_before);
  const end = Math.max(start + 0.05, event.end + event.context_after);
  const evidenceScore = clamp(
    event.short_score * 0.36 + event.confidence * 0.34 + event.hook_score * 0.12 + event.reaction * 0.08 + event.action_density * 0.10,
    0,
    1,
    0
  );
  const candidate = {
    id: stableCandidateId(event, index),
    evidence_id: event.id,
    category: event.category,
    label: event.label || event.category,
    reason: event.reason,
    start: round(start),
    end: round(end),
    evidence_start: event.start,
    evidence_end: event.end,
    confidence: event.confidence,
    action_density: event.action_density,
    score: round(evidenceScore),
    source: "own_clip_evidence",
    reference_boost: 0,
    decision: "",
    allowed: true
  };
  return candidate;
}

function buildCutCandidates({ own_evidence = {}, ground_truth = [], game_profile = "generic", reference_learning = {} } = {}) {
  const gameProfile = profileId(game_profile);
  const own = sanitizeOwnClipEvidence(own_evidence, gameProfile);
  const truth = sanitizeGroundTruth(ground_truth);
  const learning = sanitizeReferenceLearning(reference_learning && typeof reference_learning === "object" ? reference_learning : {}, gameProfile);
  const ownCategories = own.events.map(event => event.category);
  const candidates = own.events.map((event, index) => {
    const base = baseCandidateFromEvidence(event, index);
    const guided = applyReferenceGuidance(base, learning, ownCategories);
    // Reference Learning is editorial only. Limit its total influence regardless of provider output.
    const referenceBoost = clamp(guided.reference_boost, 0, 0.12, 0);
    let candidate = { ...guided, score: round(Math.min(1, base.score + referenceBoost)), reference_boost: round(referenceBoost) };
    const decision = truthFor(candidate, truth);
    if (decision) {
      candidate.decision = decision.decision;
      candidate.decision_note = decision.note;
      if (decision.decision === "reject") {
        candidate.allowed = false;
        candidate.score = 0;
      } else if (decision.decision === "keep") {
        candidate.allowed = true;
        candidate.score = round(Math.max(candidate.score, 0.95));
      }
    }
    return candidate;
  });
  candidates.sort((a, b) => {
    const rank = value => value.decision === "keep" ? 2 : value.allowed ? 1 : 0;
    return rank(b) - rank(a) || b.score - a.score || a.start - b.start || a.id.localeCompare(b.id);
  });
  return {
    schema: 1,
    game_profile: gameProfile,
    semantic_source: "own_clip_evidence",
    reference_semantic_separation: true,
    reference_boost_max: 0.12,
    own_evidence: own,
    ground_truth: truth,
    reference_learning: learning,
    candidates: candidates.slice(0, 100),
    summary: {
      evidence_events: own.events.length,
      candidates: Math.min(candidates.length, 100),
      kept: candidates.filter(row => row.decision === "keep").length,
      rejected: candidates.filter(row => row.decision === "reject").length
    }
  };
}

module.exports = { buildCutCandidates, sanitizeOwnClipEvidence, sanitizeGroundTruth };

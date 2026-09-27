# v193 — Recording Handoff Initial Clip Idempotency / Launcher 0.47.12

**Launcher: 0.47.12**

- Adds a dedicated idempotent bridge endpoint for the initial Recording→CUT clip. The server locks the Creator resource and Cut project, validates `source_handoff_id`, reuses the existing first clip when present, and only inserts a new initial clip when the project is still empty.
- Launcher `materializeRecordingHandoff()` now uses the idempotent initial-recording endpoint instead of generic clip creation, closing the duplicate “Gesamte Aufnahme” race under concurrent/retried handoff materialization.
- Launcher executable code changed, so active release contracts are synchronized from 0.47.11 to **0.47.12**. Backend remains **3.12.0**, Schema Generation remains **68**. External acceptance remains OPEN.
- Local contract: Recording Initial Clip Idempotency v193: 15/15 PASS; Launcher static check PASS; BridgeClient integration PASS; Release Readiness 20/20 PASS.

# v192 — Transactional Stream Heartbeat Serialization

- Serializes launcher heartbeat health updates with a dedicated PostgreSQL transaction and `SELECT ... FOR UPDATE` on the active bridge row before deriving the next health-evidence snapshot.
- Bridge health persistence and `creator_live_state` heartbeat persistence now use the same transaction client with COMMIT/ROLLBACK semantics.
- Server-owned support-export/audit/readiness histories are preserved from the locked row, preventing stale concurrent heartbeat reads from overwriting newer server-derived state.
- Local contract: Stream Heartbeat Serialization v192: 12/12 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v191 — Local Runtime Readiness Decision Record

- Adds a compact server-derived local readiness decision record over diagnostic integrity, proof summary, proof trend, readiness attestation and readiness envelope. It reports eligible, open or blocked and receives a stable opaque cfsrd_ ID. The record explicitly keeps production_ready_claimed=false and external acceptance required/open; support-export seal advances to schema 24.
- Local contract: Stream Runtime Local Readiness Decision v191: 14/14 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v190 — Runtime Local Readiness Proof Trend

- Adds a server-derived trend over local-readiness proof history with baseline, stable, improved, recovered or regressed states. Comparison uses the prior distinct export, proof severity and bounded reason-count movement. Support-export seal advances to schema 23 and binds the trend.
- Local contract: Stream Runtime Local Readiness Proof Trend v190: 10/10 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v189 — Runtime Local Readiness Proof History

- Adds a bounded server-derived history of the last eight local runtime readiness proof summaries inside existing stream_health JSON. Each entry receives a stable opaque cfsrph_ history ID; duplicate export IDs replace the existing entry and launcher heartbeats preserve the server-owned history. Support-export seal advances to schema 22 and binds the history.
- Local contract: Stream Runtime Local Readiness Proof History v189: 9/9 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v188 — Local Runtime Readiness Proof Summary

- Adds a compact server-derived local readiness proof summary over diagnostic integrity, readiness envelope, acceptance decision, readiness attestation and attestation trend. It reports eligible, open or blocked and receives a stable opaque cfsrpv_ ID. The proof explicitly sets production_ready_claimed=false and keeps external acceptance required/open; support-export seal advances to schema 21.
- Local contract: Stream Runtime Local Readiness Proof Summary v188: 15/15 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v187 — Runtime Readiness Attestation Trend

- Adds a server-derived trend over readiness-attestation history with baseline, stable, improved, recovered or regressed states. Comparison uses the prior distinct export, attestation severity and bounded reason-count movement. The trend remains local-runtime-only and keeps external acceptance open; support-export seal advances to schema 20.
- Local contract: Stream Runtime Readiness Attestation Trend v187: 12/12 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v186 — Runtime Readiness Attestation History

- Adds a bounded server-derived history of the last eight local runtime readiness attestations inside existing stream_health JSON. Each entry receives a stable opaque cfsath_ history ID; duplicate export IDs replace the existing entry and launcher heartbeats preserve the server-owned history. Support-export seal advances to schema 19 and binds the history.
- Local contract: Stream Runtime Readiness Attestation History v186: 9/9 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v185 — Local Runtime Readiness Attestation

- Adds a server-derived local readiness attestation over diagnostic integrity, readiness envelope, envelope trend, acceptance decision, release gate and runtime acceptance matrix. It reports eligible, open or blocked and receives a stable opaque cfsat_ ID. The attestation explicitly sets production_ready_claimed=false and keeps external acceptance required/open; support-export seal advances to schema 18.
- Local contract: Stream Runtime Readiness Attestation v185: 13/13 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v184 — Runtime Readiness Envelope Trend

- Adds a server-derived trend over readiness-envelope history with baseline, stable, improved, recovered or regressed states. Comparison uses the prior distinct export, readiness severity and bounded reason-count movement. The trend remains local-runtime-only and keeps external acceptance open; support-export seal advances to schema 17.
- Local contract: Stream Runtime Readiness Envelope Trend v184: 11/11 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v183 — Runtime Readiness Envelope History

- Adds a bounded server-derived history of the last eight local runtime readiness envelopes inside existing stream_health JSON. Each entry receives a stable opaque cfseh_ history ID; duplicate export IDs replace the existing entry and launcher heartbeats preserve the server-owned history. Support-export seal advances to schema 16 and binds the history.
- Local contract: Stream Runtime Readiness Envelope History v183: 9/9 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v182 — Local Runtime Readiness Envelope

- Adds a compact server-derived readiness envelope over diagnostic integrity, runtime acceptance, local release gate, acceptance decision and decision trend.
- The envelope reports eligible, open or blocked and receives a stable opaque cfsen_ ID; regression or unresolved local evidence cannot be presented as eligible.
- The envelope explicitly sets production_ready_claimed=false, requires external acceptance and keeps external_acceptance_claimed=false / external_acceptance_status=open; support-export seal advances to schema 15.
- Local contract: Stream Runtime Readiness Envelope v182: 13/13 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v179 — Runtime Acceptance Decision Snapshot

- Adds a server-derived acceptance-decision snapshot with eligible, open or blocked states over diagnostic integrity, runtime acceptance, local release gate and gate trend.
- The decision receives a stable opaque cfsad_ ID and explicitly requires external acceptance before any production go-live claim.
- The decision is scoped to local_runtime_acceptance_decision_only, always keeps external_acceptance_claimed=false / external_acceptance_status=open, and support-export seal advances to schema 12.
- Local contract: Stream Runtime Acceptance Decision v179: 13/13 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v178 — Runtime Release Gate Trend

- Adds a server-derived trend over the bounded release-gate history with baseline, stable, improved, recovered or regressed states.
- Comparison uses the prior distinct export and evaluates ready/open/blocked severity plus bounded reason-count movement.
- The trend remains local-runtime-only and keeps external_acceptance_claimed=false with external_acceptance_status=open; support-export seal advances to schema 11.
- Local contract: Stream Runtime Release Gate Trend v178: 10/10 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v177 — Runtime Release Gate History

- Persists a bounded server-derived history of the last eight local runtime release-gate results inside the existing stream_health JSON.
- Each entry receives a stable opaque cfsrg_ gate ID; duplicate export IDs replace the matching entry instead of growing the history.
- Launcher heartbeats preserve the server-owned gate history; support-export seal advances to schema 10 and binds the history.
- Local contract: Stream Runtime Release Gate History v177: 9/9 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v176 — Local Runtime Release Gate

- Adds a compact server-derived local runtime release gate with ready, open or blocked states over diagnostic integrity, runtime acceptance and acceptance trend.
- Invalid diagnostic integrity or failed runtime acceptance blocks the local gate; open acceptance or a regression keeps it open instead of reporting ready.
- The gate is explicitly scoped to local_runtime_release_gate_only and always reports external_acceptance_claimed=false with external_acceptance_status=open; the export seal advances to schema 9 and binds the gate.
- Local contract: Stream Runtime Release Gate v176: 12/12 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v173 — Runtime Acceptance Matrix

- Adds a compact server-derived runtime acceptance matrix over diagnostic-chain integrity, privacy guard, live evidence, runtime health, incident state, audit continuity, replay state and diagnostic trend.
- The matrix is explicitly scoped to local runtime evidence only and sets external_acceptance_claimed=false; it does not convert missing Windows/LIVE/Production evidence into a pass.
- Advances the support-export seal to schema 6 so the bounded diagnostic history, trend and runtime acceptance matrix are cryptographically bound and independently recomputed by export integrity.
- Local contract: Stream Production Runtime Acceptance v173: 12/12 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v172 — Production Diagnostic Trend

- Adds a server-derived trend over the bounded diagnostic-summary history with baseline, stable, improved, recovered or regressed states.
- Trend comparison uses the prior distinct export and detects both status severity changes and bounded failure-count movement.
- The export exposes only opaque references to the prior summary/export; no machine identity, raw media or secret material is added.
- Local contract: Stream Production Diagnostic Trend v172: 9/9 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v171 — Production Diagnostic Summary History

- Persists a bounded server-derived history of the last eight production diagnostic summaries inside the existing stream_health JSON.
- Each entry receives a stable opaque cfsds_ summary ID bound to export ID, summary status, bounded failure count, audit sequence and evidence/privacy flags.
- Duplicate export IDs replace the matching history entry instead of growing the history, and launcher heartbeats preserve the server-owned history without a schema migration.
- Local contract: Stream Production Diagnostic History v171: 9/9 PASS
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v170 — Production Diagnostic Summary

## v170 – Production Diagnostic Summary

- Adds a compact server-derived production diagnostic summary over the verified support-export contracts.
- The summary reports `ready`, `degraded`, `replay`, `integrity_error`, or `unavailable` plus bounded failure count, audit sequence, health verdict and incident state.
- Advances the support-export seal to schema 5 and binds the summary status into the diagnostic chain; export integrity recomputes the summary independently.
- Local contract: Stream Production Diagnostic Summary v170: 12/12 PASS

## v169 – Support Export Replay Classification

- Adds a server-derived replay classification for support exports: `new_export`, `repeat_snapshot`, or `exact_replay`.
- The classification exposes only bounded opaque prior audit references and is recomputed by export integrity.
- Advances the support-export seal to schema 4 and binds replay status into the diagnostic chain.
- Local contract: Stream Support Export Replay Classification v169: 9/9 PASS

## v168 – Support Export Audit Anchor Prefix

- Adds a cumulative server-derived `cfsap_…` prefix to retention anchors so audit rollovers keep a cryptographic summary of the truncated prefix instead of retaining only the last dropped event.
- Advances the support-export audit chain to schema 3 and binds the anchor prefix into the chain seal.
- Fail-closed integrity now detects missing mature prefixes and anchor-prefix mismatches after repeated retention rollovers.
- Local contract: Stream Support Export Audit Anchor Prefix v168: 9/9 PASS

- Adds a server-derived continuity verdict over retention anchor, retained audit window and authoritative audit head.
- Unanchored histories must start at sequence 1; anchored histories must begin exactly one sequence after the anchor and the anchor-to-head distance must equal the retained event count.
- Export seals and the diagnostic chain bind the continuity verdict, so gaps, orphan state or inconsistent retained windows fail closed.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v166 — Support Export Monotone Audit Head

- Adds a server-owned audit head containing the latest opaque audit-event ID, monotone sequence and timestamp.
- New export audit events fall back to the persisted head when the visible retention window is missing, preventing silent sequence reset to 1.
- Export integrity verifies head/event/sequence/time agreement and launcher heartbeats preserve the head inside the existing stream_health JSON.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v165 — Support Export Audit Retention Anchor

- Fixes the bounded audit-chain rollover after the ninth support export by preserving the dropped predecessor as a server-owned retention anchor.
- Upgrades the audit-chain seal to schema 2 so the retention anchor and the retained eight-event window are cryptographically bound together.
- Export integrity and launcher-heartbeat preservation now carry the retention anchor forward without a database schema change.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v164 — Final Support Export Audit Binding

- Upgrades the support-export seal to schema 3 so the current audit event, bounded audit history, audit-chain seal, integrity verdict and replay flag are cryptographically bound into the export artifact.
- Upgrades the diagnostic chain to schema 2 and binds the audit event/chain alongside snapshot, evidence, incident, recovery history and cross-layer correlation state.
- Export integrity independently recomputes the audit chain, verifies the latest audit event belongs to the export, then rebuilds the final export seal and diagnostic verdict after audit persistence.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v163 — Support Export Audit Chain Integrity

- Adds an opaque `cfsah_…` chain seal over the bounded support-export audit history.
- Server-side verification fails closed on duplicate/replayed export IDs, duplicate events, sequence gaps, broken previous-event links, time reversal, recomputed event-ID mismatch, or chain/count mismatch.
- Export responses expose only bounded audit metadata plus the audit-chain integrity verdict; secrets, raw media and machine name remain excluded.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v162 — Persisted Support Export Audit

- Persists a bounded server-owned support-export audit trail inside the existing `creator_live_bridges.stream_health` JSON; no schema migration is required.
- Each export receives an opaque `cfsxa_…` audit event with export/snapshot binding, monotone sequence and previous-event link; duplicate export IDs collapse to the existing audit event.
- Launcher heartbeats explicitly preserve the server-owned audit history so it cannot be erased by the next sanitized telemetry update.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v161 — Support Diagnostic Chain Integrity

- Adds server-derived opaque `cfsdi_…` diagnostic-chain seal spanning export seal, support snapshot seal, evidence snapshot, incident, recovery history chain, and cross-layer correlation fingerprint.
- Diagnostic integrity requires valid snapshot, temporal, correlation, evidence, incident, history, and history-chain checks; missing live evidence is explicit `unavailable`.
- The exported support artifact now carries both the diagnostic-chain seal and its bounded verification verdict.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v160 — Cross-layer Support Correlation Fingerprint

- Adds server-derived opaque `cfsec_…` fingerprint binding support snapshot seal, evidence snapshot/content fingerprint, incident identity/state, history chain, and correlation status.
- Support snapshot seal now binds the correlation fingerprint; export integrity independently recomputes its validity.
- No client-supplied fingerprint can become authoritative because the server derives it from the sanitized snapshot.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v159 — Support Export Temporal Integrity

- Adds schema-2 support-export identity derived from export time, support snapshot identity, and support snapshot seal.
- Export time must not predate the snapshot and may not exceed the bounded five-minute snapshot age window.
- Export integrity recomputes the export ID and temporal verdict; the schema-2 export seal binds that verdict.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v152 — Incident Evidence Integrity Verification

- Adds server-side verification for incident/recovery evidence links and chronology.
- Fails closed on missing/legacy incident evidence, invalid IDs, last-snapshot mismatch, impossible recovery links, invalid recovery chronology, or missing server-derived marker.
- Runtime and privacy-safe support snapshots expose only the bounded incident-integrity verdict; support seals bind both evidence-integrity and incident-integrity results.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v151 — Incident / Recovery Evidence Links

- Incident state advances to schema 2 and records `opened_snapshot_id`, `last_snapshot_id`, and `recovered_snapshot_id`.
- Open incidents preserve their original evidence link while every unhealthy observation advances the last-snapshot pointer.
- Recovery is explicitly bound to the evidence snapshot that closed the incident; clear state does not invent incident IDs.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v150 — Privacy-safe Stream Support Export

- Adds creator-authenticated JSON support export for the current Stream Studio diagnostic snapshot.
- Export receives opaque `cfsex_…` identity and embeds a server-side verification result for the existing `cfssi_…` support seal.
- Export remains fail-closed for secrets, raw media, and machine-name exposure.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v149 — Server-side Stream Health Evidence Integrity Verification

- Backend now recomputes the canonical `cfshf_…` fingerprint from persisted sanitized health data and verifies schema-2 evidence server-side.
- Integrity fails closed for missing evidence, legacy evidence, malformed IDs, self-loops, invalid sequence, fingerprint mismatch, missing server-derived marker or broken privacy guards.
- Runtime and privacy-safe support snapshots expose only the bounded integrity verdict/reasons; they do not expose secrets or raw media.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v148 — Stream Health Evidence Chain v2

- Stream-health evidence now separates immutable health content (`cfshf_…`) from per-observation snapshot identity (`cfshs_…`).
- Snapshot IDs bind sequence, previous snapshot, observation time and content fingerprint, preventing self-loop chains when identical telemetry repeats.
- Evidence advances to schema 2 while public sanitization still recognizes legacy schema 1 as legacy data.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v147 — Privacy-safe Support Snapshot Integrity Seal

- Creator support snapshots now receive a server-derived opaque `cfssi_…` SHA-256 seal over the privacy-safe snapshot payload.
- The seal binds snapshot identity, generation time, launcher state, health summary, evidence and privacy flags; client input cannot provide or override it.
- Offline snapshots are sealed too, so missing runtime state is explicit rather than unverifiable.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v146 — Privacy-safe Stream Support Snapshot

- Adds an authenticated creator support-snapshot endpoint for current Stream Studio runtime diagnostics.
- The snapshot is server-derived and exposes only bounded health metrics, provider/status data, sanitized failure codes, and sanitized evidence/incident state.
- Machine name, credentials, failure details, secrets and raw media are explicitly excluded; stale/offline telemetry cannot be represented as healthy.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v145 — Stream Incident / Recovery Correlation

- Server health evidence now correlates degraded/critical snapshots into stable opaque `cfshi_…` incidents.
- An open incident keeps its ID across subsequent unhealthy snapshots; the first healthy snapshot closes it as `recovered` and records a bounded recovery duration.
- Healthy state without a prior incident remains `clear`; no incident is invented.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

# v144 — Server-derived Stream Health Evidence

- Each accepted launcher stream-health heartbeat now receives a server-derived persistent evidence snapshot inside the existing `creator_live_bridges.stream_health` JSON.
- Evidence uses opaque `cfshs_…` snapshot IDs, links to the previous snapshot, advances a bounded sequence, and embeds the server-derived health verdict.
- Client-supplied evidence is ignored; secrets/raw-media exposure flags are forced false.
- No database migration is required: Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

## v143 – Server-derived Stream Health Verdict

- server independently derives `healthy / degraded / critical` from fresh sanitized stream telemetry
- engine availability/error, classified failures, watchdog restarts, reconnect activity, and dropped frames feed the verdict
- stale/offline telemetry cannot be represented as healthy
- Stream Studio badge uses the server verdict instead of trusting a client-supplied aggregate state
- Launcher remains **0.47.11**, Backend **3.12.0**, Schema Generation **68**; external acceptance remains OPEN

---

## v142 – Runtime Failure Health Transport

- server sanitizes/whitelists Launcher failure codes before persistence/exposure
- unknown failure codes are discarded fail-closed; privacy flags are forced false
- Stream Studio shows a dedicated runtime status only from fresh telemetry
- Launcher remains **0.47.11**, Backend **3.12.0**, Schema Generation **68**; external acceptance remains OPEN

---

## v141 – Runtime Failure Diagnostics / Launcher 0.47.11

**Launcher: 0.47.11**

- stable sanitized runtime failure codes cover stream engine, destinations, recording, application audio, game capture, and runtime evidence guard failures
- diagnostics export and bridge heartbeat now carry the bounded failure summary
- secrets and raw media remain explicitly excluded
- Backend remains **3.12.0**, Schema Generation remains **68**; external acceptance remains OPEN

---

## v140 – CUT Provenance Status UX

- CUT Studio now distinguishes verified, repaired, missing, and mismatched recording provenance instead of treating every syntactically valid `cfsrp_` ID as trusted.
- A stored mismatch is surfaced as `PROVENIENZ PRÜFUNG FEHLER`; missing seals are shown as incomplete, while valid seals are explicitly verified.
- No opaque provenance IDs or expected fingerprint values are displayed in the normal Creator UI.
- Backend remains **3.12.0**, Launcher remains **0.47.11**, Schema Generation remains **68**. External acceptance remains OPEN.

---

## v139 – Stream Context Equal-Timestamp Conflict Guard

**Launcher: 0.47.11**

- Stream game-context ordering now rejects same-timestamp observations when they conflict with the already accepted context.
- Conflicting observations cannot create artificial game transitions and are counted separately from older/stale observations.
- Conflict diagnostics survive restart without exposing process names, executable paths, or provider secrets.
- Active launcher version targets are synchronized to **0.47.11** because executable Launcher code changed.
- Backend remains **3.12.0**, Schema Generation remains **68**. External acceptance remains OPEN.

---

## v138 – Recording Provenance Verification

- Stored recording-backed CUT provenance is now verified against the canonical `cfsrp_` fingerprint instead of being treated as valid solely because an ID exists.
- Public CUT project responses expose only a bounded state: `valid`, `missing`, `mismatch`, or `none`; expected/internal fingerprint material is not exposed.
- Save/seal paths explicitly mark repaired mismatches before storage returns to a valid seal.
- Backend remains **3.12.0**, Launcher remains **0.47.9**, Schema Generation remains **68**. External acceptance remains OPEN.

---

## v137 – Recording Provenance Seal

- Recording-backed CUT projects receive a stable `cfsrp_` provenance fingerprint binding the source handoff, frozen game context, and bounded stream-session transition provenance.
- Creator and Launcher-bridge create/update paths recompute the seal after provenance preservation.
- CUT UI exposes a human-readable `PROVENIENZ VERSIEGELT` state without showing opaque IDs.
- Backend remains **3.12.0**, Launcher remains **0.47.9**, Schema Generation remains **68**. External acceptance remains OPEN.

---

## v136 – Immutable Recording Provenance in CUT

- Linked Recording CUT projects preserve `source_handoff_id`, frozen `recording_game_context`, and `recording_stream_session` across creator and Launcher-bridge saves.
- Normal editable CUT settings remain writable.
- Unlinked/manual CUT projects are unaffected.
- Backend remains **3.12.0**, Launcher remains **0.47.9**, Schema Generation remains **68**. External acceptance remains OPEN.

---

## v135 – Stream Game Context Ordering / Replay Guard

**Launcher: 0.47.9**

- Stream start preserves the source game-context `captured_at` timestamp instead of overwriting it.
- Older/out-of-order observations are ignored fail-closed and cannot create reverse game transitions.
- Stale-observation counters/opaque context IDs survive restart for diagnostics.
- Active launcher version targets are synchronized to **0.47.9**.
- Backend remains **3.12.0**, Schema Generation remains **68**. External acceptance remains OPEN.

---

## v134 – CUT Stream Provenance Integrity

- CUT stream-session provenance now deduplicates/validates opaque transition IDs and reconciles transition count fail-closed
- `transition_ids_complete` makes bounded provenance coverage explicit instead of implying a full list when more than 20 transitions existed
- CUT project meta distinguishes verified complete transition lists from intentionally truncated bounded history
- `derived_game_time:false` remains enforced
- Backend remains **3.12.0**, Launcher remains **0.47.8**, Schema Generation remains **68**
- external acceptance remains OPEN

## v133 – Creator Game Context Freshness Guard

- Stream Studio game context now carries explicit `freshness_seconds`, `freshness_state` and `observed_at` for active presence
- dashboard independently refuses to display stale active game context as live/ready
- stale active data is rendered as warning and does not imply current gameplay
- Backend remains **3.12.0**, Launcher remains **0.47.8**, Schema Generation remains **68**
- external acceptance remains OPEN

## v132 – Recording Stream Restart Integrity / Launcher 0.47.8

**Launcher: 0.47.8**

- persisted normalized stream-session provenance now survives Launcher restart/reload without losing `transition_ids` or `transition_count`
- normalized references remain bounded and `derived_game_time:false` is enforced
- active Launcher target advanced to **0.47.8** because executable Launcher code changed
- active release/system/recovery contracts synchronized; historical handoffs remain unchanged
- Backend remains **3.12.0**, Schema Generation remains **68**
- external acceptance remains OPEN

## v128 – Recording → CUT Idempotency

- CUT project creation now treats `source_handoff_id` as the stable idempotency key for Recording handoffs
- duplicate/retried materialization is resolved inside the existing per-creator resource lock
- an existing project is returned with HTTP 200 / `reused:true`; only a real new project consumes a project slot and returns 201
- deterministic `rec_` handoff IDs and persisted launcher link state remain the source of truth
- prevents duplicate CUT projects from retries, repeated clicks or restart recovery without weakening project ownership checks
- Backend remains **3.12.0**, Launcher remains **0.47.7**, Schema Generation remains **68**
- local validation: v128 **8/8 PASS**, v127 **13/13 PASS**, v126 **14/14 PASS**
- full historical current-contract regression remains non-authoritative in the uploaded repo because multiple referenced legacy test/runtime files are absent
- external acceptance remains OPEN

## v127 – Stream Session Game Context

- dedicated crash-safe Stream Game Context store with opaque `cfsss_` session IDs
- stream start freezes the initial unified game context separately from recording metadata
- game changes during a running stream are recorded as bounded `cfsgt_` transitions
- repeated observations do not create duplicate transitions
- launcher restart closes an unfinished stream-context session as `interrupted` instead of fabricating continuity
- `derived_game_time:false`: stream metadata is never converted into additional playtime
- Backend remains **3.12.0**, Launcher remains **0.47.7**, Schema Generation remains **68**
- local validation: v127 **13/13 PASS**, v126 **14/14 PASS**
- external acceptance remains OPEN

## v126 – Game Context Identity + CUT Preservation

- stable opaque `cfsgi_<sha>` game identity from normalized title + platform
- normalized title is carried through server → launcher recording handoff → CUT metadata
- recording handoff schema advances to 5 / `v126-game-context-identity`
- CUT editor now preserves immutable `recording_game_context` on normal project saves instead of silently replacing it with `none`
- CUT project meta visibly shows the captured game/platform
- support bundle exposes only sanitized `game_id` / normalized title, never local process/path data
- Backend remains **3.12.0**, Launcher remains **0.47.7**, Schema Generation remains **68**
- local validation: v126 **14/14 PASS**, v124 compatibility **18/18 PASS**, v123 compatibility **16/16 PASS**
- external acceptance remains OPEN

## v125 – Runtime Module Integrity Hotfix

- restored missing runtime modules `lib/cut-candidate-engine.js`, `lib/cut-reference-provider.js`, and `lib/game-profile-portability.js`
- closes Render startup chain beginning with `Cannot find module ./cut-candidate-engine` and prevents the two next missing-local-module crashes found by static runtime import scan
- Candidate Engine keeps own-clip semantic authority, bounded editorial reference influence, and Ground Truth keep/reject priority
- Backend remains **3.12.0**, Launcher remains **0.47.7**, Schema Generation remains **68**
- local validation: backend syntax PASS, runtime local-module graph **0 missing**, CUT Candidate Engine **13/13 PASS**, v124 Game Context Operations **18/18 PASS**
- external acceptance remains OPEN; no Windows/LIVE/Production PASS claimed

## v124 – Game Context Operational Finish / Launcher 0.47.7

- Recording-Spielkontext erhält eine deterministische, opaque `cfsgc_<sha>` Integritäts-ID; beliebige eingehende IDs werden nicht vertraut, sondern aus dem normalisierten Snapshot neu berechnet
- Recording-Handoff auf Schema 4 (`v124-recording-context-integrity`) angehoben; CUT übernimmt die validierte Context-ID zusammen mit Spiel, Plattform, Quelle und Capture-Zeitpunkt
- Creator-Dashboard besitzt jetzt einen eigenen **SPIELKONTEXT**-Betriebsstatus für aktive bzw. zuletzt bestätigte Games
- Launcher Support Bundle enthält neue sanitisierte `game-activity.json` und `recording-handoffs.json`; lokale Medienpfade und Rohmedien bleiben ausgeschlossen
- Operations-Grid reagiert per auto-fit auf den zusätzlichen Statusblock statt eine feste Kartenanzahl vorauszusetzen
- Launcher auf **0.47.7** angehoben und aktive Release-/System-/Game-Verträge synchronisiert
- externer Acceptance-Status bleibt **LOCAL_READY_EXTERNAL_OPEN**; keine Windows-/LIVE-/PlayStation-/Production-Pässe werden aus diesem lokalen Block abgeleitet

## v123 – Recording → CUT Unified Game Context / Launcher 0.47.6

- einheitlicher Game Context läuft jetzt durch **Stream Studio → Recording Handoff → CUT Studio**
- Launcher friert den Spielkontext beim Finalisieren der Aufnahme ein; ein später aktives anderes Spiel kann den Recording-Kontext nicht überschreiben
- Recording-Handoff-Schema auf v3 erweitert und Game Context crash-sicher über Launcher-Neustarts persistiert
- CUT `recording_game_context` unterstützt Spielname, Plattform, Quelle, Zeitstempel, opaque Presence-ID und Restart-Resume-Marker
- alte Interactive-Game-Felder bleiben kompatibel erhalten
- keine Prozessnamen, Fenstertitel, EXE-Pfade oder zusätzliche lokale Pfade werden in den Spielkontext übernommen
- Launcher auf **0.47.6** angehoben und aktive Release-/System-/Game-Verträge synchronisiert
- Validation: v123 **16/16 PASS**, Recording→CUT **62/62**, CUT Completion **27/27**, v122 **16/16 + 8/8**, v121 **14/14 + 8/8**, Release Readiness **20/20**, Gaming Home **16/16**, Current Contract Regression **51/51 PASS**
- externer Status bleibt **LOCAL_READY_EXTERNAL_OPEN**

## v122 – Game Presence Transition Integrity + Unified Stream Context / Launcher 0.47.5

- stabile `cfsgp_<sha>` Presence-Transition-ID eingeführt; Heartbeats behalten dieselbe ID, echte Start/Stop/Wechsel-Zustände erhalten eine neue ID
- Transition-Zeitpunkte werden lokal strikt monoton gehalten, damit gleichzeitige Zustandswechsel nicht uneindeutig werden
- Backend verwirft ältere und konfliktierende Presence-Transitions fail-closed und führt einen auf 20 Einträge begrenzten sanitisierten Presence-Audit-Verlauf
- öffentliche API veröffentlicht nur eine opaque `presence_id`, niemals den internen Audit-Verlauf
- Stream Studio erhält einen einheitlichen `game_context` mit `active`, `recent` oder `none`, damit künftige Recording-/CUT-Metadaten denselben Spielkontext verwenden können
- Stream Studio zeigt bei fehlender aktiver Session kontrolliert den letzten bestätigten Kontext als `ZULETZT`, ohne ihn als LIVE auszugeben
- Launcher auf **0.47.5** angehoben und aktive Release-/System-/Game-Verträge synchronisiert
- externer Status bleibt **LOCAL_READY_EXTERNAL_OPEN**; keine PSN-/Windows-/LIVE-/Production-Abnahme wird lokal behauptet
- Validation: v122 **16/16 Contract + 8/8 Runtime PASS**, v121 compatibility **14/14 + 8/8**, Release Readiness **20/20**, Gaming Home **16/16**, Current Contract Regression **50/50 PASS**

## v121 – Game Activity Restart Recovery + Stream Studio Context / Launcher 0.47.4

- unterbrochene Game-Session wird beim Neustart nur bis zum letzten bestätigten Heartbeat abgeschlossen; Launcher-Offtime wird nicht als Spielzeit gezählt
- sanitisiertes `recovery_candidate` erlaubt automatisches Wiederaufnehmen desselben Game-/Plattform-Ziels als frische Session
- `resumed_after_restart` wird über Launcher → Backend → Stream Studio transportiert, ohne Prozess-/Fenster-/Pfaddaten zu veröffentlichen
- Stream Studio hat jetzt einen separaten Status **AKTIVES SPIEL** mit Game, Plattform, Laufzeit und Recovery-Hinweis; Interactive Games bleiben davon getrennt
- Stream-Studio Runtime aktualisiert den Game-Activity-Kontext im bestehenden 5-Sekunden-Telemetriezyklus
- Launcher auf **0.47.4** angehoben und aktive Release-/System-/Game-Verträge synchronisiert
- Validation: v121 **14/14 Contract + 8/8 Runtime PASS**, v120 **16/16 + 5/5**, Release Readiness **20/20**, Gaming Home **16/16**, Current Contract Regression **49/49 PASS**
- historischer `stream46:check` verweist weiterhin auf eine nicht vorhandene alte Testdatei; aktuelle Stream-Abdeckung ist in der 49/49 Current Contract Regression grün
- externer Status bleibt **LOCAL_READY_EXTERNAL_OPEN**

## v120 – Game Activity Transition Ordering / Launcher 0.47.4

- Game-Activity-Presence erhält jetzt einen persistierten `presence_changed_at`-Zeitpunkt für echte Zustandswechsel (Start, Spielwechsel, Stop, Crash-Recovery).
- Heartbeats aktualisieren nur `last_seen_at`; sie erzeugen keinen neuen Presence-Zustandswechsel.
- Launcher sendet `state_changed_at` bei aktiver und inaktiver Presence.
- Backend hält `presence_transition_at` als Tombstone und verwirft ältere verspätete Presence-Updates fail-closed, damit ein altes `active` nach einem neueren `stop` nicht wieder sichtbar werden kann.
- öffentliche Active-Game-Daten enthalten nur serverseitig abgeleitete Laufzeit/Freshness; keine Prozesse, Fenstertitel, Pfade oder Credentials.
- Homepage aktualisiert Community-/Game-Status alle 60 Sekunden sowie beim Zurückkehren in den Tab und zeigt laufende Session-Dauer getrennt von abgeschlossener Spielzeit.
- Launcher-UI zeigt zusätzlich, wie frisch die lokale Presence zuletzt bestätigt wurde.
- Launcher auf **0.47.4** angehoben; aktive Release-/System-Check-Verträge synchronisiert.
- Validation: v120 contract **16/16 PASS**, runtime **5/5 PASS**, v116–v119 kompatibel, Release Readiness **20/20 PASS**, Gaming Home **16/16 PASS**, Current Contract Regression **48/48 PASS**.
- externer Status bleibt `LOCAL_READY_EXTERNAL_OPEN`; keine PSN-/Windows-/LIVE-/Production-Abnahme wird lokal behauptet.

## v119 – Game Activity Presence / Launcher 0.47.2

- aktive Game-Präsenz ist jetzt technisch von abgeschlossener Spielzeit getrennt; laufende Minuten werden nicht vorzeitig als fertige Spielstunden verbucht
- Launcher veröffentlicht nur sanitisierten Präsenzzustand: Spielname, Plattform, Quelle, Session-Start und Report-Zeit – keine Prozess-/Pfad-/Credential-Daten
- manuelles Tracking ist fail-closed ohne gültigen Spielnamen und Plattform; Stream-Capture bleibt auf PC normalisiert
- Präsenz-TTL 150 Sekunden, Refresh alle 60 Sekunden, Re-Publish nach Bridge-Reconnect sowie sauberer inactive-State beim Shutdown
- Homepage kann `GERADE AKTIV` zeigen und kennzeichnet unfertige Sessions ausdrücklich als noch nicht in Spielzeit eingerechnet
- Launcher auf **0.47.2** angehoben; aktive Release-/System-Check-Verträge synchronisiert
- Validation: v119 **14/14 PASS**, Tracker v116 **11/11**, Resilience v118 **8/8**, Release Readiness **20/20**, Current Contract Regression **47/47 PASS**
- externer Status bleibt `LOCAL_READY_EXTERNAL_OPEN`; keine PSN-/Windows-/LIVE-/Production-Abnahme wird lokal behauptet

## v118 – Game Activity Resilience / Launcher 0.47.2

- Game-Activity-Tracking zählt nach Standby, Scheduler-Stall oder langer Heartbeat-Lücke keine unbestätigte Offline-Zeit als Spielzeit.
- stale Sessions werden bis zum letzten bestätigten `last_seen_at` segmentiert; danach beginnt ein neuer bestätigter Abschnitt.
- fehlgeschlagene Telemetrie-Synchronisation verwendet begrenzten exponentiellen Backoff mit sichtbarem Retry-Zustand.
- manueller Sync und Bridge-Reconnect dürfen den Backoff bewusst umgehen und sofort erneut senden.
- Launcher-UI zeigt `SYNC WARTET` und den nächsten Retry-Zeitpunkt.
- Launcher-Version auf **0.47.2** angehoben und aktive Versions-/Release-Verträge synchronisiert.
- Validation: v118 runtime **8/8 PASS**, contract **10/10 PASS**, v116 **14/14**, v117 **14/14**, Release Readiness **20/20**, Current Contract Regression **46/46 PASS**.
- externer Acceptance-Status bleibt **LOCAL_READY_EXTERNAL_OPEN**; keine PSN-/Windows-/LIVE-/Production-Pässe werden lokal behauptet.

## v117 – Game Activity Workflow Completion

- Launcher Game Activity besitzt jetzt getrennte Aktionen für **Spiel starten/wechseln**, **Session stoppen** und **manuell synchronisieren**.
- laufende Session zeigt Spielname, Plattform und kontinuierlich berechnete Laufzeit; Tracker-Puffer/Deduplizierung/Crash-Recovery aus v116 bleiben unverändert aktiv.
- die drei Homepage-Karten „Zuletzt gespielt“ zeigen bei echten Daten jetzt zusätzlich **Plattform** (z. B. PS5) und **Quelle** (`CFS LAUNCHER` / `CFS CAPTURE`).
- PlayStation bleibt derzeit ein manueller Opt-in-Kontext; es wird weiterhin keine PSN-API oder externe PlayStation-Spielzeit behauptet.
- Validation: Game Activity Workflow **14/14 PASS**, Tracker **11/11 PASS**, Launcher Static **PASS**, Gaming Home **16/16 PASS**, Current Contract Regression **45/45 PASS**.
- ab v117 werden nur noch Delta-/Update-Pakete mit geänderten und neuen Dateien ausgeliefert; unveränderte Projektdateien werden nicht erneut gepackt.

## v116 – Game Activity Telemetry Foundation

- Launcher auf **0.47.2** angehoben und aktive Release-/System-Check-Ziele synchronisiert
- echter opt-in Datenpfad für Spielaktivität: Launcher → lokaler Recovery-Puffer → Bridge → Backend → öffentliche Recent-Games-Aggregation
- neue Quellen: `launcher_manual` für Konsolen/PS5-Setup und `stream_capture` für PC-Capture; noch **keine behauptete PSN-API**
- Plattform-Metadaten werden sanitisiert; `stream_capture` ist zwingend PC
- GameActivityTracker checkpointet lange Sessions alle 15 Minuten, puffert offline, verwendet stabile `cfsga_<sha>` IDs und zählt nach Crash nur bis zum letzten lokalen Heartbeat
- Launcher UI besitzt opt-in Aktivierung, Spieltitel, Plattform, Quelle, manuellen Sync und Privacy-Clear
- Backend Recent-/Most-Played-Aggregation bewahrt Quelle/Plattform und bleibt öffentlich als `cfs_launcher_opt_in` gekennzeichnet
- Validation: Game Activity Telemetry **14/14 PASS**, Tracker **11/11 PASS**, Release Readiness **20/20 PASS**, Current Contract Regression **44/44 PASS**
- externer Acceptance-Status bleibt **LOCAL_READY_EXTERNAL_OPEN**; keine PSN-/Windows-/LIVE-/Production-Pässe werden behauptet

## v115 – Stream-end Blue/White Brand Upgrade

- öffentliche Website-Farbwelt weiter auf die vom Nutzer freigegebene Stream-Ende-Referenz verdichtet: Deep Navy/Black + Ice White + CFS Blue/Cyan
- Homepage trägt jetzt die v115-Refinement-Markierung `v115-stream-end-bluewhite`; Hero, Buttons, Karten und Headlines besitzen stärkere Weiß→Cyan→Blau-Kontraste
- Creator-Suite-Marketingseite wurde auf dieselbe Markenlogik gezogen und wirkt dadurch weniger neutral und konsistenter zum CFS-Logo
- zusätzlicher Ring-/Light-Mood im Creator-Suite-Hero übernimmt die visuelle Richtung der Stream-Ende-Grafik, ohne die Seitenstruktur zu verändern
- LIVE-Karte behält das Originalprojekt-Logo; dynamische „Zuletzt gespielt“-Slots und ehrliche Daten-Fallbacks bleiben unverändert
- Validation: Logo Palette v115 **10/10 PASS**, Gaming Home compatibility **16/16**, Website Acceptance **34/34**, Accessibility **22/22**, Visual Polish **19/19**, Website Creator Finish **20/20**, Current Contract Regression **43/43 PASS**
- externer Acceptance-Status bleibt **LOCAL_READY_EXTERNAL_OPEN**; keine Windows-/LIVE-/PlayStation-/Production-Pässe werden aus dem Design-Umbau abgeleitet

## v114 – Logo-led Blue/White Brand Refinement

- öffentliche Homepage-Farbwelt konsequent aus dem vorhandenen CFS-Logo abgeleitet: Deep Navy/Black + White + CFS Blue/Cyan
- dekorative Warm/Violet/Green-Spielkarten-Themes werden auf die gemeinsame CFS-Blauwelt normalisiert; Statusfarben bleiben funktional reserviert
- Community-, Games-, Creator-Suite-, Account- und Trust-Flächen besitzen jetzt stärkere Weiß-/Blau-Kontraste, kontrollierte Glows und eine einheitliche Marken-Signatur
- Original-CFS-Logo bleibt im LIVE-Bereich; keine neuen Fantasie-Brand-Assets wurden für diese Farbveredelung eingeführt
- Struktur, dynamische drei „Zuletzt gespielt“-Slots und ehrliche Daten-Fallbacks bleiben unverändert
- Validation: Logo Palette v114 **10/10 PASS**, Gaming Home compatibility **16/16**, Website Acceptance **34/34**, Accessibility **22/22**, Visual Polish **19/19**, Current Contract Regression **43/43 PASS**
- externer Acceptance-Status bleibt **LOCAL_READY_EXTERNAL_OPEN**; keine Windows-/LIVE-/PlayStation-/Production-Pässe werden aus dem Design-Umbau abgeleitet

## v112 – CFS Gaming Home / Dynamic Recent Games

- öffentliche Startseite auf die neue CFS-Gaming-Markenrichtung umgestellt: Dark Navy/Black, Electric Cyan/Blue, klare Neon-Kanten, große Gaming-Headlines und bildstarker Hero
- vorhandene Website-/Creator-Routen bleiben erhalten; Trust-, Security-, Account- und Release-Verträge wurden nicht entfernt
- Stream-/Community-/Creator-Suite-Bereiche wurden in die neue Designsprache überführt, ohne Demo-Termine oder erfundene Community-Zahlen einzubauen
- drei dynamische Slots **ZULETZT GESPIELT** lesen echte CFS-Launcher-Spielaktivität aus `/api/public/community-stats`; leere Slots zeigen ausdrücklich keine Demodaten
- Backend liefert zusätzlich zu bestehendem Most-Played-Ranking jetzt eine nach `last_played_at` sortierte `recent`-Liste (max. 3); Spielzeit bleibt als rollierendes CFS-Fenster gekennzeichnet
- PlayStation-Spielzeit wird noch nicht behauptet; die UI nennt PS-Daten erst dann als Quelle, wenn eine belastbare Anbindung vorhanden ist
- neue visuelle Hero-Art stammt aus dem im Projekt erzeugten CFS-Gaming-Entwurf und ist lokal unter `public/assets/img/cfs-gaming-hero-v112.png` eingebettet
- Validation: Gaming Home v112 **15/15 PASS**, Website Acceptance **34/34**, Accessibility **22/22**, Visual Polish **19/19**, Current Contract Regression **42/42 PASS**
- externer Acceptance-Status bleibt unverändert: **LOCAL_READY_EXTERNAL_OPEN**; keine Windows-/LIVE-/Production-Pässe werden aus dem Design-Umbau abgeleitet

## v111 – Final Acceptance Preparation

- R64 LIVE/OBS-Soak ist jetzt fail-closed an die vorherige R63-Windows-Evidence und deren exakten Windows-Artefakt-SHA gebunden.
- R67 akzeptiert R64 nur, wenn R63-Evidence-Hash und Windows-Artefakt mit dem Soak übereinstimmen.
- Neuer portabler Final-Evidence-Index v109 zeigt R59–R67, CUT Windows und CUT Provider als `PASS / OPEN / BLOCKED`, ohne Rohmedien oder Secrets einzubetten.
- Neuer Windows/LIVE Operator Kit v110 führt die echte Zielsystem-Abnahme in der richtigen Reihenfolge zusammen.
- Final Readiness v111 trennt lokalen Abschluss strikt von externer Evidence; aktueller Status: **LOCAL_READY_EXTERNAL_OPEN**.
- Validation: v108 **10/10 PASS**, v109 **11/11 PASS**, v110 **11/11 PASS**, v111 **7/7 PASS**, R64 Security **8/8**, R67 Security **7/7**, Current Contract **41/41 PASS**.
- Externer Evidence-Index aktuell: **0 PASS / 11 OPEN / 0 BLOCKED**; Strict Gate verweigert den Abschluss erwartungsgemäß mit Exit 3.
- Status: **CODE_COMPLETE / LOCAL_CONTRACTS_PASS / FINAL_ACCEPTANCE_PREPARED / EXTERNAL_ACCEPTANCE_OPEN**.

## v107 – Technical LIVE Readiness Finish

- Website, Launcher und LIVE-Provider verwenden jetzt einen gemeinsamen fail-closed `LIVE READY`-Vertrag.
- Launcher-Heartbeat veröffentlicht sanitisierten Provider-Key, Provider-Status und Readiness; keine Tokens, lokalen Pfade oder Provider-Secrets werden übertragen.
- LIVE READY prüft Creator-Entitlement, frischen Launcher-Heartbeat, Launcher-Release-Policy, Provider-Control/Health-Vertrag, echten Provider statt Simulator und tatsächliche Provider-Verbindung.
- Stream Studio zeigt LIVE READY sichtbar an und nimmt den serverseitigen Gate-Status in den Stream-Check auf.
- TikFinity kann aus Stream Studio per deduplizierter Action Queue verbunden, neu verbunden oder getrennt werden; erlaubt ist ausschließlich der lokale TikFinity-Provider.
- Launcher führt `live_provider_command` privilegiert im Main Process aus und ACK/NACKt fail-closed; Renderer erhält keinen freien Provider-Befehl.
- Validation: `live107:check` **26/26 PASS**, TikFinity Operations **15/15**, Managed Provider **6/6**, Current Contract **37/37 PASS**.
- Status: **CODE_COMPLETE / LOCAL_CONTRACTS_PASS / LIVE_READY_GATE_COMPLETE / EXTERNAL_ACCEPTANCE_OPEN**.

## v103 – TikFinity Operations / Provider Recovery

- Managed TikFinity aktiviert Auto-Connect + Reconnect am lokalen Loopback-WebSocket.
- Launcher-Bridge veröffentlicht sanitisierten TikFinity-Status, Health und letzten Event-Zeitpunkt.
- Stream Studio zeigt den TikFinity-Providerzustand direkt beim lokalen Interactive-Game-Status.
- Launcher zeigt Reconnect-Zustand und letztes TikFinity-Event sichtbar an.
- Keine Provider-Secrets oder Service-Tokens verlassen den Launcher.
- Validation: `tikfinity103:check` 15/15 PASS, Managed Provider 6/6 PASS, Current Contract 36/36 PASS.

# cfs_zockt – aktueller Gesamtstand

**Stand: 27.09.2026**  
**Backend: 3.12.0**  
**Launcher: 0.47.7**


## Statusupdate 26.09.2026 – v99 TikFinity + Unified Game Core

- **Chat Battle, Community Quiz und Gift Rush** vom alten Cloud-Spielpfad auf den gemeinsamen lokalen Launcher-Game-Core migriert; **NEXUS bleibt Control-Plane/Sonderfall**
- TikFinity als optionaler **lokaler Launcher-LIVE-Provider** ergänzt: TikTok LIVE → TikFinity Desktop → Loopback WebSocket → CFS Launcher → normalisierter CFS Eventbus → Website/Games
- TikFinity-Endpunkt ist auf `ws://` + Loopback (`127.0.0.1` / `localhost` / `::1`) begrenzt; keine Web-Credentials oder Provider-Secrets im Browser
- Managed Game Service akzeptiert TikFinity Connect/Disconnect nur mit dem internen Launcher-Service-Token
- Launcher wartet beim TikFinity-Provider auf eine echte lokale WebSocket-Verbindung und schlägt fail-closed fehl, wenn TikFinity Desktop nicht erreichbar ist
- Launcher-Version auf **0.46.0** gezogen; Website, Release-Readiness, Recovery-Policy und aktive Versionsverträge synchronisiert
- `games99:check` → **29/29 Contract PASS + 6/6 Managed End-to-End PASS**
- Managed Game Service → **9/9 PASS**
- Current Contract Regression → **35/35 PASS**
- eingebettete Terminal-Altsuite: TikFinity-/Normalizer-Tests PASS; 6 Standalone-NEXUS-Tests bleiben wegen absichtlich nicht eingebetteter alter Startdateien außerhalb des Managed-Pakets nicht anwendbar
- Status: **CODE_COMPLETE / LOCAL_CONTRACTS_PASS / TIKFINITY_LOCAL_PATH_VERIFIED / EXTERNAL_ACCEPTANCE_OPEN**




## Statusupdate 26.09.2026 – v95 Interactive Games Expansion

- sechs weitere eigene lokale CFS-Game-Module: **Goal Rush, Flap Duel, Stack Forge, Role Raid, Country Clash, Chat Obstacle Run**
- vorhandene dynamische `local:<module-id>`-Plattform wird unverändert genutzt; kein Backend-Hardcoding pro neuem Spiel nötig
- alle Module nutzen ausschließlich normalisierte CFS-LIVE-Events und den zentralen `InteractiveGameClient`
- keine fremden TikTok-Spielcodes/Assets übernommen; nur allgemeine LIVE-Mechanikklassen als eigene CFS-Spiele umgesetzt
- Launcher-Katalog erwartet jetzt mindestens 15 lokale Module
- `games95:check` → **45/45 PASS**
- Managed Game Service → **8/8 PASS**
- Current Contract Regression → **34/34 PASS**
- lokaler/code-seitiger Stand bleibt: **CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN**

## Statusupdate 26.09.2026 – v89 Interactive Games LIVE Pattern Expansion

- fünf neue eigene CFS-LIVE-Game-Module ergänzt: **Sky Climb, Tower Clash, Horde Survival, Merge Reactor, Wire Defuse**
- Mechaniken orientieren sich an öffentlich etablierten TikTok-LIVE-Interaktionsklassen (Buffs, Gegner, Shields, Environment Changes, Team-/Race-/Puzzle-Prinzipien), ohne fremden Code oder Markenassets zu kopieren
- alle neuen Module verwenden ausschließlich den bestehenden normalisierten `InteractiveGameClient`-Eventstrom
- keine direkte TikFinity-/TikTok-Verbindung in den Modulen, keine externen Scripts, keine Provider-Secrets
- Launcher-Modulkatalog erkennt jetzt mindestens neun lokale Spielmodule automatisch
- `games89:check` → **33/33 PASS**
- Managed Game Service → **8/8 PASS**
- Current Contract Regression → **33/33 PASS**
- lokaler/code-seitiger Stand bleibt: **CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN**

## Statusupdate 26.09.2026 – v88 Release Readiness Finish

- aktive Launcher-Zielversion konsistent auf **0.46.0** gezogen: Website, Creator-Suite, Roadmap, `.env.example`, Render Blueprint und Application-Recovery-Policy
- System Check auf **v3 Creator Suite Readiness** erweitert: Backend 3.12.0, Schema 68, Launcher-Release-Policy sowie Games/Stream/CUT/NEXUS werden getrennt geprüft
- Dashboard wertet jetzt die reale Launcher-Release-Policy aus; verbunden allein bedeutet nicht mehr automatisch „bereit“
- Pflichtupdate, Version-Block oder LIVE-Block werden sichtbar als Warnzustand dargestellt; kompatible Versionen werden explizit bestätigt
- externe Acceptance bleibt getrennt und wird weiterhin nicht als lokal bestanden dargestellt
- `release88:check` → **20/20 PASS**
- Current Contract Regression → **32/32 PASS**
- lokaler/code-seitiger Stand: **CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN**




## Statusupdate 26.09.2026 – v57 CUT Acceptance & Evidence Hardening

- CUT Studio bleibt **FEATURE FROZEN / READY_FOR_WINDOWS_CUT_ACCEPTANCE**; v54–v57 öffnen keinen neuen Feature-Scope
- v54 bindet Windows-CUT-Acceptance an Git Remote, expliziten Branch, HEAD SHA, Artefakt-SHA, Launcher-/Backend-Version und Schema Generation 68
- v55 erzeugt minimierte, gehashte Windows-Evidence ohne Rohmedien und ohne vollständige lokale Recording-Pfade
- v56 inventarisiert die historische Regression reproduzierbar: aktuell **75 Blöcke, 51 ausführbar, 24 unavailable** wegen im gelieferten Paket fehlender Testdateien
- v57 ergänzt einen fail-closed Real-Provider-Acceptance-Runner für Reference Learning; API-Key wird nicht in Evidence geschrieben, Referenz-URL nur als SHA-256 gespeichert
- Test-Drift bereinigt: Trust **20/20**, Security3 **33/33**, Admin-Step-up **40/40 PASS**; bestehende sichere Cookie-/Elevation-v2-Implementierung wurde nicht abgeschwächt
- neue Checks: v54 **23/23**, v55 **9/9**, v56 **8/8**, v57 **10/10 PASS**; Launcher Static Check PASS
- `project:check` **51/75**; die verbleibenden 24 Blöcke entsprechen den im v56-Inventory als fehlend ausgewiesenen historischen Testdateien
- weiterhin kein echter `WINDOWS_CUT_PASS`, kein `REFERENCE_PROVIDER_PASS` und kein Production-/R59–R67-PASS aus dieser Umgebung

## Statusupdate 26.09.2026 – v53 CUT Windows Acceptance Gate

- CUT Studio bleibt **FEATURE FROZEN / READY_FOR_WINDOWS_CUT_ACCEPTANCE**; v53 öffnet keinen neuen Feature-Scope
- neuer fail-closed Windows-Acceptance-Runner bindet die CUT-Abnahme an den ausdrücklich erwarteten SHA-256 des Release-Artefakts sowie den installierten `app.asar`-Runtime-Fingerprint
- Acceptance akzeptiert nur das wirklich gebündelte `resources/ffmpeg/ffmpeg.exe`; PATH-/Environment-FFmpeg reicht nicht für `WINDOWS_CUT_PASS`
- Pflicht-Smoke: Own-Clip-Evidence + echter Reel-Export mit Caption, Keyframes, Transition, Normalisierung, Musik, Voiceover und Ducking
- zusätzlich mindestens zwei reale Recording-Varianten mit unterschiedlicher Container-/Codec-Signatur und echtem lokalen Export
- Evidence speichert reduzierte Metadaten/Hashes; Rohmedien werden nicht hochgeladen
- `cut53:check` **38/38 PASS**; v47–v52 bleiben PASS; `cut52:real-local` PASS; Backend-Syntax und Launcher Static Check PASS
- `project:check` **44/71**; die **35 FAIL-Einträge sind gegenüber v52 unverändert**
- echter v53-Runner wurde in der Linux-Sandbox aufgerufen und verweigert den PASS korrekt fail-closed; **kein `WINDOWS_CUT_PASS` behauptet**
- nächste reale Aktion: v53 Runner auf dem installierten, exakt freigegebenen Windows-Artefakt mit mindestens zwei echten Recording-Varianten ausführen

## Statusupdate 26.09.2026 – v52 CFS CUT Studio Completion

- CFS CUT Studio ist code-seitig **FEATURE FROZEN / READY_FOR_WINDOWS_CUT_ACCEPTANCE**
- End-to-End: Local Recording → Launcher Own-Clip Analyzer → Own Clip Evidence → Candidate Engine → optional Reference Influence → Keep/Reject Review → echter CUT-Clip
- interne `cut_analysis`-Jobs bleiben vollständig vom normalen Exportpfad getrennt
- veraltete Analyse-Jobs werden bei geändertem Game Profile fail-closed verworfen
- moderne FFmpeg-Stream-IDs werden bei der Audioerkennung berücksichtigt
- echter lokaler FFmpeg-Integrationstest mit synthetischem Video+Audio → **PASS**; Rohmaterial-Upload bleibt false
- `cut52:check` **27/27 PASS**; komplette vorhandene nicht-reale CUT-Testdatei-Suite **29/29 Dateien PASS**
- `project:check` **43/70**; die **35 FAIL-Einträge sind gegenüber v51 exakt unverändert**
- deshalb weiterhin **kein vollständiger Project-Regression-PASS**, kein Windows-/Provider-Live-/Production-PASS
- externe Restabnahme: echter Windows Launcher + Recording→CUT + reale Codec-/Dateivarianten + echte Reference-Provider-Ausführung

## Statusupdate 26.09.2026 – v51 CUT Local Analysis + Candidate Review

- lokaler Launcher-Analyzer erzeugt reduzierte `own_clip_evidence` aus der eigenen Aufnahme
- Foundation-Analyzer erzeugt bewusst nur generische `best`-Highlights und erfindet keine DBD-/Game-Ereignisse
- Candidate Review im Web-Editor mit Score, Evidence-Zeitfenster und begrenztem Reference-Boost
- Keep/Reject/Reset wird serverseitig als Ground Truth persistiert
- Candidate kann als echter CUT-Clip übernommen werden
- `cut51:check` **30/30 PASS**; v51 war noch kein Freeze, Completion-Härtung folgt in v52

## Statusupdate 26.09.2026 – v50 CUT Candidate Evidence Separation

- neuer provider-neutraler **CUT Candidate Engine** als eigene Core-Schicht; Kandidaten entstehen ausschließlich aus sanitisierten Ereignissen des eigenen Clips
- Candidate-Semantik, Kategorie und Evidence-Zeitfenster stammen ausschließlich aus `own_clip_evidence`; Fremdreferenzen dürfen diese Werte weder erzeugen noch ersetzen
- Reference Learning wird erst **nach** vorhandener eigener Clip-Evidence angewendet und ist auf einen kleinen redaktionellen Score-Boost von maximal `0.12` begrenzt
- bestehendes Ground Truth bleibt dominant: `reject` macht Kandidaten unzulässig, `keep` erhält Vorrang vor Reference-Gewichtung
- Creator API und Launcher Bridge besitzen getrennte Candidate-Preview-Endpunkte; übertragen werden reduzierte Evidence-/Decision-Daten, keine Rohvideos
- Launcher Bridge Client kann die Candidate Preview jetzt direkt aufrufen; lokale Analyse kann damit später an denselben sicheren Vertrag angeschlossen werden
- `cut50:check` **20/20 PASS**, `cut49:check` **27/27 PASS**, gesamte vorhandene nicht-reale CUT-Testdatei-Suite **27/27 Dateien PASS**
- Backend-Syntax **PASS**, Launcher Static Check **PASS**
- `project:check` endet bei **41/68**; gegenüber v48 **39/66** sind exakt die zwei neuen CUT-Checks hinzugekommen und beide PASS, während die bereits vorhandene FAIL-Liste unverändert bleibt
- daher weiterhin **kein vollständiger Project-Regression-PASS** und **noch kein CUT Feature Freeze**
- nächster CUT-Schritt: tatsächliche Own-Clip-Analyse an den Candidate-Vertrag anschließen, Candidate Review/Keep/Reject im Editor persistent machen und danach Completion-Abnahme durchführen

## Statusupdate 26.09.2026 – v49 CUT Recovery / Autosave Hardening

- CUT Studio besitzt jetzt sichtbare Save-Zustände: **GESPEICHERT / NICHT GESPEICHERT / SPEICHERT … / SPEICHERN FEHLGESCHLAGEN**
- Projekt- und Clip-Änderungen werden debounced automatisch gespeichert; manuelles Speichern sichert Projekt und Clip-Formulare in definierter Reihenfolge
- lokale Recovery-Snapshots schützen noch nicht erfolgreich gespeicherte Eingaben; Wiederherstellung wird nur angeboten, wenn Snapshot und Server auf derselben Projektbasis stehen
- stale Recovery-Snapshots werden nicht blind eingespielt und können bewusst verworfen werden
- Backend verwendet optionale `base_updated_at`-Guards für Projekt- und Clip-Updates; parallele veraltete Editorstände erhalten **409 Conflict** statt neuere Daten zu überschreiben
- Clip Create/Update/Delete/Order geben den aktualisierten Projekt-Zeitstempel zurück, damit derselbe Editor nicht durch eigene Clip-Änderungen einen falschen Konflikt erzeugt
- kein Schema-Sprung nötig; PostgreSQL Schema Generation bleibt **68**
- `cut49:check` **27/27 PASS**
- v49 wurde nicht als CUT-Abschluss gewertet; Candidate-/Ground-Truth-Trennung blieb anschließend offen und wurde in v50 umgesetzt

## Statusupdate 26.09.2026 – v48 CUT Reference Provider Integration

- sichere **serverseitige** Provider-Schicht ergänzt; Provider-Key bleibt ausschließlich im Backend-Environment
- CUT Studio kann gespeicherte `pending`-YouTube-Referenzen über die Creator-API analysieren lassen
- Browser/Renderer senden nur die bereits gespeicherte Referenz-URL; kein Provider-Secret und keine rohe Provider-Antwort gelangen in den Client
- feste HTTPS-Provider-Domain, Redirect-Block, Timeout und begrenzte Antwortgröße
- strukturierte JSON-Ausgabe mit Game-Profile-Schema; Ergebnis wird zusätzlich durch den bestehenden v47-Sanitizer normalisiert
- fremde Referenzvideos werden nicht in CFS heruntergeladen oder dauerhaft gespeichert
- Projekt wird nach der externen Analyse erneut gelesen; geändertes Game Profile oder entfernte Referenz verwirft das Ergebnis fail-closed
- Reference Learning bleibt ausschließlich Editing-Guidance; eigene Clip-Semantik/Ground Truth darf nicht aus Fremdreferenzen entstehen
- `cut48:check` **28/28 PASS**, `cut47:check` **36/36 PASS**, Backend-Syntax **PASS**, Launcher Static Check **PASS**
- kompletter `project:check` im gelieferten Gesamtpaket nicht vollständig reproduzierbar, da mehrere referenzierte historische Testdateien bereits im unveränderten ZIP fehlen; mehrere ältere statische Checks schlagen im Originalstand identisch fehl. Baseline **38/65**, v48 **39/66** mit zusätzlichem `cut48` PASS und identischer FAIL-Liste
- daher **kein neuer vollständiger Project-Regression-PASS**, **kein Provider-Live-PASS** und **noch kein CUT Feature Freeze**
- nächster CUT-Schritt: Recovery/Autosave/Projektzustand härten, Candidate Engine vs. eigene Evidence vs. Reference Influence abschließend prüfen, danach Completion/Freeze

## Statusupdate 26.09.2026 – v47 CUT Reference Learning Foundation

- CFS CUT Studio besitzt jetzt einen **spielunabhängigen Reference-Learning-Kern** statt DBD-Sonderlogik
- Profile: Generic, Dead by Daylight, FPS/Shooter, Battle Royale, Sports/Racing und Sandbox/Survival
- pro Projekt können bis zu acht direkte öffentliche YouTube-Referenzen gespeichert werden
- neue Referenzen bleiben `pending` und sind vollständig neutral, bis strukturierte Analysewerte vorliegen
- Referenzvideos dürfen nur Editing-Muster wie Hook, Pacing, ideale Short-Länge und Kontextfenster beeinflussen
- semantische Kategorien erhalten nur dann einen kleinen Boost, wenn das Ereignis bereits im **eigenen Clip** belegt wurde; Reference Learning kann niemals ein Event erfinden
- geschützte Launcher-Bridge kann provider-neutral sanitierte Analyseergebnisse einreichen; CUT selbst ist nicht an Gemini gekoppelt
- `cut47:check` **36/36 PASS**, Project Regression **65/65 PASS**, bestehende CUT Media-/Export-Testkette v29–v36 **PASS**
- keine reale Gemini-/YouTube-Analyse aus der Sandbox behauptet; Provider-Ausführung bleibt nächster CUT-Schritt

## Statusupdate 26.09.2026 – v46 Stream Studio Completion

- CFS Stream Studio ist code-seitig **FEATURE FROZEN / READY_FOR_WINDOWS_OBS_ACCEPTANCE**; große neue Stream-Funktionen nur auf ausdrücklichen Nutzerwunsch
- Preview/Program bleiben strikt getrennt; TAKE verwendet ausschließlich veröffentlichte Scenes mit gültiger Source-URL
- neuer sichtbarer Speicherstatus für Studio + Scene-Drafts: **GESPEICHERT / NICHT GESPEICHERT / SPEICHERT / FEHLER**
- Browser-Navigation warnt bei ungespeicherten Studio- oder Scene-Änderungen; `Strg/Cmd+S` speichert Draft und Studio-Konfiguration in sicherer Reihenfolge
- Output-, Audio-, Capture-, Recording-, Multistream-, Overlay- und Workspace-Änderungen markieren den Save-State korrekt
- bestehende Dual-Canvas-, Selective-Routing-, Multi-Track-, Multistream-, Multi-Chat-, Health-/Guard- und Recording→Cut-Verträge bleiben erhalten
- Stream-Keys, RTMP-Adressen, Roh-Audio/-Video und lokale Dateipfade bleiben außerhalb der Website; Live Guard bleibt Diagnose statt Autopilot
- `stream46:check` **39/39 PASS**, Stream Studio Full Suite **PASS through 21.10.34**, Project Regression **64/64 PASS**
- Product Acceptance quick **7/7**, RC25 **49/49**, Deploy **18/18**, Post-Deploy lokal **30/30**, Predeploy **30/30**
- Full-Product-Aggregator überschritt erneut das Sandbox-Ausführungslimit; deshalb kein neuer aggregierter 9/9-PASS aus v46
- kein neuer Windows-Hardware-/TikTok-LIVE-/OBS-/2h-Soak-/R62–R67-PASS; reale Stream-Abnahme bleibt extern offen
- nächster vereinbarter Produktblock: **CFS CUT Studio**

## Statusupdate 26.09.2026 – v45 Admin Control Center Completion

- Admin ist code-seitig **FEATURE FROZEN / READY_FOR_PRODUCTION_OPERATIONS_ACCEPTANCE**; neue große Admin-Funktionen nur auf ausdrücklichen Nutzerwunsch
- Admin bleibt auf Accounts/Beta, Support/Security, Production und Release fokussiert; direkte Widget-/Cut-Studio-Schnelllinks wurden aus dem Admin-Kontext entfernt
- Production zeigt Launch Gate, Monitoring, Mail-Outbox und Incident-Modus getrennt; fehlende/alte Evidence wird nicht als PASS dargestellt
- manuelle Evidence-Auswahl verwendet ausschließlich serverseitige `manual_kinds`; automatisierte R59–R67-Evidence bleibt den verifizierten Drills vorbehalten
- Security Lockdown benötigt zusätzlich zum bestehenden 10-Minuten-Admin-Step-up die exakte Bestätigung `SECURITY LOCKDOWN`
- Security Lockdown kann neben anderen Login-Sitzungen nun auch Launcher-Bridges und offene Device-Links gezielt widerrufen; aktuelle Admin-Session bleibt erhalten
- HMAC-verkettetes Admin-Audit, private Support/Security-Inbox und Incident Write-Freeze bleiben unverändert aktiv
- `admin45:check` **30/30 PASS**, Admin16 **40/40**, Admin17 **44/44**, Incident20 **41/41**, Project Regression **63/63 PASS**
- Product Acceptance quick **7/7**, Launcher Full QA **PASS**, Stream Studio Full Suite **PASS**, RC25 **49/49**, Deploy **18/18**, Post-Deploy lokal **30/30**, Predeploy **30/30**
- kombinierter Full-Product-Acceptance-Aggregator lief in der Sandbox beim verschachtelten Stream-Studio-Aufruf über das Ausführungslimit; deshalb kein neuer aggregierter 9/9-PASS aus v45
- kein neuer Production-Incident-/Monitoring-/R62–R67-LIVE-PASS; reale Operations-Abnahme bleibt extern offen
- nächster vereinbarter Produktblock nach Widget Studio, Launcher und Admin: **CFS Stream Studio**

## Statusupdate 26.09.2026 – v44 Launcher Completion

- Launcher ist code-seitig **FEATURE FROZEN / READY_FOR_WINDOWS_ACCEPTANCE**; große neue Launcher-Funktionen nur auf ausdrücklichen Nutzerwunsch
- Startseite besitzt eine kompakte Creator-Zentrale für Widget Studio, Stream Studio, Cut Studio und Dashboard; der bestehende Vier-Schritte-Status Creator-PC → TikTok LIVE → Widgets → OBS/Output bleibt erhalten
- Update-Version, Status und nächste Update-Aktion sind jetzt im einfachen Startbereich sichtbar; bestehende LIVE-Installationssperre und Event-Queue-Drain bleiben aktiv
- neue zentrale `creator-tool-policy`: Remote HTTPS-only, HTTP nur Loopback, keine URL-Credentials, feste Tool-/Seiten-Allowlist und Same-Origin-Preview-Pfade
- Renderer baut keine privilegierten Creator-URLs mehr; Tool-Starts laufen über `launcher:creator-tool-open` im Main Process
- alle Renderer-Popups bleiben `deny`; nur Main-Process-geprüfte Creator-Ziele werden extern geöffnet, geblockte URL-Logs enthalten keine Query-/Hash-/Credential-Daten
- Electron-Härtung bleibt `contextIsolation=true`, `nodeIntegration=false`, `sandbox=true`; Bridge/Device-Link/Output-/Recovery-Verträge bleiben unverändert
- `launcher44:check` **46/46 PASS**, Launcher Full QA **PASS**, Project Regression **62/62 PASS**
- Product Acceptance **9/9**, RC25 **49/49**, Deploy **18/18**, Post-Deploy lokal **30/30**, Predeploy **30/30**
- kein neuer Windows-Hardware-/TikTok-LIVE-/OBS-/R62–R67-PASS; reale Launcher-Abnahme bleibt R63 mit exakt freigegebenem v42-Windows-Artefakt
- nächster vereinbarter Produktblock: **Admin**


## Statusupdate 26.09.2026 – v43 Widget Studio Completion

- Widget Studio ist code-seitig **FEATURE FROZEN / READY_FOR_REAL_WORLD_ACCEPTANCE**; neue große Widget-Funktionen werden nur auf ausdrücklichen Nutzerwunsch wieder geöffnet
- vereinbarter Scope vollständig: Overlay-Projekte über Stream Board/Scenes, Ebenen, Snap/Safe Area, 16:9/9:16, Test Center, Version/Restore und sichere Output-URL-Rotation
- Widgets, Scene Studio und Stream Board können den Entwurf auf die letzte veröffentlichte Version zurücksetzen; Restore verändert LIVE nicht automatisch
- Scene Restore validiert abhängige veröffentlichte Widgets erneut und blockiert bei fehlenden Abhängigkeiten fail-closed
- Widget-, Scene- und Stream-Board-Output-URLs können bewusst rotiert werden; die alte Token-URL wird ungültig und die Rotation wird als Security Event protokolliert
- TikTok Profil, TikTok LIVE und Launcher Bridge werden sichtbar getrennt; eine Online-Bridge gilt ausdrücklich nicht als aktive LIVE-Session
- TikTok-LIVE-Test Center enthält Follow, Like, Gift, Share, Viewer und Chat; Provider Adapter **31/31 PASS**, Multi Chat **30/30 PASS**
- `widget43:check` **29/29**, UX **40/40**, Core Flow **22/22**, Scene Composer **115/115**, Scene Transitions **59/59**, Project Regression **61/61**
- Product Acceptance **9/9**, RC25 **49/49**, Deploy **18/18**, Post-Deploy lokal **30/30**, Predeploy **30/30**
- keine neue reale TikTok-LIVE-/OBS-/Browser-/Windows-/R62–R67-Evidence; diese Außenwelt-Abnahme bleibt später offen
- nächster vereinbarter Produktblock nach diesem Freeze: **Launcher**


## Statusupdate 25.09.2026 – v42 Acceptance Release Lock

- aktueller technischer Stand: **v42 Acceptance Release Lock + Windows Artifact Approval** auf v41/v40
- echte R59–R67-Abnahme ist jetzt an **einen explizit verifizierten Git-Commit/Branch/Remote** gebunden; Branch oder Remote werden nie geraten
- alle R59–R66-Nachweise tragen denselben `release_lock_sha256`; R67 verwirft Evidence aus einem anderen Release-Lock
- R59 prüft über `/api/health` einen SHA-256-Fingerprint des tatsächlich laufenden Render-Commits; der rohe Commit wird nicht öffentlich ausgegeben
- Windows-Abnahme bindet jetzt **das exakte signierte Artefakt** über CI-Build-Evidence + SHA-256 an den Release-Lock
- R63 startet nur mit dem freigegebenen Artefakt; R64 nur nach dem dazugehörigen R63 `LIVE_WINDOWS_PASS`; R67 prüft beide Bindungen erneut kryptografisch
- `acceptance42:check`: Release Lock **29/29 PASS** + Windows Artifact Approval **15/15 PASS**; R67 Security **10/10 PASS**
- Project Regression **60/60 PASS**, Product Acceptance **9/9**, RC25 **49/49**, Deploy **18/18**, Post-Deploy lokal **30/30**, Predeploy **30/30**
- in dieser Sandbox wurden bewusst **kein echter Release Lock und kein echtes Artifact Approval** erzeugt; beide Status bleiben ohne echtes Git-/Windows-Release `OPEN` und es wird kein neuer LIVE-PASS behauptet

## Statusupdate 25.09.2026 – v41 Acceptance Readiness

- aktueller technischer Stand: **v41 Acceptance Readiness** auf v40/v39 und der bestehenden v24 Creator-OS-Basis
- zwei reale Production-Config-Lücken geschlossen: `CFS_ACCOUNT_ELEVATION_SECRET` und `CFS_LAUNCHER_API_KEY` sind jetzt vollständig in Config Doctor und `.env.example` gespiegelt
- Predeploy prüft generisch alle serverseitigen `requireEnv(...)`-Pflichten gegen Doctor, Env-Beispiel und Render-Blueprint; aktuell **12/12 konsistent**
- neuer read-only Acceptance Runner: `npm run acceptance41:status`; fail-closed Production-Variante: `npm run acceptance41:strict`
- Runner prüft Git Branch/SHA/Remote, Production-Config, PostgreSQL-Clienttools, Windows-/Monitoring-/Stripe-Prerequisites und vorhandene R59–R67-Artefakte, ohne Provider-/DB-Schreibaktionen
- `acceptance41:check` **20/20 PASS**, Code Readiness **15/15 PASS**, Project Regression **59/59 PASS**, Product Acceptance full **9/9 PASS**, RC25 **49/49**, Deploy **18/18**, Post-Deploy lokal **30/30**, Predeploy **30/30**
- in dieser Sandbox bleiben Production Config, echtes Git-Ziel, PostgreSQL-Clienttools und LIVE-Evidence bewusst OPEN; kein neuer R59–R67 LIVE-PASS wird behauptet

## Statusupdate 25.09.2026 – maßgeblich vor historischen Pass-Notizen

- aktueller persönlicher Homepage-Kern: **v39 Personal Mission** auf v38/v37 und der bestehenden **v24 Creator OS** Basis
- CFS wird als persönlich verwurzelt erklärt, ohne private Namen öffentlich auszuschreiben
- Motivation klar verdichtet: verteilte Creator-Dienste und einzeln bezahlte Extras sollen so weit wie sinnvoll in einem Paket zusammengeführt werden
- Community-Ziel: Menschen zusammenbringen, die nicht immer jemanden zum Zocken oder Austauschen haben
- drei Leitwerte: **ALLES AN EINEM ORT · GEMEINSAM STATT ALLEIN · RESPEKT ZUERST**
- Startseite bleibt kompakt: **9 Sections · 691 Wörter · 8 Header-Links inklusive Logo/CTA**
- `npm run mission39:check` **15/15 PASS**, `npm run project:check` **57/57 PASS**, Product Acceptance quick **7/7 PASS**
- kein neuer UI-Layer; `cfs-os-v24` bleibt global; keine neue Production-/Browser-/Hardware-/LIVE-Evidence aus v39
- aktueller Homepage-Fokus: **v38 Homepage Focus + Personal Note** auf der bestehenden **v24 Creator OS / v36-v37** Basis
- Startseite bewusst auf wenige Kernaussagen reduziert; Header-Navigation auf die wichtigsten Einstiege beschränkt
- Hero, Mein Plan, Angebot, Einstieg und Trust wurden textlich gekürzt; technische Details bleiben auf Unterseiten oder in aufklappbarer Transparenz
- Community Live Stats aus v37 bleiben erhalten; Twitch wird auf der Startseite nicht beworben
- neuer persönlicher Abschluss erklärt in Ich-Form, warum cfs_zockt für Community, ehrlichen Status und Sicherheit aufgebaut wird
- `npm run focus38:check` ist **15/15 PASS**; Projektregression **57/57 PASS**; voller Product-Acceptance-Lauf **9/9 PASS**
- kein neuer UI-Layer: `cfs-os-v24` bleibt global; v38 ändert fachlich nur `public/index.html` und `public/assets/css/cfs-ui-v18.css`
- neuer Chromium-Screenshot-Lauf lieferte in der Sandbox keine belastbare Evidence; daher **kein neuer v38 Browser-PASS**
- aktueller Community-Homepage-Stand: **v37 Community Live Stats** auf der bestehenden **v24 Creator OS / v36 Editorial Simplification** Basis
- Startseite zeigt Discord-Mitglieder und TikTok-Follower als echte dynamische Kennzahlen mit direktem Link unter der Zahl
- Browser ruft nur `/api/public/community-stats` auf; TikTok-Tokens und Provider-Rohdaten bleiben serverseitig
- TikTok nutzt die vorhandene `user.info.stats`-Verbindung und den bestehenden Profil-Sync; Discord nutzt den vorhandenen Invite serverseitig
- Provider-Cache standardmäßig 15 Minuten; bei Ausfall kein Fake-0, sondern letzter bestätigter Stand oder `nicht verfügbar`
- `npm run community37:check` ist **22/22 PASS**; v36 Editorial bleibt **16/16**, Projektregression **57/57**, Product Acceptance **9/9**
- reale TikTok-/Discord-Werte wurden aus dieser Sandbox nicht als LIVE-PASS behauptet; externe Provider-Evidence folgt nach Deployment
- aktueller öffentlicher Editorial-/Homepage-Stand: **v36 Editorial Simplification** auf der bestehenden **v24 Creator OS** / v33-v35 UX-Basis
- Startseite bewusst von 17 auf **9 Sections**, 41 auf **10 Content-Artikel** und ca. 1388 auf **775 Wörter** reduziert
- neue Hauptlinie: **Was ist cfs_zockt? · Mein Plan · Was ich anbiete · Wie du startest · Community & Vertrauen**
- technische Detailtiefe wurde nicht gelöscht, sondern auf Creator Suite, Roadmap, Pläne, Security und Support zurückgeführt
- `npm run editorial36:check` ist **16/16 PASS**; Projektregression **57/57 PASS**; voller Product-Acceptance-Lauf **9/9 PASS**
- kein neuer UI-Layer: `cfs-os-v24` bleibt globale Aktivierung; v36 liegt in `public/index.html` und `public/assets/css/cfs-ui-v18.css`
- frischer Chromium-Screenshot konnte in der Sandbox nicht zuverlässig abgeschlossen werden; daher **kein neuer v36 Browser-PASS**
- aktueller Einstiegs-/Vertrauensstand: **v35 Welcome & Clarity** auf der bestehenden **v24 Creator OS** / **v34 Brand Coherence** Basis
- v35 macht vor Registrierung, Upgrade und Device-Link klar, was ein Schritt tatsächlich auslöst und was ausdrücklich **nicht** automatisch passiert
- gemeinsame Leitlinie: **Du bist willkommen · du entscheidest · nichts versteckt · Kontrolle bleibt nachvollziehbar**
- Homepage, Login, Dashboard, Plans, Support sowie Web-/Native-Launcher verwenden dafür denselben Welcome-/Clarity-Baustein
- Registrierung bleibt FREE und ohne automatische Zahlung; Integrationen werden nicht allein durch Registrierung verbunden; Anmeldung bzw. Device-Link starten keinen Stream automatisch
- `npm run welcome35:check` ist **15/15 PASS**; voller Product-Acceptance-Lauf **9/9 PASS**; `npm run project:check` **57/57 PASS**
- kein neuer UI-Layer: `cfs-os-v24` bleibt globale Aktivierung; die gemeinsame Komponente liegt in den bestehenden konsolidierten CSS-Dateien
- ein frischer v35-Headless-Chromium-Lauf terminierte in dieser Sandbox erneut nicht sauber; daher **kein neuer Browser-PASS**
- aktueller Marken-/UX-Refinementstand: **v34 Brand Coherence** auf der bestehenden Designbasis **v24 Creator OS Redesign**; v33 Visual Polish bleibt enthalten
- v34 ordnet die Produktidentität bewusst als **Community zuerst · ehrlicher Status · Sicherheit als Produktbestandteil**
- Homepage, Login, Dashboard, Creator Suite, Security, Support, Web-Launcher und nativer Launcher verwenden jetzt dieselbe CFS-Sprache und dieselben Vertrauensprinzipien
- kein neuer UI-Layer: globale Aktivierung bleibt `cfs-os-v24`; Logo, Wortmarke, Schrift, IDs/Form-Handler und Backend-Verträge bleiben unverändert
- `npm run brand34:check` ist **17/17 PASS**; `npm run project:check` ist nach den Änderungen **57/57 PASS**
- Product Acceptance bleibt **v32 `LOCAL_PRODUCT_ACCEPTANCE_PASS`** und wurde nach v34 erneut **9/9 PASS** ausgeführt
- frische v34-Browser-Evidence wird nicht behauptet: Headless Chromium terminierte in der Sandbox nicht sauber; die gespeicherte v33-Render-Evidence bleibt die letzte Browser-Evidence
- aktueller Designstand: **v24 Creator OS Redesign**, visuell verfeinert und lokal gerendert in **v33 Visual Polish**
- v33 ändert keinen UI-Layer und keine Design-Aktivierung; `cfs-os-v24` bleibt die globale Designbasis
- `npm run visual33:check` ist **15/15 PASS**
- lokaler Chromium-Layout-Smoke: **18/18 Viewport-Szenarien** (9 Kernseiten × 390/1440 px) ohne horizontales Overflow
- Mobile Creator-Navigation ist bereinigt: App-Dock ersetzt auf <=760 px die zusätzliche Sidebar; der CFS Guide öffnet dort beim ersten Dashboard-Besuch nicht mehr automatisch
- Security wurde als ruhigere Matrix nachgeschärft; Stream-Studio-Microcopy lesbarer gemacht; Widget-Studio-390px-Overflow behoben
- Website Acceptance **34/34 PASS**, Accessibility/Responsive **22/22 PASS**, Visual Polish **19/19 PASS**
- Product Acceptance bleibt **v32 `LOCAL_PRODUCT_ACCEPTANCE_PASS`**; voller Lauf nach den Runtime-Anpassungen **9/9 PASS**, Quick **7/7 PASS**
- `npm run project:check` bleibt aus v32 **57/57 PASS**; Security Continuity 45-58 bleibt **47/47 PASS**
- Finalization Readiness bleibt **v31 / READY_FOR_LIVE_FINALIZATION**; R62-R67-Harnesses bleiben lokal/statisch grün
- aktueller Release-Seal: **v25 `RC25_READY`**; aktuelle Deploy-Automation: **v27**
- aktueller Operations-/Production-Evidence-Runner: **v30** (`npm run evidence30:check`, externer Lauf über `npm run evidence30:run -- --branch <VERIFIED_TARGET_BRANCH> --expected-sha <CURRENT_COMMIT_SHA>`)
- Root- und Launcher-`package-lock.json` sind vorhanden; `npm run lockfiles:check` ist grün; ältere Abschnitte mit fehlenden Lockfiles sind historische Momentaufnahmen
- `npm run deployment:doctor` ist aktuell `GO`; echte Production-Environment-Werte wurden dabei nicht ausgewertet
- bis zur vollständigen Freigabe bleiben reale Außenwelt-Gates: verifizierter GitHub/Render/Production-Lauf, echte Geräte-/Browserabnahme sowie R62-R67
- der externe Edge-/DNS-/TLS-Nachweis bleibt aus der isolierten Prüfumgebung offen
- maßgeblicher aktueller Operationsstatus steht in `handoff/CURRENT-HANDOFF.md`

## Priorität

Aktuell haben **Website-Sicherheit, Transparenz und Überzeugungskraft** Vorrang vor zusätzlichen Feature-Blöcken. Bestehende Funktionen sollen stabilisiert und verständlich präsentiert werden, bevor neue große Baustellen geöffnet werden.

## Kumulativ abgeschlossen

1. Website Security Pass
   - CSP / Security Header
   - Host-/HTTPS-Härtung
   - CSRF / Origin / Fetch Metadata
   - Login-/Form-/Review-Missbrauchsschutz
   - sichere Sessions und konservatives HSTS-Vorgehen

2. SEO / Google Pass
   - Canonicals
   - robots.txt / sitemap.xml
   - eindeutige Meta-Daten
   - OpenGraph / Social Preview
   - strukturierte Daten
   - interne Tool-/Runtime-Seiten auf noindex

3. Monetarisierung / TikTok-Funnel
   - `/go/tiktok`, `/go/tiktok/tools`, `/go/tiktok/community`
   - Herkunft bleibt bis zur Registrierung erhalten
   - Affiliate-/Partner-Unterbau standardmäßig deaktiviert
   - keine Fake-Partner, Fake-Preise oder Tracking-Pixel

4. Review-Admin
   - Pending / Approved / Rejected
   - Suche, KPIs, interne Notizen
   - bestehende echte Review-Datenbank statt Demo-Daten

5. Widget Studio 30-Sekunden-UX
   - Goal / Counter / Timer / Chat / Kamera Schnellstarts
   - unnötigen doppelten Vorlagen-Schritt entfernt
   - Anfänger-/Profi-Trennung bleibt erhalten

6. Widget Core Flow
   - manuelle Widgets vom LIVE-Snapshot entkoppelt
   - LIVE-Timer hold-Verhalten korrigiert
   - Chat hold/zero konsistent
   - Publish-/Unpublished-Status korrigiert

7. Launcher Stabilisierung
   - atomare Settings + Backup
   - serialisiertes Action-Polling
   - kontrollierte Output-Crash-Recovery
   - LIVE-Schutz bei verbindungskritischen Einstellungen

8. Website Trust & Security
   - konkrete Schutzmaßnahmen auf der Startseite
   - Sicherheitsseite auf echten Code-Stand gebracht
   - keine 100-%-Sicherheitsversprechen

9. Private Support-/Security-Meldung
   - nicht-öffentliche Meldungen
   - Rate Limit, Honeypot, Deduplizierung, HMAC-Missbrauchsschutz
   - Admin-Inbox mit Priorität, Status und Notiz

10. Website Conviction / Product Proof
    - Startseiten-Text stärker auf realen Nutzen ausgerichtet
    - eigener Bereich „Heute im Produkt“
    - klare Trennung zwischen aktivem Funktionsstand und offenen Grenzen
    - keine erfundenen Nutzerzahlen, Bewertungen, Preise oder Reifeversprechen

11. Website Security & Conviction Pass 3
    - öffentlicher Systemstatus auf minimale Online-/Störungsinformation reduziert
    - operativer Health-Check von unnötigen Infrastrukturdetails bereinigt
    - RFC-9116 `/.well-known/security.txt` ergänzt
    - produktive Session auf `__Host-`-Cookie-Präfix gehärtet
    - TikTok-OAuth-State auf `__Secure-`-Cookie-Präfix gehärtet
    - Production startet ohne Token-, CSRF-, Review-HMAC-, Support-HMAC- oder MFA-Recovery-HMAC-Secret nicht mehr
    - Support-Secret-Erkennung server- und clientseitig erweitert
    - Support-Meldungen liefern eine kurze Referenz zurück


12. Account & Privacy Lifecycle
    - aktive Sessions einzeln verwaltbar
    - passwortgeschützter bereinigter JSON-Datenexport
    - TikTok Self-Service Disconnect
    - Account-Löschung inkl. best-effort Provider-Revoke

13. Account Credential Security
    - Passwortwechsel nach erneuter Prüfung des aktuellen Passworts
    - neue Passwörter mindestens 15 Zeichen, ohne künstliche Zeichenklassen-Pflicht
    - lokale Blockliste für besonders häufige/erwartbare Werte
    - versioniertes scrypt: neue Hashes mit stärkerer V2-Konfiguration
    - bestehende V1-Hashes werden nach erfolgreichem Login automatisch migriert
    - Passwortwechsel widerruft bestehende Sessions und rotiert die aktuelle Sitzung
    - Passwort-Reset per E-Mail bleibt transparent offen, solange kein vertrauenswürdiger Mailversand konfiguriert ist

14. Account E-Mail Verification & Recovery Unterbau
    - kryptografisch zufällige Einmal-Tokens; Datenbank speichert nur SHA-256-Hashes
    - E-Mail-Bestätigung 8 Stunden, Passwort-Recovery 30 Minuten
    - Token im URL-Fragment und nach Seitenstart aus der sichtbaren URL entfernt
    - Recovery widerruft alle bestehenden Login-Sitzungen
    - anti-enumeration Recovery-/Verification-Responses
    - provider-neutraler, HMAC-signierter HTTPS-Mail-Webhook; standardmäßig deaktiviert
    - optionale Pflicht-Verifizierung nur für neue Accounts und nur bei funktionsfähigem Mail-Relay

## Öffentliche Produktgrenzen

Weiterhin nicht als fertig behaupten:

- keine automatische OBS-Steuerung durch das Stream Board
- keine fertige Twitch-Anbindung
- Merch bleibt Planung/Konzept, kein Shop
- keine erfundenen Rezensionen oder Nutzerzahlen
- keine erfundenen Preise
- keine kopierten Game-IP-Assets
- automatisierte Acceptance-/Stress-/OBS-/Release-Simulationen sind bestanden; externe echte LIVE-/Hardware-/Production-Gates bleiben offen

## Aktuelle Teststrategie

Die kleine kumulative Regression bleibt aktiv. Zusätzlich wurden in Pass 11 die vorhandenen automatisierten V42-/Post-V42-/Acceptance-Part-2- und Launcher-Release-Gates vollständig ausgeführt. Diese internen Simulationen ersetzen **nicht** die noch offenen externen Production-/TLS-/Hardware-/echten LIVE-Prüfungen.


15. Account MFA / 2FA
    - optionaler TOTP-Schutz zusätzlich zum Passwort
    - 20-Byte TOTP-Secret, serverseitig mit AES-256-GCM verschlüsselt
    - 6-stellige Codes / 30-Sekunden-Zeitschritt mit ±1 Schritt Toleranz
    - bereits verwendete TOTP-Zeitschritte werden nicht erneut akzeptiert
    - Login erzeugt vor erfolgreichem MFA noch keine Creator-Session
    - kurzlebige HttpOnly-/SameSite=Strict-MFA-Challenge
    - 10 einmalige Recovery-Codes; nur HMAC-Hashes werden persistiert
    - MFA-Aktivierung/Deaktivierung und Code-Neuerzeugung erfordern Re-Authentifizierung
    - andere aktive Sessions werden bei Aktivierung/Deaktivierung beendet
    - TOTP wird transparent nicht als phishing-resistent bezeichnet
16. Account Passkeys / WebAuthn
    - optionale domain-/origin-gebundene WebAuthn-Anmeldung zusätzlich zu TOTP
    - User Verification bei Registrierung und Login erforderlich
    - private Schlüssel verlassen den Authenticator nicht; Server speichert Credential-ID, Public Key, Counter und minimale Metadaten
    - Challenges sind kurzlebig, purpose-gebunden, an Session/MFA-Challenge gebunden und werden pro Verify-Versuch atomar verbraucht
    - erfolgreicher Passkey-Login erzeugt erst nach WebAuthn-Verifikation eine Creator-Session
    - erster Passkey erzeugt Recovery-Codes, falls noch keine TOTP-/Recovery-Fallbacks vorhanden sind
    - Passkey hinzufügen/entfernen erfordert Re-Authentifizierung; andere Sessions werden dabei widerrufen
    - Security-Events für MFA-, Recovery-, Mail- und Passkey-Ereignisse sind serverseitig vollständig freigeschaltet
    - Backend-Runtime-Mindeststand Node.js 22+; Node 20 wird nicht mehr unterstützt


17. Website Public Resilience & Security Telemetry (Pass 15)
    - erzwungene CSP meldet Verstöße über `report-to` + `Reporting-Endpoints` und `report-uri`-Fallback
    - Reports werden datensparsam aggregiert: keine rohe IP, kein User-Agent, keine Query-Strings, tokenartige Pfadsegmente werden normalisiert
    - 30 Tage Retention und maximal 5.000 aggregierte Muster
    - Admin Control Center zeigt CSP-Muster und Häufigkeiten intern
    - jede Anfrage erhält eine serverseitig erzeugte `X-Request-ID`; API-404/500 liefern eine Referenz ohne Stacktrace
    - eigene noindex 404-/500-Seiten halten Besucher im cfs_zockt-Kontext und verweisen auf den privaten Support-Weg
    - kleine kumulative Regression 24/24 sowie V42, Post-V42 und Acceptance Part 2 grün

## Nächste sinnvolle Reihenfolge

1. Im echten Git-Repository Remote, Zielbranch und HEAD-SHA prüfen; keinen Branch raten.
2. `npm run evidence30:run -- --branch <VERIFIED_TARGET_BRANCH> --expected-sha <CURRENT_COMMIT_SHA>` aus einer netzwerkfähigen, autorisierten Umgebung ausführen.
3. Nur bei realem `PRODUCTION_EVIDENCE_PASS` GitHub Quality Gate, Production Deployment Gate, Canary, External Security und Creator-OS Postdeploy gemeinsam als nachgewiesen behandeln.
4. Danach reale Desktop-/Mobile-Abnahme des v24 Creator OS durchführen.
5. R62 mit Passkey-Step-up, TOTP-Login, TOTP-Step-up, genau einem Recovery-Code-Step-up und Entfernen des temporären Passkeys abschließen; nur `LIVE_AUTH_PASS` zählt.
6. Anschließend R63 Windows Launcher, R64 2h OBS/LIVE-Soak, R65 Monitoring/Alerting, R66 Stripe LIVE und R67 Final Gate durchführen.


## Account & Privacy Lifecycle Pass (15.09.2026)

- aktive Sessions einzeln verwaltbar
- passwortgeschützter bereinigter JSON-Datenexport
- TikTok Self-Service Disconnect
- Account-Löschung inkl. best-effort Provider-Revoke für accountgebundene TikTok-Autorisierung
- Datenschutz-/Settings-Kommunikation auf realen Funktionsstand gebracht
- zum Zeitpunkt dieses Einzelpasses waren große externe Acceptance-/LIVE-Tests noch pausiert; Pass 11 führt die automatisierten Release-/Acceptance-Gates später vollständig aus


## Account Credential Security Pass (15.09.2026)

- Passwortwechsel verlangt aktive Session + aktuelles Passwort
- nach Passwortwechsel werden alle alten Sessions widerrufen und die aktuelle Session neu ausgegeben
- neue Passwörter mindestens 15 Zeichen; Passphrasen/Leerzeichen erlaubt; keine künstlichen Großbuchstaben-/Zahl-/Sonderzeichen-Regeln
- besonders häufige bzw. accountbezogene Werte werden serverseitig blockiert
- scrypt KDF V2: N=2^15, r=8, p=3, 64 MiB maxmem
- bestehende V1-Hashes werden nach erfolgreichem Login automatisch auf V2 migriert
- Passwort-Reset per Mail bleibt offen und wird nicht durch unsichere manuelle Support-Resets ersetzt
- zum Zeitpunkt dieses Einzelpasses waren große externe Acceptance-/LIVE-Tests noch pausiert; Pass 11 führt die automatisierten Release-/Acceptance-Gates später vollständig aus


## Account E-Mail Verification & Recovery Pass (15.09.2026)

- provider-neutraler, HMAC-signierter HTTPS-Mail-Relay als optionaler Transport
- Verification-/Reset-Tokens werden nur gehasht persistiert und sind einmalig
- Verifizierung: 8 Stunden TTL; Passwort-Recovery: 30 Minuten TTL
- Token-Links verwenden URL-Fragmente; Browser entfernt das Fragment vor API-Aufruf
- Login verrät `pending_email` erst nach korrekter Passwortprüfung
- Passwort-Recovery gibt unabhängig von Account-Existenz dieselbe öffentliche Antwort
- erfolgreicher Reset widerruft alle Sessions und erzwingt normale Neuanmeldung
- neuer Mailtransport ist standardmäßig deaktiviert; keine erfundene Zustellfähigkeit


## Account MFA / 2FA Pass (15.09.2026)

- TOTP-Unterbau vollständig implementiert und optional im Creator-Account aktivierbar
- MFA-Login über separate 5-Minuten-Challenge; Session erst nach erfolgreichem zweiten Faktor
- Recovery-Codes sind einmalig und werden ausschließlich gehasht gespeichert
- Production benötigt zusätzlich `CFS_MFA_RECOVERY_HASH_SALT`
- keine Behauptung, TOTP sei phishing-resistent; Passkeys/WebAuthn sind ab Pass 8 zusätzlich implementiert


## Account Passkey / WebAuthn Security Pass (15.09.2026)

- optionale Passkeys zusätzlich zu TOTP/Recovery-Codes implementiert
- native Browser-WebAuthn-API; serverseitige Prüfung über `@simplewebauthn/server` 14.0.2
- Registration/Authentication verlangen User Verification und erwartete RP-ID/Origin
- Challenges werden an Creator + Session bzw. MFA-Challenge gebunden und bei jedem Verify-Versuch atomar verbraucht
- Credential Public Key, Counter und minimale Metadaten werden gespeichert; private Schlüssel bleiben ausschließlich beim Authenticator
- Signaturzähler wird nach erfolgreicher Authentisierung aktualisiert
- Security-Event-Allowlist korrigiert: ältere MFA-/Recovery-/Mail-Events und neue Passkey-Events werden jetzt tatsächlich persistiert
- Node.js 22+ ist ab diesem Stand Mindest-Runtime
- echter Browser-/Authenticator-E2E auf der produktiven HTTPS-Domain bleibt offen; keine Behauptung eines realen Hardwaretests

17. Account Login / Anomaly Security
    - persistenter kontoweiter Passwort-Fehlversuchs-Throttle zusätzlich zu IP-/Request-Limits
    - keine IP-, Geolocation-, User-Agent- oder Browser-Fingerprint-Daten in diesem persistenten Throttle
    - temporäre Drossel nach vielen verteilten Fehlversuchen; öffentliche Antwort bleibt generisch
    - erfolgreicher Login setzt den kontoweiten Fehlversuchszähler zurück
    - aktive Sessions zeigen Passwort / TOTP / Recovery-Code / Passkey als Authentisierungsmethode
    - korrektes Passwort + anschließend fehlgeschlagener TOTP-/Recovery-/Passkey-Schritt wird als starkes Sicherheitsereignis gespeichert
    - bei aktivem Account-Mail-Relay werden erfolgreiche Login- und Anomalie-Warnungen mit sechs Stunden Cooldown gebündelt
    - Account zeigt 30-Tage-Signal für fehlgeschlagene zweite Faktoren, ohne Standort- oder Geräteprofil aufzubauen

18. Browser Request Integrity / Supply-Chain Baseline
    - Browser-Schreibzugriffe fail-closed bei fehlender vertrauenswürdiger Origin/Referer bzw. fehlendem `Sec-Fetch-Site: same-origin`
    - cross-site und same-site Fetch-Metadata für schreibende Browser-Endpunkte werden abgewiesen
    - sensible Account-/Creator-/Admin-/Billing-/Launcher-/Bridge-/Auth-Antworten zentral `no-store, private`
    - Cache-Varianz zusätzlich über Cookie und Authorization
    - direkte Backend- und Launcher-Abhängigkeiten auf exakte Versionen gepinnt
    - `.npmrc` erzwingt `save-exact=true` und `engine-strict=true`
    - transitive `package-lock.json` weiterhin offen; vor Release in vertrauenswürdiger npm-Registry-Umgebung erzeugen und `npm ci` verwenden
    - neuer kumulativer kleiner Regression-Runner `npm run project:check`

## Gesamtcheck nach Pass 10

- `npm run project:check`: 21/21 kleine kumulative Bereiche PASS
- Config Doctor: PASS
- GitHub Bootstrap: PASS
- Secret-Pattern-Scan: 0 Treffer
- Paket enthält weder `.env` noch `node_modules`
- Backend 3.12.0 / Launcher 0.42.0 konsistent
- WARN: Root- und Launcher-`package-lock.json` fehlen noch
- WARN: echter Edge-/TLS-Check gegen `cfs-zockt.de` in dieser Laufzeit wegen DNS `EAI_AGAIN` nicht möglich
- damaliger Pass-10-Stand: realer Mail-Relay-/Passkey-/Production-Test offen; die automatisierten Acceptance-/Stress-/OBS-/Release-Gates werden in Pass 11 nachgezogen und bestanden

## Pass 11 – Release Candidate / automatisierter Gesamtstatus

- fehlenden `server-runtime-symbols-v42-test.mjs` wiederhergestellt
- fehlende Post-V42-Regressionstests wiederhergestellt
- fehlenden Post-V42-Bridge-Control-Test wiederhergestellt
- Fake-Bridge an aktuelle Stream-Bot-/Counter-/Timer-Endpunkte angeglichen
- veraltete QA-Annahmen zu Dependency-Pinning und CSP-ausgelagertem JavaScript auf die aktuelle Architektur gezogen
- `npm run release:preflight`: PASS
- V42: PASS
- Post-V42: PASS
- Acceptance Part 2: PASS
- Launcher-/Release-Gate: **98/98 PASS**
- Release-Gate schreibt jetzt fortlaufende Checkpoints

### Ergebnis

**Intern / automatisiert: GO als Release Candidate.**

**Öffentlicher Production-Launch: aktuell NO-GO**, weil externe Release-Gates noch nicht geschlossen sind:

1. `cfs-zockt.de` ließ sich aus der aktuellen Prüfumgebung nicht per DNS auflösen; echter TLS-/Redirect-/Header-Check ist deshalb nicht abgeschlossen.
2. Root und Launcher besitzen noch kein `package-lock.json`; die transitive Dependency-Kette ist daher trotz exakter direkter Pins noch nicht vollständig reproduzierbar.
3. Mail-Relay, reale Passkey-Ceremony und reale Windows-/Hardware-/LIVE-Prüfungen bleiben je nach aktivierter Release-Funktion praktische externe Gates.

Die zuvor fehlenden alten automatisierten Tests sind dagegen **nicht mehr** als offener Punkt zu führen.

## Production Finalization Pass 12

Neu vorbereitet:

- `npm run production:gate` als fail-closed finales GO/NO-GO
- `npm run lockfiles:generate` und `npm run lockfiles:check`
- GitHub Action `Generate Dependency Lockfiles` für vertrauenswürdige Registry-Umgebung
- Production-/Launcher-Deploy-Workflows verwenden nach Commit der Lockfiles `npm ci`
- erweiterter Edge-Check für Root + `www`, TLS, Security Header, security.txt, robots.txt und sitemap.xml
- `PRODUCTION_GO_LIVE_RUNBOOK.md` mit exakter Deploy-Reihenfolge

Aktueller externer Status: `cfs-zockt.de` ist aus der aktuellen Prüfumgebung weiterhin nicht öffentlich per DNS auflösbar. Root- und Launcher-Lockfiles konnten wegen fehlender Registry-Erreichbarkeit in dieser Umgebung nicht erzeugt werden. Damit bleibt `production:gate` absichtlich **NO-GO**, bis beide externen Gates geschlossen sind.
### Pass-12-Nachweis

- `npm run finalization12:check`: **17/17 PASS**
- `npm run release:preflight`: **PASS** nach den neuen Workflow-/Gate-Änderungen
- `npm run production:external-gate`: **NO-GO** wie beabsichtigt
  - Backend Lockfile fehlt
  - Launcher Lockfile fehlt
  - Canonical DNS nicht auflösbar
  - `www` DNS nicht auflösbar
  - dadurch TLS/Redirect/live Header noch nicht verifizierbar
- Production-Deploy akzeptiert nur noch `https://cfs-zockt.de` als `CFS_PRODUCTION_URL` und führt nach dem Canary den External Gate aus.


## Pass 12 – Production Finalization

- Production-/Launcher-Deployments verwenden nach vorhandenen Lockfiles `npm ci`
- `production:external-gate` trennt externe Lockfile-/DNS-/TLS-Gates vom internen Release-Preflight
- Production-Workflow akzeptiert ausschließlich `https://cfs-zockt.de`
- Dependency-Lockfile-Workflow erzeugt Root-/Launcher-Lockfiles in einer echten npm-Registry-Umgebung
- interner Release Candidate bleibt grün; externer Production-Launch bleibt bis Lockfiles + Domain/DNS/TLS NO-GO

## Pass 13 – Production Deployment Readiness

- sichere Render-Blueprint-Vorlage `render.blueprint.example.yaml` ergänzt
- Blueprint hält Auto-Deploy bewusst aus und verwendet `npm ci`
- `/api/health` als Render-HTTP-Healthcheck hinterlegt
- kanonische Domain / OAuth-Callback / WebAuthn-RP-ID in der Vorlage konsistent
- externe Zugangsdaten nicht im Repository; interne Security-Secrets können einmalig von Render generiert werden
- neuer redigierter `npm run deployment:doctor`
- neuer struktureller `npm run deployment13:check` mit 22/22 Checks
- kumulativer `project:check` enthält Pass 13
- Quality-/Production-Workflows prüfen die Deployment-Struktur vor weiteren Gates

### Aktueller Production-Status

- interner Code-/QA-/Deployment-Strukturstand: **GO – Release Candidate**
- öffentlicher Production-Launch: **NO-GO**
- offener Blocker 1: `package-lock.json` und `launcher/package-lock.json` fehlen weiterhin
- offener Blocker 2: `cfs-zockt.de` / `www.cfs-zockt.de` sind aus der Prüfumgebung weiterhin nicht öffentlich per DNS auflösbar; TLS/Redirect/live Header daher nicht real verifiziert

## Pass 14 – Website Conviction / Account Start

- Creator-Suite-Vorschau klar als **Beispielansicht** gekennzeichnet; Demo-Werte werden ausdrücklich nicht als Live-, Nutzer- oder Erfolgsstatistiken dargestellt
- veraltete öffentliche Aussage zu noch offenen automatisierten Acceptance-Tests entfernt; Startseite unterscheidet jetzt zwischen grünem internem Release-Stand und separaten externen Go-Live-Gates
- neuer öffentlicher Vertrauensblock vor der Registrierung: **FREE Plan**, keine Zahlungsdaten beim Anlegen des Accounts und keine automatische kostenpflichtige Buchung
- Account-Schutz vor der Registrierung verständlich erklärt: lange Passphrasen, optionales TOTP, Recovery-Codes und Passkeys
- Datenkontrolle sichtbar gemacht: Sessions, Datenexport und geschützte Kontolöschung
- Login-/Registrierungsseite wiederholt die wichtigsten Startbedingungen direkt am Formular
- keine erfundenen Nutzerzahlen, Erfolgsquoten, Live-Werte oder Sicherheitsgarantien ergänzt
- neuer Regressionstest `npm run conviction14:check`; kumulativer `project:check` enthält Pass 14

### Öffentliche Aussage zum Release-Stand

Die Website darf ab diesem Stand sagen, dass die **automatisierten internen Release-Prüfungen grün** sind. Sie darf weiterhin **nicht** behaupten, der öffentliche Production-Go-Live sei abgeschlossen: DNS/TLS, Lockfiles und die jeweiligen echten Browser-/Hardware-/LIVE-Gates bleiben davon getrennt.


18. Admin Privileged Action Security (Pass 16)
    - privilegierte `/api/admin/*`-Schreibaktionen benötigen zusätzlich zur Admin-Session eine frische Passwortbestätigung
    - Step-up-Ticket 10 Minuten gültig und an die aktuelle Session gebunden
    - `__Host-cfs_admin_elevation` in Production mit HttpOnly, Secure und SameSite=Strict
    - Admin-Step-up rate-limited; Fehlversuche und erfolgreiche Freigaben erscheinen in der Account-Sicherheitsaktivität
    - minimale Admin-Auditspur für privilegierte Schreibaktionen, 180 Tage Retention
    - Audit speichert keine Request-Bodies, rohe IP-Adressen oder User-Agents
    - Admin Control Center zeigt Sperrstatus und Audit intern an
    - eigenes Production-Secret `CFS_ADMIN_ELEVATION_SECRET`; fehlt es, startet Production fail-closed nicht
    - Pass-16-Test 40/40; kleine kumulative Regression 25/25

## Aktuelle nächste externe Gates

1. Root- und Launcher-`package-lock.json` in vertrauenswürdiger npm-Umgebung erzeugen und committen
2. DNS für `cfs-zockt.de` / `www.cfs-zockt.de` öffentlich aktivieren
3. `npm run production:external-gate` und `npm run edge:check` gegen die echte HTTPS-Domain erfolgreich ausführen
4. alle Production-Secrets inkl. `CFS_ADMIN_ELEVATION_SECRET` und `CFS_ADMIN_AUDIT_HMAC_SECRET` setzen
5. echten Datenbank-Recovery-Drill durchführen: Backup verifizieren, in separate leere DB restaurieren, Anwendung prüfen und `npm run recovery:doctor` grün bekommen
6. danach reale Mail-/Passkey-/Windows-/Hardware-/LIVE-Prüfungen je nach aktivem Release-Scope


## Pass 17 – Admin Audit Integrity / Forensik

- separate HMAC-Kette für neue privilegierte Admin-Audit-Einträge
- eigenes Production-Secret `CFS_ADMIN_AUDIT_HMAC_SECRET`; kein Secret-Reuse mit Admin-Step-up
- Audit-Kette bindet Vorgänger-Hash, Admin-ID, Methode, Route, Ergebnis, Statuscode, Request-ID und Zeit
- transaktionaler PostgreSQL-Advisory-Lock verhindert parallele Forks der Kette
- Retention-Checkpoint hält die Verkettung über die 180-Tage-Bereinigung hinweg nachvollziehbar
- bestehende Auditzeilen werden nicht rückwirkend signiert, sondern transparent als `LEGACY` geführt
- Admin-Control-Center zeigt Integritätsstatus und Hash-Kurzreferenzen
- step-up-geschützter JSON-Forensik-Export mit Integritäts-Snapshot
- keine Request-Bodies, rohen IPs oder User-Agents im Audit
- `admin_audit_exported` erscheint als Account-Sicherheitsereignis
- Pass-17-Test: **44/44 PASS**
- kleine kumulative Regression: **26/26 PASS**

### Aktuelle Production-Secrets

Zusätzlich zu den bisherigen Secrets muss `CFS_ADMIN_AUDIT_HMAC_SECRET` gesetzt und über Deployments hinweg stabil gehalten werden. Eine ungeplante Rotation macht die bis dahin erzeugte HMAC-Kette erwartungsgemäß nicht mehr verifizierbar.

### Externe Gates

Unverändert offen bleiben die externen Release-Klassen: Root-/Launcher-Lockfiles sowie öffentlich funktionierendes DNS/TLS für `cfs-zockt.de`.


## Pass 18 – Database Backup & Recovery Security

- Production-Recovery-Policy als `ops/database-recovery-policy.json`
- Provider-PITR ist der bevorzugte Recovery-Weg; logische Exporte ergänzen ihn für Migrationen/Langzeit-/Offsite-Sicherung
- neues verschlüsseltes PostgreSQL-Custom-Format-Backup mit AES-256-GCM
- scrypt + HKDF trennt Verschlüsselungs- und Manifest-HMAC-Schlüssel
- SHA-256 über Klartext und Ciphertext sowie HMAC-SHA-256 über das Manifest
- Datenbank-Credentials werden nicht im Backup-Manifest gespeichert
- temporäre Klartext-Dumps werden nach Abschluss/Fehler entfernt
- `dbbackup:verify` prüft Kryptografie und `pg_restore --list`
- Restore ist standardmäßig dry-run und verweigert Primär-/Quelldatenbank sowie nicht-leere Ziele
- echter Restore braucht `--execute` + `CFS_RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE`
- erfolgreicher Restore schreibt lokale Recovery-Evidence für den regelmäßigen Restore-Drill
- neuer `recovery:doctor` prüft Policy, PostgreSQL-Tools, Backup-Key und Alter der letzten Restore-Evidence
- Pass-18-Test: **52/52 PASS** (46 strukturell + 6 echte Crypto-Roundtrip-/Tamper-Checks)

### Zusätzliche Production-Readiness

Neben Lockfiles und DNS/TLS gehört vor dem öffentlichen Go-Live jetzt auch ein **realer Restore-Drill** zur Operations-Checkliste. In dieser Entwicklungsumgebung sind keine PostgreSQL-Clienttools bzw. keine echte Production-Datenbank verfügbar; daher wird kein echter Dump/Restore als bestanden behauptet.

## Pass 19 – Application Recovery / Rollback

- versionierte Application-Recovery-Policy unter `ops/application-recovery-policy.json`
- Datenbank-Recovery (Pass 18) und App-Rollback strikt getrennt
- Release-State-Snapshot mit Git-SHA, Versionsstand und Hashes kritischer Dateien; keine Secret-Werte im Snapshot
- manueller GitHub-Workflow `Production Application Recovery` mit expliziter Bestätigungsphrase und Ziel-Commit
- Recovery-Ziel wird mit committed Lockfiles, `npm ci` und vollständigem Release-Preflight validiert
- bekannter guter Commit kann kontrolliert per Render Deploy Hook `ref=<commit>` redeployed werden
- nach Recovery sind Canary und kompletter Edge-/DNS-/TLS-Check Pflicht
- Recovery-Evidence wird nur nach beiden erfolgreichen Gates erzeugt
- neuer `apprecovery:doctor` bewertet Lockfiles, Production-Ziel, Deploy-Hook und Alter der letzten Recovery-Evidence
- kein Application-Rollback darf automatisch einen Datenbank-Restore ausführen
- Pass-19-Test: **52/52 PASS** (46 strukturelle Recovery-Checks + 6 echte Evidence-Fail-closed-Checks)

### Zusätzlicher Operations-Gate vor Go-Live

Neben Lockfiles, DNS/TLS und realem Datenbank-Restore-Drill muss ein Application-Recovery-Drill mit bekanntem gutem Commit und frischer Evidence durchgeführt werden.


## Pass 20 – Incident Response / Website Write-Freeze (16.09.2026)

- vier Betriebsmodi: `normal`, `degraded`, `maintenance`, `security_lockdown`
- öffentliche Statusanzeige kann sachliche Incident-Meldung zeigen, ohne Infrastrukturdetails preiszugeben
- `maintenance` und `security_lockdown` pausieren zentrale Account-/Creator-/Review-/Billing-Schreibwege fail-closed mit HTTP 503 + `Retry-After`
- Admin, Health, privater Security-Support, CSP-Reporting und Stripe-Webhook bleiben erreichbar
- Security Lockdown kann optional alle anderen Login-Sitzungen widerrufen; die steuernde Admin-Session bleibt erhalten
- Statusänderungen benötigen Admin-Step-up und werden durch das bestehende HMAC-verkettete Admin-Audit erfasst
- keine Geolocation, rohe IP-Historie, User-Agent-Historie oder Browser-Fingerprints für den Incident-Unterbau
- `npm run incident20:check`: **41/41 PASS**
- `npm run project:check`: **29/29 PASS**
- V42, Post-V42 und Acceptance Part 2: **PASS**

### Zusätzliches reales Operations-Gate

Vor dem öffentlichen Go-Live den Incident-Modus einmal praktisch in einer sicheren Umgebung durchspielen (`degraded → maintenance → security_lockdown → normal`) und Write-Freeze, Support/Admin-Erreichbarkeit sowie optionalen Session-Widerruf nachweisen.

## Pass 21 – GitHub Repository Bootstrap

Aktives öffentliches Source-Repository ist `cstaudy/cfs-zockt-Website`.

Pass 21 bereitet den ersten sauberen Push des kumulativen Projekts vor:

- aktueller Repository-Slug und HTTPS-Remote dokumentiert
- `.github/SECURITY.md` für private Sicherheitsmeldungen
- PR-Template auf aktuelle Security-/Release-Gates aktualisiert
- historisches V40/V41-GitHub-Setup klar als Historie markiert
- Repository-Readiness-Check mit Large-File-/Artefakt-/Gitignore-/Workflow-Prüfung
- Initial-Push-Plan als lokaler Generator
- GitHub Actions bleiben auf Node.js 22
- Lockfile-Erzeugung bleibt bewusst ein separater manueller Workflow, bis die npm-Registry erreichbar ist

Nach dem ersten Push sind Quality Gate, Lockfile-Workflow, GitHub Environments und Ruleset die nächsten Repository-Schritte.

## v40 – Recent Games Technical (25.09.2026)

Aktueller technischer Erweiterungsstand nach v39:

- freiwillige 14-Tage-Spielaktivität im Launcher, standardmäßig AUS
- ausschließlich abgeschlossene CFS-Game-Capture-Sessions; keine allgemeine Prozessüberwachung
- lokal persistente, begrenzte Queue mit Crash-Recovery bis zum letzten Heartbeat
- bestehende authentifizierte Studio-Bridge für Submit/Delete
- bestehender `creator_module_state`-Vertrag unter `community_game_activity`; keine neue Tabelle
- PostgreSQL Schema Generation bleibt 68
- serverseitige Retention max. 30 Tage und 300 Events
- öffentliche Aggregation über `/api/public/community-stats`: letzte 14 Tage, max. sechs Games
- Homepage-Bezeichnung `MEISTGESPIELT MIT CFS` + Hinweis auf freiwillig geteilte Game-Capture-Sessions
- Opt-out löscht lokal und fordert serverseitige Löschung an; Offline-Löschung bleibt bis zum nächsten Bridge-Kontakt vorgemerkt
- `npm run recentgames40:check`: 21/21 PASS
- `npm run project:check`: 58/58 PASS
- `npm run product32:check`: 9/9 PASS
- `npm run release25:verify`: 49/49 `RC25_READY`
- `npm run predeploy:doctor`: 29/29 `PREDEPLOY_READY`

Evidence-Grenze: lokal/statisch. R62–R67 bleiben externe operative Gates; insbesondere kein `LIVE_AUTH_PASS`, `LIVE_WINDOWS_PASS`, `LIVE_SOAK_PASS`, `LIVE_MONITOR_PASS`, `LIVE_BILLING_PASS` oder `LIVE_LAUNCH_PASS` wird aus v40 behauptet.

## Statusupdate 26.09.2026 – v61 Local Acceptance Completion

- aktueller lokaler Abschlussstand: **v61 Local Acceptance Completion**
- die 24 im gelieferten Paket fehlenden historischen Regressionstests bleiben transparent `unavailable`; sie wurden nicht erfunden oder nachträglich als PASS markiert
- neuer vollständig ausführbarer Current-Contract-Runner `npm run project58:run` → **26/26 PASS**
- zwei Stream-Studio-Tests wurden an die bereits härtere aktuelle Runtime angepasst: interne `cut_analysis`-Jobs bleiben zusätzlich zu `cut_audition` aus der normalen Exportliste; Audition nutzt den aktuellen Autosave/Recovery-Flush; Schema-Prüfung ist auf `cut_audition` begrenzt (Runtime aktuell Schema 13)
- read-only External Acceptance Status v59 → **0 PASS / 11 OPEN / 0 BLOCKED** in dieser Sandbox
- External Acceptance Runbook v60 legt die echte Reihenfolge Git/Release Lock → R59–R67 plus Windows CUT/Reference Provider fest
- Local Completion Gate v61 → **`LOCAL_ACCEPTANCE_PREPARED`**
- `LOCAL_ACCEPTANCE_PREPARED` ist ausdrücklich kein Production-, Windows-, OBS-, TikTok-LIVE-, Provider-, Billing- oder Launch-PASS
- nächster legitimer Schritt ist die echte Außenweltabnahme auf verifiziertem Release/Windows/Production; feature-frozen Produktbereiche werden nur für echte Acceptance-Fehler wieder geöffnet

## v66 – NEXUS Creator Control Plane Completion

NEXUS ist jetzt code-seitig abgeschlossen und feature-frozen als zentrale Creator Control Plane. Der Block umfasst sichere Launcher-Aktionen, Status/Activity, persistente Redelivery-Receipts, Event→Action-Automationen und die öffentliche Produktintegration.

Validation: v66 8/8 PASS, Current Contract Regression 27/27 PASS, v62 16/16, v63 15/15, v64 14/14, v65 14/14. Status: `FEATURE_FROZEN / READY_FOR_WINDOWS_NEXUS_ACCEPTANCE`. Reale Windows-/LIVE-/Production-Evidence bleibt extern.

## Statusupdate 26.09.2026 – v72 Interactive Games Website Integration

- Interactive Games sind nicht mehr auf den alten Team-A/Team-B-Core begrenzt: Cloud-Games und Launcher-Local-Game-Profile teilen einen gemeinsamen Katalog.
- Das bereitgestellte Interactive Games Terminal v4.1.0 wurde als verwaltete lokale Launcher-Engine integriert; enthalten sind NEXUS, Boss Arena, Team Race und Welche Tür?.
- Direkte TikFinity-Verbindung der eingebetteten Engine ist im CFS-Managed-Mode deaktiviert. Normalisierte LIVE-Events kommen ausschließlich über die bestehende CFS Launcher-/Provider-Pipeline.
- Lokaler Service ist loopback-only, mutierende CFS-Endpunkte sind mit einem kurzlebigen Service-Token geschützt, Runtime-State liegt im Launcher UserData-Verzeichnis.
- Website Start nutzt `STARTING → Launcher Action/Receipt → RUNNING`; ein fehlender/alter Launcher wird fail-closed abgewiesen.
- Stream Studio behandelt lokale Games als Launcher-Local-Quelle und zeigt den aktiven Game-Status.
- Recording→CUT-Handoff bewahrt reduzierten Game-Kontext; CUT zeigt Game/Runde im Projektkontext.
- Launcher 0.43.0 verwaltet Service-Lifecycle, Game-Auswahl, normalisierte Event-Weitergabe und deduplizierte Action-Receipts.
- Cloud-Score-/Rule-Engine wird für Launcher-Local-Games serverseitig nicht als zweiter Spielstand verwendet.
- Externe Windows-/LIVE-/OBS-/Production-Acceptance bleibt weiterhin separat.


### v72 Final Validation

- Interactive Games Integration **16/16 PASS**
- Embedded Managed Game Service **8/8 PASS**
- Current Contract Regression **28/28 PASS**
- Status: `READY_FOR_WINDOWS_INTERACTIVE_GAMES_ACCEPTANCE`
- Externe Windows/LIVE/OBS/Production-Evidence bleibt offen.

## Statusupdate 26.09.2026 – v76 Interactive Games Module Platform Completion

- Launcher auf **0.44.0** angehoben.
- Interactive Games sind nicht mehr nur auf fest im Backend codierte lokale Spiele begrenzt.
- Der Launcher scannt installierte `game.json`-Module beim Start direkt aus dem eingebetteten Game-Paket, ohne dafür den lokalen HTTP-Service starten zu müssen.
- Der Launcher meldet einen sanitisierten Modul-Katalog über die bestehende Creator-Bridge (`interactive_games_catalog_v1`). Service-Token, lokale Datenpfade und Roh-Secrets werden dabei nicht übertragen.
- Die Website führt bekannte Built-in-Games und zusätzlich erkannte lokale Module gemeinsam im Game-Katalog. Zusätzliche Module verwenden stabile Schlüssel im Format `local:<terminal-id>`.
- Ein neu ausgewähltes dynamisches Modul kann nur gespeichert werden, wenn ein aktueller kompatibler Launcher online ist und genau dieses Modul meldet.
- Beim Start wird das Modul nochmals serverseitig gegen den aktuellen Launcher-Katalog geprüft; entfernte oder nicht installierte Module schlagen fail-closed fehl.
- Interactive-Game-Actions verwenden jetzt `game_service_version: 2` und transportieren die validierte `terminal_id` explizit zum Launcher.
- Der Launcher prüft die installierte Modulliste nochmals lokal, bevor er ein Modul aktiviert.
- Stream Studio zeigt Launcher-/Service-Readiness, aktives Modul und Modulanzahl für lokale Interactive Games.
- Die Games-Seite zeigt erkannte lokale Module und deren Version; der Launcher zeigt die Anzahl installierter Module auch ohne laufenden Game-Service.
- Bestehender Recording→CUT-Handoff bleibt kompatibel; dynamische `local:<id>`-Game-Kontexte werden nicht auf einen Built-in-Typ zurückgesetzt.
- Final Validation: `games76:check` **24/24 PASS**, Interactive Games v72 **16/16 PASS**, Managed Game Service **8/8 PASS**, CUT Completion **27/27 PASS**, Current Contract Regression **29/29 PASS**, Launcher Static/Stability **PASS**.
- Externe Windows-/OBS-/TikTok-LIVE-/Production-Acceptance bleibt separat und wird nicht aus diesen lokalen Tests abgeleitet.


## Statusupdate 26.09.2026 – v80 Interactive Games Profile & Recovery Completion

- Launcher auf **0.46.0** angehoben.
- Games-Seite besitzt jetzt Presets für Cloud- und Launcher-Local-Games.
- Creator können Game-Profile inklusive LIVE-Regeln als versioniertes `cfs.game-profile` JSON sichern und wieder importieren.
- Export enthält keine Runtime-/Output-/Service-Tokens, Provider-Secrets oder lokalen Medienpfade.
- Import ist transaktional, ersetzt Profil + LIVE-Regeln gemeinsam und ist fail-closed, solange ein Game `RUNNING`/`STARTING` ist.
- Local-Game-Import verlangt einen kompatiblen online Launcher und das tatsächlich installierte Zielmodul.
- Games-Seite zeigt Source-Modus, Canvas, Modul und OBS-Readiness explizit; lokale Quellen werden weiterhin nur als Loopback-Quelle behandelt.
- Launcher berechnet einen stabilen SHA-256-Fingerprint über den sanitisierten installierten Game-Katalog und meldet ihn über die Bridge, ohne den Game-Service dafür zu starten.
- Launcher Support Bundle enthält `interactive-games.json` mit sanitisiertem Modul-/Servicezustand, aber keine Secrets oder Rohmedien.
- Final Validation: `games80:check` **24/24 PASS**, `games76:check` **24/24 PASS**, Interactive Games v72 **16/16 PASS**, Managed Game Service **8/8 PASS**, CUT Completion **27/27 PASS**, Stream Studio Full Contract **PASS**, Launcher Static/Stability **PASS**, Current Contract Regression **30/30 PASS**.
- Externe Windows-/OBS-/TikTok-LIVE-/Production-Acceptance bleibt separat und wird nicht aus lokalen Tests abgeleitet.


## v84 Website Creator Finish

Status: `WEBSITE_CREATOR_FINISH_CODE_COMPLETE / LOCAL_CONTRACTS_PASS`

- Dashboard operations cockpit for Games / Stream / CUT / Launcher
- Dynamic Interactive Games catalog in Creator Setup
- Save-and-open start workflow
- Integrations Hub aligned with actual OBS Browser Source / multistream capabilities
- Website v84 validation: 20/20 PASS
- Current Contract Regression: 31/31 PASS

External Windows / OBS / TikTok-LIVE / provider / production acceptance remains open.

## v129 – Recording → CUT Idempotency Runtime Fix

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

The v128 idempotency contract is corrected at runtime: existing and new CUT project creation paths now share a stable `{row,reused}` envelope, and both creator/bridge HTTP routes serialize `result.row`. Retry reuse returns 200 and does not consume another project slot. Local checks: v129 8/8 PASS, v128 8/8 PASS.

## v130 – Recording Stream Session Provenance

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

Recording finalization now snapshots a sanitized Stream Session reference separately from the frozen game context. The reference survives Recording → CUT and normal CUT saves, stays bounded/opaque, and explicitly cannot derive playtime. Local checks: v130 10/10 PASS plus v129/v127/v126 compatibility PASS.

## v131 – Creator Context UI Resilience

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

Dashboard game-context failure handling now fails closed, while CUT surfaces linked Stream Session provenance as user-readable status only. No opaque IDs are shown in the normal UI. Local checks: v131 8/8 PASS, v130 10/10 PASS, v129 8/8 PASS.

## v153 – Support Export Integrity Seal

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

- Adds a server-derived `cfsei_` integrity seal to privacy-safe stream support exports.
- The export seal binds export identity, generation time, embedded snapshot identity/seal, verification result and privacy guards.
- Adds a server-side export-integrity verifier that revalidates the nested support snapshot and fails closed on invalid export IDs, seal mismatch, server-derived markers or privacy flags.
- Local contract: Support Export Integrity: 9/9 PASS

## v154 – Bounded Incident Recovery History

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

- Persists a bounded server-derived history of up to eight recovered stream incidents inside the existing health-evidence JSON.
- Recovery history contains only opaque incident/snapshot IDs, severity and bounded timing metadata; no machine name, secrets or raw media.
- Duplicate incident IDs are replaced rather than appended, preventing unbounded or repeated recovery records.
- Local contract: Incident Recovery History: 8/8 PASS

## v155 – Incident History Integrity Verification

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

- Adds server-side integrity verification for the bounded recovered-incident history.
- Fails closed on over-limit history, duplicate incident IDs, invalid snapshot links, self-recovery links, reversed chronology, recovery-duration mismatch or mismatch with the current recovered incident.
- Runtime and privacy-safe support snapshots expose only the bounded integrity verdict; the support snapshot seal binds that verdict.
- Local contract: Incident History Integrity: 12/12 PASS


## v156 – Incident Recovery History Chain Seal

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

- Adds a server-derived `cfshc_` chain seal over the bounded recovered-incident history.
- The chain binds ordered incident/recovery snapshot links, timing, severity and bounded count.
- Runtime and support snapshots expose a separate history-chain integrity verdict; the support snapshot seal binds it.
- Local contract: Incident History Chain v156: 9/9 PASS


## v157 – Stable Recovery Event IDs

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

- Adds stable server-derived `cfsre_` event IDs to each recovered incident-history entry.
- Event IDs bind incident identity, opened/recovered evidence snapshots, severity and timing metadata.
- History integrity recomputes the event ID and fails closed on invalid or mismatched event identity.
- Local contract: Recovery Event IDs v157: 10/10 PASS


## v158 – Cross-layer Support Correlation Integrity

Status: `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / EXTERNAL_ACCEPTANCE_OPEN`

- Adds server-side cross-layer verification across support snapshot, health evidence, incident state, incident history, history chain and recovery event identity.
- Recovered incidents must cross-link to the current evidence snapshot and latest recovery history row.
- Support exports carry the correlation verdict; export integrity recomputes it and the export seal binds it. Missing live evidence is explicit `unavailable`.
- Local contract: Support Correlation v158: 12/12 PASS

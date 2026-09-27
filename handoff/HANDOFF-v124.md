# CFS_ZOCKT – Handoff v124 Game Context Operational Finish

**Stand:** 27.09.2026  
**Backend:** 3.12.0  
**Launcher:** 0.47.7  
**Schema Generation:** 68  
**Status:** `CODE_COMPLETE / LOCAL_CONTRACTS_PASS / GAME_CONTEXT_V124_COMPLETE / EXTERNAL_ACCEPTANCE_OPEN`

## 1. Recording context integrity
- Every normalized recording game-context snapshot now receives a deterministic opaque `cfsgc_<sha>` ID.
- The ID is recalculated from the sanitized snapshot instead of trusting arbitrary incoming values.
- Recording handoff storage advanced to schema 4 / `v124-recording-context-integrity`.
- CUT keeps only valid `cfsgc_...` IDs alongside the existing safe game fields.

## 2. Creator dashboard
- Dashboard operations now include a dedicated **SPIELKONTEXT** card.
- Active sessions show game, platform and current CFS-tracked duration.
- When no game is active, the last confirmed context can be shown as `Zuletzt` rather than being mislabeled as LIVE.
- The operations grid now uses responsive auto-fit so the extra status card does not break the layout.

## 3. Sanitized support evidence
- Launcher support bundles now add `game-activity.json` and `recording-handoffs.json`.
- The reports expose only sanitized game/session metadata required for support.
- Local recording paths, raw media and provider/bridge secrets are explicitly excluded.
- Recording support metadata can carry the opaque `cfsgc_...` context ID for correlation without exposing the local media location.

## 4. Launcher version
Executable Launcher/support/context code changed, so the active Launcher target advanced from **0.47.6 to 0.47.7**. Active release, recovery, website, system-check, Games and TikFinity version contracts were synchronized. Historical handoffs remain historical.

## Validation
- v124: **18/18 PASS**
- v123 compatibility: **16/16 PASS**
- Recording Stem Preview: **58/58 PASS**
- Games Profile Platform: **24/24 PASS**
- Website Creator Finish: **20/20 PASS**
- Release Readiness: **20/20 PASS**
- Current Contract Regression: **52/52 PASS**

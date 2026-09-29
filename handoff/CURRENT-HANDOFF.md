# HANDOFF v193

Apply after v192.

## Delivered
- Idempotent initial Recording→CUT clip materialization under server-side Creator/project locking.
- `source_handoff_id` is validated against project provenance before initial clip reuse/creation.
- Launcher uses the dedicated initial-recording bridge endpoint instead of generic clip creation.
- Launcher active release contract bumped to 0.47.16.
- Local contract: Recording Initial Clip Idempotency v193: 15/15 PASS.

## Local verification
- v193 contract: PASS
- v192 heartbeat serialization: PASS
- Launcher static check: PASS
- BridgeClient integration: PASS
- Release Readiness: 20/20 PASS
- Backend / Launcher syntax: PASS

Backend 3.12.0 · Launcher 0.47.16 · Schema Generation 68.
External Windows/LIVE/Production acceptance remains OPEN.

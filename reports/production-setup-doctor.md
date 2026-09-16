# Production Setup Doctor

**Generated:** 2026-09-15T18:28:34.016Z

**Status:** **NO-GO**

- PASS — Node.js 22+ declared (>=22)
- PASS — Backend direct dependencies are exact (4 dependencies)
- PASS — Launcher direct dependencies are exact (2 dependencies)
- FAIL — Backend package-lock.json exists (package-lock.json)
- FAIL — Launcher package-lock.json exists (launcher/package-lock.json)
- PASS — Render Blueprint example exists (render.blueprint.example.yaml)
- PASS — Blueprint disables auto deploy
- PASS — Blueprint build uses npm ci
- PASS — Blueprint uses application health check
- PASS — Blueprint declares canonical domain
- PASS — Blueprint pins canonical APP_BASE_URL
- PASS — Blueprint pins WebAuthn RP ID
- PASS — Blueprint does not hardcode production secrets
- SKIP — Production runtime configuration (not evaluated (no production env supplied))

## Hinweise

- Runtime environment was not supplied; secret/value checks were skipped. Run with production env or --strict on the deployment host.

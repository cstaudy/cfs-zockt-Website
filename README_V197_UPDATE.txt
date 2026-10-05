CFS v197 UPDATE ONLY
====================

Dieses Paket wird über den aktuellen v196-Main kopiert.
Vorhandene Ordnerstruktur beibehalten und Dateien ersetzen/ergänzen.

Enthält:
- einheitliches CFS Brand/UI-Layer v197
- neues /pages/admin.html Admin Hub
- Admin-Login-Weiterleitung
- korrigierte CFS-AI-Branding-Integration
- CFS Admin Desktop (Electron) + Windows-Buildskript
- v197 Regressionstest
- aktualisierte GitHub-safe .env.example ohne echte Secrets

WICHTIG:
- Keine echten Render-Secrets sind enthalten.
- CFS_AI_BRIDGE_TOKEN bleibt in .env.example leer.
- Render-Secrets und lokale .env.local.bat bleiben unverändert außerhalb dieses Pakets.

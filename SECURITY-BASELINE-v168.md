# SECURITY BASELINE v168

- Keine neue Speicherung von Stream-Keys, OAuth-Tokens oder Provider-Secrets.
- Stream-Credentials bleiben im Launcher / Windows SafeStorage; PostgreSQL erhält sie weiterhin nicht.
- CFS Studio bleibt Web-/PWA-Oberfläche mit bestehender Creator-Session.
- Eingeklappte technische Panels ändern nur die Darstellung, nicht die Sicherheitsgrenzen.
- Legacy-Workspace-Migration überschreibt nur das unveränderte alte Standardlayout; benutzerdefinierte Größen/Spalten bleiben erhalten.
- Diagnose bleibt advisory: keine automatische Änderung von Bitrate, Encoder oder Streaming-Zielen.
- OBS bleibt optionale lokale Kompatibilität und wird nicht zum Standardweg zurückgestuft.

## Verifikation

- `studio-operator168:check`: **92/92 PASS**
- `project:check`: **40/40 PASS**
- kompletter `release:v168`: **PASS / Exit 0**

# Launcher Distribution v159

## Ziel

Der CFS Launcher wird als echte Windows-Anwendung verteilt. Die Website hostet keine manuell kopierte oder erfundene EXE, sondern zeigt ausschließlich veröffentlichte GitHub-Release-Artefakte.

## Öffentlicher Download

- Seite: `/pages/launcher-download.html`
- Read-only API: `/api/public/launcher/releases`
- Standard: Stable Release
- Windows Architektur: x64
- Primär: NSIS Setup `.exe`
- Optional: Portable `.exe`
- Integrität: `SHA256SUMS.txt` und `release-manifest.json`, wenn im Release vorhanden

Wenn kein veröffentlichter Stable-Installer existiert, bleibt der Download deaktiviert.

## Build und Veröffentlichung

Workflow: `.github/workflows/launcher-release.yml`

### Manueller Workflow-Start

Ein manueller Lauf darf interne Build-Artefakte erzeugen und als GitHub Actions Artifact bereitstellen. Er erzeugt keinen öffentlichen GitHub Release.

### Öffentlicher Release per Tag

Ein Tag wie `v0.47.29` muss exakt zur Version in `launcher/package.json` passen. Der Windows-Runner führt QA, Release Gate, Native Helper Builds und `electron-builder` aus.

Vor einem öffentlichen Tag-Release ist eine gültige Authenticode-Signatur Pflicht. Fehlt die Signatur, stoppt der Workflow vor der GitHub-Release-Veröffentlichung.

Erforderliche GitHub Environment Secrets für signierte Builds:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

## Website-Verhalten

Die öffentliche API liefert nur bereits normalisierte Release-Metadaten und GitHub-Download-URLs. Creator-, Device-, Token-, Stream-Key- oder Bridge-Daten werden über diesen Endpoint nicht ausgegeben.

## Noch real abzunehmen

Vor dem ersten öffentlichen Launcher-Release:

- echter Windows x64 Build
- gültige Code-Signing-Signatur
- Windows Installationstest
- Startmenü/Desktop Shortcut
- erster Start
- Device-Link
- Update-/Rollback-Verhalten
- SmartScreen-Verhalten
- OBS-/Stream-Studio Acceptance

Diese Punkte werden nicht durch einen statischen Repository-Test ersetzt.

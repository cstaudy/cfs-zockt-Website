# TECHNIK v159 — Professional Public Website & Launcher Distribution

## Versionen

- Paketstand: v159
- Backend: 3.20.5
- Schema Generation: 73
- Launcher: 0.47.29
- Windows Zielarchitektur: x64

## Öffentliche Website

v159 ergänzt einen eigenen öffentlichen Launcher-Pfad und reduziert die Startseiten-Navigation auf die wichtigsten Besucherwege. Der Launcher wird nicht mehr nur als eingeloggtes Creator-Modul erklärt, sondern als nachvollziehbares Windows-Produkt mit eigenem Downloadstatus.

Neue Seite:

`/pages/launcher-download.html`

Die Seite zeigt:

- Windows Setup `.exe`
- Portable `.exe`
- Release-Version
- Veröffentlichungsdatum
- Dateigrößen
- SHA-256-Status
- GitHub Release-Details
- Installation in drei Schritten
- klare lokale Sicherheits-/Credential-Grenze

Ist kein veröffentlichter Stable-Release vorhanden, bleiben die Download-Aktionen deaktiviert.

## Öffentliche Release-API

Neu:

`GET /api/public/launcher/releases`

Der Endpoint ist read-only und benötigt keinen Creator-Login. Er liefert ausschließlich normalisierte öffentliche Release-Metadaten aus dem bereits vorhandenen GitHub-Release-Katalog.

Nicht ausgegeben werden:

- Creator-Daten
- Device Secrets
- Bridge Tokens
- Provider Tokens
- Stream Keys
- lokale Credential-Inhalte

## Windows Distribution

Der Launcher war bereits als Electron-Windows-Anwendung konfiguriert. v159 macht den vorhandenen Distribution-Pfad zum klaren öffentlichen Produktweg.

Buildziel:

- NSIS Setup: `cfs_zockt-Creator-Suite-Setup-0.47.29-x64.exe`
- Portable: `cfs_zockt-Creator-Suite-Portable-0.47.29-x64.exe`

Der GitHub Workflow `.github/workflows/launcher-release.yml` baut auf `windows-latest`.

## Signing-Hardening

Manuelle Workflow-Läufe dürfen weiterhin interne Build-Artefakte erzeugen. Ein Tag-Release wird jedoch nur öffentlich veröffentlicht, wenn `Get-AuthenticodeSignature` für die EXE-Dateien den Status `Valid` liefert.

Dafür vorgesehen:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

Fehlt eine gültige Signatur, stoppt der Tag-Workflow vor der öffentlichen GitHub-Release-Veröffentlichung.

## Lokaler Windows Build

Verbessert:

- `BUILD-LAUNCHER-WINDOWS.cmd`
- `launcher/build-windows.bat`
- `launcher/BUILD_WINDOWS.md`

Der Buildstarter verwendet `npm ci` statt `npm install`, führt QA aus, baut die nativen Windows-Helfer und erzeugt Setup + Portable + Release Manifest.

## Tests

- `launcher-download159:check`: 32/32 PASS
- SEO: PASS
- Website Acceptance 21.3.14: 34/34 PASS
- Project Regression: 40/40 PASS
- Release Readiness Finish: 20/20 PASS
- vollständiger `release:v159`: PASS / Exit 0

## Bewusst offen

In der aktuellen Linux-Entwicklungsumgebung wurde keine EXE als bestanden behauptet. Der echte Launcher-Build benötigt Windows/MSVC für die nativen Audio-/Game-Capture-Helfer und für den öffentlichen Release zusätzlich die Signierumgebung.

Vor dem ersten öffentlichen EXE-Release bleiben echte Tests nötig:

- Windows x64 Build
- Authenticode
- SmartScreen
- Installation/Uninstall
- Device-Link
- SafeStorage
- OBS
- Stream Studio
- Update/Rollback
- Reconnect/Soak

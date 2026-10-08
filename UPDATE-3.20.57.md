# CFS ZOCKT Creator Suite 3.20.57 · ALL TESTS READY

## Schwerpunkt
3.20.57 ist kein Feature-Release. Der Stand macht die gesamte Creator Suite reproduzierbar **testbereit** und vereinheitlicht die reale Beta-Acceptance.

## Neu

### Einheitliche Acceptance-Matrix
10 Bereiche / 56 reale Testfälle:
- Windows / Launcher / OBS
- Twitch
- TikTok
- YouTube
- Multistream
- Browser / Responsive / Accessibility
- Account / Security
- Shop / Downloads
- Creator End-to-End
- Stability / Recovery / Soak

### Einheitlicher Statusvertrag
- `pending`
- `pass`
- `fail`
- `blocked`
- `skip` nur für Conditional-Punkte

PASS benötigt Evidence. Conditional-SKIP benötigt Begründung oder Evidence.

### Web + CLI identisch
Die Acceptance-Seite und die CLI verwenden denselben Vertrag. Der Browser-Export erzeugt ein CLI-kompatibles JSON mit `records`, sodass ein manueller Lauf später reproduzierbar weiterverarbeitet werden kann.

### Evidence
- Evidence liegt unter `evidence/beta-3.20.57/`
- Manifest mit SHA-256
- rekursive Dateierfassung
- Text-Evidence wird auf typische Tokens, Secrets, Stream-Keys und OBS-Passwörter geprüft

### GO / NO-GO
Es gibt bewusst kein automatisches GO. Das beste automatische Ergebnis ist:

`READY_FOR_MANUAL_GO_NO_GO`

Ohne reale Acceptance bleibt der Stand `HOLD`.

### Windows Operator Kit
Ein Operator-Kit bereitet Windows/Launcher/OBS-Tests vor und führt Code-Gate, Launcher-Release-Build, Application-Audio- und Game-Capture-Diagnose aus. Die eigentlichen OBS-/Provider-/Soak-Tests bleiben manuell.

### npm Script Hygiene
Verwaiste historische npm-Scripts wurden aus der aktiven Scriptliste entfernt und archiviert. Aktive Scripts verweisen nicht mehr auf fehlende Node-Dateien oder fehlende npm-Unter-Scripts.

### Update-Übergabe wird Pflicht
Ab 3.20.57 gehört zu jedem Release eine `UEBERGABE-<Version>.md`.
Der Standard liegt unter `docs/UPDATE-UEBERGABE-STANDARD.md` und wird über `npm run handover:check` geprüft.

### System Check repariert
Die vollständige Readiness-Logik aus 3.20.56 wurde wiederhergestellt. Der Systemcheck prüft wieder echte Health-, Stream-, NEXUS- und Twitch-Endpunkte und trennt Code-Readiness von externer Acceptance.

## Teststatus

### Vollständiger Code-Gate
`npm run check:v32057` ✅

Enthalten sind u. a.:
- Beta Acceptance Gate
- Windows Operator Kit Gate
- npm Script Hygiene
- Release Handover 16/16
- kompletter 3.20.56-Unterbau
- kompletter Stream-Studio-Gate bis Pass 21.10.34
- NEXUS
- Twitch
- OBS Readiness
- Shop / Creator Downloads
- Tonstudio
- Masterbild-Generator
- Widget Studio
- Cut Studio
- Launcher Static Check

### Acceptance-Lifecycle geprüft
- `beta:init` ✅
- `beta:status` → 0/56 · HOLD ✅
- `beta:preflight` ✅
- `beta:windows-kit` ✅
- `beta:evidence` → 0 Evidence-Dateien · Secret Scan PASS ✅
- `beta:go-no-go` → HOLD ✅
- `beta:go-no-go:strict` → Exit 2 bei HOLD ✅

Das HOLD ist vor den echten Realtests der **korrekte** Zustand.

### Delta-Installer geprüft
- 3.20.56 → 3.20.57: **29 Dateien**
- Wiederholungsprüfung: **0 Änderungen**
- vollständiger `check:v32057` nach Installation: **PASS**
- Konfliktschutz: absichtlich geänderte Datei wird **nicht überschrieben**, Installation stoppt vor dem Schreiben

## Noch offen
Die folgenden Punkte sind jetzt testbereit, aber noch nicht real abgenommen:
- Windows Clean Install
- Launcher Release-Build auf Ziel-PC
- OBS WebSocket / One-Click / Reconnect
- Application Audio real
- Game Capture real
- Twitch mit echtem Testaccount
- TikTok / YouTube soweit offizieller Zugang vorhanden
- echtes Multistreaming
- Browser-/Mobile-Matrix
- Security-Hardwaretests
- 60-Minuten-Soak
- P0/P1-Triage

## Versionen
- Website / Backend: **3.20.57**
- Datenbankschema: **80**
- Launcher-Ziel: **0.47.31**

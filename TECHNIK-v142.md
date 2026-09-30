# cfs_zockt — TECHNIK v142

## Ziel von v142
v142 prüft nicht nur einzelne Module, sondern den tatsächlichen Erstnutzer-Pfad eines Creators: **Account → TikTok → Launcher → OBS → veröffentlichtes Widget → Browser Source in der aktiven Szene**.

Der Audit zeigte zwei konkrete Lücken:
1. Das bisherige Onboarding endete im Wesentlichen nach dem ersten Widget und bestätigte nicht, ob der komplette Stream-Pfad verbunden ist.
2. Eine veröffentlichte Widget-URL musste trotz vorhandener OBS-WebSocket-Steuerung noch manuell als Browser Source in OBS angelegt werden.

v142 schließt genau diese Lücken, ohne Widget Studio oder Launcher Core mit unabhängigen neuen Features aufzublähen.

## Launcher
Launcher-Version: **0.47.19**

### One-Click OBS Browser Source
Der Launcher verarbeitet den eng begrenzten Action-Typ `obs_widget_install`.

Ablauf:
1. Creator veröffentlicht ein Widget.
2. Website prüft, dass Launcher und OBS WebSocket verbunden sind.
3. Website stellt nur Widget-ID, Input-Name, Canvas-Größe und optionale Szene in die bestehende Creator-Action-Queue.
4. Launcher holt über die authentifizierte Bridge seine aktuelle Widget-Bibliothek.
5. Erst dort wird die private `source_url` des veröffentlichten Widgets aufgelöst.
6. Launcher ruft lokal OBS WebSocket `CreateInput` oder bei bestehendem Input `SetInputSettings` auf.
7. Die Website pollt nur den Status der eigenen Action und zeigt Erfolg/Fehler an.

### Sicherheitsgrenze
- OBS-Passwort bleibt ausschließlich lokal und verschlüsselt über die bereits vorhandene Launcher-Konfiguration.
- Die Cloud-Action-Queue enthält **keine private Widget-Source-URL und keinen Runtime-Token**.
- Tokenhaltige URLs werden in Launcher-Ergebnissen/Diagnose weiterhin redigiert.
- OBS-Kommandos bleiben an die explizite Allowlist gebunden.
- `CreateInput` ist für den Browser-Source-Flow freigegeben.
- `StartStream` bleibt ausdrücklich **nicht** freigegeben.
- Remote-Website-Code erhält keinen allgemeinen OBS-Request-Endpunkt.

## Stream-Ready Setup
Neu: `GET /api/creator/stream-ready`.

Der Endpoint bewertet ausschließlich den eingeloggten Creator und liefert fünf verständliche Schritte:
- Account/E-Mail verifiziert
- TikTok verbunden
- Launcher online
- OBS WebSocket verbunden
- mindestens ein veröffentlichtes Widget

Das Dashboard rendert daraus **STREAM STARTCHECK** und verlinkt direkt zum jeweils nächsten fehlenden Schritt. Damit muss ein Creator nicht aus mehreren technischen Statusseiten selbst ableiten, was noch fehlt.

## Widget Studio
Der bestehende OBS-Bereich erhält den primären CTA:

**IN AKTUELLE OBS-SZENE EINFÜGEN**

Die bisherigen Optionen zum Kopieren/Öffnen der URL bleiben erhalten. Der automatische Pfad verlangt bewusst einen verbundenen Launcher plus OBS WebSocket und fällt bei fehlender Voraussetzung mit einer verständlichen Fehlermeldung aus statt still zu scheitern.

## Readiness-Korrektur
Der Creator-Suite-Core-Status behandelt OBS WebSocket nicht mehr als bloß geplanten späteren Ausbau. Er unterscheidet jetzt:
- Launcher-Update erforderlich
- OBS WebSocket code-seitig verfügbar / reale Acceptance offen
- OBS WebSocket aktuell verbunden

Die Roadmap verschiebt den nächsten Integrationsschwerpunkt entsprechend auf Twitch, YouTube und Multistream-Acceptance.

## Lokale Prüfungen
Grün:
- `node launcher/tools/obs-widget-install-v142-test.mjs`
- `node tools/creator-stream-ready-v142-test.mjs .`
- Syntax-Checks für Server, Launcher, Bridge, OBS Controller, Dashboard JS und Widget Studio JS
- `npm run creator-suite142:check`

Zusätzlich bleiben alle darin enthaltenen v140/v141-Regressionen grün, darunter Widget Studio Completion 21/21, Launcher Completion 42/42 sowie Scene/Stream/Multistream/Provider-/Live-Health-Gates.

## Nicht als real abgenommen behauptet
v142 ersetzt keine reale Acceptance. Weiter offen:
- echter Windows-PC / Installer / Signing / SmartScreen
- echter OBS-5-WebSocket- und Browser-Source-Feldtest
- OBS-Neustart, Launcher-Neustart und reale Netzunterbrechung
- echter TikTok-LIVE-Event-/Reconnect-/Soak-Test
- fremder Creator ohne Entwicklerhilfe
- Twitch-/YouTube-OAuth und echte Multistream-Ziele

## Ergebnis
Der erwartete normale Pfad ist jetzt wesentlich näher an einem geführten Produktflow:

**Registrieren → TikTok verbinden → Launcher online → OBS verbinden → Widget veröffentlichen → ein Klick → Widget in aktueller OBS-Szene.**

Code-seitig sind die vorher gefundenen UX-Lücken geschlossen. Ob dieser Flow unter realen Creator-PC-/OBS-/TikTok-Bedingungen zuverlässig genug ist, muss weiterhin durch die geplante externe Acceptance gemessen werden.

# cfs_zockt Launcher – Stabilisierungspass

Stand: 15.09.2026  
Launcher-Version: **0.42.0** (unverändert)  
Backend-Version: **3.12.0** (unverändert)

## Ziel

Der Pass stabilisiert den bestehenden Launcher, ohne neue Großfunktionen oder einen Versionssprung einzuführen. Schwerpunkt sind Zustandskonsistenz während LIVE, sichere lokale Einstellungen, Bridge-/Action-Serialisierung und kontrollierte Wiederherstellung des lokalen Scene-Outputs.

## Umgesetzt

### 1. LIVE-sichere Einstellungen

Normale Laufzeit-Einstellungen wie TTS, Autostart oder UI-nahe Optionen bauen Bridge und Provider nicht mehr unnötig neu auf.

Während einer aktiven LIVE Session werden verbindungskritische Änderungen blockiert:

- Backend-URL
- Provider
- Maschinenname
- TikTok Username
- Bridge-Schlüssel
- Provider API-Key

Damit kann eine laufende Session nicht mehr durch einen unbemerkten Provider-/Bridge-Wechsel in einen inkonsistenten Zustand geraten.

Provider-Wechsel außerhalb LIVE aktualisieren den vorhandenen Bridge-Client ohne unnötigen kompletten Bridge-Neustart.

### 2. Sicheres Device-Logout während LIVE

Ein Device-Logout beendet zuerst die aktive LIVE Session sauber. Falls das Beenden fehlschlägt, wird das Gerät **nicht** lokal abgemeldet und der Bridge-Schlüssel bleibt erhalten, damit kein schwer wiederherstellbarer halb-abgemeldeter LIVE-Zustand entsteht.

### 3. Bridge Action Polling serialisiert

Action-Polls können nicht mehr überlappen. Ein langsamer Request führt daher nicht dazu, dass dieselbe geleaste TTS-/Launcher-Aktion aus mehreren parallelen Polls doppelt an den Renderer weitergegeben wird.

Zusätzlich wird erfasst, wie viele Polls wegen eines bereits laufenden Polls zusammengeführt wurden (`actionPollSkips`). Nach `BridgeClient.stop()` werden verspätet eintreffende Actions nicht mehr emittiert.

### 4. Lokale Settings atomar gespeichert

`settings.json` wird jetzt über eine temporäre Datei + fsync + Rename geschrieben. Vorhandene Einstellungen werden zusätzlich als lokale `.bak`-Kopie gehalten.

Kann die Hauptdatei nicht mehr gelesen/geparst werden, verwendet der Launcher die letzte lesbare Backup-Konfiguration statt direkt auf leere Defaults zurückzufallen.

Die verschlüsselten Secrets bleiben weiterhin verschlüsselt; es wird keine Klartext-Kopie erzeugt.

### 5. Local Output Renderer Recovery

Ein abgestürzter Scene-/Output-Renderer wird kontrolliert neu geladen.

- maximal 3 automatische Wiederherstellungen
- Zeitfenster: 60 Sekunden
- Verzögerung vor Reload: 900 ms
- Crash-/Recovery-Status im Output-State
- nach wiederholtem Crash wird die automatische Recovery pausiert statt eine Endlosschleife zu erzeugen
- Stop/Close entfernt ausstehende Recovery-Timer

## Neuer gezielter Test

`npm run test:stability`

Prüft:

1. atomare Settings + Backup-Fallback
2. LIVE-Sperre für kritische Einstellungen
3. serialisierte Action-Polls und keine Actions nach Stop
4. begrenzte Local-Output-Crash-Recovery

Der Test ist zusätzlich in den normalen Launcher-`qa`-Ablauf aufgenommen.

## Durchgeführte kleine Regressionen

Erfolgreich ausgeführt:

- Launcher Static Check
- Launcher Stability Pass
- Bridge Client Integration
- Graceful Shutdown / Event Drain
- Config Backup
- Recovery Manager
- Cloud Health
- Provider Switch
- Output Window Manager
- Stream Deck Store
- Stream Deck Actions
- LIVE Session Store
- LIVE Resume Protocol
- Action Lease Client
- Logger Tail / Redaction
- Website Security Pass
- SEO Pass
- Monetarisierungs-/TikTok-Funnel Pass
- Review Admin Pass
- Widget Studio 30-Sekunden-UX Pass
- Widget Core Flow Pass
- Widget Studio V10 Static QA

## Bewusst nicht ausgeführt

Weiterhin **keine** große Acceptance-, Last-, Windows-Real-World- oder echte LIVE-Testserie.

Offen für den späteren großen Finish-Pass bleiben insbesondere:

- echter Windows-Installer/Portable-Test
- realer Renderer-Crash-Test unter Electron/Windows
- echter Provider Disconnect/Reconnect
- Launcher-Neustart während realer LIVE Session
- große OBS-/Multi-Widget-Lasttests
- Windows Code Signing / SmartScreen

## Nächster Roadmap-Punkt

**Stream Board final glätten**, danach fehlende/alte Tests reparieren und erst anschließend Technical Finish Part 4 wieder öffnen.

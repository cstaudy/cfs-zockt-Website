# cfs_zockt — Private Beta Acceptance v155

**Zweck:** reale Acceptance nach dem v154 Feature Freeze. Dieser Ablauf ist für die kostenlose geschlossene Beta bestimmt und aktiviert **keine** Monetarisierung, Analytics, Werbung oder Stripe-LIVE-Tests.

## 1. Automatischer lokaler Precheck

Unter Windows im vollständigen Projektordner starten:

```text
RUN-PRIVATE-BETA-ACCEPTANCE.cmd
```

Der Starter prüft ausschließlich lokale, nicht-kommerzielle Contracts. Erst bei `PRIVATE BETA LOCAL PRECHECK: PASS` mit echten Windows-/OBS-/Provider-Tests fortfahren.

Direkter npm-Aufruf:

```text
npm run private-beta155:check
```

Enthalten sind insbesondere:

- aktuelle Projekt-Regression inklusive R59–R68 Security-/Predeploy-Contracts
- v153 Provider → Streaming-Ziel-Contract
- v154 Beta-Test-Handbuch und Feature-Freeze-Contract
- ausführbarer Stream-Credential-Store-Test gegen SafeStorage-Vertrag
- geschlossene TikTok-/Twitch-Beta und private Commercial-Mode-Off-Regel

## 2. Windows / Launcher

Im integrierten Beta-Test-Handbuch zuerst Registrierung, Login und Launcher abarbeiten.

Zusätzlich real prüfen:

- Launcher startet auf echtem Windows.
- Device Link verbindet genau den angemeldeten Creator.
- SafeStorage ist verfügbar.
- Ein Test-Streaming-Ziel kann lokal gespeichert werden.
- Launcher-Neustart erhält das Ziel verschlüsselt.
- Stream-Key erscheint nicht in UI-Status, Logs, Support-Export oder Website-State.
- Launcher sauber beenden; keine verwaisten FFmpeg-/Helper-Prozesse.

Optional vorhandene Hardware-Drills:

```text
node launcher/tools/application-audio-windows-acceptance.mjs --pid <PROZESS_ID>
node launcher/tools/game-capture-windows-acceptance.mjs --pid <PROZESS_ID>
```

Nur eigene Testprozesse verwenden. Keine Roh-Audio-/Roh-Video-Dateien in Support-Exports aufnehmen.

## 3. OBS

Mit OBS WebSocket 5 real prüfen:

1. Launcher verbindet sich mit OBS.
2. Scenes werden gelesen.
3. Program Scene lässt sich wechseln.
4. Browser Source für ein veröffentlichtes Widget wird erstellt/aktualisiert.
5. Widget läuft mindestens 10 Minuten stabil.
6. OBS-Verbindung kurz trennen und Reconnect prüfen.
7. Private Widget-Runtime-URL darf nicht in Cloud-Telemetrie oder Support-Export auftauchen.

## 4. Twitch LIVE

Nur mit dem eigenen freigegebenen Beta-Creator:

- Account verbunden und Beta aktiv.
- Falls nötig Re-Auth für `channel:read:stream_key`.
- Streaming-Ziel über den Launcher aus dem Account übernehmen.
- Stream-Key bleibt ausschließlich in der einmaligen `no-store` Bridge-Antwort und danach lokal in SafeStorage.
- privaten/geeigneten Teststream starten.
- LIVE/Offline, Chat, Follow, Subs/Gift Subs und Bits nur soweit real ausgelöst prüfen.
- Ziel stoppen und erneut starten.
- Launcher-Neustart und Ziel-Reconnect prüfen.

## 5. TikTok LIVE

Nur wenn TikTok dem konkreten Konto offiziell Encoder-/Stream-Key-Zugang bereitstellt.

- Keine Scraping-/Umgehungslösung verwenden.
- Server URL + Stream Key nur lokal im Launcher speichern.
- LIVE Events, Likes, Gifts, Shares, Viewer/Chat soweit real verfügbar prüfen.
- Ohne offiziellen Encoder-Zugang wird dieser Testpunkt als **ÜBERSPRUNGEN / Zugang nicht verfügbar** dokumentiert, nicht als Produktfehler.

## 6. YouTube LIVE

Erst durchführen, wenn Google-/YouTube-OAuth beim Betreiber vollständig eingerichtet ist.

- Creator Account verbinden.
- vorhandenen eigenen LiveStream/Ingest auswählen.
- bei mehreren Streams muss der Launcher eine bewusste Auswahl verlangen.
- keine Ingest Credentials in PostgreSQL oder Website-State.
- privaten/unlisted Teststream starten und stoppen.

Bis OAuth vollständig eingerichtet ist: **ÜBERSPRUNGEN / Setup offen**.

## 7. Multistream / Recovery

Nach den Einzelzieltests:

- zwei Ziele gleichzeitig starten
- ein Ziel absichtlich stoppen; anderes Ziel muss weiterlaufen
- Netzwerk kurz unterbrechen; Reconnect beobachten
- ein Ziel mit falschem/abgelaufenem Test-Credential scheitern lassen; andere Ziele dürfen nicht beendet werden
- manueller Zielstop darf für dieses Ziel keinen automatischen Reconnect auslösen
- Launcher neu starten und lokale Zielkonfiguration/SafeStorage prüfen
- Backend neu starten; lokale laufende Secrets dürfen nicht in die Cloud gelangen

## 8. Soak

Erst nach stabilen Kurztests:

- mindestens 2 Stunden mit OBS + realem LIVE-Ziel
- Dropped Frames, Encoder Speed, Reconnects, Watchdog Restarts und A/V-Sync beobachten
- danach optional 2+ Ziele und Recording parallel

## 9. Multi-Creator / Isolation

Mit mindestens zwei getrennten Test-Creatorn:

- Creator A sieht keine Provider-/Widget-/Scene-/Beta-Ergebnisse von Creator B
- Bridge-Token von A darf keine Ressourcen von B lesen oder mutieren
- Provider-Zielimport bleibt creator- und providergebunden

## 10. Ergebnisregeln

Ein Punkt ist nur `GEKLAPPT`, wenn er real bestätigt wurde. Nicht verfügbare Provider-Zugänge oder noch nicht eingerichtetes YouTube OAuth werden `ÜBERSPRUNGEN` mit kurzem Kommentar. Fehler bleiben `FUNKTIONIERT NICHT` und werden nicht als PASS simuliert.

**Keine Secrets teilen:** keine Stream-Keys, Passwörter, OAuth Tokens, Bridge-Schlüssel, Recovery Codes oder vollständigen privaten Runtime-URLs in Chat, Screenshots oder Support-Exports kopieren.

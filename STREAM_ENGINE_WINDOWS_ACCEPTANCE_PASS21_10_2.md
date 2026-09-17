# CFS Stream Engine – Windows Acceptance Pass 21.10.2

Diese Checkliste wird auf einem echten Windows-PC durchgeführt. Repository-PASS ersetzt diese Abnahme nicht.

## Vorbereitung

- aktuelle Launcher-Version aus dem Repository bauen/starten
- `ENGINE PRÜFEN` ausführen
- `GERÄTE LADEN` ausführen
- keine Stream-Keys in Screenshots oder Logs veröffentlichen
- Teststreams nur mit privaten/unlisted Testzielen durchführen

## Audio-Bus 1

- Mikrofon auswählen
- 100 % Lautstärke testen
- 50 % Lautstärke testen
- Mute testen
- 250 ms Delay testen
- prüfen, dass keine Secrets in Status/Logs erscheinen

## Audio-Bus 2

- vorhandenes Loopback-/Stereo-Mix-/virtuelles Audiogerät auswählen
- getrennte Lautstärke testen
- getrenntes Mute testen
- getrenntes Delay testen
- dieselbe Quelle wie Bus 1 muss vom Engine-Builder abgewiesen werden

## Monitor & Crop

- Geräte laden und vorhandene Monitore prüfen
- primären Monitor auswählen
- sekundären Monitor auswählen, falls vorhanden
- Position/Größe bei 100 % Skalierung prüfen
- falls verfügbar: Monitor mit abweichender Windows-Skalierung prüfen
- Crop aktivieren und einen sichtbaren Ausschnitt testen
- Crop deaktivieren und vollständiges Bild prüfen

## Runtime-Metriken

- FPS muss während Capture aktualisiert werden
- Bitrate muss während Streaming aktualisiert werden
- Dropped Frames müssen sichtbar werden, falls FFmpeg Drops meldet
- Statusupdates dürfen den Launcher nicht sichtbar überlasten

## Watchdog

- Watchdog aktiviert lassen
- kontrolliert einen Capture-/Netzwerk-Stall erzeugen
- Zielprozess muss als Fehler/Stall markiert werden
- Reconnect muss nur das betroffene Streaming-Ziel betreffen
- andere aktive Ziele dürfen nicht beendet werden

## Noch kein PASS-Kriterium

Native Game Capture und natives Desktop-Audio ohne vorhandenes Loopback-Gerät gehören nicht zu Pass 21.10.2 und dürfen bei dieser Abnahme nicht als vorhanden protokolliert werden.

## Ergebnis

Erst nach realer Hardwareprüfung werden die entsprechenden Punkte in `CFS_MASTER_CHECKLIST_PASS21.md` von 🟡 auf ✅ geändert.

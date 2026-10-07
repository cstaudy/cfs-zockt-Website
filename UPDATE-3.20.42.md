# Update 3.20.42 – technische Absicherung

## Neu

- „Meine Bundles“: OBS-Adressen erneuern. Der Server erzeugt einen neuen zufälligen Token; alte Adressen werden ungültig. Anschließend die neue URL pro Element in OBS einsetzen.
- Eigene Bundles löschen. Veröffentlichten Vorlagen muss zuerst die Shop-Veröffentlichung entzogen werden. Nutzerkopien bleiben unabhängig erhalten. Bilder bleiben in der Medienverwaltung.
- Beide Aktionen prüfen Besitz und Versionsnummer; veraltete Fenster können keine neueren Änderungen unbemerkt ersetzen.
- OBS-Ausgabe erhält die Serverzeit und gleicht Timer/Alerts gegen diese Uhr ab. Das verringert Abweichungen durch falsch eingestellte Rechneruhren; es ist keine samplegenaue Synchronisation.
- Datenbereinigung akzeptiert auch einen leeren/null-Konfigurationswert ohne Typfehler.
- Neuer echter Cut-Exporttest: `npm run check:cut-real`. Benötigt FFmpeg und FFprobe im PATH; alternativ CFS_FFMPEG_PATH und CFS_FFPROBE_PATH setzen. Er erzeugt ein Testvideo mit Ton und zwei Clips plus Reel, prüft Bild/Ton, Maße und Laufzeit und dekodiert die Ausgaben vollständig. Temporäre Dateien werden anschließend entfernt.

## Nachgewiesen

Der echte Cut-Test wurde unter Linux mit installiertem FFmpeg ausgeführt: zwei 640×360-Clips und ein Reel bestanden. Kein simulierter Encoder. Die Cut-Engine musste für diesen getesteten Grundexport nicht verändert werden. Das bestätigt noch keinen Windows-Launcher-Gesamtablauf, keine Hardwareencoder, keine Übergänge und keine komplexen Mehrspur-Projekte.

Maker-Kernprüfungen, Drag-and-drop-Tests, Guide-Tests und neue Lifecycle-API-Tests bestanden. Letztere verwenden weiterhin eine simulierte Datenbank. Versionsprüfung, Besitzprüfung, Tokenwechsel, gesperrte Löschung veröffentlichter Vorlagen und ungültige alte Ausgaben werden abgedeckt. Browser-/PostgreSQL-/OBS-Livetests stehen weiter aus.

## Was für die Website noch fehlt

1. Ein durchgehender Test auf der echten Umgebung: Anmeldung → Bild hochladen → speichern → Vorlage veröffentlichen/kopieren → OBS-Ausgabe → erneutes Öffnen. Dazu Datenbankmigration und mehrere Benutzer prüfen.
2. Automatische Plattform-Ereignisse für die neuen Maker-Widgets. Die vorhandenen Provider-Pipelines sind noch nicht an diese Zähler/Ziele/Alerts angeschlossen.
3. Cut unter Windows im tatsächlichen Launcher mit eigenen Aufnahmen, Audio-Vorschau, Abbruch/Wiederholung, Übergängen und Musik/Voiceover testen. Der einfache Encoder-Export ist jetzt real geprüft.
4. Ein Game mit vollständiger Spielmechanik, Spielzustand, Sieg/Niederlage und Neustart ausarbeiten. Der vorhandene Katalog/Eventtransport allein reicht dafür nicht.
5. Audio Studio: die gespeicherten Presets mit wirklicher Audiosteuerung verbinden; Soundboard und Voice Chain sind dort noch geplant.
6. CFS AI: separaten Dienst tatsächlich konfigurieren und dessen Antworten/Funktionen prüfen; danach gezielt in Maker/Guide integrieren. Die bestehende Admin-Anbindung allein ist keine fertige Creator-AI.
7. Visuelle und barrierearme Browserprüfung auf Desktop/Mobil sowie nachweisbare Produktions-/Backup-/Wiederherstellungsprüfung auf dem Zielsystem.

Das Update ist kumulativ und beinhaltet Maker und Guide aus 3.20.40/41. Datenbankschema bleibt 80. Es wurde nichts auf deinen Server installiert.

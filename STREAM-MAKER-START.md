# Stream Maker – Projekt-Erweiterung

## Schnell ansehen

`STREAM-MAKER-VORSCHAU.html` im Browser öffnen. Diese eigenständige Datei zeigt den echten Editor ohne Server: 26 Elementtypen, 8 Designwelten, 16 Akzentfarben, Bearbeitung, manuelle Timer/Zähler, Vorlagen und HTML-Export. Anmeldung, Upload, Speichern und Veröffentlichung sind in dieser lokalen Vorschau nicht verbunden.

In der gestarteten Creator Suite: `/pages/stream-maker.html`. Der Shop unter `/pages/shop.html` enthält einen eigenen Bereich für Maker-Vorlagen. Im Admin-Bereich und bisherigen Universal Builder sind Einstiege ergänzt.

## Enthalten

- Übersichtlicher Editor: Elementauswahl links, transparente Vorschau und Bundle in der Mitte, Einstellungen rechts; responsive Ansichten für kleinere Bildschirme.
- 26 Elementtypen: Countdown, Stoppuhr, Zähler, Death Counter, Siege, drei Ziele, drei Kamerarahmen, Namens-/Social-/Sponsorleisten, vier Stream-Screens, vier manuelle Alerts, vier Panels.
- 8 prozedural gezeichnete Designwelten und 16 Akzentfarben. Die Startvorlagen sind eigene, direkt bearbeitbare Designs ohne externe Bild-Abhängigkeiten.
- Drag-and-drop im gesamten Maker, inklusive Vorschau: sichtbarer Ablagehinweis, mehrere Dateien, Upload-Fortschritt und Prüfung vor dem Hochladen. Alternativ per Dateiauswahl oder Enter auf der Upload-Fläche.
- PNG/JPG/WebP über die bestehende Medienverwaltung hochladen. Bis zu 16 eigene Bildvarianten pro Bundle; Originalbild bleibt unverändert. Die Akzentfarbe kann aus den tatsächlichen Bildpixeln bestimmt werden.
- Textbereich mit Maus/Touch verschieben und an der Ecke skalieren; alternativ Prozentfelder und Pfeiltasten. Größe, Texte, Schriftgröße, Schriftfarbe, Zahlen und Timer-Dauer einstellen.
- Kamerarahmen schneiden eine einstellbare rechteckige Fläche transparent aus.
- Bis zu 32 Elemente pro Bundle. Starter-Set mit Kamera, Countdown, Ziel, Alert, Startscreen und Namensleiste.
- Speicherung pro Benutzer mit Versionskontrolle. OBS-Browser-Quelle mit beständiger Adresse; die Ausgabe übernimmt gespeicherte Änderungen und manuelle Steuerung etwa jede Sekunde.
- HTML-Export eines Elements oder des Bundles mit eingebetteter Bildvorlage und eigenen Bedienelementen. Offline-HTML ist eine eigenständige Kopie, keine Fernbedienung der Server-Ausgabe.
- Admins veröffentlichen kostenlose Vorlagen als getrennte Momentaufnahme im Maker-Shop und können sie wieder entfernen. Nutzer kopieren sie mitsamt eigenen Medienreferenzen und bearbeiten unabhängig vom Original.

## Server starten / aktualisieren

1. Das Projekt wie bisher mit seiner bestehenden PostgreSQL-Datenbank und den vorgesehenen Umgebungsvariablen betreiben; `README.md` und die vorhandene Deployment-Konfiguration beachten.
2. Abhängigkeiten wie bisher über `npm ci` installieren und mit `npm start` starten. Diese Erweiterung führt keine zusätzlichen Laufzeit-Abhängigkeiten ein.
3. Die Datenbank-Schemaversion ist von 79 auf 80 angehoben. Der bestehende Bootstrap legt `creator_stream_maker` mit Benutzerbezug, Konfiguration, Version, Ausgabetoken und Veröffentlichungs-Momentaufnahme an. Vor einem produktiven Update das übliche Datenbank-Backup erstellen.
4. Als Creator anmelden, Maker öffnen, Bild hochladen oder Startvorlage wählen, Elemente hinzufügen, speichern.
5. „OBS-Quelle kopieren“ verwenden; in OBS eine Browser-Quelle mit den im Maker angezeigten Pixelmaßen anlegen. Maker geöffnet lassen, wenn du Werte oder Timer manuell steuern willst. Laufende Timer laufen auf Basis der gespeicherten Startzeit weiter.
6. Als Admin: unter „Meine Bundles“ Rechte bestätigen und das aktuelle gespeicherte Bundle veröffentlichen. Im Shop erscheint die Vorlage zusätzlich zu den vorhandenen Produkten.

## Wichtige Grenzen

- Dies ist ein Bild-zu-Widget-Editor mit funktionierenden manuellen Widgets. Er erkennt keine Bildschichten, generiert keine neuen Bildteile per KI und verformt einen vorhandenen Rahmen nicht automatisch passend. Das Original wird proportional eingepasst; Textbereich und Kamera-Ausschnitt sind einstellbar.
- Follower-/Sub-Ziele und Alerts in diesem Maker werden manuell gesteuert. Automatische Twitch-/TikTok-/YouTube-Ereignisse der bestehenden Suite sind noch nicht an die neue Maker-Ausgabe angeschlossen.
- Maker-Shop-Vorlagen sind kostenlos. Der bestehende Shop und seine Zahlungs-/Berechtigungslogik bleiben erhalten; für die neuen Vorlagen ist kein kostenpflichtiger Checkout implementiert.
- HTML-Export öffnet Bedienknöpfe im Browser. Eine exportierte Datei kann mit `?output` ohne Bedienleiste angezeigt werden, hat dann aber keine externe Steuerung. Für OBS mit Steuerung aus dem Maker die gespeicherte Browser-Quelle verwenden.
- Eine Bundle-HTML-Datei zeigt Elemente untereinander. Für getrennte Platzierung in OBS jedes Element über seine eigene Quelle einbinden.
- Die Ausgabe-Adresse enthält einen zufälligen Zugriffstoken und sollte wie eine private Browser-Source-Adresse behandelt werden.

## Prüfstand

Ausgeführt:

- `npm run check:stream-maker`: **21 Prüfungen bestanden**. Modell, Countdown/Stopwatch, Zähler, Datenbereinigung, alle 208 Design-/Elementkombinationen über den Renderer-Vertrag, Benutzer-/Adminschutz, Versionskonflikt, Medienbesitz, Veröffentlichungs-/Kopie-Isolation, Steuerung und Export-Skriptsyntax. API/Datenbank sind in diesem Test simuliert; es ist kein PostgreSQL-Integrationstest.
- `node tools/stream-maker-drop-test.cjs`: bestanden (Dateiformate/-größen, Mehrfachimport-Limit, verschachtelte Drag-Ereignisse, Ablage, Text-Drag, Escape und Aufräumen der Ereignisbehandlung).
- `node --check` für Server und neue JavaScript-Dateien: bestanden.
- `node tools/universal-builder-v203-test.mjs .`: **20/20 bestanden**.
- Ältere Converter-Prüfung: **64/65**, älterer Shop-Test: **93/100**. Dieselben Fehler sind bereits im unveränderten hochgeladenen Ausgangsprojekt vorhanden (historischer Schemawert, erwarteter alter Shop-Text, fehlende ältere Dokumente). Keine neuen Fehler in diesen Prüfungen.

Nicht ausgeführt: echter PostgreSQL-Start/Migration, angemeldeter Ende-zu-Ende-Test, OBS-Verbindung und visuelle Browserprüfung. In der Arbeitsumgebung war kein Chromium installiert; der Installationsversuch lieferte kein gültiges Browserarchiv. Vor einem produktiven Einsatz bitte den beschriebenen Ablauf mit einem Testkonto und OBS prüfen. Es wurde nichts auf deinen produktiven Server hochgeladen.

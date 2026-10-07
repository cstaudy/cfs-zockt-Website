# Cut Studio – Update 3.20.43

Website 3.20.43, Launcher-Quellcode 0.47.31, Datenbankschema 80.

## Neu und verbessert

- Lokale Videovorschau im Cut Studio: Datei auswählen oder hineinziehen, Position suchen, Clip auswählen, Start/Ende am Video setzen und Ausschnitt abspielen. Kein Video-Upload.
- Beim Erstellen eines Exportauftrags werden die sichtbaren Clip-Eingaben zuerst gespeichert. Ein Speicherfehler verhindert den Auftrag.
- Der Launcher prüft vor dem Start Quelldatei, Videolänge und Schnittbereiche. Parallele Exportstarts werden abgefangen.
- Laufenden lokalen Export im Launcher abbrechen. Der Auftrag wird als fehlgeschlagen mit Abbruchhinweis geführt und lässt sich erneut exportieren. Bereits erzeugte Teildateien bleiben lokal; beim Wiederholen werden gleichnamige Ausgaben ersetzt.
- Stummgeschaltete Musik-, Voiceover- und SFX-Spuren erfordern keine ungenutzten Quelldateien mehr.

## Ablauf

1. Cut-Projekt öffnen, lokale Videodatei in die Vorschau ziehen und vorhandenen Clip auswählen.
2. Start/Ende setzen, Ausschnitt ansehen und Exportauftrag erstellen.
3. Im verbundenen Launcher dieselbe Videodatei dem Projekt zuordnen und lokal exportieren.
4. Ergebnisordner öffnen; bei Bedarf abbrechen und anschließend erneut exportieren.

Die Browservorschau zeigt die Quelldatei, nicht das fertige Compositing mit Musik, Captions und Effekten. Browser-Codecs können die Wiedergabe begrenzen. Die Dateiauswahl im Browser ersetzt nicht die lokale Dateizuordnung im Launcher.

## Geprüft

- Echter FFmpeg-Export unter Linux: zwei Clips und ein Reel, jeweils Video/Audio, Abmessungen, Laufzeit und vollständiges Dekodieren mit FFmpeg/FFprobe.
- Tatsächlicher Prozessabbruch und anschließender erfolgreicher Export.
- Fehlende Datei und außerhalb der Quelle liegende Schnittzeiten werden abgewiesen.
- Stumme Zusatzspuren exportieren ohne zusätzlich zugeordnete Dateien.
- Workflow-Test: Clip-Felder werden vor dem Export gespeichert; Speicher-/Bereichsfehler verhindern den Auftrag.
- Bestehender Media-Engine-Test mit simuliertem FFmpeg sowie Syntaxprüfungen.

## Noch für die Freigabe erforderlich

Der Windows-Launcher muss aus den aktualisierten Quellen gebaut und installiert werden. Dieses ZIP enthält keine fertige EXE. Ein Website-Update allein aktualisiert einen bereits installierten Launcher nicht.

Browser-Bedienung, Windows-Build und der vollständige Ablauf mit angemeldetem Creator, laufendem Backend und lokalem Launcher wurden hier nicht live geprüft. Auch die gesamte Kombination aller vorhandenen Effekte, Hardware-Encoder und Audiooptionen wurde nicht getestet. Deshalb ist dies ein getestetes Entwicklungsupdate, keine bestätigte vollständige Produktionsfreigabe.

# CFS CUT Studio · Reference Learning v47

Status: **FOUNDATION COMPLETE / MULTI-GAME READY**

## Ziel

Reference Learning ist nicht auf Dead by Daylight fest verdrahtet. CUT speichert pro Projekt ein Spielprofil und bis zu acht öffentliche YouTube-Referenzen. Referenzen liefern ausschließlich allgemeine Editing-Muster wie Hook-Zeitpunkt, Short-Länge, Action-Dichte, Pacing und Vor-/Nachlauf. Sie sind **niemals semantischer Beweis** dafür, dass ein Ereignis im eigenen Clip vorhanden ist.

## Spielprofile

- Generic Gameplay
- Dead by Daylight
- FPS / Shooter
- Battle Royale
- Sports / Racing
- Sandbox / Survival

Weitere Spiele können später über neue Profile ergänzt werden, ohne das Grundmodell zu ändern.

## Sicherheitsregeln

- ausschließlich direkte öffentliche YouTube-Video-/Shorts-URLs
- maximal acht Referenzen pro Projekt
- nicht analysierte Referenzen bleiben `pending` und beeinflussen keine Kandidaten
- nur strukturierte, sanitierte `analyzed`-Ergebnisse fließen in das Lernprofil ein
- Referenzdaten dürfen nur kleine editorielle Boosts liefern
- Kategorie-/Event-Boosts gelten nur, wenn das Ereignis bereits durch die Analyse des **eigenen** Clips belegt wurde
- Referenzlernen kann niemals eine Kategorie/Ereignisbehauptung erzeugen
- fremde Videodateien werden nicht in das CFS-Projekt kopiert

## Provider-Trennung

Der Kern kennt keinen festen AI-Anbieter. Ein späterer Gemini- oder anderer Provider kann ein strukturiertes Analyseergebnis über die geschützte Launcher-Bridge einreichen. Der Server sanitisiert das Ergebnis erneut und speichert nur das normalisierte Lernprofil. Damit kann ein Provider gewechselt werden, ohne CUT Studio oder die Kandidatenlogik neu zu bauen.

## Stand

- `cut47:check`: **36/36 PASS**
- Project Regression: **65/65 PASS**
- bestehende CUT Media-/Export-Testkette v29–v36: **PASS**
- keine reale Gemini-/YouTube-Analyse aus dieser Umgebung behauptet
- keine fremden Videos heruntergeladen

Der nächste CUT-Schritt ist die sichere Provider-Ausführung und danach der allgemeine CUT-Studio-Abschluss.

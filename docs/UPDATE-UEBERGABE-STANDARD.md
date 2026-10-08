# CFS ZOCKT · Update-Übergabe-Standard

Ab Version 3.20.57 gehört zu **jedem** neuen Update eine Datei `UEBERGABE-<Version>.md`.
Sie ist der verbindliche Übergabepunkt für die nächste Arbeitsrunde und darf nicht durch Chatverlauf ersetzt werden.

## Pflichtinhalt jeder Übergabe

1. **Release-Kopf**
   - Basisversion
   - Zielversion
   - Website/Backend-Version
   - Datenbankschema
   - Launcher-Version
   - Status: `IN ARBEIT`, `CODE READY`, `ALL TESTS READY`, `BETA ABGENOMMEN`
2. **Ziel des Updates**
3. **Geänderte Bereiche**
4. **Bewusst nicht geändert**
5. **Teststatus**
   - ausgeführte Befehle
   - PASS/FAIL/HOLD
6. **Externe/Manuelle Acceptance**
   - was noch auf Windows/OBS/Provider/Browser real geprüft werden muss
7. **Einbau und Konfliktschutz**
8. **Bekannte offene Punkte / Risiken**
9. **Nächster Arbeitsblock**
10. **Wichtige Dateien / Einstiegspunkte**

## Regeln

- Keine Aussage `BETA ABGENOMMEN`, solange Pflichtpunkte der realen Acceptance offen sind.
- Ein grüner Code-/Contracttest ist kein Ersatz für Windows-, OBS-, Provider- oder Soak-Acceptance.
- Keine Secrets, Tokens, Stream-Keys, OBS-Passwörter oder personenbezogenen Pfade in Übergaben aufnehmen.
- Eigene Nutzeränderungen dürfen durch Delta-Installer nicht still überschrieben werden.
- Die Übergabe muss den nächsten Entwickler ohne weitere Gesprächshistorie arbeitsfähig machen.

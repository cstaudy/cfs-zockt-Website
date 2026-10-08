# Einbau · CFS Zockt 3.20.59

Voraussetzung: **unveränderte 3.20.58-Quelldateien** oder bewusst gemergte eigene Anpassungen.

1. Projekt sichern und das Update entpacken.
2. `node install-update.cjs --check /pfad/zur/cfs-zockt-Website`
3. Bei Konflikt: Dateien anhand der Übergabe gezielt mergen; **keine fremden Änderungen überschreiben**.
4. `node install-update.cjs --apply /pfad/zur/cfs-zockt-Website`
5. Im Projekt: `npm run check:v32059`
6. Im Browser: Login → Widget Studio → Bildumwandler → eigenes Bild → Motiv → Prisma / Ribbon / Glass → Erstellen → Preview → Live-Daten prüfen; anschließend Logo-Modus testen.

Keine DB-Migration, keine Änderung am Launcher. Reale Twitch-/OBS-Checks sind davon getrennt und bleiben offen.

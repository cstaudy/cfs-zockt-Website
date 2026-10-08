# Einbau CFS Zockt 3.20.60

**Voraussetzung:** 3.20.59-Archiv als Basis. Eigenes Repo vorher vollständig sichern; keine eigene Arbeit blind überschreiben.

## Sichere Delta-Installation

1. Update-ZIP entpacken.
2. `node install-update.cjs --check /pfad/zum/cfs-zockt-Website`
3. Bei `CONFLICT`: betroffene Datei händisch vergleichen/mergen, **nicht** force-überschreiben.
4. `node install-update.cjs --apply /pfad/zum/cfs-zockt-Website`
5. `npm run check:v32060`
6. Realen Twitch-/TikTok-/YouTube-/Windows-/OBS-Acceptance-Plan in `UPDATE-3.20.60.md` befolgen.

Der Installer arbeitet mit Quell- und Ziel-SHA256; vor dem Schreiben werden **alle** Kandidaten geprüft. Alte Dateien werden unter `.cfs-backups/3.20.60/` gesichert. Ein zweiter Durchlauf erkennt vorhandene Ziel-Hashes und überschreibt sie nicht. Keine Datenbankmigration und kein Launcher-Build.

**Hinweis:** `npm run check:v32059` ist mit dem gelieferten Quell-ZIP aufgrund fehlender älterer Testdateien derzeit nicht vollständig ausführbar. `check:v32060` umfasst daher gezielte gültige Provider-, Renderer-, UI- und Motiv-Regressionen, ohne vollständige Abnahme vorzutäuschen.

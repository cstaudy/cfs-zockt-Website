# RC Freeze v195

v195 versiegelt den Stand nach v192 für die reale Acceptance. Wegen bereits vorhandener historischer Dateien mit den Namen v193/v194 wird die aktuelle Linie bewusst als v195 fortgesetzt.

## Freeze-Regel

Der SHA-256-Tree in `reports/rc-freeze-v195.json` umfasst Runtime und Acceptance-Tooling: Server, Root-Pakete, `.env.example`, Render-Blueprint, `.github`, Launcher, `lib`, `ops`, `public` und `tools`. Mutable Testevidence unter `reports/`, `evidence/` und `launcher/reports/` ist ausgenommen.

Ändert sich eine versiegelte Datei, liefert `npm run freeze195:verify` DRIFT und der Kandidat darf nicht weiter abgenommen werden.

## Recovery

`npm run freeze195:recovery` führt einen lokalen Artifact-Rollback-Drill auf temporären Kopien kritischer Versions-/Runtime-Dateien aus. Das ersetzt keinen echten Render-/DB-Recovery-Drill, beweist aber, dass Update-Drift erkannt und der lokale bekannte Stand bytegenau wiederhergestellt wird.

## Acceptance-Grenze

`reports/rc-fixed-baseline-v195.json` bestätigt nur eine feste, unveränderte Basis. Es ist kein Realtest-PASS. Die reale Matrix bleibt bis zur Hardware-/Provider-Abnahme auf HOLD.

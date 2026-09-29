# cfs_zockt Creator Suite — technische Fertigstellungsreihenfolge

## Phase A — Kernsystem (aktuell)
- Widget Studio: Speichern, Publish, Runtime, Konfliktschutz, Creator-Isolation.
- Launcher: Device Link, signierte Bridge, Replay Guard, Heartbeat, Game-/LIVE-Präsenz.
- Stream Studio: versionierter Backend/Launcher-Vertrag, lokale Capture-/Encoding-Engine, lokale verschlüsselte Zugangsdaten.

## Phase B — OBS
- Browser-Source-Kompatibilität und Doctor festigen.
- Danach optionale OBS-WebSocket-Verbindung mit minimalen Berechtigungen.
- Keine OBS-Passwörter/Secrets in der Cloud speichern.
- Szenen-/Source-Aktionen müssen explizit und widerrufbar sein.

## Phase C — Twitch
- Provider-Adapter + OAuth/Account-Verbindung getrennt von Stream-Key-Handling.
- Least-Privilege Scopes.
- Token-Rotation, Trennung/Widerruf und klare Fehlerzustände.
- Streaming-Output bleibt lokal im Launcher.

## Phase D — Multistream
- Pro Ziel eigener Status, Reconnect und Fehlerbudget.
- `isolate_destination`: ein kaputtes Ziel beendet nicht automatisch alle anderen.
- Upload-Budget, Encoderlast und Ziel-Limits vor Start prüfen.
- Langzeit-Soak mit Paketverlust/Reconnect/Provider-Ausfall.

## Release-Prinzip
Neue Provider werden erst als `bereit` markiert, wenn Funktion, Recovery, Security, Reconnect und echte Abnahme zusammen bestehen. UI-Roadmap und Backend dürfen keinen Provider als produktionsfertig darstellen, solange diese Gates offen sind.

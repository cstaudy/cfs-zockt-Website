# SECURITY BASELINE v158

v158 ist ein UX-/Informationsarchitektur-Release innerhalb des Feature Freeze.

## Unveränderte Sicherheitsgrenzen

- Stream-Keys und Ingest-Credentials werden nicht in PostgreSQL gespeichert.
- Secrets werden nicht in Browser-State, URLs, Logs oder Support-Exports gelegt.
- Twitch, TikTok und YouTube bleiben provider-isoliert.
- OBS, Capture, lokale Media Engine und Stream-Credentials bleiben Launcher-lokal.
- SafeStorage bleibt die lokale Credential-Grenze.
- Bridge Auth, HMAC, Nonce/Replay-Schutz und `no-store` bleiben erhalten.
- Ein Zielausfall darf andere Multistream-Ziele nicht beenden.

## v158 Änderung

Geändert wurden ausschließlich sichtbare Gruppierung, Navigation, Hilfetexte, responsive UI-Regeln, Versionsmetadaten und Regressionstests.

Es wurden keine neuen Secret-Flows und keine neuen Provider-Berechtigungen eingeführt.

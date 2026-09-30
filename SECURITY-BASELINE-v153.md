# SECURITY BASELINE v153 — Provider Stream Target Import

v153 ergänzt den Multistream-Provider-Import, ohne die bestehende Secret-Grenze Cloud ↔ Launcher aufzuweichen.

## Erhaltene Sicherheitsinvarianten

- keine Stream-Keys in PostgreSQL
- keine Stream-Keys im Browser oder Website-State
- keine Stream-Keys in URLs, Querystrings oder OAuth-Handoffs
- keine Stream-Keys in Support-Exporten
- kein Cloud-Relay
- Launcher SafeStorage bleibt alleiniger persistenter Credential-Speicher
- Bridge-POSTs bleiben HMAC-signiert und replay-geschützt
- Secret-Antworten sind `no-store` / `no-cache`
- Twitch/TikTok Provider-Beta bleibt serverseitig erzwungen
- Creator-Isolation erfolgt über die creator-gebundene Bridge und provider-eigene Account-Zuordnung
- Provider-/Zielausfälle bleiben vom vorhandenen Multistream-Failure-Policy-Vertrag `isolate_destination` getrennt

## Twitch

`channel:read:stream_key` ist getrennt von den EventSub-Pflichtscopes. Ein fehlender Stream-Key-Scope setzt ausschließlich das Streaming-Ziel auf Re-Auth; EventSub wird nicht künstlich als nicht bereit markiert.

## YouTube

Öffentliche Kandidaten enthalten nur Stream-ID, Titel und Status. `cdn.ingestionInfo.streamName` wird erst im expliziten Launcher-Import gelesen und unmittelbar an den lokalen Credential Store weitergereicht.

## TikTok

Automatischer Stream-Key-Import bleibt absichtlich deaktiviert. v153 implementiert keine Zugangs- oder Plattformumgehung.

## Validierung

`stream-provider-targets-v153-test.mjs`: **45/45 PASS**.

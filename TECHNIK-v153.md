# TECHNIK v153 — CFS Studio Provider → Streaming-Ziel Zusammenführung

**Status:** CODE COMPLETE / LOCAL CONTRACTS PASS / EXTERNAL ACCEPTANCE OPEN  
**Backend:** 3.19.0  
**Schema Generation:** 72  
**Launcher:** 0.47.25

## Ziel

Ein bereits verbundener Creator-Provider kann ein lokales Multistream-Ziel vorbereiten, ohne dass Stream-Credentials in PostgreSQL oder im Browser gespeichert werden. Secrets werden nur auf ausdrückliche Launcher-Anfrage über die authentisierte Bridge geliefert und anschließend direkt lokal mit Electron/Windows SafeStorage verschlüsselt.

## Twitch

- zusätzlicher OAuth-Scope ausschließlich für das Streaming-Ziel: `channel:read:stream_key`
- EventSub-Readiness bleibt davon getrennt; fehlender Stream-Key-Scope blockiert Chat/Follows/Subs/Bits nicht
- eigener Stream-Key über `GET https://api.twitch.tv/helix/streams/key?broadcaster_id=...`
- `broadcaster_id` muss der mit dem User-Token verbundenen Twitch-ID entsprechen
- offizieller Twitch-Ingest-Katalog über `https://ingest.twitch.tv/ingests`
- fail-safe Ingest-Fallback ohne Creator-Secret: `rtmp://ingest.global-contribute.live-video.net/app`
- vorhandene Twitch-Verbindungen ohne neuen Scope werden als `reauth_required` ausgewiesen

## YouTube

- Scope bleibt bewusst `https://www.googleapis.com/auth/youtube.readonly`
- aktive und kommende eigene Broadcasts werden gelesen
- `contentDetails.boundStreamId` wird genutzt, um gebundene Streams zu priorisieren
- zusätzlich werden eigene wiederverwendbare `liveStreams` gelesen
- bei mehreren Kandidaten muss der Creator im Launcher auswählen; es wird nicht still ein beliebiger Stream übernommen
- Ingest bevorzugt `cdn.ingestionInfo.rtmpsIngestionAddress`, sonst `ingestionAddress`
- `streamName` wird ausschließlich als Secret im Bridge-Importpfad verwendet und nicht in Website-/Status-Kandidaten ausgegeben
- wenn YouTube LIVE nicht freigeschaltet ist, wird `live_not_enabled` statt eines erfundenen Ziels geliefert

## TikTok

- automatischer Credential-Import bleibt deaktiviert
- nur offiziell vom Creator erhaltene Server-URL + Stream-Key dürfen lokal eingetragen werden
- kein Scraping, keine Umgehung von TikTok-LIVE-/Encoder-Zugangsregeln
- bestehende TikTok/Twitch Private-Beta-Gates bleiben aktiv

## Bridge / Secret Handling

Neue Launcher-Bridge-Endpunkte:

- `GET /api/bridge/stream-studio/provider-targets/:provider`
- `POST /api/bridge/stream-studio/provider-targets/:provider/import`

Eigenschaften:

- Bridge-Bearer-Authentisierung
- mutierende POST-Anfrage weiterhin HMAC-signiert
- Timestamp + Nonce / Replay-Schutz über vorhandenen Bridge-Vertrag
- `Cache-Control: no-store`
- `Pragma: no-cache`
- keine Stream-Keys in URLs
- keine Stream-Keys in PostgreSQL
- keine Stream-Keys im Browser-/Stream-Studio-State
- `server_storage: "none"`
- `credentials_persisted_server_side: false`
- Launcher übernimmt das Secret direkt in `StreamCredentialStore` / SafeStorage
- öffentliche Launcher-/Website-Zustände enthalten nur Status/Metadaten, nie `stream_key`

## CFS Studio UX

Die Website erhält nur `provider_targets` ohne Credentials. Verbundene Twitch-/YouTube-Accounts werden als **ACCOUNT VERBUNDEN · LAUNCHER-IMPORT** angezeigt. Twitch weist einen fehlenden Stream-Key-Scope separat als Re-Auth aus. TikTok bleibt als zugangsabhängiges/manuelles Encoder-Ziel sichtbar.

## Lokale Verifikation

- `npm run release:v153` → **PASS** (aktiver kompletter v153-Release-Gate)
- `node tools/stream-provider-targets-v153-test.mjs .` → **45/45 PASS**
- `node tools/project-small-regression-check.mjs .` → **30/30 PASS**
- `node tools/twitch-runtime-hardening-v148-test.mjs .` → **20/20 PASS**
- `node tools/provider-beta-access-v151-test.mjs .` → **20/20 PASS**
- `node tools/multistream-pass21-9-test.mjs .` → **70/70 PASS**
- `node tools/website-hardening-v150-test.mjs .` → **35/35 PASS**
- `node tools/legal-privacy-private-beta-test.mjs .` → **26/26 PASS**
- `node tools/widget-studio-30s-ux-test.mjs .` → **40/40 PASS**
- `node --check server.js` → **PASS**

Der im ursprünglichen kumulativen Paket fehlende `tools/youtube-integration-v149-test.mjs` wurde als echter statischer Vertrag gegen die vorhandene YouTube-Implementierung rekonstruiert und läuft **41/41 PASS**. Die separat erwartete Launcher-Testdatei `launcher/tools/stream-credential-store-test.mjs` fehlt weiterhin; SafeStorage-/Credential-Verhalten ist deshalb zusätzlich über den vorhandenen v153-Contract und die bestehende Implementierung abgedeckt. Für diese fehlende Datei wird kein PASS behauptet. `release:v153` nutzt die vorhandenen aktuellen Gates. Die YouTube-v153-Zielzusammenführung wird zusätzlich vom 45-Punkte-v153-Contract geprüft.

## Noch offen

Keine reale Provider-/Windows-/OBS-Acceptance wird durch v153 behauptet. Offen bleiben insbesondere Twitch LIVE, YouTube LIVE nach vollständiger Google-OAuth-Einrichtung, TikTok Encoder-Zugang, 2+ parallele Ziele, Netzwerkverlust/Reconnect, Launcher-Neustart, Bandbreitengrenzen und längere Soak-Tests.

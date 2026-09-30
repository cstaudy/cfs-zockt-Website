# Creator Suite Completion v153

**Status: PROVIDER STREAM TARGET MERGE CODE COMPLETE / FEATURE-FREEZE PREP NEXT**

- Twitch Creator-Verbindung kann den eigenen Stream-Key über den offiziellen Scope `channel:read:stream_key` an den authentisierten Launcher übergeben.
- Twitch-Ingest wird aus dem offiziellen Ingest-Katalog ermittelt; EventSub-Scopes bleiben unabhängig.
- YouTube kann mit unverändertem `youtube.readonly` vorhandene eigene LiveStream-/Ingest-Daten lesen.
- Bei mehreren YouTube Streams erfolgt eine bewusste Launcher-Auswahl.
- TikTok bleibt strikt bei offiziell bereitgestelltem Encoder-/Stream-Key-Zugang und ohne automatischen Credential-Import.
- Custom RTMP bleibt manuell lokal.
- Stream-Credentials werden nicht in PostgreSQL oder Browser-State gespeichert; persistiert wird ausschließlich lokal verschlüsselt im Launcher.
- CFS Studio zeigt Provider-Zielbereitschaft ohne Secrets an.
- kompletter aktiver `npm run release:v153` Gate: **PASS**.
- v153 Provider-Target-Contract: **45/45 PASS**.
- allgemeine lokale Projekt-Regression: **30/30 PASS**.
- Provider-Beta v151: **20/20 PASS**; Multistream-Core: **70/70 PASS**.
- rekonstruierter YouTube-v149-Vertrag: **41/41 PASS**
- reale Windows-/OBS-/Provider-/Multistream-/Soak-Acceptance bleibt wie geplant offen.

**Nächster Block:** CFS Studio Feature Freeze vorbereiten → Beta-Test-Handbuch fertigbauen → danach gebündelte echte Tests.

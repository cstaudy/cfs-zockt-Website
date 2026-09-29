# TECHNIK v139 — Creator Suite Core zuerst

## Ziel
Der wichtigste Pfad wird vor weiteren Integrationen stabilisiert: **Widget Studio → Launcher → Stream Studio → lokale Engine → Streaming-Ziele**.

## Neu
- Launcher **0.47.16**.
- Stream-Studio-Protokoll **6**.
- Expliziter Backend/Launcher-Kompatibilitätsvertrag.
- Der Launcher verweigert den Stream-Studio-Startvertrag, wenn:
  - der Vertrag fehlt,
  - das Protokoll neuer ist als unterstützt,
  - erforderliche Launcher-Fähigkeiten fehlen,
  - Stream-Zugangsdaten nicht als `launcher_local_encrypted` deklariert sind.
- Cloud-Speicherung von Stream-Keys ist im Vertrag ausdrücklich deaktiviert.
- Launcher meldet nur nicht-geheime Integrations-Metadaten an die Creator Suite:
  - LIVE-Provider Status,
  - Interactive-Games Runtime,
  - ob lokale Secret-Verschlüsselung verfügbar ist und wie viele Ziele konfiguriert sind,
  - OBS Browser-Source Doctor verfügbar/nicht verfügbar.
- `/api/creator/suite-readiness` bewertet den Kernpfad ohne Secrets offenzulegen.

## Reihenfolge der weiteren Entwicklung
1. Widget Studio + Launcher Kernpfad festigen.
2. OBS-Integration vertiefen (Browser Source zuerst, WebSocket-Steuerung danach).
3. Twitch-Verbindung sauber als Provider-Integration ergänzen.
4. Multistream mit echten Ziel-spezifischen Reconnect-/Fehlerfällen abnehmen.
5. Weitere Provider erst danach.

## Nicht als fertig behauptet
- OBS WebSocket ist noch kein fertiger Produktionsbaustein.
- Twitch Account/OAuth ist noch kein fertiger Produktionsbaustein.
- Multistream hat bereits lokale Engine-/Zielstruktur, benötigt aber weiterhin reale Langzeit-/Netzwerk-/Provider-Abnahmen.

## Lokale Prüfungen
- Creator Suite Core v139: 14/14 PASS
- Creator Suite Release Gate v138: 14/14 PASS
- Technical Foundation v136: 19/19 PASS
- server.js / Launcher / Frontend Syntax: PASS

# TECHNIK v144 — Launcher Provider Connect

## Ziel
v144 verschiebt den wichtigsten Creator-Account-Link direkt in den Launcher. TikTok und Twitch koennen vom bereits gekoppelten Launcher aus verbunden werden, ohne OAuth-Tokens oder Provider-Secrets in den Launcher-Renderer zu verlagern. Gleichzeitig bleibt die technische Wahrheit sichtbar: Account-OAuth und LIVE-Event-Bereitschaft sind unterschiedliche Zustaende.

## Launcher UX
Neu im Startbereich:
- **TIKTOK VERBINDEN**
- **TWITCH VERBINDEN**
- Integrationsstatus je Provider
- direkter Zugriff auf das Widget Studio
- Widget-Anzahl / vorhandene Widget-Bibliothek

Nach Start eines OAuth-Flows oeffnet der Launcher den Systembrowser und pollt anschliessend begrenzt die bestehende Creator-Bibliothek, bis die Account-Verbindung sichtbar ist oder der Poll endet.

## Sicherer OAuth-Handoff
Der gekoppelte Launcher darf nicht einfach Creator-Cookies oder OAuth-Secrets uebernehmen. Deshalb nutzt v144 einen kurzlebigen Einmal-Handoff:
1. Launcher authentifiziert sich wie bisher an der Bridge.
2. `POST /api/bridge/integrations/:provider/connect` erzeugt einen kryptographisch zufaelligen Handoff fuer `tiktok` oder `twitch`.
3. Der Server persistiert nur den Hash mit Creator-ID, Provider und Ablaufzeit.
4. Die zurueckgegebene Browser-URL traegt den rohen Handoff ausschliesslich im URL-Fragment.
5. `/pages/launcher-provider-connect.html` liest das Fragment lokal, entfernt es sofort mit `history.replaceState` und sendet Provider + Handoff per geschuetztem POST an `/auth/launcher/integrations/start`.
6. Der Server verbraucht den Handoff genau einmal und startet danach den bestehenden TikTok- oder Twitch-OAuth-Flow mit normalem OAuth-State.

Der Launcher prueft zusaetzlich die Backend-Origin, den exakten freigegebenen Pfad sowie Provider/Handoff-Fragment, bevor `shell.openExternal` aufgerufen wird.

## Geheimnisgrenzen
Nicht an den Launcher-Renderer bzw. nicht als normale URL-Query ausgegeben werden:
- Twitch Access-/Refresh-Token
- TikTok OAuth-Token
- Twitch Client Secret
- TikTok Client Secret
- Launcher Bridge-Key
- OBS-Passwort

Der kurzlebige Handoff ist kein OAuth-Token und wird serverseitig nur gehasht gespeichert.

## Provider Readiness
Die Bridge-Bibliothek liefert jetzt eine begrenzte `integrations`-Zusammenfassung.

### TikTok
- Account verbunden: TikTok-OAuth-Verbindung vorhanden.
- LIVE-Widgets bereit: nur wenn die Launcher-Bridge online ist **und** ein echter TikTok-LIVE-Provider (`tiktool`/`tikfinity`) Health/Events liefert.
- Profil-OAuth allein wird nicht als LIVE-Erkennung oder LIVE-Event-Kanal behandelt.

### Twitch
- Account verbunden: Twitch-OAuth aus v143 vorhanden.
- LIVE-Widgets bereit: **false** in v144.
- `eventsub_implemented=false` bleibt explizit, bis EventSub/WebSocket und die Eventnormalisierung implementiert sind.

Damit koennen statische/manuelle Widgets bereits zusammen mit dem verbundenen Twitch-Account genutzt werden, waehrend Chat/Follow/Sub/Cheer/LIVE-Events nicht vorzeitig versprochen werden.

## Datenbank / Versionen
- Backend: **3.14.0**
- Schema Generation: **69**
- Launcher: **0.47.20**
- neue Tabelle: `launcher_provider_oauth_handoffs`
- Handoff-TTL: 2 Minuten
- abgelaufene Handoffs werden ueber die bestehende OAuth-Cleanup-Routine entfernt.
- Account-Loeschung, Security-Revoke und Provider-Disconnect entfernen zugehoerige Handoffs.

## Lokale Pruefungen
- `node tools/launcher-provider-connect-v144-test.mjs .` → PASS
- `npm run creator-suite144:check` → PASS
- Launcher Release Check 0.47.20 → PASS
- bestehender Twitch-v143-OAuth-Test → PASS
- bestehende Widget-/Launcher-/Scene-/Stream-/Multistream-/Provider-/Live-Health-Regressionsgates → PASS

## Noch offen
- reale Windows Launcher-Abnahme
- realer TikTok-OAuth-Start aus installiertem Launcher
- realer Twitch-OAuth-Start aus installiertem Launcher
- Twitch EventSub WebSocket + Event-Deduplizierung/Reconnect
- echte Twitch Chat/Follow/Sub/Cheer-Widget-Events
- reale TikTok-LIVE-/OBS-/Reconnect-/Soak-Abnahme
- YouTube OAuth und spaetere echte Multistream-Ziele

## Ergebnis
v144 macht die Provider-Verbindung fuer Creator deutlich direkter, ohne die Sicherheitsgrenzen oder Readiness-Semantik zu verwischen. Der naechste Twitch-Runtime-Block bleibt EventSub/WebSocket und die Normalisierung in den vorhandenen Widget-/Multi-Chat-Eventpfad.

# Pass 21.10.6 – Provider Adapter Bridge

## Ziel

Der Multi-Chat und Activity Feed bekommt eine einheitliche, abgesicherte Provider-Grenze. Provider dürfen keine beliebigen Payload-Felder in Cloud/DB einschleusen. Alle LIVE-Events werden im Launcher normalisiert und auf dem Backend erneut validiert.

## Umgesetzt

- gemeinsamer Event-Normalizer im Launcher
- eindeutige `source_provider`-Zuordnung
- TikTool → `tiktok`
- Simulator → `simulator`
- vorbereiteter Adapter-Katalog für Twitch, YouTube und Kick
- Allowlist für Eventtypen: follow, like, gift, share, viewer_update, chat
- Allowlist für Event-Payloads
- Message-, Actor-, Channel- und Event-ID-Limits
- unbekannte Payload-Felder werden verworfen
- Backend validiert die Payload ein zweites Mal
- Multi-Chat kann `source_channel` und `source_event_id` sicher erhalten
- bestehende Event-Spool-, Retry- und Bridge-Mechanismen bleiben erhalten

## Sicherheitsgrenze

Der Launcher ist die Adapter-/Transportgrenze. Plattform-Tokens gehören nicht in den Browser und nicht in normale Stream-Studio-Konfigurationen. Rohpayloads von Drittanbietern werden nicht ungefiltert persistiert.

## Noch offen

Die echten offiziellen Twitch- und YouTube-Verbindungen sowie eine belastbare Kick-Anbindung sind **nicht** als fertig markiert. Dafür müssen die jeweiligen OAuth-/API-Adapter mit echten Testkonten und den aktuell zulässigen Plattform-APIs implementiert und getestet werden. Moderationsaktionen bleiben bis dahin deaktiviert.

## Prüfung

```powershell
npm.cmd run provider-adapters21:check
```

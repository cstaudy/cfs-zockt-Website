# cfs_zockt Technikstand v132

## Warum die Website trotz laufendem TikTok-LIVE "OFFLINE" zeigen konnte
Die offizielle TikTok User-Info-Schnittstelle liefert Profil- und Statistikdaten, aber keinen verlässlichen LIVE-Status für die öffentliche Website. Der bisherige Website-Status kam deshalb aus Creator-Suite-/Launcher-/LIVE-Bridge-Signalen. Wenn der Stream direkt auf TikTok lief, ohne dass ein frisches Bridge-Signal ankam, konnte die Website den Stream nicht sicher erkennen.

Zusätzlich wurde in v132 die Priorität der LIVE-Signale korrigiert: Ein älteres `live_end` darf ein gleichzeitig vorhandenes positives LIVE-Signal nicht mehr überschreiben.

## Neuer Fallback
Im Creator Dashboard gibt es jetzt `WEBSITE LIVE-STATUS`.

- `WEBSITE AUF LIVE SETZEN` markiert die öffentliche Website sofort als LIVE.
- `LIVE BEENDEN` beendet diesen manuellen Fallback wieder.
- Der Fallback läuft aus Sicherheitsgründen automatisch nach maximal 12 Stunden aus.
- Launcher-/TikFinity-/Session-Signale funktionieren weiterhin parallel.
- Es werden keine Zuschauer-, Like- oder Share-Werte erfunden. Ohne echte LIVE-Daten bleiben diese Werte leer/0.

## Neue API
Authenticated Creator API:

- `GET /api/creator/public-live-control`
- `POST /api/creator/public-live-control` mit `{ "active": true|false }`

Die bestehende öffentliche API bleibt:

- `GET /api/public/live-session`
- `GET /api/public/creator-state`

Bei aktivem Dashboard-Fallback liefert die öffentliche LIVE-Quelle `creator_dashboard`.

## Keine neue Render-Konfiguration
Für v132 sind keine neuen Environment-Variablen nötig.

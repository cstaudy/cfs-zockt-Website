# HANDOFF v150 — cfs_zockt Creator Suite

## Aktiver Stand
Backend **3.18.2** · Schema **72** · Launcher **0.47.24** · kumulativer Update-Stand **v151**.

## Schwerpunkt v150
Website-/Backend-Härtung und Bereinigung der aktiven Test-Infrastruktur. Keine neuen YouTube-Funktionen in diesem Block. Die bestehenden TikTok-/Twitch-/YouTube-/OBS-Integrationen bleiben erhalten und provider-spezifisch getrennt.

## Härtung
- TRACE/TRACK/CONNECT werden mit 405 abgewiesen.
- HTTP-Header-Anzahl ist serverseitig begrenzt.
- `X-DNS-Prefetch-Control: off` ergänzt.
- Rate-Limit-429-Antworten werden nicht gecacht.
- Homepage/öffentliche Merch-Seite haben vollständigere Social-/SEO-Metadaten; Sitemap und Canonical-Routen sind synchronisiert.
- Öffentliche Links auf Sicherheit und Status sind sichtbar.
- Aktiver Projekt-Regressionstest verwendet nur vorhandene aktuelle Prüfskripte statt fehlender Legacy-Dateien.

## Teststatus
Lokale Security-/Auth-/Lifecycle-/Recovery-/Provider-/Widget-/Launcher-/Scene-/Stream-/Multistream-Gates werden über `release:v150` gebündelt. Externe Production-Smokes und Online-`npm audit` konnten in der isolierten Umgebung nicht belastbar ausgeführt werden und bleiben für die spätere Acceptance offen.

## Entwicklungsreihenfolge
Der Nutzer möchte zuerst die Plattform feature-seitig fertigstellen und anschließend reale Acceptance-/Soak-/Windows-/OBS-/Provider-Tests durchführen. YouTube-Konfiguration ist aktuell bewusst zurückgestellt. Nach v150 kann der noch offene Multistream-Zielblock fortgeführt werden.

## Paketregel
Jede neue Version bleibt ein **kumulatives Updatepaket, kein Full Project**. Bestehende kumulative Dateien müssen erhalten bleiben; neue/geänderte Dateien werden in aktueller Fassung ergänzt.

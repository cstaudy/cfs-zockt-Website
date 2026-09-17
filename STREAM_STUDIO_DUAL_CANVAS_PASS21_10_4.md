# CFS Stream Studio – Dual Canvas Pass 21.10.4

Stand: 2026-09-17

## Ziel

Eine Scene wird nicht mehr als getrennte 16:9- oder 9:16-Welt behandelt. Beide Formate gehören zu derselben Scene und verwenden dieselben CFS-Quellen. Position, Größe, Rotation, Sichtbarkeit, Ebene und Hintergrund können je Format unabhängig gespeichert werden.

## Umgesetzt

- 16:9- und 9:16-Canvas direkt im integrierten Scene Composer umschaltbar.
- Neue Quellen werden automatisch mit derselben Item-ID in beide Layouts aufgenommen.
- Entfernen einer Quelle entfernt sie aus beiden Layouts, damit die Scene-Quelle konsistent bleibt.
- Transform-Werte werden pro Layout getrennt gespeichert.
- „Positionen ins andere Format kopieren“ skaliert X/Y proportional auf die Zielauflösung und dient als schneller Startpunkt.
- Alte Scene-Konfigurationen werden beim Sanitizing automatisch in das neue Version-2-Schema migriert.
- Öffentliche Scene-Outputs besitzen getrennte URLs für `landscape` und `tiktok_vertical`.
- Der Scene Runtime Renderer wählt ausschließlich erlaubte Layout-Keys und rendert die passende Canvas-Größe und Item-Liste.
- Preview/Program im Stream Studio wählt horizontal oder vertikal anhand des Output-Profils.
- Source Ownership, Publish-Gate und 24-Items-Limit gelten weiterhin serverseitig über beide Layouts.

## Sicherheits- und Stabilitätsregeln

- Layout-Keys sind allowlist-basiert (`landscape`, `tiktok_vertical`).
- Widget-/Source-Ownership wird für alle Layouts geprüft.
- Keine Streamkeys, RTMP-Zugangsdaten oder lokalen Secrets werden durch Dual Canvas in die Cloud-Konfiguration aufgenommen.
- Bestehende Legacy-Scenes bleiben kompatibel und werden proportional gespiegelt statt verworfen.
- Die echte parallele 16:9-/9:16-Encoding-Ausgabe ist noch kein PASS; dieser Pass betrifft Scene-Datenmodell, Editor und Runtime-Varianten.

## Prüfung

```powershell
npm.cmd run dual-canvas21:check
```

Die Hardware-/Encoder-Abnahme für zwei gleichzeitige Videoformate folgt separat auf Windows im Launcher.

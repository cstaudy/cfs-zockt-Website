# cfs_zockt – Public Review Admin Pass

Stand: 15.09.2026

## Umgesetzt

- Review-Moderation direkt im bestehenden Admin Control Center
- Statusfilter: Pending, Approved, Rejected, Alle
- Suche über Nickname, Kommentar und interne Admin-Notiz
- Moderations-KPIs für Gesamt, Pending, Approved, Rejected und Kommentare
- Aktionen: Pending setzen, Freigeben, Ablehnen
- Interne Admin-Notiz bis 1000 Zeichen
- Bestehende Admin-/CSRF-/Trusted-Write-Schutzkette bleibt erhalten
- Keine erfundenen Bewertungen, Prozentwerte oder Kommentare
- Backend-Version bleibt 3.12.0

## Moderationslogik

Strukturierte Rezensionen ohne Freitext dürfen wie bisher automatisch `approved` sein. Rezensionen mit Freitext starten als `pending`. Erst `approved` macht den Text über die bestehende öffentliche Review-Ausgabe sichtbar; `rejected` bleibt öffentlich ausgeblendet.

## Tests

Gezielt ausführen:

```bash
npm run check
node --check public/assets/js/admin-creators.js
npm run security:check
npm run seo:check
npm run funnel:check
npm run reviews:check
```

Keine große Acceptance-, Last- oder LIVE-Test-Suite für diesen Pass starten.

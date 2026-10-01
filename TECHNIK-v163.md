# TECHNIK v163 — Legal Privacy + Search Surface Hardening

- Backend: **3.20.9**
- Schema: **73**
- Launcher: **0.47.29**
- Feature Freeze: aktiv

## Öffentliche Rechtseiten

`impressum.html`, `datenschutz.html` und `nutzungsbedingungen.html` bleiben öffentlich erreichbar und im Footer verlinkt. Sie werden jedoch nicht mehr als normale Suchergebnisse beworben:

- Meta Robots: `noindex,follow,noarchive,nosnippet`
- HTTP `X-Robots-Tag`: identische Vorgabe
- nicht mehr in `sitemap.xml`
- nicht per `robots.txt` gesperrt
- Self-Canonical bleibt erhalten

## Privacy-Audit

Der v163-Gate scannt den öffentlichen Website-Bereich nach E-Mail-Adressen, `mailto:`- und `tel:`-Links. Kontakt-E-Mail und `mailto:` dürfen nur in Impressum, Datenschutz und Nutzungsbedingungen vorkommen. `tel:` kommt im Public-Bereich nicht vor.

## Gate

`npm run legal-public163:check`

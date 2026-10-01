# Security Baseline v163

v163 ändert keine Credential-, OAuth-, Stream-Key-, Session- oder Bridge-Grenzen.

Zusätzliche Privacy-/Search-Surface-Grenzen:

- Rechtseiten bleiben erreichbar, werden aber mit Meta Robots und `X-Robots-Tag` auf `noindex,follow,noarchive,nosnippet` gesetzt.
- Rechtseiten werden aus der XML-Sitemap entfernt.
- `robots.txt` blockiert die Seiten nicht, damit Crawler die `noindex`-Anweisung lesen können.
- öffentliche Kontakt-E-Mail/`mailto:` bleiben auf die drei Rechtseiten begrenzt.
- keine Telefonnummer-Links im Public-Bereich.

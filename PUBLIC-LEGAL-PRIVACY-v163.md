# Public Legal Privacy v163

v163 reduziert die Suchmaschinen-Prominenz der rechtlichen Seiten, ohne ihre öffentliche Erreichbarkeit einzuschränken.

## Verhalten

- Impressum, Datenschutz und Nutzungsbedingungen bleiben direkt und über den Footer erreichbar.
- Diese drei Seiten tragen `noindex,follow,noarchive,nosnippet`.
- Der Server liefert dieselbe Vorgabe zusätzlich über `X-Robots-Tag`.
- Die Seiten werden aus `sitemap.xml` entfernt.
- `robots.txt` sperrt sie bewusst **nicht**, damit Crawler die `noindex`-Anweisung lesen können.
- Self-Canonicals bleiben für stabile direkte URLs erhalten.
- Kontakt-/Anbieteridentität wird nicht auf Marketingseiten dupliziert.

`noindex` ist eine Suchmaschinen-Anweisung und keine Zugriffssperre. Die Rechtstexte bleiben öffentlich erreichbar.

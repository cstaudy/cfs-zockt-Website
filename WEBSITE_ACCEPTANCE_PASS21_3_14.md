# Website Acceptance · Pass 21.3.14

## Ziel

Pass 21.3.14 schließt den strukturellen Website-Aufbau vor der späteren vollständigen Security-/Recovery-Abnahme ab. Geprüft werden Seitenstruktur, interne Links, Anker, Assets, CTA-Wege, Auth-Einstieg, Creator-Navigation, Support-/Security-Wege, Sitemap und zentrale Runtime-Seiten.

## In diesem Pass korrigiert

- ältere Trust-/Account-Start-Regressionen auf der Login-Seite wieder vollständig erhalten
- TikTok-Source-Funnel auf der neuen Startseite wieder eingebunden, standardmäßig verborgen
- Partner-/Affiliate-Fläche weiterhin opt-in, leer und standardmäßig verborgen
- öffentlicher `security.txt`-Prüfpfad wieder direkt von der Startseite erreichbar
- privater Support-/Security-Meldeweg wieder direkt von der Startseite erreichbar
- öffentliche Status-Minimierung transparent erklärt
- Support erklärt wieder ausdrücklich private Verarbeitung und verspricht keine feste Sofort-Reaktion
- zusätzlicher statischer Website-Abnahmetest für Links, Fragmente, Seiten, CTA-Wege, Sitemap und Runtime-Dateien

## Automatische Abnahme

`node tools/website-acceptance-pass21-3-14-test.mjs .`

Der Test prüft unter anderem:

- alle internen statischen `href`/`src`/`action`-Ziele
- alle lokalen Fragment-/Anchor-Ziele
- doppelte HTML-IDs
- öffentliche Hauptseiten und Navigation
- FREE-Start / Login / Registration / Recovery
- zentrale Creator-Suite-Routen
- privaten Support-Meldeweg und `security.txt`
- 404-/500-Seiten, TikTok-Callback und Runtime-Seiten
- Sitemap-Auflösung
- keine aktive Referenz auf das alte `backend-neu`-Repository

## Grenze dieses Passes

Die Repository-/Static-Abnahme ersetzt keine echte Browser- und Production-Abnahme. Nach dem Deploy werden weiterhin echte Klickwege, Login mit bestehendem Account, Sessions, TikTok OAuth, Widget-Ausgabe, Launcher-Verbindung sowie die spätere vollständige Security-/Recovery-Prüfung durchgeführt.

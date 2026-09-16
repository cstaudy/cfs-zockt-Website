# cfs_zockt – Website SEO / Google Pass

Stand: 15.09.2026

## Umgesetzt

- Produktions-Canonical: `https://cfs-zockt.de`
- permanente Canonical-Redirects für `/index.html` und extensionless Varianten der indexierbaren Unterseiten
- eindeutige Seitentitel und Meta Descriptions für die öffentlichen Such-Landingpages
- OpenGraph + große Social Preview Card
- Twitter Card Metadaten als generischer Social-Card-Fallback
- `robots.txt` mit Sitemap-Verweis und Ausschluss von API/Auth/Widget-Runtime
- XML-Sitemap nur mit tatsächlich indexierbaren Canonical-URLs
- interne App-, Login-, Admin-, Studio-, Runtime- und Widget-Seiten mit `noindex,nofollow,noarchive`
- `X-Robots-Tag` zusätzlich auf API/Auth/Widget/Game-Runtime-Endpunkten
- Schema.org JSON-LD auf der Startseite für `Organization`, `WebSite` und die Creator-Suite-Beschreibung als `WebPage`
- CSP-Hash für genau diesen JSON-LD-Block; kein `unsafe-inline` für JavaScript ergänzt
- Web App Manifest und bestehende App-/Favicons eingebunden
- Social Preview Bild 1200×630 aus bestehendem cfs_zockt Branding abgeleitet
- reproduzierbarer Check über `npm run seo:check`

## Bewusst nicht erfunden

- keine Bewertungen oder Sterne in strukturierten Daten
- keine Preise oder Offers für die Creator Suite
- keine Nutzerzahlen
- kein Google-Site-Verification-Token
- keine nicht vorhandenen Social-Profile

Die Creator Suite wird deshalb nicht als Google `SoftwareApplication` Rich Result markiert: Google verlangt dafür u. a. Preis-/Offer-Daten und eine Bewertung oder Review. Solange diese Informationen nicht echt und öffentlich belastbar sind, bleibt das Markup bewusst neutral.

## Indexierbare Seiten

- `/`
- `/pages/support.html`
- `/pages/security.html`
- `/pages/impressum.html`
- `/pages/datenschutz.html`
- `/pages/nutzungsbedingungen.html`

Die Studio-/Dashboard-/Launcher-/Account-/Runtime-Seiten sind Werkzeuge der Anwendung und keine Such-Landingpages. Sie bleiben crawlbar genug, damit `noindex` gelesen werden kann, werden aber nicht in der Sitemap geführt.

## Nach dem Deployment extern erledigen

1. `https://cfs-zockt.de/robots.txt` im Browser prüfen.
2. `https://cfs-zockt.de/sitemap.xml` im Browser prüfen.
3. Canonical-Redirects mit echter Domain testen (`www`, HTTP, `/index.html`, extensionless URLs).
4. Google Search Console Property für `cfs-zockt.de` verifizieren.
5. Sitemap `https://cfs-zockt.de/sitemap.xml` einreichen.
6. Startseite über URL-Prüfung testen und Indexierung beantragen.
7. Startseite mit Rich Results Test prüfen; Organization-Markup kontrollieren.
8. Social Preview über einen externen OpenGraph-Debugger prüfen.
9. Erst nach erfolgreicher realer HTTPS/Subdomain-Prüfung HSTS `includeSubDomains` / Preload separat entscheiden.

## Lokale Prüfung

```bash
npm run check
npm run security:check
npm run seo:check
```

Große Acceptance-, Last- und LIVE-Tests gehören weiterhin nicht zu diesem Pass.

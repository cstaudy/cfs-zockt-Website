# CFS Zockt – Professional UI Refresh

Dieses Paket ist als **Drop-in-Patch mit Projektstruktur** vorbereitet.

## Dateien direkt in GitHub übernehmen

Lade die Dateien aus diesem ZIP **mit exakt diesen Pfaden** in dein Repository `cstaudy/cfs-zockt-Website`.

### Ersetzen
- `public/pages/account.html`
- `public/assets/img/logo-header.png`
- `public/assets/img/brand/cfs-zockt-logo.png`
- `public/assets/img/app-icon.png`
- `public/assets/img/apple-touch-icon.png`
- `public/assets/img/favicon.ico`
- `public/assets/img/social-preview.jpg`

### Neu hinzufügen
- `public/assets/css/account-professional.css`
- `public/assets/js/account-tabs.js`
- `public/assets/img/brand/cfs-zockt-mark.png`

## Was sich ändert

### Account-Seite
Die Account-Seite wird in vier klare Bereiche gegliedert:
1. Übersicht
2. Sicherheit
3. Sitzungen
4. Erweitert

Alle vorhandenen IDs, die `page-account.js` benötigt, bleiben erhalten. Dadurch bleiben Profil, Passkeys, TOTP, Sessions, Export, TikTok-Trennung und Account-Löschung weiterhin mit dem bestehenden Backend verbunden.

### Logos websiteweit
Die bereits im Projekt verwendeten Standard-Logo-/Icon-Pfade werden ersetzt:
- öffentliche Website: `brand/cfs-zockt-logo.png`
- Creator-Suite-Menü: `logo-header.png`
- PWA/App: `app-icon.png`
- Apple Touch Icon: `apple-touch-icon.png`
- Browser-Favicon: `favicon.ico`
- Social/OG Preview: `social-preview.jpg`

Dadurch greifen die bestehenden HTML-Seiten auf das neue Branding zu, ohne dass du jede Seite einzeln umbauen musst.

## Danach
1. Dateien committen.
2. Render deployen.
3. Browser mit `Strg + F5` neu laden.
4. `https://cfs-zockt.de/pages/account.html` prüfen.
5. Startseite und zwei bis drei Creator-Seiten prüfen, damit Logo-Skalierung und Navigation passen.

## Wichtig
`page-account.js` wurde absichtlich nicht ersetzt. Das Paket ändert die Darstellung und Struktur, nicht die bestehende Account-Logik.

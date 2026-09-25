# cfs_zockt – Full Website UI v3

Dieses Paket wurde direkt auf Basis deiner hochgeladenen Projektversion `cfs-zockt-Website-main(8).zip` erstellt.

## Ziel
Die komplette Website bekommt ein einheitliches Erscheinungsbild – nicht nur der Account:

- öffentliches Hauptmenü
- Startseite
- Creator-Suite Marketingseiten
- Login / Registrierung / Recovery / Verifizierung
- Dashboard
- Account
- Einstellungen / Setup / Integrationen / TikTok / Launcher
- interne Creator-Module
- Footer
- mobile Navigation

## Branding

### Original-Logo
`public/assets/img/brand/cfs-zockt-mark-original.png`

Das ist dein hochgeladenes Logo **unverändert**. Es wird per CSS kreisförmig und mit Screen-Blending auf dem dunkelblauen Hintergrund eingebunden. Dadurch wirkt der dunkle Bildhintergrund auf der Website nicht wie ein quadratischer Kasten.

### Markenname
Header und Footer verwenden konsequent:

`cfs_zockt`

- `cfs_` weiß
- `zockt` dunkel-/elektrischblau
- darunter klein `CREATOR SUITE`

## Neue zentrale Dateien

- `public/assets/css/cfs-theme-v3.css`
- `public/assets/js/cfs-shell-v3.js`
- `public/assets/img/brand/cfs-zockt-mark-original.png`
- `public/assets/img/brand/cfs-zockt-wordmark-transparent.png`

## Geänderte HTML-Dateien
Alle normalen Website-Seiten unter `public/` und `public/pages/` wurden nur um das globale Theme und die globale Shell erweitert. Die bestehenden IDs, Formulare und Seitenskripte bleiben erhalten.

Nicht angefasst wurden absichtlich Runtime-/Embed-Flächen wie Widgets, Games-Runtime oder TikTok-Callback, damit OBS-/Overlay-Ausgaben keine Website-Navigation bekommen.

## Creator Navigation
Auf den normalen Creator-Seiten wird eine klare linke Navigation ergänzt. Große Arbeitsflächen wie Stream Studio, Widget Studio, Creator Editor, Scene Studio und Cut Studio bleiben absichtlich full-width und erhalten nur das gemeinsame Branding/Theme.

Auf der Account-Seite steuert die linke Navigation direkt:
- Übersicht
- Sicherheit
- Sitzungen
- Erweitert

Die vorhandene `account-tabs.js` / `page-account.js` Logik bleibt bestehen.

## GitHub
ZIP-Inhalt mit exakt derselben Ordnerstruktur in dein Repository kopieren und vorhandene HTML-Dateien ersetzen.

Danach:
1. Commit / Push
2. Render Deploy
3. Browser: `Strg + F5`
4. Startseite, Login, Dashboard und Account prüfen

## Technische Prüfung
- `cfs-shell-v3.js`: `node --check`
- alle gepatchten HTML-Seiten enthalten Theme + Shell genau einmal
- bestehende Runtime-/Embed-Seiten wurden nicht global umgebaut

# Pass 21.3.1 – Öffentliche Website-Struktur

Stand: 16.09.2026

## Ziel

Die öffentliche Website erhält eine klare Trennung zwischen Marketing-/Produktinformation und den geschützten Creator-Tools.

## Wichtige Architekturentscheidung

Die bestehenden Tool-Seiten wie:

- `/pages/widget-studio.html`
- `/pages/games.html`
- `/pages/launcher.html`
- `/pages/plans.html`
- `/pages/roadmap.html`

bleiben unverändert als bestehende Produkt-/Creator-Seiten. Sie werden in diesem Pass **nicht** in öffentliche Marketing-Seiten umgebaut.

Stattdessen bündelt die neue öffentliche Seite:

- `/pages/creator-suite.html`

folgende Bereiche als Produktübersicht:

- Widget Studio
- Games
- Launcher
- Pläne
- Roadmap
- Sicherheit

Dadurch bleiben bestehende Auth-, Billing- und Creator-Flows erhalten.

## Öffentliche Navigation

- Start
- Creator Suite
- Widgets
- Games
- Launcher
- Pläne
- Roadmap
- Support
- Anmelden / Account
- Kostenlos starten / Dashboard

## Startseite

Hero wurde auf die Creator-Plattform ausgerichtet:

- klare Produktpositionierung
- FREE-Start transparent
- keine automatische Zahlung
- direkter Einstieg in die Creator Suite

Bestehende Produktbeweis-, Community-, Security- und Feedback-Bereiche bleiben erhalten.

## Footer

Die Startseite und neue Creator-Suite-Seite verwenden die neue Vier-Gruppen-Struktur:

1. Produkt
2. Projekt & Hilfe
3. Rechtliches
4. Marke / Social

## SEO

`/pages/creator-suite.html` ist indexierbar und wurde zur Sitemap hinzugefügt.
Die bestehenden internen/noindex Creator-Tool-Seiten bleiben unverändert.

## JavaScript

`public/assets/js/app.js` erkennt öffentliche Login-/CTA-Elemente jetzt seitenübergreifend:

- nicht angemeldet: `ANMELDEN` / `KOSTENLOS STARTEN`
- angemeldet: `ACCOUNT` / `ZUM DASHBOARD`

## Nächster Pass

Pass 21.3.2 vereinheitlicht Header und Footer auf den weiteren öffentlichen Seiten wie Support und Security, ohne interne Creator-Navigation zu überschreiben.

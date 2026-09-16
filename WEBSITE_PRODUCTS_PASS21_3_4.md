# Website Products Pass 21.3.4

Stand: 16.09.2026

## Ziel

Die öffentliche Creator Suite wird als Produktübersicht fertig strukturiert. Pläne und Roadmap werden aus eingebetteten Kurzabschnitten zu eigenen öffentlichen, indexierbaren Seiten.

## Änderungen

- Creator Suite erhält drei klare Einstiege: Widgets, Desktop/Launcher, Community/Games.
- `/pages/plans.html` ist eine öffentliche Produktseite mit FREE als real verfügbarem Einstieg.
- CREATOR 6,99 € und PRO 12,99 € werden ausdrücklich als geplanter Preisstatus dargestellt, entsprechend `creator-plan-policy.js`.
- Checkout wird nicht als aktiv behauptet; Freigabe bleibt an echte Stripe-Konfiguration gebunden.
- `/pages/roadmap.html` trennt Verfügbar, Beta/Ausbau, Preview und Roadmap.
- Die Roadmap hält die vereinbarte Reihenfolge fest: Website fertig bauen, danach vollständige Security-/Recovery-/Production-Abnahme.
- Hauptnavigation und Footer verlinken Pläne und Roadmap als eigene Seiten.
- Sitemap, Canonical Redirects und SEO-Checks wurden erweitert.

## Nicht verändert

- bestehende Auth-/Security-Mechanismen
- Creator Tool Runtime
- Launcher Runtime
- Datenbank- oder Billing-Serverlogik
- Stripe-Konfiguration

## Definition of Done

- Creator Suite besitzt verständliche Einstiegspfade.
- Pläne und Roadmap sind öffentlich, indexierbar und konsistent verlinkt.
- bezahlte Pläne werden nicht künstlich als live dargestellt.
- Produktstatus bleibt auf allen öffentlichen Seiten nachvollziehbar.

# Übergabe – v5 CFS Guide

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Aktueller kumulativer Stand
Enthält:
- Full Website v3
- Beginner Onboarding v4
- CFS Guide v5

## In v5 umgesetzt
### CFS Guide
Ein websiteweiter Creator-Assistent wurde ergänzt.

Eigenschaften:
- Schwebender CFS-Guide-Button unten rechts.
- Responsive Guide-Panel für Desktop und Mobile.
- Verwendet das originale CFS-Logo.
- Kennt die aktuelle Seite und erklärt den Kontext.
- Kann zu Login, Registrierung, E-Mail-Bestätigung, Dashboard, Account, Passkeys, 2FA, Widgets, TikTok, Launcher, Stream Studio, Plänen und Support führen.
- Für angemeldete Nutzer liest er nur ungefährliche Statusdaten:
  - Account angemeldet / E-Mail verifiziert
  - vorhandene Passkeys
  - MFA-Status
- Er entscheidet daraus einen sinnvollen nächsten Schritt.
- Er führt keine sicherheitskritischen Aktionen automatisch aus.
- Keine Passwörter, Tokens oder Secrets werden gelesen oder gesendet.
- Keine externe KI/API: Antworten laufen regelbasiert lokal im Browser.
- Damit entstehen aktuell keine KI-API-Kosten.
- Einmalige sanfte Einführung im Dashboard; danach bleibt nur der kleine Guide-Button.
- Escape schließt den Guide; mobil wird das Panel als kompakte Fläche angezeigt.

## Geänderte / neue Dateien in v5
NEU:
- public/assets/css/cfs-guide-v5.css
- public/assets/js/cfs-guide-v5.js

GEÄNDERT:
- public/assets/js/cfs-shell-v3.js

## Technische Integration
`cfs-shell-v3.js` ist bereits auf den v3-Seiten eingebunden.
Es lädt die CFS-Guide-CSS- und JS-Datei dynamisch genau einmal nach.
Dadurch mussten nicht erneut alle HTML-Dateien geändert werden.

## Sicherheitsgrenzen des Guides
Der Guide:
- nutzt nur GET-/Statusinformationen,
- verändert keine Accountdaten,
- löscht nichts,
- löst keine Zahlungen aus,
- sendet keine Nutzereingaben an einen KI-Anbieter,
- zeigt keine Secrets an.

## Production-Readiness
R59-R61 bleiben abgeschlossen.
R62 bleibt der nächste offene Live-Drill. Der UI-Umbau ersetzt keinen R62-Nachweis.

## Nächster empfohlener Produkt-Update
v6: Guided Actions / Help Center
- sichtbare Hilfetexte direkt an komplexen Formularen,
- „Warum brauche ich das?“-Erklärungen,
- Fehlerzustände mit einer klaren nächsten Aktion,
- Guide und Onboarding stärker mit den konkreten Seiten verbinden.

## Bei neuem Chat
1. Den letzten kumulativen ZIP-Stand hochladen.
2. Diese Datei `handoff/HANDOFF-v5.md` nennen.
3. Sagen: „Bitte ab v5 weiterarbeiten.“

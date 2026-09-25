# Editorial Simplification v36

## Ziel

Die öffentliche Startseite soll cfs_zockt schnell und ruhig erklären: Wer bzw. was hinter dem Projekt steht, welcher Plan verfolgt wird, was angeboten wird, wie ein Einstieg aussieht und warum Community, Ehrlichkeit und Sicherheit zusammengehören.

v36 entfernt keine Produktfunktionen. Detailinformationen bleiben auf Creator Suite, Roadmap, Pläne, Security und Support. Die Startseite wird bewusst zur Orientierung statt zur vollständigen Produktdokumentation.

## Leitstruktur

1. Hero: cfs_zockt und Community-Identität
2. Mein Plan: persönliche Projektidee und drei Grundsätze
3. Was ich anbiete: vier verständliche Produktbereiche
4. Einstieg: ansehen, FREE starten, nur benötigte Verbindungen aktivieren
5. Vertrauen: Status, Security und Datenschutz
6. Community: TikTok, Discord und Support
7. ruhiger Abschluss-CTA

## Dichte-Grenzen

Der v36-Test blockiert eine schleichende Überladung der Startseite. Aktuelles Ziel: höchstens 9 sichtbare Sections, 10 Content-Artikel, 7 H2-Überschriften und 850 Wörter im Main-Bereich.

## Navigation

Auf der Startseite werden Mein Plan, Angebot, Community und Sicherheit priorisiert. Detaillierte Produkt-Shortcuts bleiben im DOM bzw. auf den Unterseiten/Footern verfügbar, werden auf der Startseite aber visuell zurückgenommen.

## Architektur

Kein neuer OS-/Runtime-Layer. `cfs-os-v24` bleibt aktiv. v36 ist in `public/index.html` und der bestehenden konsolidierten `public/assets/css/cfs-ui-v18.css` integriert.

## Evidence

`npm run editorial36:check`

Die Evidence ist lokal/statisch. Ein frischer Chromium-Screenshot konnte in dieser Sandbox nicht belastbar erzeugt werden; daraus wird kein Browser-PASS abgeleitet.

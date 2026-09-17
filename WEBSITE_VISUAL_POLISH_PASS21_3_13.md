# Pass 21.3.13 — Visual Polish & Consistency

## Ziel

Die bestehende Website- und Creator-Suite-Struktur wird visuell vereinheitlicht, ohne API-Routen, IDs, Form-Logik oder Security-Verhalten umzubauen.

## Änderungen

- Gemeinsame Surface-, Border-, Radius-, Shadow- und Text-Tokens ergänzt.
- Containerbreite und vertikaler Seitenrhythmus vereinheitlicht.
- Buttons, Formfelder, Cards, Panels und Notices visuell konsistenter gemacht.
- Hover-, Active- und Disabled-Zustände vereinheitlicht.
- Öffentliche Marketing-Seiten erhalten konsistentere Typografie, Card-Hierarchie und Abschnittsabstände.
- Footer-Lesbarkeit und Linkzustände verbessert.
- Creator Workspace, Tool-Einstiege, Management-Hub und interne Module erhalten denselben visuellen Rhythmus.
- Mobile Abstände, CTA-Stapelung und Card-Padding für 760 px und 520 px nachgeschärft.
- Bestehende Reduced-Motion-, Focus- und High-Contrast-Regeln bleiben erhalten.
- In Pass 21.3.12 versehentlich als Text gespeicherte `\\n`-Sequenzen im Stylesheet wurden in echte Zeilenumbrüche repariert.

## Nicht geändert

- Keine API-Endpunkte.
- Keine Auth-/Session-/CSRF-/MFA-/Passkey-Logik.
- Keine IDs bestehender Controls.
- Keine Plan-/Billing-Aktivierung.
- Keine Produktstatus künstlich hochgestuft.

## Definition of Done

- Shared Visual Tokens vorhanden.
- Öffentliche und interne Oberflächen nutzen konsistente Buttons, Cards und Abstände.
- Mobile Regeln für 980 px, 760 px und 520 px vorhanden.
- Stylesheet enthält keine versehentlichen Literal-`\\n`-Sequenzen.
- Bestehende Website-Regressionstests bleiben grün.

# Website Conviction / Account Start Pass 14

Stand: 15.09.2026

## Ziel

Die öffentliche Website soll vor der Registrierung mehr Vertrauen schaffen, ohne künstliche Nutzerzahlen, Erfolgsmetriken oder Sicherheitsversprechen zu verwenden. Der Einstieg soll klar beantworten: Was ist nur Vorschau? Was bekomme ich beim kostenlosen Start? Werden Zahlungsdaten benötigt? Welche Account-Sicherheits- und Datenkontrollen gibt es?

## Änderungen

- Creator-Suite-Vorschau als `PRODUKTVORSCHAU · BEISPIELANSICHT` markiert.
- Beispielwerte werden ausdrücklich nicht als Live-, Nutzer- oder Erfolgsstatistiken dargestellt.
- veraltete Aussage entfernt, dass die automatisierten Acceptance-/Release-Prüfungen noch offen seien.
- öffentlicher Release-Text unterscheidet jetzt zwischen grünem internem Automationsstand und externen Go-Live-Gates.
- neuer Start-Vertrauensblock mit vier überprüfbaren Punkten:
  1. neue Creator-Konten starten im FREE Plan;
  2. beim Registrieren werden keine Zahlungsdaten abgefragt;
  3. TOTP, Recovery-Codes und Passkeys stehen als zusätzliche Schutzschichten bereit;
  4. Sessions, Datenexport und Kontolöschung sind im Account-Lifecycle vorhanden.
- Registrierung löst keinen automatischen kostenpflichtigen Checkout aus.
- Login-/Registrierungsseite zeigt FREE-Start, keine Zahlungsdaten und Datenkontrolle direkt vor dem Formular.
- finaler CTA wiederholt den kostenlosen Einstieg ohne Zahlungsdaten.

## Sicherheits-/Transparenzregel

Dieser Pass erzeugt keine neuen Produktversprechen. Alle öffentlichen Aussagen sind an vorhandene Backend-/Account-Funktionen gekoppelt. Insbesondere werden keine Live-Zahlen, Nutzerzahlen, Conversion-Raten, Bewertungen oder 100-%-Sicherheitsgarantien erfunden.

## Check

```bash
npm run conviction14:check
npm run project:check
```

Backend bleibt **3.12.0**. Launcher bleibt **0.42.0**.

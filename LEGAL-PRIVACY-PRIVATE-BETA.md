# cfs_zockt · Legal / Privacy Baseline für die private Beta

Stand: 30.09.2026

## Aktueller Betriebsmodus

cfs_zockt wird derzeit als privates, nicht gewerbliches und kostenloses Beta-Projekt betrieben.

- keine kostenpflichtige Registrierung
- kein öffentlich freigeschalteter Stripe-Checkout
- keine Werbe-/Analytics-/Cross-Site-Tracking-Cookies
- Affiliate-/Monetarisierungs-Konfiguration standardmäßig deaktiviert
- geschlossene Beta derzeit 18+
- Nutzungsbedingungen / Datenschutzhinweise werden bei Registrierung sichtbar bestätigt

## Technische Schutzgrenzen

`CFS_COMMERCIAL_MODE=false` ist der sichere Standard. Solange diese Variable nicht bewusst auf `true` gesetzt wird, blockiert das Backend neue kostenpflichtige Checkouts und das Billing Portal.

Die Registrierung verlangt serverseitig:

- `terms_accepted`
- `privacy_acknowledged`
- `beta_acknowledged`
- `age_18_confirmed`

Die zugehörige Dokumentversion wird als minimales Account-Sicherheitsereignis gespeichert. Datenschutz wird dabei nicht als pauschale Tracking-/Werbeeinwilligung behandelt.

## Browser-Speicher

Öffentliche Marketing-/Funnel-Speicherung wurde entfernt. Merch-Feedback verwendet keine persistente Browser-ID und speichert keinen Entwurf in localStorage/sessionStorage.

Verbleibende Browser-Speicherung dient Authentifizierungsabläufen oder vom Creator ausdrücklich genutzten Werkzeugen, z. B. Editor-/Layout-Präferenzen.

## Vor einer späteren kommerziellen Freischaltung

Vor `CFS_COMMERCIAL_MODE=true` müssen mindestens erneut geprüft bzw. ergänzt werden:

1. tatsächlicher Unternehmens-/Gewerbestatus, Impressum und Steuerangaben
2. finale Preis- und Leistungsbeschreibung
3. B2C-Bestellübersicht und eindeutige Zahlungspflicht
4. Rücktritts-/Widerrufsbelehrung und technisch geeignete Online-Widerrufsfunktion
5. Kündigungsablauf und Bestätigungen auf dauerhaftem Datenträger
6. Stripe-/Zahlungs-Datenschutzhinweise und Auftragsverarbeiter-/Drittlandprüfung
7. Consent Management, falls Analytics, personalisierte Werbung oder nicht notwendiges Tracking aktiviert wird
8. erneute rechtliche Prüfung der Nutzungsbedingungen für das konkrete Geschäftsmodell

## Vor öffentlichem Beta-Ausbau

- DPA/Datenschutzbedingungen der tatsächlich verwendeten Hosting-/Mail-/Provider-Dienste prüfen
- Provider-Datenschutzhinweise mit den tatsächlich aktivierten Scopes abgleichen
- Datenaufbewahrungsfristen und Löschpfade real testen
- Datenschutz-/Account-Export und Löschung mit Testaccounts abnehmen
- nach wesentlichen Legal-Änderungen erneute Zustimmung technisch einplanen

Diese Datei ist eine technische Compliance-Baseline und ersetzt keine individuelle Rechtsberatung.

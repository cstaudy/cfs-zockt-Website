# TECHNIK v162 — Homepage Compact + Public Privacy Audit

- Backend: **3.20.8**
- Schema: **73**
- Launcher: **0.47.29**
- Feature Freeze: aktiv

## Homepage

Die öffentliche Startseite wurde redaktionell verdichtet. Der doppelte `Über mich`-Block entfällt vollständig. Hero, Creator-Einstieg, LIVE-Hinweise, Stream-Erwartungskarten, PlayStation-Platzhalter, Community-Karten und Beta-CTA verwenden kürzere Texte.

Der sichtbare Textumfang der Startseite sinkt von rund **669 Wörtern (v161)** auf rund **352 Wörter (v162)**. Die Kernfunktionen bleiben vorhanden: Twitch/TikTok LIVE-Status, `Zuletzt live`, Kanal-Links, PlayStation-Daten, Community-Links, Creator Suite und Launcher.

## Öffentliche Personendaten

Die Startseite enthält keine private Kontakt-E-Mail, Postanschrift, Telefonnummer, Geburtsangabe oder persönlichen Klarname als Profiltext. Öffentlich bleiben nur die Marke bzw. der Creator-Handle `cfs_zockt`, öffentliche Kanal-/Community-Links und freigegebene LIVE-/Gaming-Aktivität.

Anbieter-/Kontaktangaben bleiben auf den rechtlichen Seiten begrenzt. Details: `PUBLIC-PRIVACY-AUDIT-v162.md`.

## Security / SEO

Durch die geänderte JSON-LD-Beschreibung wurde der erlaubte CSP-Script-Hash synchronisiert. Die CSP bleibt hash-basiert; es wurde kein `unsafe-inline` für Scripts eingeführt.

## Gate

`npm run homepage162:check` prüft Kompaktheit, erhaltene Kernfunktionen, Privacy-Grenze, Legal-Linking und Versionsstand.

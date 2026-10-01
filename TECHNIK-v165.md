# TECHNIK v165 — Public Entry Flow

- Backend: **3.20.11**
- Schema: **73**
- Launcher: **0.47.29**
- Feature Freeze: aktiv

## Änderungen

v165 ist ein reiner UX-/Informationsarchitektur-Pass. Die Seiten `creator-suite.html`, `launcher-download.html` und `login.html` wurden gekürzt und auf eine konsistente Navigation, transparente Brand-Assets und einen kompakten Footer gebracht.

Die bestehenden Runtime-Verträge bleiben erhalten: Login/Registration/MFA/Passkey-IDs, Launcher-Release-Download-IDs, öffentliche Launcher-Release-API und Provider-/Credential-Grenzen wurden nicht verändert.

## Gate

`npm run public-entry165:check`

Der Gate prüft 68 Punkte zu Versionen, Navigation, Textumfang, Creator-Suite-Themen, Launcher-Download-IDs, Auth-Flows, Legal-Checkboxen, responsive Darstellung und Release-Verkettung.

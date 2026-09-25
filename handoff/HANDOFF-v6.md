# Übergabe – v6 Guided Actions / Hilfe-Center

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Kumulativer Stand
Enthält:
- v3 Full Website UI
- v4 Beginner Onboarding
- v5 CFS Guide
- v6 Guided Actions / Hilfe-Center

## In v6 umgesetzt

### 1. Websiteweites Hilfe-Center
Neue Dateien:
- `public/assets/css/cfs-help-v6.css`
- `public/assets/js/cfs-help-v6.js`

Das Hilfe-Center wird über `cfs-shell-v3.js` automatisch auf allen v3-Seiten geladen.

### 2. Kontext-Hilfe auf komplexen Seiten
Auf Login, E-Mail-Bestätigung, Dashboard, Account, Setup, Widget Studio, Stream Studio, TikTok, Integrationen, Launcher, Device-Link, Pläne und Support wird eine kompakte Hilfe-Leiste eingeblendet.

Die Leiste erklärt:
- Was ist diese Seite?
- Was ist der nächste sichere Schritt?
- Welche Funktionen sind optional?

### 3. Hilfe direkt an sensiblen Feldern
Kleine `WARUM?`-Hilfen werden an ausgewählten Feldern ergänzt, z. B.:
- Login-/Registrierungs-Passwort
- E-Mail-Bestätigung
- Passkey-Passwort
- MFA-Passwort
- Datenexport
- Kontolöschung
- Gerätecode
- Grundsetup

### 4. Fehler → nächste Aktion
Sichtbare Fehler-/Statusmeldungen werden beobachtet.
Bei typischen Problemen erscheint eine kleine `Was kann ich jetzt tun?`-Hilfe.
Es werden keine Werte automatisch verändert.

### 5. CFS Guide + Hilfe-Center verbunden
Der v5 CFS Guide kann nun direkt das v6 Hilfe-Center zu einem passenden Thema öffnen.
Der Guide bleibt lokal/regelorientiert und sendet weiterhin keine Texte an externe KI-Dienste.

## Enthaltene Hilfe-Themen
- Erste Schritte
- E-Mail-Bestätigung
- Passwort
- Passkey
- TOTP / MFA
- Sessions
- Datenexport
- Kontolöschung
- Grundsetup
- Widget Studio
- Stream Studio
- TikTok
- Launcher
- Device-Link
- Integrationen
- Pläne
- Support

## Sicherheitsgrenzen
Das Hilfe-Center:
- liest keine Passwörter, Tokens, Recovery-Codes oder API-Keys,
- führt keine sicherheitskritische Aktion automatisch aus,
- verändert keine Backenddaten,
- löst keine Zahlung aus,
- zeigt bei sensiblen Themen explizit an, keine Geheimnisse in Hilfe/Support einzugeben.

## Production-Readiness
Unverändert separat:
- R59: Evidence LIVE_PASS vorhanden
- R60: Evidence LIVE_RESTORE_PASS vorhanden
- R61: Evidence LIVE_MAIL_PASS vorhanden
- R62: PREPARED / manuell begonnen, aber noch nicht vollständig abgeschlossen
- R63-R66: OPEN
- R67: danach

## Nächster empfohlener Produktstand
v7: Empty States & First-Use Content
- leere Widget-/Integrations-/Session-/TikTok-Bereiche mit klaren nächsten Aktionen,
- weniger technische Leermeldungen,
- konsistente Erfolgszustände und Bestätigungen.

## Bei neuem Chat
1. Letzten kumulativen ZIP hochladen.
2. `handoff/CURRENT-HANDOFF.md` nennen.
3. Sagen: `Bitte ab CURRENT-HANDOFF weiterarbeiten.`

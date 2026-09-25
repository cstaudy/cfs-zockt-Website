# Übergabe – v4 Beginner Onboarding

## Projekt
cfs_zockt / cstaudy/cfs-zockt-Website

## Basis
Das ursprüngliche hochgeladene Projekt wurde mit Full Website v3 und Beginner Onboarding v4 überlagert.

## In v4 umgesetzt
- Globales dunkelblau/weiß/blaues cfs_zockt Branding.
- Originales CFS-Logo in Header/Branding integriert.
- Einheitliche Navigation und Creator-Seitenstruktur.
- Account in Übersicht / Sicherheit / Sitzungen / Erweitert gegliedert.
- Registrierung führt bei erforderlicher E-Mail-Bestätigung direkt zur Verify-Seite.
- Verify-Seite merkt die E-Mail in sessionStorage, zeigt klaren 3-Schritt-Pfad und 30-Sekunden-Resend-Cooldown.
- Dashboard zeigt einen 4-Schritte-Startcheck:
  1. E-Mail bestätigen
  2. Passkey oder TOTP
  3. Grundsetup
  4. erstes Widget

## Sicherheit / Architektur
- Keine Backend-Secrets in Frontend-Dateien.
- Bestehende Account-, Passkey-, MFA- und Mail-Sicherheitslogik bleibt erhalten.
- TikTok und Launcher sind für den Einstieg optional.

## Production-Readiness-Stand vor UI-Arbeit
- R59: LIVE_PASS vorhanden.
- R60: LIVE_RESTORE_PASS vorhanden.
- R61: LIVE_MAIL_PASS vorhanden.
- R62: PREPARED; E-Mail-Verifizierung des Testkontos erfolgreich, temporärer Passkey hinzugefügt und Passkey-Login erfolgreich. Der manuelle Step-up-Teil ist noch nicht abgeschlossen.
- R63-R66: OPEN.
- R67: noch nicht ausführbar, bis R62-R66 abgeschlossen sind.

## Infrastruktur
- Backend: Render.
- Production PostgreSQL: Neon.
- Mail: Cloudflare Worker Relay → Brevo.
- Keine Secrets in dieser Übergabe.

## Nächster Stand
v5 fügt den CFS Guide als kostenlosen lokalen Creator-Assistenten hinzu.

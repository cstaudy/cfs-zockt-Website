## Änderung

Kurz beschreiben, was dieser PR ändert.

## Bereich

- [ ] Backend / Website
- [ ] Security / Account / Admin
- [ ] Widget / Scene Studio
- [ ] Launcher
- [ ] TikTok LIVE
- [ ] Games / Cut Studio / Media
- [ ] Billing
- [ ] Release / GitHub Actions / Deployment
- [ ] Dokumentation

## Pflichtprüfung

- [ ] Keine Secrets, Tokens, Zertifikate, `.env`-Dateien, Backups oder Build-Artefakte committed
- [ ] `npm run github21:check` bestanden
- [ ] `npm run project:check` bestanden
- [ ] `npm run check:v42` bestanden, wenn Backend/Release-Struktur betroffen ist
- [ ] `npm run check:post-v42` bestanden, wenn Bridge/Launcher/Recovery betroffen ist
- [ ] Launcher Release Gate bestanden, wenn Launcher-/Release-Code betroffen ist
- [ ] Dokumentation / Current State aktualisiert, wenn sich der Projektstand ändert

## Production / Real-World Gate

Nur markieren, wenn tatsächlich ausgeführt:

- [ ] Lockfiles / `npm ci`
- [ ] DNS / TLS / Edge Gate
- [ ] Database Recovery Drill
- [ ] Application Recovery Drill
- [ ] Incident Response Drill
- [ ] Windows Build / Signatur
- [ ] OBS / TikTok LIVE / Hardware
- [ ] Stripe Testmode

# Teststatus R11 · privater Admin-PC-Download

Erfolgreich lokal geprüft:

- `node --check server.js` und JS des privaten Downloadbereichs.
- 14 gerichtete R11 Policy-/Routing-/Paketprüfungen.
- R5: 16/16 Sicherheitsprüfungen bestanden.
- Bridge: 17/17 Status-/Commerce-Prüfungen bestanden.
- R9 OBS Vertrag auf vollständiger Website erfolgreich.
- R10 OBS Abnahme auf vollständiger Website erfolgreich.
- Installer auf R8, R9 und R10 (R9/R10 inklusive Apply, Verify, Wiederholung und Konfliktschutz) getestet.
- ZIP des Windows-Adminprogramms: Struktur/CRC geprüft.

Nicht geprüft/ausstehend:

- Live-Website mit realem `cfs_zockt`-Account inklusive Mail-Verifikationsstatus.
- Host-Umgebungsvariablen und tatsächliche Admin-E-Mail-Freigabe.
- Live-Download, starke Admin-Reauth und Windows-Start.
- Beta-Abnahmen und Bezahlsystem.

Wichtige Erkenntnis: Ein früherer Entwicklungsordner (`cfs-r7-work/site-baseline`) hat acht unbekannte Dateifassungen. Der Installer blockiert diese bewusst. Den tatsächlichen Windows-Website-Ordner bitte zuerst prüfen; **nicht** Dateien per Explorer darüberkopieren, wenn Konflikte gemeldet werden.

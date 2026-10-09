cfs_zockt WEBSITE-UPDATE 3.20.71-R12 – KUMULATIV (R4–R12)

1. Website-Ordner 3.20.71 sichern.
2. 01-NUR-PRUEFEN.cmd – Website-Ordner auswählen.
3. Bei 0 Konflikten: 02-GESAMTUPDATE-EINSPIELEN.cmd.
4. 03-UPDATE-VERIFIZIEREN.cmd ausführen.
5. Private Server-Variablen setzen:
   CFS_ADMIN_EMAILS=cstaudygaming@googlemail.com
   CFS_ADMIN_DESKTOP_OWNER_EMAIL=cstaudygaming@googlemail.com
   CFS_ADMIN_DESKTOP_OWNER_ID=<optional: feste Creator-Account-ID>
   Account-E-Mail muss im System verifiziert sein. Kein Secret hier eintragen.
6. Mit deinem cfs_zockt Account anmelden; unter Creator Control die
   starke Admin-Sicherheitsbestätigung aktivieren, dann Admin Startseite öffnen.
7. Unter /pages/admin.html das private Windows-Adminpaket herunterladen.

Sicherheitsprinzipien:
- ZIP liegt unter /private/ und wird NICHT mit express.static ausgeliefert.
- Server prüft Session + CFS_ADMIN_EMAILS + Owner-E-Mail + bestätigte E-Mail
  (optional zusätzlich feste Account-ID) + frische starke Admin-Bestätigung.
- Ohne gültige Owner-Konfiguration ist der Download gesperrt (fail closed).
- ZIP SHA-256 wird vor jedem Download auf dem Server geprüft.
- Account-Anzeigename cfs_zockt ist eine Anzeige, KEIN Authentifizierungsfaktor.
- Die Einstellungen des Live-Hosters können hier nicht kontrolliert werden.
- Das Windows-Adminpaket ist ein Startcenter, KEIN fertig signierter Installer.
- Keine Beta- oder Shopfreigabe; echte Windows- und Live-Tests offen.

Render-Hinweis: Nach lokalem Einbau muessen die geaenderten Dateien
mit git commit + git push nach main. Render deployed nicht lokale ZIPs.

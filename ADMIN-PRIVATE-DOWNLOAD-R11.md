# cfs_zockt · Admin Control & privater PC-Download · R11

## Stand

- Admin Control Center liegt unter `/pages/admin.html` und Creator Control unter `/pages/admin-creators.html`.
- Diese Seiten sind bereits serverseitig mit Creator-Session und `CFS_ADMIN_EMAILS` geschützt. Nicht berechtigte Accounts bekommen `404`.
- Der neue Download befindet sich auf `/pages/admin.html` unter „WINDOWS / PRIVAT“.
- Das Windows-Startcenter ist ein PowerShell-/CMD-Programm, keine signierte EXE.
- Die bestehende ZIP der Windows-Admin-App wird **nicht** unter `public/` gespeichert, sondern unter `private/admin-desktop/cfs_zockt-admin-pc.zip`.
- Die private Downloadroute `/api/admin/desktop/download` verlangt Session + Adminrolle + frische starke Admin-Freigabe + serverseitige Owner-E-Mail + verifizierte E-Mail-Adresse; optional zusätzliche Bindung an Creator-ID.
- Der Server prüft die SHA-256-Summe des ZIPs vor Auslieferung. Ein direkter Aufruf der URL umgeht den Login nicht.
- `/api/admin/desktop/availability` zeigt der Admin-Oberfläche, ob das Paket für den Account bereitliegt.

## Einmalige Host-Konfiguration

Als private Umgebungsvariablen auf dem Website-Server setzen:

```dotenv
CFS_ADMIN_EMAILS=cstaudygaming@googlemail.com
CFS_ADMIN_DESKTOP_OWNER_EMAIL=cstaudygaming@googlemail.com
# Optional, empfohlen zur dauerhaften Bindung an genau einen Account:
CFS_ADMIN_DESKTOP_OWNER_ID=<tatsaechliche Creator-Account-ID>
```

**Wichtig:** `CFS_ADMIN_EMAILS` muss ausschließlich die eine E-Mail enthalten, wenn wirklich kein anderes Konto Adminrechte haben soll. Die Website überschreibt bestehende Servereinstellungen nicht. Ohne konfigurierte Owner-E-Mail schlägt die Downloadfreigabe bewusst fehl. Ein bloßer Profil-Anzeigename `cfs_zockt` ist kein sicheres Identitätsmerkmal.

Die Creator-E-Mail muss auf dem Server als **bestätigt** gespeichert sein (`email_verified_at`). Wenn E-Mail-Verifikation noch nicht eingerichtet ist, muss sie sicher eingerichtet und die Adresse bestätigt werden, statt die private Downloadprüfung abzuschalten.

## Bedienung

1. Website-R11 installieren und Server neu starten/deployen.
2. In der Hosting-Umgebung oben genannte Variablen setzen (nicht in `public/` oder in Browser-JS).
3. Als `cfs_zockt` anmelden, E-Mail-Bestätigung und Zwei-Faktor-Schutz prüfen.
4. `/pages/admin-creators.html#adminSecurity` öffnen. Zuerst Account-Schutz und dann Admin-Schutz entsperren.
5. `/pages/admin.html` öffnen, „WINDOWS / PRIVAT“ → „ADMIN-PC HERUNTERLADEN“.
6. ZIP auf Windows entpacken, `01-INSTALLIEREN.cmd` ausführen.
7. Desktop-Verknüpfung starten. Sie öffnet den geschützten Website-Admin im Standardbrowser.

## Grenzen und Resttests

- Ein realer Browser-/Windows-/Hosting-Test mit deinen Accountdaten ist noch offen.
- Die Route erzwingt **keine EXE-Codesignierung**; Windows-SmartScreen-/PowerShell-Richtlinien können den Start beeinflussen.
- Dateizugriffsschutz darf nicht nur über eine unsichtbare Navigation erfolgen. Deshalb hat die Downloadroute eigene serverseitige Guards.
- Adminberechtigung für Website-Admin hängt von `CFS_ADMIN_EMAILS` ab. Die Backend-Konfiguration ist in der ZIP nicht einsehbar.
- Die Beta bleibt HOLD; der kostenpflichtige Shop ist weiterhin deaktiviert.

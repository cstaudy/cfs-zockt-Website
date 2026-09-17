# Website Production Acceptance · Pass 21.4

## Ziel

Pass 21.4 prüft den fertig aufgebauten Website-Stand nach dem Deploy auf der echten Domain. Dieser Pass ist bewusst noch **keine vollständige Security-/Recovery-Abnahme**. Er stellt zuerst sicher, dass der öffentliche Website-Aufbau, die wichtigsten Einstiegspfade und die Basis-Runtime in Production korrekt ausgeliefert werden.

## Automatischer Production-Smoke-Test

Standardziel ist `https://cfs-zockt.de`:

```powershell
npm.cmd run production21:smoke
```

Alternativ kann ein anderes Ziel direkt übergeben werden:

```powershell
node tools/production-website-smoke-pass21-4.mjs https://example.invalid
```

Der Test prüft unter anderem:

- `/api/health` mit Backend-Version `3.12.0` und verbundener PostgreSQL-Datenbank
- `/api/public/status`
- Startseite und zentrale öffentliche Seiten
- Login-/FREE-Einstieg
- Creator Suite, Pläne, Roadmap, Support und Sicherheit
- `security.txt` und `sitemap.xml`
- anonyme Sperre von `/api/account/me`, `/api/account/sessions` und `/api/creator/access`
- No-Store-Verhalten geschützter Account-Endpunkte
- grundlegende Production-Header auf der Startseite
- echte 404-Antwort für unbekannte öffentliche Pfade

Der Smoke-Test verwendet keine Passwörter, Tokens oder sonstige Zugangsdaten.

## Browser-Abnahme nach erfolgreichem Smoke-Test

Die folgenden Punkte werden anschließend mit einem bestehenden Creator-Account im Browser geprüft:

1. Startseite auf Desktop und Mobil öffnen; Hauptnavigation und Mobile-Menü anklicken.
2. `KOSTENLOS STARTEN` führt zur Registrierung auf der Login-Seite.
3. Mit einem bestehenden Account anmelden; keine Zugangsdaten in Terminal oder Chat kopieren.
4. Nach erfolgreichem Login öffnet sich das Creator Dashboard.
5. Dashboard-Navigation zu Widget Studio, TikTok, Launcher und Account prüfen.
6. Account-Seite öffnen und aktive Sessions laden.
7. Ein manuelles Widget ohne TikTok-Verbindung öffnen bzw. erstellen und die Vorschau prüfen.
8. Support-, Sicherheits-, Datenschutz- und Rechtsseiten aus der Website-Navigation öffnen.
9. Mobile Darstellung mindestens auf schmaler Browserbreite prüfen; keine horizontale Seite darf ungewollt abgeschnitten werden.
10. Browser-Konsole auf offensichtliche Laufzeitfehler prüfen.

## Abnahmegrenze

Pass 21.4 ist erst vollständig abgeschlossen, wenn der aktuelle GitHub-Stand deployed wurde und sowohl der Production-Smoke-Test als auch die Browser-Abnahme erfolgreich sind.

Danach folgen die tieferen Prüfungen für Login-/Session-Lifecycle, TikTok OAuth, Launcher-Verbindung, Widget-Ausgabe und anschließend die vollständige Security-, Recovery- und Production-Abnahme.

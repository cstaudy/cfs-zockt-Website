# cfs_zockt – OBS → CFS Studio Beta-Test (R10)

**Noch nicht abgenommen.** Auf einem echten Windows-PC mit OBS Studio, installiertem/verbundenem CFS Launcher und funktionierendem Creator-Login durchführen. Keine privaten Quell-URLs in Tickets veröffentlichen.

| Nr. | Realer Testschritt | PASS nur bei folgendem Nachweis |
|---|---|---|
| 1 | Widget in Widget Studio erstellen und veröffentlichen | Status `LIVE`; veröffentlichte URL erscheint |
| 2 | `/pages/obs-setup.html` öffnen, URL prüfen | Server antwortet für diese veröffentlichte Quelle erfolgreich |
| 3 | URL + Widgetgröße als Browserquelle in OBS einrichten | Widget im OBS-Fenster sichtbar, Maße/Transparenz korrekt |
| 4 | Widget-Entwurf ändern, ohne zu veröffentlichen | OBS zeigt weiterhin die vorige freigegebene Version |
| 5 | Neue Widget-Version veröffentlichen | OBS übernimmt nach Aktualisierung die neue Version |
| 6 | Launcher und OBS WebSocket verbinden; Install-OBS auslösen | Auftrag ist **acked**, Browserquelle wird real in OBS angelegt |
| 7 | Widget in CFS Studio Scene Composer einfügen, Scene veröffentlichen | Dieselbe Ausgabe funktioniert in CFS Studio |
| 8 | Stream-Maker-Quelle für ein Element erstellen | Die passende Element-URL + Größe in OBS nutzbar |
| 9 | LIVE-Events eines verbundenen Providers empfangen | Richtige Events landen im richtigen Widget; Offline-Zustand erkennbar |
| 10 | Token rotieren / ungültig machen | Alte URL funktioniert nicht mehr und neue URL schon |
| 11 | Berechtigungs-/Provider-Grenze prüfen | Kein fremder Creator-Zugriff, keine unberechtigte Freigabe |
| 12 | Abbruch/Reconnect und Neustart | Keine doppelte Installation und verlässliche Wiederherstellung |

Für jeden Test: Datum, Testaccount, OBS-/Launcher-Version, URL **geschwärzt**, Ergebnis, Fehlerbeschreibung, Screenshot (ohne Token) und Tester dokumentieren.

## Wichtige Trennung
- `API erreichbar` bedeutet **nicht**, dass OBS tatsächlich online ist.
- Der Quellencheck ist **manuell angestoßen und read-only**.
- Automatischer Install erfordert CFS Launcher plus OBS WebSocket und einen bestätigten `acked`-Status.
- Shopdesigns und deren Lizenz-/Downloadzugriff müssen separat mit echten Käufen geprüft werden. Bezahlte Produkte bleiben deaktiviert.

Hinweis R9: Maker meldet nur aktuelle Quelle erreichbar, nicht separate Produktveröffentlichung. Shop zu Maker und Widget zu OBS bleiben echte manuelle Abnahmewege.

R10: Der Website-Assistent bietet jetzt dieselben 12 Punkte für manuelle Bewertung an.
Es erfolgt KEINE automatische Beta-Abnahme. Ein R10-Bericht darf erst nach
realen Windows-Tests als Nachweis eingereicht werden und enthält keine privaten URLs.

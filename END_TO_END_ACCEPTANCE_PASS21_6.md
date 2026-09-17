# End-to-End Acceptance · Pass 21.6

## Ziel

Pass 21.6 prüft den vollständigen technischen Übergang **Widget Studio → Publish → Scene Studio → Publish → öffentlicher Output → Launcher Bridge → LIVE-Events**. Der automatisierte Production-Smoke-Test bleibt bewusst nicht destruktiv und verändert keine Creator-Daten.

## Repository-Prüfung

```powershell
npm.cmd run e2e21:check
```

Die Prüfung kontrolliert unter anderem:

- Widget-CRUD bleibt creator-spezifisch und startet als Draft.
- Veröffentlichung ist ein bewusster eigener Schritt; Draft-Konfiguration wird erst dabei live geschaltet.
- öffentliche Widget-Ausgabe verwendet ausschließlich veröffentlichte, sanitizte Konfiguration.
- manuelle/statische Widgets bleiben von TikTok-/LIVE-Daten entkoppelt.
- Scenes akzeptieren nur creator-eigene, veröffentlichte Quellen.
- Scene-Publish benötigt mindestens ein Element und erzeugt erst danach eine öffentliche Ausgabe.
- Launcher/Bridge-Bibliothek liefert nur live veröffentlichte Widgets und Scenes.
- Bridge-Steuerung ist creator-isoliert und nur für erlaubte manuelle Widget-Modi verfügbar.
- LIVE-Events werden über den authentisierten Bridge-Pfad angenommen, limitiert und getrennt von Session Start/Ende verarbeitet.
- Action-Delivery (z. B. Launcher-Ausgaben) bleibt über Bridge-Auth geschützt.

## Production-Smoke ohne Creator-Zugangsdaten

Nach dem Deploy:

```powershell
npm.cmd run production21:e2e-smoke
```

Dieser Test prüft nur:

- Backend/DB Health,
- Auslieferung von Widget Studio, Scene Studio und Launcher,
- anonyme Sperren der Creator-Endpunkte,
- Bridge-Key-Sperren,
- sauberes 404-Verhalten unbekannter öffentlicher Widget-/Scene-Tokens,
- `no-store` auf dynamischen Ausgaben.

Er erstellt **kein Widget**, veröffentlicht **keine Scene**, startet **keine LIVE-Session** und verbindet **kein Launcher-Gerät**.

## Browser-End-to-End mit bestehendem Creator-Account

Für die finale manuelle Abnahme:

1. Im Widget Studio ein **manuelles Counter-, Goal- oder Timer-Widget** erstellen. Es muss als Draft beginnen.
2. Vorschau testen, danach bewusst veröffentlichen. Die Output-URL öffnen und prüfen, dass das veröffentlichte Widget sichtbar ist.
3. Im Scene Studio eine Scene erstellen und das veröffentlichte Widget hinzufügen. Ein nicht veröffentlichtes Widget darf nicht als LIVE-Quelle verwendbar sein.
4. Scene speichern und bewusst veröffentlichen. Die Scene-Output-URL in einem zweiten Browser-Tab öffnen.
5. Launcher auf dem eigenen PC verbinden. Gerät/Code nur bestätigen, wenn Anzeige und eigener Launcher übereinstimmen.
6. Im Launcher die veröffentlichte Widget-/Scene-Bibliothek laden. Drafts dürfen dort nicht als LIVE-Ausgabe erscheinen.
7. Bei einem manuellen Counter/Timer über den Launcher eine ungefährliche Teständerung durchführen und prüfen, dass der öffentliche Output aktualisiert wird.
8. Falls eine LIVE-Bridge verwendet wird, eine Test-Session nur mit dem eigenen Launcher starten und beenden. Keine echten TikTok-Zugangsdaten oder Bridge-Schlüssel in Screenshots/Chat teilen.

## Abnahmegrenze

Pass 21.6 ist vollständig abgeschlossen, wenn Repository-Prüfung und Production-Smoke grün sind und der manuelle Creator-Fluss **Draft → Publish → Scene → Output → Launcher** einmal erfolgreich durchgeführt wurde.

Die nachfolgende Security-/Recovery-Abnahme testet anschließend die Schutzmechanismen systematisch und getrennt von diesem Produktfluss.

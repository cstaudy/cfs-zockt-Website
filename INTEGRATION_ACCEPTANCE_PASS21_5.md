# Integration Acceptance · Pass 21.5

## Ziel

Pass 21.5 prüft die Übergänge zwischen Creator Account, TikTok, Widget Studio und Desktop Launcher. Der Pass verändert keine Zugangsdaten, verbindet keinen TikTok-Account automatisch und erzeugt im Production-Smoke-Test keine Launcher-Geräteverknüpfung.

## Repository-Prüfung

```powershell
npm.cmd run integration21:check
```

Geprüft werden unter anderem:

- Creator-spezifische TikTok-Endpunkte sind an den angemeldeten Creator gebunden.
- TikTok OAuth nutzt serverseitigen State, Cookie-Bindung, Ablaufzeit und Einmalverbrauch.
- öffentliche TikTok-Antworten enthalten keine Access-/Refresh-Tokens.
- Browser-Schreibzugriffe auf Creator APIs laufen über Origin/Fetch-Metadata und CSRF.
- Widget Studio bietet Goal, Counter, Timer, Chat und Kamera als Schnellstarts.
- manuelle Widgets funktionieren ohne TikTok und starten als Draft statt automatisch live zu gehen.
- Launcher Device-Link trennt öffentlichen Start/Poll von creator-authentisierter Bestätigung und Geräteverwaltung.
- Device-Link-Polling benötigt Geräte-ID plus Geräte-Secret; Start/Poll sind rate-limited.

## Production-Smoke ohne Zugangsdaten

Nach dem Deploy:

```powershell
npm.cmd run production21:integration-smoke
```

Der Test ist absichtlich nicht destruktiv. Er prüft nur öffentliche Read-Endpunkte, die Auslieferung der Integrationsseiten und anonyme Sperren geschützter APIs. Er startet keinen OAuth-Flow und erzeugt keinen Device-Link.

## Browser-Abnahme mit bestehendem Creator-Account

1. Anmelden und `/pages/tiktok.html` öffnen. Der Status muss zum eingeloggten Creator gehören.
2. Falls TikTok noch nicht verbunden ist, `TIKTOK VERBINDEN` öffnen und prüfen, dass der Flow zu TikTok führt. Keine Callback-URL mit `code` oder `state` in Chat oder Screenshots teilen.
3. Nach erfolgreicher Verbindung Profil-Sync prüfen. Eine bestehende produktive TikTok-Verbindung nicht nur für einen Test trennen.
4. Widget Studio öffnen und zuerst ein manuelles Goal, Counter oder Timer erstellen. Das Widget muss als Draft beginnen und darf keine TikTok-Verbindung erzwingen.
5. Vorschau testen; erst über den bewussten Publish-Schritt veröffentlichen.
6. Launcher auf dem eigenen PC starten, Device-Link-Code erzeugen und `/pages/launcher-connect.html` nur bestätigen, wenn Code, Gerät und Version übereinstimmen.
7. Danach Launcher-Geräteliste prüfen. Ein Testgerät kann anschließend bewusst widerrufen werden.

## Abnahmegrenze

Pass 21.5 ist vollständig abgeschlossen, wenn Repository-Test und Production-Integration-Smoke grün sind und der Creator im Browser mindestens TikTok-Status, ein manuelles Draft-Widget sowie den Launcher-Gerätefluss erfolgreich geprüft hat.

Die vollständige Security-/Recovery-Abnahme folgt separat; Pass 21.5 ist eine Integrations- und Nutzerflussprüfung und ersetzt keinen Security-Pentest.

# cfs_zockt – Website Monetarisierung & TikTok→Website Funnel Pass

Stand: 15.09.2026

## Ziel

Dieser Pass bereitet Wachstum und spätere Monetarisierung vor, ohne die öffentliche Website mit Werbung zu überladen und ohne erfundene Partner, Rabatte, Preise, Bewertungen oder Nutzerzahlen anzuzeigen.

Der Security- und SEO-Stand bleibt erhalten. Backend-Version bleibt 3.12.0.

## 1. TikTok → Website Funnel

Es existieren jetzt feste, kurze Einstiegspfade:

- `/go/tiktok` → Startseite mit TikTok-Attribution
- `/go/tiktok/tools` → Startseite + Creator-Suite-Vorschau
- `/go/tiktok/community` → Startseite + Community-Bereich

Die Redirects sind bewusst `302`, damit die Kampagnenziele später geändert werden können, ohne einen permanent gecachten Redirect zu erzeugen.

Es gibt keinen offenen Redirect und keine vom Besucher frei steuerbare Ziel-URL.

### Source Attribution

TikTok-Traffic wird über `source=tiktok` und UTM-Parameter markiert. Die öffentliche Startseite:

- erkennt TikTok als Quelle,
- zeigt nur dann einen kompakten TikTok-Einstiegsblock,
- bewahrt die Quelle während der Browser-Session,
- trägt `source=tiktok` bis zur Login-/Registrierungsseite weiter.

Die Login-/Registrierungsseite zeigt bei TikTok-Traffic einen kurzen Kontextblock. Es werden dafür keine externen Tracking-Skripte geladen.

## 2. Conversion-Pfade

Wichtige CTAs auf der Startseite besitzen jetzt `data-funnel-cta` Marker. Diese Marker sind nur eine technische Vorbereitung.

Aktuell wird kein serverseitiges Nutzertracking ausgeführt. Die aktuelle Session merkt sich lediglich lokal die letzte Funnel-Aktion. Dadurch kann später eine eigene Analytics-Lösung ergänzt werden, ohne heute schon Google Analytics, TikTok Pixel, Meta Pixel oder andere Drittanbieter-Skripte einzubauen.

Vor dem Einbau externer Tracking-/Werbepixel sollte ein eigener Consent-/Datenschutz-Pass erfolgen.

## 3. Partner- und Affiliate-Flächen

Die Startseite besitzt jetzt eine vorbereitete Creator-Empfehlungsfläche.

Wichtig:

- standardmäßig `hidden`,
- standardmäßig deaktiviert,
- keine Beispielpartner im Live-Frontend,
- keine erfundenen Produkte,
- keine erfundenen Rabatte oder Preise.

Konfiguration:

`public/config/monetization.json`

Default:

- `enabled: false`
- `items: []`

Die Fläche wird nur angezeigt, wenn:

1. `enabled` explizit auf `true` gesetzt wird und
2. mindestens eine technisch gültige Empfehlung vorhanden ist.

## 4. Sicherheitsregeln für Partnerlinks

Partnerlinks werden im Frontend nur akzeptiert, wenn sie:

- `https://` verwenden,
- keine eingebetteten Benutzername-/Passwortdaten enthalten,
- Titel, Beschreibung und Ziel-URL vollständig besitzen.

Ausgehende Partnerlinks erhalten automatisch:

`rel="sponsored noopener noreferrer"`

Die Inhalte werden über DOM `textContent` aufgebaut und nicht als fremdes HTML übernommen.

## 5. Werbe-/Affiliate-Kennzeichnung

Aktivierte Partnerkarten werden sichtbar mit

`WERBUNG / AFFILIATE`

gekennzeichnet.

Zusätzlich wird oberhalb der Empfehlungen der konfigurierte Affiliate-Hinweis eingeblendet.

Die Kennzeichnung darf bei späteren Partnern nicht entfernt werden.

## 6. Partner später aktivieren

Erst nach einem echten Partner-/Affiliate-Abschluss `public/config/monetization.json` bearbeiten.

Ein Eintrag verwendet diese Felder:

- `category`
- `title`
- `copy`
- `url`
- `cta`

Danach `enabled: true` setzen und `npm run funnel:check` ausführen.

Es sollten bewusst nur wenige, zur Creator-/Streaming-Zielgruppe passende Empfehlungen gleichzeitig aktiv sein.

## 7. TikTok Nutzung

Für einen zentralen Profil-/Bio-Link ist vorgesehen:

`https://cfs-zockt.de/go/tiktok`

Für gezieltere Links können verwendet werden:

`https://cfs-zockt.de/go/tiktok/tools`

`https://cfs-zockt.de/go/tiktok/community`

Ob Website-/Destination-Links im TikTok-Konto verfügbar sind, hängt vom TikTok-Kontotyp und den jeweils freigeschalteten Business-Funktionen ab. Das wird extern im TikTok-Konto eingerichtet und ist kein Backend-Feature von cfs_zockt.

## 8. Was bewusst noch NICHT eingebaut wurde

- Google AdSense
- TikTok Pixel
- Google Analytics
- Meta Pixel
- externe Ad Networks
- Cookie-basierte Marketingprofile
- erfundene Partner
- erfundene Angebote
- Premium-Preise
- Fake-Rabatte
- Fake-Conversion-Zahlen

## 9. Checks

Neue Prüfung:

`npm run funnel:check`

Prüft unter anderem:

- TikTok Shortlinks,
- feste Redirect-Ziele,
- Source Attribution,
- Registrierungskontext,
- Partnerfläche standardmäßig deaktiviert,
- keine Fake-Partner im Default,
- HTTPS-Pflicht für Partnerlinks,
- `sponsored/noopener/noreferrer`,
- Werbe-/Affiliate-Kennzeichnung,
- keine neu eingebauten Drittanbieter-Tracking-Skripte.

Zusätzlich weiterhin ausführen:

- `npm run check`
- `npm run security:check`
- `npm run seo:check`

## 10. Nächster sinnvoller Schritt

Nach diesem Pass ist die geplante Reihenfolge:

1. echte Produktionsdomain/TLS extern verifizieren,
2. Google Search Console anbinden und Sitemap einreichen,
3. TikTok Profil-/Business-Link auf `/go/tiktok` setzen, sofern im Konto verfügbar,
4. erst bei echten Partnern die Affiliate-Konfiguration aktivieren,
5. danach Review-Admin-Oberfläche,
6. anschließend praktische 30-Sekunden-UX-Tests im Widget Studio.

Große Acceptance-, Last- und LIVE-Tests bleiben weiterhin pausiert.

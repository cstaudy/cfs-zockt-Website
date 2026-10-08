# CFS Zockt · Update 3.20.61

## Block 03 · Einfacher Gesamt-Flow (CODE READY / LIVE HOLD)

**Basis:** Vollarchiv 3.20.60. **Ziel:** Stream Maker → eigenes Masterbild → Widget Studio → Veröffentlichung → OBS.

### Änderungen

1. Stream Maker akzeptiert für den dynamischen Übergang jetzt **entweder** ein vorhandenes eigenes Bild in `/widget-assets/<48 hex>` **oder** ein lokal ausgeliefertes PNG/JPG/WebP aus `/assets/img/` bzw. `/assets/designs/`. Die zweite Variante wird zuerst über den bestehenden authentifizierten Asset-Upload in die eigene Medienbibliothek übernommen. Deduplizierung, Dateitypprüfung und Quota liegen weiterhin beim Server. Fremde URLs, HTML/SVG und unpassende Typen werden nicht importiert.
2. Nach erfolgreicher Übernahme wird das neue eigene Asset **im Maker-Entwurf** statt des statischen Designs referenziert und das Bundle gespeichert. Schlägt der Upload oder das Speichern fehl, erfolgt **keine Weiterleitung** ins Widget Studio.
3. In Widget Studio erscheint nach gültiger Maker-Übergabe ein kompakter Begleiter: Entwurf → Veröffentlichen → Browser-Source URL kopieren / über Launcher einfügen. Die URL-Aktion ist bei Entwürfen deaktiviert. Stehen unveröffentlichte Änderungen aus, wird auf die zuvor veröffentlichte OBS-Version hingewiesen.
4. Die Veröffentlichung wird nach fehlgeschlagenem Draft-Save abgebrochen; auch der Widget-Motiv-Konverter behauptet bei fehlgeschlagenem Speichern keinen fertigen Entwurf.
5. Fallback: Wenn der Designpaket-Katalog fehlt, zeigt der Maker die **integrierten Farb-Startdesigns** mit transparenter Fehlermeldung statt nur einer Fehlerseite. Die fehlenden 31 Paket-Bilddateien werden **nicht** durch Fake-Assets ersetzt.
6. Eigener Sicherheit-/UI-Test `tools/maker-widget-obs-flow-v32061-test.mjs`, auch VM-geprüfte Einzelflows und Publish-Failure. `package-lock.json` auf Releaseversion synchronisiert. CSS/JS Cache-Keys angepasst.

### Tests

- `npm run check:v32061`: Neuer 12/12 Test + fokussierte Regression von 3.20.60.
- Tests simulieren Browser-/API-Schnittstellen auf Code-Ebene, **keine** vollständige echte Browser-Session.
- Frühere `check:v32059` / `check:v32057` nicht automatisch in `check:v32061` enthalten, weil der bereitgestellte Legacy-Testbestand unvollständig ist. Die Tests dürfen nicht als vollständige CI-Freigabe ausgegeben werden.

### Bekannte Einschränkungen und Live-Acceptance

- **Die Datei `public/assets/data/design-pack-catalog-v211.json` fehlt im gelieferten 3.20.60-Archiv;** von ihr abhängige 31 Paketvorlagen und Bildableitungen sind damit weiterhin nicht vollständig abnehmbar. Die korrekten Paket-Manifeste/-Bilder aus der autoritativen Projektquelle wiederherstellen, nicht neu erfinden.
- Der Maker->Widget-Übergang wurde mit Datei-/Server-Mocks geprüft. Echte Browser-Navigation, Authentifizierung, Medienkontingente, Render, Mobile und das Bildlayout sind vor Ort zu testen.
- Provider LIVE: echte Twitch Follow/Bits/Resub, TikTool Like/Gift/Share, YouTube Live Chat/Super Chat, Disconnect/Reset einschließlich Session-Trennung und Source-Scopes sind **HOLD**.
- Windows Launcher 0.47.31, OBS WebSocket, tatsächliche Browser-Source-Insertion und 60-Minuten-Soak sind **HOLD**. Ein Klick auf "Per Launcher einfügen" ist **keine** Bestätigung der Installation; nur das bestätigte Launcher-Ack zählt.
- Keine Schemaänderung (DB Schema 80), keine Checkout-Freischaltung, kein Windows-Build, keine automatische KI-Segmentierung.

### Manuelle Acceptance (noch auszuführen)

1. Render mit echtem Creator anmelden; eigenes PNG/JPG/WebP im Maker hochladen; Design, Bundle und Namen speichern; „Dynamisches Widget daraus bauen“; Widget Studio öffnet den **richtigen** eigenen Assetdatensatz.
2. Auf einer Installation mit wiederhergestellten Original-Paketen eine lokale `preview.master`-Vorlage wählen; Übergabe muss genau einmal privat importieren, bei Wiederholung keinen weiteren Upload verursachen, bei Netzwerk- oder Quota-Fehler sicher im Maker bleiben.
3. Im Widget Studio TikTok oder Twitch + passenden Live-Typ und Motiv/Logo wählen; Entwurf speichern, Vorschau testen, veröffentlichen, Browser-URL kopieren und tatsächliche OBS-Quelle in 16:9 und 9:16 prüfen.
4. Nach Bearbeitung ohne Publish muss OBS die bisher veröffentlichte Version zeigen; erneutes Publish muss geändertes Widget anzeigen. Korrupte/veraltete Assetreferenz muss klar Fehler melden.
5. Launcher + OBS WebSocket mit Windows, realem Netzwerk-Reconnect und den Live-Providern prüfen. Ereignisbelege, Screenshots, Ausgabe-URL, Zeitstempel und 60-Minuten-Soak protokollieren.

**Release-Entscheidung:** fokussierter Code-Test PASS ≠ Beta/LIVE Acceptance. Freigabe bleibt HOLD.

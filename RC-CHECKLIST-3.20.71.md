# CFS Zockt 3.20.71 · Release Candidate Vorbereitung

**Status: CODETESTS PASS · BETA / LIVE-TESTS OFFEN · PUBLIC GO NICHT ERTEILT.**

## Neue Funktionen
- Admin > Finanzen & Einnahmen: Monatsfilter, Stripe-Test/LIVE-Kennzeichnung, nur bestätigte signierte Webhook-Zahlungen, vorsichtige Erstattungszuordnung, Abo-Status, Paketpreisvorschau-Zähler, CSV.
- Datenschutz: read-only, Root/Admin-Session + starke Admin-Freigabe, No-Store, keine Zugangsschlüssel / Personendaten in der Finanz-API.
- Kein automatisches Shop-Publishing, keine Preis-Simulation als bezahlter Umsatz und kein produktiver Checkout für bezahlte Shop-Pakete.

## Technische Tests vor Beta
1. `npm run check:v32071` im **vollständigen** Website-Projekt mit Originaldesignarchiv ausführen.
2. `node tools/rc-readiness-v32071.mjs` zeigt explizit nicht bestandene externe Freigabekriterien.
3. Starttest mit PostgreSQL, konfigurierte Cookies/CSRF, Admin-Step-Up testen.
4. Mit Stripe-Testmode signierte `invoice.paid`-Webhooks inklusive doppelter Zustellung, `charge.refunded`-Teilrefund, unterschiedlichen Währungen und widersprüchlichen Daten prüfen.
5. Prüfen, dass fremde Creator und unautorisierte Nutzer keine Admin-Finanzdaten sehen.
6. Browser: Chrome, Firefox, Edge, mobile; CSV und responsive Finanzkarten prüfen.

## Beta-Testmatrix (manuell auszuführen; nicht als abgeschlossen markieren)
- **Website & Auth:** Registrierung, E-Mail-Verifikation, Login/MFA/Passkey, Admin-Step-up, CSRF, Account-Löschung.
- **Abos:** Stripe-Testmode Checkout + signierter Webhook + Portal + Zahlungsausfall + Kündigung + Retry + Refund.
- **Shop:** 31 Designwelten/496 Farben, Original-PNGs, 7 Downloadgruppen, Maker Import, funktionierende OBS-Pakete, Rechte/Lizenzen.
- **Kostenpflichtige Shop-Pakete (NO-GO):** Preis→Checkout→Webhook→Kaufbestätigung→Entitlement→Download/Install→Refund/Revoke noch *nicht implementiert*.
- **CFS AI:** Ollama verfügbar, Hintergrundläufe, private Galerie, Admin-Bridge, Approve/Reject, ZIP manuell exportieren.
- **Windows & LIVE:** Launcher Build, OBS Browser Source/WebSocket, Twitch/TikTok/YouTube mit Testaccounts, 2h Soak, Reconnect, Recording, Cut/Audio.
- **Sicherheit / Betrieb:** DB Backup/Restore, Rollback, Rate Limits, Secret-Scan, Monitor/Alerts, Production Readiness Gate, Lizenz-/Steuer-/Datenschutzprüfung.

## Abnahmekriterien
Ein öffentlicher **Paid-Shop-Release** bleibt gesperrt, bis die Kauf-/Entitlementfunktion implementiert und real mit Stripe TEST/LIVE geprüft wurde. Auch für einen kostenlosen Beta-Release sind die markierten Website-/Windows-/Provider-Tests und ein ausdrückliches GO erforderlich.

## Finanzdaten-Grenzen
- Die Übersicht zeigt **nur** signierte, lokal protokollierte Stripe-Webhooks ab Speicherung der neuen Betragsfelder. Keine vollständige historische Stripe-Auswertung.
- Refunds ohne passende Rechnung *innerhalb des ausgewählten Monats* werden nicht abgezogen und als fehlende Zuordnung gemeldet.
- `Saldo vor Gebühren` ist **keine** steuerliche Nettoumsatz-/Auszahlungszahl. Stripe-Gebühren, Umsatzsteuer, Auszahlungen, Chargebacks und historische Korrekturen fehlen.
- Die **Paketpreise** sind im vorhandenen Store `paid_preview` und keine Umsätze.

## Zuständigkeiten
- Website Release 3.20.71: nur 3.20.70 → 3.20.71.
- Lokaler Windows CFS-AI-Dienst bleibt auf Admin-Bridge 3.20.70; keine neue KI-Migration.
- Originaldesign-Archiv aus 3.20.65 bleibt **unverändert** im vorhandenen Projekt.
- Vollständiges Live-Deployment wird nicht automatisch durchgeführt.

# Einbau CFS Zockt 3.20.71 · Admin Finanzen & RC

**Ausgang:** Website 3.20.70 (inkl. Shop/AI/Admin-Funktionen). Lokale CFS AI benötigt weiterhin Update 3.20.70 für den Admin-Bridge-Transport.

1. Website, Datenbank und lokale CFS-AI-Dateien vorher sichern.
2. Website-Delta entpacken; `node install-update.cjs --check <website-3.20.70-ordner>`.
3. Bei erfolgreicher Vorprüfung `node install-update.cjs --apply <website-3.20.70-ordner>`.
4. Website mit den üblichen Deploy-Prozessen ausrollen. **Nicht** automatisch Produktions-Launch freigeben.
5. Website neu starten. Als Admin im Control Center anmelden, starke Admin-Freigabe aktivieren, `Finanzen & Einnahmen` öffnen.
6. Im Website-Projekt `npm run check:v32071` ausführen, `node tools/rc-readiness-v32071.mjs` lesen.
7. Realtests nach `RC-CHECKLIST-3.20.71.md` dokumentieren.

**Hinweis:** Für Monatsstatistiken wird `creator_billing_events` verwendet; keine neue Datenbankmigration. Erst ab diesem Update werden Beträge aus signierten Stripe-`invoice.paid`-Ereignissen gespeichert. Bestehende Webhooks liefern keine vollständigen historischen Umsatzzahlen. Für Refund-Anzeige muss `charge.refunded` im Stripe-Webhook zugestellt werden.

**Beta HOLD:** Shop-Checkout für `paid_preview` weiterhin deaktiviert. Keinen Paid-LIVE-Release behaupten.

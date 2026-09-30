# HANDOFF v155 — reale Acceptance gestartet / Testkette gehärtet

Aktiver Release-Stand: **v155**  
Backend **3.20.1** · Schema **73** · Launcher **0.47.27**

Der Feature Freeze aus v154 bleibt aktiv. v155 enthält nur Fehler-/Test-/Diagnosehärtung.

## Fertig

- erste lokale Acceptance-Runde ausgeführt
- R59/R68-Wiring-Lücken gefunden und korrigiert
- R68 auf Schema 73 aktualisiert
- Projekt-Regression jetzt 40/40 PASS
- Stream-Credential-Store echter Unit-/Contract-Test 29/29 PASS
- Private-Beta-Acceptance-Vertrag 34/34 PASS
- separater Windows-Starter `RUN-PRIVATE-BETA-ACCEPTANCE.cmd`
- kompletter `release:v155` PASS

## Wichtig

Der alte allgemeine Production-R59-R67-Workflow enthält einen Stripe-LIVE-Schritt. Dieser gehört nicht zur kostenlosen privaten Beta. Für die aktuelle Testphase den neuen Private-Beta-Starter verwenden.

## Nächster Arbeitsauftrag

Auf echtem Windows die reale Testfolge aus `PRIVATE-BETA-ACCEPTANCE-v155.md` und dem integrierten Beta-Test-Handbuch durchführen: Launcher/SafeStorage → OBS → Twitch → TikTok falls offizieller Zugang → YouTube nach OAuth-Setup → Multistream/Reconnect → Soak → Multi-Creator → Installer/Signing/SmartScreen.

Keine Stream-Keys, Passwörter oder Provider-Tokens in Chat/Screenshots kopieren.

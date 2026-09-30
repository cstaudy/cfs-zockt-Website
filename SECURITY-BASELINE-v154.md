# SECURITY BASELINE v154 — Beta-Test-Handbuch

v154 erweitert die bestehende Beta-Infrastruktur, ohne neue Secret-Klassen in Cloud oder Admin Control einzuführen.

## Sicherheitsinvarianten

- Handbook-Ergebnisse sind strikt an `creator_id` gebunden.
- Fremde `session_id` wird serverseitig abgewiesen.
- Nur bekannte statische `step_key` werden akzeptiert.
- Nur `passed`, `failed` oder `skipped` sind erlaubt.
- Kommentare werden bereinigt und auf 2000 Zeichen begrenzt.
- Diagnose ist **opt-in** pro Testschritt.
- Diagnose nutzt ausschließlich `sanitizeBetaDiagnostics()`.
- keine Stream-Keys
- keine Provider-Tokens
- keine Bridge-Schlüssel
- keine Passwörter / Recovery Codes
- keine vollständigen Logs
- mutierende Bridge-Requests bleiben signiert und replay-geschützt
- Handbook-Antworten sind `Cache-Control: no-store`
- Admin-Auswertung erhält ausschließlich die gespeicherten strukturierten Resultate und den begrenzten Diagnose-Snapshot

## Private-Beta-Baseline

- `CFS_COMMERCIAL_MODE=false` bleibt Default.
- TikTok/Twitch Provider-Beta bleibt aktivierbar und serverseitig erzwungen.
- YouTube gehört weiterhin nicht zur geschlossenen TikTok/Twitch-Freigabe.
- Provider-/Stream-Credentials bleiben außerhalb des neuen Handbook-Datenmodells.

## Validierung

- `beta-test-handbook-v154-test.mjs`: **57/57 PASS**
- `feature-freeze-v154-test.mjs`: **33/33 PASS**

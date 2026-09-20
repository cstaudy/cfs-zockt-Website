# Stream Studio – Pass 21.10.23 – Soak Guard / automatische technische Abnahme-Auswertung

## Ziel

Pass 21.10.23 setzt auf der Runtime Evidence aus Pass 21.10.22 auf. Eine abgeschlossene Soak-Session erhält jetzt zusätzlich einen nachvollziehbaren technischen Guard mit Einzelchecks statt eines intransparenten Gesamtscores.

Der Guard unterscheidet vier Zustände:

- `PASS` – die gemessene technische Bedingung liegt innerhalb der Guard-Grenzen,
- `WARN` – auffällig, aber nicht automatisch als harter technischer Fehler gewertet,
- `FAIL` – harter technischer Fehler oder deutliche Grenzwertverletzung,
- `INCOMPLETE` – für eine belastbare Soak-Aussage fehlen Dauer, Samples oder Messwerte.

Der Guard ist **keine automatische reale Plattform-Abnahme**. Er bewertet ausschließlich die lokal gespeicherte technische Evidence. Eine echte Windows-/Provider-Abnahme bleibt eine separate menschliche Freigabe.

## Default-Profil `windows_multistream_10m`

Die Defaults sind CFS-interne Produktgrenzen für reproduzierbare Soak-Tests und keine Zusage eines Streaming-Providers:

- Mindestdauer: 10 Minuten,
- Evidence-Abdeckung: mindestens 85 % der aus dem Sample-Intervall erwarteten Samples,
- Encoder-Speed: WARN unter 0,98x, FAIL unter 0,90x,
- FPS: sofern erwartete FPS bekannt sind, WARN unter 97 %, FAIL unter 90 % des Sollwerts,
- Dropped Frames: WARN über 5, FAIL über 30,
- Ziel-Live-Coverage: WARN unter 98 %, FAIL unter 95 %,
- längste Ziel-Unterbrechung: WARN über 10 s, FAIL über 30 s,
- Recording-Live-Coverage: dieselben 98/95-%-Grenzen,
- Recording-Unterbrechung: dieselben 10/30-s-Grenzen,
- Engine-Errors, FFmpeg-Watchdog-Restarts oder Scene-Switch-Fehler: FAIL,
- Transition-Fallback auf CUT: WARN,
- Game-Capture-Helper-Restarts, Frame-Stalls und D3D-Recovery werden mit Recovery-Budgets bewertet,
- Application-Audio-Recovery und Continuity-Silence werden ebenfalls mit Recovery-Budgets bewertet.

## Kontinuitätsmessung

Pass 21.10.22 hat bereits Status-Samples gesammelt. Pass 21.10.23 leitet daraus zusätzlich pro Streaming-Ziel ab:

- `liveCoveragePct`,
- `nonLiveSamples`,
- `longestNonLiveMs`,
- maximale Reconnect-Stufe,
- Error-Samples.

Für Recording werden dieselben Kontinuitätswerte ermittelt. Dadurch kann ein kurzer kontrollierter Reconnect von einer längeren Unterbrechung unterschieden werden.

## Acceptance-Szenarioabdeckung

Neben dem technischen Guard wird separat festgehalten, ob die für die geplante reale Abnahme wichtigen Szenarien tatsächlich beobachtet wurden:

- mindestens ein Scene-Wechsel,
- mindestens eine animierte Transition,
- bei mindestens zwei Streaming-Zielen ein isolierter Ziel-Reconnect,
- bei Game Capture ein Window-/Process-Rebind,
- bei Process-Loopback-Audio ein Application-Audio-Rebind,
- Recording, sofern es für die Session erwartet wurde.

Fehlende Pflichtszenarien machen die **Acceptance-Coverage `INCOMPLETE`**, auch wenn die reine technische Streamqualität ansonsten `PASS` ist. Dadurch wird ein normaler stabiler Stream nicht fälschlich als vollständige Abnahme interpretiert.

## Evidence-Datei

Die bestehende Evidence aus Pass 21.10.22 bleibt kompatibel (`kind: stream_runtime_soak_evidence`, Evidence-Pass 21.10.22). Neu werden beim Finalisieren zusätzlich gespeichert:

- `guardPass: 21.10.23`,
- `guard`,
- `summary.guard`,
- Sample-Intervall und erwartete FPS in den Session-Metadaten.

Streamkeys, Tokens, Zugangsdaten sowie Audio-/Video-/BGRA-/PCM-Payloads bleiben weiterhin ausgeschlossen.

## Launcher UI

Der Runtime-Evidence-Bereich zeigt jetzt zusätzlich:

- technischen Guard-Status,
- Acceptance-Coverage,
- Anzahl WARN/FAIL/INCOMPLETE,
- kompakte Hinweise zu den wichtigsten offenen oder fehlerhaften Checks.

## CLI

Normale Zusammenfassung inklusive Guard:

```powershell
npm.cmd run stream-evidence:summary -- --file "PFAD_ZUR_EVIDENCE.json"
```

Expliziter Guard-Aufruf:

```powershell
npm.cmd run stream-evidence:guard -- --file "PFAD_ZUR_EVIDENCE.json"
```

Optional kann `--strict` für Automatisierung ergänzt werden. Dann liefert ein technisches `FAIL` Exit-Code 2; `WARN` oder `INCOMPLETE` liefert Exit-Code 1.

## Reale Abnahme bleibt offen

Nicht automatisch als real bestanden markieren:

- Windows-Hardware-Soak mit echtem Game Capture,
- Camera + Widgets,
- Mic + Game + Discord und optional Music/Alerts,
- getrenntes Recording,
- echte YouTube-/Twitch-/TikTok-Ziele,
- absichtlich provozierter isolierter Ziel-Reconnect,
- Alt-Tab / Window-Rebind,
- Application-Audio-Rebind,
- 10–15 Minuten Dauer unter realer Upload-/Encoder-Last.

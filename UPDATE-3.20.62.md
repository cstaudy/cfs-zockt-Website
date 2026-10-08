# CFS Zockt · Update 3.20.62

## Block 04 · Tonstudio / lokale Alert-Samples (CODE-TESTS PASS · LIVE HOLD)

**Basis:** Website 3.20.61. **Ziel:** selbstgewählte Audio-Samples im Browser tatsächlich schneiden, bearbeiten, vorhören und als WAV herunterladen, ohne Audio ins Backend zu übertragen.

### Umsetzung

1. Neues eigenes Modul `audio-sample-core-v32062.js`: Dateityp-/Größenprüfung, decoded-Buffer-Prüfung, samplegenaue Trim-Grenzen, Verstärkung in dB, Fade-in/Fade-out, optionaler Peak-Schutz bei **−1 dBFS** durch reine Absenkung sowie Stereo/Mono-16-Bit-PCM-WAV-Encoder.
2. Neuer browserlokaler Editor in `audio-studio.html` mit Dateiauswahl/Drag-and-Drop, gezeichneter Wellenform, Start/Ende (maximal 30 Sekunden), Fade-In/Fade-Out, Gain −24 bis +12 dB, Live-Status, Wiedergabe/Stopp und lokalem WAV-Download. Akzeptiert WAV/MP3/OGG/M4A/AAC/FLAC/OPUS/WebM **soweit der jeweilige Browser den Codec dekodiert**. Eingabedateien maximal 20 MB und 120 Sekunden. Nicht unterstützte Dateien werden abgelehnt.
3. **Identischer bearbeiteter PCM-Datensatz** als Web-Audio-Preview-Buffer und WAV-Export – die Datei wird nicht ins Backend hochgeladen; selbst bei gesperrten Server-Presets steht der lokal arbeitende Sample-Editor als separater Bereich zur Verfügung.
4. Bestehende serverseitige Master-/Voice-/Game-/Soundboard-Presets und ihre Plan-Rechte **unverändert**. Kein lokales Mikrofonrouting, kein System-Audio-Mixer, keine automatische Sound-Zuweisung an ein Widget, keine dauerhafte Speicherung im Browser. Die bereits vorhandene Live-Audio-/Voice-Chain-Roadmap bleibt sichtbar.
5. `server.js` Versionskennung und `package-lock.json` auf 3.20.62 gebracht. Alter Regressionstest 3.20.61 akzeptiert jetzt wie vorgesehen auch 3.20.62 (nur die fest codierte Versionsassertion angepasst).

### Tests / tatsächlich nachgewiesen

- `node tools/audio-sample-studio-v32062-test.mjs`: **16/16 PASS**. Darunter Fade/Trim/Peak-Limit, Mono/Stereo-WAV-Header, Dateigrenzen, Datei-Namen, PCM-Identität der Wiedergabe- und Exportdaten, Markup und fehlender Netzwerkaufruf des lokalen Editors.
- `npm run check:v32062`: **PASS** mit integriertem `check:v32061`/`check:v32060` (bestehende fokussierte Provider- und Widget-Regression). Die vollständige historische Test-Suite ist **nicht** enthalten, weil im gelieferten Bestand ältere Testdateien fehlen.
- Unabhängiger externer Decoder: generiertes Stereo-WAV durch `ffprobe` als `pcm_s16le`, 48 kHz, 2 Kanäle und 0,8 s erkannt; `ffmpeg` vollständig dekodiert (**PASS**).
- **Nicht bestanden/nicht abgeschlossen:** Headless-Chromium-Smoke-Test lief in dieser Testumgebung in ein Zeitlimit; deshalb **keine** erfolgreiche Browser-E2E-Aussage und **keine** echten Kopfhörer-/OBS-Hörtests behauptet.

### Manuelle Acceptance – offen

1. Mit mindestens einem echten WAV-, MP3-, OGG- und Browser-spezifischen M4A/FLAC-Sample in aktuellen Windows-/macOS-/Mobil-Browsern laden, Wellenform markieren und Vorschau per Klick hören. Codec-Support je Browser dokumentieren.
2. Ein- und Ausblenden, Gain und Peak-Schutz anhand mehrerer Samples mit Headset und OBS testen; kontrollieren, dass exportierte WAV wie die angehörte Version klingt (Timing, Clip-Ränder, Mono/Stereo, keine hörbaren Klicks).
3. Drag-and-Drop, defekte Dateien, 20-MB-Grenze, über 120 Sekunden lange Quellen, 30-Sekunden-Ausschnitt, raschen Dateitausch, Abbruch/erneuten Start und Mobile-Layout kontrollieren.
4. Auth-/Plan-Fall: lokale Sample-Bearbeitung von serverseitigem Preset-Zugang getrennt halten; prüfen, dass kein Audio-Payload an Backend/Provider gesendet wird (Devtools Netzwerkansicht).
5. Reale Windows-Launcher-/OBS-Anbindung der WAV-Datei ist **nicht** Teil dieses Releases; Browser-E2E, Provider-Live-Events, 60-Minuten-Soak und alle vorhandenen BETA-HOLD-Gründe separat abnehmen.

### Nicht geändert / Blocker

- DB Schema 80, Launcher 0.47.31, Provider-Runtime und Plan-/Checkout-Policy unverändert; keine DB-Migration, kein Windows-Build, kein Deployment.
- `public/assets/data/design-pack-catalog-v211.json` und Teile des historischen Testsatzes fehlen weiterhin im angelieferten Projektarchiv; keines wurde mit erfundenen Inhalten ersetzt.
- Versionsstand: **CODE TESTS PASS / LIVE ACCEPTANCE HOLD / BETA HOLD**.

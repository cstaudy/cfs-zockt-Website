# Tests · CFS AI Design Factory Integration 3.20.69

Stand 08.10.2026. Tests wurden lokal in dieser Laufzeit auf einer CFS AI v20-Testkopie ausgeführt.

- 11/11 neue Tests PASS, inklusive SVG-/Eingabeprüfung, Erzeugung nur mit Modellantwort (Mock), Duplikat-/Tageslimit, Entwurf → Freigabe/Ablehnung → ZIP-Staging und FastAPI-Lokalrouten.
- FastAPI-Smoke: `/design-factory`, `/api/design-factory/status`, `/api/design-factory/drafts` HTTP 200.
- Fremder Browser-Origin bei schreibender Route: HTTP 403.
- Installer: 5 Dateien; frische Basis PASS, zweite Installation 0 Änderungen, Kundendateikonflikt EXIT 1 ohne Überschreiben.
- Python-Syntaxkompilierung der drei Integrationsdateien PASS.
- FastAPI meldet bestehende `on_event`-DeprecationWarnings aus dem ursprünglichen Projekt. Kein Testfehler.

**Nicht getestet:** Windows/Ollama-Live-Modell, Remote-Bridge-Verbindung, tatsächlicher Render-Deploy, OBS oder reale Shop-Abnahme. Der AI-Entwurf ist ein deterministisch aus Modellparametern erzeugtes SVG-Paket, kein photorealistischer Bildgenerator.

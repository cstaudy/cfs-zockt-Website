# Einbau 3.20.67

## Delta von 3.20.66
1. Vorher Projekt sichern.
2. Delta entpacken und in den Delta-Ordner wechseln.
3. `node install-update.cjs --check /pfad/zu/cfs-zockt-Website-main`
4. `node install-update.cjs --apply /pfad/zu/cfs-zockt-Website-main`
5. Im Projekt `npm run check:v32067` ausführen.

## Vollarchiv
Die Vollversion enthält den gesamten Projektcode und die Original-Designarchive aus 3.20.66. Vor einer echten Veröffentlichung Umgebungsvariablen/Provider separat einrichten und die manuelle Browser-Abnahme durchführen.

## Optional: CFS AI
Bestehenden CFS-AI-Dienst/Bridge wie bisher konfigurieren. Keine Modell-Tokens in den Browser oder Quellcode kopieren. Die Shop-Beratung funktioniert bei nicht aktiviertem Dienst als Katalogsuche; echte Modellanalyse bleibt Admin-Funktion.

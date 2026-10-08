# CFS Zockt · Admin Control Center 3.20.70

**Website-Ausgangsversion:** 3.20.68. **Lokale CFS AI:** mit installiertem Zusatzupdate 3.20.69.

## Neu im Website Admin

- `/pages/admin-creators.html` > Schnellzugriff **CFS AI Designs**.
- KI/Bridge-Status, Produktionslimits, private Entwurfsgalerie, Einzel-Freigabe oder Ablehnung.
- Freigegebene Designs als lokales ZIP herunterladen (maximal 2 MB über die Bridge).
- Längere oder große Exporte: nur direkt auf der lokalen CFS-AI-Instanz herunterladen.
- Auch freigegebene Designs werden **nicht** automatisch in die laufende Website kopiert.

## Einbau in zwei getrennte Programme

1. Website: `node install-update.cjs --check <website-3.20.68-ordner>` und dann `--apply`.
2. Lokale CFS AI **v20 mit installiertem 3.20.69-Update**: `py -3 install_update.py --check <cfs-ai-ordner>` und anschließend `--apply`.
3. Lokale CFS AI, die Bridge und die Website neu starten.
4. Website-Umgebung: `CFS_AI_ENABLED=true`, `CFS_AI_TRANSPORT=bridge`, gültigen Bridge-Token in sicheren Umgebungsvariablen setzen. Derselbe Token im lokalen Bridge-Worker.
5. In der Website als Admin anmelden und die Admin-Sicherheitsfreigabe entsperren; Bereich **CFS AI Designs** öffnen.

**Keine Weitergabe von `.env.local.bat`, Passwörtern oder Schlüsseln.** Das installierte ZIP muss lokal auf Windows geprüft werden. Keine Live-Verifikation/Ollama- oder OBS-Prüfung erfolgt.

## Grenzen

- Ohne laufenden PC, Ollama und Bridge wird **OFFLINE/DEAKTIVIERT** angezeigt.
- Die automatische Produktion ist standardmäßig AUS.
- SVG-Vorschauen sind auf 300 KB begrenzt, remote Shop-ZIPs auf 2 MB.
- Schreibende Aufrufe benötigen Creator-Admin-Session, CSRF-Schutz und Admin-Step-up.
- Shop-Deployment bleibt manuell.

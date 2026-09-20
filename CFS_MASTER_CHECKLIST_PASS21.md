# CFS_Zockt – Master Checklist

**Stand:** 2026-09-19  
**Aktueller Entwicklungsstand:** Pass 21.10.34  
**Ziel:** Diese Datei ist ab jetzt die zentrale, fortlaufend aktualisierte Checkliste für Website, Creator Suite, Stream Studio, Launcher, Integrationen, Production und Security.

## Status-Legende

- ✅ **PASS / fertig** – umgesetzt und Repository-Checks bestanden
- 🟡 **gebaut / noch Production- oder Browser-Test offen**
- ⬜ **offen**
- ⏸ **später / Roadmap**
- 🚫 **bewusst nicht aktiv**

---

# 1. Repository, GitHub & Deployment

- [x] ✅ Neues GitHub-Repository `cstaudy/cfs-zockt-Website`
- [x] ✅ Branch `main`
- [x] ✅ Lokaler permanenter Clone eingerichtet
- [x] ✅ Backend `package-lock.json`
- [x] ✅ Launcher `package-lock.json`
- [x] ✅ GitHub-Readiness Pass 21
- [x] ✅ Security Policy / CODEOWNERS / Dependabot / PR-Template
- [x] ✅ Node 22+ Anforderungen
- [x] ✅ Render mit neuem Repository verbunden
- [x] ✅ Render Build mit `npm ci`
- [x] ✅ Render Start mit `npm start`
- [x] ✅ Health Check `/api/health`
- [x] ✅ PostgreSQL-Verbindung
- [x] ✅ Domain `https://cfs-zockt.de`
- [ ] 🟡 Node-Version auf Render noch exakt pinnen statt nur `>=22`

**Letzter bekannter Repo-Check:** GitHub Readiness 30/30 PASS

---

# 2. Öffentliche Website

## 2.1 Struktur & Navigation

- [x] ✅ Sitemap und Hauptnavigation
- [x] ✅ Öffentliche Navigation von Creator-Navigation getrennt
- [x] ✅ Einheitlicher Header
- [x] ✅ Mobile Navigation
- [x] ✅ Einheitlicher Footer
- [x] ✅ Creator-Suite-Übersichtsseite
- [x] ✅ Pläne-Seite
- [x] ✅ Roadmap-Seite
- [x] ✅ Support-Seite
- [x] ✅ Sicherheitsseite
- [x] ✅ Datenschutz
- [x] ✅ Impressum
- [x] ✅ Nutzungsbedingungen

## 2.2 Startseite

- [x] ✅ Hero / klare Produktbotschaft
- [x] ✅ FREE-Einstieg
- [x] ✅ reale Produktstatus statt Fake-Zahlen
- [x] ✅ Widget Studio
- [x] ✅ Creator Suite
- [x] ✅ Launcher
- [x] ✅ Games
- [x] ✅ Sicherheit / Account-Kontrolle
- [x] ✅ Pläne
- [x] ✅ Roadmap
- [x] ✅ Support / Feedback
- [x] ✅ Abschluss-CTA

## 2.3 Auth-Einstieg

- [x] ✅ Login vereinheitlicht
- [x] ✅ Registrierung vereinheitlicht
- [x] ✅ Passwort-Recovery
- [x] ✅ E-Mail-Bestätigung
- [x] ✅ FREE-Start erklärt
- [x] ✅ Übergang Website → Dashboard erklärt
- [x] ✅ MFA-/Passkey-Einstieg sichtbar
- [x] ✅ Auth-Seiten `noindex`

## 2.4 Qualität

- [x] ✅ Responsive-Grundlage
- [x] ✅ Accessibility-Basis
- [x] ✅ Skip-Link
- [x] ✅ `focus-visible`
- [x] ✅ Touch-Flächen
- [x] ✅ Reduced Motion
- [x] ✅ High Contrast / Forced Colors
- [x] ✅ Empty / Loading / Error States
- [x] ✅ visuelles Feintuning
- [x] ✅ interne Link-/CTA-Abnahme
- [ ] 🟡 kompletter manueller Mobile-Browser-Test auf echten Geräten

**Bekannte Checks:**  
Website Acceptance 34/34 PASS  
Accessibility 22/22 PASS  
Visual Polish 19/19 PASS  
SEO PASS

---

# 3. Creator Suite

## 3.1 Creator Shell

- [x] ✅ gemeinsame interne Navigation
- [x] ✅ Dashboard
- [x] ✅ Widget Studio
- [x] ✅ Scene Studio
- [x] ✅ Creator Editor
- [x] ✅ TikTok
- [x] ✅ Integrationen
- [x] ✅ Launcher
- [x] ✅ Games
- [x] ✅ Cut Studio
- [x] ✅ NEXUS
- [x] ✅ Audio Studio
- [x] ✅ Account
- [x] ✅ Setup
- [x] ✅ Einstellungen

## 3.2 Dashboard

- [x] ✅ Begrüßung / Einstieg
- [x] ✅ „Als Nächstes“-Logik
- [x] ✅ Grundsetup → Widget → TikTok → Launcher
- [x] ✅ Statuskarten
- [x] ✅ Verfügbar / Beta / Preview / Roadmap
- [x] ✅ klare Plan-/Zugriffsanzeige
- [x] ✅ manuelle Widgets ohne TikTok erklärt

## 3.3 Verwaltung

- [x] ✅ Account-Bereich
- [x] ✅ Einstellungen
- [x] ✅ Setup
- [x] ✅ Integrationen
- [x] ✅ Profil & Zugriff
- [x] ✅ Anmelde-Schutz
- [x] ✅ Daten & Kontrolle
- [x] ✅ TikTok / Launcher verfügbar
- [x] ✅ Twitch / OBS als Roadmap

## 3.4 interne Module

- [x] ✅ Launcher-Gerätefluss
- [x] ✅ NEXUS als Preview
- [x] ✅ Audio Studio als Roadmap
- [x] ✅ Creator Editor verknüpft
- [x] ✅ Cut Studio als Beta

**Bekannte Checks:**  
Creator Shell 93/93 PASS  
Dashboard 14/14 PASS  
Creator Tools 35/35 PASS  
Creator Management 25/25 PASS  
Internal Modules 27/27 PASS

---

# 4. Widget Studio

- [x] ✅ Einfach-Modus
- [x] ✅ Profi-Modus
- [x] ✅ Goal
- [x] ✅ Counter
- [x] ✅ Timer
- [x] ✅ Chat
- [x] ✅ Kamera
- [x] ✅ manuelle Widgets unabhängig von TikTok
- [x] ✅ Draft-Workflow
- [x] ✅ Publish als bewusster Schritt
- [x] ✅ keine automatische Veröffentlichung bei Quick Starts
- [x] ✅ öffentliche Outputs nur aus veröffentlichten Konfigurationen
- [x] ✅ Widget-Bibliothek für Stream Studio
- [ ] 🟡 echter Browser-End-to-End-Test: Widget erstellen → Publish → Output

---

# 5. Scene Composer (im Stream Studio)

- [x] ✅ Scenes
- [x] ✅ Ebenen
- [x] ✅ veröffentlichte Creator-Quellen
- [x] ✅ Besitz-/Creator-Prüfung
- [x] ✅ Scene-Publish
- [x] ✅ Scene Output
- [x] ✅ Scene-Transitions
- [x] ✅ Schnitt
- [x] ✅ Fade
- [x] ✅ Dissolve
- [x] ✅ Slide rechts
- [x] ✅ Slide links
- [x] ✅ Slide unten
- [x] ✅ Zoom
- [x] ✅ Übergangsdauer
- [x] ✅ Easing
- [x] ✅ Übergang testen
- [x] ✅ alte Szenen bleiben kompatibel
- [ ] ⬜ Scene Presets
- [x] ✅ Scene duplizieren
- [x] ✅ Scene löschen mit sicherer Bestätigung
- [x] ✅ Scene-Reihenfolge per Drag & Drop / Sortierung
- [ ] ⬜ schneller Scene-Wechsel / Hotkeys

**Bekannter Check:** Scene Transitions 59/59 PASS

---

# 6. CFS Stream Studio

## 6.1 Foundation

- [x] ✅ eigene Seite `/pages/stream-studio.html`
- [x] ✅ Preview / Program getrennt
- [x] ✅ Scene-Auswahl
- [x] ✅ Scene-Transitions integriert
- [x] ✅ Widget-Bibliothek
- [x] ✅ Overlay-Bibliothek
- [x] ✅ Quick Overlay Rack
- [x] ✅ Drag & Drop für Overlays
- [x] ✅ lokale Quellen vorbereitet
- [x] ✅ Bildschirm-Quelle vorbereitet
- [x] ✅ Fenster-Quelle vorbereitet
- [x] ✅ Game-Capture vorbereitet
- [x] ✅ Kamera vorbereitet
- [x] ✅ Audio-Mixer vorbereitet
- [x] ✅ Auflösung
- [x] ✅ FPS
- [x] ✅ Encoder-Auswahl vorbereitet
- [x] ✅ Bitrate
- [x] ✅ Audio-Einstellungen
- [x] ✅ Aufnahmeformat
- [x] ✅ Launcher-Konfigurations-Endpunkt
- [x] ✅ Rohvideo/-audio bleibt lokal
- [x] ✅ Dockable Studio Workspace
- [x] ✅ Szenen-Panel verschiebbar
- [x] ✅ Szenenübergang-Panel verschiebbar
- [x] ✅ Quellen-Panel verschiebbar
- [x] ✅ Quick Overlay Rack verschiebbar
- [x] ✅ lokale Quellen verschiebbar
- [x] ✅ Audio Mixer verschiebbar
- [x] ✅ Output-Panel verschiebbar
- [x] ✅ Multistream-Panel verschiebbar
- [x] ✅ Panels zwischen links / Mitte / rechts / unten / breit verschiebbar
- [x] ✅ **Pass 21.10.11 – alle Studio-Panels frei skalierbar**
- [x] ✅ Preview/Program als verschiebbares Studio-Panel
- [x] ✅ Stream Check als verschiebbares Studio-Panel
- [x] ✅ Szenenübergang frei verschiebbar **und** skalierbar
- [x] ✅ Breite/Höhe je Panel persistent gespeichert
- [x] ✅ linke/rechte Studio-Spalte per Trennkante skalierbar
- [x] ✅ Doppelklick am Resize-Griff setzt einzelne Panelgröße zurück
- [x] ✅ mobile Ansicht ignoriert Desktop-Festgrößen sicher
- [x] ✅ Studio-Layout wird serverseitig allowlist-basiert gespeichert
- [x] ✅ Standardlayout kann wiederhergestellt werden
- [x] ✅ Scene Composer direkt im Stream Studio integriert
- [x] ✅ 16:9- und 9:16-Scenes direkt im Stream Studio erstellen
- [x] ✅ Scene-Namen, Format, Hintergrund und Safe Area im Composer bearbeiten
- [x] ✅ veröffentlichte Widgets/Overlays nativ zur Scene hinzufügen
- [x] ✅ Scene-Quellen auf dem Canvas per Drag & Drop positionieren
- [x] ✅ X/Y, Skalierung, Rotation, Deckkraft und Ebene bearbeiten
- [x] ✅ Scene-Quellen sperren / entsperren und ein-/ausblenden
- [x] ✅ Scene direkt speichern und veröffentlichen
- [x] ✅ Scene direkt duplizieren
- [x] ✅ Scene mit Bestätigung löschen
- [x] ✅ Scene-Reihenfolge per Drag & Drop speichern
- [x] ✅ Scene-Übergang direkt im Composer konfigurieren und testen
- [x] ✅ bisheriges Scene Studio bleibt vorerst als Kompatibilitäts-Fallback erhalten

**Bekannte Checks:** Stream Studio 46/46 PASS · Dock Layout Pass 21.9.1 · Scene Composer Pass 21.9.2

## 6.2 Local Multistream

- [x] ✅ Multistream-Control-Plane
- [x] ✅ YouTube-Ziel
- [x] ✅ Twitch-Ziel
- [x] ✅ TikTok-Ziel
- [x] ✅ Kick-Ziel
- [x] ✅ Facebook-Ziel
- [x] ✅ Custom RTMP / RTMPS vorbereitet
- [x] ✅ Ziel einzeln aktivierbar
- [x] ✅ eigenes Profil pro Ziel
- [x] ✅ eigene Bitrate pro Ziel
- [x] ✅ Upload-Berechnung
- [x] ✅ Bandbreitenreserve
- [x] ✅ serverseitige Plan-Limits
- [x] ✅ FREE = 1 Ziel
- [x] ✅ CREATOR = 2 Ziele
- [x] ✅ PRO = 4 Ziele
- [x] ✅ Admin/Test = 8 Ziele
- [x] ✅ Streamkeys nicht in Website/PostgreSQL speichern
- [x] ✅ Zielausfall soll andere Ziele nicht beenden
- [x] ✅ Twitch-Verbindung über lokalen RTMP-Ingest + Stream-Key vorgesehen
- [x] ✅ YouTube-Verbindung über lokalen RTMPS-Ingest + Stream-Key vorgesehen
- [x] ✅ TikTok-Verbindung als **zugangsabhängig** markiert: nur mit LIVE-/Encoder-Zugang und bereitgestellter Server-URL + Stream-Key
- [x] ✅ provider-spezifische Setup-Hinweise im Website- und Launcher-UI
- [x] ✅ lokaler Multistream-Preflight prüft Bridge, Engine, Planlimit, SafeStorage und Keys je aktivem Ziel
- [x] ✅ einzelnes Streaming-Ziel kann während laufender Session lokal gestoppt und wieder gestartet werden
- [x] ✅ manuell gestopptes Ziel startet nicht automatisch durch Reconnect erneut
- [x] 🚫 Cloud Relay bewusst noch deaktiviert

**Bekannte Checks:** Local Multistream 70/70 PASS · Stream Control Center Pass 21.10.7 (Repository)

---

## 6.4 Studio Hub Architektur

- [x] ✅ **Pass 21.10.10 – CFS Studio Hub**
- [x] ✅ LIVE bleibt zentraler Produktions-Workspace
- [x] ✅ Scene Composer bleibt direkt im Stream Studio
- [x] ✅ Live Audio Mixer bleibt direkt im Stream Studio
- [x] ✅ Cut Studio ist über denselben Studio Hub erreichbar, bleibt aber eigener Postproduktions-Workspace
- [x] ✅ Launcher ist über denselben Studio Hub erreichbar, bleibt aber eine separate lokale Desktop-Engine
- [x] ✅ Widget Studio bleibt eigenständiger Builder, Widgets/Overlays sind im Stream Studio direkt verfügbar
- [x] ✅ Stream Session Dashboard mit Laufzeit, Startzeit, Live-Zielen, Upload, Reconnects und lokaler Daten-Schätzung
- [x] ✅ Session Dashboard ist verschiebbares Studio-Panel
- [x] ✅ Keine direkte Stream-Key-/Capture-Steuerung aus dem Browser-Dashboard
- [ ] 🟡 echte Windows-Live-Session zur Kalibrierung der Session-Telemetrie

**Architekturregel:** *Zusammen in der Bedienung, getrennt in den Laufzeit-Engines.* Ein Cut-Export, Audio-Postprocessing oder Launcher-Fehler soll den laufenden Stream nicht unnötig mitreißen.


# 7. Launcher Streaming Engine – IN ARBEIT

## 7.0 Pass 21.10.1 – Local Streaming Engine Core

- [x] ✅ eigene lokale `StreamEngine` im Launcher
- [x] ✅ Stream-Studio-Konfiguration wird über die geschützte Bridge synchronisiert
- [x] ✅ Capture / Encoding / RTMP bleiben lokal auf dem Creator-PC
- [x] ✅ separater verschlüsselter Store für RTMP/RTMPS-Zugangsdaten
- [x] ✅ Stream-Keys werden nicht an Website / PostgreSQL zurückgesendet
- [x] ✅ Stream-Keys werden nicht in portable Config-Backups aufgenommen
- [x] ✅ Stream-Keys werden nicht im Renderer-State zurückgegeben
- [x] ✅ FFmpeg-Logs werden vor Speicherung/Anzeige gegen bekannte Secrets redigiert
- [x] ✅ nur `rtmp://` und `rtmps://` als Streaming-Server zugelassen
- [x] ✅ Launcher-Seite **STREAM ENGINE**
- [x] ✅ Studio-Sync, Engine-Probe und Geräte-Erkennung im Launcher
- [x] ✅ lokales Start/Stop für Streaming Engine
- [x] ✅ ein FFmpeg-Prozess pro Ziel für Fehlerisolierung
- [x] ✅ Reconnect mit begrenztem Backoff pro Ziel
- [x] ✅ Laufzeitstatus pro Ziel (Status, FPS, Bitrate, Reconnects)
- [x] ✅ graceful Stop beim Launcher-Shutdown und Device-Logout
- [x] ✅ Repository-Test **76/76 PASS**
- [ ] 🟡 echter Windows-Hardware-/Netzwerk-Test steht noch aus


## 7.0.2 Pass 21.10.2 – Audio Mixer, Monitor/Crop & Watchdog

- [x] ✅ zweiter lokaler Audio-Bus in der Stream Engine
- [x] ✅ Lautstärke pro Audio-Bus (0–200 %)
- [x] ✅ Mute pro Audio-Bus
- [x] ✅ Audio-Sync-Delay pro Bus (0–2000 ms)
- [x] ✅ Audio-Busse werden lokal über FFmpeg `amix` zusammengeführt
- [x] ✅ gleiche Audioquelle kann nicht doppelt als Bus 1 und Bus 2 gewählt werden
- [x] ✅ Monitor-Auswahl im Launcher vorbereitet
- [x] ✅ DPI-Umrechnung über Electron Screen API mit Fallback vorbereitet
- [x] ✅ Capture-Crop X/Y/Breite/Höhe in der lokalen Engine
- [x] ✅ Dropped- und Duplicated-Frame-Auswertung aus FFmpeg-Status
- [x] ✅ Fortschrittsstatus wird gedrosselt live an den Launcher gesendet
- [x] ✅ Watchdog erkennt festhängende FFmpeg-Prozesse und stößt Recovery an
- [x] ✅ Watchdog-Timeout konfigurierbar (10–60 s)
- [x] ✅ Repository-Test **70/70 PASS**
- [ ] 🟡 echter Windows-Test mit zwei realen Audioquellen / Loopback steht noch aus
- [ ] 🟡 echter Multi-Monitor-/DPI-Test steht noch aus
- [ ] 🟡 echter Watchdog-/Stall-Test auf Windows steht noch aus

## 7.1 Capture

- [x] 🟡 Screen-Capture-Codepfad über Windows `gdigrab` umgesetzt; echter Windows-Test offen
- [x] 🟡 Window-Capture-Codepfad umgesetzt; echter Windows-Test offen
- [ ] ⬜ natives Game Capture mit eigenem Hook/Backend (nicht nur Fenster-Capture)
- [x] 🟡 Kamera-Capture-Codepfad über `dshow` umgesetzt; echter Windows-Test offen
- [x] 🟡 Auswahl mehrerer Monitore und DPI-Umrechnung implementiert; echter Multi-DPI-Windows-Test offen
- [x] 🟡 Capture-Crop X/Y/Breite/Höhe direkt in der Launcher Engine implementiert; echter Windows-Test offen
- [x] ✅ Capture-Fehler werden zielbezogen in den Engine-Status übernommen

## 7.2 Audio

- [x] 🟡 ein lokales `dshow`-Audioeingabegerät kann gewählt werden; echter Mikrofon-Test offen
- [ ] ⬜ natives Desktop-Audio / Loopback ohne Drittanbieter-Gerät
- [x] 🟡 zwei gleichzeitige lokale Audio-Geräte / Audio-Busse implementiert; echter Windows-Test offen
- [x] 🟡 Lautstärke / Mute pro Audio-Bus in der Media Engine implementiert; echter Windows-Test offen
- [ ] ⬜ Peak Meter
- [ ] ⬜ Monitoring
- [x] 🟡 Sync / Delay bis 2000 ms pro Audio-Bus implementiert; echter Windows-Test offen
- [ ] ⬜ Audio-Gerätewechsel während Laufzeit

## 7.3 Encoder

- [x] 🟡 H.264-Pipeline vorbereitet; echter Encode-Test auf Windows offen
- [x] 🟡 NVIDIA NVENC wird erkannt und kann gewählt werden; Hardwaretest offen
- [x] 🟡 AMD AMF wird erkannt und kann gewählt werden; Hardwaretest offen
- [x] 🟡 Intel Quick Sync wird erkannt und kann gewählt werden; Hardwaretest offen
- [x] 🟡 Software-Fallback `libx264` vorbereitet; Real-World-Test offen
- [x] ✅ Bitrate wird lokal begrenzt und als CBR-nahe Pipeline aufgebaut
- [x] ✅ Keyframe-Intervall = 2 Sekunden im aktuellen Profilmodell
- [ ] ⬜ Encoder-Überlast-Erkennung mit automatischer Qualitätsreaktion
- [ ] ⬜ sichere Encoder-Fallbacks während eines laufenden Streams

## 7.4 Recording

- [x] 🟡 lokale Aufnahme-Pipeline umgesetzt; echter Windows-Test offen
- [x] 🟡 MKV-Ausgabe vorbereitet und als bevorzugter sicherer Container verfügbar
- [x] 🟡 direkte MP4-Ausgabe technisch vorbereitet; Crash-Sicherheit noch offen
- [ ] ⬜ automatischer MKV → MP4 Remux-Workflow
- [ ] ⬜ Dateipfad-Auswahl
- [ ] ⬜ Speicherplatz-Prüfung vor Start
- [ ] ⬜ Recovery beschädigter/unvollständiger Aufnahme nach Crash

## 7.5 RTMP / RTMPS

- [x] 🟡 echte FFmpeg-RTMP-Ausgabepipeline implementiert; Netzwerk-Test offen
- [x] 🟡 echte FFmpeg-RTMPS-Ausgabepipeline implementiert; Netzwerk-Test offen
- [x] ✅ Stream-Key bleibt ausschließlich lokal
- [x] ✅ Stream-Key und Server-URL werden mit OS SafeStorage verschlüsselt gespeichert
- [ ] ⬜ echter Ziel-Verbindungstest ohne öffentlichen Stream
- [x] ✅ Reconnect pro Ziel implementiert
- [x] ✅ gestaffelter Backoff implementiert
- [x] ✅ Status pro Ziel vorhanden
- [ ] ⬜ einzelnes Start / Stop pro Ziel während laufender Session
- [x] ✅ Zielprozesse sind voneinander getrennt; echter Ausfalltest auf Windows noch offen

## 7.6 Performance & Stabilität

- [x] 🟡 FPS-Monitor aus FFmpeg-Statusdaten implementiert; Real-World-Test offen
- [x] 🟡 Bitrate-Monitor aus FFmpeg-Statusdaten implementiert; Real-World-Test offen
- [x] 🟡 Dropped-/Duplicated-Frames-Auswertung implementiert; Real-World-Test offen
- [ ] ⬜ CPU-Auslastung
- [ ] ⬜ GPU-Auslastung
- [ ] ⬜ RAM
- [ ] ⬜ Netzwerkqualität / Upload-Reserve in Echtzeit
- [x] 🟡 Watchdog gegen hängende FFmpeg-Prozesse implementiert; echter Stall-Test offen
- [ ] ⬜ Engine-Crash-Recovery
- [ ] ⬜ eigene Stream-Engine Log-Rotation / Größenlimit
- [ ] ⬜ Performance-Presets / Auto-Tuning

**Bekannte Checks:** Stream Engine Pass 21.10.1: 76/76 PASS · Audio & Stability Pass 21.10.2: 70/70 PASS (Repository). Reale Windows-Capture-, Audio-, Encoder-, Aufnahme- und RTMP-Abnahme bleibt bewusst offen.

## 7.0.7 Pass 21.10.7 – Multistream Connections & Control Center

- [x] ✅ Provider-Katalog für YouTube / Twitch / TikTok / Kick / Facebook / Custom RTMP
- [x] ✅ YouTube als direktes RTMPS + Stream-Key Ziel dokumentiert
- [x] ✅ Twitch als direktes RTMP + Stream-Key Ziel dokumentiert
- [x] ✅ TikTok bewusst nur als zugangsabhängiges Ziel markiert
- [x] ✅ offizielle Hilfe-Links werden nur aus festem lokalen Katalog geöffnet
- [x] ✅ Preflight im Launcher vor Multistream-Start
- [x] ✅ SafeStorage muss für lokale Stream-Keys verfügbar sein
- [x] ✅ fehlende Credentials werden pro Ziel angezeigt
- [x] ✅ Start/Stop einzelner Ziele bei laufender Engine
- [x] ✅ manueller Stop blockiert automatischen Reconnect für dieses Ziel
- [x] ✅ andere Ziele bleiben bei Einzelziel-Stop aktiv
- [ ] 🟡 echter Twitch RTMP-Test mit Testkanal
- [ ] 🟡 echter YouTube RTMPS-Test mit nicht gelistetem Teststream
- [ ] 🟡 echter TikTok-Test nur wenn das verwendete Konto Encoder-/Stream-Key-Zugang besitzt

---
# 8. Multi-Format Streaming

- [x] ✅ 16:9 Scene-Layout im Dual Canvas
- [x] ✅ 9:16 Scene-Layout im Dual Canvas
- [x] ✅ separate Layout-Positionen innerhalb derselben Scene
- [x] ✅ gleiche Widgets / Sources in beiden Formaten
- [x] ✅ format-spezifische öffentliche Scene-URLs
- [x] ✅ Preview/Program wählt Layout aus Output-Profil
- [ ] ⬜ Crop/Transform für lokale Capture-Quellen je Format
- [ ] ⬜ zwei Formate gleichzeitig im Launcher encodieren
- [ ] ⬜ Encoder-/Performance-Konzept für parallele Formate
- [ ] ⬜ echter 16:9 + 9:16 Windows-Dauertest

---

# 9. Multi Chat & Alerts

**Pass 21.10.5 – Studio Feed:** Repository-Implementierung fertig. **Pass 21.10.6:** Provider-Normalisierung/Bridge fertig; echte externe YouTube-/Twitch-/Kick-Chat-Verbindungen bleiben offen.

- [x] ✅ gemeinsamer Activity-/Multi-Chat-Feed im Stream Studio
- [x] ✅ Plattform-Badge / Provider-Metadaten pro Event
- [x] ✅ Filter YouTube vorbereitet
- [x] ✅ Filter Twitch vorbereitet
- [x] ✅ Filter TikTok
- [ ] ⬜ Multi-Chat als eigenes Widget / plattformübergreifender Overlay-Modus
- [x] ✅ Provider-Adapter-/Normalisierungsschicht für TikTok/Bridge/Simulator
- [ ] ⬜ echte YouTube-/Twitch-/Kick-Chat-Ingestion über offizielle APIs/Adapter
- [ ] ⬜ Antworten / Ban / Timeout nur dort, wo Provider sicher unterstützt
- [ ] ⬜ gemeinsame Alerts
- [ ] ⬜ Plattform-spezifische Alerts
- [ ] ⬜ plattformspezifische Schreib-/Moderationsadapter mit Rate Limits

---

# 10. Production-Abnahme

## 10.1 bereits geprüft

- [x] ✅ `/api/health` HTTP 200
- [x] ✅ Backend Version 3.12.0
- [x] ✅ PostgreSQL connected
- [x] ✅ `/api/public/status` online
- [x] ✅ Startseite HTTP 200
- [x] ✅ wichtige Security Header
- [x] ✅ `/api/account/me` ohne Login → 401
- [x] ✅ `/api/account/sessions` ohne Login → 401
- [x] ✅ `/api/creator/access` ohne Login → 401

## 10.2 noch offen

- [ ] 🟡 `npm.cmd run production21:smoke` gegen aktuellen Deploy
- [ ] 🟡 echter Login im Browser
- [ ] 🟡 `/api/account/me` angemeldet → 200
- [ ] 🟡 Sessions angemeldet → 200
- [ ] 🟡 Logout
- [ ] 🟡 Session-Revoke
- [ ] 🟡 Registrierung echter Browserlauf
- [ ] 🟡 Passwort-Recovery echter Browserlauf
- [ ] 🟡 TikTok OAuth echter Browserlauf
- [ ] 🟡 Widget erstellen → Publish → Output
- [ ] 🟡 Scene erstellen → Publish → Output
- [ ] 🟡 Scene Transition im echten Output
- [ ] 🟡 Launcher Device Link
- [ ] 🟡 Stream Studio Browserlauf
- [ ] 🟡 Multistream Production Smoke
- [ ] 🟡 Mobile Chrome
- [ ] 🟡 Mobile Safari / iOS wenn verfügbar
- [ ] 🟡 Desktop Chrome
- [ ] 🟡 Desktop Edge / Firefox

---

# 11. TikTok

- [x] ✅ OAuth-Struktur
- [x] ✅ OAuth State / Callback Checks
- [x] ✅ Creator-Trennung
- [x] ✅ Token-Leak-Schutz
- [x] ✅ Disconnect vorhanden
- [x] ✅ LIVE-Struktur
- [ ] 🟡 echter Production OAuth Login
- [ ] 🟡 Profil-Sync Production
- [ ] 🟡 LIVE-Daten echter Test
- [ ] 🟡 Fehlerfälle / abgelaufene Tokens
- [ ] 🟡 Reconnect nach Tokenverlust

---

# 12. Account & Security – vollständige Abnahme später

Die Schutzmechanismen bleiben aktiv. Die große Security-Abnahme wird nach Fertigstellung der Produktfunktionen durchgeführt.

## 12.1 Account

- [x] ✅ Passwort min. 15 Zeichen
- [x] ✅ Passphrase-Unterstützung
- [x] ✅ common/account-related Passwortblock
- [x] ✅ versioniertes scrypt
- [x] ✅ Session-Verwaltung
- [x] ✅ Logout-All
- [x] ✅ MFA TOTP
- [x] ✅ Recovery Codes
- [x] ✅ Passkeys / WebAuthn
- [x] ✅ Login-Anomalie-Erkennung
- [x] ✅ persistentes Login-Throttling
- [x] ✅ Security-Aktivität
- [x] ✅ Account-Löschung
- [x] ✅ Datenexport
- [ ] ⬜ vollständiger manueller Security-Test

## 12.2 Web Security

- [x] ✅ CSP
- [x] ✅ CSRF
- [x] ✅ Origin / Referer Checks
- [x] ✅ Fetch Metadata
- [x] ✅ Rate Limits
- [x] ✅ Host Allowlist
- [x] ✅ HTTPS fail-closed
- [x] ✅ Request IDs
- [x] ✅ generische API-Fehler
- [x] ✅ eigene 404 / 500
- [x] ✅ CSP Telemetry
- [x] ✅ Secure Cookies vorbereitet/aktiv
- [ ] ⬜ komplette Security Header Regression
- [ ] ⬜ CSRF Negativtests
- [ ] ⬜ Origin/Host Manipulation
- [ ] ⬜ Rate-Limit Belastungstest
- [ ] ⬜ Session Fixation / Rotation
- [ ] ⬜ Passkey Negativtests
- [ ] ⬜ MFA Recovery Negativtests

## 12.3 Admin Security

- [x] ✅ Admin-Reauth
- [x] ✅ 10-Minuten Step-Up
- [x] ✅ HMAC-verknüpftes Audit
- [x] ✅ keine sensiblen Bodies / Raw IPs / Fingerprints im Audit
- [ ] ⬜ vollständiger Production Admin Security Test

---

# 13. Backup, Recovery & Rollback

- [x] ✅ PostgreSQL Custom Dump Konzept
- [x] ✅ AES-256-GCM
- [x] ✅ scrypt + HKDF
- [x] ✅ SHA-256
- [x] ✅ HMAC Manifest
- [x] ✅ Dry-Run
- [x] ✅ Restore nur in separate leere DB
- [x] ✅ direkter Production Restore blockiert
- [x] ✅ Application Rollback Konzept
- [ ] ⬜ echter Production Backup-Lauf
- [ ] ⬜ echter Restore-Drill in separater DB
- [ ] ⬜ echter Code-Rollback Drill
- [ ] ⬜ kombinierter App + DB Recovery Drill
- [ ] ⬜ Recovery-Zeit dokumentieren

---

# 14. Monetarisierung

- [x] ✅ FREE / CREATOR / PRO vorbereitet
- [x] ✅ keine Fake-Preise als aktive Buchung dargestellt
- [x] ✅ Multistream-Limits an Pläne gekoppelt
- [ ] ⬜ finale Preisentscheidung
- [ ] ⬜ Stripe Production Aktivierung
- [ ] ⬜ Checkout
- [ ] ⬜ Webhooks
- [ ] ⬜ Upgrade / Downgrade
- [ ] ⬜ Kündigung
- [ ] ⬜ Rechnungen
- [ ] ⬜ Grace Period
- [ ] ⬜ Payment-Failure Handling
- [ ] ⬜ Plan-Enforcement End-to-End
- [ ] ⬜ Cloud Relay Preis-/Kostenmodell

---

# 15. Spätere Erweiterungen / Roadmap

- [ ] ⏸ Cloud Multistream Relay
- [ ] ⏸ Twitch-native Integration
- [ ] ⏸ OBS-Import / Migration
- [ ] ⏸ Audio Studio Vollausbau
- [ ] ⏸ NEXUS Vollausbau
- [ ] ⏸ Cut Studio Vollausbau
- [ ] ⏸ zusätzliche Games
- [ ] ⏸ mobile Creator-Steuerung
- [ ] ⏸ Remote Stream Deck / Hotkey App

---

# 16. Aktuelle Prioritäten

## JETZT

1. ✅ **Pass 21.9.2 – Scene Composer direkt im Stream Studio**
2. ✅ **Pass 21.10.1 – Local Streaming Engine Core** · Repository 76/76 PASS
3. ✅ **Pass 21.10.2 – Audio Mixer, Monitor/Crop & Watchdog** · Repository 70/70 PASS
4. 🟡 echter Windows-Test: Screen / Window / Kamera / zwei Audio-Busse
5. 🟡 echter Windows-Test: Multi-Monitor / DPI / Crop
6. 🟡 echter Windows-Test: NVENC / AMF / QSV / x264
7. 🟡 echte lokale Aufnahme mit MKV
8. 🟡 echter RTMP/RTMPS-Test mit einem privaten Testziel
9. ⬜ **Pass 21.10.3 – Native Game Capture Backend + Desktop-Audio ohne Drittanbieter**
10. ⬜ Peak Meter / Monitoring / Laufzeit-Gerätewechsel
11. ✅ einzelnes Ziel Start/Stop während laufender Session · Pass 21.10.7
12. ✅ **Pass 21.10.8 – Live Health & Telemetry** · Repository umgesetzt
13. ✅ **Pass 21.10.9 – Live Guard & Auto-Diagnose** · Repository umgesetzt
14. ✅ **Pass 21.10.10 – Studio Hub & Stream Session Dashboard** · Repository umgesetzt
15. ✅ **Pass 21.10.11 – Resizable Workspace** · Panels, Übergang, Preview/Program und Seitenbreiten verschiebbar/skalierbar
14. 🟡 echter Twitch + YouTube Local-Multistream-Dauertest mit mindestens zwei Zielen
15. 🟡 TikTok zusätzlich im bestehenden Provider-Setup testen

## DANACH

16. 🟡 **Pass 21.11 – Multi-Format 16:9 + 9:16** · Scene-Dual-Canvas fertig, paralleles Encoding noch offen
17. ⬜ **Pass 21.12 – Multi Chat & Alerts**
18. ⬜ kompletter Production Browser-/Creator-Test
19. ⬜ Pass 21 Final Acceptance
20. ⬜ vollständige Security-/Recovery-Abnahme

---

# 17. Definition of Done für Pass 21

Pass 21 gilt erst als vollständig abgeschlossen, wenn:

- [x] Website-Struktur fertig
- [x] öffentliche Website fertig
- [x] Creator-Navigation fertig
- [x] Dashboard fertig
- [x] Widget Studio integriert
- [x] Scene Composer im Stream Studio integriert
- [x] Scene-Transitions integriert
- [x] Stream Studio Foundation integriert
- [x] Multistream-Control-Plane integriert
- [ ] Launcher Streaming Engine funktioniert real
- [ ] Aufnahme funktioniert real
- [ ] RTMP/RTMPS funktioniert real
- [ ] mindestens zwei parallele Streaming-Ziele funktionieren real
- [ ] Zielausfall ist isoliert
- [x] 16:9 / 9:16 Scene-Konzept umgesetzt; paralleles Encoder-Runtime-Testing bleibt offen
- [ ] Login / Sessions / Logout Production getestet
- [ ] TikTok OAuth Production getestet
- [ ] Widget → Scene → Output Production getestet
- [ ] Launcher Device Link Production getestet
- [ ] Production Smoke vollständig PASS
- [ ] keine kritischen Logs / Fehler
- [ ] Rollback-Weg bestätigt
- [ ] finale Pass-21-Abnahme dokumentiert

---

# 18. Prüfkommandos

```powershell
npm.cmd run github21:check
npm.cmd run production21:smoke
npm.cmd run integration21:check
npm.cmd run production21:integration-smoke
npm.cmd run e2e21:check
npm.cmd run production21:e2e-smoke
npm.cmd run scene21:check
npm.cmd run production21:scene-smoke
npm.cmd run stream21:check
npm.cmd run multistream21:check
npm.cmd run studio-layout21:check
npm.cmd run scene-composer21:check
npm.cmd run stream-engine21:check
npm.cmd run stream-engine21:audio-check
npm.cmd run production21:scene-composer-smoke
npm.cmd run production21:multistream-smoke
npm.cmd run stream-health21:check
npm.cmd run stream-guard21:check
npm.cmd run stream-studio21:check
```

---

## Regel für die weitere Entwicklung

**Diese Checkliste wird ab jetzt bei jedem neuen Pass aktualisiert.**  
Ein Punkt wird erst auf ✅ gesetzt, wenn die dazugehörige Funktion tatsächlich umgesetzt und mindestens auf Repository-Ebene geprüft wurde. Production-/Browser-Punkte bleiben 🟡 oder ⬜, bis sie wirklich auf `cfs-zockt.de` bzw. im Launcher getestet wurden.


# Pass 21.10.3 – Stream Studio Workflow

- [x] ✅ Schnellstart-Szenen: Gameplay / Just Chatting / Starting Soon / BRB / Ende / Vertical
- [x] ✅ schnelle Output-Presets
- [x] ✅ Stream-Check-Panel
- [x] ✅ Preflight: Launcher / LIVE-Scene / Quelle / Mikrofon / Output / Ziel / Planlimit / Upload-Budget
- [x] ✅ Preflight startet keinen Stream und liest keine lokalen Secrets
- [ ] ⬜ Native Game Capture
- [ ] ⬜ natives Desktop-Audio (WASAPI Loopback)
- [x] ✅ Dual-Canvas 16:9 + 9:16 mit gemeinsamen Sources
- [ ] ⬜ Multi-Chat
- [ ] ⬜ Automationen / Auto Scene Switching

# Pass 21.10.4 – Dual Canvas 16:9 + 9:16

- [x] ✅ dieselbe Scene besitzt ein 16:9- und ein 9:16-Layout
- [x] ✅ beide Layouts verwenden dieselben Source-/Widget-IDs
- [x] ✅ Position / Größe / Rotation / Ebene je Format separat
- [x] ✅ neue Quellen werden automatisch in beide Layouts aufgenommen
- [x] ✅ Entfernen einer Quelle hält beide Layouts konsistent
- [x] ✅ Positionen können proportional ins andere Format kopiert werden
- [x] ✅ Legacy-Scenes werden auf Version 2 migriert
- [x] ✅ serverseitige Ownership-Prüfung umfasst beide Layouts
- [x] ✅ format-spezifische öffentliche Scene-URLs
- [x] ✅ Runtime rendert nur erlaubte Layout-Varianten
- [x] ✅ Preview/Program folgt dem gewählten Output-Profil
- [ ] 🟡 paralleles 16:9 + 9:16 Encoding im Launcher
- [ ] 🟡 format-spezifischer Crop für Screen/Game/Camera Capture
- [ ] 🟡 echter Windows-Multi-Format-Dauertest

**Prüfung:** `npm.cmd run dual-canvas21:check`



## Pass 21.10.5 Update

- [x] ✅ Dockbares Multi-Chat-&-Activity-Panel
- [x] ✅ Chat/Follow/Gift/Share/Like Filter
- [x] ✅ Plattformfilter und serverseitig begrenzte `source_provider`-Metadaten
- [x] ✅ Feed pausieren / manuell aktualisieren / Vordergrund-Polling
- [x] ✅ sichere Textausgabe ohne ungeprüftes Event-HTML
- [ ] 🟡 echte Multi-Plattform-Chat-Adapter im Launcher
- [ ] 🟡 Provider-spezifische Moderationsaktionen


## Pass 21.10.6 Update – Provider Adapter Bridge

- [x] ✅ Provider-Normalisierung vor Queue/Backend
- [x] ✅ TikTok/TikTool eindeutig als TikTok markiert
- [x] ✅ Simulator separat markiert
- [x] ✅ `source_provider`, `source_channel`, `source_event_id` begrenzt
- [x] ✅ ungeprüfte Provider-Rohpayloads werden verworfen
- [ ] 🟡 echte Twitch-/YouTube-/Kick-Chat-APIs

## Pass 21.10.7 Update – Multistream Connections & Control Center

- [x] ✅ YouTube direkt via RTMPS + Stream-Key konfigurierbar
- [x] ✅ Twitch direkt via RTMP + Stream-Key konfigurierbar
- [x] ✅ TikTok nur bei vorhandenem LIVE-/Encoder-Zugang aktivierbar
- [x] ✅ provider-spezifische Setup-Hinweise
- [x] ✅ sicherer Launcher-Preflight
- [x] ✅ Einzelziel Start/Stop bei laufendem Multistream
- [x] ✅ manueller Stop verhindert Reconnect-Schleife
- [ ] 🟡 reale Plattformtests auf Windows mit privaten/nicht gelisteten Teststreams


## Pass 21.10.8 Update – Live Health & Telemetry

- [x] ✅ Live-Health-Panel direkt im Stream Studio
- [x] ✅ Panel wie Szenen/Übergänge/Audio frei verschiebbar
- [x] ✅ frischer Launcher-Heartbeat statt nur „gekoppelt“
- [x] ✅ Engine-Status und Anzahl LIVE-Ziele
- [x] ✅ aktive Upload-Bitrate aus lokaler Engine-Telemetrie
- [x] ✅ FPS und Bitrate je Streaming-Ziel
- [x] ✅ Dropped Frames je Ziel und gesamt
- [x] ✅ FFmpeg Encoder-Speed als echter Echtzeitfaktor
- [x] ✅ Reconnect-Versuche + Countdown
- [x] ✅ Watchdog-Restarts
- [x] ✅ Telemetrie wird nach 25 s als stale markiert
- [x] ✅ Launcher gilt ohne Heartbeat nach 30 s als offline
- [x] ✅ Stream-Keys / RTMP-Adressen / lokale Recording-Pfade bleiben aus der Cloud-Telemetrie heraus
- [x] ✅ leichter Runtime-Endpunkt für 5-s-Polling
- [ ] 🟡 echte Live-Telemetrie mit realem YouTube-/Twitch-/TikTok-Stream auf Windows bestätigen
- [ ] ⬜ zuverlässige CPU-/GPU-Prozentmessung erst nach Windows-Profiling ergänzen

**Repository-Test:** `npm.cmd run stream-health21:check`


## Pass 21.10.9 Update – Live Guard & Auto-Diagnose

- [x] ✅ beratender Live Guard direkt im Live-Health-Panel
- [x] ✅ 2-Minuten Telemetrie-Historie nur im Browser
- [x] ✅ 60-Sekunden-Trends für Drops / Reconnects / Watchdog
- [x] ✅ Encoder-Speed Warnung < 0,98× und kritisch < 0,90×
- [x] ✅ Bitrate-Abweichung pro Ziel erkennen
- [x] ✅ profilabhängige FPS-Abweichung erkennen
- [x] ✅ Zielstatus Error/Reconnect verständlich erklären
- [x] ✅ Diagnoseausgabe sicher via `textContent`
- [x] ✅ keine automatischen Änderungen an Bitrate, Encoder oder Streaming-Zielen
- [ ] 🟡 Grenzwerte im echten Windows-Multistream-Dauertest kalibrieren
- [ ] 🟡 reale Upload-Kapazitätsmessung im Launcher ergänzen
- [ ] ⬜ zuverlässige CPU-/GPU-Prozentmessung nach Windows-Profiling

**Repository-Test:** `npm.cmd run stream-guard21:check`


## Pass 21.10.10 Update – Studio Hub & Stream Session Dashboard

- [x] ✅ gemeinsame Studio-Navigation für LIVE, Audio, Cut, Launcher und Widgets
- [x] ✅ LIVE Audio bleibt im Haupt-Workspace
- [x] ✅ Cut bleibt technisch getrennte Postproduktion
- [x] ✅ Launcher bleibt technisch getrennte lokale Media Engine
- [x] ✅ Stream Session Dashboard
- [x] ✅ Laufzeit / Startzeit / Live-Ziele / Upload / Reconnects
- [x] ✅ Datenmenge nur als klar bezeichnete Schätzung seit aktuellem Studio-Aufruf
- [x] ✅ Session Panel verschiebbar
- [x] ✅ keine Browser-Übertragung von Stream-Keys, Roh-Audio oder Roh-Video
- [ ] 🟡 reale Windows-Session noch offen

## Pass 21.10.11 Update – Resizable Studio Workspace

- [x] ✅ alle Dock-Panels per Eckgriff skalierbar
- [x] ✅ Szenenübergang verschiebbar und skalierbar
- [x] ✅ Preview/Program in das Dock-System aufgenommen
- [x] ✅ Stream Check in das Dock-System aufgenommen
- [x] ✅ linke/rechte Studio-Spaltenbreite im Layout-Modus veränderbar
- [x] ✅ Größen und Positionen persistent in `workspace_layout` gespeichert
- [x] ✅ Server-Allowlist und numerische Größenlimits
- [x] ✅ unbekannte Panel-/Style-Werte werden verworfen
- [x] ✅ Standardlayout setzt Positionen, Panelgrößen und Spaltenbreiten zurück
- [x] ✅ Mobile bleibt einspaltig und erzwingt keine Desktop-Festgrößen
- [ ] 🟡 echter Desktop-Browser-Test nach Deploy


## Pass 21.10.12 Update – Source Routing, Multi-Track Recording & Workspace Presets

- [x] ✅ Source-Routing pro CFS-Scene-Quelle für LIVE / RECORDING / 16:9 / 9:16
- [x] ✅ Recording-Scene-Routen werden von der Runtime technisch getrennt ausgewertet
- [x] ✅ Helligkeit / Kontrast / Sättigung / Blur pro CFS-Scene-Quelle
- [x] ✅ Filterwerte client- und serverseitig begrenzt
- [x] ✅ Recording-URL je 16:9- und 9:16-Scene
- [x] ✅ lokale Multi-Track-Aufnahme: Stream Mix + Audio Bus 1 + Audio Bus 2
- [x] ✅ FFmpeg mappt getrennte Audio-Streams und schreibt Track-Namen
- [x] ✅ bis zu 6 speicherbare Studio-Workspaces
- [x] ✅ Workspace-Presets werden serverseitig allowlist-sanitisiert
- [ ] 🟡 echter Windows-MKV-Test mit zwei Audio-Geräten
- [x] ✅ natives Source-Routing für Screen/Window/Game/Camera im Launcher Scene Graph (native-only Composition)
- [x] ✅ Hybrid-Media-Merge für Widget + Native Layer im lokalen Compositor
- [x] ✅ zusätzliche App-Audio-Busse für Mic / Game / Discord / Music / Alerts in Pass 21.10.15 vorbereitet

**Repository-Test:** `npm.cmd run studio-routing21:check`

## Pass 21.10.13 Update – Native Launcher Compositor / Scene Graph Foundation

- [x] ✅ Screen / Window / Game / Camera als lokale Native Sources im gemeinsamen CFS-Scene-Modell
- [x] ✅ gemeinsame Source-IDs und gleiche Item-IDs über 16:9 / 9:16
- [x] ✅ Position / Scale / Rotation / Opacity / Z-Index für native Quellen
- [x] ✅ Crop für native Quellen
- [x] ✅ Brightness / Contrast / Saturation / Blur werden in den lokalen FFmpeg-Graph kompiliert
- [x] ✅ Visibility / Z-Reihenfolge werden im Native Scene Graph technisch ausgewertet
- [x] ✅ LIVE / RECORDING / 16:9 / 9:16 Routing wird für native Quellen ausgewertet
- [x] ✅ native-only Scenes können mehrere Videoquellen in einem FFmpeg-Graph komponieren
- [x] ✅ veröffentlichte `program_scene` wird an die lokale Launcher Stream Engine übergeben
- [x] ✅ Streamkeys und Gerätebindungen bleiben Launcher-lokal
- [x] ✅ Widget + Native Misch-Scenes werden explizit als Hybrid-Graph erkannt; ohne Runtime-Quelle kein falscher vollständiger Output
- [x] ✅ echter Hybrid-Media-Merge Widget/Browser + Native Video in Pass 21.10.14 umgesetzt
- [ ] 🟡 Game Capture nutzt in dieser Foundation noch Window/GDI-Binding; echte Game-Capture-Hooks folgen
- [x] ✅ Application Audio Capture / getrennte App-Audio-Quellen als Process-Loopback-Foundation in Pass 21.10.15 umgesetzt
- [x] ✅ Scene-Hot-Switch über stabilen Scene Frame Bus in Pass 21.10.18 umgesetzt
- [ ] 🟡 realer Windows-Multistream-/Recording-Soak-Test offen

**Repository-Test:** `npm.cmd run studio-native-scene21:check`

**Detail-Doku:** `STREAM_STUDIO_NATIVE_SCENE_GRAPH_PASS21_10_13.md`



## Pass 21.10.14 Update – Hybrid Widget + Native Compositor

- [x] ✅ Widget-Runtime-Quellen werden nur für die aktive Program-Scene an den gekoppelten Launcher hydratisiert
- [x] ✅ sandboxed Electron-Offscreen-Renderer pro benötigter Widget-Quelle
- [x] ✅ transparente BGRA-Frames über lokale FFmpeg-Pipes
- [x] ✅ Native + Widget Sources werden in einem gemeinsamen `z_index`-sortierten Video-Graph komponiert
- [x] ✅ Widget-Layer können zwischen nativen Quellen liegen; Widgets werden nicht pauschal immer oben gerendert
- [x] ✅ Position / Scale / Rotation / Opacity / Crop / Filter für beide Source-Klassen im gemeinsamen Compiler
- [x] ✅ LIVE / RECORDING / 16:9 / 9:16 Routing vor dem Merge
- [x] ✅ Widget-only Scene nutzt bestehenden lokalen Capture als Basis und legt Widgets darüber
- [x] ✅ Hybrid Scene mit nativen Sources nutzt expliziten Scene Graph statt zusätzlichem Legacy-Capture
- [x] ✅ fehlende Widget-Runtime-Quelle fällt fail-safe auf Legacy-Capture zurück
- [x] ✅ Widget-URLs/Public Tokens werden nicht in Stream-Health-Telemetrie oder Scene-Graph-Summaries ausgegeben
- [x] ✅ Offscreen-Browseraudio bleibt stumm; Audio bleibt Launcher-lokal
- [x] ✅ Bridge Scene-Graph-Protokoll auf v4 / `hybrid_offscreen` angehoben
- [ ] 🟡 echter Windows-Test der transparenten Offscreen-BGRA-Ausgabe
- [ ] 🟡 Performance-Profiling mit 2–4 gleichzeitigen Streaming-Zielen
- [ ] 🟡 echte Game-Capture-Hooks
- [x] ✅ Application Audio Capture / zusätzliche Audio-Busse als Process-Loopback-Foundation in Pass 21.10.15 umgesetzt
- [x] ✅ Scene-Hot-Switch über stabilen Scene Frame Bus in Pass 21.10.18 umgesetzt

**Repository-Test:** `npm.cmd run studio-hybrid21:check`

**Detail-Doku:** `STREAM_STUDIO_HYBRID_COMPOSITOR_PASS21_10_14.md`

## Pass 21.10.15 Update – Windows Application Audio Capture + Multi-Track Audio Foundation

- [x] ✅ strukturierte lokale Audioquellen für Mic / Game / Discord / Music / Alerts
- [x] ✅ Mikrofon weiter über lokales DirectShow-Gerät
- [x] ✅ nativer Windows Process-Loopback-Helper als C++-Quelle + Build-Skript
- [x] ✅ `ActivateAudioInterfaceAsync` + `AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK` für prozessbezogene Audioaufnahme
- [x] ✅ Game / Discord / Music / Alerts per PID / Process-Name lokal bindbar
- [x] ✅ Process-Tree-Capture standardmäßig aktiv
- [x] ✅ eine App-Capture-Quelle wird lokal auf mehrere FFmpeg-Ziele gefächert
- [x] ✅ zusätzliche s16le-Audio-Pipes kollisionsfrei neben Widget-Pipes
- [x] ✅ Cloud-Mixer-Level/Mute + lokaler Trim/Mute werden kombiniert
- [x] ✅ Audio-Sync-Delay pro strukturierter Quelle
- [x] ✅ Recording: Stream Mix + Mic + Game + Discord + Music + Alerts als getrennte Tracks
- [x] ✅ Recording-Track-Namen / Metadaten für alle neuen Quellen
- [x] ✅ Launcher-Prozessauswahl für Game / Discord / Music / Alerts
- [x] ✅ PID-Rebinding über gespeicherten Process-Namen bei App-Neustart vor Session-Start
- [x] ✅ Preflight prüft Helper-Verfügbarkeit und konfigurierte Prozesse
- [x] ✅ Electron-Builder staged `vendor/audio` in die Release-Resources
- [x] ✅ Legacy Audio 1 / Audio 2 bleibt für bestehende Konfigurationen erhalten
- [x] ✅ Roh-Audio, Prozessbindungen und Geräte bleiben Launcher-lokal
- [ ] 🟡 nativen Helper unter echtem Windows/Visual Studio bauen und `--probe` ausführen
- [ ] 🟡 reale Process-Loopback-Abnahme mit Game / Discord / Music / Alerts
- [x] ✅ App-Neustart / PID-Rebind + Helper-Recovery während laufender Session in Pass 21.10.17 gehärtet
- [ ] 🟡 echter Windows Multi-Audio-Soak-Test mit mehreren App-Audioquellen
- [ ] 🟡 Cut Studio für >3 Recording-Audiotracks vertiefen
- [ ] 🟡 echte Game-Capture-Hooks

**Repository-Test:** `npm.cmd run studio-audio21:check`

**Detail-Doku:** `STREAM_STUDIO_APPLICATION_AUDIO_PASS21_10_15.md`

## Pass 21.10.16 Update – Windows WASAPI Helper Acceptance & Packaging

- [x] ✅ Mindest-Windows-Build 20348 wird vor Process-Loopback-Nutzung geprüft
- [x] ✅ Helper-Datei vorhanden und Runtime-Verifikation sind getrennte Zustände
- [x] ✅ `cfs-audio-loopback.exe --probe` mit Protokoll `CFS_AUDIO_LOOPBACK_V1`
- [x] ✅ kein falsches „WASAPI BEREIT“ nur wegen vorhandener EXE
- [x] ✅ Stream Engine re-verifiziert den Helper vor App-Audio-Nutzung
- [x] ✅ Streaming-Preflight verwendet den Runtime-Status
- [x] ✅ Launcher-Button `WASAPI HELPER TESTEN`
- [x] ✅ Build-Skript findet Visual C++ Build Tools automatisch über `vswhere.exe`
- [x] ✅ Helper-Build mit `/guard:cf`, `/DYNAMICBASE` und `/NXCOMPAT`
- [x] ✅ Build führt anschließend `--probe` als Selbsttest aus
- [x] ✅ SHA-256-Datei für das gebaute Helper-Binary
- [x] ✅ Windows/Portable/Release-Paketbau baut den Helper automatisch vor Electron Builder
- [x] ✅ `audio-helper:doctor` für Windows-Build + Runtime-Probe
- [x] ✅ `audio-helper:acceptance -- --pid ...` für echten PCM-Smoke-Test
- [x] ✅ Acceptance-Evidence enthält nur Status/Bytezahl und keine Audio-Payload
- [ ] 🟡 nativen Helper unter echtem Windows/Visual Studio bauen und `--probe` ausführen – weiterhin offen
- [ ] 🟡 echte Game-/Discord-/Music-/Alerts-Process-Loopback-Abnahme unter Windows
- [x] ✅ App-Neustart / PID-Rebind + Continuity-PCM in Pass 21.10.17 gehärtet
- [ ] 🟡 echter Windows Multi-Audio-Soak-Test mit mehreren App-Audioquellen
- [ ] 🟡 nativen Helper im Release-Signing-Prozess signieren

**Repository-Test:** `npm.cmd run studio-audio-windows21:check`

**Detail-Doku:** `STREAM_STUDIO_APPLICATION_AUDIO_WINDOWS_PASS21_10_16.md`

## Pass 21.10.17 Update – Application Audio Recovery & Soak Foundation

- [x] ✅ laufender Process-Loopback-Manager überwacht konfigurierte Game/Discord/Music/Alerts-Quellen
- [x] ✅ App-Neustart / PID-Rebind anhand des gespeicherten Prozessnamens
- [x] ✅ `.exe`-Suffix wird für robuste Prozessnamen-Zuordnung normalisiert
- [x] ✅ Helper-Crash-Recovery mit begrenztem Backoff 0,5 / 1 / 2 / 5 / 10 s
- [x] ✅ bestehende FFmpeg-Ziele bleiben bei App-Audio-Recovery bestehen
- [x] ✅ bestehende FFmpeg-Audiopipes bleiben während Rebind/Recovery offen
- [x] ✅ 48-kHz Stereo s16le Continuity-PCM verhindert offene Audio-Pipe ohne Datenquelle
- [x] ✅ Continuity stoppt automatisch, sobald echte Helper-PCM-Daten zurückkehren
- [x] ✅ leerer Prozess-Snapshot löst keinen falschen Massenverlust aller App-Audioquellen aus
- [x] ✅ Recovery-Telemetrie: Helper-Restarts / Process-Rebinds / Continuity-Bytes / Waiting-State
- [x] ✅ Launcher-State und WASAPI-Status zeigen Recovery-Zähler
- [x] ✅ `audio-helper:soak` nutzt denselben Recovery-Manager für reale Windows-Dauertests
- [x] ✅ Soak-Evidence speichert nur Status/Byte-/Recovery-Zähler und keine Audio-Payload
- [ ] 🟡 echter Windows Multi-Audio-Soak-Test mit Game + Discord + optional Music/Alerts
- [ ] 🟡 echte App-Neustart-Abnahme während Twitch/YouTube/TikTok-Multistream
- [ ] 🟡 A/V-Sync nach mehreren Rebinds auf echter Hardware bewerten
- [ ] 🟡 mehrstündiger Multistream + Recording Soak weiterhin offen

**Repository-Test:** `npm.cmd run studio-audio-recovery21:check`

**Detail-Doku:** `STREAM_STUDIO_APPLICATION_AUDIO_RECOVERY_PASS21_10_17.md`

## Pass 21.10.18 Update – Scene Hot Switch / Compositor Runtime Update

- [x] ✅ separater Scene Frame Bus zwischen lokalem Scene-Compositor und Ziel-FFmpeg-Prozessen
- [x] ✅ Ziel-FFmpeg-Prozesse bleiben beim Scene-Hot-Switch bestehen
- [x] ✅ stabile lokale YUV420P-Video-Pipe pro Profil / Modus
- [x] ✅ letzter gültiger Frame bleibt während Compositor-Prewarming verfügbar
- [x] ✅ zweiphasiger Wechsel: vorbereiten → ersten vollständigen Frame prüfen → committen
- [x] ✅ alter Scene-Compositor wird erst nach erfolgreichem Commit beendet
- [x] ✅ fehlgeschlagene neue Scene lässt den bisherigen Compositor weiterlaufen
- [x] ✅ Widget-Offscreen-Renderer werden vor einem Wechsel vorgewärmt
- [x] ✅ nicht mehr benötigte Widget-Renderer werden erst nach erfolgreichem Wechsel bereinigt
- [x] ✅ Subscriber-Backpressure wird pro Ziel isoliert
- [x] ✅ Scene-Compositor-Crash besitzt lokalen Recovery-Pfad ohne Schließen der Ziel-Video-Pipes
- [x] ✅ laufende Stream-Studio-Synchronisation übernimmt neue Program-Scene automatisch
- [x] ✅ manueller `STUDIO SYNC` nutzt denselben Hot-Switch-Pfad
- [x] ✅ Launcher zeigt Program-Scene / Hot-Switch-Erfolge / Hot-Switch-Fehler
- [x] ✅ Stream-Health-Telemetrie enthält Scene-Switch-Zähler und Runtime-Zustand
- [x] ✅ Streamkeys bleiben aus Scene Frame Bus / Compositor vollständig heraus
- [x] ✅ gestoppte Einzelziele können später wieder an den aktualisierten Profil-Bus angehängt werden
- [ ] 🟡 echter Windows Scene-Hot-Switch mit YouTube + Twitch + TikTok offen
- [ ] 🟡 Freeze-/A/V-Sync-Messung bei realem Hardware-Prewarming offen
- [ ] 🟡 Performance-Profiling des unkomprimierten YUV420P-Bus offen
- [x] ✅ Scene-Transition-Runtime mit CUT + FFmpeg `xfade` in Pass 21.10.19 umgesetzt
- [ ] 🟡 Native Game-Capture-Hooks weiterhin offen

**Repository-Test:** `npm.cmd run studio-scene-hot-switch21:check`

**Detail-Doku:** `STREAM_STUDIO_SCENE_HOT_SWITCH_PASS21_10_18.md`

## Pass 21.10.19 Update – Scene Transition Runtime

- [x] ✅ bestehende Stream-Studio-Transition wird an den laufenden Launcher weitergereicht
- [x] ✅ CUT bleibt sofortiger Scene-Frame-Bus-Wechsel
- [x] ✅ animierte Scene-Wechsel über FFmpeg `xfade`
- [x] ✅ Fade / Dissolve / Slide Left / Slide Right / Slide Up / Zoom lokal gemappt
- [x] ✅ Studio-`duration_ms` wird auf 120–2500 ms begrenzt und lokal ausgewertet
- [x] ✅ letzter tatsächlich ausgespielter YUV420P-Bus-Frame dient als Transition-Startbild
- [x] ✅ neue Scene wird vor Commit vollständig vorgewärmt
- [x] ✅ Ziel-FFmpeg-Prozesse und RTMP/RTMPS-Verbindungen bleiben während der Transition bestehen
- [x] ✅ Application-Audio-Pipes bleiben während der Scene-Transition bestehen
- [x] ✅ temporärer Alt-Frame bleibt ausschließlich lokal und wird mit dem Producer bereinigt
- [x] ✅ fehlendes `xfade` fällt sichtbar und gezählt auf CUT zurück
- [x] ✅ fehlerhafte Transition vor erstem Frame lässt die alte Program-Scene aktiv
- [x] ✅ Launcher zeigt effektiven Transition-Typ / Dauer / Fallback
- [x] ✅ Stream-Health-Telemetrie enthält Transition- und Fallback-Zähler
- [ ] 🟡 echter Windows Fade/Dissolve mit Screen/Game/Camera + Widgets offen
- [ ] 🟡 echter YouTube + Twitch + TikTok Transition-Soak offen
- [ ] 🟡 A/V-Sync- und Freeze-Messung auf echter 1080p60-Hardware offen
- [ ] 🟡 optionales echtes Dual-Live-Crossfade beider Scene-Compositoren offen
- [ ] 🟡 Native Game-Capture-Hooks weiterhin offen

**Repository-Test:** `npm.cmd run studio-scene-transition21:check`

**Detail-Doku:** `STREAM_STUDIO_SCENE_TRANSITION_PASS21_10_19.md`

## Pass 21.10.20 Update – Native Windows Game Capture Hooks

- [x] ✅ eigener lokaler `cfs-game-capture.exe` C++/WinRT-Helper statt „Game = Window/GDI“
- [x] ✅ Windows.Graphics.Capture + D3D11 für HWND-basierte Spielaufnahme
- [x] ✅ Mindestbasis Windows 10 Version 1903 / Build 18362 für Win32-HWND-Interop
- [x] ✅ versionierter Runtime-Probe `CFS_GAME_CAPTURE_WGC_V1`
- [x] ✅ Game-Capture Helper-Datei und Runtime-Verifikation sind getrennte Zustände
- [x] ✅ Launcher-Auswahl eines laufenden Spiel-Prozesses mit PID / Prozessname / Fenstertitel
- [x] ✅ Helper sucht sichtbares Top-Level-Hauptfenster des gewählten Prozesses
- [x] ✅ BGRA-Rawvideo-Pipe integriert den Game-Helper in den bestehenden FFmpeg-Scene-Graph
- [x] ✅ kein künstlicher Ready-Frame vor dem ersten echten WGC-Frame
- [x] ✅ Native Scene Graph unterstützt Game Capture zusammen mit Screen / Window / Camera / Widgets
- [x] ✅ LIVE / RECORDING sowie 16:9 / 9:16 Routing bleiben für Game-Sources erhalten
- [x] ✅ Widget-only Scene über primärer Game-Capture-Quelle verwendet ebenfalls WGC-Basispfad
- [x] ✅ mehrere Output-Profile können parallele Game-Capture-Spezifikationen halten
- [x] ✅ Game-Pipe-FDs bleiben von Widget-/Application-Audio-/Scene-Bus-Pipes getrennt
- [x] ✅ lokaler GDI-Fenster-Fallback bleibt erhalten, wenn WGC nicht bereit ist
- [x] ✅ Game-Helper Crash-Recovery mit begrenztem Backoff
- [x] ✅ PID-Rebind über gespeicherten Prozessnamen vorbereitet
- [x] ✅ Game-Capture Telemetrie im Launcher-State: Status / Bytes / Restarts / Rebinds
- [x] ✅ Stream Engine gibt Game-Capture-Helper beim Stop vollständig frei
- [x] ✅ Build-Skript mit `/guard:cf`, `/DYNAMICBASE`, `/NXCOMPAT`, `--probe` und SHA-256
- [x] ✅ Windows/Portable/Release-Paketbau baut Game-Capture-Helper vor Electron Builder
- [x] ✅ Electron Builder staged `vendor/game-capture` in die Release-Resources
- [x] ✅ `game-capture:doctor` kann optional einen echten vollständigen BGRA-Frame gegen eine PID prüfen
- [x] ✅ Acceptance-Evidence speichert nur Status/Frame-/Bytezahlen, keine Rohvideodaten
- [ ] 🟡 nativen Game-Capture-Helper auf echtem Windows mit Visual C++ / Windows SDK bauen
- [ ] 🟡 reale DirectX-Spielaufnahme unter Windows abnehmen
- [ ] 🟡 Fullscreen / Borderless / Alt-Tab mit realen Spielen prüfen
- [ ] 🟡 Anti-Cheat-/geschützte Spielinhalte pro Titel real bewerten
- [ ] 🟡 1080p60 Game + Camera + Widgets + Recording + YouTube/Twitch/TikTok Soak
- [ ] 🟡 spätere spezialisierte Hooks für Spiele prüfen, bei denen WGC nicht geeignet ist

**Repository-Test:** `npm.cmd run studio-game-capture21:check`

**Detail-Doku:** `STREAM_STUDIO_GAME_CAPTURE_PASS21_10_20.md`
## Pass 21.10.21 Update – Game Capture Runtime Recovery / Fullscreen / Alt-Tab / D3D Device Loss

- [x] ✅ WGC-Helper überwacht Start-Timeout und echten Source-Frame-Stall
- [x] ✅ getrennte Exit-Klassen für Window Closed / Frame Stall / D3D Device Lost / Capture Error
- [x] ✅ `ID3D11Device::GetDeviceRemovedReason()` wird im laufenden Capture geprüft
- [x] ✅ Game-Capture-Manager klassifiziert Recovery-Gründe und startet nur die betroffene Quelle neu
- [x] ✅ begrenzter Recovery-Backoff 0,5 / 1 / 2 / 5 / 10 s bleibt erhalten
- [x] ✅ FFmpeg-Game-Sinks und Scene Frame Bus bleiben bei Helper-Recovery bestehen
- [x] ✅ Prozessauflösung enthält `MainWindowHandle` / `Responding`
- [x] ✅ Window-Handle-Wechsel bei gleicher PID löst gezielten lokalen Rebind aus
- [x] ✅ Helper wählt größtes sichtbares, nicht gecloaketes Top-Level-Fenster statt erstes EnumWindows-Match
- [x] ✅ minimierte Fenster werden bei der Hauptfensterwahl niedriger priorisiert
- [x] ✅ Frame-Stall / D3D-Loss / Window-Rebind / Capture-Error Telemetrie im Launcher-State
- [x] ✅ Launcher zeigt Game-Capture-Recovery-Zähler
- [x] ✅ `game-capture:soak` für reale Alt-Tab / Minimize / Fullscreen-Dauertests
- [x] ✅ Soak-Evidence persistiert keine BGRA-Rohvideodaten
- [ ] 🟡 nativen Helper auf echtem Windows gegen Visual C++ / Windows SDK bauen
- [ ] 🟡 reale Fullscreen / Borderless / Alt-Tab-Abnahme mit mehreren Spielen
- [ ] 🟡 realen GPU Device-Loss / Treiber-Reset auf Testhardware abnehmen
- [ ] 🟡 Anti-Cheat-/geschützte Spielinhalte pro Titel real bewerten
- [ ] 🟡 1080p60 Game + Camera + Widgets + Multi-Audio + Recording + YouTube/Twitch/TikTok Soak

**Repository-Test:** `npm.cmd run studio-game-recovery21:check`

**Detail-Doku:** `STREAM_STUDIO_GAME_CAPTURE_RECOVERY_PASS21_10_21.md`
## Pass 21.10.22 Update – Multistream / Recording Soak & Runtime Evidence Layer

- [x] ✅ automatische lokale Runtime-Evidence startet nach erfolgreichem Streaming-Engine-Start
- [x] ✅ Evidence-Sampling standardmäßig alle 2 Sekunden plus relevante Engine-State-Events
- [x] ✅ Streaming-Ziele: Status / FPS / Bitrate / Encoder Speed / Dropped / Duplicated / Reconnect-Attempt
- [x] ✅ Recording: Status / FPS / Bitrate / Encoder Speed / Dropped / Duplicated
- [x] ✅ Session-Metriken: Upload / Live-Ziele / Errors / Reconnects / Watchdog / Dropped Frames
- [x] ✅ Scene Runtime: Program-Scene / Hot-Switches / Switch-Fehler / Transitions / Fallbacks
- [x] ✅ Game-Capture-Recovery: Helper-Restarts / Frame-Stalls / D3D Device Loss / Window-Rebind / Capture-Errors
- [x] ✅ Application-Audio-Recovery: Helper-Restarts / PID-Rebinds / Continuity-Bytes / Recoveries
- [x] ✅ technische Recovery-Ereignisse werden separat als Evidence-Events protokolliert
- [x] ✅ Evidence enthält keine Streamkeys / Tokens / Zugangsdaten
- [x] ✅ Evidence persistiert keine Audio-, Video-, BGRA- oder PCM-Payloads
- [x] ✅ begrenzter Evidence-Sample-Ring verhindert unkontrolliertes Speicherwachstum
- [x] ✅ Session-Abschluss schreibt JSON atomar plus SHA-256-Datei
- [x] ✅ Summary enthält Dauer / Zielbeobachtung / Recording-Beobachtung / Peak Upload / Encoder-Minimum / FPS / Dropped / Recovery-Zähler
- [x] ✅ Summary weist auf fehlende erwartete Ziele, fehlendes Recording, Scene-Switch-Fehler, Watchdog-Restarts und Dropped Frames hin
- [x] ✅ Launcher zeigt aktive Evidence-Session, Samples, Dauer und letzte Summary-Hinweise
- [x] ✅ Launcher kann lokalen Evidence-Ordner direkt öffnen
- [x] ✅ `stream-evidence:summary` liest eine abgeschlossene Evidence-Datei ohne sie als reale Plattform-Abnahme umzudeuten
- [x] ✅ Device Logout und Graceful Shutdown finalisieren eine laufende Evidence-Session ebenfalls
- [ ] 🟡 echter 10–15-Minuten-Windows-Soak: Game + Camera + Widgets + Mic/Game/Discord + Recording + YouTube + Twitch + TikTok
- [ ] 🟡 dabei mindestens einen Scene-Wechsel + animierte Transition real durchführen
- [ ] 🟡 mindestens ein einzelnes Streaming-Ziel stoppen/reconnecten, während andere weiterlaufen
- [ ] 🟡 Alt-Tab / Game-Window-Rebind und mindestens einen App-Audio-Rebind in derselben realen Session prüfen
- [ ] 🟡 Evidence danach mit `stream-evidence:summary` auswerten und reale Abnahme manuell markieren

**Repository-Test:** `npm.cmd run studio-runtime-evidence21:check`

**Detail-Doku:** `STREAM_STUDIO_RUNTIME_EVIDENCE_PASS21_10_22.md`

## Pass 21.10.23 Update – Soak Guard / automatische technische Abnahme-Auswertung

- [x] ✅ technischer Guard mit `PASS` / `WARN` / `FAIL` / `INCOMPLETE` statt undurchsichtigem Gesamtscore
- [x] ✅ 10-Minuten-Mindestdauer verhindert falsches Grün bei kurzen Smoke-Tests
- [x] ✅ Evidence-Sample-Coverage wird gegen das reale Sample-Intervall geprüft
- [x] ✅ Encoder-Speed WARN < 0,98x / FAIL < 0,90x
- [x] ✅ erwartete Output-FPS werden als Verhältnis zum Sollwert bewertet
- [x] ✅ Dropped-Frame-Budget mit WARN/FAIL-Grenzen
- [x] ✅ pro Streaming-Ziel Live-Coverage / Non-Live-Samples / längste Unterbrechung
- [x] ✅ Ziel-Coverage WARN < 98 % / FAIL < 95 %
- [x] ✅ Ziel-Unterbrechung WARN > 10 s / FAIL > 30 s
- [x] ✅ Recording erhält dieselbe Kontinuitätsbewertung
- [x] ✅ Engine-Errors / FFmpeg-Watchdog / Scene-Switch-Fehler sind harte FAIL-Gates
- [x] ✅ Transition-Fallbacks werden als WARN ausgewiesen
- [x] ✅ Game-Capture-Restarts / Frame-Stalls / D3D-Recovery mit Recovery-Budgets
- [x] ✅ Application-Audio-Recovery / Continuity-Silence mit Recovery-Budgets
- [x] ✅ Acceptance-Szenarioabdeckung getrennt von technischer Streamqualität
- [x] ✅ Scene-Wechsel + Transition werden als Pflichtszenarien verfolgt
- [x] ✅ isolierter Ziel-Reconnect wird bei Multi-Target-Soaks als Pflichtszenario verfolgt
- [x] ✅ Game Window/Process Rebind wird bei Game Capture als Pflichtszenario verfolgt
- [x] ✅ Application-Audio-Rebind wird bei Process-Loopback-Quellen als Pflichtszenario verfolgt
- [x] ✅ Evidence speichert `guardPass: 21.10.23` und die vollständigen Einzelchecks
- [x] ✅ Launcher zeigt Guard-Status / Acceptance-Coverage / Issues
- [x] ✅ `stream-evidence:summary` zeigt den Guard mit Einzelhinweisen
- [x] ✅ `stream-evidence:guard` als expliziter CLI-Aufruf
- [x] ✅ `--strict` liefert maschinenlesbare Exit-Codes für FAIL / WARN / INCOMPLETE
- [x] ✅ Guard bleibt ausdrücklich technische Evidence und keine automatische reale Plattform-Freigabe
- [ ] 🟡 echten 10–15-Minuten-Windows-Soak mit Game + Camera + Widgets + Multi-Audio + Recording + YouTube/Twitch/TikTok durchführen
- [ ] 🟡 alle Pflichtszenarien in derselben realen Session provozieren
- [ ] 🟡 Guard-Ergebnis mit realen Provider-/Windows-Beobachtungen vergleichen und Grenzen danach kalibrieren

**Repository-Test:** `npm.cmd run studio-soak-guard21:check`

**Detail-Doku:** `STREAM_STUDIO_SOAK_GUARD_PASS21_10_23.md`

## Pass 21.10.24 Update – Saved Streaming / Output Profiles

- [x] ✅ bis zu 12 benannte lokale Streaming-/Output-Profile pro Launcher
- [x] ✅ Profile speichern Output-Profil, Encoder, Video-Bitrate und Audio-Bitrate
- [x] ✅ Recording-Format und sechs Recording-Track-Schalter werden im Profil gespeichert
- [x] ✅ Multistream-Zielauswahl, Zielprofil und Ziel-Bitrates werden pro Profil gespeichert
- [x] ✅ lokale Mic/Game/Discord/Music/Alerts-Bindings, Lautstärken, Mutes und Sync-Delays werden gespeichert
- [x] ✅ Cloud-Audio-Mixlevel werden als lokaler Runtime-Snapshot in das Profil übernommen
- [x] ✅ Streamkeys, RTMP-Server-URLs, Tokens und Credential-Daten sind ausdrücklich kein Profilbestandteil
- [x] ✅ Profile verändern die Cloud-/Website-Konfiguration nicht dauerhaft
- [x] ✅ aktives Profil wird als lokaler `effective_config`-Override auf die synchronisierte Studio-Konfiguration gelegt
- [x] ✅ neue Cloud-Ziele, die im gespeicherten Profil nicht existieren, werden beim Laden sicher deaktiviert
- [x] ✅ Provider-Wechsel eines gespeicherten Ziel-IDs wird erkannt und das Ziel sicher deaktiviert
- [x] ✅ aktuelles Plan-Limit wird beim Laden erneut angewendet; zu viele Ziele werden mit Warnung deaktiviert
- [x] ✅ Application-Audio-Prozesse werden beim Laden über Prozessnamen auf aktuelle PIDs regebunden
- [x] ✅ Capture-Typ / Game-PID / Fensterbindung / Scene bleiben bewusst außerhalb der Output-Profile
- [x] ✅ Speichern / Laden / Aktualisieren / Löschen / Studio-Standard direkt im Launcher
- [x] ✅ Profilwechsel und Profiländerungen sind während eines laufenden Streams gesperrt
- [x] ✅ Preflight bewertet die aktuell wirksame Profil-Konfiguration inklusive Kompatibilitätswarnungen
- [x] ✅ Streamstart verwendet die aktuell wirksame Profil-Konfiguration
- [x] ✅ Zielkarten im Launcher zeigen bei aktivem Profil die effektiven Zielwerte statt nur die Cloud-Werte
- [x] ✅ Profil-Datei wird lokal atomar mit restriktiven Dateirechten geschrieben
- [ ] 🟡 Profile auf echtem Windows zwischen NVENC / x264 / QSV / AMF real umschalten
- [ ] 🟡 Profile mit echten YouTube/Twitch/TikTok-Zielen und Planwechsel real abnehmen
- [ ] 🟡 UX-Polish: optional Profil duplizieren / exportieren / importieren ohne Secrets

**Repository-Test:** `npm.cmd run studio-output-profiles21:check`

**Detail-Doku:** `STREAM_STUDIO_OUTPUT_PROFILES_PASS21_10_24.md`



## Pass 21.10.25 Update – Recording → Cut Studio Multitrack Handoff

- [x] ✅ abgeschlossene lokale Stream-Aufnahmen erzeugen automatisch einen lokalen Recording-Handoff
- [x] ✅ Handoff referenziert die lokale MKV/MP4-Datei ausschließlich im Launcher; kein Media-Upload
- [x] ✅ Stream Mix + Mic + Game + Discord + Music + Alerts werden als eingebettete Audio-Streams mit Stream-Index übernommen
- [x] ✅ bei echten Stem-Aufnahmen ist Stream Mix standardmäßig deaktiviert, um Doppel-Audio zu vermeiden
- [x] ✅ Cut Studio Projekt wird über die bestehende Creator Bridge automatisch angelegt
- [x] ✅ vollständige Aufnahme wird automatisch als initialer Cut-Clip mit gemessener Dauer angelegt
- [x] ✅ lokaler MediaSourceStore verknüpft das Cut-Projekt mit der echten Recording-Datei
- [x] ✅ Cut Studio zeigt Recording-Stems als editierbare Tracks mit Aktiv / Gain / Mute / Solo / Pan
- [x] ✅ Cut-Job-Manifest transportiert nur Source-Track-Metadaten und lokale Handoff-ID, niemals lokale Dateipfade
- [x] ✅ Cut Media Engine liest ausgewählte eingebettete Streams direkt per `0:a:<index>` und mischt sie lokal
- [x] ✅ bestehende Clip-Gain/Fade/Master-Audiofilter werden nach dem Stem-Mix weiterhin angewendet
- [x] ✅ bei manueller Zuordnung einer anderen Videodatei werden Recording-Stems für den Export sicher deaktiviert
- [x] ✅ Recording-Handoff-Store ist lokal, atomar und auf 30 Einträge begrenzt
- [x] ✅ Streamkeys / RTMP-Server / Tokens / Credentials werden nicht in Handoff-Daten persistiert
- [x] ✅ Launcher zeigt Handoff-Status und bietet `Zu Cut Studio`, `Cut öffnen` und erneute Synchronisierung
- [x] ✅ Bridge besitzt lokale Projekt-/Clip-Erstellung für den Launcher-Handoff
- [ ] 🟡 echten Windows-Recording-Handoff mit realer 6-Track-MKV aufnehmen und in Cut Studio öffnen
- [ ] 🟡 reale FFmpeg-Exports mit einzelnen Solo-/Mute-Kombinationen aller sechs eingebetteten Tracks abhören
- [ ] 🟡 MP4/MKV-Container-Matrix mit unterschiedlichen Encoder-/Audio-Track-Kombinationen real abnehmen

**Repository-Test:** `npm.cmd run studio-recording-cut21:check`

**Detail-Doku:** `STREAM_STUDIO_RECORDING_CUT_HANDOFF_PASS21_10_25.md`

## Pass 21.10.26 Update – Recording Stem Preview / Waveforms / Track Audition

- [x] ✅ Recording-Handoff-Store auf Schema 2 / Pass 21.10.26 erweitert
- [x] ✅ pro eingebettetem Recording-Stem lokaler Analysis- und Preview-Status
- [x] ✅ FFmpeg-Analyse einzelner eingebetteter Streams per `0:a:<index>`
- [x] ✅ lokale detaillierte PNG-Waveform pro Stem
- [x] ✅ reduzierte 64-Bin-Waveform-Hüllkurve für Cut Studio
- [x] ✅ Peak-/Mean-dB-Metadaten pro Recording-Stem
- [x] ✅ Einzelspur-Audition als kurze lokale PCM-WAV
- [x] ✅ Einzelspur-Audition berücksichtigt gespeicherten Gain-/Pan-Wert
- [x] ✅ Current-Mix-Audition berücksichtigt Aktiv / Mute / Solo / Gain / Pan
- [x] ✅ Mix-Audition verwendet dieselbe Source-Track-Mixlogik wie der Cut-Export
- [x] ✅ Preview-Dauer hart auf maximal 30 Sekunden begrenzt; Standard 12 Sekunden
- [x] ✅ Launcher zeigt Waveform, Peak/Mean und lokale Audio-Controls pro Stem
- [x] ✅ Launcher-Aktionen `WAVEFORMS`, `SPUR HÖREN`, `MIX HÖREN`
- [x] ✅ Creator Bridge unterstützt sicheres Update bestehender Cut-Projekte
- [x] ✅ Cut Studio zeigt reduzierte Recording-Waveforms im Mehrspurblock
- [x] ✅ Cut Studio bewahrt Waveform-/Peak-/Mean-Metadaten beim Speichern
- [x] ✅ Recording-Datei, PNG-Waveform, Preview-WAV und lokale Pfade bleiben ausschließlich im Launcher
- [x] ✅ keine PCM-/BGRA-Rohdaten, Streamkeys, RTMP-Adressen oder Tokens in Waveform-Metadaten
- [x] ✅ synthetische Multi-Audio-MKV: Stem-Analyse + Waveform + Track-Preview + Solo-Mix-Preview real mit FFmpeg geprüft
- [ ] 🟡 echte Windows-6-Track-Aufnahme analysieren und alle sechs Stems lokal vorhören
- [ ] 🟡 Preview-Latenz und Cache-Verhalten mit langen Realaufnahmen abnehmen
- [ ] 🟡 optional Timeline-Playhead als Startpunkt für Stem-Audition
- [ ] 🟡 optional automatische Bereinigung alter Preview-/Waveform-Caches

**Repository-Test:** `npm.cmd run studio-recording-preview21:check`

**Detail-Doku:** `STREAM_STUDIO_RECORDING_STEM_PREVIEW_PASS21_10_26.md`

## Pass 21.10.27 Update – Timeline Audition & Playback Head

- [x] ✅ Recording-Stems können ab der aktuellen Cut-Timeline-Position vorgehört werden
- [x] ✅ Playback Head wird lokal im Browser bewegt; während des Ziehens entstehen keine Bridge-Requests
- [x] ✅ beim Loslassen wird eine kurze 4-Sekunden-Mix-Audition angefordert
- [x] ✅ normale Mix-/Track-/A/B-Auditions verwenden 12 Sekunden
- [x] ✅ Preview-Dauer bleibt hart auf maximal 30 Sekunden begrenzt
- [x] ✅ FFmpeg-Seek liegt vor `-i` für schnelles Anspringen langer Recordings
- [x] ✅ A- und B-Marker werden als harmlose Millisekunden-Metadaten im Cut-Projekt gespeichert
- [x] ✅ `SPUR AB PLAYHEAD` verwendet Gain/Pan aus dem aktuellen Cut-Projekt
- [x] ✅ Mix-Audition verwendet Aktiv / Mute / Solo / Gain / Pan aus dem aktuellen Cut-Projekt
- [x] ✅ authentische eingebettete Stream-Indizes werden ausschließlich aus dem lokalen Recording-Handoff übernommen
- [x] ✅ eigener kurzlebiger Bridge-Job `cut_audition` / Schema 8 initial; ab Pass 21.10.28 Schema 9 mit Transportaktion
- [x] ✅ Audition-Jobs zählen nicht gegen normale Cut-Export-Slots und erscheinen nicht in normalen Exportlisten
- [x] ✅ neuer queued Scrub-/Audition-Auftrag ersetzt den vorherigen queued Auftrag desselben Projekts
- [x] ✅ maximal zwei bereits reservierte/laufende Auditions gleichzeitig
- [x] ✅ alte abgeschlossene Audition-Jobs werden nach einer Stunde bereinigt
- [x] ✅ Launcher pollt Audition-Jobs separat alle 1,5 Sekunden
- [x] ✅ queued Job wird vor lokaler Handoff-/FFmpeg-Prüfung reserviert; lokale Fehler werden sauber als `failed` abgeschlossen
- [x] ✅ Website kann weder einen lokalen Recording-Pfad noch einen Preview-Pfad anfordern
- [x] ✅ Preview-WAV-Pfad wird nur über lokales Electron-IPC `launcher:cut-audition` an den Launcher-Renderer gegeben
- [x] ✅ Launcher stoppt eine laufende Audition-Wiedergabe vor dem nächsten A/B-/Scrub-Preview
- [x] ✅ keine Recording-Datei / Preview-WAV / PCM-/BGRA-Rohdaten / Streamkeys / Tokens werden zur Website hochgeladen
- [ ] 🟡 echte Windows-6-Track-Aufnahme mit Playhead, A/B und allen Stems vorhören
- [ ] 🟡 Scrub-Latenz bei langen 1–4-Stunden-Recordings real messen
- [ ] 🟡 Multi-Clip-Reel-Timeline auf Source-Zeit abbilden; 21.10.27 fokussiert Recording-Handoff-Projekte mit vollständigem Recording-Clip

**Repository-Test:** `npm.cmd run studio-timeline-audition21:check`

**Detail-Doku:** `STREAM_STUDIO_TIMELINE_AUDITION_PASS21_10_27.md`

## Pass 21.10.28 Update – Real-time Audition Cache & Transport

- [x] ✅ lokaler Audition-Cache für Timeline-Mix und einzelne Recording-Stems
- [x] ✅ normale Cache-Fenster 30 Sekunden lang mit 15-Sekunden-Raster und Überlappung
- [x] ✅ wiederholtes A/B, Scrub und typische ±5-Sekunden-Sprünge können dasselbe lokale WAV-Segment nutzen
- [x] ✅ Cache-Key ist SHA-256-basiert und enthält keine lesbaren Recording-Dateinamen
- [x] ✅ Cache invalidiert bei geändertem Recording-Stand sowie Aktiv / Gain / Mute / Solo / Pan
- [x] ✅ Track- und Mix-Audition besitzen getrennte Cache-Identitäten
- [x] ✅ lange 30-Sekunden-Auditions erhalten bei Bedarf ein exakt passendes Fenster statt abgeschnitten zu werden
- [x] ✅ Cache auf 64 Dateien / 512 MiB begrenzt; älteste Segmente werden automatisch entfernt
- [x] ✅ Media-Engine-Telemetrie zählt Cache Hits / Misses / Renders / Evictions / Dateien / Bytes
- [x] ✅ `cut_audition` auf Schema 9 erweitert: `preview`, `pause`, `resume`, `stop`
- [x] ✅ Pause / Play / Stop steuern ausschließlich die lokale Electron-Audioinstanz
- [x] ✅ Cut Studio erhält `−5 S` / `+5 S` Transport um den Playback Head
- [x] ✅ Launcher springt im Cache-WAV auf den berechneten Offset statt Segmentanfang
- [x] ✅ lokale Wiedergabe stoppt nach der ursprünglich angeforderten Preview-Dauer, nicht erst nach Cache-Segmentende
- [x] ✅ Resume respektiert die verbleibende Preview-Endgrenze
- [x] ✅ Recording-Datei, Cache-WAV und absolute lokale Pfade bleiben ausschließlich im Launcher
- [x] ✅ Website kann weiterhin keinen Recording-/Preview-Dateipfad vorgeben
- [ ] 🟡 echte Windows-6-Track-Aufnahme: Cache-Hit-Latenz bei ±5 s und A/B messen
- [ ] 🟡 1–4-Stunden-Recording: Cache-Größe, SSD-Last und Eviction real abnehmen
- [x] ✅ kontinuierliches Segment-Prefetch für längere Play-Strecken umgesetzt in Pass 21.10.29

**Repository-Test:** `npm.cmd run studio-audition-cache21:check`

**Detail-Doku:** `STREAM_STUDIO_AUDITION_CACHE_PASS21_10_28.md`

## Pass 21.10.29 Update – Continuous Audition Session / Prefetch

- [x] ✅ `CONTINUOUS PLAY` startet eine fortlaufende lokale Mix-Audition ab aktuellem Playhead
- [x] ✅ `cut_audition` Schema 10 ergänzt `session_start` und `session_seek` zusätzlich zu Preview/Pause/Resume/Stop
- [x] ✅ nur der initiale Start/Seek läuft über die Web→Launcher-Bridge; Segmentwechsel laufen lokal ohne neuen Bridge-Job
- [x] ✅ Launcher hält pro Session ausschließlich lokale Handoff-/Mix-Daten und eine zufällige Session-ID
- [x] ✅ erstes Segment wird synchron bereitgestellt; die nächsten zwei Segmente werden im Hintergrund vorgerendert bzw. aus Cache gelesen
- [x] ✅ Electron-Renderer fordert weitere Segmente ausschließlich über lokales IPC `launcher:cut-audition-prefetch` an
- [x] ✅ fortlaufende Wiedergabe wechselt am WAV-Ende automatisch zum nächsten vorgepufferten Segment
- [x] ✅ Pause/Resume arbeitet auf der aktuell laufenden lokalen Session ohne neuen FFmpeg-Render
- [x] ✅ Stop beendet Session und verwirft die lokale Segment-Warteschlange
- [x] ✅ Playhead-Scrub und ±5 s werden während aktiver Web-Session als `session_seek` umgesetzt
- [x] ✅ Finite Mix-/Stem-Vorschau beendet eine laufende Continuous Session sauber
- [x] ✅ Prefetch-Telemetrie: Requests / Hits / Renderings zusätzlich zu bisherigen Cache-Metriken
- [x] ✅ Session-Prefetch respektiert Timeline-Ende und rendert das letzte Segment nur bis zum Ende
- [x] ✅ Recording-Datei und alle Preview-/Cache-WAV-Pfade bleiben ausschließlich im Launcher
- [x] ✅ Website kann weiterhin keinen lokalen Pfad für Session oder Prefetch vorgeben
- [ ] 🟡 echte Windows-6-Track-Aufnahme: Übergang zwischen Segmenten auf hörbare Lücke/Jitter messen
- [ ] 🟡 lange 1–4-Stunden-Aufnahme: Prefetch-Trefferrate, RAM/SSD-Last und Seek-Verhalten real abnehmen
- [x] ✅ sample-genauer WebAudio-Transport umgesetzt in Pass 21.10.30; reale hörbare Windows-Abnahme bleibt offen

**Repository-Test:** `npm.cmd run studio-audition-session21:check`

**Detail-Doku:** `STREAM_STUDIO_AUDITION_SESSION_PASS21_10_29.md`



## Pass 21.10.30 Update – Gapless Audition Transport / WebAudio Buffer Queue

- [x] ✅ Continuous Audition wechselt nicht mehr zwischen separaten HTML-`Audio`-Instanzen
- [x] ✅ eigener lokaler `AudioContext` für fortlaufende Recording-Audition
- [x] ✅ Cache-WAVs werden als `AudioBuffer` dekodiert und mit `AudioBufferSourceNode.start(when, offset, duration)` geplant
- [x] ✅ aufeinanderfolgende Segmente teilen dieselbe AudioContext-Zeitachse und werden back-to-back terminiert
- [x] ✅ Pause friert die berechnete Timeline-Position ein; Resume schedult ab genau dieser Position neu
- [x] ✅ Session-Start innerhalb eines Cache-Fensters verwendet den korrekten Buffer-Offset
- [x] ✅ letztes Segment wird weiterhin auf die tatsächliche Timeline-Restdauer begrenzt
- [x] ✅ fehlendes nächstes Segment triggert ausschließlich lokales Prefetch; kein zusätzlicher Web-Bridge-Job
- [x] ✅ höchstens fünf dekodierte Segmente werden standardmäßig im Renderer-RAM gehalten
- [x] ✅ alte dekodierte AudioBuffer werden verworfen, die WAV-Dateien bleiben dem bestehenden lokalen Cache überlassen
- [x] ✅ Continuous-Session-Events enthalten keinen lokalen Preview-/Cache-Dateipfad mehr
- [x] ✅ Main-Prozess hält eine verifizierte Session→Segment-Dateiabbildung
- [x] ✅ Renderer fordert WAV-Bytes nur per aktiver Session-ID + Segmentstart an
- [x] ✅ Byte-IPC akzeptiert ausschließlich SHA-256-benannte WAVs direkt im lokalen Audition-Cache
- [x] ✅ Byte-IPC begrenzt Segmentgröße auf 8 MiB und bietet keine allgemeine Dateilesefunktion
- [x] ✅ finite 4-/12-Sekunden-Auditions bleiben auf dem einfachen lokalen Audio-Pfad
- [x] ✅ WebAudio-Transport ist als eigenes testbares Renderer-Modul gekapselt
- [x] ✅ Fake-AudioContext-Test bestätigt exakte Startzeiten 0 / 30 / 60 s auf derselben Context-Timeline
- [x] ✅ Pause/Resume-Test bestätigt Resume ab gespeichertem Buffer-Offset
- [ ] 🟡 echte Windows-6-Track-Aufnahme: hörbare Segmentgrenze mit Kopfhörer/Loopback messen
- [ ] 🟡 1–4-Stunden-Aufnahme: WebAudio-RAM, Prefetch-Jitter und Suspend/Resume real abnehmen
- [ ] 🟡 optional später: AudioWorklet/Ringbuffer nur falls reale WebAudio-Buffer-Queue noch messbare Übergangsartefakte zeigt

**Repository-Test:** `npm.cmd run studio-gapless-audition21:check`

**Detail-Doku:** `STREAM_STUDIO_GAPLESS_AUDITION_PASS21_10_30.md`

## Pass 21.10.31 Update – Audition Clock Sync / Live Playhead Follow

- [x] ✅ lokale WebAudio-Clock bleibt autoritative Zeitquelle für Continuous Audition
- [x] ✅ Electron-Renderer meldet Session-State + Millisekundenposition ohne Audio-/Dateipfade
- [x] ✅ Main-Prozess verifiziert aktive Session-ID und drosselt Playing-Sync auf ~850 ms
- [x] ✅ Pause/Resume/Stop/Timeline-Ende werden sofort als Clock-Anker synchronisiert
- [x] ✅ `creator_cut_audition_runtime` speichert nur sanitiserte Transportmetadaten
- [x] ✅ verspätete ältere Clock-Pakete können neueren Sample-Zeitpunkt nicht überschreiben
- [x] ✅ Playing/Paused Runtime wird nach 12 s ohne Update als `stale` markiert
- [x] ✅ Cut Studio pollt Clock-Anker ~900 ms und interpoliert Playhead lokal per `requestAnimationFrame`
- [x] ✅ Follow pausiert während Slider-Drag und übernimmt nach `session_seek` wieder
- [x] ✅ 5-s Command-Grace verhindert Race direkt nach CONTINUOUS PLAY
- [x] ✅ reine Browser-Clock-Hilfe enthält weder Netzwerk- noch Dateisystemzugriff
- [ ] 🟡 echte Windows-Langzeitaufnahme: sichtbaren Playhead gegen hörbare Ausgabe messen
- [ ] 🟡 Suspend/Resume, Audio-Gerätewechsel und hohe Systemlast real auf Clock-Drift prüfen

**Repository-Test:** `npm.cmd run studio-audition-clock21:check`

**Detail-Doku:** `STREAM_STUDIO_AUDITION_CLOCK_SYNC_PASS21_10_31.md`



## Pass 21.10.32 Update – A/B Loop Audition & Selection Range

- [x] ✅ A- und B-Marker bilden eine echte lokale Auswahlregion; technisch immer `min(A,B) → max(A,B)`
- [x] ✅ minimale Loop-Länge 500 ms; kürzere Regionen werden in UI, API und Launcher abgewiesen
- [x] ✅ Cut Studio zeigt die A/B-Region sichtbar über der Timeline
- [x] ✅ `A↔B LOOP` startet eine Continuous-WebAudio-Session exakt innerhalb der Auswahl
- [x] ✅ `loop_seek` hält Scrub und ±5-s-Sprünge während aktivem Loop innerhalb A/B
- [x] ✅ `cut_audition` auf Schema 11 mit `loop_start` / `loop_seek` erweitert
- [x] ✅ Launcher-Session enthält nur Loop-Millisekundenmetadaten; keine lokalen Audio-/Dateipfade
- [x] ✅ WebAudio-Scheduler schneidet Source-Nodes exakt an B und plant den nächsten Node auf derselben AudioContext-Zeitachse wieder ab A
- [x] ✅ Pause speichert die modulare Position innerhalb des Loops; Resume schedult ab genau dort weiter
- [x] ✅ lange A/B-Bereiche können mehrere lokale Cache-Segmente verwenden und fehlende Segmente lokal prefetchen
- [x] ✅ Clock-Sync transportiert `loop_enabled`, `loop_start_ms`, `loop_end_ms` und wrappt geschätzte Positionen B→A
- [x] ✅ verspätete Runtime-Updates bleiben weiterhin revisions-/samplezeit-geschützt
- [x] ✅ bestehende `creator_cut_audition_runtime` wird per `ADD COLUMN IF NOT EXISTS` um Loop-Felder migriert
- [x] ✅ Recording-Datei, Cache-WAV, PCM, AudioBuffer, Streamkeys, RTMP-Adressen und Tokens bleiben außerhalb der Web-Runtime
- [ ] 🟡 echte Windows-6-Track-Aufnahme: wiederholte A/B-Grenze auf Klick/Jitter abhören
- [ ] 🟡 lange Loop-Regionen über mehrere Cache-Fenster unter Last real abnehmen
- [ ] 🟡 Audio-Gerätewechsel / Suspend-Resume während aktivem A/B-Loop real prüfen

**Repository-Test:** `npm.cmd run studio-ab-loop21:check`

**Detail-Doku:** `STREAM_STUDIO_AUDITION_LOOP_PASS21_10_32.md`

## Pass 21.10.33 Update – Loop Boundary Crossfade / Click Guard

- [x] ✅ A/B-Loop besitzt konfigurierbaren lokalen Click Guard mit 0–50 ms Randblende
- [x] ✅ Standardwert 12 ms wird im Cut-Projekt als harmlose Millisekunden-Einstellung gespeichert
- [x] ✅ effektive Fade-Länge wird in Website, Server und Launcher hart auf maximal 50 ms begrenzt
- [x] ✅ Launcher begrenzt zusätzlich auf höchstens ein Viertel der aktiven A/B-Region
- [x] ✅ WebAudio-Scheduler blendet den letzten Abschnitt vor B linear auf 0 aus
- [x] ✅ die nächste Runde startet exakt an A und blendet vom selben Boundary-Zeitpunkt wieder ein
- [x] ✅ A→B-Loop-Periode bleibt dadurch unverändert; kein kumulativer Audio-/Playhead-Clock-Drift
- [x] ✅ Click Guard nutzt ausschließlich lokale GainNode-Automation; kein FFmpeg-Neurender pro Loop-Durchlauf
- [x] ✅ fehlt GainNode-Unterstützung, fällt der Loop kontrolliert auf harte Grenze zurück und zählt den Fallback lokal
- [x] ✅ bei Cache-Grenzen wird die Fade-Länge auf tatsächlich verfügbares lokales Audio begrenzt
- [x] ✅ Pause/Resume/Loop-Seek behalten dieselbe A/B- und Click-Guard-Konfiguration
- [x] ✅ `cut_audition` auf Schema 12 mit `loop_crossfade_ms` erweitert
- [x] ✅ Recording-/Cache-Pfade, WAV/PCM/AudioBuffer und Credentials bleiben weiterhin außerhalb der Web-Runtime
- [x] ✅ Fake-AudioContext-Test bestätigt exakte 15-s-Loop-Periode trotz 12-ms Boundary-Fades
- [ ] 🟡 echte Windows-6-Track-Aufnahme: Klickfreiheit bei 0/5/12/20/50 ms mit Kopfhörer/Loopback vergleichen
- [ ] 🟡 sehr kurze 0,5–2-s-Loops und Audio-Gerätewechsel unter Last real abnehmen

**Repository-Test:** `npm.cmd run studio-loop-click-guard21:check`

**Detail-Doku:** `STREAM_STUDIO_LOOP_CLICK_GUARD_PASS21_10_33.md`


## Pass 21.10.34 Update – Auto Zero-Cross Snap / Loop Boundary Inspector

- [x] ✅ A/B-Grenzen können lokal gegen den aktuell eingestellten Recording-Stem-Mix analysiert werden
- [x] ✅ FFmpeg extrahiert pro Grenze nur ein kleines Mono-PCM-Fenster von maximal ±50 ms
- [x] ✅ Analyzer sucht den nächstgelegenen echten Vorzeichenwechsel; ohne Crossing fällt er auf den niedrigsten Absolutpegel zurück
- [x] ✅ Suchradius ist im Cut-Projekt als harmlose Einstellung 5–50 ms sanitisiert; UI bietet 10/20/30/50 ms
- [x] ✅ Inspector ist rein advisory: A/B werden erst durch `A SNAP`, `B SNAP` oder `BEIDE SNAP` geändert
- [x] ✅ Browser pollt nur die konkrete Inspector-Job-ID und kann dadurch kein älteres Ergebnis versehentlich übernehmen
- [x] ✅ Änderungen an A/B oder Aktiv/Mute/Solo/Gain/Pan der Recording-Stems invalidieren bestehende Vorschläge
- [x] ✅ Cloud-Ergebnis enthält nur Millisekundenposition, Delta, dBFS-Pegel und Crossing-Flag
- [x] ✅ `cut_audition` auf Schema 13 mit `inspect_zero_cross` und `search_radius_ms` erweitert
- [x] ✅ Zero-Cross-Job zählt weiterhin als Audition und nicht gegen reguläre Export-Slots
- [x] ✅ Recording-Datei, lokale Pfade, PCM-Fenster, Cache-WAV, AudioBuffer, Streamkeys, RTMP-Adressen und Tokens bleiben außerhalb der Website
- [x] ✅ pure PCM-Tests decken echten Crossing-Treffer, nächstgelegenen Crossing und Lowest-Level-Fallback ab
- [ ] 🟡 echte Windows-6-Track-Aufnahme: A/B-Snap gegen hörbare Loop-Grenzen mit 0/12-ms Click Guard vergleichen
- [ ] 🟡 stark komprimierte/laute Mischungen und sehr kurze 0,5–2-s-Loops real auf sinnvolle Snap-Vorschläge prüfen

**Repository-Test:** `npm.cmd run studio-zero-cross21:check`

**Detail-Doku:** `STREAM_STUDIO_ZERO_CROSS_PASS21_10_34.md`

# CFS_Zockt – Master Checklist

**Stand:** 2026-09-17  
**Aktueller Entwicklungsstand:** Pass 21.10.12  
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
- [ ] 🟡 natives Source-Routing für Screen/Game/Camera nach Launcher-Compositor
- [ ] 🟡 zusätzliche App-Audio-Busse (Discord/Musik getrennt) nach Application-Audio-Capture

**Repository-Test:** `npm.cmd run studio-routing21:check`

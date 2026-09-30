# TECHNIK v158 — Studio Flow / Integrations-Ordnung

**Release:** v158  
**Backend:** 3.20.4  
**Schema Generation:** 73  
**Launcher:** 0.47.28  

## Ziel

v158 setzt den UX-/Informationsarchitektur-Pass aus v157 fort. Es werden keine neuen großen Features eröffnet. Bestehende Funktionen werden nach dem tatsächlichen Creator-Ablauf geordnet.

## CFS Stream Studio

Der Einstieg ist jetzt als klarer Ablauf aufgebaut:

1. Bühne bauen
2. Bild, Ton & Output vorbereiten
3. Stream prüfen
4. LIVE Session
5. Health, Community und Multistream überwachen

Zusätzlich nutzt der CFS Studio Hub dieselben Themen wie Dashboard und Creator Suite:

- Start & Status
- Gestalten
- Produzieren
- Verbinden
- Community
- System & Tests

Bestehende Runtime-IDs, Dock-IDs und Stream-Funktionen bleiben erhalten.

## Integrationen

Die Seite ist nicht mehr als gemischte Kartenwand aufgebaut, sondern nach Aufgaben:

- Streaming-Plattformen: TikTok, Twitch, YouTube
- PC, Launcher & OBS
- Erweitert & Diagnose: NEXUS

Der Verbindungsweg wird oben in drei Schritten erklärt: Plattform verbinden → Launcher verbinden → im Stream Studio nutzen.

## Scene Studio

Scene Studio wird klar als Direkt-/Kompatibilitätseditor eingeordnet.

Der normale neue Workflow ist:

Widget Studio → CFS Stream Studio / Scene Composer → Stream Check → LIVE

Bestehende Scene-Outputs können weiterhin direkt im Scene Studio bearbeitet und veröffentlicht werden.

## Security

Keine Secret-Grenze wurde verändert.

- keine Stream-Keys in PostgreSQL
- keine Stream-Keys im Browser-State
- keine Stream-Keys in URLs oder Logs
- Provider-Isolation bleibt erhalten
- Launcher bleibt lokale Grenze für Capture, OBS und verschlüsselte Stream-Credentials

## Tests

- Workspace Organization v157: 69/69 PASS
- Workspace Flow v158: 86/86 PASS
- Stream Studio Foundation: 46/46 PASS
- Stream Studio Workflow: 29/29 PASS
- CFS Studio Hub & Session: 47/47 PASS
- vollständiger `npm run release:v158`: PASS

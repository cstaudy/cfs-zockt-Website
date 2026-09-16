# Website Creator Shell – Pass 21.3.7

**Stand:** 16.09.2026  
**Basis:** Pass 21.3.6  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Der eingeloggte Creator-Bereich verwendet ab diesem Pass eine gemeinsame Navigation und wirkt als zusammenhängender Workspace statt als Sammlung einzelner Tools.

## Einheitliche Hauptnavigation

Direkt sichtbar:

- Dashboard
- Widgets
- TikTok
- Integrationen
- Launcher
- Account
- Logout

Unter **Mehr**:

- Scene Studio
- Creator Editor
- Games
- Cut Studio
- NEXUS
- Audio Studio
- Setup
- Einstellungen
- Gerät verbinden
- Öffentliche Website

Der aktuelle Bereich wird automatisch hervorgehoben. Seiten im Mehr-Menü markieren auch den Mehr-Einstieg als aktiv.

## Dashboard

Das Dashboard erhält zusätzlich eine Workspace-Karte mit vier stabilen Arbeitswegen:

1. Bauen – Widgets, Szenen, Editor
2. Verbinden – TikTok, Launcher, Integrationen
3. Erweitern – Games, Cut Studio, NEXUS
4. Verwalten – Account, Setup, Einstellungen

## Bestehende Funktionalität

Die bestehenden IDs `mobileNavToggle` und `mainNav` bleiben erhalten, damit Widget Studio, Scene Studio und Launcher mit ihren vorhandenen Skripten kompatibel bleiben. Der zentrale `app.js`-Handler übernimmt die mobile Navigation im Capture-Modus.

Admin bleibt nicht öffentlich sichtbar. Der vorhandene Dashboard-Link `adminCreatorNav` bleibt versteckt und wird nur durch die bestehende Admin-Logik freigeschaltet.

## Abgrenzung

Öffentliche Marketing-Navigation und Creator-Navigation bleiben getrennt. Security-, Account-, API- und Planlogik werden in diesem UI-Pass nicht abgeschwächt oder umgebaut.

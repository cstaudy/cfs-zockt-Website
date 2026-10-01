# TECHNIK v164 — Public Homepage Professional Flow

- Backend: **3.20.10**
- Schema: **73**
- Launcher: **0.47.29**
- Feature Freeze: aktiv

## UI-Struktur

Die öffentliche Startseite wurde ausschließlich redaktionell und layoutseitig bereinigt. Twitch-/TikTok-LIVE-IDs, PlayStation-Slots, Community-Stat-IDs, Auth-Attribute und der transparente Brand-Asset-Pfad bleiben erhalten.

Mobile Auth-Aktionen befinden sich zusätzlich innerhalb der mobilen Navigation. Der separate Desktop-Auth-Cluster wird unter 900 px ausgeblendet, sodass kein symbolischer `+`-Shortcut mehr erscheint.

## Gate

`npm run homepage164:check`

Der Gate prüft 31 Punkte zu Navigation, Reihenfolge, LIVE-Funktionserhalt, Mobile-Verhalten, Footer, Textumfang und Versionierung.

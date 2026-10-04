# PROJECT CURRENT STATE · v184

Aktiver kumulativer Stand: **v184**.

**Backend: 3.20.29**  
**Schema: 78**  
**Launcher: 0.47.30**

## Produktidentität
- **cfs_zockt ist Marke und öffentliche Website.**
- Public zeigt Motivation, Gaming, Streams, aktuelle Games, TikTok/Twitch/Discord und Community-Zahlen.
- **Creator Suite ist ein geschütztes Produkt** für registrierte Creator.
- Dashboard, Creator Suite, Shop, Launcher und Studios liegen hinter Login.
- Creator-Produkte tragen Logo/Publisher-Kennzeichnung `by cfs_zockt`.

## Privates Admin Control Center
- `/pages/admin-creators.html` ist serverseitig Admin-only.
- Website-Inhalte laufen über **Draft → private Vorschau → Publish → Revert**.
- Öffentliche Besucher erhalten ausschließlich veröffentlichte Snapshots.
- Bundle Factory/Production Suite bleibt die einzige Shop-Produktionsengine.

## v183 · Unified Admin Converter
- Ein zentraler Admin-Umwandler bündelt die bisherigen Produktionswege für **Stream-Status, Overlays, Panels/Cards, Provider-Widgets und komplette Creator-Packs**.
- Plattformwahl: **Twitch, TikTok, YouTube oder Plattformneutral**; ungültige Kombinationen werden serverseitig abgelehnt.
- Ausgabe vor Erzeugung wählbar: **nur Bundle**, **nur Einzelstücke** oder **Bundle + Einzelstücke**.
- Variantenanzahl: 1, 2 oder 4 Entwürfe; bestehendes Produkt-/Collection-Duplizieren bleibt erhalten.
- Stream-Status-Serie enthält Starting Soon, Pause/BRB, Ending und Offline als erzeugbare Produktbestandteile.

## v184 · Stream Lifecycle
- Im Stream Studio können **Starting Soon, LIVE, BRB/Pause, Ending und Offline** jeweils einer veröffentlichten Scene zugeordnet werden.
- Jeder Lifecycle-Status kann manuell aktiviert werden.
- Optional kann der Launcher-Status **Starting/LIVE/Ending/Offline** automatisch auf die zugeordneten Scenes abbilden.
- **BRB/Pause bleibt bewusst manuell**, damit keine Laufzeitheuristik eine Pause unbeabsichtigt auslöst.
- Offline ist zusätzlich als Scene-Schnellstart-Preset verfügbar.
- Es werden nur Creator-eigene veröffentlichte Scenes verwendet; Provider-Secrets bleiben außerhalb der Lifecycle-Konfiguration.

## Sicherheit / Commerce
- **Account Login / Anomaly Security (Pass 9)** bleibt Bestandteil der Regression.
- Passkeys/WebAuthn sind implementiert; **echter Browser-/Authenticator-E2E** auf realer Hardware **bleibt offen**.
- Quellbilder müssen Admin-owned, rechtegeprüft und für Shop-Nutzung freigegeben sein.
- Converter-Route ist Creator-Admin-only und erzeugt nur allowlist-validierte Pakettypen.
- Provider-Grenzen bleiben strikt; YouTube-Produkte dürfen nur YouTube-Widgets enthalten.
- `CFS_COMMERCIAL_MODE=false`.
- Reale Windows-/OBS-/TikTok-/Twitch-/YouTube-/Multistream-Abnahme bleibt offen.

Die verbindliche Reihenfolge steht in `PROJECT_FLOW_PLAN.md`; neue Ideen zuerst in `IDEAS-BACKLOG.md`.


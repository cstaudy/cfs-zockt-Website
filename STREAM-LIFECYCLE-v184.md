# Stream Lifecycle v184

Backend **3.20.29** · Schema **78** · Launcher **0.47.30**.

## Ziel
Stream Studio besitzt einen zusammenhängenden Lifecycle für **Starting Soon → LIVE → Pause/BRB → Stream Ende → Offline**.

## Bedienung
- Jeder Status kann einer bereits veröffentlichten, eigenen Scene zugeordnet werden.
- Jeder Status ist manuell per `ANZEIGEN` schaltbar.
- `LAUNCHER-AUTO` ist opt-in. Es mappt lokale Engine-Zustände auf Starting/LIVE/Ending/Offline.
- BRB/Pause bleibt bewusst manuell, weil die Engine keinen verlässlichen Pause-Zustand ableitet.
- Der neue Offline-Schnellstart erzeugt eine passende Offline-Scene als Ausgangspunkt.

## Sicherheitsgrenze
- Nur bereits veröffentlichte und dem Creator gehörende Scenes werden akzeptiert.
- Provider-Secrets und Stream Keys bleiben im Launcher.
- Ohne aktivierten Lifecycle oder ohne `LAUNCHER-AUTO` findet kein automatischer Scene-Wechsel statt.

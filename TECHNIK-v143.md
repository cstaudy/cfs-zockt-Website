# TECHNIK v143 — Twitch Creator OAuth & Token Lifecycle

## Ziel
v143 setzt den Integrationspfad nach v142 fort. Twitch ist nicht mehr nur eine vorbereitete OAuth-Struktur, sondern besitzt jetzt einen echten Creator-Account-Link auf der Website. EventSub/Chat und echtes Twitch-Streaming bleiben bewusst getrennte nächste Runtime-Stufen.

## Twitch OAuth
Implementiert:
- Authorization-Code-Flow über `/auth/creator/twitch`
- Callback `/auth/twitch/callback`
- kryptographisch zufälliger State mit einmaliger DB-Bindung und 10-Minuten-TTL
- HttpOnly/Secure/SameSite=Lax State-Cookie
- Creator-Zuordnung über den verbrauchten OAuth-State
- Access- und Refresh-Token ausschließlich serverseitig AES-256-GCM-verschlüsselt
- kein Token im Browser/API-Status
- Profil-Sync über Twitch Helix `/users`
- Status unter `/api/creator/twitch/status`
- manueller Profil-Sync unter `/api/creator/twitch/sync`
- Revoke + lokales Löschen unter `/api/creator/twitch/disconnect`

## Token Lifecycle
- Access-Token wird vor Ablauf mit Sicherheitsfenster erneuert.
- Twitch `/validate` wird spätestens nach 55 Minuten erneut ausgeführt.
- Bei 401 während der Validierung wird einmal über Refresh-Token erneuert und anschließend erneut validiert.
- rotierte Refresh-Tokens ersetzen die vorherige verschlüsselte Fassung.
- öffentliche Capability-Ausgabe enthält nur Konfigurations-Bools und Capability-Status, niemals Client Secret oder Tokens.

## Least Privilege
Der erste echte Account-Link fordert nur `user:read:chat` an. Zusätzliche Rechte werden erst ergänzt, wenn die jeweilige Funktion tatsächlich implementiert wird. Dadurch wird für den OAuth-Grundpfad kein pauschaler großer Scope-Satz verlangt.

## UI
`/pages/integrations.html` zeigt Twitch jetzt als echten Account-Link:
- verbinden
- verbundenes Konto anzeigen
- Profil synchronisieren
- Verbindung trennen
- Konfigurationsfehler verständlich anzeigen

Die UI sagt weiterhin ausdrücklich, dass EventSub/Chat und Produktionsabnahme noch offen sind.

## Account Lifecycle
Beim Löschen eines Creator-Kontos werden jetzt zusätzlich dessen `twitch_connections` und `twitch_oauth_states` entfernt. Incident-/Security-Freeze behandelt `/auth/twitch` wie den bestehenden TikTok-OAuth-Pfad.

## Nicht als fertig behauptet
Weiter offen:
- Twitch EventSub WebSocket Runtime
- Chat-/Follow-/Sub-/Cheer-Eventnormalisierung
- echte Twitch-LIVE-Status-Abnahme
- echte Twitch-Stream-Ziel-Credentials / Output
- reale OAuth-Abnahme mit Twitch Developer App auf Produktion
- längerer Reconnect-/Token-Rotation-Test
- YouTube OAuth

## Lokale Prüfungen
- `node tools/twitch-oauth-v143-test.mjs .` → PASS
- `npm run creator-suite142:check` → PASS auf Full-Repository + v142/v143 Overlay
- Syntax: `server.js`, Provider OAuth Contract und Integrations-UI → PASS

## Ergebnis
v143 hebt Twitch von **foundation_only** auf **OAuth implementiert / Runtime noch offen**. Die bestehende Creator Suite bleibt regressionsgrün. Der nächste sinnvolle Twitch-Block ist EventSub/WebSocket mit deduplizierter Event-Verarbeitung und Reconnect, ohne OAuth-Tokens in Browser oder Cloud-Action-Queues offenzulegen.

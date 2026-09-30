# TECHNIK v148 — Twitch Runtime Hardening / Acceptance Readiness

## Ziel
Den bereits implementierten Twitch-OAuth-/EventSub-/Chat-Pfad nicht um weitere Features erweitern, sondern als eigenen Provider-Block robust bis zur realen Abnahme vorbereiten. YouTube bleibt in v148 unverändert.

## Änderungen
- Backend **3.17.0**, Launcher bleibt **0.47.22**, Schema Generation **71**.
- EventSub-Status gilt erst bei Twitch-Status `enabled` als wirklich bereit; `webhook_callback_verification_pending` wird nicht mehr als fertig gezählt.
- Remote-Reconciliation gegen `GET /helix/eventsub/subscriptions?user_id=...`.
- Vorhandene aktive Twitch-Abos werden übernommen, statt blind erneut erstellt zu werden.
- Doppelte passende EventSub-Abos werden bereinigt.
- Veraltete Callback-Abos desselben Creators/Types werden entfernt, bevor die aktuelle Subscription angelegt wird.
- HTTP-409-Konflikte werden als `reconcile_required` gespeichert und beim nächsten Remote-Abgleich aufgelöst.
- `GET /helix/streams?user_id=...` seedet den Twitch-LIVE-State auch dann korrekt, wenn der Creator schon live war, bevor EventSub verbunden wurde.
- EventSub-Revocations werden creator-spezifisch verarbeitet. Bei `authorization_revoked`/`user_removed` wird die Verbindung deaktiviert und die gespeicherten OAuth-Tokens werden entfernt.
- Bestehender HMAC-/Raw-Body-/TimingSafeEqual-/10-Minuten-Replay-Schutz bleibt aktiv.
- Neuer Twitch-Runtime-Self-Heal: alle 15 Minuten werden verbundene Creator in kleinen Batches validiert, EventSub remote abgeglichen und der LIVE-State synchronisiert.
- Runtime-Fehler werden creator-spezifisch gespeichert und ohne Secrets im Verbindungsstatus ausgegeben.
- Worker wird beim Serverstart gestartet und beim Graceful Shutdown sauber beendet.

## Twitch Providerumfang nach v148
Code-seitig vorhanden:
- Creator-spezifischer OAuth-Account-Link
- verschlüsselte Tokenablage, Refresh und regelmäßige Tokenvalidierung
- eindeutige externe Account-Zuordnung pro Creator
- LIVE/Offline
- Follow
- Subscribe/Resub/Gift-Sub
- Cheer/Bits
- Twitch Chat (read-only)
- providerreine Twitch-Widgets
- EventSub HMAC + Replay-Schutz + Dedup
- Remote-Reconciliation / Subscription-Self-Heal
- initialer LIVE-State-Sync
- Revocation-Handling

## Abgrenzung
`production_ready` bleibt bewusst **false**, bis echte Twitch-Accounts und echte Twitch-LIVE-Sessions den Acceptance-Plan bestanden haben. v148 behauptet keine reale Provider-Abnahme.

YouTube wird in v148 nicht funktional erweitert.

# cfs_zockt – Release Readiness v138

## Interne Basis
Die automatisierte lokale Basis ist als Release-Gate zusammengeführt. Ein grünes internes Gate bedeutet, dass die im Repository prüfbaren Verträge konsistent sind.

Es bedeutet ausdrücklich nicht, dass der öffentliche Production-Release bereits extern abgenommen ist.

## Production-Freigabe
Vor einer breiten Creator-Freigabe bleiben verpflichtend:

1. unabhängiger Penetrationstest
2. Online-Advisory-/Dependency-Audit
3. Windows-Code-Signing, Installer- und Update-Abnahme
4. produktiver Backup-/Restore-Test
5. Mehraccount-/Mehrgeräte-/Reconnect-/Soak-Test
6. Incident-/Credential-Rotation-Drill

## Release-Prinzip
- kein stilles Überschreiben im Widget Studio
- keine unsichere Remote-HTTP-Bridge
- signierte mutierende Launcher-Anfragen
- Replay-Schutz
- Creator-Zustand und Release-Zustand getrennt sichtbar
- keine Behauptung `production_ready`, solange externe Gates offen sind

## v148 Zusatzstatus — Twitch Runtime
Twitch ist code-seitig für reale Provider-Acceptance vorbereitet. Remote EventSub-Reconciliation, LIVE-State-Sync, Revocation-Handling und Self-Heal sind vorhanden. Produktionsfreigabe bleibt bis zu echten Twitch-/OBS-/Windows-/Soak-Tests offen.
## v149 Zusatzstatus — YouTube Creator Integration
YouTube ist code-seitig als dritter creator-spezifischer Provider integriert: OAuth Authorization Code Flow mit Offline-Refresh, verschlüsselte Tokens, Kanal-Isolation, aktiver Broadcast-/LIVE-State, adaptives Live-Chat-Polling sowie YouTube-spezifische Chat-, Mitgliedschafts- und Super-Chat-Widgets. Es wird nur `youtube.readonly` angefordert. `production_ready` bleibt bewusst `false`, bis nach dem Feature-Freeze reale Google-/YouTube-, Windows-/OBS-/Reconnect-/Soak-Tests erfolgen.


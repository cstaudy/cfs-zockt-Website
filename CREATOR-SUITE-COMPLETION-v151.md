# Creator Suite Completion v151

## Status

**PROVIDER-BETA CONTROL: CODE READY / REAL MULTI-CREATOR ACCEPTANCE OPEN**

v151 ergänzt keine neuen Provider-Features, sondern kontrolliert, wer TikTok und Twitch während der Vorabphase benutzen darf.

## Fertig

- Admin Control nur über konfigurierte cfs_zockt Login-E-Mail.
- Admin kann TikTok/Twitch ohne Beta-Freigabe testen.
- Neue Creator landen automatisch auf `pending`.
- Direkte Admin-Freigabe für TikTok + Twitch.
- E-Mail-Verifikation wird bei Beta-Aktivierung berücksichtigt.
- Pending/Paused wird in Website, Account und Launcher sichtbar.
- TikTok/Twitch OAuth und Sync sind serverseitig Beta-gated.
- Launcher OAuth-Handoff ist zweifach Beta-gated.
- Twitch Runtime/EventSub wird für nicht freigegebene Creator nicht verarbeitet.
- Provider-Widgets werden im Katalog verborgen und serverseitig blockiert.
- Bereits veröffentlichte TikTok-/Twitch-Runtimes werden bei fehlender Freigabe mit 403 gestoppt.
- Disconnect bleibt möglich, damit ein pausierter Creator seine Provider-Verknüpfung lösen kann.
- YouTube bleibt außerhalb der v151 Provider-Beta.

## Noch real zu testen

- eigener Admin-Login mit echter Render-Konfiguration
- Registrierung eines zweiten/fremden Creator-Accounts
- Pending → Active im Admin Control
- danach TikTok- und Twitch-OAuth mit diesem Creator
- Provider-Widgets und OBS mit zwei getrennten Creatorn
- Paused während/zwischen Sessions
- Reconnect-/Soak-/Windows-/OBS-Tests

Diese Punkte werden wie beschlossen erst in der späteren gebündelten Acceptance durchgeführt.

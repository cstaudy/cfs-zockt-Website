# CFS ZOCKT · Beta Acceptance 3.20.57

Status: **HOLD** · 0/56 aufgelöst
Launcher: **0.47.31** · Schema: **80**

> Reale Acceptance. Automatische Tests dürfen keinen manuellen PASS erzeugen.

## A · Windows · Launcher · OBS

- [ ] `windows.clean_install` — **PENDING** — Windows Clean Install
- [ ] `windows.launcher_link` — **PENDING** — Launcher verbinden
- [ ] `obs.websocket` — **PENDING** — OBS WebSocket
- [ ] `obs.widget_install` — **PENDING** — Widget One-Click
- [ ] `windows.application_audio` — **PENDING** — Application Audio
- [ ] `windows.game_capture` — **PENDING** — Game Capture
- [ ] `windows.recording_cut` — **PENDING** — Recording → Cut
- [ ] `windows.artifact` — **PENDING** — Release-Artefakt

## B · Twitch LIVE

- [ ] `twitch.oauth` — **PENDING** — OAuth
- [ ] `twitch.chat` — **PENDING** — Chat
- [ ] `twitch.eventsub` — **PENDING** — EventSub
- [ ] `twitch.sub_cheer` — **PENDING** · conditional — Sub / Cheer
- [ ] `twitch.refresh` — **PENDING** — Token Refresh
- [ ] `twitch.revoke` — **PENDING** — Disconnect / Reconnect

## C · TikTok LIVE

- [ ] `tiktok.connect` — **PENDING** — Provider verbinden
- [ ] `tiktok.events` — **PENDING** — LIVE Events
- [ ] `tiktok.reconnect` — **PENDING** — Reconnect
- [ ] `tiktok.vertical` — **PENDING** — 9:16 Output
- [ ] `tiktok.stream_target` — **PENDING** · conditional — Encoder-Ziel

## D · YouTube LIVE

- [ ] `youtube.oauth` — **PENDING** — OAuth
- [ ] `youtube.channel` — **PENDING** — Channel Sync
- [ ] `youtube.live_chat` — **PENDING** — Live Broadcast / Chat
- [ ] `youtube.monetization` — **PENDING** · conditional — Membership / Super Chat
- [ ] `youtube.stream_target` — **PENDING** — Streaming-Ziel

## E · Multistream · Output

- [ ] `multistream.parallel` — **PENDING** — Zwei Ziele parallel
- [ ] `multistream.isolation` — **PENDING** — Fehlerisolation
- [ ] `multistream.manual_stop` — **PENDING** — Manueller Stop
- [ ] `multistream.custom_rtmp` — **PENDING** — Custom RTMP lokal

## F · Browser · Responsive · Accessibility

- [ ] `browser.chromium` — **PENDING** — Desktop Chromium / Edge
- [ ] `browser.firefox` — **PENDING** — Desktop Firefox
- [ ] `browser.mobile` — **PENDING** — Mobiler Viewport / Gerät
- [ ] `browser.keyboard` — **PENDING** — Keyboard / Fokus
- [ ] `browser.error_states` — **PENDING** — Empty / Error States
- [ ] `browser.admin` — **PENDING** — Admin Oberfläche

## G · Account · Security · Isolation

- [ ] `security.passkey` — **PENDING** — Passkey / WebAuthn
- [ ] `security.creator_isolation` — **PENDING** — Creator-Isolation
- [ ] `security.admin_isolation` — **PENDING** — Admin-Isolation
- [ ] `security.secret_review` — **PENDING** — Secret Review

## H · Shop · Downloads · Creator-Pakete

- [ ] `shop.categories` — **PENDING** — Kategorien / Filter
- [ ] `shop.design_download` — **PENDING** — Design-ZIP
- [ ] `shop.sound_download` — **PENDING** — Sound-ZIP
- [ ] `shop.maker_handoff` — **PENDING** — Shop → Maker
- [ ] `shop.audio_handoff` — **PENDING** — Shop → Tonstudio
- [ ] `shop.license_review` — **PENDING** · conditional — Lizenztext vor Verkauf

## I · Creator End-to-End

- [ ] `creator.image_to_set` — **PENDING** — Bild → Creator-Set
- [ ] `creator.widget_to_obs` — **PENDING** — Widget → OBS
- [ ] `creator.audio_alert` — **PENDING** — Alert-Sound
- [ ] `creator.stream_record_cut` — **PENDING** — Stream → Recording → Cut
- [ ] `creator.nexus` — **PENDING** — NEXUS Action
- [ ] `creator.system_check` — **PENDING** — Systemcheck

## J · Soak · Recovery · GO/NO-GO

- [ ] `stability.network_drop` — **PENDING** — Netzwerk-Unterbrechung
- [ ] `stability.provider_drop` — **PENDING** — Provider-Unterbrechung
- [ ] `stability.launcher_restart` — **PENDING** — Launcher-Neustart
- [ ] `stability.soak60` — **PENDING** — 60-Minuten-Soak
- [ ] `stability.p0p1` — **PENDING** — P0/P1 Review
- [ ] `stability.evidence` — **PENDING** — Evidence vollständig

## Freigaberegel

- Pflichtpunkte brauchen echten `PASS`.
- Conditional-Punkte dürfen mit nachvollziehbarem Grund `SKIP` sein.
- GO bleibt eine separate manuelle Release-Entscheidung.


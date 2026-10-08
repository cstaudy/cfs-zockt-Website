# Update 3.20.60 · Live-Provider-Matrix und echte Session-Metriken

**Basis:** 3.20.59 · **Ziel:** 3.20.60 · **Status:** Code-Teil und fokussierte Regressionen **PASS**; echte Twitch-/TikTok-/YouTube-/OBS-Acceptance **HOLD**.

## Implementiert

1. **Twitch-LIVE-Session-Metriken:** vier neue dynamische Widgettypen: Twitch LIVE Follows Counter, Twitch Follow Goal, Twitch Bits Counter und Twitch Bits Goal. Die Werte `twitch.followers_gained` und `twitch.bits` stammen ausschließlich aus deduplizierten `creator_live_events` mit **Creator-ID, Provider `twitch` und aktueller Session-ID**. Es werden ausdrücklich **keine historischen Profil-Followerstände** behauptet. `COUNT` zählt Follow-Events, `SUM(amount)` zählt Bits aus Cheer-Events. Ein neuer Twitch-Stream verwendet eine neue Session; bei Offline kann ein letzter Session-Stand gemäß `offlineBehavior=hold` erhalten bleiben.
2. **Provider-Status mit Ablaufzeit:** Twitch gilt nach 45 Minuten ohne Status-Update als `stale`, YouTube nach 6 Minuten. Dies berücksichtigt die bestehenden 15-Minuten-Twitch- und 15-Sekunden-/3-Minuten-YouTube-Reconcile-/Polling-Intervalle. Auch ungültige bzw. weit in der Zukunft liegende Zeitstempel werden nicht als frischer LIVE-Status akzeptiert. Kein neues DB-Schema.
3. **Keine ungebundenen Provider-Events:** Ohne eine Session-ID ist die öffentliche Eventabfrage leer statt alle historischen Twitch-/YouTube-Events zu liefern. Neue `alert`- und `chat`-Events werden nur für eine lebende, nicht veraltete Session gelesen. `latest` behält den letzten Session-Wert offline bei, sofern bereits eine Session existiert und das konfigurierbare Offline-Verhalten dies zulässt.
4. **Simulator-Trennung:** Events des Launcher-Mock-Adapters tragen `payload.source_provider=simulator` und werden am produktiven Bridge-Event-Endpunkt als `simulator_not_live` verworfen. Der gesonderte Creator-Simulator bleibt für Tests verfügbar. Das Mock-Modul selbst wurde nicht deaktiviert. Der Session-Start des Mock-Launchers bleibt technisch möglich; daher **nicht** als reale LIVE-Session-Abnahme betrachten.
5. **Bestand erhalten:** TikTok/TikTool-Event-Normalisierung, Twitch EventSub (Follow/Sub/Cheer/Chat), YouTube Live Chat/Membership/Super Chat, OBS-Widget-Renderer, bestehende Widget-IDs und 3.20.59-Motivumwandler bleiben bestehen. Schema 80 und Launcher 0.47.31 unverändert.

## Provider- und Widget-Matrix (implementierter Code, nicht Live-Abnahme)

| Provider | Quelle | Widgets/Metriken | Einschränkung |
|---|---|---|---|
| TikTok | TikTool als inoffizieller Drittanbieter über authentifizierte Launcher-Bridge | Follow, Gift, Like, Share, Viewer, Chat → TikTok-LIVE-Counter/Goals/Alerts | Erfordert installierten Provider, Zugang und echte Session; kein offizielles TikTok-LIVE-Events-API-Versprechen |
| Twitch | signierte EventSub-Webhooks und Get Streams | Follow/Sub/Cheer/Chat-Alerts und Chat; **NEU** sessionbezogene Follow-/Bits-Counter und Goals | OAuth-Berechtigungen `moderator:read:followers`, `bits:read` erforderlich; keine erfundenen globalen Follower-/Sub-Gesamtsummen |
| YouTube | Data API/Broadcasts und Live Chat Polling | Abonnentenprofil, LIVE Timer, Chat, Mitgliedschaft und Super Chat | Keine Twitch-/TikTok-Events; echte Streams und OAuth erforderlich |
| OBS/Manual | bestehende interne Widgetsteuerung | statische Assets, manuelle Goals/Counter und Timer | Keine Provider-Events werden künstlich ergänzt |

## Automatisierte Prüfungen

- `npm run check:v32060` → **PASS** für 34 neue Provider-Live-Binding-Tests, 20 Twitch-Runtime-Tests, 27 Motiv-Tests, 18 Studio-Rollen-Tests, TikTool-Provider-Test, Provider-Handoff, 31 Adapter-Tests sowie Audio-Preview-Mock.
- `node --check server.js` und `node --check public/assets/js/widget-studio.js` → **PASS**.
- `npm run check:v32059` (vollständiger Legacy-Chain-Check) → **BLOCKIERT** durch **bereits im gelieferten 3.20.59-Archiv fehlende Testdateien**, z. B. `tools/nexus-completion-gate-v66.mjs`, `tools/creator-module-state-regression-v32044-test.mjs`, `tools/beta-acceptance-kit-v32056-test.mjs`. Das vorhandene `tools/npm-script-hygiene-v32057-test.mjs` erkennt diese selbst. Der separate historische `tools/provider-widget-taxonomy-v147-test.mjs` enthält nicht mehr passende UI-String-Asserts aus alten Versionen. Der erfolgreiche fokussierte Check ersetzt **nicht** die vollständige Legacy-Regression.

## Reale Acceptance: weiterhin HOLD

Mit echten freigeschalteten Provider-Testkonten prüfen und evidence-basiert protokollieren: authentische Twitch Follow-/Cheer-Events und deduplizierte Folgeereignisse, Scope-Fehler, offline→online und Session-Reset, EventSub-Signatur; TikTool-TikTok Follow/Gift-Streak/Like/Share/Viewer und Reconnect; YouTube Broadcast, Chat, Membership/Super Chat und Quota-/Polling-Grenzen; Widget-Browserquelle in OBS/Windows mit `offlineBehavior=hide/hold/zero`; echte Browser-/Smartphone-Layouts und 60-Minuten-Soak. Ohne diese Nachweise kein Beta-GO.

**Kein** Windows-Build, kein Provider-Credential-Test, keine produktive Event-Injection, keine DB-Migration, kein Checkout-Wechsel.

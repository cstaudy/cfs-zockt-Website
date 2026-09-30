# TECHNIK v151 — E-Mail-only Admin Control + geschlossene Provider-Beta

## Versionen

- Backend: **3.18.2**
- Datenbankschema: **72** (keine neue Migration; vorhandene Beta-Tabellen werden weiterverwendet)
- Launcher: **0.47.24**
- Paket: **v151 kumulatives Update**, kein Full Project

## Ziel des Blocks

Während der Vorabtests soll genau das eigene cfs_zockt Konto administrieren und ohne zusätzliche Beta-Freigabe testen können. Externe Creator dürfen sich regulär registrieren, TikTok und Twitch aber erst nach einer bewussten Freigabe im Admin Control verbinden und verwenden.

## Admin Control

`isCreatorSuiteAdmin()` akzeptiert nur noch eine Account-E-Mail, die in `CFS_ADMIN_EMAILS` konfiguriert ist. `CFS_ADMIN_CREATOR_IDS` und Legacy-Owner-Fallbacks erteilen keine Admin-Rechte mehr. Wenn die globale E-Mail-Verifikation aktiv ist, muss auch die Admin-Adresse verifiziert sein.

Admin-Schreibaktionen bleiben zusätzlich durch die bestehende sessiongebundene Passwort-Re-Authentifizierung geschützt. Die Beta-Freigabe wird dadurch als privilegierte Admin-Aktion auditiert.

## Beta-Lifecycle

Bei aktivem `CFS_PROVIDER_BETA_REQUIRED=true` wird für jeden Nicht-Admin-Creator bei Registrierung bzw. erstem Access-Profil automatisch ein Beta-Eintrag `pending` angelegt. Im Admin Control kann der Status auf `active` oder `paused` gesetzt werden.

- `pending`: Account nutzbar, TikTok/Twitch gesperrt.
- `active`: TikTok/Twitch + zugehörige Provider-Widgets freigegeben.
- `paused`: Provider-Nutzung wieder gesperrt; Account bleibt erhalten, Disconnect bleibt möglich.
- Admin-E-Mail: immer freigegeben, kein Beta-Eintrag nötig.

Bei aktiver E-Mail-Verifikation wird `active` für unbestätigte Creator mit `beta_email_not_verified` abgewiesen.

## Server-seitige Sperrpunkte

Die Freigabe wird nicht nur im UI geprüft. v151 prüft sie unter anderem bei:

- TikTok OAuth Start und Callback
- TikTok Profil-Sync
- Twitch OAuth Start und Callback
- Twitch Profil-/EventSub-Sync
- Twitch Runtime-Reconcile und eingehenden EventSub-Events
- Launcher Provider OAuth Handoff (Ausgabe + Verbrauch)
- Widget Create/Update/Publish/Duplicate
- One-Click Widget → OBS
- Launcher Widget-Library
- öffentliche Published-Widget-Runtime

Damit reicht ein manuell aufgerufener Endpoint oder ein manipuliertes Frontend nicht aus, um die Beta-Sperre zu umgehen.

## UI

- Admin Control: KPI **BETA WARTEND**, Filter `pending`, Detailstatus und direkter Button **TIKTOK + TWITCH BETA FREIGEBEN**.
- Dashboard/Account: `BETA FREIGABE AUSSTEHEND` bzw. `BETA PAUSIERT`.
- Integrationsseiten: TikTok/Twitch Connect und Sync werden bis zur Freigabe ausgeblendet/deaktiviert.
- Launcher: Providerkarten zeigen `BETA FREIGABE AUSSTEHEND`; Connect-Button wird zu `BETA FREIGABE NÖTIG` und ist deaktiviert.

## Deployment-Konfiguration

```env
CFS_ADMIN_EMAILS=DEINE_LOGIN_EMAIL
CFS_PROVIDER_BETA_REQUIRED=true
CFS_PROVIDER_BETA_PROVIDERS=tiktok,twitch
```

Für die gewünschte Ein-Admin-Testphase sollte in `CFS_ADMIN_EMAILS` nur die eigene cfs_zockt Login-E-Mail stehen.

## Lokale Gates

- `npm run provider-beta151:check` → **20/20 PASS**
- `npm run release:v151` → **PASS**
- darunter weiterhin v150 Website Hardening **35/35 PASS**
- aktuelle Projekt-Regression **30/30 PASS**
- Release Readiness **20/20 PASS**
- Technical Foundation **19/19 PASS**

Reale Multi-Creator-/TikTok-/Twitch-/OBS-/Windows-/Reconnect-/Soak-Tests werden dadurch nicht ersetzt und bleiben für die spätere Acceptance offen.

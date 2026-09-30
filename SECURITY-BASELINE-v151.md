# SECURITY BASELINE v151 — Admin Identity & Closed Provider Beta

## Admin-Identität

Admin Control ist in v151 **E-Mail-only**. Eine Creator-ID, ein Legacy-TikTok-Owner oder ein alter Owner-Fallback reicht nicht mehr für Admin-Rechte. Maßgeblich ist ausschließlich die normalisierte Account-E-Mail in `CFS_ADMIN_EMAILS`; bei aktivierter E-Mail-Verifikation muss diese zusätzlich bestätigt sein.

Privilegierte Admin-Schreibaktionen nutzen weiterhin die bestehende frische Passwort-Re-Authentifizierung, sessiongebundene Elevation und Admin-Audit-Kette.

## Beta-Sicherheitsgrenze

Die TikTok-/Twitch-Beta ist eine Backend-Autorisierungsgrenze, keine reine Darstellungssperre. OAuth, Sync, Launcher-Handoff, Widget-Mutationen, OBS-Install und veröffentlichte Provider-Runtime prüfen den Beta-Zustand serverseitig.

Der Launcher bekommt nur den sanitisierten `beta_access`-Status. OAuth-Access-/Refresh-Tokens, Provider-Client-Secrets und Bridge-Secrets werden dadurch nicht an den Renderer ausgegeben.

## Zustände

- `pending`: nicht autorisiert für geschlossene Provider.
- `active`: autorisiert, sofern die E-Mail-Anforderung erfüllt ist.
- `paused`: Autorisierung entzogen, ohne das Konto zu löschen.
- `admin`: freigegeben über die konfigurierte Admin-E-Mail.

## Grenzen

v151 ersetzt keinen Penetrationstest und keine reale Multi-Creator-Isolationsabnahme. Vor öffentlicher Beta bleiben insbesondere echte Provider-OAuth-, OBS-/Windows-, Reconnect- und Soak-Tests erforderlich.

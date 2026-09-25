# Validation – cfs_zockt v18 Final UI Regression & Consolidation

Lokale statische/Test-Validierung. Kein Live-Browser-/Render-/Hardware-Nachweis.

## Retired asset references: PASS
```text
0 verbliebene Runtime-Referenzen
```

## Duplicate HTML IDs: PASS
```text
0 Duplikate in 39 HTML-Dateien
```

## Missing direct HTML assets: PASS
```text
0 fehlende direkte /assets/-Referenzen
```

## Bundle loader only: PASS
```text
cfs-shell-v3.js lädt für v5-v18 nur cfs-ui-v18.css/js
```

## Node syntax · UI bundle v18: PASS

## Node syntax · global shell: PASS

## Node syntax · onboarding: PASS

## Public shell: PASS
```text
RHEIT
PASS public/pages/impressum.html · class="site-header brand-header public-site-header"
PASS public/pages/impressum.html · class="nav brand-nav public-nav"
PASS public/pages/impressum.html · href="/pages/creator-suite.html"
PASS public/pages/impressum.html · href="/pages/plans.html"
PASS public/pages/impressum.html · href="/pages/roadmap.html"
PASS public/pages/impressum.html · href="/pages/security.html"
PASS public/pages/impressum.html · href="/pages/support.html"
PASS public/pages/impressum.html · data-login-link
PASS public/pages/impressum.html · data-auth-cta
PASS public/pages/impressum.html · class="footer brand-footer public-footer"
PASS public/pages/impressum.html · href="/pages/impressum.html"
PASS public/pages/impressum.html · href="/pages/datenschutz.html"
PASS public/pages/impressum.html · href="/pages/nutzungsbedingungen.html"
PASS public/pages/impressum.html · public nav has no dashboard link
PASS public/pages/impressum.html · public nav has no account link
PASS public/pages/datenschutz.html · class="site-header brand-header public-site-header"
PASS public/pages/datenschutz.html · class="nav brand-nav public-nav"
PASS public/pages/datenschutz.html · href="/pages/creator-suite.html"
PASS public/pages/datenschutz.html · href="/pages/plans.html"
PASS public/pages/datenschutz.html · href="/pages/roadmap.html"
PASS public/pages/datenschutz.html · href="/pages/security.html"
PASS public/pages/datenschutz.html · href="/pages/support.html"
PASS public/pages/datenschutz.html · data-login-link
PASS public/pages/datenschutz.html · data-auth-cta
PASS public/pages/datenschutz.html · class="footer brand-footer public-footer"
PASS public/pages/datenschutz.html · href="/pages/impressum.html"
PASS public/pages/datenschutz.html · href="/pages/datenschutz.html"
PASS public/pages/datenschutz.html · href="/pages/nutzungsbedingungen.html"
PASS public/pages/datenschutz.html · public nav has no dashboard link
PASS public/pages/datenschutz.html · public nav has no account link
PASS public/pages/nutzungsbedingungen.html · class="site-header brand-header public-site-header"
PASS public/pages/nutzungsbedingungen.html · class="nav brand-nav public-nav"
PASS public/pages/nutzungsbedingungen.html · href="/pages/creator-suite.html"
PASS public/pages/nutzungsbedingungen.html · href="/pages/plans.html"
PASS public/pages/nutzungsbedingungen.html · href="/pages/roadmap.html"
PASS public/pages/nutzungsbedingungen.html · href="/pages/security.html"
PASS public/pages/nutzungsbedingungen.html · href="/pages/support.html"
PASS public/pages/nutzungsbedingungen.html · data-login-link
PASS public/pages/nutzungsbedingungen.html · data-auth-cta
PASS public/pages/nutzungsbedingungen.html · class="footer brand-footer public-footer"
PASS public/pages/nutzungsbedingungen.html · href="/pages/impressum.html"
PASS public/pages/nutzungsbedingungen.html · href="/pages/datenschutz.html"
PASS public/pages/nutzungsbedingungen.html · href="/pages/nutzungsbedingungen.html"
PASS public/pages/nutzungsbedingungen.html · public nav has no dashboard link
PASS public/pages/nutzungsbedingungen.html · public nav has no account link
PASS public/pages/impressum.html · shared styles
PASS public/pages/impressum.html · shared app js
PASS public/pages/datenschutz.html · shared styles
PASS public/pages/datenschutz.html · shared app js
PASS public/pages/nutzungsbedingungen.html · shared styles
PASS public/pages/nutzungsbedingungen.html · shared app js

Public website shell Pass 21.3.2 passed.
```

## Homepage: PASS
```text
PASS  Hero communicates creator platform value
PASS  Runtime strip is present
PASS  Product proof is early in page
PASS  Widget Studio comes before Creator Suite tools
PASS  Launcher and Games have dedicated sections
PASS  Account trust comes before detailed trust section
PASS  Plans and roadmap follow trust
PASS  Community/support is late in journey
PASS  Homepage avoids primary merch section
PASS  No fake public metrics promise
PASS  FREE signup transparency remains
PASS  Security boundary stays visible
PASS  Pass 21.3.3 styles exist

13/13 homepage Pass 21.3.3 checks passed.
```

## Products: PASS
```text
PASS  Creator Suite has three guided entry paths
PASS  Creator Suite links dedicated plans page
PASS  Creator Suite links dedicated roadmap page
PASS  Plans is public and canonical
PASS  Plans keeps FREE payment transparency
PASS  Planned paid prices are explicitly labelled
PASS  Plans does not claim paid checkout is live
PASS  Roadmap is public and canonical
PASS  Roadmap uses four explicit status lanes
PASS  Roadmap keeps website-first sequence
PASS  Public navigation points to plans and roadmap pages
PASS  Sitemap contains plans and roadmap
PASS  Server canonicalizes extensionless plans and roadmap
PASS  Pass 21.3.4 styles exist

14/14 product page checks passed.
```

## Info: PASS
```text
PASS support exposes status shortcut
PASS support keeps private report form
PASS support warns against secrets
PASS support links recovery
PASS security grouped into four areas
PASS security keeps disclosure path
PASS security keeps fail-closed statement
PASS security has account self-service
PASS privacy uses legal layout
PASS terms uses legal layout
PASS imprint uses legal layout
PASS legal pages expose support route
PASS info hub css present
PASS legal responsive css present
Website Info Pass 21.3.5: 14/14
```

## Auth entry: PASS
```text
PASS auth pages use public shell
PASS auth pages stay noindex
PASS login and register forms preserved
PASS webauthn client preserved
PASS free start is explicit
PASS creator transition is explicit
PASS login links recovery and verification
PASS forgot flow IDs preserved
PASS reset flow IDs preserved
PASS verification flow IDs preserved
PASS registration anchor UX present
PASS password reset success UX present
PASS dashboard redirect preserved
PASS pass 21.3.6 styles present
Website Auth Entry Pass 21.3.6: 14/14
```

## Creator shell: PASS
```text
PASS dashboard.html creator header
PASS dashboard.html creator nav marker
PASS dashboard.html core creator routes
PASS dashboard.html extended creator routes
PASS dashboard.html logout control
PASS dashboard.html noindex
PASS account.html creator header
PASS account.html creator nav marker
PASS account.html core creator routes
PASS account.html extended creator routes
PASS account.html logout control
PASS account.html noindex
PASS setup.html creator header
PASS setup.html creator nav marker
PASS setup.html core creator routes
PASS setup.html extended creator routes
PASS setup.html logout control
PASS setup.html noindex
PASS launcher.html creator header
PASS launcher.html creator nav marker
PASS launcher.html core creator routes
PASS launcher.html extended creator routes
PASS launcher.html logout control
PASS launcher.html noindex
PASS launcher-connect.html creator header
PASS launcher-connect.html creator nav marker
PASS launcher-connect.html core creator routes
PASS launcher-connect.html extended creator routes
PASS launcher-connect.html logout control
PASS launcher-connect.html noindex
PASS games.html creator header
PASS games.html creator nav marker
PASS games.html core creator routes
PASS games.html extended creator routes
PASS games.html logout control
PASS games.html noindex
PASS widget-studio.html creator header
PASS widget-studio.html creator nav marker
PASS widget-studio.html core creator routes
PASS widget-studio.html extended creator routes
PASS widget-studio.html logout control
PASS widget-studio.html noindex
PASS scene-studio.html creator header
PASS scene-studio.html creator nav marker
PASS scene-studio.html core creator routes
PASS scene-studio.html extended creator routes
PASS scene-studio.html logout control
PASS scene-studio.html noindex
PASS cut-studio.html creator header
PASS cut-studio.html creator nav marker
PASS cut-studio.html core creator routes
PASS cut-studio.html extended creator routes
PASS cut-studio.html logout control
PASS cut-studio.html noindex
PASS nexus.html creator header
PASS nexus.html creator nav marker
PASS nexus.html core creator routes
PASS nexus.html extended creator routes
PASS nexus.html logout control
PASS nexus.html noindex
PASS audio-studio.html creator header
PASS audio-studio.html creator nav marker
PASS audio-studio.html core creator routes
PASS audio-studio.html extended creator routes
PASS audio-studio.html logout control
PASS audio-studio.html noindex
PASS editor.html creator header
PASS editor.html creator nav marker
PASS editor.html core creator routes
PASS editor.html extended creator routes
PASS editor.html logout control
PASS editor.html noindex
PASS integrations.html creator header
PASS integrations.html creator nav marker
PASS integrations.html core creator routes
PASS integrations.html extended creator routes
PASS integrations.html logout control
PASS integrations.html noindex
PASS tiktok.html creator header
PASS tiktok.html creator nav marker
PASS tiktok.html core creator routes
PASS tiktok.html extended creator routes
PASS tiktok.html logout control
PASS tiktok.html noindex
PASS settings.html creator header
PASS settings.html creator nav marker
PASS settings.html core creator routes
PASS settings.html extended creator routes
PASS settings.html logout control
PASS settings.html noindex
PASS dashboard admin gate and workspace map
PASS central creator navigation behavior
PASS creator workspace styles
Creator Shell Pass 21.3.7: 93/93 PASS
```

## Dashboard: PASS
```text
PASS dashboard greeting hook
PASS next-step card
PASS four-step creator journey
PASS tool summary hooks
PASS journey state is explicit
PASS next-step renderer
PASS manual widget independence copy
PASS API failures remain unknown
PASS product status labels
PASS tool counts use real module registry output
PASS dashboard pass styles
PASS dashboard hierarchy styles
PASS no inline dashboard script
PASS dashboard remains noindex
Dashboard Pass 21.3.8: 14/14 PASS
```

## Creator tools: PASS
```text
PASS  widget: Creator Navigation bleibt vorhanden
PASS  widget: noindex bleibt gesetzt
PASS  widget: einheitlicher Tool-Einstieg
PASS  scene: Creator Navigation bleibt vorhanden
PASS  scene: noindex bleibt gesetzt
PASS  scene: einheitlicher Tool-Einstieg
PASS  tiktok: Creator Navigation bleibt vorhanden
PASS  tiktok: noindex bleibt gesetzt
PASS  tiktok: einheitlicher Tool-Einstieg
PASS  launcher: Creator Navigation bleibt vorhanden
PASS  launcher: noindex bleibt gesetzt
PASS  launcher: einheitlicher Tool-Einstieg
PASS  games: Creator Navigation bleibt vorhanden
PASS  games: noindex bleibt gesetzt
PASS  games: einheitlicher Tool-Einstieg
PASS  cut: Creator Navigation bleibt vorhanden
PASS  cut: noindex bleibt gesetzt
PASS  cut: einheitlicher Tool-Einstieg
PASS  Widget: manueller Start ohne TikTok erklärt
PASS  Widget: bestehende App-ID erhalten
PASS  Widget: bestehender Create-Action Hook erhalten
PASS  Scene: Workflow Widgets → Scene → Output
PASS  Scene: bestehende Scene-IDs erhalten
PASS  TikTok: Profil und LIVE getrennt erklärt
PASS  TikTok: OAuth-Link erhalten
PASS  TikTok: bestehende Status-IDs erhalten
PASS  Launcher: Device-Link Einstieg vorhanden
PASS  Launcher: Release-/Geräte-IDs erhalten
PASS  Games: manuelle Steuerung vor LIVE-Regeln erklärt
PASS  Games: bestehende Runtime-IDs erhalten
PASS  Cut: Beta sichtbar
PASS  Cut: lokale Medienverarbeitung erklärt
PASS  Cut: bestehende Projekt-IDs erhalten
PASS  Shared CSS: Creator Tool Entry vorhanden
PASS  Shared CSS: responsive Layout vorhanden

Creator Tools Pass 21.3.9: 35/35 PASS
```

## Management: PASS
```text
PASS 01 account: management hub
PASS 02 account: all management links
PASS 03 account: private/noindex
PASS 04 settings: management hub
PASS 05 settings: all management links
PASS 06 settings: private/noindex
PASS 07 setup: management hub
PASS 08 setup: all management links
PASS 09 setup: private/noindex
PASS 10 integrations: management hub
PASS 11 integrations: all management links
PASS 12 integrations: private/noindex
PASS 13 account keeps profile form
PASS 14 account keeps session list
PASS 15 account keeps MFA controls
PASS 16 account keeps passkey controls
PASS 17 setup keeps setup form
PASS 18 setup keeps preview ids
PASS 19 integrations keeps TikTok status ids
PASS 20 integrations keeps NEXUS status id
PASS 21 integrations exposes launcher path
PASS 22 roadmap stays explicit
PASS 23 settings no obsolete 2FA-not-released claim
PASS 24 settings points MFA/Passkeys to account
PASS 25 management CSS present

Creator Management Pass 21.3.10: 25/25 PASS
```

## Internal modules: PASS
```text
PASS device link keeps review IDs
PASS device link keeps action/result IDs
PASS device link has three-step confirmation flow
PASS device link warns against foreign codes
PASS device link offers safe exits
PASS NEXUS is marked as preview
PASS NEXUS keeps status IDs
PASS NEXUS keeps integration/result IDs
PASS NEXUS explains status boundaries
PASS NEXUS documents real status source
PASS Audio Studio is marked as roadmap
PASS Audio Studio keeps functional IDs
PASS Audio Studio keeps preset fields
PASS Audio Studio keeps local-processing boundary
PASS Audio Studio keeps roadmap modules
PASS Creator Editor has unified entry
PASS Creator Editor links to modern studios
PASS Creator Editor keeps core functional IDs
PASS launcher-connect.html keeps Creator Suite shell
PASS launcher-connect.html stays noindex
PASS nexus.html keeps Creator Suite shell
PASS nexus.html stays noindex
PASS audio-studio.html keeps Creator Suite shell
PASS audio-studio.html stays noindex
PASS editor.html keeps Creator Suite shell
PASS editor.html stays noindex
PASS Pass 21.3.11 shared styles present
Internal Modules Pass 21.3.11: 27/27 PASS
```

## Accessibility / Responsive: PASS
```text
PASS  accessibility initializer exists
PASS  skip link is injected
PASS  main content receives stable target
PASS  notices receive status/alert semantics
PASS  aria-disabled links cannot be activated
PASS  live regions are configured
PASS  accessibility initializer is started
PASS  visible focus styling exists
PASS  skip link focus styling exists
PASS  reduced motion is respected
PASS  forced colors are respected
PASS  touch targets have baseline height
PASS  mobile nav has viewport-safe scrolling
PASS  small screen grids collapse
PASS  generic UI states exist
PASS  dashboard has explicit empty state
PASS  scene studio output fields are named
PASS  widget studio output fields are named
PASS  setup controls are named
PASS  audio controls are named
PASS  creator editor color/source controls are named
PASS  pass documentation exists

Website Accessibility/Responsive Pass 21.3.12: 22/22 PASS
```

## Visual polish: PASS
```text
PASS  pass marker exists
PASS  shared surface token exists
PASS  shared border token exists
PASS  shared radius tokens exist
PASS  shared shadow tokens exist
PASS  button hover state is polished
PASS  disabled button state exists
PASS  form hover state exists
PASS  public marketing rhythm exists
PASS  public cards receive shared hover treatment
PASS  creator workspace visual background exists
PASS  creator tool cards receive hover treatment
PASS  management hub visual refinement exists
PASS  mobile 760 refinement exists
PASS  mobile 520 refinement exists
PASS  no literal escaped newline sequences remain
PASS  pass documentation exists
PASS  key pages still use shared stylesheet
PASS  stylesheet brace balance is valid

Website Visual Polish Pass 21.3.13: 19/19 PASS
```

## Website acceptance: PASS
```text
PASS  all internal static links/assets/fragments resolve
PASS  HTML pages have no duplicate IDs
PASS  all primary public pages exist
PASS  homepage exposes /pages/creator-suite.html
PASS  homepage exposes /pages/creator-suite.html#widget-studio
PASS  homepage exposes /pages/creator-suite.html#games
PASS  homepage exposes /pages/creator-suite.html#launcher
PASS  homepage exposes /pages/plans.html
PASS  homepage exposes /pages/roadmap.html
PASS  homepage exposes /pages/security.html
PASS  homepage exposes /pages/support.html
PASS  homepage exposes /pages/login.html
PASS  homepage exposes /pages/login.html#regForm
PASS  homepage keeps clear primary free-start CTA
PASS  homepage keeps TikTok source-aware CTA journey
PASS  partner surface remains hidden by default
PASS  registration anchor exists
PASS  login links password recovery
PASS  login links email verification
PASS  auth recovery pages exist
PASS  all creator workspace pages exist
PASS  dashboard/shared creator shell reaches core tools
PASS  private support anchor exists
PASS  homepage links private support route
PASS  RFC 9116 security.txt exists
PASS  homepage links verifiable security.txt
PASS  public status route is linked
PASS  custom 404 and 500 pages exist
PASS  TikTok callback page exists
PASS  widget/game runtime pages exist
PASS  sitemap URLs resolve to public files
PASS  sitemap includes all primary indexable pages
PASS  no stale backend-neu reference in active website/deploy surface
PASS  Pass 21.3.14 documentation exists

Website Acceptance Pass 21.3.14: 34/34 PASS
```

## SEO: PASS
```text
SEO PASS CHECK: OK
- 9 indexierbare Canonical-Seiten
- 30 interne/Runtime-Seiten auf noindex
- OpenGraph/Twitter + Manifest + Sitemap + robots geprüft
- Organization/WebSite/Creator-Suite JSON-LD + CSP-Hash geprüft
```

## Monetization funnel: PASS
```text
MONETIZATION / TIKTOK FUNNEL PASS CHECK: OK
- TikTok Shortlinks + Source Attribution geprüft
- TikTok Landing-/Registrierungs-Kontext geprüft
- Partnerfläche opt-in, standardmäßig leer und unsichtbar
- Affiliate-Kennzeichnung + HTTPS/sponsored Linkschutz geprüft
- keine externen Tracking-/Ad-Skripte hinzugefügt
```

## Website security: PASS
```text
Website Security Pass OK · 39 HTML-Dateien geprüft.
```

## Trust/security: PASS
```text
PASS  Private public support endpoint exists
PASS  Public support writes require trusted same-origin source
PASS  Support report limiter is narrow
PASS  Support abuse protection uses HMAC hash
PASS  Support table stores submitter hash not raw IP
PASS  Submission idempotency uses unique hash
PASS  Public report has honeypot
PASS  Support input lengths are bounded
PASS  Optional email is validated
PASS  Admin support list is protected
PASS  Admin support mutation uses trusted write controls
PASS  Support admin statuses are explicit
PASS  Support page explains private handling
PASS  Support page warns against secrets
PASS  Support page does not invent response SLA
PASS  Support page has optional contact email
PASS  Support form script is external
PASS  Support JS blocks obvious secret pastes client-side
PASS  Support JS posts same-origin JSON
PASS  Homepage links private reporting path
PASS  Security page documents private reporting path
PASS  Admin UI has support/security workspace
PASS  Admin UI surfaces critical-open KPI
PASS  Admin JS loads support reports
PASS  Admin JS can move reports through workflow
PASS  Separate support hash salt documented
PASS  Production edge checker script is wired
PASS  Backend version stays 3.12.0

28/28 trust/security pass 2 checks passed.
```

## MFA security: PASS
```text
{"ok":true,"checks":"49/49"}
```

## Passkey security: PASS
```text
PASS  Node engine requires 22+
PASS  SimpleWebAuthn server dependency is pinned
PASS  passkey:check script exists
PASS  Runtime rejects Node <22
PASS  WebAuthn RP-ID env exists
PASS  Config doctor validates RP-ID
PASS  RP-ID forbids protocol/path
PASS  Production binds RP-ID to canonical host
PASS  Expected origins are explicitly configured
PASS  Passkey challenge TTL is five minutes
PASS  Per-account passkey cap exists
PASS  Passkey rate limiter exists
PASS  Credential table exists
PASS  Credential public key is stored
PASS  Credential counter is stored
PASS  Credential transports are stored
PASS  Challenge table exists
PASS  Challenge stores session binding
PASS  Challenge stores MFA binding
PASS  Challenge verification uses atomic DELETE RETURNING
PASS  Expired challenges cannot verify
PASS  Registration options endpoint exists
PASS  Registration requires account session
PASS  Registration requires current password
PASS  Registration requests user verification
PASS  Registration verifies user verification
PASS  Registration checks expected RP-ID
PASS  Registration checks expected origin
PASS  Attestation defaults to none
PASS  Algorithms are restricted
PASS  Existing credentials are excluded during registration
PASS  Registration challenge is bound to session
PASS  Passkey public key is persisted
PASS  First passkey can create recovery codes
PASS  Adding passkey revokes other sessions
PASS  Passkey deletion endpoint exists
PASS  Passkey deletion requires current password
PASS  Removing last passkey only removes recovery codes when TOTP absent
PASS  Passkey MFA options endpoint exists
PASS  Authentication requests user verification
PASS  Authentication challenge binds to MFA challenge hash
PASS  Passkey verify endpoint exists
PASS  Authentication verifies user verification
PASS  Authentication validates stored public key
PASS  Authentication validates stored counter
PASS  Authentication updates counter after success
PASS  Creator session is created only after WebAuthn verification
PASS  Login can require passkey MFA
PASS  Security log includes passkey login
PASS  Security log includes passkey added
PASS  Security log includes passkey removed
PASS  Previously introduced MFA security events are allowlisted
PASS  Mail/recovery security events are allowlisted
PASS  Account page exposes passkey management
PASS  Account page loads browser WebAuthn adapter
PASS  Login offers passkey confirmation
PASS  Login loads browser WebAuthn adapter
PASS  Account JS starts registration ceremony
PASS  Login JS starts authentication ceremony
PASS  Browser adapter uses navigator.credentials.create
PASS  Browser adapter uses navigator.credentials.get
PASS  Browser adapter converts base64url binary fields
PASS  Account export includes only passkey metadata query
PASS  Account export does not select passkey public_key
PASS  Export states private keys are excluded
PASS  Privacy page states private key remains on device
PASS  Security page describes active passkeys
PASS  README documents active Pass 8
PASS  Current state documents real E2E test as still open
PASS  Stable WebAuthn user ID is 32 bytes
PASS  Passkey label normalization trims/collapses whitespace
PASS  Empty label falls back safely
PASS  Passkey public reference does not expose credential ID
PASS  Challenge ID validates UUID
PASS  Challenge ID rejects arbitrary data

Passkey Security: 75/75
```

## Credential security: PASS
```text
PASS  password minimum is 15
PASS  password maximum remains 128
PASS  password KDF is versioned
PASS  scrypt v2 uses N=2^15
PASS  scrypt v2 uses r=8
PASS  scrypt v2 uses p=3
PASS  scrypt v2 has explicit maxmem
PASS  legacy KDF verification remains
PASS  creator accounts store KDF version
PASS  existing databases get KDF column
PASS  new registrations store KDF version
PASS  successful legacy login upgrades KDF
PASS  server password blocklist exists
PASS  account context is checked by password policy
PASS  password change has its own rate limiter
PASS  password change endpoint exists
PASS  password change requires auth
PASS  current password is reverified
PASS  same password is rejected
PASS  password change revokes existing sessions
PASS  password change creates a fresh session
PASS  password change security event exists
PASS  registration UI requires 15 chars
PASS  registration UI no longer requires number rule
PASS  registration UI no longer requires letter rule
PASS  registration client check uses 15 chars
PASS  account password change form exists
PASS  account new password requires 15 chars
PASS  account UI posts to password endpoint
PASS  account UI confirms matching new passwords
PASS  security activity labels password change
PASS  settings distinguish change from recovery transport
PASS  security page documents KDF migration
PASS  support does not fake password reset
PASS  support says it will not ask for password
PASS  scrypt v2 parameters execute successfully

Credential Security: 36/36
```

## Login anomaly security: PASS
```text
PASS  anomaly:check script exists
PASS  Persistent account throttle table exists
PASS  Persistent throttle is account keyed
PASS  Throttle stores no IP field
PASS  Throttle stores no user agent field
PASS  Account failure observation window is configured
PASS  Account failure threshold is configured
PASS  Temporary account block is configured
PASS  Known blocked account follows dummy scrypt path
PASS  Blocked response remains generic
PASS  Wrong password increments persistent account counter
PASS  Successful password clears account failure counter
PASS  Throttle warning security event exists
PASS  Throttle warning can be mailed
PASS  Security alert cooldown table exists
PASS  Security alert cooldown is six hours
PASS  Cooldown upsert only returns when eligible
PASS  Successful-login warning helper exists
PASS  Password login labels session method
PASS  TOTP/recovery login labels session method
PASS  Passkey login labels session method
PASS  Session table stores auth method
PASS  Session API returns auth method
PASS  Account UI displays session auth method
PASS  Account UI contains anomaly status panel
PASS  Account UI explicitly avoids fingerprinting
PASS  Post-password MFA failure event exists
PASS  Invalid TOTP/recovery records suspicious failure
PASS  Invalid passkey records suspicious failure
PASS  Suspicious MFA warning mail exists
PASS  Security summary counts suspicious MFA failures
PASS  Account UI labels suspicious MFA event
PASS  Account UI labels throttle event
PASS  Login page explains persistent account throttle
PASS  Security page documents privacy-friendly anomaly protection
PASS  README documents Pass 9
PASS  Current state documents Pass 9

Login / Anomaly Security: 37/37
```

## Email/recovery security: PASS
```text
{
  "ok": true,
  "passed": 50,
  "total": 50,
  "checks": [
    "mail disabled by default",
    "disabled config validates",
    "webhook requires HTTPS",
    "webhook requires strong separate secret",
    "required verification fails closed without mail",
    "valid webhook enables verification",
    "action tokens are strong base64url",
    "token hashes are purpose bound",
    "token hash hides raw token",
    "mail signature binds timestamp",
    "mail relay uses configured HTTPS URL",
    "mail relay signs request",
    "mail relay does not put secret in body",
    "account table has email verification timestamp",
    "account action table exists",
    "account action tokens store hash not raw token column",
    "action token issuance serializes on creator row",
    "action token consumption locks token row",
    "verification token TTL is eight hours",
    "password reset TTL is thirty minutes",
    "mail status endpoint exists",
    "verification request endpoint exists",
    "verification consume endpoint exists",
    "forgot password endpoint exists",
    "reset password endpoint exists",
    "public recovery endpoints exempt only from session CSRF",
    "verification request uses generic anti-enumeration response",
    "forgot password uses generic anti-enumeration response",
    "generic mail responses have a minimum timing floor",
    "reset revokes all sessions",
    "verification activates pending account",
    "reset never auto creates session",
    "pending status checked after password verification",
    "new registration can be pending email",
    "existing sessions expose email verification state",
    "account export includes verification timestamp",
    "verification links use URL fragments",
    "reset page scrubs fragment",
    "verify page scrubs fragment",
    "forgot page is noindex",
    "reset page is noindex",
    "verify page is noindex",
    "login links recovery and verification",
    "account shows verification status",
    "security page documents hashed single use recovery",
    "privacy page documents token retention",
    "env defaults mail transport off",
    "env documents verification enforcement",
    "config doctor treats mail webhook secret as secret",
    "config doctor requires relay if verification mandatory"
  ]
}
```

## Privacy lifecycle: PASS
```text
PASS session list route
PASS session revoke route
PASS session refs hide token hash
PASS data export route
PASS export requires password
PASS export rate limited
PASS export redaction
PASS raw asset content excluded
PASS oauth tokens not selected in export
PASS security event export
PASS session revoke event
PASS tiktok disconnect event
PASS account page session UI
PASS account page export UI
PASS account page tiktok lifecycle UI
PASS frontend downloads JSON
PASS frontend revokes individual session
PASS privacy describes self service
PASS privacy excludes secrets
PASS settings no longer claims password change
PASS settings exposes privacy tools
PASS delete tries provider revoke
PASS lifecycle script wired
PASS account still noindex

24/24 lifecycle checks passed.
```

## Browser request integrity: PASS
```text
PASS  requestintegrity script wired
PASS  cross-site and same-site writes rejected
PASS  trusted explicit origin required when supplied
PASS  headerless browser writes fail closed
PASS  Origin varies response
PASS  Sec-Fetch-Site varies response
PASS  sensitive response prefixes exist
PASS  no-store prefix /api/account/
PASS  no-store prefix /api/creator/
PASS  no-store prefix /api/admin/
PASS  no-store prefix /api/billing/
PASS  no-store prefix /api/launcher/
PASS  no-store prefix /api/bridge/
PASS  no-store prefix /auth/
PASS  sensitive responses are no-store/private
PASS  legacy proxy caches disabled
PASS  cookie cache variance set
PASS  authorization cache variance set
PASS  CSRF remains session-bound
PASS  public trusted writes use source validation

Browser Request Integrity: 20/20
```

## Plan policy: PASS
```text
{"ok":true,"free_widgets":2,"creator_widgets":6,"pro_widgets":12,"beta_plan":"free","beta_source":"plan_plus_beta"}
```

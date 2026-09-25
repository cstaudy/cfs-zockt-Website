# Validation – cfs_zockt v17 Account Recovery & Security UX

## Node syntax · Security UX v17: PASS

## Node syntax · global shell: PASS

## Account MFA security: PASS
```text
{"ok":true,"checks":"49/49"}
```

## Account passkey security: PASS
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

## Account credential security: PASS
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

## Account email/recovery security: PASS
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

## Website account start: PASS
```text
PASS  Homepage marks creator preview as example view
PASS  Homepage removes stale large-tests-open wording
PASS  Homepage reflects current internal release status
PASS  Homepage has free-account trust section
PASS  Homepage states new accounts start free
PASS  Homepage states signup asks for no payment data
PASS  Homepage states registration does not auto-book
PASS  Homepage explains strong optional factors
PASS  Homepage explains account data controls
PASS  Final CTA repeats no-payment-data promise
PASS  Login registration repeats free-plan fact
PASS  Login registration explicitly says no payment data
PASS  Login registration exposes data-control fact
PASS  Registration form itself contains no billing/payment field
PASS  Registration backend does not invoke checkout/billing
PASS  Database account default plan is free
PASS  Account lifecycle provides export endpoint
PASS  Account lifecycle provides deletion endpoint
PASS  Server includes TOTP and passkey account protection
PASS  New trust section has responsive styling
PASS  Project state mentions Pass 14 website conviction
PASS  Package exposes Pass 14 check
PASS  Backend version remains 3.12.0
PASS  Homepage still avoids absolute security/scale claims

24/24 conviction/account-start Pass 14 checks passed.
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

## Website security: PASS
```text
Website Security Pass OK · 39 HTML-Dateien geprüft.
```

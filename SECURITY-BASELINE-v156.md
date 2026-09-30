# SECURITY BASELINE v156

**Status:** UNVERÄNDERT GEHÄRTET / WEBSITE-CLEANUP OHNE NEUE SECRET-PFADE

Der v156-Website-Cleanup verändert keine Auth-, Provider-, Credential-, Billing- oder Stream-Secret-Grenzen. Die Security-Baseline aus v155 bleibt vollständig erhalten.

Zusätzlich gilt für die Startseite:

- keine eingebetteten Provider-Secrets
- keine neuen Tracking-/Analytics-Skripte
- keine neuen Drittanbieter-Bildquellen als statische Demo-Abhängigkeit
- LIVE-Cover nur aus bereits vorhandenen, real gelieferten HTTPS-Coverdaten
- bei fehlendem Cover neutraler lokaler CFS-Platzhalter

`project:check`, `website150:check` und `release:v156` bleiben PASS.

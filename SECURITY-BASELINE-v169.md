# Security Baseline v169

- Upload läuft über die bestehende Creator-Asset-API; keine neue öffentliche Uploadroute.
- Nur Bilddateien werden vom Umwandler akzeptiert.
- Das Asset bleibt ein Visual; Provider-Datenlogik wird nicht aus dem Bild abgeleitet.
- Neue Widget-Erstellung bleibt creator-authentifiziert und entitlements-/provider-/scope-geprüft.
- `requested_platform` wird serverseitig mit dem festen Widget-Provider verglichen.
- Cross-Provider-Erstellung endet mit `widget_platform_mismatch`.
- Keine Token-, Stream-Key- oder Secret-Ausgabe an den Browser ergänzt.

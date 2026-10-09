# cfs_zockt Admin PC – Stand 3.20.71

## Geprüfte Bestandteile

- Eigenständige lokale Windows-Forms-Bedienoberfläche, ohne Electron-Build.
- Desktop- und Startmenü-Verknüpfung per Benutzerinstallation (LOCALAPPDATA).
- Original-Logo-PNG und bestehendes Admin-ICO unverändert aus Website 3.20.71.
- Feste, freigegebene Website-URLs und Loopback-URLs, keine beliebige URL-Eingabe.
- Lokale CFS-AI-Erreichbarkeit und Ollama-Erreichbarkeit, mit kurzem Timeout.
- Manueller Service-Start erst nach lokaler Ordnerprüfung und Benutzeraktion.
- Keine Zugangsdaten, Tokens oder Cloud-Geheimnisse in der App.

## Wichtige Grenzen

Diese PC-App ist **kein Ersatz für den Website-Server**. Sie bietet ein eigenständiges
Windows-Fenster mit zentralen Funktionen, öffnet aber Adminseiten in deinem
Standardbrowser; die Website prüft die Berechtigung. Das verhindert, dass eine
ungetestete eingebettete Webview lokale Startrechte erhält.

Für eine komplett *eingebettete* Website-Ansicht wäre eine getrennte, sicher
abzunehmende Electron-/WebView2-Version möglich. Der alte NSIS-Build schlägt
bei dir an Windows-Symlink-Rechten von `winCodeSign` fehl; dieses Paket führt
keinen Electron-Build aus.

Windows selbst und eine tatsächliche Browser-Login-Sitzung konnten in dieser
Umgebung nicht ausgeführt werden. Live-Website, Stripe und Bridge wurden nicht
verändert oder freigegeben. Beta bleibt HOLD.

## Monitor-Erweiterung (3.20.72)

- Lokal auf 127.0.0.1 begrenzte GET-API-Aufrufe fuer Status, autonome Laeufe,
  offene Agent-Vorschlaege und Design-Factory-Entwuerfe.
- Status 401/403 wird als geschuetzte API dargestellt, keine Umgehung.
- Website-Bridge kann der PC-Monitor ohne authentifizierten Server-Heartbeat
  nicht bestaetigen und zeigt daher keinen falschen Verbunden-Status.
- Einmal-Kauf und Pro-Pricing sind ausschliesslich als Vorschlag dokumentiert.
- PowerShell 5.1/WinForms Ausfuehrung auf echtem Windows noch ungetestet.

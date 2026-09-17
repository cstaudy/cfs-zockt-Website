# Pass 21.3.9 – Creator-Tools als einheitliche Einstiegsseiten

## Ziel
Die wichtigsten Creator-Werkzeuge erhalten einen gemeinsamen Einstieg, ohne bestehende Funktionen, IDs, APIs oder produktbezogene Oberflächen umzubauen.

## Umgesetzt
- Widget Studio: klarer Weg von Widget-Auswahl über Gestaltung bis Veröffentlichung; Hinweis, dass manuelle Widgets ohne TikTok funktionieren.
- Scene Studio: Workflow Widgets → Scene → Output-URL sichtbar gemacht.
- TikTok: Profil-Sync und LIVE-Daten verständlich getrennt.
- Launcher: Device-Link, Bridge-Status und lokale Tool-Nutzung als drei Schritte dargestellt.
- Games: manuelle Steuerung als Basis, LIVE-Regeln als optionale Erweiterung erklärt.
- Cut Studio: Beta-Kennzeichnung sowie lokale Verarbeitung von Video-/Audiodateien im Launcher hervorgehoben.
- Gemeinsame responsive Einstiegskomponente in `public/assets/css/styles.css`.

## Sicherheits-/Funktionsgrenzen
- Keine vorhandenen Auth-, CSRF-, CSP-, Rate-Limit- oder Session-Mechanismen verändert.
- Keine bestehenden API-Routen geändert.
- Keine vorhandenen funktionalen IDs entfernt oder umbenannt.
- Keine Medien-Uploads in die Cloud behauptet; Cut Studio beschreibt weiterhin lokale Verarbeitung.

## Nächster Schritt
Pass 21.3.10: Account, Einstellungen, Setup und Integrationen als zusammenhängenden Verwaltungsbereich fertigstellen.

# cfs_zockt · Panel-Umwandler v170

## Ziel
Der Panel-Umwandler erzeugt aus Logo/Bild + Account-Inhalt eine fertige PNG-Grafik. Er ist bewusst vom LIVE-Widget-Umwandler getrennt.

## Plattformen
- Twitch: echte Kanal-Info-Panel-Grafiken im kompakten 320×120-Format.
- TikTok: vertikale Profil-/Social-Karten im 720×1280-Format. TikTok besitzt keine Twitch-äquivalente Info-Panel-Fläche; deshalb wird kein automatischer Profil-Upload behauptet.

## Panel-Typen
Gemeinsam: Über mich, Socials, Games, Discord, Setup, Support, Kontakt.
Twitch zusätzlich: Regeln, Streamplan.
TikTok zusätzlich: LIVE Info.

## Ablauf
1. Twitch oder TikTok wählen.
2. Panel-Typ wählen.
3. Optional Logo/Bild aus der Medienbibliothek hochladen.
4. Titel, Text/Handle und Stil anpassen.
5. PNG herunterladen oder als neues Bild in der CFS-Medienbibliothek speichern.

## Sicherheit
- Kein Provider-Token wird an den Panel-Generator übergeben.
- Kein automatisches Veröffentlichen auf Twitch/TikTok.
- Uploads laufen durch die bestehende Widget-Studio-Medienprüfung.
- Generierte Dateien werden bei "In Medien speichern" erneut über dieselbe Upload-/Validierungskette gespeichert.

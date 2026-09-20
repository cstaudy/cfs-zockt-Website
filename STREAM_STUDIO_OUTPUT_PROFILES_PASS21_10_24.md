# CFS Stream Studio – Saved Streaming / Output Profiles Pass 21.10.24

## Ziel

Pass 21.10.24 ergänzt benannte lokale Streaming-/Output-Profile im Launcher. Ein Profil reproduziert die technische Ausgabe einer Produktion, ohne die Website-Konfiguration umzuschreiben und ohne Streaming-Zugangsdaten zu kopieren.

## Profilinhalt

Ein Profil speichert die wirksamen Produktionsparameter für Output und Ton:

- Output-Profil (`1080p60`, `1080p30`, `720p60`, `vertical1080p60`)
- Encoder (`auto`, `software`, `nvenc`, `amd`, `qsv`)
- Video- und Audio-Bitrate
- Recording-Format und Mix/Mic/Game/Discord/Music/Alerts-Trackauswahl
- aktivierte Multistream-Ziele sowie Zielprofil und Ziel-Bitrates
- lokales Recording an/aus
- Mic-Device sowie Game/Discord/Music/Alerts-Prozessbindungen
- lokale Lautstärke, Mute und Sync-Delay je Audioquelle
- Stream-Studio-Audio-Mixlevel als lokaler Runtime-Snapshot

Capture-Typ, Game-PID, Fensterbindung, Monitor, Kamera und Scene sind bewusst nicht Teil des Profils. Diese Quellen ändern sich häufiger und sollen nicht durch ein altes Output-Profil ungewollt überschrieben werden.

## Secret-Grenze

Streaming-Profile enthalten keine Streamkeys, RTMP-/RTMPS-Server-URLs, Tokens oder Credential-Daten. Die existierende `StreamCredentialStore`-Ablage mit Windows SafeStorage bleibt vollständig getrennt. Die Profildatei wird lokal atomar geschrieben und enthält nur nicht-geheime Konfigurationswerte.

## Lokaler Override statt Cloud-Mutation

Beim Laden eines Profils bleibt die CFS-Cloud-Konfiguration unverändert. Der Launcher bildet aus der frisch synchronisierten Studio-Konfiguration plus aktivem Profil eine `effective_config`. Preflight, Zielkarten und Streamstart verwenden diese effektive Konfiguration.

Das verhindert, dass ein lokales Gaming-/Recording-Setup die Website-Konfiguration eines anderen PCs verändert.

## Ziel-Kompatibilität

Gespeicherte Ziele werden nur auf aktuell vorhandene Studio-Ziele mit derselben Ziel-ID und demselben Provider angewendet. Neue, nicht im Profil enthaltene Ziele bleiben sicher deaktiviert. Hat sich der Provider einer Ziel-ID geändert oder existiert ein gespeichertes Ziel nicht mehr, erzeugt der Launcher eine Kompatibilitätswarnung.

Das aktuelle Plan-Limit wird bei jedem Laden erneut angewendet. Ein älteres Profil mit mehr aktiven Zielen kann daher nicht ein inzwischen niedrigeres Plan-Limit umgehen.

## Application Audio

Für Game, Discord, Music und Alerts werden Prozessname und letzte bekannte PID gespeichert. Beim Laden versucht der Launcher, die aktuelle PID über den Prozessnamen neu aufzulösen. Dadurch bleibt ein Profil nach normalen App-Neustarts verwendbar.

## Launcher UX

Der Stream-Engine-Bereich enthält nun eine Profilsektion mit maximal zwölf Slots:

- `AKTUELL SPEICHERN`
- `PROFIL LADEN`
- `PROFIL AKTUALISIEREN`
- `LÖSCHEN`
- `STUDIO STANDARD`

Während einer laufenden Streaming-Engine sind Profilwechsel und Profiländerungen gesperrt. Damit werden Zielauswahl, Bitraten oder Recording nicht unkontrolliert mitten in einer Session geändert.

## Noch real offen

- Windows-Abnahme verschiedener Hardware-Encoder über Profilwechsel
- reale YouTube/Twitch/TikTok-Profilwechsel
- Verhalten bei echtem Planwechsel mit vorhandenen lokalen Profilen
- optionaler späterer Export/Import von Profilen – weiterhin ohne Secrets

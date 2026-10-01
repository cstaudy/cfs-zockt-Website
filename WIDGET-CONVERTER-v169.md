# Widget-Umwandler v169

## Ziel

Der Widget-Umwandler verbindet ein eigenes Bild/Logo mit einem bestehenden, plattformspezifischen Widget-Typ. Das Bild wird **nicht** selbst zur Datenquelle.

## Ablauf

1. TikTok oder Twitch wählen.
2. Nur Widget-Typen der gewählten Plattform werden angeboten.
3. PNG, JPG oder WebP hochladen.
4. CFS erstellt ein normales Draft-Widget und integriert das Bild als editierbares Branding-Element.
5. Das Ergebnis wird im normalen Widget Studio weiterbearbeitet und erst durch den bestehenden Publish-Flow veröffentlicht.

## Plattformtrennung

- TikTok-Widgets: ausschließlich `provider=tiktok`, `studio_areas=["tiktok"]`.
- Twitch-Widgets: ausschließlich `provider=twitch`, `studio_areas=["twitch"]`.
- YouTube-Widgets: ausschließlich `provider=youtube`, `studio_areas=["youtube"]`.
- Allgemein: ausschließlich `provider=obs`, `studio_areas=["obs"]`; keine Provider-Daten.
- Der Server verwirft `requested_platform`, wenn sie nicht zum Provider des Widget-Typs passt (`widget_platform_mismatch`).

## Twitch Follower Goal

Es wird **kein** Twitch-Gesamt-Follower-Ziel angeboten, solange der aktuelle Twitch-Vertrag keine autoritative Gesamt-Followerzahl als Widget-Metrik liefert. Vorhanden bleiben Follow Alert, Latest Follower, LIVE Timer, Chat, Subs und Cheers.

## Legacy

Bestehende gespeicherte Widgets werden nicht still verändert. v169 ändert die Bibliotheks-/Erstellungszuordnung und die Servervalidierung für neue Widgets.

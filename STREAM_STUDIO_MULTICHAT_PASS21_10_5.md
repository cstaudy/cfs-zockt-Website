# CFS Stream Studio – Multi-Chat & Activity · Pass 21.10.5

## Umgesetzt
- Dockbares Panel **Multi-Chat & Activity** im CFS Stream Studio.
- Feed für die bereits vorhandenen, creator-isolierten LIVE-Events der aktuellen Session.
- Filter für Chat, Follows, Gifts, Shares und Likes.
- Plattformfilter für TikTok, Twitch, YouTube, Kick, Facebook sowie LIVE Bridge / Simulator.
- 4-Sekunden-Aktualisierung nur bei sichtbarem Browser-Tab; Feed kann pausiert und manuell aktualisiert werden.
- Provider-Herkunft kann vom Launcher als `payload.source_provider` mitgeschickt werden und wird serverseitig auf eine feste Allowlist begrenzt.
- Rendering von Nutzernamen und Chattext erfolgt über DOM `textContent`, nicht über ungeprüftes HTML.
- Keine zusätzliche Chat-Tabelle oder zusätzliche Chat-Historie für das Stream Studio.

## Bewusst noch offen
Die Oberfläche ist jetzt bereit für echtes Multi-Chat. Aktuell existieren aber noch nicht für alle Plattformen offizielle CFS-Chat-Adapter. Antworten, Bans, Timeouts oder Löschen werden deshalb **nicht simuliert** und bleiben deaktiviert, bis ein Provider dies über einen abgesicherten offiziellen Adapter unterstützt.

## Datenschutz / Sicherheit
Der Feed nutzt den bestehenden authentisierten Creator-Endpunkt und nur die aktuelle LIVE-Session. Die bestehende Event-Aufbewahrung wird durch diesen Pass nicht verlängert. Keine Streamkeys oder RTMP-Zugangsdaten werden in den Feed übernommen.

# Originaldesigns – Privatsphäre und Beta

Der Website-Katalog `/pages/design-vorschau.html` enthält 31 Welten und 496 **verkleinerte WebP-Vorschauen**. Das vollständige Originalarchiv darf nicht in `public/` abgelegt werden.

Die alten API-Endpunkte für original PNGs und ZIPs erfordern seit R13 eine authentifizierte Creator-Session. Darüber hinaus bleiben sie ohne `CFS_ORIGINAL_DESIGN_BETA_DOWNLOADS=true` grundsätzlich **gesperrt**. Diese Option nur für eine beaufsichtigte geschlossene Beta setzen. Für kostenpflichtige Angebote müssen vorher echte Entitlements / Kaufberechtigungen geprüft werden: ein einfaches Beta-Flag reicht für Zahlungen nicht aus.

Das Originalarchiv `Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip` kann für lokale Tests unter `resources/original-designs/` gespeichert werden. Auf Render sollte das Archiv wegen der Dateigröße nicht via GitHub veröffentlicht werden; stattdessen privat gemounteten Speicher nutzen und `CFS_ORIGINAL_DESIGNS_ARCHIVE_PATH` auf dessen absolute ZIP-Datei setzen. Der Betrieb setzt ein vorhandenes `unzip`-CLI voraus. Ohne Archiv sind die Original-ZIP-Endpunkte nicht verfügbar. Vorschauen auf der eigenen statischen Galerieseite funktionieren dennoch.

**Wichtig:** Nicht den Render-Releasestatus als grün ausgeben, bevor Shop, Rechte, OBS/CFS Studio und die 56 Beta-Tests real bestanden sind.

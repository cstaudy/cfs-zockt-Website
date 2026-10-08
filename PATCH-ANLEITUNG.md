# CFS Zockt – NUR fehlende und veraltete Website-Dateien (3.20.71)

Dieses kleine Ergänzungspaket wurde speziell gegen dein hochgeladenes
`cfs-zockt-Website-main (1).zip` erstellt. Es ist KEINE vollständige Website.

## Das Paket
- 51 fehlende Dateien werden ergänzt.
- 9 abweichende Dateien werden auf die geprüfte 3.20.71-Codebasis gebracht
  (einschließlich zwei an die aktuelle Version angepassten Alt-Tests).
- Deine `install-update.cjs` und `update-manifest.json` bleiben unverändert,
  da sie bei dir neuer sind als im älteren bereinigten Basisarchiv.
- Die bereits vorhandenen übrigen Website-Dateien bleiben unangetastet.
- Der große Originaldesign-ZIP (31 Welten, 496 Farben) liegt NICHT erneut bei.

## Ganz einfach unter Windows
1. Dein `cfs-zockt-Website-main (1).zip` entpacken.
2. Dieses Update-ZIP IN EINEN EXTRA-ORDNER entpacken, nicht direkt in die Website.
3. Im Update-Ordner `PATCH-INSTALLIEREN-WINDOWS.cmd` doppelklicken.
4. Pfad zu deinem **entpackten** `cfs-zockt-Website-main` eingeben.
5. Das Skript prüft die Original-Hashes, sichert ersetzte Dateien und
   ergänzt ausschließlich Dateien aus `ZUM-EINFUEGEN`.
6. Für die Originaldesigns deine bereits vorhandene Datei
   `Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip`
   unverändert kopieren nach:
   `cfs-zockt-Website-main/resources/original-designs/`
   Alternativ kann das Python-Skript mit `--designarchiv <Pfad>` kopieren.
7. Danach im Website-Ordner `npm run check:v32071` ausführen.

Auch ohne Installer ist manuelles Zusammenführen möglich:
Nur den INHALT von `ZUM-EINFUEGEN` in den Website-Hauptordner kopieren.
Auf Nachfrage 9 vorhandene Dateien ersetzen. VORHER bitte sichern.

## Wichtig
- Dieses Update ist nur für DEIN hochgeladenes Website-Archiv mit Version 3.20.71.
- Nicht auf eine andere Website-Version oder direkt auf die Live-Website kopieren.
- Im Upload liegen einige lokale CFS-AI-Dateien (`main.py`, `design_factory.py`,
  `autonomous_studio.py` usw.) lose im Website-Hauptordner. Diese gehören
  NICHT zum Web-Deployment. Dieses Paket löscht sie absichtlich nicht;
  bitte vor einem Release separat auslagern/entfernen.
- `paid_preview` ist weiterhin kein fertiger Kauf-Checkout.
- Die reale Beta-Abnahme steht weiter auf HOLD; keine Veröffentlichung.

## Befehle ohne CMD-Datei
`py -3 PATCH_INSTALLIEREN.py --check "C:\Pfad\cfs-zockt-Website-main"`
`py -3 PATCH_INSTALLIEREN.py --apply "C:\Pfad\cfs-zockt-Website-main"`
`py -3 PATCH_INSTALLIEREN.py --apply "C:\Pfad\cfs-zockt-Website-main" --designarchiv "C:\Pfad\Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip"`

### Freigabe
Die lokalen Codetests werden beim Patch-Bau separat geprüft.
Echte Beta-Tests sowie der Produktions-Checkout stehen noch aus.

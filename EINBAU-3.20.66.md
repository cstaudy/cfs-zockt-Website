# Einbau 3.20.66

## Voraussetzung
Unveränderte Version 3.20.65 (oder bereits installiertes 3.20.66). Bei eigenen Anpassungen an geänderten Dateien vorab manuell mergen.

## Update installieren
Delta-ZIP auspacken und aus dem Delta-Ordner ausführen:

```bash
node install-update.cjs --check /pfad/zu/cfs-zockt-Website-main
node install-update.cjs --apply /pfad/zu/cfs-zockt-Website-main
```

Der Installer verifiziert SHA-256, verhindert Überschreiben eigener Änderungen und legt Sicherungen an.

## Nachkontrolle

```bash
cd /pfad/zu/cfs-zockt-Website-main
npm run check:v32066
```

Im Browser `/pages/shop.html#originalDesigns` und `/pages/original-design.html?design=blitze&color=blau&group=alerts` prüfen.

Keine Datenbankmigration und keine neue npm-Abhängigkeit.

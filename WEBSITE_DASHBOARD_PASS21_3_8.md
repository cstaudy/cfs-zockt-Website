# Website Dashboard – Pass 21.3.8

**Stand:** 16.09.2026  
**Basis:** Pass 21.3.7  
**Backend:** 3.12.0  
**Launcher:** 0.42.0

## Ziel

Das Dashboard soll nach dem Login nicht nur Links zeigen, sondern den vorhandenen Zustand der Creator Suite verständlich in einen nächsten Schritt übersetzen.

## Neu im Dashboard

- persönliche Begrüßung aus dem vorhandenen Account-Namen
- datenbasierte Karte **„Als Nächstes“**
- Startpfad mit vier Schritten: Grundsetup, erstes Widget, TikTok, Launcher
- manuelle Widgets werden ausdrücklich nicht von TikTok abhängig gemacht
- Tool-Übersicht zeigt freigeschaltete Module, effektiven Plan und verfügbare Module
- Tool-Karten unterscheiden Aufgabe, Produktstatus und Mindestplan
- Beta, Preview und Roadmap bleiben sichtbar als reale Produktzustände

## Entscheidungslogik „Als Nächstes“

1. Grundsetup speichern, wenn noch keines vorhanden ist
2. erstes Widget anlegen, wenn noch keines existiert
3. TikTok optional verbinden
4. Launcher optional verbinden
5. wenn alles vorhanden ist: zurück ins Widget Studio / weiterarbeiten

Ein API-Fehler wird nicht als sicherer „nicht verbunden“-Zustand ausgegeben, sondern als nicht verfügbar markiert.

## Bestehende Funktionalität

Der Pass ändert keine Auth-, Plan-, Billing- oder Sicherheitsregeln. Er verwendet ausschließlich bestehende Account-, Modul-, TikTok-, Launcher-, Widget- und Setup-Endpunkte.

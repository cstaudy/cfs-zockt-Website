# Pass 21.7 – Scene Transitions

## Ziel
Scene Studio und Stream Board erhalten echte, speicherbare Szenenübergänge, die auch im veröffentlichten Scene-Output verwendet werden.

## Verfügbar
- Schnitt
- Fade
- Dissolve
- Slide von rechts
- Slide von links
- Slide von unten
- Zoom
- Dauer: 120–2500 ms
- Easing: Smooth, Standard, Ease In/Out, Linear

## Verhalten
- Bestehende Scenes bleiben rückwärtskompatibel und verwenden standardmäßig `cut`.
- Übergänge werden im serverseitig sanitisierten Scene-Config-Objekt gespeichert.
- Scene Studio bietet Übergang, Dauer, Easing und eine lokale Vorschau.
- Stream Board kann denselben Übergang konfigurieren und bewahrt ihn beim Laden/Speichern einer Scene.
- Der öffentliche Scene-Renderer baut beim Versionswechsel zwei Layer auf und animiert den alten Layer heraus sowie den neuen Layer hinein.
- Widget-Sichtbarkeitssteuerung bleibt über einen Übergang hinweg erhalten.
- Publish bleibt weiterhin ein bewusster separater Schritt.

## Prüfungen
Lokal:

```powershell
npm.cmd run scene21:check
```

Nach dem Deploy:

```powershell
npm.cmd run production21:scene-smoke
```

Der Production-Smoke-Test verändert keine Scene und veröffentlicht nichts.

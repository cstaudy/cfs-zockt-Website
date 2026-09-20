# Pass 21.10.13 – Native Launcher Compositor / Scene Graph Foundation

## Ziel

Pass 21.10.13 bringt lokale Launcher-Quellen in dasselbe CFS-Scene-Datenmodell wie Widgets. Die Website bleibt Control Plane; Bildschirm-, Fenster-, Game- und Kamera-Daten verlassen für die Verarbeitung nicht den Launcher.

## Umgesetzt

- Native Scene Sources im Stream Studio: **Screen, Window, Game, Camera**.
- Gemeinsame `source_id` / `source_kind`-Struktur für Widget- und Native-Layer.
- Native Layer werden in beiden Scene-Layouts (`16:9` und `9:16`) mit derselben Item-ID angelegt.
- Pro Layout bleiben Position, Scale, Rotation, Opacity und Z-Index getrennt speicherbar.
- Native Quellen übernehmen LIVE / RECORDING / 16:9 / 9:16 Routing aus Pass 21.10.12.
- Crop links/oben/rechts/unten für native Quellen.
- Bestehende Brightness / Contrast / Saturation / Blur-Filter werden in den nativen FFmpeg-Graph kompiliert.
- Visibility und Z-Index werden vom Launcher-Graph technisch ausgewertet.
- Native-only Scenes werden als echter FFmpeg-Filtergraph aus mehreren Video-Eingängen komponiert.
- Screen/Window basieren auf Windows `gdigrab`, Camera auf `dshow`.
- Die veröffentlichte `program_scene` wird vom Launcher an die lokale Stream Engine übergeben.
- Recording kompiliert einen eigenen Graph mit `mode=recording`; Recording-Routing wird daher auch für native Quellen ausgewertet.
- Streamkeys und Gerätebindungen bleiben lokal im Launcher.

## Bewusst noch nicht als fertig markiert

### Hybrid Widget + Native Media Merge

Widget- und Native-Layer liegen jetzt im **gleichen Scene Graph**, aber der Launcher rendert in diesem Pass nur eine Scene nativ, wenn sie ausschließlich native Video-Layer enthält. Enthält eine Scene gleichzeitig CFS-Widgets und native Videoquellen, wird sie als `hybrid_pending` erkannt. Der bestehende Capture-Pfad bleibt dann aktiv, damit keine Widget-Layer stillschweigend verschwinden.

Der nächste Compositor-Schritt muss den Browser-/Widget-Output als echte Media-Layer in den lokalen FFmpeg-/GPU-Compositor einspeisen.

### Game Capture

`Game Capture` besitzt jetzt Source-Typ, Routing, Transform, Crop und Compositor-Pfad. Als Foundation verwendet der Capture-Eingang noch das lokale Fenster-Binding über `gdigrab`. **Echte native Game-Capture-Hooks sind weiterhin offen.**

### Noch offen

- echter Hybrid-Merge Widget/Browser + Native Video
- native Game-Capture-Hooks
- Application Audio Capture / WASAPI pro Anwendung
- mehr als die bisherige Audio-Track-Struktur
- Scene-Hot-Switch ohne FFmpeg-Prozess-Neustart
- realer Windows Multistream-/Recording-Soak-Test

## Repository-Test

```powershell
npm.cmd run studio-native-scene21:check
```

Kompletter Stream-Studio-Check:

```powershell
npm.cmd run stream-studio21:check
```

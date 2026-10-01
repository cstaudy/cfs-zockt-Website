# TECHNIK v168

- Backend: **3.20.13**
- Schema: **73**
- Launcher: **0.47.30**
- Feature Freeze aus v154 bleibt aktiv; v168 ist ein UX-/Workspace-Pass ohne neue große Runtime-Funktion.
- CFS Studio verwendet ein neues Operator-Standardlayout (`workspace_layout.version = 3`).
- Standard: links Scenes + Quellen, Mitte Preview/Program + Scene Composer, rechts Session + Stream-Check + Multistream, unten Audio + eingeklappte Capture/Output-Einstellungen.
- Live Health und Multi-Chat/Activity bleiben vorhanden, sind im Standard aber eingeklappt.
- Alte unveränderte v2-Standardworkspaces werden sicher auf v3 migriert; individuell verschobene Panels, Größen oder Spaltenbreiten werden nicht automatisch überschrieben.
- Layout-Edit öffnet eingeklappte Dock-Panels vorübergehend und stellt den vorherigen Zustand danach wieder her.
- Hash-/Deep-Links öffnen das zugehörige eingeklappte Panel automatisch.
- Keine Änderung an Stream-Credentials, Provider-Tokens, SafeStorage oder Cloud-Secret-Grenzen.

## Verifikation

- `studio-operator168:check`: **92/92 PASS**
- `project:check`: **40/40 PASS**
- kompletter `release:v168`: **PASS / Exit 0**

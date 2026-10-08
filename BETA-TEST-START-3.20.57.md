# Beta-Test Start · 3.20.57

## 1. Codebasis prüfen
```bash
npm run check:v32057
```

## 2. Acceptance neu initialisieren
```bash
npm run beta:init -- --force
npm run beta:status
```
Erwartet: **0/56 · HOLD**.

## 3. Preflight
```bash
npm run beta:preflight
npm run beta:windows-kit
```
Auf Windows:
```bash
npm run beta:preflight:windows
```

## 4. Testreihenfolge
1. Windows / Launcher / OBS
2. Twitch
3. TikTok / YouTube / Multistream
4. Browser / Mobile / Accessibility
5. Account / Security
6. Shop / Downloads
7. Creator End-to-End
8. Stability / 60-Minuten-Soak

## 5. Einen Testpunkt erfassen
Beispiel:
```bash
node tools/beta-acceptance-v32057.mjs record \
  --id twitch.oauth \
  --status pass \
  --reference evidence/beta-3.20.57/twitch-oauth.txt \
  --notes "Testaccount real verbunden"
```

## 6. Evidence prüfen
```bash
npm run beta:evidence
```

## 7. Entscheidung vorbereiten
```bash
npm run beta:go-no-go
```
Das Werkzeug gibt niemals automatisch ein Release-GO, sondern höchstens `READY_FOR_MANUAL_GO_NO_GO`.

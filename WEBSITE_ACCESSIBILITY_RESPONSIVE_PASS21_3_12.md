# Website Pass 21.3.12 — Responsive, Accessibility & UI States

## Ziel
Die öffentliche Website und die Creator Suite erhalten einen gemeinsamen Baseline-Pass für Tastaturbedienung, Fokus, mobile Layouts sowie leere, Lade- und Fehlerzustände. Bestehende API-, Auth- und Security-Logik wird nicht verändert.

## Änderungen
- globaler Skip-Link zum Hauptinhalt
- klarer `:focus-visible`-Zustand für Links, Buttons und Formfelder
- bestehende Mobile-Navigation bleibt per `aria-expanded`, Escape und Außenklick bedienbar
- Status-/Fehlermeldungen werden als `status` bzw. `alert` für Assistive Technology ausgezeichnet
- `aria-disabled`-Links sind nicht mehr aktivierbar
- wichtige readonly Output-/OBS-/Bridge-Felder besitzen zugängliche Namen
- fehlende Formularbezeichnungen in Audio Studio, Setup, Scene Studio, Games, Creator Editor und Widget Studio ergänzt
- gemeinsame Empty-/Error-/Loading-State-Komponenten
- Dashboard zeigt einen echten Empty State, falls keine Creator-Module geliefert werden
- Responsive-Fallbacks für Navigation, Grids, Scene Studio, Tool-Aktionen und Formulare
- Touch-Ziele und mobile Aktionsflächen vergrößert
- `prefers-reduced-motion` und `forced-colors` berücksichtigt
- horizontales Überlaufen auf kleinen Displays reduziert

## Nicht Bestandteil
Keine Änderung an Authentifizierung, Passkeys, MFA, TikTok OAuth, Rate Limits, CSRF, CSP, Datenbank oder Recovery. Die vollständige Security-Abnahme folgt nach dem Website-Aufbau.

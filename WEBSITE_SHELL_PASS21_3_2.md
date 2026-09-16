# cfs_zockt · Website Shell Pass 21.3.2

Stand: 16.09.2026

## Ziel

Pass 21.3.2 vereinheitlicht die öffentliche Website-Navigation und den Footer, ohne die eingeloggten Creator-Tools umzubauen.

## Umgesetzt

- einheitlicher öffentlicher Header auf Startseite, Creator Suite, Support, Sicherheit und Rechteseiten
- einheitlicher Footer mit Produkt-, Hilfe- und Rechtsnavigation
- mobile Navigation mit zentralem App-JS-Handler
- eingeloggter Zustand bleibt über `data-login-link` / `data-auth-cta` kompatibel
- rechtliche Inhalte bleiben unverändert, erhalten aber dieselbe Website-Shell
- Creator-/Runtime-Seiten wie Widget Studio, Games und Launcher bleiben bewusst in ihrer Produktnavigation

## Navigationsprinzip

Öffentlich: Start · Creator Suite · Widgets · Games · Launcher · Pläne · Roadmap · Sicherheit · Support · Anmelden · Kostenlos starten.

Widgets, Games, Launcher, Pläne und Roadmap verweisen öffentlich auf die erklärenden Abschnitte der Creator-Suite-Seite. Die eigentlichen Creator-Werkzeuge bleiben nach dem Login getrennt.

## Sicherheitsprinzip

Keine Security-, Auth-, CSP-, CSRF-, Session- oder Production-Mechanik wurde für diesen UI-Pass abgeschwächt.

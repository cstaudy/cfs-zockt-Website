import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const pages = {
  widget: 'public/pages/widget-studio.html',
  scene: 'public/pages/scene-studio.html',
  tiktok: 'public/pages/tiktok.html',
  launcher: 'public/pages/launcher.html',
  games: 'public/pages/games.html',
  cut: 'public/pages/cut-studio.html'
};

let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}`); }
}

for (const [name, rel] of Object.entries(pages)) {
  const html = read(rel);
  check(`${name}: Creator Navigation bleibt vorhanden`, html.includes('data-creator-nav'));
  check(`${name}: noindex bleibt gesetzt`, /name="robots"[^>]*noindex/i.test(html));
  check(`${name}: einheitlicher Tool-Einstieg`, html.includes('class="creator-tool-entry"'));
}

const widget = read(pages.widget);
check('Widget: manueller Start ohne TikTok erklärt', widget.includes('Manuelle Widgets funktionieren auch ohne TikTok'));
check('Widget: bestehende App-ID erhalten', widget.includes('id="wsApp"'));
check('Widget: bestehender Create-Action Hook erhalten', widget.includes('data-action="open-create"'));

const scene = read(pages.scene);
check('Scene: Workflow Widgets → Scene → Output', scene.includes('stabile Output-URL'));
check('Scene: bestehende Scene-IDs erhalten', ['newVerticalScene','sceneEditor','sceneOutputUrl'].every(id => scene.includes(`id="${id}"`)));

const tiktok = read(pages.tiktok);
check('TikTok: Profil und LIVE getrennt erklärt', tiktok.includes('Profil-Verbindung und LIVE-Daten bleiben bewusst getrennt'));
check('TikTok: OAuth-Link erhalten', tiktok.includes('href="/auth/creator/tiktok"'));
check('TikTok: bestehende Status-IDs erhalten', ['ttStatus','ttConnect','ttDisconnect'].every(id => tiktok.includes(`id="${id}"`)));

const launcher = read(pages.launcher);
check('Launcher: Device-Link Einstieg vorhanden', launcher.includes('/pages/launcher-connect.html'));
check('Launcher: Release-/Geräte-IDs erhalten', ['heroDownload','deviceGrid','releaseCard'].every(id => launcher.includes(`id="${id}"`)));

const games = read(pages.games);
check('Games: manuelle Steuerung vor LIVE-Regeln erklärt', games.includes('manuellen Punkten'));
check('Games: bestehende Runtime-IDs erhalten', ['gameApp','startGame','gameRuleList','gameOutputUrl'].every(id => games.includes(`id="${id}"`)));

const cut = read(pages.cut);
check('Cut: Beta sichtbar', cut.includes('creator-tool-status beta">BETA'));
check('Cut: lokale Medienverarbeitung erklärt', cut.includes('Video- und Audiodateien bleiben auf deinem PC'));
check('Cut: bestehende Projekt-IDs erhalten', ['newCutProject','cutApp','queueCutExport'].every(id => cut.includes(`id="${id}"`)));

const css = read('public/assets/css/styles.css');
check('Shared CSS: Creator Tool Entry vorhanden', css.includes('.creator-tool-entry{'));
check('Shared CSS: responsive Layout vorhanden', css.includes('@media (max-width:900px){.creator-tool-path'));

console.log(`\nCreator Tools Pass 21.3.9: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);

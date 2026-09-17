import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('public/assets/js/app.js');
const css = read('public/assets/css/styles.css');
const dashboardJs = read('public/assets/js/page-dashboard.js');

const checks = [];
const check = (name, ok) => checks.push([name, Boolean(ok)]);

check('accessibility initializer exists', app.includes('function initAccessibilityBaseline()'));
check('skip link is injected', app.includes('Zum Hauptinhalt springen') && app.includes('skip-link'));
check('main content receives stable target', app.includes('main.id = "main-content"'));
check('notices receive status/alert semantics', app.includes('dangerous ? "alert" : "status"'));
check('aria-disabled links cannot be activated', app.includes('a[aria-disabled=\'true\']'));
check('live regions are configured', app.includes('aria-live') && app.includes('aria-atomic'));
check('accessibility initializer is started', app.includes('initAccessibilityBaseline();'));
check('visible focus styling exists', css.includes(':focus-visible'));
check('skip link focus styling exists', css.includes('.skip-link:focus'));
check('reduced motion is respected', css.includes('@media(prefers-reduced-motion:reduce)'));
check('forced colors are respected', css.includes('@media(forced-colors:active)'));
check('touch targets have baseline height', css.includes('.btn,.mobile-toggle,.creator-logout{min-height:42px}'));
check('mobile nav has viewport-safe scrolling', css.includes('max-height:calc(100dvh - 72px)'));
check('small screen grids collapse', css.includes('.creator-workspace-map-grid,.creator-tool-entry-grid,.beginner-actions,.beginner-status,.grid.two,.grid.three{grid-template-columns:1fr!important}'));
check('generic UI states exist', css.includes('.ui-state{') && css.includes('.ui-state-error') && css.includes('.ui-state-loading'));
check('dashboard has explicit empty state', dashboardJs.includes('Noch keine Creator-Module verfügbar') && dashboardJs.includes('data-ui-reload'));
check('scene studio output fields are named', read('public/pages/scene-studio.html').includes('aria-label="Scene Output URL"') && read('public/pages/scene-studio.html').includes('aria-label="Scene Name"'));
check('widget studio output fields are named', ['Widget Output URL','OBS Browser Source URL','Stream Board Output URL','Launcher Bridge Schlüssel'].every(v => read('public/pages/widget-studio.html').includes(`aria-label="${v}"`)));
check('setup controls are named', ['Theme','Follower-Ziel','Startmodul','Show Mode','Aktives Game'].every(v => read('public/pages/setup.html').includes(`aria-label="${v}"`)));
check('audio controls are named', ['Preset Name','Master Lautstärke','Voice Lautstärke','Game Lautstärke','Soundboard Lautstärke'].every(v => read('public/pages/audio-studio.html').includes(`aria-label="${v}"`)));
check('creator editor color/source controls are named', ['Akzentfarbe 1','Akzentfarbe 2','Widget Hintergrundfarbe','Widget Textfarbe','Widget Browser Source URL'].every(v => read('public/pages/editor.html').includes(`aria-label="${v}"`)));
check('pass documentation exists', fs.existsSync(path.join(root, 'WEBSITE_ACCESSIBILITY_RESPONSIVE_PASS21_3_12.md')));

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (ok) passed += 1;
}
console.log(`\nWebsite Accessibility/Responsive Pass 21.3.12: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const css = read('public/assets/css/styles.css');
const checks = [];
const check = (name, ok) => checks.push([name, Boolean(ok)]);

check('pass marker exists', css.includes('PASS 21.3.13 · VISUAL POLISH & CONSISTENCY'));
check('shared surface token exists', css.includes('--cfs-surface:#06111d'));
check('shared border token exists', css.includes('--cfs-border:#173b59'));
check('shared radius tokens exist', css.includes('--cfs-radius-sm:10px') && css.includes('--cfs-radius-lg:20px'));
check('shared shadow tokens exist', css.includes('--cfs-shadow-soft:') && css.includes('--cfs-shadow-raised:'));
check('button hover state is polished', css.includes('.btn:hover:not([disabled])'));
check('disabled button state exists', css.includes('.btn[disabled],.btn[aria-disabled="true"]'));
check('form hover state exists', css.includes('input:hover,textarea:hover,select:hover'));
check('public marketing rhythm exists', css.includes('.marketing-section{padding-top:82px;padding-bottom:82px}'));
check('public cards receive shared hover treatment', css.includes('.marketing-status-grid article:hover'));
check('creator workspace visual background exists', css.includes('.creator-workspace{background:radial-gradient'));
check('creator tool cards receive hover treatment', css.includes('.creator-tool-entry:not(.locked):hover'));
check('management hub visual refinement exists', css.includes('.management-hub{border-radius:18px}'));
check('mobile 760 refinement exists', css.includes('@media(max-width:760px)'));
check('mobile 520 refinement exists', css.includes('@media(max-width:520px)'));
check('no literal escaped newline sequences remain', !css.includes('\\n'));
check('pass documentation exists', fs.existsSync(path.join(root, 'WEBSITE_VISUAL_POLISH_PASS21_3_13.md')));

const htmlFiles = [
  'public/index.html',
  'public/pages/creator-suite.html',
  'public/pages/login.html',
  'public/pages/dashboard.html',
  'public/pages/widget-studio.html',
  'public/pages/account.html',
];
check('key pages still use shared stylesheet', htmlFiles.every(rel => /href=\"\/?assets\/css\/styles\.css\"/.test(read(rel))));

let balance = 0;
for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
  if (ch === '{') balance++;
  if (ch === '}') balance--;
  if (balance < 0) break;
}
check('stylesheet brace balance is valid', balance === 0);

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (ok) passed++;
}
console.log(`\nWebsite Visual Polish Pass 21.3.13: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);

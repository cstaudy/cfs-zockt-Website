import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, Boolean(ok)]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const support = read('public/pages/support.html');
const security = read('public/pages/security.html');
const privacy = read('public/pages/datenschutz.html');
const terms = read('public/pages/nutzungsbedingungen.html');
const imprint = read('public/pages/impressum.html');
const css = read('public/assets/css/styles.css');

check('support exposes status shortcut', support.includes('/api/public/status') && support.includes('Ist cfs_zockt online?'));
check('support keeps private report form', support.includes('data-support-report') && support.includes('MELDUNG PRIVAT SENDEN'));
check('support warns against secrets', /Keine Zugangsdaten senden|Passwörter und Tokens nie mitsenden/.test(support));
check('support links recovery', support.includes('/pages/forgot-password.html'));
check('security grouped into four areas', ['security-account','security-requests','security-privacy','security-operations'].every(x => security.includes(`id="${x}"`)));
check('security keeps disclosure path', security.includes('/.well-known/security.txt'));
check('security keeps fail-closed statement', security.includes('Fail-closed in Produktion'));
check('security has account self-service', security.includes('WAS DU SELBST TUN KANNST'));
check('privacy uses legal layout', privacy.includes('legal-layout') && privacy.includes('legal-toc'));
check('terms uses legal layout', terms.includes('legal-layout') && terms.includes('legal-toc'));
check('imprint uses legal layout', imprint.includes('legal-layout') && imprint.includes('legal-toc'));
check('legal pages expose support route', [privacy, terms, imprint].every(x => x.includes('/pages/support.html')));
check('info hub css present', css.includes('PASS 21.3.5') && css.includes('.info-shortcut-grid'));
check('legal responsive css present', css.includes('.legal-layout') && css.includes('@media(max-width:720px)'));

const failed = checks.filter(([,ok]) => !ok);
console.log(`Website Info Pass 21.3.5: ${checks.length-failed.length}/${checks.length}`);
if (failed.length) process.exit(1);

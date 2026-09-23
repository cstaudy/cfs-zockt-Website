import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TARGET = 'https://cfs-zockt.de';
const STORE = path.join(process.env.USERPROFILE || os.homedir(), 'Documents', 'cfs-zockt-production-evidence');
const IS_WIN = process.platform === 'win32';
const NPM = IS_WIN ? 'npm.cmd' : 'npm';

const ROUNDS = Object.freeze([
  { id: 'R59', name: 'Render Production', evidence: 'reports/render-production-drill-r59.json', expected: 'LIVE_PASS' },
  { id: 'R60', name: 'Database Recovery', evidence: 'reports/database-recovery-drill-evidence.json', expected: 'LIVE_RESTORE_PASS' },
  { id: 'R61', name: 'Mail / Recovery', evidence: 'reports/account-mail-drill-evidence.json', expected: 'LIVE_MAIL_PASS' },
  { id: 'R62', name: 'Passkey / MFA', evidence: 'reports/account-auth-drill-evidence.json', expected: 'LIVE_AUTH_PASS' },
  { id: 'R63', name: 'Windows Launcher', evidence: 'launcher/reports/windows-production-drill-evidence.json', expected: 'LIVE_WINDOWS_PASS' },
  { id: 'R64', name: 'OBS / LIVE 2h Soak', evidence: 'launcher/reports/live-soak-production-drill-evidence.json', expected: 'LIVE_SOAK_PASS' },
  { id: 'R65', name: 'Monitoring / Alerting', evidence: 'reports/production-monitor-drill-evidence.json', expected: 'LIVE_MONITOR_PASS' },
  { id: 'R66', name: 'Stripe LIVE', evidence: 'reports/stripe-live-drill-evidence.json', expected: 'LIVE_BILLING_PASS' },
]);

const runtimeEnv = { ...process.env };
const results = new Map();
let promptInterface = null;

function closePromptInterface() {
  if (promptInterface) {
    promptInterface.close();
    promptInterface = null;
  }
}

class SkippedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SkippedError';
  }
}

function section(title) {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`);
}
function info(message) { console.log(`[INFO]  ${message}`); }
function pass(message) { console.log(`[PASS]  ${message}`); }
function warn(message) { console.warn(`[WARN]  ${message}`); }

function safeMessage(error) {
  return String(error?.message || error || 'Unbekannter Fehler')
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'postgresql://[redacted]')
    .replace(/sk_live_[A-Za-z0-9_-]+/g, 'sk_live_[redacted]')
    .replace(/whsec_[A-Za-z0-9_-]+/g, 'whsec_[redacted]');
}

function ensureProject() {
  const required = [
    'package.json', 'package-lock.json',
    'tools/render-production-drill-r59.mjs',
    'tools/database-recovery-drill-r60.mjs',
    'tools/account-mail-production-drill-r61.mjs',
    'tools/account-auth-production-drill-r62.mjs',
    'launcher/tools/windows-production-drill-r63.mjs',
    'launcher/tools/live-soak-production-drill-r64.mjs',
    'tools/production-monitor-drill-r65.mjs',
    'tools/stripe-live-production-drill-r66.mjs',
    'tools/launch-production-gate-r67.mjs',
  ];
  const missing = required.filter(rel => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length) throw new Error(`Projektstand unvollständig. Fehlend: ${missing.join(', ')}`);
  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isFinite(major) || major < 22) throw new Error(`Node.js 22+ erforderlich, gefunden: ${process.version}`);
}

function commandExists(command) {
  const probe = IS_WIN ? spawnSync('where.exe', [command], { encoding: 'utf8', windowsHide: true }) : spawnSync('sh', ['-lc', `command -v ${command}`], { encoding: 'utf8' });
  return probe.status === 0;
}

function run(command, args, { env = runtimeEnv, cwd = ROOT, allow = [0], title = '' } = {}) {
  if (title) section(title);
  const child = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsHide: false });
  if (child.error) throw child.error;
  const code = Number.isInteger(child.status) ? child.status : 1;
  if (!allow.includes(code)) throw new Error(`${title || command} fehlgeschlagen (ExitCode=${code}).`);
  return code;
}

function npm(args, options = {}) { return run(NPM, args, options); }
function node(args, options = {}) { return run(process.execPath, args, options); }

async function ask(prompt, { allowSkip = false, defaultValue = '' } = {}) {
  if (!promptInterface) promptInterface = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = allowSkip ? ' [SKIP = später]' : '';
  const def = defaultValue ? ` [${defaultValue}]` : '';
  const value = (await promptInterface.question(`${prompt}${def}${suffix}: `)).trim();
  if (allowSkip && value.toUpperCase() === 'SKIP') throw new SkippedError(`${prompt} wurde übersprungen.`);
  return value || defaultValue;
}

function psQuoteSingle(value) { return String(value).replaceAll("'", "''"); }

async function askSecret(envName, prompt, { allowSkip = true } = {}) {
  if (runtimeEnv[envName]) {
    info(`${envName} ist im aktuellen Prozess bereits gesetzt; Wert wird nicht angezeigt.`);
    return runtimeEnv[envName];
  }
  let value = '';
  if (IS_WIN) {
    closePromptInterface();
    const label = `${prompt}${allowSkip ? ' [SKIP = später]' : ''}`;
    const script = `$s=Read-Host '${psQuoteSingle(label)}' -AsSecureString;` +
      `$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s);` +
      `try{[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p))}` +
      `finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}`;
    const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'], windowsHide: false });
    if (r.status !== 0) throw new Error(`Geheime Eingabe für ${envName} fehlgeschlagen.`);
    value = String(r.stdout || '').trim();
  } else {
    warn(`Verdeckte Eingabe ist außerhalb von Windows nicht verfügbar; ${envName} wird sichtbar abgefragt.`);
    value = await ask(prompt, { allowSkip });
  }
  if (allowSkip && value.toUpperCase() === 'SKIP') throw new SkippedError(`${envName} wurde übersprungen.`);
  if (!value) throw new Error(`${envName} darf nicht leer sein.`);
  runtimeEnv[envName] = value;
  return value;
}

async function requireTextEnv(envName, prompt, defaultValue = '') {
  if (runtimeEnv[envName]) return runtimeEnv[envName];
  const value = await ask(prompt, { allowSkip: true, defaultValue });
  if (!value) throw new Error(`${envName} darf nicht leer sein.`);
  runtimeEnv[envName] = value;
  return value;
}

async function confirmExact(prompt, word = 'PASS', { allowSkip = true } = {}) {
  const value = await ask(`${prompt} – tippe exakt ${word}`, { allowSkip });
  return value === word;
}

function storePath(relative) { return path.join(STORE, relative.replace(/[\\/]/g, '__')); }
function repoPath(relative) { return path.join(ROOT, relative); }

function syncEvidenceIn() {
  fs.mkdirSync(STORE, { recursive: true });
  for (const round of ROUNDS) {
    const src = storePath(round.evidence);
    const dst = repoPath(round.evidence);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (!fs.existsSync(dst) || fs.statSync(src).mtimeMs > fs.statSync(dst).mtimeMs) fs.copyFileSync(src, dst);
  }
}

function harvestEvidence() {
  fs.mkdirSync(STORE, { recursive: true });
  for (const round of ROUNDS) {
    const src = repoPath(round.evidence);
    if (fs.existsSync(src)) fs.copyFileSync(src, storePath(round.evidence));
  }
}

function readEvidence(round) {
  const candidates = [storePath(round.evidence), repoPath(round.evidence)];
  let best = null;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const stat = fs.statSync(file);
    if (!best || stat.mtimeMs > best.mtimeMs) best = { file, mtimeMs: stat.mtimeMs };
  }
  if (!best) return { state: 'OPEN', status: '', file: '' };
  try {
    const json = JSON.parse(fs.readFileSync(best.file, 'utf8'));
    const status = String(json?.status || '');
    return { state: status === round.expected ? 'FOUND' : 'OPEN', status, file: best.file, json };
  } catch {
    return { state: 'INVALID', status: 'INVALID_JSON', file: best.file };
  }
}

function showStatus() {
  section('Production Readiness – Evidence Status');
  console.log('Hinweis: FOUND bedeutet vorhandene Evidence mit erwartetem Status.');
  console.log('Die kryptografische Endverifikation erfolgt erst durch R67.\n');
  for (const round of ROUNDS) {
    const e = readEvidence(round);
    const label = e.state.padEnd(7);
    console.log(`${label} ${round.id.padEnd(4)} ${round.name.padEnd(24)} ${e.status || ''}`);
  }
  console.log(`\nEvidence Store: ${STORE}`);
}

function showLocalPrerequisites() {
  section('Lokaler Preflight');
  const rows = [
    ['Node 22+', Number(process.versions.node.split('.')[0]) >= 22, process.version],
    ['npm', commandExists(NPM), NPM],
    ['git', commandExists(IS_WIN ? 'git.exe' : 'git'), 'nur für Repo-Pflege'],
    ['pg_dump', commandExists(IS_WIN ? 'pg_dump.exe' : 'pg_dump'), 'für R60'],
    ['pg_restore', commandExists(IS_WIN ? 'pg_restore.exe' : 'pg_restore'), 'für R60'],
    ['psql', commandExists(IS_WIN ? 'psql.exe' : 'psql'), 'für R60'],
    ['Windows', IS_WIN, 'für R63/R64'],
  ];
  for (const [name, ok, detail] of rows) console.log(`${ok ? 'READY' : 'OPEN '} ${String(name).padEnd(12)} ${detail}`);
  console.log('\nOPEN im Preflight ist kein Fehl-PASS; der jeweilige Live-Test bleibt dann offen.');
}

function runStaticGates() {
  section('Statische Gates R59–R67');
  for (let n = 59; n <= 67; n++) {
    npm(['run', `security${n}:check`], { title: `R${n} statisches Gate` });
  }
  pass('R59–R67 statische Gates vollständig.');
}

async function ensureStart(round) {
  section(`${round.id} – ${round.name}`);
  const choice = (await ask('ENTER=starten / SKIP=später / QUIT=beenden')).toUpperCase();
  if (choice === 'SKIP' || choice === 'S') return 'SKIP';
  if (choice === 'QUIT' || choice === 'Q') return 'QUIT';
  if (choice !== '') throw new Error(`Ungültige Auswahl: ${choice}`);
  return 'START';
}

function openBrowser(url) {
  if (IS_WIN) {
    const p = spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true });
    p.unref();
  } else {
    info(`Browser öffnen: ${url}`);
  }
}

async function roundR59() {
  npm(['run', 'security59:check'], { title: 'R59 Security Gate' });
  npm(['run', 'render:drill', '--', '--external-only', '--live', '--target', TARGET], { title: 'R59 echter Production LIVE Drill' });
}

async function roundR60() {
  npm(['run', 'security60:check'], { title: 'R60 Security Gate' });
  await askSecret('DATABASE_URL', 'Production DATABASE_URL');
  await askSecret('CFS_RESTORE_TARGET_URL', 'Separate LEERE Recovery DATABASE_URL');
  await askSecret('CFS_BACKUP_ENCRYPTION_KEY', 'Production CFS_BACKUP_ENCRYPTION_KEY');
  node(['tools/database-recovery-drill-r60.mjs', '.', '--preflight'], { title: 'R60 sicherer Preflight' });
  const confirm = await ask('Preflight READY. Tippe RESTORE für den echten Restore oder SKIP');
  if (confirm.toUpperCase() === 'SKIP') throw new SkippedError('R60 Restore wurde nach Preflight übersprungen.');
  if (confirm !== 'RESTORE') throw new Error('R60 Restore nicht bestätigt. Erwartet wurde exakt RESTORE.');
  runtimeEnv.CFS_RESTORE_CONFIRM = 'RESTORE_TO_EMPTY_DATABASE';
  node(['tools/database-recovery-drill-r60.mjs', '.', '--live'], { title: 'R60 echter Backup/Restore Drill' });
}

async function roundR61() {
  npm(['run', 'security61:check'], { title: 'R61 Security Gate' });
  runtimeEnv.CFS_ACCOUNT_MAIL_MODE = 'webhook';
  await requireTextEnv('CFS_ACCOUNT_MAIL_WEBHOOK_URL', 'Production Mail-Webhook HTTPS URL');
  await askSecret('CFS_ACCOUNT_MAIL_WEBHOOK_SECRET', 'Production Mail-Webhook Secret');
  const to = await requireTextEnv('CFS_MAIL_DRILL_RECIPIENT', 'Test-Postfach E-Mail');
  node(['tools/account-mail-production-drill-r61.mjs', '.', '--prepare', '--to', to], { title: 'R61 drei echte Testmails senden' });
  section('R61 Inbox-Nachweis');
  console.log('Öffne das Testpostfach. Es müssen drei R61-Mails angekommen sein.');
  const a = await ask('Code aus email_verification');
  const b = await ask('Code aus password_reset');
  const c = await ask('Code aus security_alert');
  node(['tools/account-mail-production-drill-r61.mjs', '.', '--verify', '--codes', `${a},${b},${c}`], { title: 'R61 Inbox verifizieren' });
}

async function roundR62() {
  npm(['run', 'security62:check'], { title: 'R62 Security Gate' });
  await askSecret('DATABASE_URL', 'Production DATABASE_URL');
  await askSecret('CFS_ACCOUNT_ELEVATION_SECRET', 'Production CFS_ACCOUNT_ELEVATION_SECRET');
  runtimeEnv.APP_BASE_URL = TARGET;
  const email = await requireTextEnv('CFS_AUTH_DRILL_EMAIL', 'Production Testkonto E-Mail');
  node(['tools/account-auth-production-drill-r62.mjs', '.', '--prepare', '--email', email, '--target', TARGET], { title: 'R62 vorbereiten' });
  openBrowser(TARGET);
  section('R62 echter Browser-Test');
  console.log('Führe die vom R62-Drill ausgegebenen 7 Passkey/MFA-Schritte mit dem Testkonto aus.');
  await ask('ENTER erst wenn alle echten Browser-Schritte abgeschlossen sind');
  node(['tools/account-auth-production-drill-r62.mjs', '.', '--verify', '--target', TARGET], { title: 'R62 Production Events verifizieren' });
}

async function roundR63() {
  npm(['run', 'security63:check'], { title: 'R63 Security Gate' });
  const artifact = await requireTextEnv('CFS_WINDOWS_DRILL_ARTIFACT', 'Pfad zur signierten Release-EXE/Setup-Datei');
  const thumb = await requireTextEnv('CFS_WINDOWS_SIGNER_THUMBPRINT', 'Erwarteter Code-Signing Zertifikat-Thumbprint');
  section('R63 reale Windows-Schritte');
  console.log('Führe Clean Install, Launcher-Start, echten Device-Link und Updater-E2E mit diesem Release durch.');
  runtimeEnv.CFS_WINDOWS_CLEAN_INSTALL_VERIFIED = String(await confirmExact('Clean Install auf diesem Windows erfolgreich'));
  runtimeEnv.CFS_WINDOWS_LAUNCH_VERIFIED = String(await confirmExact('Installierter Launcher startet erfolgreich'));
  runtimeEnv.CFS_WINDOWS_DEVICE_LINK_VERIFIED = String(await confirmExact('Echter Device-Link gegen Production funktioniert'));
  runtimeEnv.CFS_WINDOWS_UPDATER_VERIFIED = String(await confirmExact('Updater-E2E für signierten Release funktioniert'));
  if (Object.values({
    a: runtimeEnv.CFS_WINDOWS_CLEAN_INSTALL_VERIFIED,
    b: runtimeEnv.CFS_WINDOWS_LAUNCH_VERIFIED,
    c: runtimeEnv.CFS_WINDOWS_DEVICE_LINK_VERIFIED,
    d: runtimeEnv.CFS_WINDOWS_UPDATER_VERIFIED,
  }).some(v => v !== 'true')) throw new Error('R63 wurde nicht vollständig mit PASS bestätigt.');
  node(['launcher/tools/windows-production-drill-r63.mjs', 'launcher', '--artifact', artifact, '--signer-thumbprint', thumb], { title: 'R63 Windows/Signing/Hardware Drill' });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function roundR64() {
  npm(['run', 'security64:check'], { title: 'R64 Security Gate' });
  section('R64 2h OBS/LIVE Soak');
  console.log('Starte OBS + echten LIVE-Provider + Launcher/Stream Studio in der zu prüfenden Production-Konfiguration.');
  if (!(await confirmExact('OBS und LIVE sind jetzt wirklich verbunden und bereit'))) throw new Error('R64 wurde nicht gestartet.');
  node(['launcher/tools/live-soak-production-drill-r64.mjs', 'launcher', '--start'], { title: 'R64 Soak starten' });
  for (let i = 1; i <= 120; i++) {
    await delay(60_000);
    node(['launcher/tools/live-soak-production-drill-r64.mjs', 'launcher', '--heartbeat']);
    console.log(`R64: ${i}/120 Minuten`);
  }
  runtimeEnv.CFS_SOAK_FATAL_ERRORS = '0';
  runtimeEnv.CFS_SOAK_OBS_OK = String(await confirmExact('OBS war am Ende verbunden'));
  runtimeEnv.CFS_SOAK_PROVIDER_OK = String(await confirmExact('LIVE-Provider war am Ende verbunden'));
  runtimeEnv.CFS_SOAK_VISIBLE_OK = String(await confirmExact('Während der 2h gab es keinen sichtbaren fatalen Fehler/Crash'));
  if ([runtimeEnv.CFS_SOAK_OBS_OK, runtimeEnv.CFS_SOAK_PROVIDER_OK, runtimeEnv.CFS_SOAK_VISIBLE_OK].some(v => v !== 'true')) throw new Error('R64 Abschlussbedingungen wurden nicht vollständig bestätigt.');
  node(['launcher/tools/live-soak-production-drill-r64.mjs', 'launcher', '--finish'], { title: 'R64 Soak abschließen' });
}

async function roundR65() {
  npm(['run', 'security65:check'], { title: 'R65 Security Gate' });
  runtimeEnv.CFS_MONITOR_MODE = 'webhook';
  runtimeEnv.CFS_MONITOR_REQUIRED = 'true';
  await requireTextEnv('CFS_MONITOR_ALERT_WEBHOOK_URL', 'Externer Monitoring-Webhook HTTPS URL');
  await askSecret('CFS_MONITOR_ALERT_WEBHOOK_SECRET', 'Monitoring Webhook Secret');
  node(['tools/production-monitor-drill-r65.mjs', '.', '--prepare'], { title: 'R65 echten Alert senden' });
  const code = await ask('Code aus dem EXTERNEN Alert-Ziel');
  node(['tools/production-monitor-drill-r65.mjs', '.', '--verify', '--code', code], { title: 'R65 externe Alert-Zustellung verifizieren' });
}

async function roundR66() {
  npm(['run', 'security66:check'], { title: 'R66 Security Gate' });
  await askSecret('DATABASE_URL', 'Production DATABASE_URL');
  runtimeEnv.APP_BASE_URL = TARGET;
  runtimeEnv.CFS_RELEASE_EVIDENCE_VERSION = '0.42.0';
  await askSecret('CFS_STRIPE_SECRET_KEY', 'Stripe sk_live_ Secret Key');
  await askSecret('CFS_STRIPE_WEBHOOK_SECRET', 'Stripe whsec_ Webhook Secret');
  await requireTextEnv('CFS_STRIPE_PRICE_CREATOR_MONTHLY', 'LIVE Creator Price ID');
  await requireTextEnv('CFS_STRIPE_PRICE_PRO_MONTHLY', 'LIVE Pro Price ID');
  const email = await requireTextEnv('CFS_STRIPE_DRILL_EMAIL', 'Production Stripe-Testkonto E-Mail');
  node(['tools/stripe-live-production-drill-r66.mjs', '.', '--prepare', '--email', email], { title: 'R66 LIVE Preflight' });
  section('R66 MANUELLE Finanzaktion');
  warn('Der Runner führt absichtlich keine Zahlung aus. Führe den LIVE-Checkout selbst durch und danach cancel_at_period_end EIN und wieder AUS. Es können echte Kosten entstehen.');
  openBrowser(TARGET);
  await ask('ENTER nachdem Checkout, invoice.paid und manueller Cancel-Toggle vollständig verarbeitet wurden');
  node(['tools/stripe-live-production-drill-r66.mjs', '.', '--verify'], { title: 'R66 LIVE Events/Subscription verifizieren' });
}

const ROUND_IMPL = { R59: roundR59, R60: roundR60, R61: roundR61, R62: roundR62, R63: roundR63, R64: roundR64, R65: roundR65, R66: roundR66 };

async function runRound(round) {
  try {
    await ROUND_IMPL[round.id]();
    harvestEvidence();
    const evidence = readEvidence(round);
    if (evidence.status !== round.expected) throw new Error(`${round.id} lief durch, aber erwartete Evidence ${round.expected} fehlt.`);
    results.set(round.id, { result: 'PASS_THIS_RUN', detail: round.expected });
    pass(`${round.id} ${round.expected}`);
    return true;
  } catch (error) {
    if (error instanceof SkippedError) {
      results.set(round.id, { result: 'OPEN', detail: error.message });
      warn(`${round.id} bleibt OPEN: ${error.message}`);
      return false;
    }
    results.set(round.id, { result: 'FAIL/BLOCKED', detail: safeMessage(error) });
    console.error(`[FAIL]  ${round.id}: ${safeMessage(error)}`);
    return false;
  }
}

async function r67() {
  harvestEvidence();
  syncEvidenceIn();
  const missing = ROUNDS.slice(1).filter(r => readEvidence(r).status !== r.expected);
  if (missing.length) {
    warn(`R67 bleibt OPEN. Fehlende Evidence: ${missing.map(r => r.id).join(', ')}`);
    return false;
  }
  npm(['run', 'security67:check'], { title: 'R67 Security Gate' });
  runtimeEnv.NODE_ENV = 'production';
  runtimeEnv.APP_BASE_URL = TARGET;
  runtimeEnv.CFS_RELEASE_EVIDENCE_VERSION = '0.42.0';
  runtimeEnv.CFS_BILLING_LIVE_REQUIRED = 'true';
  await askSecret('DATABASE_URL', 'Production DATABASE_URL');
  await askSecret('CFS_ADMIN_AUDIT_HMAC_SECRET', 'Production CFS_ADMIN_AUDIT_HMAC_SECRET');
  await askSecret('CFS_BACKUP_ENCRYPTION_KEY', 'Production CFS_BACKUP_ENCRYPTION_KEY');
  await askSecret('CFS_ACCOUNT_MAIL_WEBHOOK_SECRET', 'Production CFS_ACCOUNT_MAIL_WEBHOOK_SECRET');
  await askSecret('CFS_ACCOUNT_ELEVATION_SECRET', 'Production CFS_ACCOUNT_ELEVATION_SECRET');
  runtimeEnv.CFS_MONITOR_MODE = 'webhook';
  runtimeEnv.CFS_MONITOR_REQUIRED = 'true';
  await requireTextEnv('CFS_MONITOR_ALERT_WEBHOOK_URL', 'Production Monitoring Webhook URL');
  await askSecret('CFS_MONITOR_ALERT_WEBHOOK_SECRET', 'Production Monitoring Webhook Secret');
  await askSecret('CFS_STRIPE_WEBHOOK_SECRET', 'Production Stripe Webhook Secret');

  const imports = ROUNDS.slice(1).flatMap(r => ['--import', repoPath(r.evidence)]);
  const code = node(['tools/launch-production-gate-r67.mjs', '.', ...imports], { title: 'R67 Evidence kryptografisch prüfen/importieren', allow: [0, 2, 3] });
  if (code === 2) throw new Error('R67 Evidence-Import wurde wegen ungültiger/manipulierter Evidence blockiert.');
  pass('R60–R66 Evidence wurde durch R67 geprüft und in Production vorbereitet.');
  section('Letzter Schritt – Render Production Shell');
  console.log('npm run render:drill -- --strict-env --live --target https://cfs-zockt.de');
  console.log('npm run launch:gate -- --collect-defaults --verify');
  console.log('\nZiel: Launch Production Gate R67: LIVE_LAUNCH_PASS');
  console.log('Der lokale Controller behauptet bewusst noch keinen LIVE_LAUNCH_PASS.');
  return true;
}

function summary() {
  section('Gesamtübersicht dieses Laufs');
  for (const round of ROUNDS) {
    const current = results.get(round.id);
    const e = readEvidence(round);
    if (current) console.log(`${current.result.padEnd(13)} ${round.id} ${round.name} – ${current.detail}`);
    else if (e.status === round.expected) console.log(`${'FOUND'.padEnd(13)} ${round.id} ${round.name} – ${e.status} (R67-Endverifikation ausstehend)`);
    else console.log(`${'OPEN'.padEnd(13)} ${round.id} ${round.name}${e.status ? ` – ${e.status}` : ''}`);
  }
}

async function runAll({ onlyNext = false } = {}) {
  ensureProject();
  syncEvidenceIn();
  npm(['ci'], { title: 'npm ci' });
  runStaticGates();
  showLocalPrerequisites();
  showStatus();

  for (const round of ROUNDS) {
    const existing = readEvidence(round);
    if (existing.status === round.expected) {
      results.set(round.id, { result: 'FOUND', detail: `${existing.status}; R67-Endverifikation ausstehend` });
      continue;
    }
    const action = await ensureStart(round);
    if (action === 'QUIT') break;
    if (action === 'SKIP') {
      results.set(round.id, { result: 'OPEN', detail: 'vom Benutzer für diesen Lauf übersprungen' });
      warn(`${round.id} bleibt OPEN und der Gesamtlauf fährt fort.`);
      if (onlyNext) break;
      continue;
    }
    await runRound(round);
    if (onlyNext) break;
  }
  harvestEvidence();
  summary();

  const allEvidence = ROUNDS.every(r => readEvidence(r).status === r.expected);
  if (allEvidence && !onlyNext) {
    section('R59–R66 Evidence vollständig');
    await r67();
  } else if (!allEvidence) {
    const open = ROUNDS.filter(r => readEvidence(r).status !== r.expected).map(r => r.id);
    console.log(`\nNoch offen: ${open.join(', ')}`);
    console.log('Einfach denselben Starter später erneut ausführen; vorhandene Evidence bleibt erhalten.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--all';
  ensureProject();
  syncEvidenceIn();

  if (mode === '--status') {
    showLocalPrerequisites();
    showStatus();
    return;
  }
  if (mode === '--check') {
    npm(['ci'], { title: 'npm ci' });
    runStaticGates();
    showLocalPrerequisites();
    showStatus();
    return;
  }
  if (mode === '--next') {
    await runAll({ onlyNext: true });
    return;
  }
  if (mode === '--all') {
    await runAll({ onlyNext: false });
    return;
  }
  if (mode === '--round') {
    const id = String(args[1] || '').toUpperCase();
    const round = ROUNDS.find(r => r.id === id);
    if (!round) throw new Error(`Unbekannte Runde: ${id}`);
    npm(['ci'], { title: 'npm ci' });
    npm(['run', `security${id.slice(1)}:check`], { title: `${id} statisches Gate` });
    await runRound(round);
    summary();
    return;
  }
  if (mode === '--r67') {
    npm(['ci'], { title: 'npm ci' });
    await r67();
    return;
  }
  throw new Error(`Unbekannter Modus: ${mode}. Erlaubt: --all, --next, --status, --check, --round R60, --r67`);
}

process.on('exit', closePromptInterface);
process.on('SIGINT', () => { closePromptInterface(); process.exit(130); });

main().catch(error => {
  console.error(`\nBLOCKED / FAIL\n${safeMessage(error)}`);
  process.exitCode = 10;
});

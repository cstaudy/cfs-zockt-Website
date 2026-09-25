import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { databaseRuntimeSecurity } = require('../lib/database-runtime-security.js');
const { verifyAuthDrillRecord } = require('../lib/account-auth-drill-security.js');

const argv = process.argv.slice(2);
const root = path.resolve(argv[0] && !argv[0].startsWith('--') ? argv.shift() : '.');
const jsonMode = argv.includes('--json');

const reports = path.join(root, 'reports');
const pendingFile = path.join(reports, 'account-auth-drill-pending.json');
const evidenceFile = path.join(reports, 'account-auth-drill-evidence.json');

const dbUrl = String(process.env.DATABASE_URL || '').trim();
const secret = String(process.env.CFS_ACCOUNT_ELEVATION_SECRET || '');

function fail(message, code = 2) {
  console.error(`R62 Progress v23: BLOCKED · ${String(message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'postgresql://[redacted]')}`);
  process.exit(code);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function counts(rows) {
  const result = {};
  for (const row of rows) {
    result[row.event_type] = (result[row.event_type] || 0) + 1;
  }
  return result;
}

function bool(value) {
  return value ? 'DONE' : 'OPEN';
}

async function openDb() {
  if (!dbUrl) throw new Error('DATABASE_URL fehlt.');
  const sec = databaseRuntimeSecurity({ databaseUrl: dbUrl, nodeEnv: 'production' });
  const pg = await import('pg');
  const Pool = pg.Pool || pg.default?.Pool;
  return new Pool({
    connectionString: dbUrl,
    ...sec.poolOptions,
    max: 2
  });
}

try {
  if (fs.existsSync(evidenceFile)) {
    const evidence = readJson(evidenceFile);
    if (secret.length >= 32 && verifyAuthDrillRecord(evidence, secret) && evidence.status === 'LIVE_AUTH_PASS') {
      const output = {
        pass: 'R62',
        status: 'LIVE_AUTH_PASS',
        complete: true,
        verified_at: evidence.verified_at || null,
        drill_id: evidence.drill_id || null,
        steps: {
          temporary_passkey_added: true,
          passkey_login: true,
          passkey_stepup: true,
          totp_login: true,
          totp_stepup: true,
          recovery_stepup: true,
          temporary_passkey_removed: true
        }
      };
      if (jsonMode) console.log(JSON.stringify(output, null, 2));
      else {
        console.log('R62 Progress v23');
        console.log('Status: LIVE_AUTH_PASS');
        console.log('Alle sieben Production-Schritte wurden bereits als signierte Evidence verifiziert.');
      }
      process.exit(0);
    }
  }

  if (!fs.existsSync(pendingFile)) {
    fail('Keine gültige R62 Pending-Datei gefunden. Zuerst `npm run auth:drill -- --prepare --email <TESTMAIL>` im sicheren Production-Runner ausführen.');
  }

  if (secret.length < 32) {
    fail('CFS_ACCOUNT_ELEVATION_SECRET fehlt oder ist zu kurz. Ohne Secret wird die Pending-Datei nicht vertraut.');
  }

  const pending = readJson(pendingFile);
  if (!verifyAuthDrillRecord(pending, secret) || pending.status !== 'PENDING') {
    fail('R62 Pending-Datei ist manipuliert, unvollständig oder ungültig.');
  }

  const started = Date.parse(pending.started_at || '');
  const ageMs = Date.now() - started;
  const expired = !Number.isFinite(ageMs) || ageMs < 0 || ageMs > 4 * 60 * 60 * 1000;

  if (expired) {
    fail('Das vierstündige R62 Drill-Fenster ist abgelaufen. Bitte den Drill neu vorbereiten.');
  }

  const db = await openDb();
  try {
    const rows = (await db.query(
      `SELECT event_type, created_at
         FROM creator_security_events
        WHERE creator_id=$1
          AND created_at >= $2::timestamptz
        ORDER BY created_at ASC`,
      [pending.creator_id, pending.started_at]
    )).rows;

    const currentPasskeys = Number(
      (await db.query(
        `SELECT COUNT(*)::int AS count
           FROM creator_webauthn_credentials
          WHERE creator_id=$1`,
        [pending.creator_id]
      )).rows[0]?.count || 0
    );

    const c = counts(rows);

    const steps = {
      temporary_passkey_added: (c.passkey_added || 0) >= 1,
      passkey_login: (c.login_success_passkey || 0) >= 1,
      passkey_stepup: (c.account_elevation_passkey_granted || 0) >= 1,
      totp_login: (c.login_success_mfa || 0) >= 1,
      totp_stepup: (c.account_elevation_totp_granted || 0) >= 1,
      recovery_stepup:
        (c.account_elevation_recovery_granted || 0) >= 1 &&
        Number(c.mfa_recovery_code_used || 0) === 1,
      temporary_passkey_removed:
        (c.passkey_removed || 0) >= 1 &&
        currentPasskeys === Number(pending.baseline_passkeys)
    };

    const ordered = [
      ['temporary_passkey_added', 'Temporären Passkey hinzufügen'],
      ['passkey_login', 'Passkey-Login'],
      ['passkey_stepup', 'Sensible Aktion mit Passkey-Step-up'],
      ['totp_login', 'TOTP-Login'],
      ['totp_stepup', 'Sensible Aktion mit TOTP-Step-up'],
      ['recovery_stepup', 'Genau einen Recovery-Code-Step-up'],
      ['temporary_passkey_removed', 'Temporären Passkey wieder entfernen']
    ];

    const done = ordered.filter(([key]) => steps[key]).length;
    const next = ordered.find(([key]) => !steps[key]);

    const output = {
      pass: 'R62',
      status: done === ordered.length ? 'READY_TO_VERIFY' : 'IN_PROGRESS',
      complete: false,
      drill_id: pending.drill_id,
      started_at: pending.started_at,
      expires_at: new Date(started + 4 * 60 * 60 * 1000).toISOString(),
      baseline_passkeys: Number(pending.baseline_passkeys),
      current_passkeys: currentPasskeys,
      done,
      total: ordered.length,
      next_step: next ? next[1] : 'Jetzt offiziellen --verify-Lauf ausführen',
      steps,
      observed_event_types: Object.keys(c).sort()
    };

    if (jsonMode) {
      console.log(JSON.stringify(output, null, 2));
      process.exit(0);
    }

    console.log('R62 Progress v23');
    console.log(`Status: ${output.status}`);
    console.log(`Fortschritt: ${done}/${ordered.length}`);
    console.log('');

    ordered.forEach(([key, label], index) => {
      console.log(`${String(index + 1).padStart(2, '0')}. ${bool(steps[key]).padEnd(4)} · ${label}`);
    });

    console.log('');
    console.log(`Nächster Schritt: ${output.next_step}`);

    if (done === ordered.length) {
      console.log('');
      console.log('Alle erwarteten Production-Events sind sichtbar.');
      console.log('Noch KEIN PASS: jetzt den bestehenden signierten Verify-Lauf ausführen:');
      console.log('  npm run auth:drill -- --verify');
    } else {
      console.log('');
      console.log('Es wird nichts automatisch bestätigt, entfernt oder ausgelöst.');
      console.log('Führe nur den nächsten offenen Schritt manuell in Production aus und rufe danach diesen Status erneut auf.');
    }
  } finally {
    await db.end().catch(() => {});
  }
} catch (error) {
  fail(error?.message || error);
}

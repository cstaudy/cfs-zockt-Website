"use strict";

const DEFAULT_LOCK_NAMESPACE = 68068;
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_POLL_MS = 350;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withDatabaseBootstrapLock(pool, task, {
  namespace = DEFAULT_LOCK_NAMESPACE,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollMs = DEFAULT_POLL_MS,
  onWait = null
} = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool fehlt.");
  if (typeof task !== "function") throw new TypeError("Bootstrap task fehlt.");

  const client = await pool.connect();
  let locked = false;
  let destroyConnection = false;
  const startedAt = Date.now();

  try {
    while (!locked) {
      const result = await client.query(
        "SELECT pg_try_advisory_lock(hashtext(current_database()), $1::int) AS locked",
        [Number(namespace)]
      );
      locked = result.rows?.[0]?.locked === true;
      if (locked) break;

      const elapsed = Date.now() - startedAt;
      if (elapsed >= timeoutMs) {
        throw new Error("Datenbank-Schema-Bootstrap ist bereits auf einer anderen Instanz aktiv. Bitte Deploy erneut versuchen.");
      }
      if (typeof onWait === "function") onWait(elapsed);
      await wait(Math.min(pollMs, Math.max(25, timeoutMs - elapsed)));
    }

    return await task();
  } finally {
    if (locked) {
      try {
        const result = await client.query(
          "SELECT pg_advisory_unlock(hashtext(current_database()), $1::int) AS unlocked",
          [Number(namespace)]
        );
        if (result.rows?.[0]?.unlocked !== true) destroyConnection = true;
      } catch {
        destroyConnection = true;
      }
    }
    client.release(destroyConnection);
  }
}

module.exports = {
  DEFAULT_LOCK_NAMESPACE,
  DEFAULT_TIMEOUT_MS,
  withDatabaseBootstrapLock
};

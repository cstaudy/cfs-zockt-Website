import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const server = read('server.js');
const bridge = read('launcher/src/bridge-client.js');
const widget = read('public/assets/js/widget-studio.js');
const launcherPkg = JSON.parse(read('launcher/package.json'));
const env = read('.env.example');

const checks = [
  ['launcher version 0.47.17', launcherPkg.version === '0.47.17'],
  ['remote HTTP transport guard exists', bridge.includes('Unsichere Backend-URL blockiert') && bridge.includes('parsed.protocol !== "https:"')],
  ['localhost HTTP remains allowed for local QA', bridge.includes('host === "localhost"') && bridge.includes('127.0.0.1')],
  ['bridge protocol v3 advertised', bridge.includes('protocol_version: 3')],
  ['session-scoped event capability advertised', bridge.includes('session_scoped_events_v1: true')],
  ['events carry session id', bridge.includes('session_id: String(event.session_id || this.lastState.live?.session_id')],
  ['events carry client timestamp', bridge.includes('client_created_at: event.client_created_at || new Date().toISOString()')],
  ['server has per-event freshness windows', server.includes('BRIDGE_EVENT_MAX_AGE_MS') && server.includes('viewer_update: 2 * 60 * 1000')],
  ['future event guard exists', server.includes('BRIDGE_EVENT_FUTURE_SKEW_MS') && server.includes('future_event')],
  ['cross-session replay is dropped', server.includes('session_mismatch') && server.includes('eventSessionId !== currentSessionId')],
  ['stale bridge events are dropped', server.includes('stale_event') && server.includes('bridgeEventFreshness(event, nowMs)')],
  ['dropped events are reported', server.includes('accepted,') && server.includes('dropped,') && bridge.includes('droppedByServer')],
  ['widget backend has optimistic lock helper', server.includes('function widgetExpectedVersion')],
  ['widget draft protected from stale tab overwrite', server.includes('Dieses Widget wurde inzwischen in einem anderen Tab oder Gerät geändert')],
  ['widget publish protected from stale tab overwrite', server.includes('Vor dem Veröffentlichen wurde das Widget an anderer Stelle geändert')],
  ['widget live control protected from stale tab overwrite', server.includes('bevor du die Live-Steuerung fortsetzt')],
  ['widget UI sends expected version on draft', widget.includes('config:state.config,expected_version:state.widget.version')],
  ['widget UI sends expected version on publish', widget.includes('expected_version:state.widget.version')],
  ['release contract env bumped', env.includes('CFS_LAUNCHER_BUILD_TARGET_VERSION=0.47.17') && env.includes('CFS_RELEASE_EVIDENCE_VERSION=0.47.17')]
];
for (const [label, ok] of checks) {
  assert.equal(Boolean(ok), true, label);
  console.log('PASS ', label);
}
console.log(`\nTechnical foundation v136: ${checks.length}/${checks.length} PASS`);

#!/usr/bin/env node
'use strict';
/** Check local CommonJS dependencies before Render reports a successful build. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ROOT = path.resolve(__dirname, '..');
const targets = [path.join(ROOT, 'server.js')];
const libs = path.join(ROOT, 'lib');
for (const file of fs.readdirSync(libs)) {
  if (file.endsWith('.js')) targets.push(path.join(libs, file));
}
const PATTERN = /\brequire\s*\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g;
const missing = [];
let references = 0;
for (const file of targets) {
  const source = fs.readFileSync(file, 'utf8');
  const resolve = createRequire(file).resolve;
  let m;
  while ((m = PATTERN.exec(source)) !== null) {
    references += 1;
    try { resolve(m[2]); }
    catch (_) { missing.push(`${path.relative(ROOT, file)} -> ${m[2]}`); }
  }
  PATTERN.lastIndex = 0;
}
if (missing.length) {
  console.error('FEHLER: Lokale Servermodule fehlen:\n' + missing.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`OK: ${targets.length} Serverdateien, ${references} lokale Modulreferenzen aufloesbar.`);
}
const shopCatalog = path.join(ROOT, 'public/assets/data/shop-download-catalog-v32054.json');
const archives = path.join(ROOT, 'shop-downloads-v32054');
if (!fs.existsSync(shopCatalog) || !fs.existsSync(archives)) {
  console.log('HINWEIS: Alte Shop-Downloads v3.20.54 fehlen: Endpunkt bleibt sicher ohne Downloads.');
}

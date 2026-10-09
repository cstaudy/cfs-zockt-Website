#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'lib/shop-downloads-v32054.js'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfs-render-r12-'));
const site = path.join(temp, 'site');
const mdir = path.join(site, 'lib');
const catalogDir = path.join(site, 'public/assets/data');
const packages = path.join(site, 'shop-downloads-v32054');
const check = (name, cb) => { cb(); console.log('PASS:', name); };
try {
  for (const p of [mdir, catalogDir, packages]) fs.mkdirSync(p, { recursive: true });
  fs.writeFileSync(path.join(mdir, 'shop-downloads-v32054.js'), source);
  const mod = require(path.join(mdir, 'shop-downloads-v32054.js'));
  check('Absent historical catalog is fail-closed', () => {
    assert.equal(mod.productById('design-test'), null);
    assert.deepEqual(mod.publicCatalog().products, []);
    assert.equal(mod.publicCatalog().paid_checkout_enabled, false);
  });
  const catalog = path.join(catalogDir, 'shop-download-catalog-v32054.json');
  const zipName = 'test-design.zip';
  const zip = path.join(packages, zipName);
  const result = cp.spawnSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr("README.txt","Verified free beta design"); z.close()', zip], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Could not generate test ZIP');
  const expected = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
  const entry = { id: 'design-test', title: 'Testdesign', file: zipName, version: '1.0.0', sha256: expected, pricing_mode: 'beta' };
  const writeCatalog = products => fs.writeFileSync(catalog, JSON.stringify({ products }));
  writeCatalog([entry]);
  check('Verified explicit beta ZIP becomes available', () => {
    assert.equal(mod.publicCatalog().available_count, 1);
    assert.equal(mod.productById('design-test').id, 'design-test');
    assert.equal(mod.resolvePackage(mod.productById('design-test')), zip);
  });
  check('Paid products are never downloadable through legacy beta endpoint', () => {
    writeCatalog([{ ...entry, pricing_mode: 'paid' }]);
    assert.equal(mod.productById('design-test'), null);
    assert.equal(mod.publicCatalog().available_count, 0);
  });
  check('Path traversal and unexpected archive paths rejected', () => {
    writeCatalog([{ ...entry, file: '../package.json' }, { ...entry, id: 'bad/../id' }]);
    assert.equal(mod.publicCatalog().available_count, 0);
  });
  check('ZIP SHA mismatch disables product', () => {
    writeCatalog([entry]);
    fs.appendFileSync(zip, 'tampered');
    assert.equal(mod.productById('design-test'), null);
  });
  check('Missing ZIP remains unavailable', () => {
    fs.unlinkSync(zip);
    assert.equal(mod.publicCatalog().available_count, 0);
  });
  check('Missing module is detected by preflight', () => {
    // Verify preflight succeeds on the actual repository, and reports missing files elsewhere.
    const scan = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools/render-startup-preflight.cjs')], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(scan.status, 0, scan.stderr);
    assert.match(scan.stdout, /lokale Modulreferenzen aufloesbar/);
  });
  console.log('OK: 7/7 R12 startup-and-download tests passed.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

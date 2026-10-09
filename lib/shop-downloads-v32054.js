'use strict';
/**
 * Legacy Creator Shop Download Adapter (v3.20.54).
 *
 * The 3.20.71 repository references this module but does not ship either its
 * historical catalog JSON or the original private ZIPs. Do not invent products,
 * silently generate fake downloads, or serve files outside the private folder.
 * When the missing catalog and packages are restored with verified hashes, this
 * adapter can expose explicitly marked free/beta packages again.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'public', 'assets', 'data', 'shop-download-catalog-v32054.json');
const PRIVATE_DIR = path.join(ROOT, 'shop-downloads-v32054');
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,95}$/;
const ZIP_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,150}\.zip$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_CATALOG_BYTES = 1024 * 1024;
const MAX_PACKAGE_BYTES = 1024 * 1024 * 1024;

function sha256File(filename) {
  const hash = crypto.createHash('sha256');
  const file = fs.openSync(filename, 'r');
  const buffer = Buffer.allocUnsafe(128 * 1024);
  try {
    let count;
    while ((count = fs.readSync(file, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, count));
    }
    return hash.digest('hex');
  } finally {
    fs.closeSync(file);
  }
}

function readCatalog() {
  try {
    const stat = fs.lstatSync(CATALOG);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_CATALOG_BYTES) return [];
    const parsed = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
    return Array.isArray(parsed.products) ? parsed.products : [];
  } catch (_) {
    return [];
  }
}

function allowedProduct(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id : '';
  const file = typeof raw.file === 'string' ? raw.file : '';
  const sha256 = typeof raw.sha256 === 'string' ? raw.sha256.toLowerCase() : '';
  if (!ID_PATTERN.test(id) || !ZIP_PATTERN.test(file) || file === '.' || file === '..' || !HASH_PATTERN.test(sha256)) return null;
  // Never introduce an unverified paid entitlement or a real checkout via this
  // legacy beta-only endpoint. Unknown pricing is denied by default.
  if (raw.pricing_mode !== 'free' && raw.pricing_mode !== 'beta' && raw.beta_free !== true) return null;
  return {
    id,
    title: String(raw.title || raw.name || id).slice(0, 160),
    version: typeof raw.version === 'string' && /^\d+(?:\.\d+){0,3}$/.test(raw.version) ? raw.version : '1.0.0',
    file,
    sha256,
    pricing_mode: raw.pricing_mode === 'free' ? 'free' : 'beta'
  };
}

function resolvePackage(item) {
  try {
    const valid = allowedProduct(item);
    if (!valid) return null;
    const dirStat = fs.lstatSync(PRIVATE_DIR);
    if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) return null;
    const filename = path.join(PRIVATE_DIR, valid.file);
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 22 || stat.size > MAX_PACKAGE_BYTES) return null;
    // ZIP magic is only an early rejection; the SHA-256 is the actual integrity requirement.
    const fd = fs.openSync(filename, 'r');
    const magic = Buffer.alloc(4);
    try { fs.readSync(fd, magic, 0, 4, 0); } finally { fs.closeSync(fd); }
    if (magic.toString('hex') !== '504b0304' && magic.toString('hex') !== '504b0506') return null;
    if (sha256File(filename) !== valid.sha256) return null;
    return filename;
  } catch (_) {
    return null;
  }
}

function availableProducts() {
  return readCatalog().map(allowedProduct).filter(Boolean).filter(item => resolvePackage(item) !== null);
}

function productById(id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
  return availableProducts().find(item => item.id === id) || null;
}

function publicCatalog() {
  const products = availableProducts().map(({ id, title, version, pricing_mode }) => ({ id, title, version, pricing_mode }));
  return {
    products,
    available_count: products.length,
    availability: products.length ? 'available' : 'not_installed',
    // No misleading free downloads when the original private archives are missing.
    paid_checkout_enabled: false
  };
}

module.exports = { productById, resolvePackage, publicCatalog };

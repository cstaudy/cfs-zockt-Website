import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(process.argv[2] || ".");
const publicDir = path.join(root, "public");
const BASE = "https://cfs-zockt.de";

const INDEXABLE = new Map([
  ["index.html", `${BASE}/`],
  ["pages/creator-suite.html", `${BASE}/pages/creator-suite.html`],
  ["pages/plans.html", `${BASE}/pages/plans.html`],
  ["pages/roadmap.html", `${BASE}/pages/roadmap.html`],
  ["pages/support.html", `${BASE}/pages/support.html`],
  ["pages/security.html", `${BASE}/pages/security.html`],
  ["pages/impressum.html", `${BASE}/pages/impressum.html`],
  ["pages/datenschutz.html", `${BASE}/pages/datenschutz.html`],
  ["pages/nutzungsbedingungen.html", `${BASE}/pages/nutzungsbedingungen.html`],
]);

const errors = [];
const titles = new Map();
const descriptions = new Map();

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function one(html, re, label, rel) {
  const matches = [...html.matchAll(re)];
  if (matches.length !== 1) {
    errors.push(`${rel}: ${label} muss genau einmal vorkommen (gefunden: ${matches.length}).`);
    return "";
  }
  return matches[0][1]?.trim() || "";
}

for (const file of walk(publicDir).filter(f => f.endsWith(".html"))) {
  const rel = path.relative(publicDir, file).split(path.sep).join("/");
  const html = fs.readFileSync(file, "utf8");
  const robots = one(html, /<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/gi, "robots", rel).toLowerCase();

  if (INDEXABLE.has(rel)) {
    if (robots.includes("noindex")) errors.push(`${rel}: indexierbare Seite enthält noindex.`);
    const title = one(html, /<title>([\s\S]*?)<\/title>/gi, "title", rel).replace(/\s+/g," ");
    const desc = one(html, /<meta\s+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/gi, "description", rel);
    const canonical = one(html, /<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi, "canonical", rel);

    if (canonical !== INDEXABLE.get(rel)) errors.push(`${rel}: Canonical ist ${canonical || "leer"}, erwartet ${INDEXABLE.get(rel)}.`);
    if (!desc || desc.length < 50 || desc.length > 180) errors.push(`${rel}: Meta Description Länge unplausibel (${desc.length}).`);
    if (!title || title.length > 70) errors.push(`${rel}: Title fehlt oder ist zu lang (${title.length}).`);
    if (titles.has(title)) errors.push(`${rel}: doppelter Title mit ${titles.get(title)}.`); else titles.set(title, rel);
    if (descriptions.has(desc)) errors.push(`${rel}: doppelte Description mit ${descriptions.get(desc)}.`); else descriptions.set(desc, rel);

    const expectedOg = {
      "og:type":"website",
      "og:site_name":"cfs_zockt",
      "og:locale":"de_AT",
      "og:url":INDEXABLE.get(rel),
      "og:image":`${BASE}/assets/img/social-preview.jpg`,
    };
    for (const [prop, expected] of Object.entries(expectedOg)) {
      const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const val = one(html, new RegExp(`<meta\\s+property=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "gi"), prop, rel);
      if (val !== expected) errors.push(`${rel}: ${prop} ist ${val || "leer"}, erwartet ${expected}.`);
    }
    for (const prop of ["og:title","og:description","og:image:width","og:image:height","og:image:alt"]) {
      const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      one(html, new RegExp(`<meta\\s+property=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "gi"), prop, rel);
    }
    for (const name of ["twitter:card","twitter:title","twitter:description","twitter:image"]) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      one(html, new RegExp(`<meta\\s+name=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "gi"), name, rel);
    }
    one(html, /<link\s+rel=["']manifest["'][^>]*href=["']([^"']+)["'][^>]*>/gi, "manifest", rel);
  } else {
    if (!robots.includes("noindex")) errors.push(`${rel}: interne/Runtime-Seite braucht noindex.`);
    const canonicals = [...html.matchAll(/<link\s+rel=["']canonical["']/gi)].length;
    if (canonicals) errors.push(`${rel}: noindex-Seite soll keinen Canonical-Tag tragen.`);
  }
}

// Homepage structured data: Organization + WebSite + Creator-Suite description as WebPage.
const home = fs.readFileSync(path.join(publicDir,"index.html"),"utf8");
const jsonLdMatches = [...home.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*data-cfs-seo[^>]*>([\s\S]*?)<\/script>/gi)];
if (jsonLdMatches.length !== 1) {
  errors.push(`index.html: genau ein cfs_zockt JSON-LD Block erwartet (gefunden: ${jsonLdMatches.length}).`);
} else {
  try {
    const raw = jsonLdMatches[0][1];
    const data = JSON.parse(raw);
    const types = new Set((data["@graph"] || []).map(x => x["@type"]).flat());
    for (const type of ["Organization","WebSite","WebPage"]) if (!types.has(type)) errors.push(`index.html JSON-LD: ${type} fehlt.`);
    const hash = crypto.createHash("sha256").update(raw,"utf8").digest("base64");
    const token = `sha256-${hash}`;
    for (const file of ["server.js", path.join("public","_headers")]) {
      const source = fs.readFileSync(path.join(root,file),"utf8");
      if (!source.includes(token)) errors.push(`${file}: CSP-Hash für JSON-LD fehlt (${token}).`);
    }
  } catch (err) {
    errors.push(`index.html JSON-LD ist kein gültiges JSON: ${err.message}`);
  }
}

// Sitemap must contain exactly the indexable canonical URLs, no priority/changefreq noise.
const sitemap = fs.readFileSync(path.join(publicDir,"sitemap.xml"),"utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const expectedUrls = [...INDEXABLE.values()];
if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedUrls)) errors.push(`sitemap.xml: URL-Liste stimmt nicht exakt mit den indexierbaren Canonicals überein.`);
if (/<priority>|<changefreq>/i.test(sitemap)) errors.push(`sitemap.xml: priority/changefreq entfernen; Google ignoriert diese Werte.`);

const robots = fs.readFileSync(path.join(publicDir,"robots.txt"),"utf8");
if (!robots.includes(`Sitemap: ${BASE}/sitemap.xml`)) errors.push("robots.txt: Sitemap-Verweis fehlt.");
for (const blocked of ["/api/","/auth/","/widgets/","/games/runtime.html"]) if (!robots.includes(`Disallow: ${blocked}`)) errors.push(`robots.txt: Disallow ${blocked} fehlt.`);
const robotLines = robots.split(/\r?\n/).map(line => line.trim());
for (const u of expectedUrls) {
  const pathname = new URL(u).pathname;
  if (robotLines.includes(`Disallow: ${pathname}`)) errors.push(`robots.txt blockiert indexierbare Seite ${pathname}.`);
}

const manifestPath = path.join(publicDir,"site.webmanifest");
if (!fs.existsSync(manifestPath)) errors.push("site.webmanifest fehlt.");
else {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath,"utf8"));
    if (manifest.name !== "cfs_zockt Creator Suite") errors.push("site.webmanifest: Name unerwartet.");
    for (const icon of manifest.icons || []) {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//,""));
      if (!fs.existsSync(iconPath)) errors.push(`site.webmanifest: Icon fehlt: ${icon.src}`);
    }
  } catch (err) { errors.push(`site.webmanifest ungültig: ${err.message}`); }
}

const social = path.join(publicDir,"assets/img/social-preview.jpg");
if (!fs.existsSync(social) || fs.statSync(social).size < 10000) errors.push("Social Preview fehlt oder ist unerwartet klein.");

const server = fs.readFileSync(path.join(root,"server.js"),"utf8");
for (const route of ["/index.html","/pages/creator-suite","/pages/plans","/pages/roadmap","/pages/support","/pages/security","/pages/impressum","/pages/datenschutz","/pages/nutzungsbedingungen"]) {
  if (!server.includes(`[\"${route}\"`)) errors.push(`server.js: Canonical-Redirect für ${route} fehlt.`);
}
if (!server.includes('"X-Robots-Tag"')) errors.push("server.js: X-Robots-Tag für Runtime/API fehlt.");

if (errors.length) {
  console.error("SEO PASS CHECK: FEHLER");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`SEO PASS CHECK: OK`);
console.log(`- ${INDEXABLE.size} indexierbare Canonical-Seiten`);
console.log(`- ${walk(publicDir).filter(f=>f.endsWith(".html")).length - INDEXABLE.size} interne/Runtime-Seiten auf noindex`);
console.log(`- OpenGraph/Twitter + Manifest + Sitemap + robots geprüft`);
console.log(`- Organization/WebSite/Creator-Suite JSON-LD + CSP-Hash geprüft`);

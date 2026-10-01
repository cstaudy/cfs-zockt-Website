import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const results = [];
const check = (name, ok, detail = "") => results.push({name, ok:Boolean(ok), detail:String(detail || "")});

const legalPages = [
  ["public/pages/impressum.html", "https://cfs-zockt.de/pages/impressum.html"],
  ["public/pages/datenschutz.html", "https://cfs-zockt.de/pages/datenschutz.html"],
  ["public/pages/nutzungsbedingungen.html", "https://cfs-zockt.de/pages/nutzungsbedingungen.html"],
];

for (const [rel, canonical] of legalPages) {
  const html = read(rel);
  const robots = (html.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] || "").toLowerCase();
  check(`${rel} noindex`, robots.includes("noindex"));
  check(`${rel} follow`, robots.includes("follow"));
  check(`${rel} noarchive`, robots.includes("noarchive"));
  check(`${rel} nosnippet`, robots.includes("nosnippet"));
  check(`${rel} canonical bleibt stabil`, html.includes(`<link rel="canonical" href="${canonical}">`));
  check(`${rel} bleibt öffentlich navigierbar`, html.includes('href="/"') && html.includes('/pages/support.html'));
}

const sitemap = read("public/sitemap.xml");
for (const [, canonical] of legalPages) {
  check(`sitemap enthält ${canonical} nicht`, !sitemap.includes(canonical));
}
check("sitemap behält Homepage", sitemap.includes("https://cfs-zockt.de/</loc>"));
check("sitemap behält Creator Suite", sitemap.includes("https://cfs-zockt.de/pages/creator-suite.html"));
check("sitemap behält Launcher Download", sitemap.includes("https://cfs-zockt.de/pages/launcher-download.html"));

const robotsTxt = read("public/robots.txt");
for (const route of ["/pages/impressum.html", "/pages/datenschutz.html", "/pages/nutzungsbedingungen.html"]) {
  check(`robots.txt blockiert ${route} nicht`, !robotsTxt.split(/\r?\n/).map(x=>x.trim()).includes(`Disallow: ${route}`));
}
check("robots.txt behält Sitemap", robotsTxt.includes("Sitemap: https://cfs-zockt.de/sitemap.xml"));

const server = read("server.js");
check("server legal X-Robots header vorhanden", server.includes('"noindex, follow, noarchive, nosnippet"'));
for (const route of ["/pages/impressum.html", "/pages/datenschutz.html", "/pages/nutzungsbedingungen.html"]) {
  check(`server schützt ${route} mit X-Robots`, server.includes(`req.path === "${route}"`));
}

const home = read("public/index.html");
for (const route of ["/pages/impressum.html", "/pages/datenschutz.html", "/pages/nutzungsbedingungen.html"]) {
  check(`Homepage Footer behält ${route}`, home.includes(`href="${route}"`));
}

const publicDir = path.join(root, "public");
const allowedIdentityFiles = new Set([
  "pages/impressum.html",
  "pages/datenschutz.html",
  "pages/nutzungsbedingungen.html",
]);
const emailFiles = new Set();
const mailtoFiles = new Set();
const telFiles = new Set();
function walk(dir) {
  const out=[];
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,e.name);
    if (e.isDirectory()) out.push(...walk(full)); else out.push(full);
  }
  return out;
}
for (const f of walk(publicDir)) {
  if (!/\.(html|js|json|xml|txt)$/i.test(f)) continue;
  const rel=path.relative(publicDir,f).split(path.sep).join("/");
  const source=fs.readFileSync(f,"utf8");
  const emails = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const realEmails = emails.filter(email => !/@(?:example\.|beispiel\.)/i.test(email));
  if (realEmails.length) emailFiles.add(rel);
  if (/mailto:/i.test(source)) mailtoFiles.add(rel);
  if (/tel:/i.test(source)) telFiles.add(rel);
}
check("öffentliche E-Mail-Adressen nur auf Rechtseiten", [...emailFiles].every(x=>allowedIdentityFiles.has(x)) && emailFiles.size > 0, [...emailFiles].join(", "));
check("mailto nur auf Rechtseiten", [...mailtoFiles].every(x=>allowedIdentityFiles.has(x)) && mailtoFiles.size > 0, [...mailtoFiles].join(", "));
check("keine Telefonnummer-Links im Public-Bereich", telFiles.size === 0, [...telFiles].join(", "));

const pkg = JSON.parse(read("package.json"));
const backendParts=String(pkg.version||"").split(".").map(Number);
const backendAtLeast163=backendParts.length===3&&(backendParts[0]>3||(backendParts[0]===3&&(backendParts[1]>20||(backendParts[1]===20&&backendParts[2]>=9))));
check("Backend package version at least 3.20.9", backendAtLeast163, pkg.version);
check("Backend runtime matches package version", server.includes(`const BACKEND_VERSION =\n    "${pkg.version}";`));
check("release:v163 verdrahtet", pkg.scripts?.["release:v163"] === "npm run release:v162 && npm run legal-public163:check");

const failed=results.filter(x=>!x.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} · ${r.name}${r.detail ? ` · ${r.detail}` : ""}`);
console.log(`\n${results.length-failed.length}/${results.length} PASS`);
if (failed.length) process.exit(1);

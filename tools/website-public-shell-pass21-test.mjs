import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const pages = [
  ["public/index.html", "START"],
  ["public/pages/creator-suite.html", "CREATOR SUITE"],
  ["public/pages/plans.html", "PLÄNE"],
  ["public/pages/roadmap.html", "ROADMAP"],
  ["public/pages/support.html", "SUPPORT"],
  ["public/pages/security.html", "SICHERHEIT"],
  ["public/pages/impressum.html", null],
  ["public/pages/datenschutz.html", null],
  ["public/pages/nutzungsbedingungen.html", null],
];
const required = [
  'class="site-header brand-header public-site-header"',
  'class="nav brand-nav public-nav"',
  'href="/pages/creator-suite.html"',
  'href="/pages/plans.html"',
  'href="/pages/roadmap.html"',
  'href="/pages/security.html"',
  'href="/pages/support.html"',
  'data-login-link',
  'data-auth-cta',
  'class="footer brand-footer public-footer"',
  'href="/pages/impressum.html"',
  'href="/pages/datenschutz.html"',
  'href="/pages/nutzungsbedingungen.html"',
];
let failed = 0;
function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed++;
}
for (const [rel, active] of pages) {
  const file = path.join(root, rel);
  const html = fs.readFileSync(file, "utf8");
  for (const token of required) check(html.includes(token), `${rel} · ${token}`);
  const navMatch = html.match(/<nav class="nav brand-nav public-nav"[\s\S]*?<\/nav>/i);
  const navHtml = navMatch?.[0] || "";
  check(!navHtml.includes('href="/pages/dashboard.html"'), `${rel} · public nav has no dashboard link`);
  check(!navHtml.includes('href="/pages/account.html"'), `${rel} · public nav has no account link`);
  if (active) {
    const activeHref = {
      "START":"/",
      "CREATOR SUITE":"/pages/creator-suite.html",
      "PLÄNE":"/pages/plans.html",
      "ROADMAP":"/pages/roadmap.html",
      "SUPPORT":"/pages/support.html",
      "SICHERHEIT":"/pages/security.html",
    }[active];
    check(html.includes(`class="active" href="${activeHref}"`), `${rel} · active nav ${active}`);
  }
}
for (const rel of ["public/pages/impressum.html","public/pages/datenschutz.html","public/pages/nutzungsbedingungen.html"]) {
  const html = fs.readFileSync(path.join(root,rel),"utf8");
  check(html.includes('href="/assets/css/styles.css"'), `${rel} · shared styles`);
  check(html.includes('src="/assets/js/app.js"'), `${rel} · shared app js`);
}
if (failed) {
  console.error(`\n${failed} public shell checks failed.`);
  process.exit(1);
}
console.log("\nPublic website shell Pass 21.3.2 passed.");

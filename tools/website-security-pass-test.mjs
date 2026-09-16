import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const fail = message => { throw new Error(`Website Security Pass: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };

const server = read("server.js");
const appJs = read("public/assets/js/app.js");
const headers = read("public/_headers");
const redirects = read("public/_redirects");
const envExample = read(".env.example");

expect(server.includes('"Content-Security-Policy"'), "CSP fehlt im Express-Backend.");
const scriptSrc = server.match(/"script-src ([^"]+)"/)?.[1] || "";
expect(scriptSrc.startsWith("'self'"), "script-src muss mit self beginnen.");
expect(!scriptSrc.includes("'unsafe-inline'"), "script-src darf kein unsafe-inline enthalten.");
expect(!scriptSrc.includes("'unsafe-eval'"), "script-src darf kein unsafe-eval enthalten.");
expect(server.includes('"script-src-attr \'none\'"'), "Inline-Eventhandler müssen per CSP blockiert sein.");
expect(server.includes('"frame-ancestors \'self\'"'), "frame-ancestors self fehlt.");
expect(server.includes('"X-Frame-Options"') && server.includes('"SAMEORIGIN"'), "SAMEORIGIN-Frame-Schutz fehlt.");
expect(server.includes('"X-XSS-Protection"') && server.includes('"0"'), "Legacy-XSS-Filter muss deaktiviert sein.");
expect(server.includes("ALLOWED_REQUEST_HOSTS"), "Host-Allowlist fehlt.");
expect(server.includes("RATE_LIMITER_MAX_KEYS"), "Rate-Limiter-Store ist nicht begrenzt.");
expect(server.includes("req.secure"), "HTTPS-Fallbackprüfung fehlt.");
expect(server.includes("Sec-Fetch-Site"), "Fetch-Metadata-CSRF-Schutz fehlt.");
expect(server.includes("X-CSRF-Token"), "CSRF-Headerprüfung fehlt.");
expect(server.includes("createHmac(\"sha256\", CSRF_SIGNING_SECRET)"), "Signierte CSRF-Tokens fehlen.");
expect(server.includes("reviewAbuseResult"), "DB-gestützter Review-Missbrauchsschutz fehlt.");
expect(appJs.includes('headers.set("X-CSRF-Token", csrf)'), "Frontend sendet keinen CSRF-Header.");
expect(headers.includes("Content-Security-Policy:"), "Statische CSP fehlt.");
expect(headers.includes("Strict-Transport-Security: max-age=31536000"), "Statisches HSTS fehlt.");
expect(!headers.includes("Strict-Transport-Security: max-age=31536000; includeSubDomains"), "includeSubDomains darf nicht ohne bewusste Freigabe statisch erzwungen werden.");
expect(/https:\/\/www\.cfs-zockt\.de\/\*\s+https:\/\/cfs-zockt\.de\/:splat\s+301/.test(redirects), "www -> non-www Redirect fehlt.");
for (const key of ["CFS_ALLOWED_HOSTS", "CFS_HSTS_INCLUDE_SUBDOMAINS", "CFS_HSTS_PRELOAD", "CFS_CSRF_SIGNING_SECRET", "CFS_PUBLIC_REVIEW_HASH_SALT"]) {
  expect(envExample.includes(`${key}=`), `${key} fehlt in .env.example.`);
}

const htmlFiles = [];
const walk = dir => {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
};
walk(path.join(root, "public"));

const inlineScript = /<script(?![^>]*\bsrc\s*=)(?![^>]*\btype=["\']application\/ld\+json["\'])[^>]*>[\s\S]*?<\/script>/i;
const inlineHandler = /\son[a-z]+\s*=/i;
const javascriptUrl = /(?:href|src)\s*=\s*["']\s*javascript:/i;
const insecureSubresource = /(?:src|href|action)\s*=\s*["']http:\/\//i;

for (const file of htmlFiles) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  expect(!inlineScript.test(text), `Inline-Script gefunden: ${rel}`);
  expect(!inlineHandler.test(text), `Inline-Eventhandler gefunden: ${rel}`);
  expect(!javascriptUrl.test(text), `javascript:-URL gefunden: ${rel}`);
  expect(!insecureSubresource.test(text), `HTTP-Subresource gefunden: ${rel}`);
}

console.log(`Website Security Pass OK · ${htmlFiles.length} HTML-Dateien geprüft.`);

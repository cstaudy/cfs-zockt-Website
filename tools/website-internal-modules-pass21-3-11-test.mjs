import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const pages = path.join(root, "public", "pages");
let failed = 0;
let passed = 0;
function check(ok, label) {
  if (ok) { console.log("PASS", label); passed++; }
  else { console.error("FAIL", label); failed++; }
}
function read(name) { return fs.readFileSync(path.join(pages, name), "utf8"); }

const connect = read("launcher-connect.html");
check(connect.includes('id="deviceCode"') && connect.includes('id="deviceInfo"') && connect.includes('id="accountInfo"'), "device link keeps review IDs");
check(connect.includes('id="confirmDevice"') && connect.includes('id="connectResult"'), "device link keeps action/result IDs");
check(connect.includes("Code vergleichen") && connect.includes("Gerät prüfen") && connect.includes("Einmal bestätigen"), "device link has three-step confirmation flow");
check(connect.includes("Bestätige keinen Code aus Chat, E-Mail oder einer fremden Bildschirmfreigabe"), "device link warns against foreign codes");
check(connect.includes('/pages/launcher.html') && connect.includes('/pages/account.html'), "device link offers safe exits");

const nexus = read("nexus.html");
check(nexus.includes('data-tool-entry="nexus"') && nexus.includes("PREVIEW"), "NEXUS is marked as preview");
check(nexus.includes('id="service"') && nexus.includes('id="serviceStatus"') && nexus.includes('id="plan"') && nexus.includes('id="version"') && nexus.includes('id="allowed"'), "NEXUS keeps status IDs");
check(nexus.includes('id="integrations"') && nexus.includes('id="notice"'), "NEXUS keeps integration/result IDs");
check(nexus.includes("verändert keine Verbindungen automatisch") && nexus.includes("Prepared"), "NEXUS explains status boundaries");
check(nexus.includes('/api/nexus/status'), "NEXUS documents real status source");

const audio = read("audio-studio.html");
check(audio.includes('data-tool-entry="audio-studio"') && audio.includes("ROADMAP"), "Audio Studio is marked as roadmap");
check(audio.includes('id="locked"') && audio.includes('id="audioApp"') && audio.includes('id="audioForm"') && audio.includes('id="message"'), "Audio Studio keeps functional IDs");
check(audio.includes('name="preset_name"') && audio.includes('name="master"') && audio.includes('name="voice"') && audio.includes('name="game"') && audio.includes('name="soundboard"'), "Audio Studio keeps preset fields");
check(audio.includes("nicht in der Cloud verarbeitet") && audio.includes("lokal über den Launcher"), "Audio Studio keeps local-processing boundary");
check(audio.includes("Soundboard") && audio.includes("Voice Chain") && audio.includes("Stream Mixer"), "Audio Studio keeps roadmap modules");

const editor = read("editor.html");
check(editor.includes('data-tool-entry="creator-editor"') && editor.includes('id="editorWorkspace"'), "Creator Editor has unified entry");
check(editor.includes('/pages/widget-studio.html') && editor.includes('/pages/scene-studio.html'), "Creator Editor links to modern studios");
check(editor.includes('id="editorForm"') && editor.includes('id="creatorName"') && editor.includes('id="creatorPlan"'), "Creator Editor keeps core functional IDs");

for (const file of ["launcher-connect.html","nexus.html","audio-studio.html","editor.html"]) {
  const html = read(file);
  check(html.includes('data-creator-nav') && html.includes('data-logout'), `${file} keeps Creator Suite shell`);
  check(html.includes('noindex,nofollow,noarchive'), `${file} stays noindex`);
}

const css = fs.readFileSync(path.join(root,"public","assets","css","styles.css"),"utf8");
check(css.includes("Pass 21.3.11 — Remaining creator modules") && css.includes(".device-link-steps") && css.includes(".internal-status-shell") && css.includes(".internal-module-next"), "Pass 21.3.11 shared styles present");

if (failed) {
  console.error(`Internal Modules Pass 21.3.11: ${failed} failed / ${passed} passed`);
  process.exit(1);
}
console.log(`Internal Modules Pass 21.3.11: ${passed}/${passed} PASS`);

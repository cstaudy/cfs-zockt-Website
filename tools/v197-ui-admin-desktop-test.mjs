import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||".");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const exists=rel=>fs.existsSync(path.join(root,rel));
let pass=0,fail=0;
function check(ok,label){if(ok){pass++;console.log(`PASS ${label}`);}else{fail++;console.error(`FAIL ${label}`);}}

const required=[
  "public/assets/css/cfs-brand-v197.css",
  "public/pages/admin.html",
  "public/assets/css/admin-hub-v197.css",
  "public/assets/js/page-admin-v197.js",
  "admin-desktop/package.json",
  "admin-desktop/main.js",
  "admin-desktop/preload.js",
  "BUILD-CFS-ADMIN-WINDOWS.cmd"
];
for(const rel of required)check(exists(rel),`required ${rel}`);

const htmlFiles=[];
for(const dir of ["public","public/pages"]){
  const abs=path.join(root,dir);
  for(const name of fs.readdirSync(abs))if(name.endsWith(".html"))htmlFiles.push(path.join(dir,name));
}
for(const rel of htmlFiles)check(read(rel).includes("/assets/js/cfs-shell-v3.js"),`shell ${rel}`);

const shell=read("public/assets/js/cfs-shell-v3.js");
check(shell.includes("cfs-brand-v197.css"),"shell loads v197 brand layer");
check(shell.includes('/pages/admin.html'),"shell exposes admin hub to admins");
check(shell.includes("gaming-footer-brand, .cfs-footer-v165-brand"),"footer brand normalization");

const aiPage=read("public/pages/cfs-ai.html");
check(aiPage.includes("cfs-zockt-mark-clean.png"),"CFS AI uses cleaned standard mark");
check(!aiPage.includes("cfs-zockt-wordmark-transparent.png"),"CFS AI no mismatched wordmark");
check(aiPage.includes("data-cfs-brand-v197"),"CFS AI first-paint v197 brand");

const login=read("public/assets/js/page-login.js");
check(login.includes("postLoginDestination"),"login has role-aware destination");
check(login.includes('/pages/admin.html'),"admins default to admin hub");

const adminPage=read("public/pages/admin.html");
check(adminPage.includes('name="robots" content="noindex,nofollow,noarchive"'),"admin hub noindex");
check(adminPage.includes("page-admin-v197.js"),"admin hub controller");
const adminJs=read("public/assets/js/page-admin-v197.js");
check(adminJs.includes("/api/account/me"),"admin hub checks account");
check(adminJs.includes("/api/creator/cfs-ai/status"),"admin hub checks AI");
check(adminJs.includes("/api/creator/cfs-ai/bridge"),"admin hub checks bridge");

const desktopMain=read("admin-desktop/main.js");
check(desktopMain.includes("nodeIntegration: false"),"desktop nodeIntegration disabled");
check(desktopMain.includes("contextIsolation: true"),"desktop context isolation enabled");
check(desktopMain.includes("sandbox: true"),"desktop sandbox enabled");
check(desktopMain.includes("persist:cfs-admin"),"desktop persistent admin session");
check(desktopMain.includes("start_bridge_mode_windows.bat"),"desktop local AI launcher");
check(desktopMain.includes("127.0.0.1:8000/api/status"),"desktop checks local AI status");
check(desktopMain.includes("127.0.0.1:11434/api/tags"),"desktop checks Ollama status");

const env=read(".env.example");
check(/CFS_AI_BRIDGE_TOKEN=\s*(?:\r?\n|$)/.test(env),"GitHub example bridge token remains empty");
check(env.includes("APP_BASE_URL=https://cfs-zockt.de"),"production example domain correct");

const secretPattern=/CFS_AI_BRIDGE_TOKEN=([^\r\n]+)/g;
for(const rel of [".env.example","README.md","admin-desktop/README.md","public/pages/admin.html","public/assets/js/page-admin-v197.js"]){
  const src=read(rel); let exposed=false; let m;
  while((m=secretPattern.exec(src)))if(String(m[1]||"").trim().length>=24)exposed=true;
  check(!exposed,`no bridge secret in ${rel}`);
}

const pkg=JSON.parse(read("package.json"));
check(pkg.scripts?.["v197:check"],"root v197 check script");
const desktopPkg=JSON.parse(read("admin-desktop/package.json"));
check(desktopPkg.build?.appId==="de.cfszockt.admin","desktop app id");
check(desktopPkg.build?.win?.target?.[0]?.target==="nsis","desktop Windows NSIS target");

console.log(`\nCFS v197 UI/Admin Desktop: ${pass}/${pass+fail} PASS`);
if(fail)process.exit(1);

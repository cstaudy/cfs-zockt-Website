import {spawnSync} from "node:child_process";
import path from "node:path";

const root=path.resolve(process.argv[2]||".");
const commands=[
  ["syntax",["npm","run","check"]],
  ["security",["npm","run","security:check"]],
  ["seo",["npm","run","seo:check"]],
  ["funnel",["npm","run","funnel:check"]],
  ["reviews",["npm","run","reviews:check"]],
  ["widget-ux30",["npm","run","ux30:check"]],
  ["widget-coreflows",["npm","run","coreflows:check"]],
  ["security3",["npm","run","security3:check"]],
  ["lifecycle",["npm","run","lifecycle:check"]],
  ["credential",["npm","run","credential:check"]],
  ["mail-recovery",["npm","run","mailrecovery:check"]],
  ["mfa",["npm","run","mfa:check"]],
  ["passkey",["npm","run","passkey:check"]],
  ["login-anomaly",["npm","run","anomaly:check"]],
  ["request-integrity",["npm","run","requestintegrity:check"]],
  ["dependency-baseline",["npm","run","supply:check"]],
  ["lockfiles",["npm","run","lockfiles:check"]],
  ["security59",["npm","run","security59:check"]],
  ["security60",["npm","run","security60:check"]],
  ["security61",["npm","run","security61:check"]],
  ["security62",["npm","run","security62:check"]],
  ["security63",["npm","run","security63:check"]],
  ["security64",["npm","run","security64:check"]],
  ["security65",["npm","run","security65:check"]],
  ["security66",["npm","run","security66:check"]],
  ["security67",["npm","run","security67:check"]],
  ["security68",["npm","run","security68:check"]],
  ["deployment",["npm","run","deployment13:check"]],
  ["public-resilience",["npm","run","resilience15:check"]],
  ["admin-stepup",["npm","run","admin16:check"]],
  ["admin-audit",["npm","run","admin17:check"]],
  ["db-recovery",["npm","run","recovery18:check"]],
  ["app-recovery",["npm","run","apprecovery19:check"]],
  ["incident-mode",["npm","run","incident20:check"]],
  ["github-readiness",["npm","run","github21:check"]],
  ["website",["npm","run","website21:check"]],
  ["integration",["npm","run","integration21:check"]],
  ["e2e-contract",["npm","run","e2e21:check"]],
  ["launcher-static",["npm","run","check","--prefix","launcher"]],
  ["v150-hardening",["node","tools/website-hardening-v150-test.mjs","."]]
];

let failures=0;
for(const [name,args] of commands){
  console.log(`\n=== ${name} ===`);
  const result=spawnSync(args[0],args.slice(1),{cwd:root,stdio:"inherit",encoding:"utf8"});
  if(result.error){failures++;console.error(`FAIL ${name}: ${result.error.message}`);continue;}
  if(result.status!==0){failures++;console.error(`FAIL ${name} (exit ${result.status})`);}else console.log(`PASS ${name}`);
}
console.log(`\nCurrent project regression: ${commands.length-failures}/${commands.length} PASS`);
if(failures)process.exit(1);

import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {buildGithubBootstrapPlan,planMarkdown}=require("../lib/github-bootstrap-plan.js");

const plan=buildGithubBootstrapPlan({repo:"cstaudy/CFS-TikTok-Backend",backendVersion:"3.11.0",launcherVersion:"0.41.0",rootLock:false,launcherLock:false});
if(plan.steps.length!==12||plan.backend_version!=="3.11.0"||plan.launcher_version!=="0.41.0")throw new Error("plan");
for(const id of ["source_sync","production_environment","windows_environment","render_runtime","main_rules","windows_release","acceptance","production_deploy","lockfiles"]){
  if(!plan.steps.find(step=>step.id===id))throw new Error(`missing ${id}`);
}
if(plan.lockfiles_ready)throw new Error("locks falsely ready");
const md=planMarkdown(plan);
if(!md.includes("GitHub Bootstrap Plan")||!md.includes("Production Deploy")||!md.includes("windows-release"))throw new Error("markdown");
console.log(JSON.stringify({ok:true,steps:12,lockfiles:false,markdown:true}));

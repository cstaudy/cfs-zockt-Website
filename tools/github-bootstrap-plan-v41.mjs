import fs from "node:fs";import path from "node:path";import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {buildGithubBootstrapPlan,planMarkdown}=require("../lib/github-bootstrap-plan.js");
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const lpkg=JSON.parse(fs.readFileSync(path.join(root,"launcher/package.json"),"utf8"));
const report=buildGithubBootstrapPlan({
  repo:process.env.CFS_LAUNCHER_RELEASE_REPO||"cstaudy/CFS-TikTok-Backend",
  backendVersion:pkg.version,
  launcherVersion:lpkg.version,
  productionUrl:process.env.CFS_PRODUCTION_URL||"",
  rootLock:fs.existsSync(path.join(root,"package-lock.json")),
  launcherLock:fs.existsSync(path.join(root,"launcher/package-lock.json"))
});
const dir=path.join(root,"reports");fs.mkdirSync(dir,{recursive:true});
const jsonFile=path.join(dir,"github-bootstrap-plan.json"),mdFile=path.join(dir,"github-bootstrap-plan.md");
fs.writeFileSync(jsonFile,JSON.stringify(report,null,2),"utf8");
fs.writeFileSync(mdFile,planMarkdown(report),"utf8");
console.log(JSON.stringify({ok:true,steps:report.steps.length,backend:report.backend_version,launcher:report.launcher_version,json:jsonFile,markdown:mdFile}));

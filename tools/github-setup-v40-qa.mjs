import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..")),must=(v,m)=>{if(!v)throw new Error(m)};
const q=fs.readFileSync(path.join(root,".github/workflows/quality-gate.yml"),"utf8");
const deploy=fs.readFileSync(path.join(root,".github/workflows/production-deploy.yml"),"utf8");
const launch=fs.readFileSync(path.join(root,".github/workflows/launcher-release.yml"),"utf8");
const verify=fs.readFileSync(path.join(root,".github/workflows/production-verification.yml"),"utf8");
const docs=fs.readFileSync(path.join(root,"GITHUB_SETUP_V40.md"),"utf8");
must(q.includes("pull_request:")&&q.includes("push:")&&q.includes("Launcher Release Gate"),"quality gate triggers/jobs");
must(deploy.includes("workflow_dispatch:")&&!deploy.includes("branches:\\n      - main"),"production deploy manual only");
must(deploy.includes("environment: production")&&verify.includes("environment: production"),"production environment");
must(launch.includes("environment: windows-release"),"windows-release environment");
must(launch.includes("secrets.CSC_LINK")&&launch.includes("secrets.CSC_KEY_PASSWORD"),"signing secrets");
must(deploy.includes("secrets.RENDER_DEPLOY_HOOK_URL"),"render hook secret");
must(deploy.includes("vars.CFS_PRODUCTION_URL")&&verify.includes("vars.CFS_PRODUCTION_URL"),"production url variable");
for(const forbidden of ["DATABASE_URL","TIKTOK_CLIENT_SECRET","CFS_STRIPE_SECRET_KEY","CFS_STRIPE_WEBHOOK_SECRET","CFS_TOKEN_ENCRYPTION_KEY"]){
  must(!q.includes(forbidden)&&!launch.includes(forbidden)&&!deploy.includes(`secrets.${forbidden}`),`runtime secret leaked into GitHub workflow: ${forbidden}`);
}
must(docs.includes("Das ZIP lokal entpacken")&&docs.includes("windows-release")&&docs.includes("production"),"github setup docs");
console.log(JSON.stringify({ok:true,manual_production:true,quality_gate:true,environments:["production","windows-release"],runtime_secrets_scoped:true}));

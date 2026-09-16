import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..")),must=(v,m)=>{if(!v)throw new Error(m)};
const map=fs.readFileSync(path.join(root,"GITHUB_RELEASE_FILES_V40.md"),"utf8"),render=fs.readFileSync(path.join(root,"RENDER_SETUP_V40.md"),"utf8");
for(const value of ["Setup `.exe`","`CSC_LINK`","`RENDER_DEPLOY_HOOK_URL`","`CFS_PRODUCTION_URL`","`DATABASE_URL`","Stripe Secret"])must(map.includes(value),`map ${value}`);
must(map.includes("CFS-...Milestone-V40.zip")&&map.includes("NEIN"),"milestone zip not source");
for(const value of ["DATABASE_URL","TIKTOK_CLIENT_SECRET","CFS_STRIPE_SECRET_KEY","CFS_STRIPE_WEBHOOK_SECRET","CFS_TOKEN_ENCRYPTION_KEY"])must(render.includes(value),`render ${value}`);
must(render.includes("CFS_ALLOW_LEGACY_VERIFICATION_FLAGS=false"),"legacy false docs");
console.log(JSON.stringify({ok:true,github_source_map:true,github_release_map:true,render_runtime_map:true}));

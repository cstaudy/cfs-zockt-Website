import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..")),must=(v,m)=>{if(!v)throw new Error(m)};
const exists=(rel)=>fs.existsSync(path.join(root,rel));
const render=fs.readFileSync(path.join(root,"render.blueprint.example.yaml"),"utf8");
for(const rel of [".github/workflows/quality-gate.yml",".github/workflows/production-deploy.yml",".github/workflows/production-verification.yml",".github/workflows/launcher-release.yml",".env.example","package.json","package-lock.json"]) must(exists(rel),`required repository file ${rel}`);
for(const value of ["DATABASE_URL","TIKTOK_CLIENT_SECRET","CFS_STRIPE_SECRET_KEY","CFS_STRIPE_WEBHOOK_SECRET","CFS_TOKEN_ENCRYPTION_KEY"]) must(render.includes(value),`render blueprint ${value}`);
must(render.includes("CFS_ALLOW_LEGACY_VERIFICATION_FLAGS"),"legacy verification flag is explicit");
console.log(JSON.stringify({ok:true,github_source_layout:true,render_runtime_map:true}));

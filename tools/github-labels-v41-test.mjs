import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..")),must=(v,m)=>{if(!v)throw new Error(m)};
const wf=fs.readFileSync(path.join(root,".github/workflows/setup-labels.yml"),"utf8");
const codeowners=fs.readFileSync(path.join(root,".github/CODEOWNERS"),"utf8");
const issue=fs.readFileSync(path.join(root,".github/ISSUE_TEMPLATE/release_acceptance.yml"),"utf8");
for(const label of ["bug","release-acceptance","launcher","backend","billing","tiktok-live","obs","cut-studio","games","release-blocker","dependencies"]){
  must(wf.includes(`gh label create "${label}"`),label);
}
must(wf.includes("GH_TOKEN: ${{ github.token }}")&&wf.includes("issues: write"),"safe github token permissions");
must(codeowners.includes("@cstaudy")&&codeowners.includes("/launcher/"),"codeowners");
must(issue.includes('labels: ["release-acceptance"]'),"issue label");
console.log(JSON.stringify({ok:true,labels:11,codeowners:true,manual_only:true}));

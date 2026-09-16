import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..")),must=(v,m)=>{if(!v)throw new Error(m)};
const app=fs.readFileSync(path.join(root,"renderer/app.js"),"utf8"),html=fs.readFileSync(path.join(root,"renderer/index.html"),"utf8");
must(app.includes('creator.effective_plan||creator.plan'),"effective billing plan in launcher");
must(app.includes("sub.access_active")&&app.includes("BILLING ZAHLUNG OFFEN"),"subscription status surfaced");
must(/V0\.(?:3[7-9]|[4-9]\d)/.test(html)&&/0\.(?:3[7-9]|[4-9]\d)\.0/.test(html),"launcher version 0.37+");
console.log(JSON.stringify({ok:true,effective_plan:true,billing_status:true,launcher:"0.37+"}));

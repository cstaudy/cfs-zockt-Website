import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..")),must=(v,m)=>{if(!v)throw new Error(m)};
const server=fs.readFileSync(path.join(root,"server.js"),"utf8"),html=fs.readFileSync(path.join(root,"public/pages/admin-creators.html"),"utf8"),ui=fs.readFileSync(path.join(root,"public/assets/js/admin-creators.js"),"utf8");
must(server.includes('require("./lib/config-doctor")')&&server.includes('/api/admin/creator-suite/config-doctor'),"server doctor route");
must(server.includes("runtimeDoctor(process.env)"),"runtime doctor execution");
for(const id of ["configDoctorScore","configDoctorChecks"])must(html.includes(`id="${id}"`),id);
must(ui.includes("state.configDoctor")&&ui.includes("/api/admin/creator-suite/config-doctor")&&ui.includes("config-doctor-row"),"admin ui");
for(const secret of ["DATABASE_URL","TIKTOK_CLIENT_SECRET","CFS_STRIPE_SECRET_KEY","CFS_STRIPE_WEBHOOK_SECRET"]){
  must(!ui.includes(secret),"admin UI must not request raw secret name-specific values");
}
console.log(JSON.stringify({ok:true,admin_doctor:true,redacted:true}));

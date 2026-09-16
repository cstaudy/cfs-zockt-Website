import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const must=(value,message)=>{if(!value)throw new Error(message);};

const server=read("server.js");
const tiktokHtml=read("public/pages/tiktok.html");
const tiktokJs=read("public/assets/js/page-tiktok.js");
const dashboardJs=read("public/assets/js/page-dashboard.js");
const admin=read("public/pages/admin-creators.html");
const adminJs=read("public/assets/js/admin-creators.js");

must(server.includes("id TEXT PRIMARY KEY")&&server.includes("creator_id TEXT NOT NULL REFERENCES creator_accounts(id)"),"scene text ids missing");
const sceneTable=(server.match(/CREATE TABLE IF NOT EXISTS creator_widget_scenes[\s\S]*?\n\s*`\);/)||[""])[0];
must(!sceneTable.includes("id UUID PRIMARY KEY DEFAULT gen_random_uuid()"),"old scene uuid id remains");
must(server.includes("ANY($2::text[])"),"scene widget text array missing");

for(const route of [
  "/api/creator/tiktok/status",
  "/auth/creator/tiktok",
  "/api/creator/tiktok/sync",
  "/api/creator/tiktok/disconnect",
  "/api/admin/creator-suite/overview",
  "/api/admin/creator-suite/creators/:id/beta",
  "/api/admin/creator-suite/creators/:id/sync-tiktok"
]) must(server.includes(route),`route missing ${route}`);

must(tiktokHtml.includes('href="/auth/creator/tiktok"'),"creator TikTok connect route missing from page");
must(tiktokJs.includes("/api/creator/tiktok/status")&&tiktokJs.includes("/api/creator/tiktok/sync")&&tiktokJs.includes("/api/creator/tiktok/disconnect"),"creator TikTok page script not isolated");
must(!tiktokHtml.includes('href="/auth/tiktok"')&&!tiktokJs.includes('"/auth/tiktok"')&&!tiktokJs.includes("'/auth/tiktok'"),"legacy owner auth still used in creator hub");
must(dashboardJs.includes("/api/creator/tiktok/status"),"dashboard still uses legacy TikTok status");
must(admin.includes("Admin Control Center")&&admin.includes('id="adminRows"')&&adminJs.includes("/api/admin/creator-suite/overview"),"admin center missing");
must(server.includes("creator_beta_testers"),"beta tester table missing");
must(server.includes("/api/account/me")&&server.includes("await isCreatorSuiteAdmin(account)"),"account me admin flag missing");

console.log(JSON.stringify({ok:true,scene_schema:"text",creator_tiktok_routes:4,admin_routes:3,external_scripts:true}));

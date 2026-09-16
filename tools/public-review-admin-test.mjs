import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||".");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const server=read("server.js");
const html=read("public/pages/admin-creators.html");
const js=read("public/assets/js/admin-creators.js");
const css=read("public/assets/css/admin-creators.css");
const pkg=JSON.parse(read("package.json"));
const checks=[];
const check=(label,ok)=>checks.push({label,ok:Boolean(ok)});

check("Backend-Version bleibt 3.12.0",pkg.version==="3.12.0");
check("Admin Review GET verlangt Account + Admin",/"\/api\/admin\/creator-suite\/public-reviews"[\s\S]{0,180}requireCreatorAccount,[\s\S]{0,80}requireCreatorAdmin/.test(server));
check("Admin Review PUT verlangt Account + Admin + Trusted Write",/"\/api\/admin\/creator-suite\/public-reviews\/:id"[\s\S]{0,220}requireCreatorAccount,[\s\S]{0,80}requireCreatorAdmin,[\s\S]{0,80}requireTrustedPublicWrite/.test(server));
check("Moderationsstatus bleibt auf pending/approved/rejected begrenzt",server.includes('new Set(["pending","approved","rejected"])'));
check("Admin API liefert Moderationszähler",server.includes("COUNT(*) FILTER (WHERE status='pending')")&&server.includes("with_comment"));
check("Admin API Suche ist parametrisiert",server.includes("display_name ILIKE $")&&server.includes("admin_note ILIKE $"));
check("Review Admin Panel vorhanden",html.includes('id="adminReviewsPanel"')&&html.includes('id="reviewAdminList"'));
check("Filter Pending/Approved/Rejected vorhanden",html.includes('value="pending"')&&html.includes('value="approved"')&&html.includes('value="rejected"'));
check("Moderationsaktionen vorhanden",js.includes('data-review-status="approved"')&&js.includes('data-review-status="rejected"')&&js.includes('data-review-status="pending"'));
check("Admin Notiz wird mitgesendet",js.includes("admin_note:note"));
check("Review API nutzt Admin-Step-up-Wrapper auf Basis des CSRF-Helfers",js.includes('adminJson(`/api/admin/creator-suite/public-reviews/${encodeURIComponent(id)}`')&&js.includes("return await CFS.json(url,options)"));
check("Keine Fake-Review-Daten im Admin UI hardcodiert",!/(4\.9\/5|1[0-9]{3,}\s+Bewertungen|fake review)/i.test(html+js));
check("Review UI Styles vorhanden",css.includes(".review-admin-card")&&css.includes(".review-admin-actions"));

let failed=0;
for(const item of checks){console.log(`${item.ok?"PASS":"FAIL"} · ${item.label}`);if(!item.ok)failed++;}
if(failed){console.error(`\n${failed}/${checks.length} Review-Admin Checks fehlgeschlagen.`);process.exit(1)}
console.log(`\n${checks.length}/${checks.length} Review-Admin Checks bestanden.`);

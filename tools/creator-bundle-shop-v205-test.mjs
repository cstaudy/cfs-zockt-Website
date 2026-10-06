import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||process.cwd());
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const checks=[
  ["server catalog reads creator bundles",read("server.js").includes("SELECT * FROM creator_universal_bundles WHERE creator_id=$1 ORDER BY updated_at DESC")],
  ["server hides standard products",read("server.js").includes('mode:"creator_bundles_only"')&&read("server.js").includes("standard_products_hidden:true")&&read("server.js").includes("products:[]")],
  ["server converter route exists",read("server.js").includes('/api/creator/shop/bundles/:id/convert')&&read("server.js").includes('app.post("/api/creator/shop/bundles/:id/convert"')],
  ["server converter is creator-owned",read("server.js").includes("WHERE creator_id=$1 AND id=$2 LIMIT 1")],
  ["server converter keeps resource limits",read("server.js").includes("withCreatorResourceLock(req.creatorAccount.id")&&read("server.js").includes("storeWidgetEligibility")],
  ["shop page explains own bundles",read("public/pages/shop.html").includes("nur deine selbst erstellten Universal-Builder-Bundles")&&read("public/pages/shop.html").includes('data-shop-filter="overlays"')],
  ["shop page removes legacy visible filters",!read("public/pages/shop.html").includes('data-shop-filter="panels"')&&!read("public/pages/shop.html").includes('data-shop-filter="scenes"')],
  ["shop browser uses bundle catalog",read("public/assets/js/page-shop-v172.js").includes('CFS.json("/api/creator/shop/catalog")')&&read("public/assets/js/page-shop-v172.js").includes("data-bundle-convert")],
  ["studio exposes bundle converter",read("public/pages/widget-studio.html").includes("wsConverterBundle")&&read("public/assets/js/widget-studio.js").includes("convertUniversalBundle")],
  ["AI browser stays gateway-only",!/(127\.0\.0\.1|localhost|11434)/.test(read("public/assets/js/page-cfs-ai.js"))],
  ["admin access remains explicit",read("server.js").includes("CFS_ADMIN_EMAILS")&&read(".env.example").includes("Comma-separated verified login emails")]
  , ["admin overview is categorized",read("public/pages/admin.html").includes("cfs-admin-category-grid")&&read("public/pages/admin.html").includes("Website & Shop")]
  , ["admin terminal is safe and usable",read("public/pages/admin.html").includes("adminTerminalForm")&&read("public/assets/js/page-admin-v197.js").includes("terminalCommandList")&&read("public/assets/js/page-admin-v197.js").includes("/api/admin/control-center/summary")]
  , ["admin embeds CFS AI logic",read("public/pages/admin.html").includes("adminAiForm")&&read("public/assets/js/page-admin-v197.js").includes("submitAiConsole")&&read("public/assets/js/page-admin-v197.js").includes("/api/creator/cfs-ai/chat")]
];
const failed=checks.filter(([,ok])=>!ok);
for(const [label,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${label}`);
console.log(`Creator bundle shop v205: ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length)process.exit(1);

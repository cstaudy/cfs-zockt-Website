import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||process.cwd());
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const must=(condition,message)=>{if(!condition)throw new Error(message)};
const server=read("server.js");
const page=read("public/pages/universal-builder.html");
const js=read("public/assets/js/universal-builder.js");
const css=read("public/assets/css/universal-builder.css");
const packageJson=JSON.parse(read("package.json"));

for(const file of ["public/pages/universal-builder.html","public/assets/js/universal-builder.js","public/assets/css/universal-builder.css","tools/universal-builder-v203-test.mjs"])must(fs.existsSync(path.join(root,file)),`${file} fehlt`);
for(const token of ["creator_universal_bundles","/api/creator/universal-builder","/api/creator/universal-builder/bundles","UNIVERSAL_BUILDER_DESIGNS","universalBuilderPricing"])must(server.includes(token),`Server-Symbol fehlt: ${token}`);
for(const token of ["data-panel=\"design\"","data-panel=\"platform\"","data-panel=\"widget\"","data-panel=\"content\"","data-panel=\"preview\"","ubSaveBundle","ubExportBundle"])must(page.includes(token),`Builder-Schritt oder Aktion fehlt: ${token}`);
for(const token of ["schema:\"cfs-universal-bundle-v203\"","function zip(","/api/creator/universal-builder","function saveBundle","function renderPreview"])must(js.includes(token),`Builder-Funktion fehlt: ${token}`);
for(const token of [".ub-design-grid",".ub-platform-grid",".ub-stage","@media(max-width:620px)"])must(css.includes(token),`Builder-Layout fehlt: ${token}`);
for(const token of ["key:\"cfs\"","key:\"cyan\"","key:\"electric\"","key:\"sky\"","key:\"teal\"","key:\"green\"","key:\"gold\"","key:\"orange\"","key:\"red\"","key:\"white\"","key:\"foghunt\"","key:\"commandgrid\"","key:\"arcaneorder\"","key:\"orbitalcore\"","key:\"trackrush\"","key:\"cozycabin\""])must(server.includes(token),`Empfohlene Farbwelt fehlt: ${token}`);
must(server.includes("UNIVERSAL_BUILDER_DESIGN_ALIASES"),"Legacy-Designs werden nicht auf die 16 Farbwelten abgebildet");
must(packageJson.scripts?.["check:v203"]?.includes("universal-builder-v203-test.mjs"),"check:v203 fehlt in package.json");
must(server.includes("schema:\"cfs-universal-bundle-v203\"")===false,"Schema darf nicht serverseitig als Secret verarbeitet werden");
console.log("Universal Builder v204: 20/20 PASS");

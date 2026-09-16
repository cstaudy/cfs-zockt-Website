import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const skipDirs=new Set([".git","node_modules"]);
const forbiddenExt=new Set([".zip",".exe",".msi",".pfx",".p12",".pem",".key"]);
const forbiddenNames=new Set([".env"]);
const bad=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ent.isDirectory()&&skipDirs.has(ent.name))continue;
    const full=path.join(dir,ent.name),rel=path.relative(root,full).replaceAll("\\","/");
    if(ent.isDirectory()){
      if(ent.name==="node_modules")bad.push(`${rel}/`);
      else walk(full);
      continue;
    }
    if(forbiddenNames.has(ent.name))bad.push(rel);
    const ext=path.extname(ent.name).toLowerCase();
    if(forbiddenExt.has(ext))bad.push(rel);
  }
}
walk(root);
if(bad.length)throw new Error(`Forbidden repository files: ${bad.join(", ")}`);
const gi=fs.readFileSync(path.join(root,".gitignore"),"utf8");
for(const expected of ["node_modules/","*.zip","*.exe",".env","*.pfx"])if(!gi.includes(expected))throw new Error(`.gitignore missing ${expected}`);
if(!fs.existsSync(path.join(root,".env.example")))throw new Error(".env.example missing");
console.log(JSON.stringify({ok:true,forbidden_files:0,gitignore:true,env_example:true}));

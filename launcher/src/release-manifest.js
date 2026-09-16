const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function buildManifest(distDir, version) {
  const allowed = new Set([".exe",".yml",".blockmap",".txt"]);
  const files = fs.readdirSync(distDir,{withFileTypes:true})
    .filter(x=>x.isFile())
    .map(x=>x.name)
    .filter(name=>allowed.has(path.extname(name).toLowerCase()))
    .filter(name=>name!=="release-manifest.json")
    .sort()
    .map(name=>{
      const file=path.join(distDir,name);
      return {name,bytes:fs.statSync(file).size,sha256:sha256(file)};
    });

  if (!files.some(x=>x.name.toLowerCase().endsWith(".exe"))) {
    throw new Error("Release Manifest benötigt mindestens eine EXE.");
  }

  return {
    schema:1,
    product:"cfs_zockt Creator Suite",
    version:String(version||""),
    generated_at:new Date().toISOString(),
    files
  };
}

function verifyManifest(manifest, distDir) {
  if (!manifest || manifest.schema!==1 || manifest.product!=="cfs_zockt Creator Suite") {
    throw new Error("Release Manifest Format ungültig.");
  }
  const checks=(manifest.files||[]).map(item=>{
    const file=path.join(distDir,path.basename(item.name));
    const exists=fs.existsSync(file);
    return {
      name:item.name,
      ok:exists && fs.statSync(file).size===Number(item.bytes) && sha256(file)===String(item.sha256),
      exists
    };
  });
  return {ok:checks.length>0&&checks.every(x=>x.ok),checks};
}

module.exports={buildManifest,verifyManifest,sha256};

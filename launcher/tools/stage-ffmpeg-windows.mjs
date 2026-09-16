import fs from "node:fs";import path from "node:path";
const root=path.resolve(path.join(import.meta.dirname,"..")),source=process.env.CFS_FFMPEG_SOURCE||process.argv[2]||"",license=process.env.CFS_FFMPEG_LICENSE_SOURCE||process.argv[3]||"";
if(!source){console.error("CFS_FFMPEG_SOURCE oder Quellpfad als Argument fehlt.");process.exit(2)}
const resolved=path.resolve(source);if(!fs.existsSync(resolved)||!fs.statSync(resolved).isFile()){console.error("FFmpeg-Quelle wurde nicht gefunden:",resolved);process.exit(2)}
const destDir=path.join(root,"vendor","ffmpeg"),dest=path.join(destDir,"ffmpeg.exe");fs.mkdirSync(destDir,{recursive:true});fs.copyFileSync(resolved,dest);
if(license){const lp=path.resolve(license);if(!fs.existsSync(lp))throw new Error("Lizenzdatei wurde nicht gefunden.");fs.copyFileSync(lp,path.join(destDir,path.basename(lp)))}
console.log(JSON.stringify({ok:true,staged:dest,bytes:fs.statSync(dest).size,license:Boolean(license)}));

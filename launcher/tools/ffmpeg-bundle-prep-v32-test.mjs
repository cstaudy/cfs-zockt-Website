import fs from "node:fs";import path from "node:path";
const root=path.resolve(path.join(import.meta.dirname,"..")),pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const entry=(pkg.build?.extraResources||[]).find(x=>x.from==="vendor/ffmpeg"&&x.to==="ffmpeg");
if(!entry)throw new Error("electron-builder extraResources für FFmpeg fehlt");
if(!fs.existsSync(path.join(root,"vendor","ffmpeg","README.md")))throw new Error("FFmpeg staging README fehlt");
const engine=fs.readFileSync(path.join(root,"src","cut-media-engine.js"),"utf8");
if(!engine.includes('path.join(this.resourcesPath,"ffmpeg",exe)'))throw new Error("Bundled FFmpeg candidate fehlt");
const staged=fs.existsSync(path.join(root,"vendor","ffmpeg","ffmpeg.exe"));
console.log(JSON.stringify({ok:true,build_prepared:true,binary_staged:staged,optional:true}));

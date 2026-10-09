"use strict";
const path=require("node:path");
// Express req.path preserves percent escapes; express.static decodes them.
// Always authorize the *decoded* target before static-file handling.
function inspectPagePath(pathname){
  const raw=String(pathname||"");
  let decoded;
  try{decoded=decodeURIComponent(raw);}catch{return {invalid:true,path:""};}
  if(decoded.includes("\u0000")||decoded.includes("\\")||decoded.includes("//"))return {invalid:true,path:""};
  // Prevent alternate decoding/normalization paths from bypassing the HTML gate.
  if(/%[0-9a-f]{2}/i.test(decoded))return {invalid:true,path:""};
  if(decoded.split("/").some(segment=>segment==="."||segment===".."))return {invalid:true,path:""};
  if(!decoded.startsWith("/pages/"))return {invalid:false,path:""};
  const clean=path.posix.normalize(decoded);
  if(clean!==decoded)return {invalid:true,path:""};
  if(decoded.endsWith(".html"))return {invalid:false,path:decoded};
  if(path.posix.extname(decoded))return {invalid:false,path:decoded};
  return {invalid:false,path:`${decoded}.html`};
}
module.exports={inspectPagePath};

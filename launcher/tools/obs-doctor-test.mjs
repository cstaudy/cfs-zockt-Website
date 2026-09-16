import http from "node:http";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { runObsDoctor, redactUrl }=require("../src/obs-doctor.js");

const server=http.createServer((_req,res)=>{
  res.writeHead(200,{"content-type":"text/html"});
  res.end(`<!doctype html><html><body style="background:transparent"><div>cfs_zockt Widget Studio Runtime</div></body></html>`);
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
try{
  const result=await runObsDoctor(`http://127.0.0.1:${port}/widgets/studio.html?token=secret123`);
  if(!result.ok)throw new Error("Local OBS doctor expected PASS");
  if(result.url.includes("secret123"))throw new Error("OBS URL token was not redacted");
  if(!result.checks.find(x=>x.key==="runtime")?.ok)throw new Error("Runtime detection failed");
  if(!result.checks.find(x=>x.key==="transparent")?.ok)throw new Error("Transparency detection failed");

  let blocked=false;
  try{await runObsDoctor("http://example.com/widget");}catch{blocked=true}
  if(!blocked)throw new Error("Insecure remote HTTP URL was not rejected");

  const redacted=redactUrl(new URL("https://x.test/a?token=abc&foo=bar&apiKey=def"));
  if(redacted.includes("abc")||redacted.includes("def"))throw new Error("Sensitive query redaction failed");
  console.log(JSON.stringify({ok:true,latencyMs:result.latencyMs,checks:result.checks.length}));
}finally{
  await new Promise(resolve=>server.close(resolve));
}

import http from "node:http";import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{runProductionCanary}=require("../lib/production-canary.js");
const server=http.createServer((req,res)=>{
  res.setHeader("content-type","application/json");
  if(req.url==="/api/health")return res.end(JSON.stringify({ok:true,service:"CFS",version:"3.8.0",status:"online",database:"connected"}));
  if(req.url==="/api/plans/catalog")return res.end(JSON.stringify({ok:true,billing_enabled:true,webhook_ready:true,provider:"stripe"}));
  res.statusCode=404;res.end(JSON.stringify({ok:false}));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try{
  const port=server.address().port,base=`http://127.0.0.1:${port}`;
  const good=await runProductionCanary({baseUrl:base,expectedVersion:"3.8.0",requireBilling:true});
  if(!good.ok||good.passed!==7)throw new Error(JSON.stringify(good));
  const bad=await runProductionCanary({baseUrl:base,expectedVersion:"9.9.9",requireBilling:false});
  if(bad.ok||!bad.checks.find(c=>c.id==="version"&&!c.ok))throw new Error("version mismatch not detected");
  console.log(JSON.stringify({ok:true,health:true,billing:true,version_mismatch:true}));
}finally{server.close()}

import http from "node:http";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {DeviceLinkClient}=require("../src/device-link-client.js");

let polls=0;
const server=http.createServer((req,res)=>{
  const send=(status,payload)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(payload))};
  if(req.url==="/api/launcher/device-link/start"&&req.method==="POST"){
    return send(201,{ok:true,device_link_id:"dev-1",device_secret:"cfsd_abcdefghijklmnopqrstuvwxyz123456",bridge_token:"cfsb_abcdefghijklmnopqrstuvwxyz123456",user_code:"CFS-ABCD-EFGH",verification_url:"https://example.test/pages/launcher-connect.html?code=CFS-ABCD-EFGH",expires_at:new Date(Date.now()+600000).toISOString(),poll_after_ms:1000});
  }
  if(req.url==="/api/launcher/device-link/poll"&&req.method==="POST"){
    polls++;
    return send(200,{ok:true,status:polls>1?"approved":"pending",approved:polls>1,creator:polls>1?{display_name:"Creator",plan:"pro"}:null});
  }
  send(404,{ok:false,error:"not found"});
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try{
  const url=`http://127.0.0.1:${server.address().port}`;
  const c=new DeviceLinkClient({backendUrl:url,version:"0.23.0"});
  const start=await c.start({machineName:"Test PC"});
  if(start.user_code!=="CFS-ABCD-EFGH"||!start.bridge_token.startsWith("cfsb_"))throw new Error("start failed");
  const p1=await c.poll({deviceLinkId:start.device_link_id,deviceSecret:start.device_secret});
  const p2=await c.poll({deviceLinkId:start.device_link_id,deviceSecret:start.device_secret});
  if(p1.approved||!p2.approved||p2.creator.plan!=="pro")throw new Error("poll flow failed");
  console.log(JSON.stringify({ok:true,code:start.user_code,pending:p1.status,approved:p2.approved}));
}finally{await new Promise(resolve=>server.close(resolve))}

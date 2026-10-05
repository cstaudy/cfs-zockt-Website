import http from "http";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const server = http.createServer((req,res) => {
  if (req.headers["x-cfs-ai-bridge-token"] !== "test-secret") {
    res.writeHead(401,{"Content-Type":"application/json"});
    res.end(JSON.stringify({detail:"missing token"}));
    return;
  }
  res.writeHead(200,{"Content-Type":"application/json"});
  res.end(JSON.stringify({ok:true,path:req.url}));
});
await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
const port = server.address().port;
process.env.CFS_AI_ENABLED="true";
process.env.CFS_AI_BASE_URL=`http://127.0.0.1:${port}`;
process.env.CFS_AI_BRIDGE_TOKEN="test-secret";
const gateway = require("../lib/cfs-ai-gateway.js");
try {
  const data = await gateway.requestJson("/api/status");
  if (!data.ok || data.path !== "/api/status") throw new Error("gateway request failed");
  const cfg = gateway.publicConfig();
  if (!cfg.enabled || !cfg.configured || !cfg.token_configured) throw new Error("gateway config failed");
  console.log("CFS AI gateway v195 checks passed.");
} finally {
  server.close();
}

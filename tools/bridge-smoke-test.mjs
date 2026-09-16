// CFS Creator Suite - Bridge Protocol smoke test
// Node 22+. Kein TikTok-Connector: sendet nur Testdaten über den echten Bridge-Kanal.
// Nutzung:
//   CFS_BASE_URL=https://deine-domain.de CFS_BRIDGE_TOKEN=cfsb_... node tools/bridge-smoke-test.mjs

const base = String(process.env.CFS_BASE_URL || "").replace(/\/$/, "");
const token = String(process.env.CFS_BRIDGE_TOKEN || "");
if (!base || !token) throw new Error("CFS_BASE_URL und CFS_BRIDGE_TOKEN fehlen.");

async function call(path, body = {}) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  console.log(path, data);
  return data;
}

await call("/api/bridge/widget-studio/heartbeat", {
  client_version: "smoke-test-1",
  machine_name: "Bridge Smoke Test",
  live_session_active: false,
  capabilities: { follow:true, like:true, gift:true, share:true, viewer_update:true }
});
await call("/api/bridge/widget-studio/session/start", { event_key: `start-${Date.now()}` });
await call("/api/bridge/widget-studio/events", {
  events: [
    { event_key:`follow-${Date.now()}`, event_type:"follow", actor_name:"test_follower", amount:1 },
    { event_key:`like-${Date.now()}`, event_type:"like", actor_name:"test_viewer", amount:25 },
    { event_key:`gift-${Date.now()}`, event_type:"gift", actor_name:"test_supporter", amount:5, payload:{gift_name:"Rose",repeat_count:5} },
    { event_key:`share-${Date.now()}`, event_type:"share", actor_name:"test_sharer", amount:1 },
    { event_key:`viewers-${Date.now()}`, event_type:"viewer_update", amount:42 }
  ]
});
console.log("Bridge smoke test abgeschlossen. Session bleibt für die Widget-Prüfung aktiv.");

import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { EventMonitor, actorFingerprint }=require("../src/event-monitor.js");

const m=new EventMonitor({maxEvents:50});
m.record({event_key:"f1",event_type:"follow",actor_name:"Alice",amount:1});
m.record({event_key:"l1",event_type:"like",actor_name:"Bob",amount:23});
m.record({event_key:"g1",event_type:"gift",actor_name:"Carla",amount:4,payload:{gift_name:"Rose",repeat_count:4}});
m.record({event_key:"s1",event_type:"share",actor_name:"Dan",amount:1});
m.record({event_key:"v1",event_type:"viewer_update",amount:127});

const snap=m.snapshot();
if(Object.values(snap.coverage).some(x=>!x))throw new Error("Coverage did not reach 5/5");
if(snap.amounts.likes!==23||snap.amounts.gifts!==4||snap.viewer.peak!==127)throw new Error("Monitor aggregates failed");

const redacted=m.snapshot({includeActors:false});
if(redacted.recent.some(x=>["Alice","Bob","Carla","Dan"].includes(x.actor)))throw new Error("Actor redaction failed");
if(actorFingerprint("Alice")!==actorFingerprint("Alice"))throw new Error("Fingerprint not deterministic");

m.clear();
if(m.events.length||Object.values(m.counts).some(Boolean))throw new Error("Monitor clear failed");

console.log(JSON.stringify({ok:true,coverage:snap.coverage,amounts:snap.amounts,viewer:snap.viewer}));

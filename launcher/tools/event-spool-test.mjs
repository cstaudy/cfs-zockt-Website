import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { EventSpool } = require("../src/event-spool.js");

const dir = fs.mkdtempSync(path.join(os.tmpdir(),"cfs-spool-"));
const file = path.join(dir,"queue.json");
const noop = { info(){}, warn(){} };

const spool = new EventSpool(file, noop, 100);
spool.push({event_key:"a",event_type:"follow",payload:{}});
spool.push({event_key:"b",event_type:"share",payload:{}});
spool.push({event_key:"a",event_type:"follow",payload:{duplicate:true}});
if (spool.all().length !== 2) throw new Error("Spool dedupe failed");

const restored = new EventSpool(file, noop, 100);
if (restored.all().length !== 2) throw new Error("Spool persistence failed");
restored.removeKeys(["a"]);
if (restored.all().length !== 1 || restored.all()[0].event_key !== "b") throw new Error("Spool removeKeys failed");
if (!restored.snapshot().persistent) throw new Error("Spool snapshot failed");

console.log("EventSpool persistence test passed.");

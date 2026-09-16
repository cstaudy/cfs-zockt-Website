import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {AREAS,createPlan,summarize,markdown,csv}=require("../lib/final-test-plan.js");
const plan=createPlan({backendVersion:"3.12.0",launcherVersion:"0.42.0"});
const summary=summarize(plan);
if(AREAS.length!==13||summary.total<90||summary.ready||summary.pending!==summary.total)throw new Error(JSON.stringify(summary));
if(!markdown(plan).includes("TikTok LIVE Provider")||!markdown(plan).includes("Billing / Stripe Testmode"))throw new Error("markdown");
if(!csv(plan).includes('"Status"')||!csv(plan).includes('"OBS"'))throw new Error("csv");
console.log(JSON.stringify({ok:true,areas:AREAS.length,checks:summary.total,pending:summary.pending}));

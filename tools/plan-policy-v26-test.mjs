import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {basePlanEntitlements,resolveCreatorEntitlements,minimumPlanForTemplate,templateAllowed,publicPlanCatalog}=require("../lib/creator-plan-policy.js");

const free=basePlanEntitlements("free"),creator=basePlanEntitlements("creator"),pro=basePlanEntitlements("pro");
if(free.max_widgets!==2||free.max_scenes!==1||free.live_bridge!==false||free.stream_deck!==false)throw new Error("FREE mapping");
if(creator.max_widgets!==6||creator.max_scenes!==4||creator.max_stream_deck_buttons!==8||!creator.live_bridge||!creator.auto_thanks||!creator.local_output)throw new Error("CREATOR mapping");
if(pro.max_widgets!==12||pro.max_scenes!==12||pro.max_stream_deck_buttons!==12||!pro.obs||!pro.custom_branding)throw new Error("PRO mapping");
if(minimumPlanForTemplate("blank")!=="pro"||minimumPlanForTemplate("neon")!=="creator")throw new Error("template minimum");
if(templateAllowed("blank",creator)||!templateAllowed("blank",pro))throw new Error("template access");
const beta=resolveCreatorEntitlements("free",{betaActive:true});
if(beta.plan!=="free"||beta.access_source!=="plan_plus_beta"||!beta.live_bridge||!beta.stream_deck||beta.max_widgets!==12)throw new Error("beta separation");
if(publicPlanCatalog().length!==3)throw new Error("catalog");
console.log(JSON.stringify({ok:true,free_widgets:free.max_widgets,creator_widgets:creator.max_widgets,pro_widgets:pro.max_widgets,beta_plan:beta.plan,beta_source:beta.access_source}));

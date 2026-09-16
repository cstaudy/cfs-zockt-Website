import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {REQUIRED_ACCEPTANCES,goNoGoAssessment,sanitizeDecision}=require("../lib/release-go-no-go.js");
const acceptance=Object.fromEntries(REQUIRED_ACCEPTANCES.map(k=>[k,{status:"passed",evaluation:{ready:true}}]));
const production={ready:true,passed:17,total:17},cohorts={pilot_ready:true,expanded_ready:true},feedback={open_critical:0,open_high:0};
const go=goNoGoAssessment({production,acceptances:acceptance,cohorts,feedback,releaseVersion:"0.39.0"});
if(!go.ready||go.recommendation!=="go"||go.score!==100)throw new Error("go expected");
const hold=goNoGoAssessment({production:{...production,ready:false},acceptances:acceptance,cohorts,feedback,releaseVersion:"0.39.0"});
if(hold.ready||hold.recommendation!=="hold"||!hold.blockers.includes("production_readiness"))throw new Error("hold expected");
let blocked=false;try{sanitizeDecision({decision:"go",rationale:"Release wurde vollständig geprüft."},hold)}catch{blocked=true}
if(!blocked)throw new Error("manual go bypass");
const noGo=sanitizeDecision({decision:"no_go",rationale:"Ein reproduzierbarer Feldtest blockiert den Release."},hold);
if(noGo.decision!=="no_go")throw new Error("no-go");
console.log(JSON.stringify({ok:true,acceptances:REQUIRED_ACCEPTANCES.length,go:true,hold:true,bypass_blocked:true}));

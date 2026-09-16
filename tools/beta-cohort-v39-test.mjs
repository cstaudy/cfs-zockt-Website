import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {sanitizeCohort,evaluateCohort,releaseCohortReadiness}=require("../lib/beta-cohort-operations.js");
const rel="0.39.0";
const pilot=sanitizeCohort({stage:"pilot",status:"active",target_testers:5,name:"Pilot"},{releaseVersion:rel});
const members=Array.from({length:5},(_,i)=>({creator_id:`c${i+1}`,status:"completed"}));
const wrongSessions=members.map((m,i)=>({creator_id:m.creator_id,status:"completed",launcher_version:"0.38.0"}));
if(evaluateCohort({...pilot,id:"p1"},members,wrongSessions).ready)throw new Error("old sessions counted");
const goodSessions=members.map(m=>({creator_id:m.creator_id,status:"completed",launcher_version:rel}));
const evalPilot=evaluateCohort({...pilot,id:"p1"},members,goodSessions);
if(!evalPilot.ready||evalPilot.completed_sessions!==5||evalPilot.session_creators!==5)throw new Error("pilot not ready");

const expanded=sanitizeCohort({stage:"expanded",status:"active",target_testers:20,name:"Expanded"},{releaseVersion:rel});
const members20=Array.from({length:20},(_,i)=>({creator_id:`e${i+1}`,status:"active"}));
const sessions20=members20.map(m=>({creator_id:m.creator_id,status:"completed",launcher_version:rel}));
const release=releaseCohortReadiness([{...pilot,id:"p1"},{...expanded,id:"e1"}],{p1:members,e1:members20},[...goodSessions,...sessions20]);
if(!release.pilot_ready||!release.expanded_ready)throw new Error(JSON.stringify(release));
console.log(JSON.stringify({ok:true,pilot:5,expanded:20,release_scoped_sessions:true}));

import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {compareVersions,normalizeRelease,selectRelease,buildPolicy,cohortBucket}=require("../lib/launcher-release-policy.js");

const asset=name=>({name,size:100,browser_download_url:`https://github.com/test/repo/releases/download/v/${name}`,download_count:2});
const raw=[
 {id:1,tag_name:"v0.16.0",name:"v0.16.0",draft:false,prerelease:false,published_at:"2026-08-01T10:00:00Z",assets:[asset("cfs_zockt-Creator-Suite-Setup-0.16.0-x64.exe")]},
 {id:2,tag_name:"v0.17.0",name:"v0.17.0",draft:false,prerelease:false,published_at:"2026-08-20T10:00:00Z",assets:[asset("cfs_zockt-Creator-Suite-Setup-0.17.0-x64.exe")]},
 {id:3,tag_name:"v0.18.0",name:"v0.18.0",draft:false,prerelease:false,published_at:"2026-09-01T10:00:00Z",assets:[asset("cfs_zockt-Creator-Suite-Setup-0.18.0-x64.exe")]},
 {id:4,tag_name:"v0.19.0-beta.1",name:"Beta",draft:false,prerelease:true,published_at:"2026-09-02T10:00:00Z",assets:[asset("cfs_zockt-Creator-Suite-Setup-0.19.0-beta.1-x64.exe")]}
];
const releases=raw.map(normalizeRelease).filter(Boolean);
if(selectRelease(releases,"stable")?.version!=="0.18.0")throw new Error("Stable selection failed");
if(selectRelease(releases,"beta")?.version!=="0.19.0-beta.1")throw new Error("Beta selection failed");
if(compareVersions("0.18.0","0.19.0-beta.1")>=0)throw new Error("Version compare failed");

const full=buildPolicy({releases,currentVersion:"0.17.0",channel:"stable",minStable:"0.15.0",buildTarget:"0.18.0",rolloutStable:100,cohortKey:"creator-a"});
if(!full.update_available||full.recommended_version!=="0.18.0"||!full.live_allowed)throw new Error("Full rollout failed");

const paused=buildPolicy({releases,currentVersion:"0.17.0",channel:"stable",minStable:"0.15.0",rolloutStable:0,cohortKey:"creator-a"});
if(paused.recommended_version!=="0.17.0"||paused.status!=="rollout_pending"||paused.rollout.eligible)throw new Error("Paused rollout failed");

const blocked=buildPolicy({releases,currentVersion:"0.17.0",channel:"stable",minStable:"0.15.0",blockedVersions:["0.17.0"],cohortKey:"creator-a"});
if(!blocked.version_blocked||blocked.live_allowed||!blocked.update_required||blocked.status!=="version_blocked")throw new Error("Blocked policy failed");

const maintenance=buildPolicy({releases,currentVersion:"0.18.0",channel:"stable",maintenanceMode:true,maintenanceMessage:"Kurze Wartung",cohortKey:"creator-a"});
if(maintenance.live_allowed||maintenance.status!=="maintenance"||maintenance.safety.maintenance.message!=="Kurze Wartung")throw new Error("Maintenance failed");

const rollback=buildPolicy({releases,currentVersion:"0.18.0",channel:"stable",pinnedStable:"0.17.0",rolloutStable:100,cohortKey:"creator-a"});
if(!rollback.rollback_recommended||rollback.recommended_version!=="0.17.0"||rollback.action!=="rollback_recommended")throw new Error("Rollback failed");

const a=cohortBucket("creator-a"),b=cohortBucket("creator-a");
if(a!==b||a<0||a>99)throw new Error("Cohort bucket unstable");

console.log(JSON.stringify({ok:true,full:full.recommended_version,paused:paused.recommended_version,blocked:blocked.status,rollback:rollback.recommended_version,bucket:a}));

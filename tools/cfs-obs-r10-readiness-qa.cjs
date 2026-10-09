'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {CASES,createReport,sanitizeSteps,fetchReadiness}=require('../public/assets/js/cfs-obs-beta-check-v32076.js');
(async()=>{
 assert.equal(CASES.length,12);
 const account={ok:true,ready:false,steps:[
  {key:'account',label:'Account',ready:true,detail:'Email bestätigt'},
  {key:'provider',label:'LIVE-Plattform',ready:false,detail:'Nicht verbunden'},
  {key:'launcher',label:'Launcher',ready:true,detail:'PC erreichbar'},
  {key:'obs',label:'OBS',ready:false,detail:'WebSocket nicht verbunden'},
  {key:'widget',label:'Widget',ready:true,detail:'1 veröffentlicht'}
 ]};
 const good=await fetchReadiness(async(url,options)=>{
  assert.equal(url,'/api/creator/stream-ready');assert.equal(options.credentials,'same-origin');
  assert.equal(options.cache,'no-store');assert.equal(options.redirect,'manual');
  return{ok:true,status:200,json:async()=>account};
 });
 assert.equal(good.ok,true);assert.equal(good.steps.length,5);assert.equal(good.steps.filter(x=>x.ready).length,3);
 for(const status of [401,403,500]){const out=await fetchReadiness(async()=>({status,ok:false}));assert.equal(out.ok,false)}
 assert.equal((await fetchReadiness(async()=>({status:200,ok:true,json:async()=>({ok:false})}))).ok,false);
 assert.equal(sanitizeSteps({ok:true,steps:[{key:'account',ready:true,label:'a',detail:'x'.repeat(250)}]}).length,5);
 const fakeToken='abcdef0123456789abcdef0123456789abcdef0123456789';
 const fakeUrl=`https://cfs-zockt.de/widgets/studio.html#token=${fakeToken}`;
 const results={'OBS-01':'bestanden','OBS-02':'fehlgeschlagen','OBS-03':'blockiert','OBS-04':'invalid',foo:fakeUrl};
 const report=createReport(results,new Date('2026-10-09T18:15:00Z'));
 assert.deepEqual(report.counts,{passed:1,checked:3,failed:1,blocked:1});
 assert(!report.text.includes(fakeToken));assert(!report.text.includes(fakeUrl));
 assert(!report.text.includes('undefined'));
 assert(report.text.includes('OBS-12'));assert(report.text.includes('NICHT AUTOMATISCH ABGENOMMEN'));
 assert.equal(createReport({},new Date('2026-10-09T18:15:00Z')).counts.checked,0);
 const html=fs.readFileSync(path.join(root,'public/pages/obs-setup.html'),'utf8');
 for(const element of ['id="obsReadinessRefresh"','id="obsReadinessResult"','id="obsReadinessSteps"','id="obsReportDownload"','id="obsBetaChecks"','cfs-obs-beta-check-v32076.js'])assert(html.includes(element),element);
 const js=fs.readFileSync(path.join(root,'public/assets/js/cfs-obs-beta-check-v32076.js'),'utf8');
 for(const unsafe of [/localStorage/,/sessionStorage/,/sendBeacon/,/window\.location\s*=/,/fetch\([^)]*http:\/\//])assert(!unsafe.test(js),'Unexpected persistence or external posting');
 console.log('PASS R10: 12 manual checks, safe report without URL/token, same-origin readiness, blocked/401 handling, UI hooks');
})().catch(err=>{console.error(err);process.exitCode=1});

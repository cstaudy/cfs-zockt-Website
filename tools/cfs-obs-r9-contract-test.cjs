'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {parseSource,checkSource,pickSize}=require('../public/assets/js/cfs-obs-source-check-v32075.js');
const host='https://cfs-zockt.de';
const makerToken='a'.repeat(48);
const sceneToken='cfss_'+'b'.repeat(32);
async function run(){
 const maker=parseSource(`${host}/widgets/stream-maker.html?token=${makerToken}&element=el_abc`,host);
 assert(maker.ok);assert.equal(maker.token,undefined,'Avoid returning raw token outside API URL');
 const actualMakerResponse={config:{elements:[{id:'el_abc',width:960,height:360}]},server_now:Date.now()};
 const makerResult=await checkSource(maker,async(url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.match(url,/^\/api\/public\/stream-maker\//);return{status:200,ok:true,json:async()=>actualMakerResponse}});
 assert.equal(makerResult.ok,true,'Actual Maker API must not require ok:true');
 assert.deepEqual(makerResult.size,{width:960,height:360});
 assert.match(makerResult.warning,/aktuelle Konfiguration/);
 assert.doesNotMatch(makerResult.warning,/veröffentlicht und/);
 for(const response of [{ok:true},{config:{}},{config:{elements:[]}}]){
  const res=await checkSource(maker,async()=>({status:200,ok:true,json:async()=>response}));
  assert.equal(res.ok,false,'Empty/malformed Maker output must fail');
 }
 for(const [layout,w,h] of [['landscape',1920,1080],['tiktok_vertical',1080,1920]]){
  const info=parseSource(`${host}/widgets/scene.html#token=${sceneToken}&layout=${layout}`,host);
  assert.equal(info.ok,true);assert.equal(info.layout,layout);
  const scene=await checkSource(info,async()=>({status:200,ok:true,json:async()=>({ok:true,scene:{status:'live',profile:'landscape'},layouts:{landscape:{canvas:{width:1920,height:1080}},tiktok_vertical:{canvas:{width:1080,height:1920}}}})}));
  assert(scene.ok);assert.deepEqual(scene.size,{width:w,height:h});
 }
 assert.equal(parseSource(`${host}/widgets/scene.html#token=${sceneToken}&layout=xxx`,host).ok,false);
 const widgetInfo=parseSource(`${host}/widgets/studio.html#token=${makerToken}`,host);
 assert(widgetInfo.ok);
 const widget=await checkSource(widgetInfo,async()=>({status:200,ok:true,json:async()=>({ok:true,widget:{config:{canvas:{width:600,height:140}}}})}));
 assert.deepEqual(widget.size,{width:600,height:140});
 const invalidWidget=await checkSource(widgetInfo,async()=>({status:200,ok:true,json:async()=>({ok:true,widget:{config:{canvas:{width:99999,height:120}}}})}));
 assert.equal(invalidWidget.ok,false);
 const page=fs.readFileSync(path.join(root,'public/pages/obs-setup.html'),'utf8');
 assert(/js\?v=R(?:9|10)/.test(page),'OBS source script must have a fresh cache-busting revision');
 assert(page.includes('Die Prüfung auf dieser Seite installiert nichts automatisch.'));
 assert(fs.readFileSync(path.join(root,'public/pages/shop.html'),'utf8').includes('href="/pages/obs-setup.html"'));
 assert(fs.readFileSync(path.join(root,'public/pages/shop-product.html'),'utf8').includes('href="/pages/obs-setup.html"'));
 const js=fs.readFileSync(path.join(root,'public/assets/js/cfs-obs-source-check-v32075.js'),'utf8');
 assert(!/\b(localStorage|sessionStorage|sendBeacon|console\.log)\b/.test(js),'No stored/logged capability tokens');
 const backend=fs.readFileSync(path.join(root,'lib/stream-maker.js'),'utf8');
 assert(backend.includes('res.json({config:r.config,server_now:Date.now()})'),'Real server Maker response contract must match test');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert(server.includes('return res.json({ok:true,...(await hydratePublicScene(row))'),'Scene response contract');
 console.log('PASS R9: actual Maker response, published Widget/Scene responses, 16:9/9:16 size, token safety, UI navigation, backend contract');
}
run().catch(e=>{console.error(e);process.exitCode=1});

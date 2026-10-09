'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {parseSource,checkSource,pickSize}=require('../public/assets/js/cfs-obs-source-check-v32075.js');
const origin='https://cfs-zockt.de';
const token='abcdef0123456789abcdef0123456789abcdef0123456789';
const cases=[
 [`${origin}/widgets/studio.html#token=${token}`,'Widget Studio','/api/widgets/studio/'],
 [`${origin}/widgets/output.html#token=${token}&profile=landscape`,'Widget Studio Output','/api/widgets/studio/'],
 [`${origin}/widgets/scene.html#token=${token}&layout=landscape`,'CFS Scene','/api/widgets/scene/'],
 [`${origin}/widgets/stream-maker.html?token=${token}&element=abc_23`,'Stream Maker','/api/public/stream-maker/']
];
for(const [url,kind,api] of cases){const result=parseSource(url,origin);assert.equal(result.ok,true,url);assert.equal(result.kind,kind);assert.ok(result.api.startsWith(api));}
for(const bad of [
 '','javascript:alert(1)','https://evil.example/widgets/studio.html#token='+token,
 'https://cfs-zockt.de.evil.example/widgets/studio.html#token='+token,
 'https://admin:password@cfs-zockt.de/widgets/studio.html#token='+token,
 `${origin}/pages/admin.html`,`${origin}/widgets/studio.html`,
 `${origin}/widgets/stream-maker.html?token=${token}`,`${origin}/widgets/stream-maker.html?token=hello&element=foo`,
 `${origin}/widgets/scene.html#token=x`
]){assert.equal(parseSource(bad,origin).ok,false,bad)}
(async()=>{
 const studio=parseSource(cases[0][0],origin), maker=parseSource(cases[3][0],origin);
 const success=await checkSource(studio,async()=>({ok:true,status:200,json:async()=>({ok:true,widget:{config:{canvas:{width:800,height:200}}}})}));
 assert.equal(success.ok,true);assert.deepEqual(success.size,{width:800,height:200});
 const liveMaker=await checkSource(maker,async()=>({ok:true,status:200,json:async()=>({ok:true,config:{elements:[{id:'abc_23',width:700,height:180}]}})}));
 assert.equal(liveMaker.ok,true);assert.deepEqual(liveMaker.size,{width:700,height:180});
 const invalidMaker=await checkSource(maker,async()=>({ok:true,status:200,json:async()=>({ok:true,config:{elements:[]}})}));assert.equal(invalidMaker.ok,false);
 const scene=await checkSource(parseSource(cases[2][0],origin),async()=>({ok:true,status:200,json:async()=>({ok:true,scene:{},layouts:{landscape:{canvas:{width:1920,height:1080}}}})}));assert.equal(scene.ok,true);
 for(const status of [404,403,429,500]){const r=await checkSource(studio,async()=>({ok:false,status}));assert.equal(r.ok,false)}
 const fail=await checkSource(studio,async()=>({ok:true,status:200,json:async()=>({ok:false})}));assert.equal(fail.ok,false);
 for(const name of ['dashboard','stream-maker','widget-studio','universal-builder','scene-studio','stream-studio','cut-studio','editor']){
  const html=fs.readFileSync(path.join(root,'public/pages',name+'.html'),'utf8');
  assert.ok(html.includes('/pages/obs-setup.html'),name+' lacks OBS setup navigation');
  assert.ok(html.includes('cfs-r7-hub'),name+' lost workflow');
 }
 const html=fs.readFileSync(path.join(root,'public/pages/obs-setup.html'),'utf8');
 for(const ref of ['cfs-zockt-logo.png','cfs-obs-setup-v32075.css','cfs-obs-source-check-v32075.js','id="obsSourceUrl"','id="obsResult"'])assert.ok(html.includes(ref));
 assert.ok(!/localStorage|sessionStorage|sendBeacon|console\.log/.test(fs.readFileSync(path.join(root,'public/assets/js/cfs-obs-source-check-v32075.js'),'utf8')),'Do not persist/log output URL tokens');
 console.log('PASS: 4 source formats, 10 unsafe URLs, API status paths, 8 navigation links, original logo and privacy behavior');
})().catch(e=>{console.error(e);process.exitCode=1});

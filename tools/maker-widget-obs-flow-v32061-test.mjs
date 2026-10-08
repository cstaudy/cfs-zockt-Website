import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const root=path.resolve(process.argv[2]||'.');
const read=(x)=>fs.readFileSync(path.join(root,x),'utf8');
const require=createRequire(import.meta.url);
const helper=require(path.join(root,'public/assets/js/creator-handoff-v32061.js'));
let n=0;
async function check(title,fn){await fn();console.log('PASS '+title);n++}
const origin='https://stream.example';
const token='a'.repeat(48),img='/assets/img/collections/master-image.webp';
await check('Only same-origin, canonical owner tokens',()=>{
 assert.equal(helper.assetToken('/widget-assets/'+token,origin),token);
 assert.equal(helper.assetToken(origin+'/widget-assets/'+token,origin),token);
 for(const value of ['https://bad.example/widget-assets/'+token,'//bad.example/widget-assets/'+token,'/widget-assets/'+token+'?q=1','/widget-assets/'+token+'#fragment','/widget-assets/'+token+'/extra','javascript:alert(1)','/widget-assets/'+('b'.repeat(47))])assert.equal(helper.assetToken(value,origin),'',value);
});
await check('Static import is local and image-only',()=>{
 assert.equal(helper.importableImage(img,origin),img);
 assert.equal(helper.importableImage(origin+img,origin),img);
 for(const x of ['https://bad.example'+img,'//bad.example'+img,'/api/creator/private.png','/assets/data/file.json','/assets/img/demo.svg','/assets/img/demo.png?secret=1','/assets/img/demo.png#test','/assets/img/%2e%2e/secrets.png','/assets/img/../../private.png','data:image/png;base64,AAAA'])assert.equal(helper.importableImage(x,origin),'',x);
});
await check('Route encoding and modes',()=>{
 const widget=new URL(helper.handoffUrl(token,'widget'),origin),overlay=new URL(helper.handoffUrl(token,'overlay'),origin);
 assert.equal(widget.pathname,'/pages/widget-studio.html');assert.equal(widget.searchParams.get('maker_asset'),token);assert.equal(widget.searchParams.get('source'),'stream-maker');assert.equal(widget.searchParams.get('open'),'converter');assert.equal(overlay.searchParams.get('open'),'asset');
 assert.throws(()=>helper.handoffUrl('fake'),/Ungültige Bildreferenz/);
});
const BlobMock=globalThis.Blob, FileMock=globalThis.File;
await check('Import sends only the canonical path, same-origin credentials and valid file to protected upload',async()=>{
 let input='',request,received;
 const result=await helper.importPublicImage(img,origin,{fetchImage:async(s,r)=>{input=s;request=r;return{ok:true,blob:async()=>new BlobMock(['TEST'],{type:'image/png'})}},uploadFile:async f=>{received=f;return '/widget-assets/'+token},FileClass:FileMock});
 assert.equal(input,img);assert.equal(request.credentials,'same-origin');assert.equal(request.redirect,'error');assert.equal(received.type,'image/png');assert.equal(result.token,token);
});
await check('Import fails closed for unsupported content, oversize and invalid upload reference',async()=>{
 const call=(blob,uploadFile=async()=>'/widget-assets/'+token)=>helper.importPublicImage(img,origin,{fetchImage:async()=>({ok:true,blob:async()=>blob}),uploadFile,FileClass:FileMock});
 await assert.rejects(()=>call(new BlobMock(['<svg/>'],{type:'image/svg+xml'})),/PNG/);
 await assert.rejects(()=>call(new BlobMock([],{type:'image/png'})),/PNG/);
 await assert.rejects(()=>call(new BlobMock([new Uint8Array(12*1024*1024+1)],{type:'image/png'})),/12 MB/);
 await assert.rejects(()=>call(new BlobMock(['abc'],{type:'image/webp'}),async()=> 'https://evil.example/widget-assets/'+token),/Medienreferenz/);
 await assert.rejects(()=>helper.importPublicImage('https://evil.example/x.png',origin,{fetchImage:async()=>{throw Error('should not fetch')},uploadFile:async()=>null,FileClass:FileMock}),/Nur lokale/);
});
const makerJs=read('public/assets/js/stream-maker.js'),widgetJs=read('public/assets/js/widget-studio.js');
const makerHtml=read('public/pages/stream-maker.html'),widgetHtml=read('public/pages/widget-studio.html'),css=read('public/assets/css/widget-studio.css');
const handoffBody=makerJs.slice(makerJs.indexOf('async function handoff(mode){'),makerJs.indexOf('async function control(action){'));
const execute=async({source=img,saved=true,upload='ok'}={})=>{
 const calls={uploads:0,saves:0,render:0,notices:[]};
 const state={online:true,dirty:false,id:101,busy:false,handoffBusy:false,config:{source,variants:[],activeVariant:0}};
 const location={origin,href:''};
 const c={state,location,window:{CFSCreatorHandoff:helper},M:{source:cfg=>cfg.source},makerAssetToken:()=>helper.assetToken(state.config.source,origin),notice:(v)=>calls.notices.push(v),updateHandoff:()=>{},dirty:()=>{state.dirty=true},renderAll:()=>calls.render++,fetch:async()=>({ok:true,blob:async()=>new BlobMock(['image'],{type:'image/png'})}),uploadOne:async()=>{calls.uploads++;if(upload==='bad')throw Error('No upload');return '/widget-assets/'+token;},save:async()=>{calls.saves++;if(!saved)return null;state.dirty=false;return {id:101}},File:FileMock};
 // The shared importer normally uses browser File; the VM context supplies it as global.
 vm.runInNewContext(handoffBody+'\nthis.run=handoff',c);
 await c.run('widget');return{state,location,calls};
};
await check('Maker static image -> owned upload -> saved bundle -> Widget Studio route',async()=>{
 const {state,location,calls}=await execute();assert.equal(calls.uploads,1);assert.equal(calls.saves,1);assert.equal(state.config.source,'/widget-assets/'+token);assert.equal(new URL(location.href,origin).searchParams.get('maker_asset'),token);assert.equal(state.handoffBusy,false);
});
await check('Existing owned upload does not get duplicated',async()=>{
 const {location,calls}=await execute({source:'/widget-assets/'+token});assert.equal(calls.uploads,0);assert.equal(calls.saves,0);assert.equal(new URL(location.href,origin).searchParams.get('open'),'converter');
});
await check('Maker blocks navigation after upload or save errors, and refuses cross-origin',async()=>{
 for(const options of [{saved:false},{upload:'bad'},{source:'https://external.example/a.png'}]){const {location,state}=await execute(options);assert.equal(location.href,'');assert.equal(state.handoffBusy,false)}
});
await check('Editor journey buttons track publish status; OBS controls remain unavailable for drafts',()=>{
 const code=widgetJs.slice(widgetJs.indexOf('function renderMakerJourney(){'),widgetJs.indexOf('function renderEditor(){'));
 const dom=new Map(['#wsMakerJourney','#wsMakerJourneyTitle','#wsMakerJourneyHint','#wsMakerJourneyCopy','#wsMakerJourneyInstall','#wsMakerJourneyPublish'].map(id=>[id,{hidden:false,disabled:false,textContent:''}]));
 const state={view:'editor',makerJourney:true,widget:{status:'draft',id:123}};
 const c={state,$:id=>dom.get(id),outputUrl:()=>origin+'/widgets/abc'};vm.runInNewContext(code+';this.render=renderMakerJourney;',c);
 c.render();assert.equal(dom.get('#wsMakerJourneyCopy').disabled,true);assert.match(dom.get('#wsMakerJourneyTitle').textContent,/Entwurf/);
 state.widget={status:'live',published_config:{elements:[]},has_unpublished_changes:false};c.render();assert.equal(dom.get('#wsMakerJourneyCopy').disabled,false);assert.equal(dom.get('#wsMakerJourneyPublish').hidden,true);
 state.widget.has_unpublished_changes=true;c.render();assert.equal(dom.get('#wsMakerJourneyPublish').hidden,false);assert.match(dom.get('#wsMakerJourneyHint').textContent,/zuletzt veröffentlichte/);
 state.makerJourney=false;c.render();assert.equal(dom.get('#wsMakerJourney').hidden,true);
});
await check('Publish never opens the final step when draft save fails',async()=>{
 const publishCode=widgetJs.slice(widgetJs.indexOf('async function publish(){'),widgetJs.indexOf('async function publish(){')+220).split('\n')[0];
 let opens=0;let passes=false;
 const context={state:{widget:{id:1}},saveDraft:async()=>passes,openStreamBoard:async()=>{opens++}};
 vm.runInNewContext(publishCode+';this.go=publish;',context);
 await context.go();assert.equal(opens,0);
 passes=true;await context.go();assert.equal(opens,1);
});
await check('Missing design catalog shows honest built-in starter fallback',()=>{
 assert.ok(makerJs.includes('Der Designpaket-Katalog ist in dieser Installation nicht verfügbar.'));
 assert.ok(makerJs.includes('const presets=M.designs.slice(0,6)'));
 assert.ok(makerJs.includes('previewCard(node,starter(item.id))'));
});
await check('Wiring: new helper loads before Maker, both screens document the workflow, publish stops on failed draft save',()=>{
 assert.ok(makerHtml.indexOf('creator-handoff-v32061.js')<makerHtml.indexOf('stream-maker.js?v=3.20.61'));
 assert.ok(makerJs.includes('window.CFSCreatorHandoff.importableImage')&&makerJs.includes('helper.importPublicImage'));
 assert.ok(widgetHtml.includes('id="wsMakerJourney"')&&css.includes('.ws-maker-journey[hidden]'));
 assert.ok(widgetJs.includes('state.makerJourney=fromMaker')&&widgetJs.includes('async function publish(){if(await saveDraft()!==true)return;'));
 assert.ok(widgetJs.includes('if(await saveDraft()!==true)throw new Error("Widget wurde angelegt'));
 assert.ok(widgetHtml.includes('widget-studio.js?v=v32061')&&widgetHtml.includes('widget-studio.css?v=v32061'));
 assert.equal(JSON.parse(read('package.json')).version,'3.20.61');
});
console.log(`\nMaker -> Widget -> OBS 3.20.61: ${n}/${n} PASS`);

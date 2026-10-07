'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),J=require('../public/assets/js/cfs-guide-journeys');
assert.equal(Object.keys(J.journeys).length,4);
for(const journey of Object.values(J.journeys))for(const [label,copy,href,fragment]of journey.steps){assert.ok(label&&copy);const file=path.join(root,'public',href);assert.ok(fs.existsSync(file),href);if(fragment)assert.ok(fs.readFileSync(file,'utf8').includes('id="'+fragment.slice(1)+'"'),href+fragment);}
assert.deepEqual(J.read({getItem(){throw Error('blocked')}}),{key:'maker',step:0});
assert.deepEqual(J.read({getItem:()=>'{"key":"unknown","step":1}'}),{key:'maker',step:0});
assert.deepEqual(J.read({getItem:()=>'{"key":"cut","step":99}'}),{key:'maker',step:0});
assert.deepEqual(J.read({getItem:()=>'{"key":"cut","step":5}'}),{key:'cut',step:5});
let source=fs.readFileSync(path.join(root,'public/assets/js/cfs-guide-v5.js'),'utf8').replace('  function init() {','  globalThis.testReply=findReply;\n  function init() {');
const ctx={location:{pathname:'/pages/stream-maker.html'},document:{readyState:'loading',addEventListener(){}},window:{},console};vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{for(const [q,url]of [['Mein Overlay funktioniert nicht','guide=help'],['Bild hochladen','guide=maker'],['Clip schneiden','guide=cut'],['Shop Vorlage','guide=shop'],['OBS Browser-Quelle','guide=help']]){const reply=await ctx.testReply(q);assert.ok(reply.actions.some(a=>a[1].includes(url)),q);}const next=await ctx.testReply('Nächster Schritt');assert.match(next.text,/Stream-Elemente/);const audio=await ctx.testReply('Soundboard');assert.match(audio.text,/geplant/);const ai=await ctx.testReply('CFS AI');assert.match(ai.text,/separaten Dienst/);console.log('PASS: journey links/targets, storage failure handling, progress validation, problem-before-widget routing, Maker/Shop/Cut/OBS answers, contextual next step and accurate Audio/AI status.');})().catch(e=>{console.error(e);process.exitCode=1;});

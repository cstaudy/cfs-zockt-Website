import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const results=[];
const add=(name,ok)=>results.push({name,ok:Boolean(ok)});
const has=(text,token)=>String(text).includes(token);

const html=read('public/pages/stream-studio.html');
const js=read('public/assets/js/stream-studio.js');
const css=read('public/assets/css/stream-studio.css');
const runtime=read('public/assets/js/cfs-scene-runtime.js');
const server=read('server.js');
const sceneLibText=read('lib/creator-widget-scenes.js');
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');
const pkg=JSON.parse(read('package.json'));

for(const id of ['composerLayoutStatus','composerCopyLayout']) add(`Dual Canvas UI exposes ${id}`,has(html,`id="${id}"`));
add('16:9 tab exists',has(html,'data-composer-layout="landscape"'));
add('9:16 tab exists',has(html,'data-composer-layout="tiktok_vertical"'));
add('UI explains shared sources and separate positions',has(html,'Gleiche Quellen · eigene Positionen je Format'));
add('Dual Canvas styles exist',has(css,'Pass 21.10.4 · Dual Canvas')&&has(css,'.scene-composer-layouttabs'));
add('Dual Canvas layout is responsive',has(css,'@media(max-width:900px)')&&has(css,'.scene-composer-layoutbar{grid-template-columns:1fr}'));

add('client scene schema advanced to version 2',has(js,'return{version:2,profile:key'));
add('client stores both layouts',has(js,'layouts:{landscape,tiktok_vertical}'));
add('client can switch active layout',has(js,'function setComposerLayout'));
add('client keeps active layout aliases synchronized',has(js,'function syncComposerActiveLayout'));
add('client mirrors transforms between layouts',has(js,'function mirrorComposerLayout'));
add('client copy button is wired',has(js,'#composerCopyLayout')&&has(js,'copyComposerLayoutToOther'));
add('adding a source creates matching ids in both layouts',has(js,'landscape.items.push(defaultComposerItem')&&has(js,'tiktok.items.push(defaultComposerItem'));
add('removing a source removes it from every layout',has(js,'for(const layout of Object.values(state.composerConfig.layouts||{}))'));
add('each layout keeps independent numeric transforms',has(js,'function updateComposerItem')&&has(js,'composerLayoutKey()'));
add('scene output URL follows active canvas',has(js,'scene.source_urls?.[composerLayoutKey()]'));
add('program preview picks layout from output profile',has(js,'function sceneOutputLayout()')&&has(js,'vertical1080p60'));
add('preflight accepts visible source in either layout',has(js,'Object.values(state.composerConfig?.layouts||{})'));
add('legacy format-change compatibility message remains',has(js,'Format geändert. Quellen bleiben erhalten und können neu positioniert werden.'));

add('server sanitizer has per-layout allowlist',has(sceneLibText,'function sanitizeSceneLayout'));
add('server sanitizer migrates legacy scenes',has(sceneLibText,'function mirrorSceneLayout'));
add('server schema advanced to version 2',has(sceneLibText,'return{version:2,profile:key'));
add('server stores landscape and vertical layouts',has(sceneLibText,'layouts:{landscape,tiktok_vertical}'));
add('server ownership validation covers layouts',has(sceneLibText,'function sceneConfigItems')&&has(sceneLibText,'Object.values(config.layouts)'));
add('public scene exposes format-specific URLs',has(sceneLibText,'source_urls:{landscape:sceneUrl("landscape"),tiktok_vertical:sceneUrl("tiktok_vertical")'));
add('scene URLs carry explicit layout selector',has(sceneLibText,'&layout=${encodeURIComponent(layout)}'));
add('public scene hydration returns layouts',has(server,'hydratedLayouts')&&has(server,'layouts:hydratedLayouts'));
add('public scene hydration resolves sources from all layouts',has(server,'Object.values(layouts).flatMap'));

add('runtime reads requested layout from hash',has(runtime,'const requestedLayout='));
add('runtime accepts only supported layout keys',has(runtime,'["landscape","tiktok_vertical"].includes'));
add('runtime chooses hydrated layout',has(runtime,'payload.layouts?.[layoutKey]'));
add('runtime sizes canvas from selected layout',has(runtime,'const canvas=layout.canvas||{}'));
add('runtime renders selected layout items only',has(runtime,'items:layout.items||[]'));

const require=createRequire(import.meta.url);
const sceneLib=require(path.join(root,'lib/creator-widget-scenes.js'));
const legacy=sceneLib.sanitizeSceneConfig({profile:'landscape',canvas:{background:'#010203'},items:[{id:'same',widget_id:'w1',x:960,y:540,scale:1}]});
add('legacy scene migration produces both layouts',Boolean(legacy.layouts?.landscape&&legacy.layouts?.tiktok_vertical));
add('legacy migration keeps the same source id',legacy.layouts.landscape.items[0]?.id==='same'&&legacy.layouts.tiktok_vertical.items[0]?.id==='same');
add('legacy migration scales center to vertical center',legacy.layouts.tiktok_vertical.items[0]?.x===540&&legacy.layouts.tiktok_vertical.items[0]?.y===960);
const dual=sceneLib.sanitizeSceneConfig({version:2,profile:'landscape',layouts:{landscape:{items:[{id:'a',widget_id:'w1',x:100,y:200}]},tiktok_vertical:{items:[{id:'a',widget_id:'w1',x:300,y:400}]}}});
add('dual layouts preserve independent positions',dual.layouts.landscape.items[0]?.x===100&&dual.layouts.tiktok_vertical.items[0]?.x===300);
const row=sceneLib.publicSceneRow({id:'s1',name:'Dual',status:'live',public_token:'abc123',draft_config:dual,published_config:dual},'https://example.test');
add('public landscape URL is generated',row.source_urls.landscape.endsWith('&layout=landscape'));
add('public vertical URL is generated',row.source_urls.tiktok_vertical.endsWith('&layout=tiktok_vertical'));
const ownership=sceneLib.validateSceneOwnership(dual,[{id:'w1',status:'live',published_config:{}}]);
add('ownership validation accepts shared source once across layouts',ownership.ok&&ownership.errors.length===0);

add('new dual canvas check is registered',pkg.scripts?.['dual-canvas21:check']==='node tools/stream-studio-dual-canvas-pass21-10-4-test.mjs .');
add('previous workflow check remains registered',Boolean(pkg.scripts?.['stream-studio21:workflow-check']));
add('previous engine check remains registered',Boolean(pkg.scripts?.['stream-engine21:check']));
add('Master Checklist advanced to Pass 21.10.4',has(checklist,'Pass 21.10.4'));
add('Master Checklist records shared-source dual canvas',has(checklist,'gemeinsamen Sources')||has(checklist,'gemeinsame Quellen'));

add('Dual Canvas client does not introduce stream keys',!has(js,'stream_key')&&!has(js,'streamKey'));
add('Dual Canvas runtime does not use eval',!has(runtime,'eval(')&&!has(runtime,'new Function('));
add('scene sanitizer still caps each layout to 24 items',has(sceneLibText,'.slice(0,24)'));
add('scene transforms still server bounded',has(sceneLibText,'clamp(s.x,-4000,4000')&&has(sceneLibText,'clamp(s.scale,.1,5'));

const failed=results.filter(item=>!item.ok);
for(const item of results) console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\nStream Studio Dual Canvas Pass 21.10.4: ${results.length-failed.length}/${results.length} PASS`);
if(failed.length) process.exitCode=1;

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const require=createRequire(import.meta.url);
const results=[];
const add=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail:String(detail||'')});
const has=(text,token)=>String(text).includes(token);

for(const file of [
  'lib/creator-widget-scenes.js',
  'public/pages/scene-studio.html',
  'public/assets/js/scene-studio.js',
  'public/assets/css/scene-studio.css',
  'public/assets/js/cfs-scene-runtime.js',
  'public/assets/css/scene-runtime.css',
  'public/pages/widget-studio.html',
  'public/assets/js/widget-studio.js',
  'public/assets/css/widget-studio.css'
]) add(`${file} exists`,exists(file));

const scenes=require(path.join(root,'lib/creator-widget-scenes.js'));
add('scene transition sanitizer exported',typeof scenes.sanitizeSceneTransition==='function');
add('scene transition catalog exported',Boolean(scenes.SCENE_TRANSITIONS?.fade&&scenes.SCENE_TRANSITIONS?.zoom));
const fallback=scenes.sanitizeSceneConfig({profile:'landscape',items:[]});
add('old scenes remain hard-cut by default',fallback.transition?.type==='cut'&&fallback.transition?.duration_ms===0);
const fade=scenes.sanitizeSceneConfig({profile:'tiktok_vertical',transition:{type:'fade',duration_ms:720,easing:'ease_in_out'},items:[]});
add('fade transition persists through sanitizer',fade.transition?.type==='fade'&&fade.transition?.duration_ms===720&&fade.transition?.easing==='ease_in_out');
const clamped=scenes.sanitizeSceneTransition({type:'zoom',duration_ms:99999,easing:'bad'});
add('transition duration is bounded',clamped.duration_ms===2500);
add('invalid easing falls back safely',clamped.easing==='smooth');
const invalid=scenes.sanitizeSceneTransition({type:'made_up',duration_ms:600});
add('unknown transition falls back to cut',invalid.type==='cut'&&invalid.duration_ms===0);

const sceneHtml=read('public/pages/scene-studio.html');
for(const id of ['sceneTransition','sceneTransitionDuration','sceneTransitionDurationValue','sceneTransitionEase','previewSceneTransition']) add(`Scene Studio exposes ${id}`,has(sceneHtml,`id="${id}"`));
for(const value of ['cut','fade','dissolve','slide_left','slide_right','slide_up','zoom']) add(`Scene Studio offers ${value}`,has(sceneHtml,`value="${value}"`));
add('Scene Studio explains transitions in build flow',has(sceneHtml,'Ebenen, Übergang, Skalierung'));

const sceneJs=read('public/assets/js/scene-studio.js');
add('Scene Studio stores transition in new scene defaults',has(sceneJs,'transition:transitionDefaults()'));
add('Scene Studio normalizes transition state',has(sceneJs,'function normalizeTransition'));
add('Scene Studio previews transition locally',has(sceneJs,'function previewTransition'));
add('Scene Studio preserves transition when profile changes',has(sceneJs,'const transition=normalizeTransition(state.config?.transition)'));
add('Scene Studio marks transition edits dirty',has(sceneJs,'function updateTransition'));

const runtime=read('public/assets/js/cfs-scene-runtime.js');
add('public runtime reads published scene transition',has(runtime,'normalizeTransition(config.transition)'));
add('public runtime uses layered scene switching',has(runtime,'cfs-scene-layer')&&has(runtime,'currentLayer'));
add('public runtime animates incoming layer',has(runtime,'transitionFrames(transition.type,"in")'));
add('public runtime animates outgoing layer',has(runtime,'transitionFrames(transition.type,"out")'));
add('public runtime removes previous scene layer after transition',has(runtime,'previous.remove()'));
add('widget visibility overrides survive layered rendering',has(runtime,'visibilityOverrides')&&has(runtime,'querySelectorAll(".cfs-scene-widget")'));

const runtimeCss=read('public/assets/css/scene-runtime.css');
add('runtime layer is isolated and absolute',has(runtimeCss,'.cfs-scene-layer')&&has(runtimeCss,'isolation:isolate'));

const widgetHtml=read('public/pages/widget-studio.html');
for(const id of ['wsBoardTransition','wsBoardTransitionDuration','wsBoardTransitionDurationValue','wsBoardTransitionEase']) add(`Stream Board exposes ${id}`,has(widgetHtml,`id="${id}"`));
add('Stream Board exposes transition preview action',has(widgetHtml,'data-action="preview-board-transition"'));

const widgetJs=read('public/assets/js/widget-studio.js');
add('Stream Board default layout includes transition',has(widgetJs,'transition:defaultSceneTransition()'));
add('Stream Board loads saved transition',has(widgetJs,'layout.transition=normalizeSceneTransition(config.transition)'));
add('Stream Board saves transition into scene config',has(widgetJs,'transition:normalizeSceneTransition(layout.transition)'));
add('Stream Board previews transition',has(widgetJs,'function previewBoardTransition'));
add('Stream Board transition changes mark scene dirty',has(widgetJs,'boardTransition.onchange')&&has(widgetJs,'boardMarkDirty()'));

const server=read('server.js');
add('scene create still sanitizes config server-side',has(server,'sanitizeSceneConfig(req.body?.config'));
add('scene save still sanitizes config server-side',has(server,'const config=sanitizeSceneConfig(req.body?.config||existing.draft_config||{})'));
add('scene publish still sanitizes draft config',has(server,'const config=sanitizeSceneConfig(existing.draft_config||{})'));
add('public scene hydration sanitizes published config',has(server,'const config=sanitizeSceneConfig(sceneRow.published_config||{})'));

const homepage=read('public/index.html');
const suitePage=read('public/pages/creator-suite.html');
add('homepage advertises Scene Studio transitions',has(homepage,'Scene Studio')&&has(homepage,'Übergänge für Stream-Outputs'));
add('Creator Suite advertises Scene Studio transitions',has(suitePage,'Scene Studio')&&has(suitePage,'Übergänge'));

const packageJson=JSON.parse(read('package.json'));
add('scene21 check script registered',packageJson.scripts?.['scene21:check']==='node tools/scene-transitions-pass21-7-test.mjs .');
add('production scene smoke script registered',packageJson.scripts?.['production21:scene-smoke']==='node tools/production-scene-transitions-smoke-pass21-7.mjs https://cfs-zockt.de');

const failed=results.filter(r=>!r.ok);
for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${!r.ok&&r.detail?` · ${r.detail}`:''}`);
console.log(`\nScene Transitions Pass 21.7: ${results.length-failed.length}/${results.length} PASS`);
if(failed.length)process.exitCode=1;

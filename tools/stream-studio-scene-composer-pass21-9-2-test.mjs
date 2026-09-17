import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=path.resolve(process.argv[2]||'.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const results=[];
const add=(name,ok)=>results.push({name,ok:Boolean(ok)});
const has=(text,token)=>String(text).includes(token);

for(const file of [
  'public/pages/stream-studio.html',
  'public/assets/js/stream-studio.js',
  'public/assets/css/stream-studio.css',
  'public/pages/scene-studio.html',
  'server.js',
  'lib/creator-widget-scenes.js',
  'package.json',
  'CFS_MASTER_CHECKLIST_PASS21.md'
]) add(`${file} exists`,exists(file));

const html=read('public/pages/stream-studio.html');
const js=read('public/assets/js/stream-studio.js');
const css=read('public/assets/css/stream-studio.css');
const legacy=read('public/pages/scene-studio.html');
const server=read('server.js');
const sceneLib=read('lib/creator-widget-scenes.js');
const pkg=JSON.parse(read('package.json'));
const checklist=read('CFS_MASTER_CHECKLIST_PASS21.md');

add('Scene Composer is a first-class dock',has(html,'data-dock-id="scene_composer"')&&has(html,'id="scene-composer"'));
add('Scene Composer is in default client workspace',has(js,'center:["monitors","scene_composer","transition","overlay_rack"]'));
add('Scene Composer is in default server workspace',has(server,'center:["monitors","scene_composer","transition","overlay_rack"]'));
add('client dock allowlist includes Scene Composer',has(js,'"scene_composer","transition"'));
add('server dock allowlist includes Scene Composer',has(server,'"scene_composer","transition"'));
add('workspace description names Scene Composer',has(html,'Scene Composer, Preview/Program, Szenen, Übergänge'));

for(const id of [
  'newLandscapeStreamScene','newVerticalStreamScene','composerSceneStatus','composerSaveScene','composerPublishScene',
  'composerSceneName','composerSceneProfile','composerSceneBackground','composerSceneSafeArea',
  'composerSceneTransition','composerSceneTransitionDuration','composerSceneTransitionEasing','composerPreviewTransition',
  'composerViewport','composerCanvas','composerItems','composerProperties','composerSelectedSourceName',
  'composerItemX','composerItemY','composerItemScale','composerItemRotation','composerItemOpacity','composerItemZ',
  'composerLayerUp','composerLayerDown','composerToggleVisible','composerToggleLock','composerRemoveItem',
  'composerSceneOutputUrl','composerCopySceneUrl','composerOpenSceneUrl','composerDuplicateScene','composerDeleteScene'
]) add(`composer UI exposes ${id}`,has(html,`id="${id}"`));

add('16:9 Scene can be created in Stream Studio',has(js,'createComposerScene("landscape")'));
add('9:16 Scene can be created in Stream Studio',has(js,'createComposerScene("tiktok_vertical")'));
add('Scene creation reuses protected creator route',has(js,'/api/creator/widget-studio/scenes')&&has(server,'requireCreatorAccount'));
add('Scene save reuses protected creator PUT route',has(js,'method:"PUT"')&&has(js,'saveComposerScene'));
add('Scene publish reuses protected publish route',has(js,'/publish')&&has(js,'publishComposerScene'));
add('Scene delete requires explicit browser confirmation',has(js,'Scene „${scene.name}“ wirklich löschen?')&&has(js,'confirm('));
add('Scene duplicate creates a draft copy',has(js,'duplicateComposerScene')&&has(js,'Scene dupliziert. Die Kopie bleibt Draft.'));
add('Scene limit is enforced client-side before create/duplicate',has(js,'state.maxScenes')&&has(js,'Dein Zugriff erlaubt maximal'));
add('Scene limit remains enforced server-side',has(server,'max_scenes')&&has(server,'Dein Zugriff erlaubt maximal'));

add('Scene list supports drag ordering',has(js,'function sceneRowDragStart')&&has(js,'function sceneRowDrop'));
add('Scene list exposes dedicated drag handle',has(html,'Szenenliste')&&has(js,'data-scene-drag'));
add('scene order is stored in stream config',has(js,'scene_order')&&has(server,'scene_order'));
add('server filters scene order by owned scene IDs',has(server,'ownedSceneIds?requestedSceneOrder.filter(id=>ownedSceneIds.has(id))'));
add('server appends missing owned scene IDs safely',has(server,'for(const id of ownedSceneIds)'));
add('live Preview remains restricted to published scenes',has(js,'scene.status!=="live"')&&has(server,'liveSceneIds'));
add('Program still uses only published source URL',has(js,'if(!preview?.source_url)'));

add('published CFS sources can be added natively to Scene',has(js,'data-add-scene-source')&&has(js,'addComposerSource'));
add('draft sources are rejected by Scene Composer',has(js,'source.status!=="live"'));
add('Scene source count is capped at 24',has(js,'state.composerConfig.items.length>=24'));
add('server Scene sanitizer also caps items at 24',has(sceneLib,'.slice(0,24)'));
add('source ownership still validated server-side',has(sceneLib,'validateSceneOwnership')&&has(server,'validateSceneOwnership'));
add('only creator-owned published widgets can publish',has(server,'Scene enthält ungültige oder nicht veröffentlichte Widgets.')&&has(server,'Vor Publish müssen alle Scene-Widgets veröffentlicht sein.'));

add('Scene items can be dragged on canvas',has(js,'function composerDragStart')&&has(js,'function composerDragMove'));
add('locked Scene items do not move',has(js,'if(item.locked)return'));
add('visibility can be toggled',has(js,'composerToggleVisible')&&has(js,'"visible"'));
add('locking can be toggled',has(js,'composerToggleLock')&&has(js,'"locked"'));
add('layer order can be adjusted',has(js,'function composerLayer')&&has(html,'EBENE +')&&has(html,'EBENE −'));
add('position is editable numerically',has(html,'id="composerItemX"')&&has(html,'id="composerItemY"'));
add('scale is bounded',has(js,'Math.max(.1,Math.min(5'));
add('rotation is bounded',has(js,'Math.max(-360,Math.min(360'));
add('opacity is bounded',has(js,'Math.max(0,Math.min(1'));
add('server sanitizes item transforms',has(sceneLib,'clamp(s.x,-4000,4000')&&has(sceneLib,'clamp(s.scale,.1,5'));

for(const transition of ['cut','fade','dissolve','slide_left','slide_right','slide_up','zoom']) add(`Scene transition ${transition} supported`,has(js,transition)&&has(sceneLib,transition));
add('Scene transition duration remains bounded',has(js,'Math.max(120,Math.min(2500')&&has(sceneLib,'120,2500'));
add('Scene transition easing is supported',has(html,'composerSceneTransitionEasing')&&has(sceneLib,'SCENE_TRANSITION_EASINGS'));
add('reduced motion disables transition preview',has(js,'prefers-reduced-motion: reduce'));

add('Scene output URL only activates for live Scene',has(js,'scene.status==="live"?scene.source_url'));
add('Scene output URL can be copied without exposing credentials',has(js,'navigator.clipboard.writeText(url)'));
add('Scene iframe content stays non-interactive while dragging',has(css,'.scene-composer-item iframe')&&has(css,'pointer-events:none'));
add('safe area is visible and configurable',has(html,'composerSafeGuide')&&has(js,'safe_area'));
add('format changes preserve sources instead of resetting items',has(js,'Format geändert. Quellen bleiben erhalten'));
add('legacy Scene Studio points creators to integrated Composer',has(legacy,'/pages/stream-studio.html#scene-composer')&&has(legacy,'Scene Composer ist jetzt direkt'));
add('legacy Scene Studio remains available as compatibility fallback',has(legacy,'id="sceneCanvas"')&&has(legacy,'id="publishScene"'));

add('Scene Composer layout is responsive',has(css,'@media(max-width:1100px)')&&has(css,'.scene-composer-workarea{grid-template-columns:1fr}'));
add('Scene Composer has mobile controls',has(css,'@media(max-width:700px)')&&has(css,'.scene-composer-toolbar,.scene-composer-transition{grid-template-columns:1fr}'));
add('Scene rows have drag visual state',has(css,'.stream-scene-row.dragging'));
add('selected Scene is visually distinct',has(css,'.stream-scene-row.selected'));
add('dirty Scene state is visually distinct',has(css,'.scene-composer-status.dirty'));

add('Stream Studio config still stores no stream key field',!has(js,'stream_key')&&!has(js,'streamKey'));
add('Scene Composer does not use eval',!has(js,'eval(')&&!has(js,'new Function('));
add('Scene item renderer escapes source URL',has(js,'CFS.escape(url)'));
add('Scene names are escaped in list rendering',has(js,'CFS.escape(scene.name)'));
add('server Scene name remains length bounded',has(server,'studioText(req.body?.name,120'));
add('server Scene config remains allowlist-sanitized',has(sceneLib,'function sanitizeSceneConfig'));

add('new Scene Composer check is registered',pkg.scripts?.['scene-composer21:check']==='node tools/stream-studio-scene-composer-pass21-9-2-test.mjs .');
add('previous dock layout check remains registered',Boolean(pkg.scripts?.['studio-layout21:check']));
add('previous scene transition check remains registered',Boolean(pkg.scripts?.['scene21:check']));
add('previous Stream Studio check remains registered',Boolean(pkg.scripts?.['stream21:check']));
add('previous Multistream check remains registered',Boolean(pkg.scripts?.['multistream21:check']));
add('Master Checklist advanced to Pass 21.9.2',has(checklist,'Pass 21.9.2'));
add('Master Checklist records integrated Scene Composer',has(checklist,'Scene Composer direkt im Stream Studio'));

const failed=results.filter(item=>!item.ok);
for(const item of results) console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\nStream Studio Scene Composer Pass 21.9.2: ${results.length-failed.length}/${results.length} PASS`);
if(failed.length) process.exitCode=1;

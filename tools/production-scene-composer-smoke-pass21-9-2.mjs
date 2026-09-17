import process from 'node:process';
const base=String(process.argv[2]||'https://cfs-zockt.de').replace(/\/$/,'');
const results=[];const add=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
async function request(path,options={}){const response=await fetch(base+path,{redirect:'manual',...options});const text=await response.text();let body={};try{body=JSON.parse(text)}catch{}return{response,text,body}}
try{
  const page=await request('/pages/stream-studio.html');
  add('Stream Studio page is reachable',page.response.status===200,`HTTP ${page.response.status}`);
  add('integrated Scene Composer UI is deployed',page.text.includes('id="scene-composer"')&&page.text.includes('id="composerCanvas"'));
  add('Scene create controls are deployed',page.text.includes('id="newLandscapeStreamScene"')&&page.text.includes('id="newVerticalStreamScene"'));
  add('Scene transition editor is deployed',page.text.includes('id="composerSceneTransition"')&&page.text.includes('id="composerSceneTransitionDuration"'));
  const script=await request('/assets/js/stream-studio.js');
  add('Scene Composer client logic is deployed',script.response.status===200&&script.text.includes('function saveComposerScene')&&script.text.includes('function sceneRowDrop'),`HTTP ${script.response.status}`);
  const anonStudio=await request('/api/creator/stream-studio');
  add('creator Stream Studio API requires login',anonStudio.response.status===401,`HTTP ${anonStudio.response.status}`);
  const anonScenes=await request('/api/creator/widget-studio/scenes');
  add('creator Scene API requires login',anonScenes.response.status===401,`HTTP ${anonScenes.response.status}`);
  const bridge=await request('/api/bridge/stream-studio/config');
  add('launcher Stream Studio bridge requires bridge auth',[401,403].includes(bridge.response.status),`HTTP ${bridge.response.status}`);
}catch(error){add('production request completed',false,error.message)}
const failed=results.filter(r=>!r.ok);for(const r of results)console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` · ${r.detail}`:''}`);console.log(`\nProduction Scene Composer Smoke Pass 21.9.2: ${results.length-failed.length}/${results.length} PASS`);if(failed.length)process.exitCode=1;

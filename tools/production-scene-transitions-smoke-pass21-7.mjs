import process from 'node:process';

const base=String(process.argv[2]||'https://cfs-zockt.de').replace(/\/+$/,'');
const results=[];
const add=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail:String(detail||'')});

async function get(pathname){
  const response=await fetch(base+pathname,{redirect:'manual',headers:{'user-agent':'cfs-zockt-pass21-scene-smoke/1.0'}});
  const text=await response.text();
  return{response,text};
}

try{
  const page=await get('/pages/scene-studio.html');
  add('Scene Studio page returns 200',page.response.status===200,`HTTP ${page.response.status}`);
  add('Scene Studio deploy contains transition selector',page.text.includes('id="sceneTransition"'));
  add('Scene Studio deploy contains duration control',page.text.includes('id="sceneTransitionDuration"'));
  add('Scene Studio deploy contains transition preview',page.text.includes('id="previewSceneTransition"'));

  const sceneJs=await get('/assets/js/scene-studio.js');
  add('Scene Studio JS returns 200',sceneJs.response.status===200,`HTTP ${sceneJs.response.status}`);
  add('Scene Studio JS contains transition preview runtime',sceneJs.text.includes('function previewTransition'));

  const runtime=await get('/assets/js/cfs-scene-runtime.js');
  add('Scene runtime JS returns 200',runtime.response.status===200,`HTTP ${runtime.response.status}`);
  add('Scene runtime deploy contains layered transitions',runtime.text.includes('cfs-scene-layer')&&runtime.text.includes('transitionFrames'));

  const runtimeCss=await get('/assets/css/scene-runtime.css');
  add('Scene runtime CSS returns 200',runtimeCss.response.status===200,`HTTP ${runtimeCss.response.status}`);
  add('Scene runtime CSS contains transition layer',runtimeCss.text.includes('.cfs-scene-layer'));

  const widgetPage=await get('/pages/widget-studio.html');
  add('Widget Studio page returns 200',widgetPage.response.status===200,`HTTP ${widgetPage.response.status}`);
  add('Stream Board deploy contains transition selector',widgetPage.text.includes('id="wsBoardTransition"'));

  const protectedScenes=await get('/api/creator/widget-studio/scenes');
  add('Scene API remains protected without login',protectedScenes.response.status===401,`HTTP ${protectedScenes.response.status}`);
}catch(error){
  add('production scene smoke completed',false,error?.message||String(error));
}

const failed=results.filter(r=>!r.ok);
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` · ${r.detail}`:''}`);
console.log(`\nProduction Scene Transitions Pass 21.7: ${results.length-failed.length}/${results.length} PASS`);
if(failed.length)process.exitCode=1;

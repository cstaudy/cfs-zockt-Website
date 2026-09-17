import process from 'node:process';
const base=String(process.argv[2]||'https://cfs-zockt.de').replace(/\/$/,'');
const results=[];const add=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
async function request(path,options={}){const response=await fetch(base+path,{redirect:'manual',...options});const text=await response.text();let body={};try{body=JSON.parse(text)}catch{}return{response,text,body}}
try{
  const page=await request('/pages/stream-studio.html');
  add('Stream Studio page is reachable',page.response.status===200,`HTTP ${page.response.status}`);
  add('Local Multistream UI is deployed',page.text.includes('LOCAL MULTISTREAM')&&page.text.includes('id="multistreamTargets"'));
  add('Multistream credentials remain launcher-local in UI',page.text.includes('ausschließlich im lokalen Launcher'));
  add('Cloud relay remains disabled in UI',page.text.includes('Cloud Relay bleibt deaktiviert'));
  const anon=await request('/api/creator/stream-studio');
  add('creator Stream Studio API requires login',anon.response.status===401,`HTTP ${anon.response.status}`);
  const bridge=await request('/api/bridge/stream-studio/config');
  add('launcher Stream Studio bridge requires bridge auth',[401,403].includes(bridge.response.status),`HTTP ${bridge.response.status}`);
}catch(error){add('production request completed',false,error.message)}
const failed=results.filter(r=>!r.ok);for(const r of results)console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` · ${r.detail}`:''}`);console.log(`\nProduction Local Multistream Smoke Pass 21.9: ${results.length-failed.length}/${results.length} PASS`);if(failed.length)process.exitCode=1;

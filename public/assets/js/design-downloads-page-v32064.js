(function(){'use strict';
const root=document.getElementById('designDownloads');if(!root)return;
const M=window.StreamMaker,D=window.CFSDesignDownloads;
const grid=document.getElementById('designDownloadGrid'),color=document.getElementById('designDownloadColor'),status=document.getElementById('designDownloadStatus');
const message=(value,error=false)=>{status.textContent=value;status.hidden=false;status.classList.toggle('error',error);};
if(!M||!D){message('Designkatalog kann nicht geladen werden.',true);return;}
for(let i=0;i<M.colors.length;i++){const opt=document.createElement('option');opt.value=M.colors[i];opt.textContent=M.colorNames[i];color.append(opt);}
let catalog=[],busy=false;
function draw(card,designId){const canvas=card.querySelector('canvas'),b=D.bundle(M,designId,color.value);M.render(canvas,b,b.elements.find(e=>e.template==='lower'),null);}
function render(){grid.replaceChildren();catalog.forEach(item=>{
 const card=document.createElement('article');card.className='design-download-card';
 const visual=document.createElement('div');visual.className='design-download-preview';const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',item.name+' Designvorschau');visual.append(canvas);
 const h=document.createElement('h3');h.textContent=item.name;const description=document.createElement('p');description.textContent=item.description;
 const buttons=document.createElement('div');buttons.className='design-download-actions';const dl=document.createElement('button');dl.type='button';dl.textContent='ZIP herunterladen ↓';dl.dataset.downloadDesign=item.id;
 const maker=document.createElement('a');maker.href='/pages/stream-maker.html?design='+encodeURIComponent(item.id)+'&color='+encodeURIComponent(color.value);maker.textContent='Im Maker öffnen ↗';buttons.append(dl,maker);card.append(visual,h,description,buttons);grid.append(card);draw(card,item.id);
 dl.onclick=async()=>{if(busy)return;busy=true;dl.disabled=true;message(`${item.name}: PNGs und ZIP werden lokal erstellt …`);
  try{const blob=await D.packageFor(M,item.id,color.value,async(b,e)=>{const c=document.createElement('canvas');M.render(c,b,e,null);return c;});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cfs-basisdesign-${item.id}-${color.value.slice(1)}.zip`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   message(`${item.name}: ZIP erstellt (${(blob.size/1024/1024).toFixed(1)} MB). Die Bilder sind statisch.`);
  }catch(error){message(error?.message||'ZIP-Download fehlgeschlagen.',true);}finally{busy=false;dl.disabled=false;}
 };
 });}
color.onchange=render;
fetch('/assets/data/design-download-catalog-v32064.json',{cache:'no-store',credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Designkatalog fehlt.');return r.json();}).then(data=>{
 if(data.kind!=='cfs-built-in-design-catalog'||data.schema!==1||data.original_design_packs_included!==false||!Array.isArray(data.designs)||data.designs.length!==M.designs.length||data.designs.some((item,i)=>item.id!==M.designs[i]?.id||item.name!==M.designs[i]?.name))throw Error('Designkatalog und Renderer passen nicht zusammen.');
 catalog=data.designs;render();message(data.message);
}).catch(error=>message(error.message||'Designkatalog nicht verfügbar.',true));
})();

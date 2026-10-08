/* CFS AI generated design gallery: shows ONLY locally approved, deployed artifacts. */
(function(){'use strict';
 const grid=document.getElementById('shopAiGeneratedGrid');
 const summary=document.getElementById('shopAiGeneratedStatus');
 if(!grid||!summary)return;
 const idOk=value=>/^[a-f\d]{32}$/i.test(value);
 const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const pathOk=(value,id,suffix)=>String(value||'')===`/assets/ai-generated/${id}${suffix}`;
 const setStatus=value=>{summary.textContent=value;};
 fetch('/assets/data/cfs-ai-designs-v32068.json',{credentials:'same-origin',cache:'no-store'})
 .then(response=>{if(!response.ok)throw Error('KI-Design-Katalog nicht erreichbar.');return response.json();})
 .then(catalog=>{
  if(catalog.kind!=='cfs-ai-reviewed-designs'||catalog.schema!==1||!Array.isArray(catalog.designs))throw Error('KI-Design-Katalog ungültig.');
  const designs=catalog.designs.slice(0,120).filter(d=>idOk(d.id)&&pathOk(d.preview_url,d.id,'-preview.svg')&&pathOk(d.download_url,d.id,'.zip'));
  if(!designs.length){setStatus('Noch keine freigegebenen neuen CFS-AI-Designs. Der lokale Worker sammelt Entwürfe zur Prüfung.');grid.replaceChildren();return;}
  grid.innerHTML=designs.map(d=>`<article class="shop-ai-generated-card">
   <div class="shop-ai-generated-media"><img loading="lazy" src="${d.preview_url}" alt="${safe(d.name)} – generierter Stream-Look"></div>
   <div class="shop-ai-generated-content"><span class="shop-ai-generated-origin">CFS AI · geprüft</span><h3>${safe(d.name)}</h3><p>${safe(d.description)}</p><small>${safe(d.category||'Design')} · ${Number(d.files)||8} Vektorgrafiken (SVG)</small></div>
   <a class="sm-btn sm-primary" href="${d.download_url}" download="">Designpaket herunterladen ↓</a>
  </article>`).join('');
  setStatus(`${designs.length} freigegebene KI-Design${designs.length===1?'':'s'}. Die 31 Originaldesignwelten bleiben separat erhalten.`);
 })
 .catch(()=>setStatus('KI-Design-Galerie konnte nicht geladen werden. Originaldesigns sind weiterhin verfügbar.'));
})();

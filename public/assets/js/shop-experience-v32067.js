/* Shop 3.20.67: Discover, product preview and catalog-grounded CFS AI Designberater. */
(function(){'use strict';
 const $=id=>document.getElementById(id),A=window.CFSShopAdvisor;
 if(!$('shopDiscovery')||!A)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
 const state={catalog:null,groups:[],picks:[],recommendations:[],source:'katalog',busy:false};
 const notice=(message)=>{$('shopAiStatus').textContent=message;};
 const params=()=>({description:$('shopAiDescription').value,category:$('shopAiStyle').value,platform:$('shopAiPlatform').value,mode:$('shopAiMode').value,color:$('originalDesignColor')?.value||'blau'});
 const detail=(id,color='blau',group='voll')=>`/pages/original-design.html?design=${encodeURIComponent(id)}&color=${encodeURIComponent(color)}&group=${encodeURIComponent(group)}`;
 function fillDiscovery(){const c=state.catalog;
  $('shopFeatured').innerHTML=['blitze','graphitgold','nachtgarten'].map(id=>{const d=c.designs.find(x=>x.id===id);if(!d)return '';const color=d.colors.find(x=>x.id==='blau')||d.colors[0];return `<a class="shop-featured-card" href="${detail(d.id,color.id)}"><img src="${esc(color.preview.cover)}" alt="${esc(d.name)}" loading="lazy" decoding="async"><span>${esc(c.categories.find(x=>x.id===d.category)?.name||d.category)}</span><strong>${esc(d.name)}</strong><small>Designwelt entdecken ↗</small></a>`;}).join('');
  $('shopAiStyle').innerHTML='<option value="all">Stil offen</option>'+c.categories.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  $('shopDownloadDesign').innerHTML=c.designs.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  $('shopDownloadGroup').innerHTML=state.groups.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  for(const color of c.colors){const o=document.createElement('option');o.value=color.id;o.textContent=color.name;$('shopDownloadColor').append(o);}
  $('shopDownloadDesign').value='blitze';$('shopDownloadColor').value='blau';$('shopDownloadGroup').value='voll';
  for(const id of ['shopDownloadDesign','shopDownloadColor','shopDownloadGroup'])$(id).addEventListener('change',showDownload);
  showDownload();
  $('shopDownloadAction').addEventListener('click',()=>{const item=selectedDownload();if(!item)return;const href=`/api/original-designs/package/${encodeURIComponent(item.design.id)}/${encodeURIComponent(item.color.id)}/${encodeURIComponent(item.group.id)}.zip`;const a=document.createElement('a');a.href=href;a.download='';a.rel='nofollow';document.body.append(a);a.click();a.remove();$('shopDownloadInfo').textContent=`${item.design.name} · ${item.group.name}: Download angefordert. Alle Dateien bleiben im Originalformat.`;});
 }
 function selectedDownload(){const design=state.catalog?.designs.find(x=>x.id===$('shopDownloadDesign').value);if(!design)return null;const color=design.colors.find(x=>x.id===$('shopDownloadColor').value)||design.colors[0];const group=state.groups.find(x=>x.id===$('shopDownloadGroup').value)||state.groups[0];return {design,color,group};}
 function showDownload(){const p=selectedDownload();if(!p)return;const png=p.group.id==='voll'?36:p.group.png_numbers.length,scenes=p.group.id==='voll'?29:p.group.scene_numbers.length;
  $('shopDownloadPreview').src=p.color.preview.cover;$('shopDownloadPreview').alt=`Originalvorschau: ${p.design.name} in ${p.color.name}`;
  $('shopDownloadInfo').textContent=`${png} PNG-Grafiken · ${scenes} Szenen-HTMLs · gemeinsame Szenenressourcen, Vorschau und Anleitung. Dies sind Originaldateien, keine aktivierten Live-Widgets.`;
  $('shopDownloadDetails').href=detail(p.design.id,p.color.id,p.group.id);
 }
 function renderPicks(){const selected=state.recommendations;const c=state.catalog;const group=state.groups.find(g=>g.id==='voll')||state.groups[0];$('shopAiResults').innerHTML=selected.map(x=>{const d=c.designs.find(r=>r.id===x.id);if(!d)return '';const color=d.colors.find(r=>r.id===x.color)||d.colors[0];return `<article class="shop-ai-result"><img src="${esc(color.preview.cover)}" alt="${esc(d.name)}" loading="lazy" decoding="async"><div><strong>${esc(d.name)}</strong><small>${esc(c.categories.find(cat=>cat.id===d.category)?.name||d.category)} · ${esc(color.name)}</small><p>${esc(d.vibe)}</p><a href="${detail(d.id,color.id,group.id)}">Design ansehen ↗</a></div></article>`;}).join('')||'<p>Keine passenden Originaldesigns gefunden.</p>';
 }
 async function submit(event){event.preventDefault();if(!state.catalog||state.busy)return;
  state.busy=true;$('shopAiGo').disabled=true;
  const p=params();const fallback=A.recommend(state.catalog,p,3);state.recommendations=fallback;state.source='katalog';renderPicks();notice('Katalogbasierte Empfehlungen · ohne externes KI-Modell.');
  try{
   // The existing CFS AI gateway is admin-only. Never bypass its authorization.
   const me=window.CFS?.requireAuth?await CFS.requireAuth():null;
   if(me?.admin){
    const status=await CFS.json('/api/creator/cfs-ai/status');
    if(status.gateway?.enabled&&status.gateway?.configured&&status.service?.ollama?.online){
     notice('CFS AI analysiert deine Auswahl über den geschützten Admin-Gateway …');
     const response=await CFS.json('/api/creator/cfs-ai/chat',{method:'POST',body:JSON.stringify({mode:'assistant',message:A.prompt(state.catalog,p),history:[]})});
     const ids=A.aiSuggestionIds(response?.answer||'',state.catalog,3);
     if(ids.length){state.recommendations=ids.map(id=>{const d=state.catalog.designs.find(x=>x.id===id);return {id:d.id,color:d.colors.some(c=>c.id===p.color)?p.color:d.colors[0].id};});state.source='ai';renderPicks();notice('CFS AI · Modellvorschläge, auf echte Designwelten begrenzt. Nichts wurde gespeichert oder veröffentlicht.');}
     else notice('Das Modell lieferte keine eindeutig zuordenbaren Designs. Deshalb siehst du sichere Katalogempfehlungen.');
    }else notice('CFS AI ist nicht aktiviert oder das Modell ist offline. Du siehst katalogbasierte Empfehlungen.');
   }else notice('Katalogbasierte Designberatung. Das echte CFS-AI-Modell ist derzeit ausschließlich für Admins freigeschaltet.');
  }catch(error){notice('CFS AI zurzeit nicht verfügbar. Die katalogbasierten Empfehlungen bleiben nutzbar.');}
  finally{state.busy=false;$('shopAiGo').disabled=false;}
 }
 $('shopAiForm').addEventListener('submit',submit);
 Promise.all([
  fetch('/assets/data/original-design-catalog-v32065.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Originalkatalog fehlt');return r.json();}),
  fetch('/assets/data/original-design-product-groups-v32066.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Produktgruppen fehlen');return r.json();})
 ]).then(([catalog,groups])=>{if(catalog.designs?.length!==31||groups.groups?.length!==7)throw Error('Unvollständiger Katalog');state.catalog=catalog;state.groups=groups.groups;fillDiscovery();notice('Beschreibe deinen Stream für passende Katalogdesigns. Bei verfügbarem Admin-Modell unterstützt dich zusätzlich CFS AI.');}).catch(error=>{notice('Der Designkatalog konnte nicht geladen werden.');$('shopDownloadInfo').textContent='Die Downloads sind momentan nicht verfügbar.';});
})();

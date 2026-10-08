/* 3.20.66: category-aware catalog for real, ZIP-backed CFS original-design products. */
(function(){'use strict';
const root=document.getElementById('originalDesigns');if(!root)return;
const grid=document.getElementById('originalDesignGrid'),status=document.getElementById('originalDesignStatus');
const filters=document.getElementById('originalDesignCategoryFilters');
const colorSelect=document.getElementById('originalDesignColor'),groupSelect=document.getElementById('originalDesignProductGroup');
const search=document.getElementById('originalDesignSearch');
const state={catalog:null,groups:null,category:'all',query:'',color:'blau',group:'voll'};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const setStatus=(text,error=false)=>{status.hidden=false;status.textContent=text;status.classList.toggle('error',Boolean(error));};
const selectedColor=design=>(design.colors||[]).find(color=>color.id===state.color)||design.colors?.[0];
const currentGroup=()=>state.groups.find(group=>group.id===state.group)||state.groups[0];
const categoryName=id=>state.catalog.categories.find(cat=>cat.id===id)?.name||id;
function renderFilters(){
 const options=[{id:'all',name:'Alle Stilrichtungen'},...state.catalog.categories];
 filters.innerHTML=options.map(cat=>`<button type="button" class="${state.category===cat.id?'active':''}" data-design-category="${esc(cat.id)}" aria-pressed="${state.category===cat.id?'true':'false'}">${esc(cat.name)}</button>`).join('');
 filters.querySelectorAll('button').forEach(button=>button.onclick=()=>{state.category=button.dataset.designCategory;render();});
}
function render(){
 renderFilters();const group=currentGroup();
 const items=state.catalog.designs.filter(design=>{
  const hay=[design.name,design.vibe,categoryName(design.category),...(design.search_terms||[])].join(' ').toLowerCase();
  return (state.category==='all'||design.category===state.category)&&(!state.query||hay.includes(state.query));
 });
 if(!items.length){grid.innerHTML='<div class="shop-empty shop-workflow-empty"><strong>Keine Designprodukte gefunden.</strong><span>Ändere die Stilrichtung oder den Suchbegriff.</span></div>';setStatus('Keine passenden Designprodukte.');return;}
 grid.innerHTML=items.map(design=>{
  const color=selectedColor(design),id=encodeURIComponent(design.id),cid=encodeURIComponent(color.id),gid=encodeURIComponent(group.id);
  const maker=`/pages/stream-maker.html?pack=${id}&color=${cid}`;
  const detail=`/pages/original-design.html?design=${id}&color=${cid}&group=${gid}`;
  const download=`/api/original-designs/package/${id}/${cid}/${gid}.zip`;
  const galleryCount=group.id==='voll'?36:group.png_numbers.length;
  const sceneCount=group.id==='voll'?29:group.scene_numbers.length;
  return `<article class="original-design-card" style="--product-accent:${esc(color.accent)}">
    <div class="original-design-preview"><a href="${detail}" aria-label="${esc(design.name)}: Produktdetails öffnen"><img src="${esc(color.preview.cover)}" alt="Designwelt-Vorschau ${esc(design.name)} in ${esc(color.name)}" loading="lazy"></a><div class="original-design-overlay-tags"><span class="original-design-pill">${esc(group.tag)}</span><span class="original-design-pill secondary">16 Farben</span></div></div>
    <div class="original-design-copy"><div class="original-design-meta"><span>${esc(categoryName(design.category))}</span><span>Originaldesign</span></div>
    <h3><a href="${detail}">${esc(design.name)}</a></h3><p>${esc(design.vibe)}</p>
    <div class="original-design-product-name">${esc(group.name)}</div><div class="original-design-stats"><span>${galleryCount} PNGs</span><span>${sceneCount} Szenen-HTMLs</span><span>${esc(color.name)}</span></div></div>
    <div class="original-design-actions"><a class="sm-btn sm-primary" href="${detail}">Details ansehen ↗</a><a class="sm-btn" href="${download}">ZIP herunterladen ↓</a><a class="sm-btn original-design-maker" href="${maker}">Im Maker öffnen ↗</a></div></article>`;
 }).join('');
 setStatus(`${items.length} Designwelt${items.length===1?'':'en'} · Produkt: ${group.name} · Farbe: ${colorSelect.options[colorSelect.selectedIndex]?.textContent||state.color}`);
}
Promise.all([
 fetch('/assets/data/original-design-catalog-v32065.json',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Designkatalog fehlt.');return r.json();}),
 fetch('/assets/data/original-design-product-groups-v32066.json',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Produktgruppen fehlen.');return r.json();})
]).then(([catalog,groups])=>{
 if(catalog.kind!=='cfs-original-design-catalog'||catalog.schema!==1||!Array.isArray(catalog.designs)||catalog.designs.length!==31||groups.kind!=='cfs-original-design-product-groups'||groups.schema!==1||!Array.isArray(groups.groups)||groups.groups.length!==7)throw Error('Originaldesign-Katalog oder Produktgruppen ungültig.');
 state.catalog=catalog;state.groups=groups.groups;
 colorSelect.innerHTML=catalog.colors.map(color=>`<option value="${esc(color.id)}">${esc(color.name)}</option>`).join('');
 groupSelect.innerHTML=groups.groups.map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('');
 colorSelect.value=state.color;groupSelect.value=state.group;
 colorSelect.onchange=()=>{state.color=colorSelect.value;render();};groupSelect.onchange=()=>{state.group=groupSelect.value;render();};
 search.oninput=()=>{state.query=search.value.trim().toLowerCase();render();};
 render();
}).catch(error=>setStatus(error.message||'Originaldesign-Katalog konnte nicht geladen werden.',true));
})();

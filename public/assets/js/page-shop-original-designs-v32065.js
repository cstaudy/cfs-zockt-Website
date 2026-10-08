(function(){'use strict';
const root=document.getElementById('originalDesigns');if(!root)return;
const grid=document.getElementById('originalDesignGrid');
const status=document.getElementById('originalDesignStatus');
const filters=document.getElementById('originalDesignCategoryFilters');
const colorSelect=document.getElementById('originalDesignColor');
const search=document.getElementById('originalDesignSearch');
const state={catalog:null,category:'all',query:'',color:'blau'};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const setStatus=(text,error=false)=>{if(!status)return;status.hidden=false;status.textContent=text;status.classList.toggle('error',!!error);};
const selectedColor=design=>{const wanted=String(state.color||'').trim().toLowerCase();return (Array.isArray(design?.colors)?design.colors:[]).find(entry=>String(entry.id||'').toLowerCase()===wanted)||design?.colors?.[0]||null;};
const visibleDesigns=()=>{const designs=Array.isArray(state.catalog?.designs)?state.catalog.designs:[];return designs.filter(design=>{const hay=[design.name,design.vibe,design.category,(design.search_terms||[]).join(' ')].join(' ').toLowerCase();return (state.category==='all'||String(design.category)===(state.category))&&(!state.query||hay.includes(state.query));});};
function renderFilters(){
  const cats=Array.isArray(state.catalog?.categories)?state.catalog.categories:[];
  filters.innerHTML=[`<button type="button" class="${state.category==='all'?'active':''}" data-design-category="all">ALLE</button>`].concat(cats.map(cat=>`<button type="button" class="${state.category===cat.id?'active':''}" data-design-category="${esc(cat.id)}">${esc(cat.name)}</button>`)).join('');
  filters.querySelectorAll('[data-design-category]').forEach(button=>button.onclick=()=>{state.category=button.dataset.designCategory;render();});
}
function renderColors(){
  const colors=Array.isArray(state.catalog?.colors)?state.catalog.colors:[];
  colorSelect.innerHTML=colors.map(color=>`<option value="${esc(color.id)}">${esc(color.name)}</option>`).join('');
  if(colors.some(color=>color.id===state.color))colorSelect.value=state.color;
  colorSelect.onchange=()=>{state.color=colorSelect.value;render();};
}
function render(){
  renderFilters();
  const items=visibleDesigns();
  if(!items.length){grid.innerHTML='<div class="shop-empty shop-workflow-empty"><strong>Keine Originaldesigns für diese Auswahl gefunden.</strong><span>Ändere die Stilrichtung, die Farbe oder den Suchbegriff.</span></div>';setStatus('Keine passenden Originaldesigns für den aktuellen Filter.');return;}
  grid.innerHTML=items.map(design=>{const color=selectedColor(design);const accent=esc(color?.accent||design.default_accent||'#38bdf8');const preview=esc(color?.preview?.cover||design.preview?.cover||'');const download=esc(color?.download_url||'#');const maker=esc(color?.maker_url||`/pages/stream-maker.html?pack=${encodeURIComponent(design.id)}`);const count=Array.isArray(design.colors)?design.colors.length:0;return `<article class="original-design-card" style="--product-accent:${accent}"><div class="original-design-preview"><img src="${preview}" alt="${esc(design.name)} in ${esc(color?.name||'Standard')}" loading="lazy"></div><div class="original-design-copy"><div class="original-design-meta"><span>${esc(design.category)}</span><strong>${count} Farben</strong></div><h3>${esc(design.name)}</h3><p>${esc(design.vibe||'Originaldesignpaket')}</p><div class="original-design-stats"><span>${esc((design.stats?.png??36)+' PNGs')}</span><span>${esc((design.stats?.scenes??29)+' Szenen')}</span><span>${esc(color?.name||'')}</span></div></div><div class="original-design-actions"><a class="sm-btn sm-primary" href="${maker}">Im Maker öffnen ↗</a><a class="sm-btn" href="${download}">ZIP herunterladen ↓</a></div></article>`;}).join('');
  setStatus(`${items.length} Originaldesign${items.length===1?'':'s'} · Farbe: ${colorSelect.options[colorSelect.selectedIndex]?.textContent||state.color}`);
}
fetch('/assets/data/original-design-catalog-v32065.json',{credentials:'same-origin',cache:'no-store'})
  .then(response=>{if(!response.ok)throw new Error('Originaldesign-Katalog fehlt.');return response.json();})
  .then(data=>{if(data.kind!=='cfs-original-design-catalog'||data.schema!==1||!Array.isArray(data.designs)||data.designs.length<1)throw new Error('Originaldesign-Katalog ist ungültig.');state.catalog=data;renderColors();search.addEventListener('input',event=>{state.query=String(event.target.value||'').trim().toLowerCase();render();});render();setStatus(data.message||'Originaldesigns geladen.');})
  .catch(error=>setStatus(error.message||'Originaldesigns konnten nicht geladen werden.',true));
})();

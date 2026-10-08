/* 3.20.66: individual design-world detail page; data and assets are strictly catalog-backed. */
(function(){'use strict';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const params=new URLSearchParams(location.search);const state={catalog:null,groups:null,design:null,color:null,group:null};
const status=$('designDetailStatus');
const notice=(msg,error=false)=>{status.textContent=msg;status.classList.toggle('error',Boolean(error));};
function render(){
 const design=state.design,color=state.color,group=state.group;
 if(!design||!color||!group)return;
 document.title=`${design.name} · ${group.name} | CFS Zockt Creator Shop`;
 $('detailTitle').textContent=design.name;
 $('detailSummary').textContent=design.vibe;
 $('detailStyle').textContent=state.catalog.categories.find(c=>c.id===design.category)?.name||design.category;
 $('detailProduct').textContent=group.name;
 $('detailDescription').textContent=group.description;
 $('detailAccent').style.backgroundColor=/^#[\da-f]{6}$/i.test(color.accent)?color.accent:'#38bdf8';
 $('detailColor').textContent=color.name;
 const images=group.gallery.filter(name=>/^\d{2}-[A-Za-z0-9ÄÖÜäöüß-]{1,90}\.png$/.test(name)).map(name=>({name,url:`/api/original-designs/asset/${encodeURIComponent(design.id)}/${encodeURIComponent(color.id)}/${encodeURIComponent(name)}`}));
 const primary=images[0];
 $('detailMainImage').src=primary?.url||color.preview.cover;
 $('detailMainImage').alt=`${design.name} · ${group.name} · ${color.name} · Originaldatei`;
 $('detailThumbs').innerHTML=images.map((img,index)=>`<button type="button" data-image="${index}" class="${index===0?'active':''}" aria-label="Vorschau ${esc(img.name)} öffnen" aria-pressed="${index===0?'true':'false'}"><img src="${esc(img.url)}" alt="${esc(img.name)}" loading="lazy"></button>`).join('');
 $('detailThumbs').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{const img=images[Number(btn.dataset.image)];$('detailMainImage').src=img.url;$('detailMainImage').alt=`${design.name} · ${img.name} · ${color.name}`;$('detailThumbs').querySelectorAll('button').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});});
 const pngCount=group.id==='voll'?36:group.png_numbers.length,sceneCount=group.id==='voll'?29:group.scene_numbers.length;
 $('detailContents').textContent=`${pngCount} PNG-Dateien · ${sceneCount} Szenen-HTML-Dateien · Vorschau, Farbdatei, Anleitung und gemeinsame Szenenressourcen`;
 $('detailDownload').href=`/api/original-designs/package/${encodeURIComponent(design.id)}/${encodeURIComponent(color.id)}/${encodeURIComponent(group.id)}.zip`;
 $('detailMaker').href=`/pages/stream-maker.html?pack=${encodeURIComponent(design.id)}&color=${encodeURIComponent(color.id)}`;
 $('detailColorSelect').value=color.id;$('detailGroupSelect').value=group.id;
 notice(`Originaldesign ${design.name} · ${group.name} · ${color.name}.`);
}
function select(){const design=state.design;state.color=design.colors.find(c=>c.id===$('detailColorSelect').value)||design.colors[0];state.group=state.groups.find(g=>g.id===$('detailGroupSelect').value)||state.groups[0];history.replaceState(null,'',`?design=${encodeURIComponent(design.id)}&color=${encodeURIComponent(state.color.id)}&group=${encodeURIComponent(state.group.id)}`);render();}
Promise.all([
 fetch('/assets/data/original-design-catalog-v32065.json',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Originaldesign-Katalog fehlt.');return r.json();}),
 fetch('/assets/data/original-design-product-groups-v32066.json',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Produktgruppen fehlen.');return r.json();})
]).then(([catalog,groupDoc])=>{
 if(catalog.kind!=='cfs-original-design-catalog'||groupDoc.kind!=='cfs-original-design-product-groups')throw Error('Katalogdaten ungültig.');
 const design=catalog.designs.find(d=>d.id===params.get('design'));
 if(!design)throw Error('Die gewünschte Designwelt existiert nicht. Bitte wähle ein Design im Shop.');
 state.catalog=catalog;state.groups=groupDoc.groups;state.design=design;
 $('detailColorSelect').innerHTML=design.colors.map(color=>`<option value="${esc(color.id)}">${esc(color.name)}</option>`).join('');
 $('detailGroupSelect').innerHTML=state.groups.map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('');
 $('detailColorSelect').onchange=select;$('detailGroupSelect').onchange=select;
 state.color=design.colors.find(color=>color.id===params.get('color'))||design.colors[0];
 state.group=state.groups.find(group=>group.id===params.get('group'))||state.groups[0];
 render();
}).catch(error=>{$('designDetail').hidden=true;notice(error.message||'Designdetails konnten nicht geladen werden.',true);$('detailBack').hidden=false;});
})();

/* CFS built-in design downloads. No legacy original artwork, server uploads or external ZIP library. */
(function(root,factory){const exports=factory();if(typeof module==='object'&&module.exports)module.exports=exports;else root.CFSDesignDownloads=exports;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TEMPLATES=['camera','lower','social','starting','brb','ending','about'];
const encoder=new TextEncoder();
function selection(M,id,color){
 if(!M||!Array.isArray(M.designs)||!Array.isArray(M.colors))throw Error('Stream Maker fehlt.');
 const design=M.designs.find(row=>row.id===id);
 if(!design)throw Error('Unbekanntes Basisdesign.');
 if(!M.colors.includes(color))throw Error('Unbekannte Farbvariante.');
 return {design,color};
}
function bundle(M,id,color){
 const {design}=selection(M,id,color);
 const model=M.bundle(design.id);model.name=`${design.name} · Basisdesign`;model.accent=color;
 model.elements=TEMPLATES.map(template=>M.element(template));
 model.elements.forEach((element,index)=>{element.id=`design_${index+1}_${element.template}`;element.runtime={running:false,anchor:0,elapsed:0,alertUntil:0};});
 return M.sanitize(model);
}
function documentFor(M,id,color){return {kind:'cfs-maker-design-download',schema:1,origin:'built-in-generated-v32064',config:bundle(M,id,color)};}
function parseDocument(M,raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.kind!=='cfs-maker-design-download'||raw.schema!==1||raw.origin!=='built-in-generated-v32064')throw Error('Keine unterstützte CFS-Basisdesign-Datei.');
 const b=raw.config;
 if(!b||typeof b!=='object'||Array.isArray(b)||!Array.isArray(b.elements)||b.elements.length!==TEMPLATES.length||b.source||b.variants?.length||!TEMPLATES.every((id,index)=>b.elements[index]?.template===id))throw Error('Das Basisdesign hat eine ungültige Struktur.');
 selection(M,b.design,b.accent);
 // Reject embedded remote/private assets and additional keys rather than trusting deserialized runtime.
 const safe=bundle(M,b.design,b.accent);
 safe.name=String(b.name||safe.name).replace(/[\u0000-\u001f]/g,' ').slice(0,120);
 for(let i=0;i<safe.elements.length;i++){
  const source=b.elements[i];
  if(!source||typeof source!=='object'||source.source||source.image||source.url)throw Error('Unerlaubte Bildreferenz im Basisdesign.');
  safe.elements[i].text=typeof source.text==='string'?source.text.replace(/[\u0000-\u001f]/g,' ').slice(0,160):safe.elements[i].text;
  safe.elements[i].subtitle=typeof source.subtitle==='string'?source.subtitle.replace(/[\u0000-\u001f]/g,' ').slice(0,160):safe.elements[i].subtitle;
 }
 return M.sanitize(safe);
}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function nameOk(name){return typeof name==='string'&&name.length<130&&/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name)&&!name.startsWith('/')&&!name.includes('//')&&!name.split('/').some(x=>x==='.'||x==='..')&&name.split('/').every(x=>x.length>0);}
async function zip(files){
 if(!Array.isArray(files)||files.length<1||files.length>32)throw Error('Ungültige Paketgröße.');
 const parts=[],centers=[];let offset=0,total=0;const seen=new Set();
 for(const entry of files){
  if(!nameOk(entry.name)||seen.has(entry.name))throw Error('Unsicherer oder doppelter ZIP-Pfad.');seen.add(entry.name);
  const name=encoder.encode(entry.name),bytes=entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer());
  if(bytes.length>10_000_000||total+bytes.length>40_000_000)throw Error('Designpaket zu groß.');total+=bytes.length;
  const crc=crc32(bytes),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
  lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint32(14,crc,true);lv.setUint32(18,bytes.length,true);lv.setUint32(22,bytes.length,true);lv.setUint16(26,name.length,true);local.set(name,30);
  parts.push(local,bytes);
  const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
  centers.push(central);offset+=local.length+bytes.length;
 }
 const centerSize=centers.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centerSize,true);e.setUint32(16,offset,true);
 return new Blob([...parts,...centers,end],{type:'application/zip'});
}
async function pngFor(canvas){
 if(!canvas||typeof canvas.toBlob!=='function')throw Error('PNG-Export wird von diesem Browser nicht unterstützt.');
 const blob=await new Promise((resolve,reject)=>{try{canvas.toBlob(value=>value?resolve(value):reject(Error('PNG konnte nicht erstellt werden.')),'image/png');}catch(e){reject(e);}});
 if(blob.type!=='image/png'||blob.size<8||blob.size>10_000_000)throw Error('Ungültige PNG-Ausgabe.');const header=new Uint8Array(await blob.slice(0,8).arrayBuffer());if(![137,80,78,71,13,10,26,10].every((value,i)=>header[i]===value))throw Error('PNG-Signatur ungültig.');return blob;
}
async function packageFor(M,id,color,render){
 selection(M,id,color);if(typeof render!=='function')throw Error('Kein Canvas-Renderer.');
 const doc=documentFor(M,id,color),files=[
  {name:'stream-maker.json',data:encoder.encode(JSON.stringify(doc,null,2)+'\n')},
  {name:'README.txt',data:encoder.encode(`CFS Zockt · generiertes Basisdesign ${id}\n\nDiese Datei stammt aus 8 integrierten Farb-/Formdesigns, NICHT aus den fehlenden 31 Original-Designwelten.\nPNG-Dateien sind statische Bilder ohne Live-Daten, Ton oder Provider-Anbindung.\nZum Bearbeiten: Stream Maker öffnen und stream-maker.json über „Basisdesign importieren“ laden.\nLive-Widgets: Widget Studio; Sounds: Tonstudio.\n`)},
  {name:'manifest.json',data:encoder.encode(JSON.stringify({kind:doc.kind,schema:1,origin:doc.origin,id,color,files:TEMPLATES.map(x=>`png/${x}.png`)},null,2)+'\n')}
 ];
 for(const element of doc.config.elements){
  const canvas=await render(doc.config,element);
  files.push({name:`png/${element.template}.png`,data:await pngFor(canvas)});
 }
 return zip(files);
}
return {TEMPLATES,selection,bundle,documentFor,parseDocument,crc32,nameOk,zip,pngFor,packageFor};
});

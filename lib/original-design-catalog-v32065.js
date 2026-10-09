'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {execFileSync}=require('child_process');

const CATALOG_PATH=path.join(__dirname,'..','public','assets','data','original-design-catalog-v32065.json');
const SOURCE_ZIP_PATH=process.env.CFS_ORIGINAL_DESIGNS_ARCHIVE_PATH ? path.resolve(process.env.CFS_ORIGINAL_DESIGNS_ARCHIVE_PATH) : path.join(__dirname,'..','resources','original-designs','Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip');
const ZIP_ROOT='Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE';
const DESIGNS_ROOT=`${ZIP_ROOT}/Designs`;
const GUIDE_FILES=[`${ZIP_ROOT}/ANLEITUNG-DE.html`,`${ZIP_ROOT}/ANLEITUNG-DE.txt`];
const PRODUCT_GROUPS=require('../public/assets/data/original-design-product-groups-v32066.json').groups;
const findGroup=id=>PRODUCT_GROUPS.find(g=>g.id===String(id||'voll'))||null;
let catalogCache=null;
let entryCache=null;
function getCatalog(){
  if(!catalogCache){catalogCache=JSON.parse(fs.readFileSync(CATALOG_PATH,'utf8'));}
  return catalogCache;
}
function listEntries(){
  if(!entryCache){
    const out=execFileSync('unzip',['-Z','-1',SOURCE_ZIP_PATH],{encoding:'utf8',maxBuffer:64*1024*1024});
    entryCache=out.split(/\r?\n/).filter(Boolean);
  }
  return entryCache;
}
function findDesign(designId){
  const id=String(designId||'').trim().toLowerCase();
  return getCatalog().designs.find(row=>String(row.id).toLowerCase()===id)||null;
}
function findVariant(designId,colorId){
  const design=findDesign(designId);if(!design)return null;
  const cid=String(colorId||'').trim().toLowerCase();
  const color=(design.colors||[]).find(row=>String(row.id).toLowerCase()===cid)||null;
  return color?{design,color}:null;
}
function previewEntry(designId,colorId){
  const match=findVariant(designId,colorId);if(!match)return null;
  return `${DESIGNS_ROOT}/${match.design.source_name}/${match.color.source_name}/Vorschau.jpg`;
}
function packageEntries(designId,colorId,groupId='voll'){
  const match=findVariant(designId,colorId),group=findGroup(groupId);if(!match||!group)return [];
  const prefix=`${DESIGNS_ROOT}/${match.design.source_name}/${match.color.source_name}/`;
  const files=listEntries();
  const allowed=new Set(files);
  const numberFrom=(name,section)=>{const relative=name.slice(prefix.length);const found=new RegExp(`^${section}/(\\d{2})-`).exec(relative);return found?Number(found[1]):null;};
  const all=files.filter(name=>{
    if(!name.startsWith(prefix)||name.endsWith('/'))return false;
    if(group.id==='voll')return true;
    if(name===`${prefix}Farbe.txt`||name===`${prefix}Vorschau.jpg`)return true;
    const png=numberFrom(name,'PNG'),scene=numberFrom(name,'Szenen');
    return (png!==null&&group.png_numbers.includes(png))||(scene!==null&&group.scene_numbers.includes(scene));
  });
  // HTML scenes resolve their dependencies through ../../../../Kern and Hintergruende.
  // Include only the selected world's support files, not all 31 worlds.
  const extra=[`${ZIP_ROOT}/Kern/engine.css`,`${ZIP_ROOT}/Kern/engine.js`,`${ZIP_ROOT}/Kern/Bilddaten/${match.design.source_name}.js`,`${ZIP_ROOT}/Hintergruende/${match.design.source_name}.png`].filter(entry=>allowed.has(entry));
  return [...GUIDE_FILES.filter(name=>allowed.has(name)),...extra,...all];
}
function assetEntry(designId,colorId,file){
  const match=findVariant(designId,colorId);
  if(!match||!/^\d{2}-[A-Za-z0-9ÄÖÜäöüß-]{1,90}\.png$/.test(String(file||'')))return null;
  const full=`${DESIGNS_ROOT}/${match.design.source_name}/${match.color.source_name}/PNG/${file}`;
  return listEntries().includes(full)?full:null;
}
function assetBuffer(designId,colorId,file){
  const entry=assetEntry(designId,colorId,file);if(!entry)throw new Error('Design-Asset nicht gefunden.');
  return readEntry(entry);
}

function relativePackageName(fullEntry){
  if(fullEntry.startsWith(`${ZIP_ROOT}/`))return fullEntry.slice(ZIP_ROOT.length+1);
  return fullEntry;
}
function readEntry(fullEntry){
  return execFileSync('unzip',['-p',SOURCE_ZIP_PATH,fullEntry],{encoding:null,maxBuffer:64*1024*1024});
}
function safeZipPath(name){
  return typeof name==='string'&&name.length>0&&name.length<240&&/^[A-Za-z0-9ÄÖÜäöüß._\-/]+$/.test(name)&&!name.startsWith('/')&&!name.includes('..')&&!name.split('/').some(part=>!part||part==='.'||part==='..');
}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function buildZip(files){
  const parts=[],centers=[];let offset=0;const seen=new Set();
  for(const file of files){
    const name=String(file.name||'');
    if(!safeZipPath(name)||seen.has(name))throw new Error('Unsicherer ZIP-Pfad im Originaldesignpaket.');
    seen.add(name);
    const nameBuf=Buffer.from(name,'utf8');
    const data=Buffer.isBuffer(file.data)?file.data:Buffer.from(file.data);
    const crc=crc32(data);
    const local=Buffer.alloc(30+nameBuf.length);
    local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(nameBuf.length,26);nameBuf.copy(local,30);
    parts.push(local,data);
    const central=Buffer.alloc(46+nameBuf.length);
    central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(nameBuf.length,28);central.writeUInt32LE(offset,42);nameBuf.copy(central,46);
    centers.push(central);offset+=local.length+data.length;
  }
  const centerSize=centers.reduce((sum,buf)=>sum+buf.length,0);
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centerSize,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...parts,...centers,end]);
}
function packageBuffer(designId,colorId,groupId='voll'){
  const match=findVariant(designId,colorId),group=findGroup(groupId);if(!match||!group)throw new Error('Designvariante oder Produktgruppe nicht gefunden.');
  const files=packageEntries(designId,colorId,groupId).map(entry=>({name:relativePackageName(entry),data:readEntry(entry)}));
  return {buffer:buildZip(files),downloadName:`cfs-originaldesign-${match.design.id}-${match.color.id}-${group.id}.zip`,design:match.design,color:match.color,group,fileCount:files.length};
}
function previewBuffer(designId,colorId){
  const entry=previewEntry(designId,colorId);if(!entry)throw new Error('Vorschau nicht gefunden.');
  return readEntry(entry);
}
function packageEtag(designId,colorId,groupId='voll'){
  const match=findVariant(designId,colorId);if(!match)return '';
  const stat=fs.statSync(SOURCE_ZIP_PATH);
  return crypto.createHash('sha1').update(`${match.design.id}:${match.color.id}:${groupId}:${stat.size}:${stat.mtimeMs}`).digest('hex');
}
module.exports={CATALOG_PATH,SOURCE_ZIP_PATH,getCatalog,findDesign,findVariant,findGroup,PRODUCT_GROUPS,previewEntry,assetEntry,assetBuffer,packageEntries,packageBuffer,previewBuffer,packageEtag};

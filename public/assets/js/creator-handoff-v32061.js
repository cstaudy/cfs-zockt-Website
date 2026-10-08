/* Shared, browser-side source contract for Stream Maker -> Widget Studio.
   Never uses external sources as importer input. The upload endpoint still
   performs its normal authenticated owner, MIME and content checks. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.CFSCreatorHandoff=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TOKEN=/^\/widget-assets\/([a-f0-9]{48})$/i;
 const PUBLIC_IMAGE=/^\/assets\/(?:img|designs)\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i;
 const TYPES={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
 function sourceUrl(source,origin){
  if(typeof source!=='string'||!source.trim()||typeof origin!=='string')return null;
  try{
   const base=new URL(origin),url=new URL(source,base);
   if(!['http:','https:'].includes(base.protocol)||url.origin!==base.origin||url.username||url.password)return null;
   if(url.hash||url.search||/%2f|%5c|\\|\/\.|\/\//i.test(url.pathname))return null;
   return url;
  }catch{return null}
 }
 function assetToken(source,origin){const url=sourceUrl(source,origin);return url?.pathname.match(TOKEN)?.[1]?.toLowerCase()||''}
 function importableImage(source,origin){const url=sourceUrl(source,origin);return url&&PUBLIC_IMAGE.test(url.pathname)?url.pathname:''}
 function handoffUrl(token,mode='widget'){
  if(!/^[a-f0-9]{48}$/i.test(String(token||'')))throw Error('Ungültige Bildreferenz');
  const params=new URLSearchParams({open:mode==='overlay'?'asset':'converter',maker_asset:token.toLowerCase(),source:'stream-maker'});
  return '/pages/widget-studio.html?'+params.toString();
 }
 async function importPublicImage(source,origin,{fetchImage,uploadFile,FileClass=File}={}){
  const path=importableImage(source,origin);
  if(!path)throw Error('Nur lokale PNG-, JPG- oder WebP-Designbilder können übernommen werden.');
  if(typeof fetchImage!=='function'||typeof uploadFile!=='function')throw Error('Importfunktion nicht verfügbar.');
  const response=await fetchImage(path,{credentials:'same-origin',redirect:'error',cache:'no-store'});
  if(!response?.ok)throw Error('Die Bildvorlage ist derzeit nicht erreichbar.');
  const blob=await response.blob();const type=String(blob.type||'').toLowerCase().split(';')[0];
  if(!TYPES[type]||!blob.size||blob.size>12*1024*1024)throw Error('Bildvorlage muss PNG, JPG oder WebP sein und darf höchstens 12 MB groß sein.');
  const file=new FileClass([blob],`Stream-Maker-Design.${TYPES[type]}`,{type});
  const uploaded=await uploadFile(file);
  const token=assetToken(uploaded,origin);
  if(!token)throw Error('Der geschützte Bild-Upload hat keine gültige Medienreferenz geliefert.');
  return {url:uploaded,token};
 }
 return {assetToken,importableImage,handoffUrl,importPublicImage};
});

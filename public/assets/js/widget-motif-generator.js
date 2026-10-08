/* CFS Widget Motif Generator · 3.20.59
   The original image stays in the creator's library. A local canvas derives
   a transparent, bounded decorative layer; no event data is synthesized. */
(function(root,factory){const result=factory();if(typeof module==='object'&&module.exports)module.exports=result;else root.CFSWidgetMotif=result;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const styles=['prism','ribbon','glass'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
function palette(pixels){
 if(!pixels||!pixels.length)return {accent:'#38bdf8',secondary:'#a7dfff',text:'#f8fafc'};
 const groups=new Map();let count=0;
 for(let i=0;i+3<pixels.length;i+=4){const [r,g,b,a]=pixels.slice(i,i+4);if(a<160)continue;count++;const max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max-min;
  if(sat<32||max<65)continue;const key=[r,g,b].map(v=>Math.round(v/48)).join(':');const row=groups.get(key)||{r:0,g:0,b:0,weight:0};const w=(sat/255+.15)*(max/255+.2);row.r+=r*w;row.g+=g*w;row.b+=b*w;row.weight+=w;groups.set(key,row);
 }
 const ranked=[...groups.values()].sort((a,b)=>b.weight-a.weight).slice(0,4);
 if(!ranked.length)return {accent:'#38bdf8',secondary:'#a7dfff',text:'#f8fafc'};
 const primary=ranked[0],alt=ranked.find(row=>Math.abs(row.r/row.weight-primary.r/primary.weight)+Math.abs(row.g/row.weight-primary.g/primary.weight)+Math.abs(row.b/row.weight-primary.b/primary.weight)>75)||ranked[1]||primary;
 return {accent:hex(primary.r/primary.weight,primary.g/primary.weight,primary.b/primary.weight),secondary:hex(alt.r/alt.weight,alt.g/alt.weight,alt.b/alt.weight),text:'#f8fafc'};
}
function safeSource(source,origin){try{const url=new URL(source,origin);return url.origin===origin&&/^\/widget-assets\/[a-f0-9]{48}$/.test(url.pathname)?url.href:null;}catch{return null;}}
function draw(ctx,image,style='prism',width=960,height=180){
 if(!ctx||!image||!styles.includes(style))throw new Error('Motiv oder Designmodus ungültig.');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<120||width>1920||height<60||height>1080)throw new Error('Bildgröße nicht unterstützt.');
 ctx.clearRect(0,0,width,height);
 const drawCover=(x,y,w,h)=>{const iw=Math.max(1,image.naturalWidth||image.width),ih=Math.max(1,image.naturalHeight||image.height),scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale;ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h);};
 ctx.save();ctx.beginPath();
 if(style==='prism'){
  ctx.moveTo(0,0);ctx.lineTo(width*.31,0);ctx.lineTo(width*.205,height*.78);ctx.lineTo(0,height);ctx.closePath();
 }else if(style==='ribbon'){
  ctx.moveTo(0,0);ctx.lineTo(width*.25,0);ctx.lineTo(width*.29,height*.55);ctx.lineTo(width*.18,height);ctx.lineTo(0,height);ctx.closePath();
 }else{
  const edge=width*.23;ctx.moveTo(0,0);ctx.lineTo(edge,0);ctx.lineTo(edge,height);ctx.lineTo(0,height);ctx.closePath();
 }
 ctx.clip();drawCover(0,0,width*(style==='ribbon'?.32:.34),height);ctx.restore();
 // A soft local fade avoids a hard rectangular cut. The central data area stays transparent.
 ctx.save();ctx.globalCompositeOperation='destination-out';const fade=ctx.createLinearGradient(width*.12,0,width*.34,0);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');ctx.fillStyle=fade;ctx.fillRect(0,0,width*.36,height);ctx.restore();
 ctx.save();ctx.globalAlpha=.7;const baseline=ctx.createLinearGradient(0,0,width,0);baseline.addColorStop(0,'rgba(125,228,255,.7)');baseline.addColorStop(.42,'rgba(125,228,255,.23)');baseline.addColorStop(1,'rgba(125,228,255,0)');ctx.fillStyle=baseline;ctx.fillRect(0,height-4,width,3);ctx.restore();
}
function analyzeImage(image){const canvas=document.createElement('canvas');canvas.width=48;canvas.height=30;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas nicht verfügbar.');ctx.drawImage(image,0,0,48,30);return palette(ctx.getImageData(0,0,48,30).data);}
async function makePng(source,{style='prism',origin=location.origin}={}){
 const safe=safeSource(source,origin);if(!safe)throw new Error('Bitte ein eigenes Bild aus deiner Medienbibliothek auswählen.');
 const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Masterbild konnte nicht geladen werden.'));img.src=safe;});
 const colors=analyzeImage(image),canvas=document.createElement('canvas');canvas.width=960;canvas.height=180;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas nicht verfügbar.');draw(ctx,image,style,960,180);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Widget-Motiv konnte nicht exportiert werden.')),'image/png'));
 return {file:new File([blob],`cfs-widget-motiv-${style}.png`,{type:'image/png'}),colors};
}
return {styles,palette,safeSource,draw,makePng};
});

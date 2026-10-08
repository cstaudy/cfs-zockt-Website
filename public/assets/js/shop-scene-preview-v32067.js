/* Simulated OBS canvas. Only original PNGs are loaded; demo is never labeled LIVE. */
(function(){'use strict';
 const $=id=>document.getElementById(id);if(!$('shopScenePreview'))return;
 const camera=$('shopSceneCamera'),alert=$('shopSceneAlert'),stage=$('shopScenePreview');
 function update(){
  const query=new URLSearchParams(location.search),d=String(query.get('design')||''),c=String(query.get('color')||'');
  if(!/^[a-z0-9-]{2,60}$/.test(d)||!/^[a-z0-9-]{2,40}$/.test(c))return;
  const base=`/api/original-designs/asset/${encodeURIComponent(d)}/${encodeURIComponent(c)}/`;
  $('shopSceneCameraAsset').src=base+encodeURIComponent('07-Kamerarahmen-16zu9.png');
  $('shopSceneAlertAsset').src=base+encodeURIComponent('10-Hinweis-Follower.png');
  stage.classList.toggle('no-camera',!camera.checked);stage.classList.toggle('no-alert',!alert.checked);
  $('shopSceneState').textContent=`${d} · ${c} · Kamera ${camera.checked?'sichtbar':'aus'} · Alert ${alert.checked?'sichtbar':'aus'} · reine Grafikvorschau, keine Live-Werte.`;
 }
 camera.onchange=update;alert.onchange=update;
 // Detail page updates the URL on product and color changes. Listen to select controls directly.
 for(const id of ['detailColorSelect','detailGroupSelect'])$(id)?.addEventListener('change',()=>{setTimeout(update,0);});
 update();
})();

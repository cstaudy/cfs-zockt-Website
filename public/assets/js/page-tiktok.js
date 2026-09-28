let currentTikTok=null;

function ttSetProof(node,state,label){
  if(!node)return;
  node.classList.remove('ok','warn','off');
  node.classList.add(state);
  node.textContent=label;
}

function ttFormatDate(value){
  if(!value)return 'Noch keine Synchronisierung';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return 'Zeitpunkt nicht verfügbar';
  return date.toLocaleString('de-DE');
}

function renderTikTokConfirmation(d){
  const panel=document.getElementById('ttConfirmation');
  const title=document.getElementById('ttConfirmationTitle');
  const text=document.getElementById('ttConfirmationText');
  const badge=document.getElementById('ttConfirmationBadge');
  const icon=document.getElementById('ttConfirmationIcon');
  const account=document.getElementById('ttProofAccount');
  const stats=document.getElementById('ttProofStats');
  const sync=document.getElementById('ttProofSync');
  const name=document.getElementById('ttProofName');
  const followers=document.getElementById('ttProofFollowers');
  const updated=document.getElementById('ttProofUpdated');
  if(!panel)return;

  panel.classList.remove('is-connected','is-warning','is-offline');
  const connected=Boolean(d?.connected);
  const statsAllowed=Boolean(d?.scopes?.stats);
  const followerCount=Number(d?.profile?.follower_count);
  const hasFollowerData=connected&&statsAllowed&&Number.isFinite(followerCount);

  if(connected&&statsAllowed){
    panel.classList.add('is-connected');
    if(icon)icon.textContent='✓';
    if(badge)badge.textContent='VERBINDUNG BESTÄTIGT';
    if(title)title.textContent='TikTok-Profil ist verbunden';
    if(text)text.textContent='Dein TikTok-Profil ist diesem Creator-Konto eindeutig zugeordnet. Profilwerte und Follower können synchronisiert werden.';
  }else if(connected){
    panel.classList.add('is-warning');
    if(icon)icon.textContent='!';
    if(badge)badge.textContent='VERBUNDEN · STATS FEHLEN';
    if(title)title.textContent='TikTok-Profil verbunden – Statistik-Berechtigung prüfen';
    if(text)text.textContent='Die Profil-Verbindung besteht, aber user.info.stats wurde nicht bestätigt. Followerwerte können dadurch unvollständig sein.';
  }else{
    panel.classList.add('is-offline');
    if(icon)icon.textContent='×';
    if(badge)badge.textContent='NICHT VERBUNDEN';
    if(title)title.textContent='TikTok-Profil ist noch nicht verbunden';
    if(text)text.textContent='Verbinde dein TikTok-Konto, damit Follower, Profil-Likes und Videos diesem Creator-Konto zugeordnet werden.';
  }

  ttSetProof(account,connected?'ok':'off',connected?'✓ VERBUNDEN':'NICHT VERBUNDEN');
  ttSetProof(stats,hasFollowerData?'ok':(connected?'warn':'off'),hasFollowerData?'✓ AKTIV':(connected?'PRÜFEN':'INAKTIV'));
  ttSetProof(sync,d?.updated_at?'ok':(connected?'warn':'off'),d?.updated_at?'✓ BESTÄTIGT':(connected?'AUSSTEHEND':'INAKTIV'));

  if(name)name.textContent=connected?(d?.profile?.display_name||'TikTok Creator'):'–';
  if(followers)followers.textContent=hasFollowerData?`${followerCount.toLocaleString('de-DE')} Follower`:'–';
  if(updated)updated.textContent=ttFormatDate(d?.updated_at);
}

async function loadTikTok(){
  const d=await CFS.json('/api/creator/tiktok/status');currentTikTok=d;
  ttStatus.textContent=d.connected?'VERBUNDEN':'OFFLINE';
  ttText.textContent=d.connected?'Dein persönlicher TikTok-Account ist mit diesem Creator-Konto verbunden.':'Verbinde deinen eigenen TikTok-Account.';
  ttConnect.hidden=d.connected;ttSync.hidden=!d.connected;ttDisconnect.hidden=!d.connected;
  ttFollowers.textContent=d.connected?Number(d.profile?.follower_count||0).toLocaleString('de-DE'):'–';
  ttLikes.textContent=d.connected?Number(d.profile?.likes_count||0).toLocaleString('de-DE'):'–';
  ttVideos.textContent=d.connected?Number(d.profile?.video_count||0).toLocaleString('de-DE'):'–';
  ttName.textContent=d.connected?(d.profile?.display_name||'TIKTOK CREATOR').toUpperCase():'NOCH NICHT VERBUNDEN.';
  ttUpdated.textContent=d.updated_at?'Letzte Synchronisation: '+new Date(d.updated_at).toLocaleString('de-DE'):'Noch keine Synchronisation.';
  renderTikTokConfirmation(d);
}

document.addEventListener('DOMContentLoaded',async()=>{
  const me=await CFS.requireAuth();if(!me)return;
  try{await loadTikTok()}catch(e){
    ttStatus.textContent='FEHLER';ttText.textContent=e.message;
    renderTikTokConfirmation({connected:false});
  }
  ttSync.onclick=async()=>{ttSync.disabled=true;try{await CFS.json('/api/creator/tiktok/sync',{method:'POST',body:'{}'});await loadTikTok()}catch(e){alert(e.message)}finally{ttSync.disabled=false}};
  ttDisconnect.onclick=async()=>{if(!confirm('TikTok-Verbindung für dein Creator-Konto wirklich trennen?'))return;ttDisconnect.disabled=true;try{await CFS.json('/api/creator/tiktok/disconnect',{method:'POST',body:'{}'});await loadTikTok()}catch(e){alert(e.message)}finally{ttDisconnect.disabled=false}};
});

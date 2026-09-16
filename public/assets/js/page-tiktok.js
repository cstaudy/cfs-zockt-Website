let currentTikTok=null;
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
}
document.addEventListener('DOMContentLoaded',async()=>{
  const me=await CFS.requireAuth();if(!me)return;
  try{await loadTikTok()}catch(e){ttStatus.textContent='FEHLER';ttText.textContent=e.message}
  ttSync.onclick=async()=>{ttSync.disabled=true;try{await CFS.json('/api/creator/tiktok/sync',{method:'POST',body:'{}'});await loadTikTok()}catch(e){alert(e.message)}finally{ttSync.disabled=false}};
  ttDisconnect.onclick=async()=>{if(!confirm('TikTok-Verbindung für dein Creator-Konto wirklich trennen?'))return;ttDisconnect.disabled=true;try{await CFS.json('/api/creator/tiktok/disconnect',{method:'POST',body:'{}'});await loadTikTok()}catch(e){alert(e.message)}finally{ttDisconnect.disabled=false}};
});

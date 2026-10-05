document.addEventListener("DOMContentLoaded", async () => {
  const me = await CFS.requireAuth();
  if (!me) return;

  const actionError = (error, title = "Provider-Aktion nicht abgeschlossen") => {
    const message = error?.message || "Die Aktion konnte nicht abgeschlossen werden.";
    if (window.CFSCreatorUX?.announce) {
      window.CFSCreatorUX.announce(message, "error", { title });
      return;
    }
    console.error(title, error);
  };

  try {
    const tt = await CFS.json("/api/creator/tiktok/status");
    const betaBlocked = tt?.beta_access?.required === true && tt?.beta_access?.allowed !== true;
    ttStatus.textContent = betaBlocked ? "BETA AUSSTEHEND" : tt.connected ? "VERBUNDEN" : "OFFLINE";
    ttText.textContent = betaBlocked
      ? (tt?.beta_access?.email_verified === false ? "E-Mail zuerst bestätigen; danach kann der Admin TikTok freigeben." : "TikTok wartet auf deine Beta-Freigabe im Admin Control.")
      : tt.connected
        ? `${tt.profile?.display_name || "TikTok"} · ${Number(tt.profile?.follower_count || 0).toLocaleString("de-DE")} Follower`
        : "TikTok ist aktuell nicht verbunden.";
  } catch(error) {
    ttStatus.textContent = "FEHLER";
    ttText.textContent = error.message;
  }


  try {
    const caps = await CFS.json("/api/creator/integration-capabilities");
    const oauth = Array.isArray(caps?.integrations?.oauth) ? caps.integrations.oauth : [];
    const twitch = oauth.find(item => item.provider === "twitch");
    const youtube = oauth.find(item => item.provider === "youtube");
    if (twitch && twitchIntegrationStatus && !twitchIntegrationStatus.dataset.liveStatus) {
      const cfg = twitch.configuration || {};
      const configured = cfg.client_id && cfg.client_secret && cfg.redirect_uri;
      twitchIntegrationStatus.textContent = `${twitch.oauth_implemented ? "OAuth implementiert" : "OAuth-Grundlage vorbereitet"} · ${configured ? "Server-Konfiguration vorhanden" : "Server-Konfiguration noch offen"} · EventSub + Chat sind code-seitig implementiert; reale Twitch-Abnahme bleibt offen.`;
    }
    if (youtube && youtubeIntegrationStatus) {
      const cfg = youtube.configuration || {};
      const configured = cfg.client_id && cfg.client_secret && cfg.redirect_uri;
      youtubeIntegrationStatus.textContent = `${youtube.oauth_implemented ? "OAuth implementiert" : "OAuth-Grundlage vorbereitet"} · ${configured ? "Server-Konfiguration vorhanden" : "Server-Konfiguration noch offen"} · Kanal/LIVE/Chat sind code-seitig integriert; reale YouTube-Abnahme bleibt offen.`;
    }
    if (obsIntegrationStatus && caps?.integrations?.obs_websocket) {
      obsIntegrationStatus.textContent = "OBS WebSocket ist code-seitig implementiert: Szenen lesen/wechseln, Browser Sources aktualisieren, lokale verschlüsselte Credentials. Reale OBS-Abnahme bleibt offen.";
    }
  } catch (_) {}

  try {
    const tw = await CFS.json("/api/creator/twitch/status");
    const betaBlocked = tw?.beta_access?.required === true && tw?.beta_access?.allowed !== true;
    if (twitchIntegrationStatus) {
      twitchIntegrationStatus.dataset.liveStatus = "1";
      const name = tw.account?.display_name || tw.account?.login || "Twitch";
      twitchIntegrationStatus.textContent = betaBlocked
        ? (tw?.beta_access?.email_verified === false ? "E-Mail zuerst bestätigen; danach kann der cfs_zockt Admin Twitch freigeben." : "Twitch wartet auf deine Beta-Freigabe im Admin Control.")
        : tw.connected
          ? `${name} ist verbunden · Token validiert${tw.validated_at ? " · " + new Date(tw.validated_at).toLocaleString("de-DE") : ""}. EventSub + Chat sind eingerichtet, sobald alle Twitch-Berechtigungen bestätigt wurden; reale Twitch-Abnahme bleibt offen.`
          : (tw.configured ? "Bereit zum Verbinden. Twitch OAuth ist auf dem Server konfiguriert." : "Twitch OAuth-Code ist vorhanden, aber TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET / TWITCH_REDIRECT_URI sind noch nicht vollständig gesetzt.");
    }
    if (twitchIntegrationBadge) twitchIntegrationBadge.textContent = betaBlocked ? "BETA AUSSTEHEND" : tw.connected ? "VERBUNDEN" : (tw.configured ? "BEREIT" : "KONFIG FEHLT");
    if (twitchConnect) twitchConnect.hidden = betaBlocked || tw.connected || !tw.configured;
    if (twitchSync) twitchSync.hidden = betaBlocked || !tw.connected;
    if (twitchDisconnect) twitchDisconnect.hidden = !tw.connected;
    if (twitchSync) twitchSync.onclick = async () => {
      twitchSync.disabled = true;
      try { await CFS.json("/api/creator/twitch/sync",{method:"POST",body:"{}"}); location.reload(); }
      catch(error){ actionError(error,"Twitch-Synchronisierung fehlgeschlagen"); twitchSync.disabled=false; }
    };
    if (twitchDisconnect) twitchDisconnect.onclick = async () => {
      if(!confirm("Twitch-Verbindung für dein Creator-Konto wirklich trennen?"))return;
      twitchDisconnect.disabled=true;
      try { await CFS.json("/api/creator/twitch/disconnect",{method:"POST",body:"{}"}); location.reload(); }
      catch(error){ actionError(error,"Twitch konnte nicht getrennt werden"); twitchDisconnect.disabled=false; }
    };
  } catch(error) {
    if (twitchIntegrationStatus) twitchIntegrationStatus.textContent = error.message;
    if (twitchIntegrationBadge) twitchIntegrationBadge.textContent = "FEHLER";
  }


  try {
    const yt = await CFS.json("/api/creator/youtube/status");
    if (youtubeIntegrationStatus) {
      youtubeIntegrationStatus.dataset.liveStatus = "1";
      const title = yt.channel?.title || yt.channel?.handle || "YouTube";
      const liveText = yt.live?.connected ? " · aktuell LIVE erkannt" : "";
      youtubeIntegrationStatus.textContent = yt.connected
        ? `${title} ist verbunden · nur lesende YouTube-Berechtigung${liveText}. Kanal, LIVE-Status und Live-Chat stehen für YouTube-Widgets bereit; reale YouTube-Abnahme bleibt offen.`
        : (yt.configured ? "Bereit zum Verbinden. Google/YouTube OAuth ist auf dem Server konfiguriert." : "YouTube OAuth-Code ist vorhanden, aber GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / YOUTUBE_REDIRECT_URI sind noch nicht vollständig gesetzt.");
    }
    if (youtubeIntegrationBadge) youtubeIntegrationBadge.textContent = yt.connected ? "VERBUNDEN" : (yt.configured ? "BEREIT" : "KONFIG FEHLT");
    if (youtubeConnect) youtubeConnect.hidden = yt.connected || !yt.configured;
    if (youtubeSync) youtubeSync.hidden = !yt.connected;
    if (youtubeDisconnect) youtubeDisconnect.hidden = !yt.connected;
    if (youtubeSync) youtubeSync.onclick = async () => {
      youtubeSync.disabled = true;
      try { await CFS.json("/api/creator/youtube/sync",{method:"POST",body:"{}"}); location.reload(); }
      catch(error){ actionError(error,"YouTube-Synchronisierung fehlgeschlagen"); youtubeSync.disabled=false; }
    };
    if (youtubeDisconnect) youtubeDisconnect.onclick = async () => {
      if(!confirm("YouTube-Verbindung für dein Creator-Konto wirklich trennen?"))return;
      youtubeDisconnect.disabled=true;
      try { await CFS.json("/api/creator/youtube/disconnect",{method:"POST",body:"{}"}); location.reload(); }
      catch(error){ actionError(error,"YouTube konnte nicht getrennt werden"); youtubeDisconnect.disabled=false; }
    };
  } catch(error) {
    if (youtubeIntegrationStatus) youtubeIntegrationStatus.textContent = error.message;
    if (youtubeIntegrationBadge) youtubeIntegrationBadge.textContent = "FEHLER";
  }

  try {
    const nx = await CFS.json("/api/nexus/status");
    nexusInfo.textContent =
      `NEXUS ${nx.version || "1.0"} ist ${String(nx.status || "unknown").toUpperCase()}. ` +
      `TikTok: ${nx.integrations?.tiktok || "unknown"} · Twitch: ${nx.integrations?.twitch || "unknown"} · YouTube: ${nx.integrations?.youtube || "unknown"} · OBS: ${nx.integrations?.obs || "unknown"}.`;
  } catch(error) {
    nexusInfo.textContent = error.message;
    nexusInfo.className = "notice danger";
  }
});

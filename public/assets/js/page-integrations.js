document.addEventListener("DOMContentLoaded", async () => {
  const me = await CFS.requireAuth();
  if (!me) return;

  try {
    const tt = await CFS.json("/api/tiktok/status");
    ttStatus.textContent = tt.connected ? "VERBUNDEN" : "OFFLINE";
    ttText.textContent = tt.connected
      ? `${tt.profile?.display_name || "TikTok"} · ${Number(tt.profile?.follower_count || 0).toLocaleString("de-DE")} Follower`
      : "TikTok ist aktuell nicht verbunden.";
  } catch(error) {
    ttStatus.textContent = "FEHLER";
    ttText.textContent = error.message;
  }

  try {
    const nx = await CFS.json("/api/nexus/status");
    nexusInfo.textContent =
      `NEXUS ${nx.version || "1.0"} ist ${String(nx.status || "unknown").toUpperCase()}. ` +
      `TikTok: ${nx.integrations?.tiktok || "unknown"} · Twitch: ${nx.integrations?.twitch || "unknown"} · OBS: ${nx.integrations?.obs || "unknown"}.`;
  } catch(error) {
    nexusInfo.textContent = error.message;
    nexusInfo.className = "notice danger";
  }
});

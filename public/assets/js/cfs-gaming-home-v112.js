(() => {
  "use strict";

  const compactNumber = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.+`;
    if (n >= 10_000) return `${Math.floor(n / 1000).toLocaleString("de-DE")}.000+`;
    if (n >= 1000) return `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })}k`;
    return Math.floor(n).toLocaleString("de-DE");
  };

  const formatMinutes = minutes => {
    const n = Math.max(0, Number(minutes) || 0);
    if (!n) return "—";
    if (n >= 60) return `${Math.round(n / 60).toLocaleString("de-DE")} h`;
    return `${Math.round(n)} min`;
  };

  async function loadCommunityStats() {
    const tiktok = document.getElementById("statTikTok");
    const discord = document.getElementById("statDiscord");
    const gameTime = document.getElementById("statGameTime");
    const gameSessions = document.getElementById("statGameSessions");
    const recentMeta = document.getElementById("recentGamesMeta");
    if (!tiktok && !discord && !gameTime && !gameSessions && !recentMeta) return;

    try {
      const response = await fetch("/api/public/community-stats", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (tiktok) tiktok.textContent = data?.tiktok?.available ? compactNumber(data.tiktok.followers) : "—";
      if (discord) discord.textContent = data?.discord?.available ? compactNumber(data.discord.members) : "—";

      const games = Array.isArray(data?.recent_games?.games) ? data.recent_games.games : [];
      const minutes = games.reduce((sum, game) => sum + Math.max(0, Number(game?.minutes) || 0), 0);
      const sessions = games.reduce((sum, game) => sum + Math.max(0, Number(game?.sessions) || 0), 0);
      if (gameTime) gameTime.textContent = formatMinutes(minutes);
      if (gameSessions) gameSessions.textContent = sessions ? compactNumber(sessions) : "—";

      if (recentMeta) {
        const recent = Array.isArray(data?.recent_games?.recent) ? data.recent_games.recent.filter(item => item?.name) : [];
        recentMeta.textContent = recent.length
          ? `Zuletzt gespielt: ${recent.slice(0, 3).map(item => item.name).join(" · ")}`
          : "Beliebte Games & Community-Formate – echte Aktivitätsdaten erscheinen automatisch, sobald sie verfügbar sind.";
      }
    } catch {
      if (recentMeta) recentMeta.textContent = "Community-Daten sind gerade nicht erreichbar – die Seite bleibt vollständig nutzbar.";
    }
  }

  function initSectionNavigation() {
    const links = [...document.querySelectorAll(".gaming-nav a[href^='#']")];
    const sections = links
      .map(link => ({ link, section: document.querySelector(link.getAttribute("href")) }))
      .filter(item => item.section);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => link.classList.remove("active"));
      const current = sections.find(item => item.section === visible.target);
      current?.link.classList.add("active");
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0.05, 0.2, 0.5] });

    sections.forEach(item => observer.observe(item.section));
  }

  function init() {
    loadCommunityStats();
    initSectionNavigation();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

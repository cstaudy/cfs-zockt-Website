(() => {
  "use strict";

  const GAME_ART = [
    { match: /call[- ]of[- ]duty|warzone|\bcod\b/i, src: "/assets/img/home-v116/game-warzone.webp", alt: "Call of Duty" },
    { match: /counter[- ]strike|\bcs2\b/i, src: "/assets/img/home-v116/game-cs2.webp", alt: "Counter-Strike 2" },
    { match: /ea[- ]sports[- ]fc[- ]25|\bfc[- ]?25\b/i, src: "/assets/img/home-v116/game-fc25.webp", alt: "EA SPORTS FC 25" },
    { match: /fortnite/i, src: "/assets/img/home-v116/game-fortnite.webp", alt: "Fortnite" },
    { match: /minecraft/i, src: "/assets/img/home-v116/game-minecraft.webp", alt: "Minecraft" },
    { match: /valorant/i, src: "/assets/img/home-v116/game-valorant.webp", alt: "VALORANT" }
  ];

  const PLATFORM_LABELS = {
    playstation_5: "PS5",
    playstation_4: "PS4",
    pc: "PC",
    xbox_series: "XBOX SERIES",
    xbox_one: "XBOX ONE",
    switch: "NINTENDO SWITCH",
    unknown: "PLATTFORM OFFEN"
  };

  const SOURCE_LABELS = {
    launcher_manual: "CFS Launcher",
    stream_capture: "Stream Capture",
    playstation_network: "PlayStation Network"
  };

  const compactNumber = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.+`;
    if (n >= 10_000) return `${Math.floor(n / 1000).toLocaleString("de-DE")}.000+`;
    if (n >= 1000) return `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })}k`;
    return Math.floor(n).toLocaleString("de-DE");
  };

  const formatMinutes = minutes => {
    const n = Math.max(0, Math.round(Number(minutes) || 0));
    if (!n) return "0 min";
    if (n < 60) return `${n.toLocaleString("de-DE")} min`;
    const hours = Math.floor(n / 60);
    const rest = n % 60;
    return rest ? `${hours.toLocaleString("de-DE")} h ${rest} min` : `${hours.toLocaleString("de-DE")} h`;
  };

  const formatElapsed = seconds => {
    const minutes = Math.max(0, Math.floor((Number(seconds) || 0) / 60));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  };

  const formatLastPlayed = value => {
    const date = new Date(String(value || ""));
    if (!Number.isFinite(date.getTime())) return "Zeitpunkt nicht verfügbar";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const platformLabel = value => PLATFORM_LABELS[String(value || "unknown")] || PLATFORM_LABELS.unknown;
  const sourceLabel = value => SOURCE_LABELS[String(value || "")] || "CFS Spielaktivität";

  const artForGame = game => {
    const haystack = `${game?.key || ""} ${game?.name || ""}`;
    return GAME_ART.find(entry => entry.match.test(haystack)) || null;
  };

  const initialsForGame = name => {
    const words = String(name || "GAME").trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 3).map(word => word[0]).join("").toUpperCase().slice(0, 3) || "CFS";
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderRecentGameCard(game, index, windowDays) {
    const card = element("article", "gaming-game-card gaming-game-card-data");
    card.dataset.gameSlot = String(index);

    const media = element("div", "gaming-game-card-media");
    const art = artForGame(game);
    const remoteImage = /^https:\/\//i.test(String(game?.image_url || "")) ? String(game.image_url) : "";
    if (remoteImage || art) {
      const image = document.createElement("img");
      image.src = remoteImage || art.src;
      image.alt = `${game.name || art?.alt || "Game"} Cover`;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      let triedLocalFallback = false;
      const handleImageError = () => {
        if (remoteImage && art && !triedLocalFallback) {
          triedLocalFallback = true;
          image.src = art.src;
          return;
        }
        image.removeEventListener("error", handleImageError);
        image.remove();
        media.appendChild(element("span", "gaming-game-placeholder", initialsForGame(game?.name)));
      };
      image.addEventListener("error", handleImageError);
      media.appendChild(image);
    } else {
      media.appendChild(element("span", "gaming-game-placeholder", initialsForGame(game?.name)));
    }
    media.appendChild(element("span", "gaming-game-rank", String(index + 1).padStart(2, "0")));
    media.appendChild(element("span", "gaming-game-status", index === 0 ? "ZULETZT" : `#${index + 1}`));

    const copy = element("div", "gaming-game-card-copy");
    copy.appendChild(element("strong", "gaming-game-title", game?.name || "Unbekanntes Spiel"));

    const facts = element("div", "gaming-game-facts");
    facts.appendChild(element("span", "", platformLabel(game?.platform)));
    const lifetimePlaytime = game?.source === "playstation_network" || game?.playtime_scope === "lifetime";
    facts.appendChild(element("span", "", lifetimePlaytime ? `${formatMinutes(game?.minutes)} gesamt` : `${formatMinutes(game?.minutes)} / ${windowDays} Tage`));
    const sessions = Math.max(0, Math.round(Number(game?.sessions) || 0));
    const sessionLabel = game?.source === "playstation_network" ? (sessions === 1 ? "Start" : "Starts") : (sessions === 1 ? "Session" : "Sessions");
    facts.appendChild(element("span", "", `${sessions} ${sessionLabel}`));
    copy.appendChild(facts);

    const last = element("p", "gaming-game-last");
    last.append("Zuletzt gespielt: ");
    const time = document.createElement("time");
    if (game?.last_played_at) time.dateTime = String(game.last_played_at);
    time.textContent = formatLastPlayed(game?.last_played_at);
    last.appendChild(time);
    copy.appendChild(last);
    copy.appendChild(element("small", "gaming-game-source", `QUELLE · ${sourceLabel(game?.source)}`));

    card.append(media, copy);
    return card;
  }

  function renderEmptyGameCard(index, title, message) {
    const card = element("article", "gaming-game-card gaming-game-card-empty");
    card.dataset.gameSlot = String(index);
    const media = element("div", "gaming-game-card-media");
    media.appendChild(element("span", "gaming-game-placeholder", "CFS"));
    media.appendChild(element("span", "gaming-game-rank", String(index + 1).padStart(2, "0")));
    const copy = element("div", "gaming-game-card-copy");
    copy.appendChild(element("strong", "gaming-game-title", title));
    copy.appendChild(element("p", "gaming-game-last", message));
    copy.appendChild(element("small", "gaming-game-source", "KEINE DEMO-DATEN"));
    card.append(media, copy);
    return card;
  }

  function renderRecentGames(payload) {
    const grid = document.getElementById("recentGamesGrid");
    const meta = document.getElementById("recentGamesMeta");
    if (!grid && !meta) return;

    const recent = Array.isArray(payload?.recent) ? payload.recent.filter(game => game?.name).slice(0, 3) : [];
    const active = payload?.active?.game_name ? payload.active : null;
    const playtimeScope = String(payload?.playtime_scope || "rolling_window");
    const windowDays = Math.max(1, Math.round(Number(payload?.window_days) || 14));

    if (grid) {
      grid.replaceChildren();
      recent.forEach((game, index) => grid.appendChild(renderRecentGameCard({ ...game, playtime_scope: playtimeScope }, index, windowDays)));
      for (let index = recent.length; index < 3; index += 1) {
        grid.appendChild(renderEmptyGameCard(
          index,
          "NOCH KEINE SPIELDATEN",
          index === 0
            ? "Sobald eine bestätigte CFS-Spielsession erfasst wurde, erscheint sie hier automatisch."
            : "Dieser Platz bleibt leer, bis ein weiterer echter Titel erfasst wurde."
        ));
      }
      grid.setAttribute("aria-busy", "false");
    }

    if (meta) {
      if (active) {
        meta.textContent = `JETZT AKTIV · ${active.game_name} · ${platformLabel(active.platform)} · ${formatElapsed(active.elapsed_seconds)}`;
        meta.classList.add("is-active");
      } else if (recent.length) {
        const updated = payload?.updated_at ? ` · Stand ${formatLastPlayed(payload.updated_at)}` : "";
        const isPlayStation = payload?.source === "playstation_network";
        meta.textContent = isPlayStation
          ? `PLAYSTATION NETWORK · ${recent.length}/3 ZULETZT GESPIELTE TITEL${updated}`
          : `ECHTE SPIELAKTIVITÄT · ${recent.length}/3 TITEL · ${windowDays}-TAGE-FENSTER${updated}`;
        meta.classList.remove("is-active");
      } else {
        meta.textContent = "NOCH KEINE BESTÄTIGTE SPIELAKTIVITÄT";
        meta.classList.remove("is-active");
      }
    }
  }

  function renderGamesError() {
    const grid = document.getElementById("recentGamesGrid");
    const meta = document.getElementById("recentGamesMeta");
    if (grid) {
      grid.replaceChildren();
      for (let index = 0; index < 3; index += 1) {
        grid.appendChild(renderEmptyGameCard(index, "DATEN NICHT ERREICHBAR", "Die CFS-Spielaktivität konnte gerade nicht geladen werden."));
      }
      grid.setAttribute("aria-busy", "false");
    }
    if (meta) {
      meta.textContent = "SPIELAKTIVITÄT IST GERADE NICHT ERREICHBAR";
      meta.classList.remove("is-active");
    }
  }

  async function loadCommunityStats() {
    const tiktok = document.getElementById("statTikTok");
    const discord = document.getElementById("statDiscord");
    const gameTime = document.getElementById("statGameTime");
    const gameSessions = document.getElementById("statGameSessions");
    const footerTikTok = document.getElementById("footerTikTokFollowers");
    const footerDiscord = document.getElementById("footerDiscordMembers");
    const footerRecentGames = document.getElementById("footerRecentGames");
    const recentGrid = document.getElementById("recentGamesGrid");
    if (!tiktok && !discord && !gameTime && !gameSessions && !footerTikTok && !footerDiscord && !footerRecentGames && !recentGrid) return;

    try {
      const response = await fetch("/api/public/community-stats", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const tiktokFollowers = data?.tiktok?.available ? compactNumber(data.tiktok.followers) : "—";
      const discordMembers = data?.discord?.available ? compactNumber(data.discord.members) : "—";
      if (tiktok) tiktok.textContent = tiktokFollowers;
      if (discord) discord.textContent = discordMembers;
      if (footerTikTok) footerTikTok.textContent = tiktokFollowers;
      if (footerDiscord) footerDiscord.textContent = discordMembers;

      const games = Array.isArray(data?.recent_games?.games) ? data.recent_games.games : [];
      const visibleRecentGames = Math.min(3, games.filter(game => game?.name).length);
      if (footerRecentGames) footerRecentGames.textContent = visibleRecentGames ? String(visibleRecentGames) : "—";
      const minutes = games.reduce((sum, game) => sum + Math.max(0, Number(game?.minutes) || 0), 0);
      const sessions = games.reduce((sum, game) => sum + Math.max(0, Number(game?.sessions) || 0), 0);
      if (gameTime) gameTime.textContent = games.length ? formatMinutes(minutes) : "—";
      if (gameSessions) gameSessions.textContent = sessions ? compactNumber(sessions) : "—";

      renderRecentGames(data?.recent_games || {});
    } catch {
      if (footerTikTok) footerTikTok.textContent = "—";
      if (footerDiscord) footerDiscord.textContent = "—";
      if (footerRecentGames) footerRecentGames.textContent = "—";
      renderGamesError();
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

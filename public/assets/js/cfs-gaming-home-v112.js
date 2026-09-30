(() => {
  "use strict";

  let latestRecentGames = [];
  let latestLiveSession = null;


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
    const remoteImage = /^https:\/\//i.test(String(game?.image_url || "")) ? String(game.image_url) : "";
    if (remoteImage) {
      const image = document.createElement("img");
      image.src = remoteImage;
      image.alt = `${game.name || "Game"} Cover`;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      const handleImageError = () => {
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
    facts.appendChild(element("span", "", lifetimePlaytime ? `GESAMT · ${formatMinutes(game?.minutes)}` : `${formatMinutes(game?.minutes)} · ${windowDays} TAGE`));
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
  const normalizeGameTitle = value => String(value || "")
    .replace(/[™®©]/g, "")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const formatLiveDuration = startedAt => {
    const started = new Date(String(startedAt || "")).getTime();
    if (!Number.isFinite(started) || started <= 0) return "—";
    const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    return formatElapsed(seconds);
  };

  function liveCoverForGame(gameName) {
    const normalized = normalizeGameTitle(gameName);
    if (!normalized) return "";
    const match = latestRecentGames.find(game => normalizeGameTitle(game?.name) === normalized);
    return /^https:\/\//i.test(String(match?.image_url || "")) ? String(match.image_url) : "";
  }

  function renderLiveSession(payload) {
    latestLiveSession = payload && typeof payload === "object" ? payload : null;
    const session = latestLiveSession || {};
    const liveStatus = session.live === true ? "live" : String(session.status || "unknown");
    const isLive = liveStatus === "live";
    const isOffline = liveStatus === "offline";
    const current = session?.current_game?.name ? session.current_game : null;
    const fallback = latestRecentGames[0] || null;
    const displayedGame = current?.name || fallback?.name || "Aktuell kein Game erkannt";
    const platform = current?.platform ? platformLabel(current.platform) : (fallback?.platform ? platformLabel(fallback.platform) : "");

    const badge = document.getElementById("liveStatusBadge");
    const previewBadge = document.getElementById("livePreviewBadge");
    const game = document.getElementById("liveStatusGame");
    const previewGame = document.getElementById("livePreviewGame");
    const statusText = document.getElementById("liveStatusText");
    const meta = document.getElementById("liveStatusMeta");
    const previewViewers = document.getElementById("livePreviewViewers");
    const viewers = document.getElementById("liveViewers");
    const likes = document.getElementById("liveLikes");
    const shares = document.getElementById("liveShares");
    const duration = document.getElementById("liveDuration");
    const previewImage = document.getElementById("livePreviewImage");
    const liveDot = document.querySelector(".gaming-live-title .gaming-live-dot");

    const badgeText = isLive ? "LIVE" : (isOffline ? "OFFLINE" : "STATUS OFFEN");
    [badge, previewBadge].forEach(node => {
      if (!node) return;
      node.textContent = badgeText;
      node.classList.toggle("is-live", isLive);
      node.classList.toggle("is-offline", isOffline);
      node.classList.toggle("is-unknown", !isLive && !isOffline);
    });
    if (liveDot) {
      liveDot.classList.toggle("is-offline", isOffline);
      liveDot.classList.toggle("is-unknown", !isLive && !isOffline);
    }
    if (game) game.textContent = isLive && current ? current.name : (isLive ? "LIVE · Game wird gerade erkannt" : displayedGame);
    if (previewGame) previewGame.textContent = isLive && current ? current.name : (isLive ? "LIVE auf TikTok" : displayedGame);

    if (statusText) {
      statusText.textContent = isLive
        ? (current
          ? `cfs_zockt ist gerade live und spielt ${current.name}${platform ? ` auf ${platform}` : ""}.`
          : "cfs_zockt ist gerade live. Das aktuelle Game wird vom Launcher noch nicht gemeldet.")
        : (isOffline
          ? (fallback ? `Live-Session wurde beendet. Zuletzt gespielt: ${fallback.name}.` : "Aktuell ist keine Live-Session aktiv.")
          : "Der LIVE-Status konnte gerade nicht eindeutig bestätigt werden. Die Website zeigt deshalb nicht mehr fälschlich OFFLINE an.");
    }

    if (meta) {
      meta.replaceChildren();
      const left = element("span", "", isLive ? "TikTok LIVE · erkannt" : (isOffline ? "TikTok LIVE · beendet" : "TikTok LIVE · Status wird geprüft"));
      const right = element("span", "", isLive
        ? (current ? `${platform || "Game"} · ${formatElapsed(current.elapsed_seconds)}` : "Session aktiv")
        : (fallback?.last_played_at ? `Zuletzt aktiv: ${formatLastPlayed(fallback.last_played_at)}` : "Wartet auf LIVE-Signal"));
      meta.append(left, right);
    }

    if (previewViewers) previewViewers.textContent = isLive ? `${compactNumber(session.viewers)} Zuschauer` : (isOffline ? "offline" : "Status offen");
    if (viewers) viewers.textContent = isLive ? compactNumber(session.viewers) : "—";
    if (likes) likes.textContent = isLive ? compactNumber(session.likes) : "—";
    if (shares) shares.textContent = isLive ? compactNumber(session.shares) : "—";
    if (duration) duration.textContent = isLive ? formatLiveDuration(session.started_at) : "—";

    if (previewImage) {
      const remoteCover = current ? liveCoverForGame(current.name) : "";
      const fallbackCover = /^https:\/\//i.test(String(fallback?.image_url || "")) ? String(fallback.image_url) : "";
      const nextSrc = remoteCover || (isLive ? fallbackCover : "");
      if (nextSrc) {
        if (previewImage.getAttribute("src") !== nextSrc) previewImage.src = nextSrc;
        previewImage.alt = `${current?.name || fallback?.name || "Aktuelles Game"} Cover`;
        previewImage.hidden = false;
      } else {
        previewImage.hidden = true;
        previewImage.removeAttribute("src");
        previewImage.alt = "";
      }
    }
  }

  function applyCommunityStats(data) {
    const tiktok = document.getElementById("statTikTok");
    const discord = document.getElementById("statDiscord");
    const discordOnline = document.getElementById("statDiscordOnline");
    const gameTime = document.getElementById("statGameTime");
    const latestGame = document.getElementById("statLatestGame");
    const gameTimeLabel = document.getElementById("statGameTimeLabel");
    const latestGameLabel = document.getElementById("statLatestGameLabel");
    const footerTikTok = document.getElementById("footerTikTokFollowers");
    const footerDiscord = document.getElementById("footerDiscordMembers");
    const footerRecentGames = document.getElementById("footerRecentGames");

    const tiktokFollowers = data?.tiktok?.available ? compactNumber(data.tiktok.followers) : "—";
    const discordMembers = data?.discord?.available ? compactNumber(data.discord.members) : "—";
    const discordOnlineMembers = data?.discord?.available && Number.isFinite(Number(data.discord.online))
      ? `${compactNumber(data.discord.online)} online`
      : "— online";
    if (tiktok) tiktok.textContent = tiktokFollowers;
    if (discord) discord.textContent = discordMembers;
    if (discordOnline) discordOnline.textContent = discordOnlineMembers;
    if (footerTikTok) footerTikTok.textContent = tiktokFollowers;
    if (footerDiscord) footerDiscord.textContent = discordMembers;

    const games = Array.isArray(data?.recent_games?.games) ? data.recent_games.games : [];
    const recent = Array.isArray(data?.recent_games?.recent)
      ? data.recent_games.recent.filter(game => game?.name).slice(0, 3)
      : games.filter(game => game?.name).slice(0, 3);
    latestRecentGames = recent;
    const visibleRecentGames = recent.length;
    if (footerRecentGames) footerRecentGames.textContent = visibleRecentGames ? String(visibleRecentGames) : "—";
    const minutes = recent.reduce((sum, game) => sum + Math.max(0, Number(game?.minutes) || 0), 0);
    const playStation = data?.recent_games?.source === "playstation_network";
    if (gameTime) gameTime.textContent = recent.length ? formatMinutes(minutes) : "—";
    if (latestGame) latestGame.textContent = data?.recent_games?.active?.game_name || recent[0]?.name || "—";
    if (gameTimeLabel) gameTimeLabel.textContent = playStation ? "Gesamtspielzeit · letzte 3" : "Spielzeit · letzte 3";
    if (latestGameLabel) latestGameLabel.textContent = data?.recent_games?.active?.game_name ? "gerade aktiv" : "zuletzt gespielt";

    renderRecentGames(data?.recent_games || {});
    if (latestLiveSession) renderLiveSession(latestLiveSession);
  }

  function renderCommunityError() {
    const discordOnline = document.getElementById("statDiscordOnline");
    const latestGame = document.getElementById("statLatestGame");
    const footerTikTok = document.getElementById("footerTikTokFollowers");
    const footerDiscord = document.getElementById("footerDiscordMembers");
    const footerRecentGames = document.getElementById("footerRecentGames");
    if (footerTikTok) footerTikTok.textContent = "—";
    if (footerDiscord) footerDiscord.textContent = "—";
    if (discordOnline) discordOnline.textContent = "— online";
    if (footerRecentGames) footerRecentGames.textContent = "—";
    if (latestGame) latestGame.textContent = "—";
    renderGamesError();
    if (!latestLiveSession) renderLiveSession({ live:false, status:"unknown" });
  }

  async function loadLiveSession() {
    try {
      const response = await fetch("/api/public/live-session", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      renderLiveSession(await response.json());
    } catch {
      renderLiveSession({ live:false, status:"unknown" });
    }
  }

  async function loadCommunityStats() {
    try {
      const response = await fetch("/api/public/community-stats", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      applyCommunityStats(await response.json());
    } catch {
      renderCommunityError();
    }
  }

  function adaptCreatorState(state) {
    const current = state?.game?.current || null;
    return {
      liveSession:{
        ok:state?.ok === true,
        live:state?.live?.active === true,
        status:state?.live?.status || "unknown",
        live_source:state?.live?.source || "none",
        profile_name:state?.creator?.name || "cfs_zockt",
        profile_url:state?.creator?.profile_url || "",
        viewers:Number(state?.live?.viewers || 0),
        likes:Number(state?.live?.likes || 0),
        shares:Number(state?.live?.shares || 0),
        followers_gained:Number(state?.live?.followers_gained || 0),
        started_at:state?.live?.started_at || null,
        updated_at:state?.live?.updated_at || null,
        signal:state?.live?.signal || {},
        current_game:current ? {
          name:current.name || "",
          platform:current.platform || "unknown",
          source:current.source || "",
          started_at:current.started_at || null,
          elapsed_seconds:Number(current.elapsed_seconds || 0)
        } : null
      },
      community:{
        ok:state?.ok === true,
        generated_at:state?.generated_at || null,
        refresh_seconds:Number(state?.refresh_seconds || 0),
        tiktok:state?.social?.tiktok || { available:false, followers:null },
        discord:state?.social?.discord || { available:false, members:null, online:null },
        recent_games:{
          available:Array.isArray(state?.game?.recent) && state.game.recent.length > 0,
          source:state?.game?.source || "",
          playtime_scope:state?.game?.playtime_scope || "",
          window_days:state?.game?.window_days ?? null,
          updated_at:state?.game?.updated_at || null,
          active:current ? {
            game_name:current.name || "",
            platform:current.platform || "unknown",
            source:current.source || "",
            started_at:current.started_at || null,
            elapsed_seconds:Number(current.elapsed_seconds || 0)
          } : null,
          recent:Array.isArray(state?.game?.recent) ? state.game.recent : [],
          games:Array.isArray(state?.game?.games) ? state.game.games : []
        }
      }
    };
  }

  async function loadCreatorState() {
    try {
      const response = await fetch("/api/public/creator-state", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const adapted = adaptCreatorState(await response.json());
      applyCommunityStats(adapted.community);
      renderLiveSession(adapted.liveSession);
    } catch {
      await Promise.allSettled([loadCommunityStats(), loadLiveSession()]);
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
    loadCreatorState();
    window.setInterval(loadCreatorState, 15000);
    initSectionNavigation();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

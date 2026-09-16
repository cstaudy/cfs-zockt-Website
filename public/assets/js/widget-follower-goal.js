(() => {
  const widget = document.getElementById("widget");
  const errorBox = document.getElementById("error");
  const logo = document.getElementById("logo");
  const label = document.getElementById("label");
  const count = document.getElementById("count");
  const progress = document.getElementById("progress");
  const bar = document.getElementById("bar");
  const percent = document.getElementById("percent");
  const creator = document.getElementById("creator");
  const status = document.getElementById("status");

  function sourceKeyFromLocation() {
    const hash = String(location.hash || "").replace(/^#/, "");
    const params = new URLSearchParams(hash);
    return String(params.get("key") || "").trim();
  }

  function hexToRgba(hex, opacity) {
    const clean = String(hex || "#071321").replace("#", "");
    const safe = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : "071321";
    const r = parseInt(safe.slice(0, 2), 16);
    const g = parseInt(safe.slice(2, 4), 16);
    const b = parseInt(safe.slice(4, 6), 16);
    const a = Math.max(0, Math.min(1, Number(opacity) || 0));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function showError(message) {
    widget.hidden = true;
    errorBox.textContent = message || "Widget konnte nicht geladen werden.";
    errorBox.hidden = false;
  }

  function render(data) {
    const c = data?.config || {};
    if (data?.enabled === false || c.enabled === false) {
      widget.hidden = true;
      errorBox.hidden = true;
      status.hidden = true;
      return;
    }

    const followers = Math.max(0, Number(data?.live?.follower_count || 0));
    const goal = Math.max(1, Number(c.goal || 200));
    const progressValue = Math.max(0, Math.min(100, followers / goal * 100));

    document.documentElement.style.setProperty("--accent", c.accent || "#0a8cff");
    document.documentElement.style.setProperty("--bg", hexToRgba(c.background || "#071321", c.background_opacity ?? .9));
    document.documentElement.style.setProperty("--text", c.text_color || "#f4f8ff");
    document.documentElement.style.setProperty("--font-size", `${Math.max(14, Math.min(72, Number(c.font_size || 24)))}px`);
    document.documentElement.style.setProperty("--radius", `${Math.max(0, Math.min(40, Number(c.border_radius ?? 18)))}px`);
    document.documentElement.style.setProperty("--border-width", `${Math.max(0, Math.min(4, Number(c.border_width ?? 1)))}px`);

    widget.dataset.preset = ["bar", "compact", "card"].includes(c.preset) ? c.preset : "bar";
    logo.hidden = c.show_logo === false;
    label.textContent = c.label || "Follower-Ziel";

    count.hidden = c.show_numbers === false;
    count.innerHTML = "";
    if (c.show_numbers !== false) {
      const strong = document.createElement("strong");
      strong.textContent = followers.toLocaleString("de-DE");
      count.append(strong, document.createTextNode(` / ${goal.toLocaleString("de-DE")}`));
    }

    progress.hidden = c.show_progress === false;
    bar.style.width = `${progressValue}%`;
    percent.textContent = `${Math.round(progressValue)}%`;
    creator.textContent = data?.live?.tiktok_display_name || data?.creator?.display_name || "TikTok";

    status.textContent = data?.live?.connected ? "LIVE DATA" : "TIKTOK OFFLINE";
    status.hidden = true;
    errorBox.hidden = true;
    widget.hidden = false;
  }

  const sourceKey = sourceKeyFromLocation();
  if (!/^[a-f0-9]{48}$/i.test(sourceKey)) {
    showError("Ungültige Widget-URL.");
    return;
  }

  let timer = null;
  async function load() {
    try {
      const response = await fetch(`/api/widgets/follower-goal/${encodeURIComponent(sourceKey)}`, {
        method: "GET",
        headers: {"Accept": "application/json"},
        cache: "no-store"
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Widget-Daten konnten nicht geladen werden.");
      render(data);
    } catch (error) {
      showError(error?.message || "Widget-Daten konnten nicht geladen werden.");
    } finally {
      clearTimeout(timer);
      timer = setTimeout(load, 15000);
    }
  }

  load();
})();

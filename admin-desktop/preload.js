"use strict";

const { ipcRenderer } = require("electron");

function make(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  });
  if (text) node.textContent = text;
  return node;
}

function installDesktopDock() {
  if (document.getElementById("cfsAdminDesktopDock")) return;
  const style = make("style");
  style.textContent = `
    #cfsAdminDesktopDock{position:fixed;right:14px;bottom:14px;z-index:2147483646;display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(70,184,255,.38);border-radius:14px;background:rgba(2,9,20,.94);box-shadow:0 18px 48px rgba(0,0,0,.42);backdrop-filter:blur(16px);font:700 11px/1.2 Inter,Segoe UI,sans-serif;color:#eaf7ff}
    #cfsAdminDesktopDock button{min-height:34px;padding:0 11px;border:1px solid rgba(61,186,255,.45);border-radius:9px;background:linear-gradient(135deg,#0aa9f4,#167cff);color:white;font:900 10px/1 Inter,Segoe UI,sans-serif;cursor:pointer}
    #cfsAdminDesktopDock button:disabled{opacity:.55;cursor:wait}
    .cfs-admin-desktop-status{display:inline-flex;align-items:center;gap:6px;color:#91a9bd;white-space:nowrap}.cfs-admin-desktop-status i{width:7px;height:7px;border-radius:50%;background:#71869a}.cfs-admin-desktop-status.ok{color:#9ce9c5}.cfs-admin-desktop-status.ok i{background:#4bdfa0;box-shadow:0 0 10px rgba(75,223,160,.65)}.cfs-admin-desktop-status.bad{color:#ffd1da}.cfs-admin-desktop-status.bad i{background:#ff7d93}
    @media(max-width:760px){#cfsAdminDesktopDock{left:10px;right:10px;bottom:10px;justify-content:center;flex-wrap:wrap}}
  `;
  document.head.appendChild(style);

  const dock = make("div", { id:"cfsAdminDesktopDock", "aria-label":"CFS Admin Desktop Status" });
  const title = make("strong", {}, "CFS ADMIN DESKTOP");
  const ai = make("span", { class:"cfs-admin-desktop-status", id:"cfsDesktopAi" });
  ai.innerHTML = "<i></i><span>AI prüft …</span>";
  const ollama = make("span", { class:"cfs-admin-desktop-status", id:"cfsDesktopOllama" });
  ollama.innerHTML = "<i></i><span>Ollama prüft …</span>";
  const start = make("button", { type:"button", id:"cfsDesktopStartAi" }, "CFS AI STARTEN");
  dock.append(title, ai, ollama, start);
  document.body.appendChild(dock);

  async function refresh() {
    try {
      const status = await ipcRenderer.invoke("cfs-admin:local-status");
      ai.className = `cfs-admin-desktop-status ${status?.ai?.online ? "ok" : "bad"}`;
      ai.querySelector("span").textContent = status?.ai?.online ? "AI online" : "AI offline";
      ollama.className = `cfs-admin-desktop-status ${status?.ollama?.online ? "ok" : "bad"}`;
      ollama.querySelector("span").textContent = status?.ollama?.online ? "Ollama online" : "Ollama offline";
      start.hidden = Boolean(status?.ai?.online);
      start.title = status?.startScriptFound ? `Local Service: ${status.startRoot}` : "Lokaler CFS-AI-Start wurde nicht gefunden.";
    } catch {
      ai.className = "cfs-admin-desktop-status bad";
      ai.querySelector("span").textContent = "AI Statusfehler";
    }
  }

  start.addEventListener("click", async event => {
    if (!event.isTrusted) return;
    start.disabled = true;
    start.textContent = "STARTET …";
    const result = await ipcRenderer.invoke("cfs-admin:start-ai");
    if (!result?.ok) {
      start.textContent = "NICHT GEFUNDEN";
      start.title = result?.error || "CFS AI konnte nicht gestartet werden.";
    } else {
      start.textContent = "GESTARTET";
      setTimeout(refresh, 2200);
    }
    setTimeout(() => { start.disabled = false; if (!start.hidden) start.textContent = "CFS AI STARTEN"; }, 3200);
  });

  refresh();
  setInterval(refresh, 8000);
}

window.addEventListener("DOMContentLoaded", installDesktopDock, { once:true });

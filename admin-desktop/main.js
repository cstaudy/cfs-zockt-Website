"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const http = require("http");

const ADMIN_ORIGIN = "https://cfs-zockt.de";
const ADMIN_URL = process.env.CFS_ADMIN_URL || `${ADMIN_ORIGIN}/pages/admin.html`;

function requestJson(url, timeoutMs = 1800) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs, headers:{"Accept":"application/json"} }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { if (body.length < 1024 * 1024) body += chunk; });
      res.on("end", () => {
        try { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(body || "{}") }); }
        catch { resolve({ ok:false, status:res.statusCode || 0, data:null }); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", () => resolve({ ok:false, status:0, data:null }));
  });
}

function candidateLocalServiceRoots() {
  const home = os.homedir();
  const candidates = [
    process.env.CFS_AI_LOCAL_SERVICE_ROOT,
    path.join(home, "OneDrive", "Desktop", "CFS_AI_LOCAL_SERVICE_v20", "CFS_AI_V196_FINAL_HANDOFF", "CFS_AI_LOCAL_SERVICE_v20"),
    path.join(home, "OneDrive", "Desktop", "CFS_AI_LOCAL_SERVICE_v20"),
    path.join(home, "OneDrive", "Desktop", "CFS", "CFS_AI_LOCAL_SERVICE_v20"),
    path.join(home, "Desktop", "CFS_AI_LOCAL_SERVICE_v20")
  ].filter(Boolean);
  return [...new Set(candidates)];
}

function findBridgeStartScript() {
  for (const root of candidateLocalServiceRoots()) {
    const script = path.join(root, "start_bridge_mode_windows.bat");
    if (fs.existsSync(script)) return { root, script };
  }
  return null;
}

async function localStatus() {
  const [ai, ollama] = await Promise.all([
    requestJson("http://127.0.0.1:8000/api/status"),
    requestJson("http://127.0.0.1:11434/api/tags")
  ]);
  const start = findBridgeStartScript();
  return {
    ai: { online: ai.ok, status: ai.status, data: ai.data },
    ollama: { online: ollama.ok, status: ollama.status },
    startScriptFound: Boolean(start),
    startRoot: start?.root || ""
  };
}

function startLocalAi() {
  if (process.platform !== "win32") return { ok:false, error:"CFS AI Start ist nur unter Windows verfügbar." };
  const found = findBridgeStartScript();
  if (!found) return { ok:false, error:"start_bridge_mode_windows.bat wurde nicht gefunden. Setze optional CFS_AI_LOCAL_SERVICE_ROOT." };
  try {
    const child = spawn("cmd.exe", ["/c", "start", "CFS AI Bridge", "/D", found.root, found.script], {
      cwd: found.root,
      detached: true,
      windowsHide: false,
      stdio: "ignore"
    });
    child.unref();
    return { ok:true, root:found.root };
  } catch (error) {
    return { ok:false, error:String(error?.message || error) };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    title: "CFS Admin",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#020812",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      partition: "persist:cfs-admin"
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin === ADMIN_ORIGIN) return { action:"allow" };
    } catch {}
    shell.openExternal(url).catch(() => {});
    return { action:"deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin === ADMIN_ORIGIN) return;
    } catch {}
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  win.once("ready-to-show", () => win.show());
  win.loadURL(ADMIN_URL);
  return win;
}

app.whenReady().then(() => {
  ipcMain.handle("cfs-admin:local-status", () => localStatus());
  ipcMain.handle("cfs-admin:start-ai", () => startLocalAi());
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

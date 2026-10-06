(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const loginTarget = "/pages/login.html?returnTo=" + encodeURIComponent("/pages/admin.html");

  function setCard(id, label, detail, state = "") {
    const card = $(id);
    if (!card) return;
    card.classList.remove("is-ok", "is-warn", "is-bad");
    if (state) card.classList.add(`is-${state}`);
    const strong = card.querySelector("strong");
    const small = card.querySelector("small");
    if (strong) strong.textContent = label;
    if (small) small.textContent = detail;
  }

  function ageText(dateValue) {
    if (!dateValue) return "kein Heartbeat";
    const ms = Date.now() - new Date(dateValue).getTime();
    if (!Number.isFinite(ms)) return "unbekannt";
    const sec = Math.max(0, Math.round(ms / 1000));
    if (sec < 60) return `vor ${sec}s`;
    const min = Math.round(sec / 60);
    return `vor ${min} min`;
  }

  const terminalLinks = {
    creators: "/pages/admin-creators.html#adminCreatorsPanel",
    website: "/pages/admin-creators.html#adminControlCenterPanel",
    shop: "/pages/shop.html",
    ai: "/pages/cfs-ai.html",
    bridge: "/pages/cfs-ai.html?tab=bridge",
    production: "/pages/admin-creators.html#adminProductionPanel",
    releases: "/pages/admin-creators.html#adminReleasePanel"
  };

  function terminalWrite(text, kind = "") {
    const output = $("adminTerminalOutput");
    if (!output) return;
    const line = document.createElement("div");
    if (kind) line.className = `terminal-${kind}`;
    line.innerHTML = CFS.escape(String(text ?? "")).replace(/\n/g, "<br>");
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function terminalCommandList() {
    return [
      "help                 verfügbare Befehle anzeigen",
      "status               AI-, Bridge- und Website-Status prüfen",
      "ai                   CFS-AI-Gateway prüfen",
      "bridge               Bridge-Worker und Heartbeat prüfen",
      "summary              Creator-/Shop-/Website-Kennzahlen laden",
      "open creators|ai|shop  passenden Bereich öffnen",
      "clear                Terminal leeren"
    ].join("\n");
  }

  async function runTerminalCommand(rawCommand) {
    const command = String(rawCommand || "").trim().toLowerCase();
    if (!command) return;
    terminalWrite(`admin@cfs:~$ ${command}`, "command");
    if (command === "clear") {
      const output = $("adminTerminalOutput");
      if (output) output.innerHTML = "";
      return;
    }
    if (command === "help") {
      terminalWrite(terminalCommandList());
      return;
    }
    if (command.startsWith("open ")) {
      const target = command.slice(5).trim();
      if (terminalLinks[target]) {
        terminalWrite(`Öffne ${target} …`);
        location.href = terminalLinks[target];
      } else terminalWrite("Unbekannter Bereich. Nutze: open creators, open ai, open shop", "warn");
      return;
    }
    try {
      if (command === "ai") {
        const data = await CFS.json("/api/creator/cfs-ai/status", { headers:{"Accept":"application/json"} });
        terminalWrite(`AI: ${data.gateway?.enabled ? "AKTIV" : "DEAKTIVIERT"} · Transport: ${String(data.gateway?.transport || "–").toUpperCase()} · Service: ${data.service?.ollama?.online ? "ONLINE" : "OFFLINE / NICHT GEMELDET"}`);
        return;
      }
      if (command === "bridge") {
        const data = await CFS.json("/api/creator/cfs-ai/bridge", { headers:{"Accept":"application/json"} });
        const worker = data.worker;
        terminalWrite(`Bridge: ${String(data.transport || "direct").toUpperCase()} · Worker: ${worker ? (worker.worker_id || "verbunden") : "kein Worker"} · Heartbeat: ${worker?.last_seen_at ? ageText(worker.last_seen_at) : "–"}`);
        return;
      }
      if (command === "summary") {
        const data = await CFS.json("/api/admin/control-center/summary", { headers:{"Accept":"application/json"} });
        terminalWrite(`Website: ${data.website?.published || 0} veröffentlicht · offene Entwürfe: ${data.website?.dirty || 0}`);
        terminalWrite(`Shop: ${data.shop?.products || 0} Produkte · ${data.shop?.bundles || 0} Bundles · ${data.shop?.published || 0} live`);
        terminalWrite(`Creator: ${data.creators || 0} · Assets freigegeben: ${data.assets?.approved || 0}`);
        return;
      }
      if (command === "status") {
        const [ai, bridge, summary] = await Promise.all([
          CFS.json("/api/creator/cfs-ai/status", { headers:{"Accept":"application/json"} }),
          CFS.json("/api/creator/cfs-ai/bridge", { headers:{"Accept":"application/json"} }),
          CFS.json("/api/admin/control-center/summary", { headers:{"Accept":"application/json"} })
        ]);
        terminalWrite(`Status: AI ${ai.gateway?.enabled ? "aktiv" : "aus"} · Bridge ${bridge.worker ? "verbunden" : "wartet"} · ${summary.creators || 0} Creator`);
        return;
      }
      terminalWrite("Befehl nicht erkannt. Nutze help für die sichere Befehlsliste.", "warn");
    } catch (error) {
      terminalWrite(`Fehler: ${error?.message || "Status konnte nicht geladen werden."}`, "error");
    }
  }

  function installTerminal() {
    const form = $("adminTerminalForm");
    const input = $("adminTerminalInput");
    form?.addEventListener("submit", async event => {
      event.preventDefault();
      const value = input?.value || "";
      if (input) input.value = "";
      await runTerminalCommand(value);
    });
    document.querySelectorAll("[data-admin-command]").forEach(button => button.addEventListener("click", () => runTerminalCommand(button.dataset.adminCommand)));
  }

  function aiConsoleMessage(role, text, error = false) {
    const log = $("adminAiLog");
    if (!log) return;
    const row = document.createElement("div");
    row.className = `is-${role}${error ? " is-error" : ""}`;
    row.innerHTML = `<small>${role === "user" ? "DU" : role === "system" ? "CFS AI" : "CFS AI"}</small><span>${CFS.escape(String(text || ""))}</span>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function setAiConsoleState(label, model, state = "warn", note = "") {
    const side = document.querySelector(".cfs-admin-ai-side");
    if (side) side.dataset.state = state;
    if ($("adminAiConsoleState")) $("adminAiConsoleState").textContent = label;
    if ($("adminAiConsoleModel")) $("adminAiConsoleModel").textContent = model || "–";
    if (note && $("adminAiConsoleNote")) $("adminAiConsoleNote").textContent = note;
  }

  async function loadAiConsole() {
    try {
      const [ai, bridge, proposals] = await Promise.all([
        CFS.json("/api/creator/cfs-ai/status", { headers:{"Accept":"application/json"} }),
        CFS.json("/api/creator/cfs-ai/bridge", { headers:{"Accept":"application/json"} }),
        CFS.json("/api/creator/cfs-ai/proposals", { headers:{"Accept":"application/json" }})
      ]);
      const serviceOnline = Boolean(ai.service?.ollama?.online || ai.service?.online);
      const enabled = ai.gateway?.enabled === true;
      setAiConsoleState(enabled ? (serviceOnline ? "ONLINE" : "NICHT BESTÄTIGT") : "AUS", ai.service?.chat_model || ai.gateway?.transport || "Gateway", enabled && serviceOnline ? "ok" : "warn", enabled ? "Status über Gateway/Bridge. Vollständige AI-Funktionen bleiben serverseitig geschützt." : "CFS_AI_ENABLED ist noch deaktiviert.");
      if ($("adminAiConsoleBridge")) $("adminAiConsoleBridge").textContent = bridge.worker ? (bridge.worker.online ? "ONLINE" : "STALE") : "OFFLINE";
      if ($("adminAiConsoleHeartbeat")) $("adminAiConsoleHeartbeat").textContent = bridge.worker?.last_seen_at ? ageText(bridge.worker.last_seen_at) : "kein Heartbeat";
      if ($("adminAiConsoleProposals")) $("adminAiConsoleProposals").textContent = String(proposals.items?.filter(item => item.status === "pending").length || 0);
    } catch (error) {
      setAiConsoleState("NICHT ERREICHBAR", error?.message || "AI-Status nicht verfügbar", "warn", "Admin-Gate erreichbar, aber CFS AI antwortet noch nicht.");
      aiConsoleMessage("system", `Status konnte nicht geladen werden: ${error?.message || "unbekannter Fehler"}`, true);
    }
  }

  const aiHistory = [];
  let aiSending = false;
  async function submitAiConsole(event) {
    event.preventDefault();
    const input = $("adminAiInput");
    const message = input?.value.trim() || "";
    if (!message || aiSending) return;
    aiSending = true;
    const mode = $("adminAiMode")?.value || "assistant";
    if (input) input.value = "";
    aiConsoleMessage("user", message);
    try {
      const data = await CFS.json("/api/creator/cfs-ai/chat", {method:"POST", body:JSON.stringify({message, mode, history:aiHistory.slice(-12)})});
      aiConsoleMessage("assistant", data.answer || "Keine Antwort erhalten.");
      aiHistory.push({role:"user",content:message},{role:"assistant",content:data.answer || ""});
      if(aiHistory.length > 24) aiHistory.splice(0,aiHistory.length-24);
    } catch (error) {
      aiConsoleMessage("assistant", `Fehler: ${error?.message || "CFS AI ist aktuell nicht verfügbar."}`, true);
    } finally { aiSending = false; }
  }

  function installAiConsole() {
    $("adminAiForm")?.addEventListener("submit", submitAiConsole);
    $("adminAiRefresh")?.addEventListener("click", loadAiConsole);
    loadAiConsole();
  }

  async function init() {
    try {
      const me = await CFS.json("/api/account/me", { headers:{"Accept":"application/json"} });
      if (!me?.authenticated) return location.replace(loginTarget);
      if (!me?.admin) return location.replace("/pages/dashboard.html");
      $("adminDisplayName").textContent = me?.account?.display_name || "CFS Admin";
      $("adminEmail").textContent = me?.account?.email || "Admin-Konto";
      setCard("adminWebsiteStatus", "API ERREICHBAR", "Admin-Konto wurde über die API geprüft.", "ok");
      installTerminal();
      installAiConsole();
    } catch (error) {
      if (Number(error?.status) === 401) return location.replace(loginTarget);
      setCard("adminWebsiteStatus", "NICHT GEPRÜFT", "API-Verbindung konnte nicht bestätigt werden.", "warn");
      const box = $("adminHubError");
      if (box) { box.hidden = false; box.textContent = error?.message || "Admin-Konto konnte nicht geprüft werden."; }
      return;
    }

    try {
      const ai = await CFS.json("/api/creator/cfs-ai/status", { headers:{"Accept":"application/json"} });
      const enabled = ai?.gateway?.enabled === true;
      const configured = ai?.gateway?.configured !== false;
      const worker = ai?.worker || null;
      const service = ai?.service || worker?.status?.service || null;
      const serviceOnline = Boolean(service && (service.ok === true || service.online === true || service.status === "online" || service.ready === true));
      setCard("adminAiStatus", !enabled ? "DEAKTIVIERT" : (serviceOnline ? "ONLINE" : "NICHT BESTÄTIGT"), !enabled ? "CFS_AI_ENABLED ist aus." : (serviceOnline ? "Lokaler AI-Service meldet sich." : "Gateway aktiv; Service-Status wird über die Bridge geliefert."), !enabled ? "warn" : (configured ? "ok" : "bad"));
      setCard("adminTransportStatus", String(ai?.gateway?.transport || "–").toUpperCase(), configured ? "Transport ist konfiguriert." : "Bridge-Token fehlt oder ist nicht aktiv.", configured ? "ok" : "bad");
    } catch (error) {
      setCard("adminAiStatus", "NICHT ERREICHBAR", error?.message || "CFS AI Status konnte nicht geladen werden.", "bad");
    }

    try {
      const bridge = await CFS.json("/api/creator/cfs-ai/bridge", { headers:{"Accept":"application/json"} });
      const worker = bridge?.worker || null;
      const lastSeen = worker?.last_seen_at || worker?.updated_at || null;
      const fresh = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 45000 : false;
      setCard("adminBridgeStatus", fresh ? "ONLINE" : (worker ? "STALE" : "OFFLINE"), worker ? `${worker.worker_id || "Worker"} · ${ageText(lastSeen)}` : "Noch kein Worker-Heartbeat.", fresh ? "ok" : "warn");
      setCard("adminTransportStatus", String(bridge?.transport || "–").toUpperCase(), bridge?.transport === "bridge" ? "Outbound Bridge aktiv." : "Direkter Transport aktiv.", bridge?.transport === "bridge" ? "ok" : "warn");
    } catch (error) {
      setCard("adminBridgeStatus", "FEHLER", error?.message || "Bridge-Status nicht erreichbar.", "bad");
    }
  }

  document.addEventListener("DOMContentLoaded", init, { once:true });
})();

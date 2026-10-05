(() => {
  "use strict";

  const state = {
    online: false,
    templates: [],
    proposals: [],
    roadmap: [],
    history: []
  };

  const $ = id => document.getElementById(id);
  const esc = value => CFS.escape(value == null ? "" : String(value));

  async function ensureAdmin() {
    const me = await CFS.requireAuth();
    if (!me) return null;
    if (!me.admin) {
      location.replace("/pages/dashboard.html");
      return null;
    }
    return me;
  }

  function setStatus(online, headline, subline = "") {
    state.online = Boolean(online);
    $("aiStatusDot")?.classList.toggle("online", state.online);
    $("aiStatusDot")?.classList.toggle("offline", !state.online);
    if ($("aiStatusText")) $("aiStatusText").textContent = headline;
    if ($("aiModelText")) $("aiModelText").textContent = subline;
  }

  async function loadStatus() {
    setStatus(false, "wird geprüft …", "");
    try {
      const data = await CFS.json("/api/creator/cfs-ai/status");
      if (!data.gateway?.enabled) {
        setStatus(false, "noch deaktiviert", "CFS_AI_ENABLED=false");
        return data;
      }
      if (!data.gateway?.configured) {
        setStatus(false, "Konfiguration fehlt", data.gateway?.error || "AI Service URL prüfen");
        return data;
      }
      if (!data.service) {
        const bridgeHint = data.gateway?.transport === "bridge" ? (data.worker ? "Bridge verbunden · lokaler AI-Service nicht bereit" : "Bridge wartet auf deinen CFS-AI-Laptop") : (data.gateway?.target || "nicht erreichbar");
        setStatus(false, "Service offline", data.error || bridgeHint);
        return data;
      }
      const model = data.service.chat_model || "lokales Modell";
      const version = data.service.version ? `v${data.service.version}` : "";
      const transport = data.gateway?.transport === "bridge" ? " · Outbound Bridge" : "";
      setStatus(Boolean(data.service.ollama?.online), data.service.ollama?.online ? "online" : "Service online · Modell offline", `${model}${version ? ` · ${version}` : ""}${transport}`);
      return data;
    } catch (error) {
      setStatus(false, "nicht erreichbar", error.message);
      return null;
    }
  }

  function activateTab(name) {
    document.querySelectorAll("[data-ai-tab]").forEach(button => button.classList.toggle("active", button.dataset.aiTab === name));
    document.querySelectorAll("[data-ai-panel]").forEach(panel => panel.classList.toggle("hidden", panel.dataset.aiPanel !== name));
    if (name === "proposals") loadProposals();
    if (name === "roadmap") loadRoadmap();
    if (name === "bridge") loadBridge();
  }

  function platformLabel(value) {
    return ({twitch:"Twitch",youtube:"YouTube",tiktok:"TikTok",obs:"OBS",website:"Website"})[String(value)] || String(value || "");
  }

  function statusLabel(value) {
    return ({new:"Neu",saved:"Gespeichert",favorite:"Favorit",build_later:"Später bauen",proposal_ready:"Proposal bereit",rejected:"Verworfen"})[String(value)] || String(value || "Neu");
  }

  function renderTemplates() {
    const host = $("templateGallery");
    if (!host) return;
    const items = state.templates || [];
    $("metricTemplates").textContent = String(items.length);
    if (!items.length) {
      host.innerHTML = '<div class="notice">Noch keine Vorlagen gesammelt. Wähle oben Kategorien und klicke auf <strong>VORLAGEN SAMMELN</strong>.</div>';
      return;
    }
    host.innerHTML = items.map(item => {
      const t = item.template || {};
      const status = item.status || "new";
      const platforms = (t.platforms || []).slice(0, 5);
      const tags = (t.tags || []).slice(0, 4);
      return `<article class="cfs-ai-template" data-template-id="${esc(t.id)}">
        <div class="cfs-ai-template-visual">
          <span class="cfs-ai-template-tag">${esc(t.category || "template")}</span>
          <h3>${esc(t.title || t.id)}</h3>
          <p>${esc(t.focus || "CFS Premium Template")}</p>
        </div>
        <div class="cfs-ai-template-body">
          <div class="cfs-ai-template-meta">
            ${platforms.map(x => `<span>${esc(platformLabel(x))}</span>`).join("")}
            ${tags.map(x => `<span>#${esc(x)}</span>`).join("")}
            <span class="cfs-ai-template-status">${esc(statusLabel(status))}</span>
          </div>
          <div class="cfs-ai-template-actions">
            <button class="${status === "favorite" ? "favorite" : ""}" data-template-action="favorite" type="button">★ FAVORIT</button>
            <button data-template-action="build_later" type="button">SPÄTER</button>
            <button class="primary" data-template-action="propose" type="button">ZU PROPOSAL</button>
            ${status === "rejected" ? '<button data-template-action="saved" type="button">WIEDERHERSTELLEN</button>' : '<button data-template-action="rejected" type="button">VERWERFEN</button>'}
          </div>
        </div>
      </article>`;
    }).join("");

    host.querySelectorAll("[data-template-action]").forEach(button => {
      button.addEventListener("click", event => {
        const card = event.currentTarget.closest("[data-template-id]");
        if (!card) return;
        const id = card.dataset.templateId;
        const action = event.currentTarget.dataset.templateAction;
        if (action === "propose") createProposalFromTemplate(id);
        else updateTemplateStatus(id, action);
      });
    });
  }

  function templateQuery() {
    const params = new URLSearchParams();
    const category = $("templateCategory")?.value || "";
    const platform = $("templatePlatform")?.value || "";
    const status = $("templateStatus")?.value || "";
    const query = $("templateSearch")?.value?.trim() || "";
    if (category) params.set("category", category);
    if (platform) params.set("platform", platform);
    if (status) params.set("status", status);
    if (query) params.set("query", query);
    params.set("sort", "status");
    return params.toString();
  }

  async function loadTemplates() {
    const info = $("templateInfo");
    if (info) info.textContent = "Preview Vault wird geladen …";
    try {
      const data = await CFS.json(`/api/creator/cfs-ai/templates?${templateQuery()}`);
      state.templates = data.items || [];
      renderTemplates();
      if (info) info.textContent = `${state.templates.length} Vorlage${state.templates.length === 1 ? "" : "n"} sichtbar · Vault gesamt: ${data.stats?.total || state.templates.length}`;
      $("metricTemplates").textContent = String(data.stats?.total || state.templates.length);
    } catch (error) {
      state.templates = [];
      renderTemplates();
      if (info) info.textContent = `Preview Vault nicht erreichbar: ${error.message}`;
    }
  }

  async function harvestTemplates() {
    const button = $("harvestTemplates");
    const info = $("templateInfo");
    const categories = [...document.querySelectorAll('#harvestCategories input[type="checkbox"]:checked')].map(input => input.value);
    if (!categories.length) {
      if (info) info.textContent = "Wähle mindestens eine Kategorie aus.";
      return;
    }
    button.disabled = true;
    if (info) info.textContent = "CFS AI sammelt hochwertige Vorlagen …";
    try {
      const data = await CFS.json("/api/creator/cfs-ai/templates/harvest", {
        method:"POST",
        body:JSON.stringify({categories, per_category:3, preview_format:"wide"})
      });
      if (info) info.textContent = `${data.added || 0} neue Vorlage(n) gesammelt. Vorhandene Vorlagen wurden nicht dupliziert.`;
      await loadTemplates();
    } catch (error) {
      if (info) info.textContent = `Sammeln fehlgeschlagen: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  async function updateTemplateStatus(id, status) {
    try {
      await CFS.json(`/api/creator/cfs-ai/templates/${encodeURIComponent(id)}/status`, {method:"POST", body:JSON.stringify({status})});
      await loadTemplates();
    } catch (error) {
      alert(`Status konnte nicht gespeichert werden: ${error.message}`);
    }
  }

  async function createProposalFromTemplate(id) {
    const item = state.templates.find(x => x.template?.id === id);
    const title = item?.template?.title || id;
    const notes = prompt(`Optionaler Zusatzwunsch für „${title}“:`, "") ?? null;
    if (notes === null) return;
    const info = $("templateInfo");
    if (info) info.textContent = `CFS AI erstellt Coding-Proposal für „${title}“ …`;
    try {
      const data = await CFS.json(`/api/creator/cfs-ai/templates/${encodeURIComponent(id)}/propose`, {method:"POST", body:JSON.stringify({notes})});
      if (info) info.textContent = `Proposal „${data.proposal?.title || title}“ erstellt. Es wurde noch nichts übernommen.`;
      await loadTemplates();
      await loadProposals();
      activateTab("proposals");
      if (data.proposal?.id) selectProposal(data.proposal.id);
    } catch (error) {
      if (info) info.textContent = `Proposal fehlgeschlagen: ${error.message}`;
    }
  }

  function addChatMessage(role, text) {
    const host = $("aiChatLog");
    if (!host) return;
    const div = document.createElement("div");
    div.className = `cfs-ai-chat-message ${role === "user" ? "user" : "assistant"}`;
    div.innerHTML = `<small>${role === "user" ? "DU" : "CFS AI"}</small>${esc(text)}`;
    host.appendChild(div);
    host.scrollTop = host.scrollHeight;
  }

  async function submitChat(event) {
    event.preventDefault();
    const input = $("aiChatInput");
    const message = input.value.trim();
    if (!message) return;
    addChatMessage("user", message);
    input.value = "";
    const mode = $("aiChatMode").value;
    try {
      const data = await CFS.json("/api/creator/cfs-ai/chat", {method:"POST", body:JSON.stringify({message, mode, history:state.history.slice(-10)})});
      const answer = data.answer || "Keine Antwort.";
      addChatMessage("assistant", answer);
      state.history.push({role:"user",content:message},{role:"assistant",content:answer});
    } catch (error) {
      addChatMessage("assistant", `Fehler: ${error.message}`);
    }
  }

  function renderProposalList() {
    const host = $("proposalList");
    $("metricProposals").textContent = String(state.proposals.length);
    if (!state.proposals.length) {
      host.innerHTML = '<p class="muted">Noch keine Proposals.</p>';
      return;
    }
    host.innerHTML = state.proposals.map(p => `<button data-proposal-id="${esc(p.id)}" type="button"><strong>${esc(p.title || "Coding Proposal")}</strong><small>${esc(p.status || "pending")} · Risiko ${esc(p.risk || "–")} · ${(p.files || []).length} Datei(en)</small></button>`).join("");
    host.querySelectorAll("[data-proposal-id]").forEach(button => button.addEventListener("click", () => selectProposal(button.dataset.proposalId)));
  }

  async function loadProposals() {
    try {
      const data = await CFS.json("/api/creator/cfs-ai/proposals");
      state.proposals = data.items || [];
      renderProposalList();
    } catch (error) {
      $("proposalList").innerHTML = `<p class="muted">Proposals nicht erreichbar: ${esc(error.message)}</p>`;
    }
  }

  async function selectProposal(id) {
    const host = $("proposalDetail");
    host.innerHTML = '<p class="muted">Proposal wird geladen …</p>';
    try {
      const p = await CFS.json(`/api/creator/cfs-ai/proposals/${encodeURIComponent(id)}`);
      const files = (p.files || []).map(x => x.path || x).filter(Boolean);
      const pending = p.status === "pending";
      const approved = p.status === "approved";
      const preview = p.preview?.available ? `<iframe class="cfs-ai-proposal-frame" sandbox="" src="/api/creator/cfs-ai/proposals/${encodeURIComponent(id)}/preview" title="Proposal Vorschau"></iframe>` : '<p class="muted">Für dieses Proposal ist keine visuelle Vorschau vorhanden.</p>';
      host.innerHTML = `<div><span class="cfs-ai-kicker">${esc(p.risk || "–")} RISK · ${esc(p.status || "")}</span><h3>${esc(p.title || "Coding Proposal")}</h3><p>${esc(p.summary || p.user_request || "")}</p></div>
        <div class="cfs-ai-proposal-files">${files.map(x => `<code>${esc(x)}</code>`).join("")}</div>
        <div style="margin-top:14px">${preview}</div>
        <div class="cfs-ai-proposal-actions">
          ${pending ? `<button class="btn primary" data-proposal-action="approve" type="button">BESTÄTIGEN & ÜBERNEHMEN</button><button class="btn cfs-ai-danger" data-proposal-action="reject" type="button">ABLEHNEN</button>` : ""}
          ${approved ? '<button class="btn cfs-ai-danger" data-proposal-action="rollback" type="button">ROLLBACK</button>' : ""}
        </div>`;
      host.querySelectorAll("[data-proposal-action]").forEach(button => button.addEventListener("click", () => proposalAction(id, button.dataset.proposalAction)));
    } catch (error) {
      host.innerHTML = `<p class="muted">Proposal konnte nicht geladen werden: ${esc(error.message)}</p>`;
    }
  }

  async function proposalAction(id, action) {
    const labels = {approve:"wirklich übernehmen",reject:"ablehnen",rollback:"zurücksetzen"};
    if (!confirm(`Proposal ${labels[action] || action}?`)) return;
    try {
      await CFS.json(`/api/creator/cfs-ai/proposals/${encodeURIComponent(id)}/${action}`, {method:"POST", body:"{}"});
      await loadProposals();
      await selectProposal(id);
      await loadKnowledge();
    } catch (error) {
      alert(`Aktion fehlgeschlagen: ${error.message}`);
    }
  }

  async function loadRoadmap() {
    const host = $("roadmapList");
    try {
      const data = await CFS.json("/api/creator/cfs-ai/roadmap");
      state.roadmap = data.items || [];
      $("metricRoadmap").textContent = String(data.summary?.total ?? state.roadmap.length);
      host.innerHTML = state.roadmap.length ? state.roadmap.slice(0, 40).map(item => `<article><div class="score">${esc(item.score ?? 0)}</div><div><h3>${esc(item.title || "CFS Idee")}</h3><p>${esc(item.why || item.goal || "")}</p></div><b>${esc(item.priority || "P3")} · ${esc(item.status || "idea")}</b></article>`).join("") : '<p class="muted">Noch keine Roadmap-Ideen gespeichert.</p>';
    } catch (error) {
      host.innerHTML = `<p class="muted">Roadmap nicht erreichbar: ${esc(error.message)}</p>`;
    }
  }

  async function loadKnowledge() {
    try {
      const data = await CFS.json("/api/creator/cfs-ai/knowledge");
      const value = data.total_items ?? data.items ?? data.components ?? "–";
      $("metricKnowledge").textContent = String(value);
    } catch {
      $("metricKnowledge").textContent = "–";
    }
  }


function relativeTime(value) {
  const ms = Date.now() - new Date(value || 0).getTime();
  if (!Number.isFinite(ms)) return "–";
  if (ms < 5000) return "gerade eben";
  if (ms < 60000) return `${Math.floor(ms / 1000)} s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min`;
  return `${Math.floor(ms / 3600000)} h`;
}

async function loadBridge() {
  const host = $("bridgeJobList");
  if (host) host.innerHTML = '<p class="muted">Bridge-Status wird geladen …</p>';
  try {
    const data = await CFS.json("/api/creator/cfs-ai/bridge");
    const worker = data.worker || null;
    if ($("bridgeTransport")) $("bridgeTransport").textContent = String(data.transport || "direct").toUpperCase();
    if ($("metricBridge")) $("metricBridge").textContent = worker?.online ? "ONLINE" : (data.transport === "bridge" ? "OFFLINE" : "DIRECT");
    if ($("bridgeWorkerId")) $("bridgeWorkerId").textContent = worker ? `${worker.label || "CFS AI Worker"} · ${worker.worker_id}` : "kein Worker verbunden";
    if ($("bridgeHeartbeat")) $("bridgeHeartbeat").textContent = worker ? relativeTime(worker.last_seen_at) : "–";
    const service = worker?.status?.service || {};
    if ($("bridgeWorkerStatus")) $("bridgeWorkerStatus").textContent = worker?.online ? `${service.chat_model || "CFS AI"} · ${service.ollama?.online ? "Modell online" : "Modell offline"}` : "wartet auf Laptop";
    const jobs = data.jobs || [];
    if (host) host.innerHTML = jobs.length ? jobs.map(job => `<article class="cfs-ai-bridge-job"><div><strong>${esc(job.status || "pending")}</strong><small>${esc(job.id || "")}</small></div><span>Versuch ${esc(job.attempts ?? 0)} · ${esc(relativeTime(job.created_at))}</span>${job.error_text ? `<p>${esc(job.error_text)}</p>` : ""}</article>`).join("") : '<p class="muted">Noch keine Bridge-Jobs.</p>';
  } catch (error) {
    if ($("metricBridge")) $("metricBridge").textContent = "–";
    if (host) host.innerHTML = `<p class="muted">Bridge-Status nicht erreichbar: ${esc(error.message)}</p>`;
  }
}

  function installEvents() {
    document.querySelectorAll("[data-ai-tab]").forEach(button => button.addEventListener("click", () => activateTab(button.dataset.aiTab)));
    $("refreshAiStatus")?.addEventListener("click", async () => { await loadStatus(); await loadTemplates(); });
    $("harvestTemplates")?.addEventListener("click", harvestTemplates);
    $("refreshProposals")?.addEventListener("click", loadProposals);
    $("refreshRoadmap")?.addEventListener("click", loadRoadmap);
    $("refreshBridge")?.addEventListener("click", loadBridge);
    $("aiChatForm")?.addEventListener("submit", submitChat);
    let timer = null;
    $("templateSearch")?.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(loadTemplates, 220); });
    ["templateCategory","templatePlatform","templateStatus"].forEach(id => $(id)?.addEventListener("change", loadTemplates));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const me = await ensureAdmin();
    if (!me) return;
    installEvents();
    await loadStatus();
    await Promise.allSettled([loadTemplates(), loadProposals(), loadRoadmap(), loadKnowledge(), loadBridge()]);
  });
})();

document.addEventListener("DOMContentLoaded", async () => {
  const me = await CFS.requireAuth();
  if (!me) return;

  try {
    const data = await CFS.json("/api/nexus/status");
    service.textContent = data.service || "NEXUS";
    serviceStatus.textContent = data.status || "unknown";
    plan.textContent = CFS.planLabel(data.plan);
    version.textContent = data.version || "1.0";
    allowed.textContent = data.allowed ? "Für deinen Plan freigeschaltet." : "PRO wird für NEXUS-Funktionen benötigt.";

    integrations.innerHTML = Object.entries(data.integrations || {}).map(([key, status]) => {
      const cls = status === "online" || status === "active" ? "ok" : status === "prepared" ? "warn" : "lock";
      return `<article class="card">
        <span class="badge ${cls}">${CFS.escape(String(status).toUpperCase())}</span>
        <h3>${CFS.escape(key.replaceAll("_"," ").toUpperCase())}</h3>
        <p>Status aus <code class="code-pill">/api/nexus/status</code></p>
      </article>`;
    }).join("");

    if (!data.allowed) {
      notice.textContent = "NEXUS ist technisch erreichbar, aber dein aktueller FREE Plan hat die eigentlichen NEXUS-Funktionen noch nicht freigeschaltet.";
      notice.className = "notice warn";
    }
  } catch (error) {
    notice.textContent = error.message;
    notice.className = "notice danger";
  }
});

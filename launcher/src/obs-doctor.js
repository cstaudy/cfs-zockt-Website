function cleanUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("Bitte eine OBS Browser-Source-URL einfügen.");
  let url;
  try { url = new URL(value); }
  catch { throw new Error("Die OBS URL ist ungültig."); }

  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("OBS Browser Sources müssen HTTPS verwenden. HTTP ist nur lokal erlaubt.");
  }
  return url;
}

function redactUrl(url) {
  const copy = new URL(url.toString());
  for (const key of [...copy.searchParams.keys()]) {
    if (/token|key|secret|auth/i.test(key)) copy.searchParams.set(key, "***");
  }
  return copy.toString();
}

async function runObsDoctor(rawUrl, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const url = cleanUrl(rawUrl);
  const started = Date.now();
  const checks = [
    { key:"protocol", label:"HTTPS / lokal", ok:true, detail:url.protocol }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(15000, Number(timeoutMs) || 8000)));

  try {
    const response = await fetchImpl(url.toString(), {
      method:"GET",
      redirect:"follow",
      cache:"no-store",
      signal:controller.signal,
      headers:{ "user-agent":"cfs-zockt-creator-suite-obs-doctor/1" }
    });
    const latency = Date.now() - started;
    const contentType = String(response.headers?.get?.("content-type") || "");
    const body = await response.text();
    const sample = body.slice(0, 250000);

    checks.push({
      key:"http",
      label:"HTTP Status",
      ok:response.ok,
      detail:`${response.status} ${response.statusText || ""}`.trim()
    });
    checks.push({
      key:"latency",
      label:"Antwortzeit",
      ok:latency < 3000,
      warning:latency >= 1500 && latency < 3000,
      detail:`${latency} ms`
    });
    checks.push({
      key:"html",
      label:"Browser Source HTML",
      ok:/text\/html/i.test(contentType) || /<html|<!doctype/i.test(sample),
      detail:contentType || "kein Content-Type"
    });

    const looksLikeCfs =
      /cfs[_\s-]?zockt/i.test(sample) ||
      /widget studio/i.test(sample) ||
      /widgets\/studio/i.test(url.pathname) ||
      /studio\.html/i.test(url.pathname);

    checks.push({
      key:"runtime",
      label:"CFS Widget Runtime",
      ok:looksLikeCfs,
      detail:looksLikeCfs ? "CFS Runtime erkannt." : "CFS Runtime konnte nicht eindeutig erkannt werden."
    });

    const transparentHint =
      /background\s*:\s*transparent/i.test(sample) ||
      /background-color\s*:\s*transparent/i.test(sample) ||
      /transparent/i.test(sample);

    checks.push({
      key:"transparent",
      label:"Transparenter Hintergrund",
      ok:transparentHint,
      warning:!transparentHint,
      detail:transparentHint ? "Transparenz-Hinweis gefunden." : "Transparenz konnte statisch nicht bestätigt werden."
    });

    const blockers = checks.filter(x => !x.ok && !x.warning);
    return {
      ok:blockers.length === 0,
      url:redactUrl(url),
      finalUrl:redactUrl(new URL(response.url || url.toString())),
      status:response.status,
      latencyMs:latency,
      contentType,
      checks,
      generatedAt:new Date().toISOString()
    };
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "OBS URL hat nicht innerhalb des Zeitlimits geantwortet."
      : String(error?.message || error);
    checks.push({key:"network",label:"Netzwerk",ok:false,detail:message});
    return {
      ok:false,
      url:redactUrl(url),
      finalUrl:"",
      status:0,
      latencyMs:Date.now()-started,
      contentType:"",
      checks,
      error:message,
      generatedAt:new Date().toISOString()
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { runObsDoctor, cleanUrl, redactUrl };
